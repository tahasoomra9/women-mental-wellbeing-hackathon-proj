"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const MAX_SECONDS = 90; // keeps recordings well under the server's size cap
const MIN_MS = 800; // anything shorter is almost certainly an accidental tap

export type MicPhase = "idle" | "recording" | "transcribing";
type Phase = MicPhase;

/** Pick a recording format this browser supports (Chrome/Edge/Firefox: webm or ogg; Safari: mp4). */
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Tap to talk, tap to stop. The recording is sent to /api/transcribe (Whisper) and the text is handed to
 * `onText` so she can read and edit it before sending. Audio is never stored.
 */
export default function MicButton({
  onText,
  onError,
  onPhaseChange,
  disabled = false,
}: {
  onText: (text: string) => void;
  onError: (message: string) => void;
  /** Lets the parent adjust its placeholder while we're recording or transcribing. */
  onPhaseChange?: (phase: MicPhase) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Feature-detect after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); // turns the mic indicator off
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // Release the microphone if she navigates away mid-recording.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      cleanup();
    };
  }, [cleanup]);

  const upload = useCallback(
    async (blob: Blob) => {
      setPhase("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "voice");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't turn that into text. Please try again, or type instead.");
        const text = String(data.text ?? "").trim();
        if (!text) throw new Error("I couldn't hear anything that time. Try again a little closer to the mic?");
        onText(text);
      } catch (e) {
        onError(e instanceof Error ? e.message : "Something went wrong with voice. Please type instead.");
      } finally {
        setPhase("idle");
      }
    },
    [onText, onError],
  );

  async function start() {
    if (phase !== "idle" || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = Date.now() - startedRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        if (cancelledRef.current) {
          setPhase("idle");
          return;
        }
        if (duration < MIN_MS || blob.size === 0) {
          setPhase("idle");
          onError("That was very short. Tap the mic, say what's on your mind, then tap stop.");
          return;
        }
        void upload(blob);
      };
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      setSeconds(0);
      recorder.start();
      setPhase("recording");
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedRef.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch (e) {
      cleanup();
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      onError(
        denied
          ? "I can't use the microphone. You can allow it in your browser's settings, or just type instead."
          : "I couldn't start the microphone on this device. You can type instead.",
      );
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function cancel() {
    cancelledRef.current = true;
    stop();
  }

  if (!supported) return null;

  if (phase === "recording") {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel recording"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
        >
          <Icon name="x" className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label={`Stop recording, ${seconds} seconds`}
          className="flex h-11 items-center gap-2 rounded-full bg-brand pl-3 pr-4 text-sm font-bold text-primary-ink"
        >
          <span className="relative flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-ink opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-ink" />
          </span>
          <span className="tabular-nums">{fmt(seconds)}</span>
          <Icon name="stop" className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <span className="sr-only" role="status">
          Recording. Tap stop when you&apos;re done.
        </span>
      </div>
    );
  }

  if (phase === "transcribing") {
    return (
      <div role="status" className="flex h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
        />
        Writing it down…
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      aria-label="Speak your message"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-primary-ink disabled:opacity-40"
    >
      <Icon name="mic" className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
