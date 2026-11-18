"use client";

import { useEffect, useRef, useState } from "react";
import BloomAvatar from "@/components/BloomAvatar";
import Icon from "@/components/Icon";
import Markdown from "@/components/Markdown";
import MicButton, { type MicPhase } from "@/components/MicButton";
import { buildContext, stamp } from "@/lib/client";
import { CRISIS_TOKEN, detectCrisis } from "@/lib/safety";
import { readStore, useStore, writeStore, type ChatMessage, type TalkStyle } from "@/lib/storage";

type Mode = "therapist" | "baby";

const STARTERS: Record<Mode, string[]> = {
  therapist: [
    "I just need to vent",
    "Today was really hard",
    "I feel like I'm failing",
    "I'm so, so tired",
    "I miss my old life",
    "I don't feel close to my baby",
  ],
  baby: [
    "How often should a newborn feed?",
    "My baby won't stop crying in the evenings",
    "How much sleep does a 2-month-old need?",
    "When should I worry about a fever?",
  ],
};

const STYLES: { value: TalkStyle; label: string; hint: string }[] = [
  { value: "listen", label: "Just listen", hint: "Bloom will listen and reflect, with no advice unless you ask." },
  { value: "guide", label: "Help me through it", hint: "Bloom will listen, then gently offer ideas and small next steps." },
];

const INSIGHT_EVERY = 4; // user messages

export default function ChatWindow({ mode, placeholder }: { mode: Mode; placeholder: string }) {
  const key = mode === "therapist" ? "chat:therapist" : "chat:baby";
  const [messages, setMessages, loaded] = useStore(key, []);
  const [style, setStyle] = useStore("talkStyle", "listen");
  const [, setCrisis] = useStore("crisis", { active: false, ts: 0 });
  const [, setInsights] = useStore("insights", []);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [voicePhase, setVoicePhase] = useState<MicPhase>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingHandled = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  // Grow the composer with its content (up to the CSS max height).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // A message started on another screen (e.g. Home's "How are you, really?") is sent once on arrival.
  useEffect(() => {
    if (!loaded || pendingHandled.current) return;
    pendingHandled.current = true;
    const pending = readStore("pending", null);
    if (pending && pending.mode === mode && pending.text.trim()) {
      writeStore("pending", null);
      void send(pending.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Voice: the transcript goes into the box so she can read and edit it before sending.
  const addVoiceText = (text: string) => {
    if (detectCrisis(text)) flagCrisis(); // show support straight away, don't wait for send
    setDraft((prev) => (prev.trim() ? `${prev.trimEnd()} ` : "") + text);
    setError(null);
    inputRef.current?.focus();
  };

  const flagCrisis = () => {
    setCrisis({ active: true, ts: stamp() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function reflect(history: ChatMessage[]) {
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights((prev) => [...prev, { ts: stamp(), ...data }].slice(-50));
      }
    } catch {
      /* insights are a nice-to-have */
    }
  }

  async function send(text: string) {
    text = text.trim();
    if (!text || streaming !== null) return;
    setError(null);
    setDraft("");
    setConfirmClear(false);
    const userMsg: ChatMessage = { role: "user", text, ts: stamp() };
    const history = [...readStore(key, []), userMsg];
    setMessages(history);
    if (detectCrisis(text)) flagCrisis();

    const context = buildContext(readStore("epds", []), readStore("checkins", []), readStore("profile", {}), stamp());

    setStreaming("");
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          style: readStore("talkStyle", "listen"),
          context,
          messages: history.map(({ role, text }) => ({ role, text })),
        }),
      });
      if (res.headers.get("X-Crisis") === "1") flagCrisis();
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Bloom couldn't reply just now. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let crisisSeen = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (!crisisSeen && full.includes(CRISIS_TOKEN)) {
          crisisSeen = true;
          flagCrisis();
        }
        setStreaming(full.replace(CRISIS_TOKEN, "").trimStart());
      }
      const final = full.replace(CRISIS_TOKEN, "").trim();
      const next = [...history, { role: "model" as const, text: final, ts: stamp() }];
      setMessages(next);
      if (mode === "therapist" && next.filter((m) => m.role === "user").length % INSIGHT_EVERY === 0) {
        void reflect(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(null);
    }
  }

  function startFresh() {
    const current = readStore(key, []);
    // Keep a gentle summary for Journey before letting the conversation go.
    if (mode === "therapist" && current.filter((m) => m.role === "user").length >= 2) void reflect(current);
    setMessages([]);
    setConfirmClear(false);
    setError(null);
  }

  const empty = loaded && messages.length === 0 && streaming === null;
  const activeStyle = STYLES.find((s) => s.value === style) ?? STYLES[0];

  return (
    <div className="flex flex-1 flex-col">
      {mode === "therapist" && (
        <div className="mb-4">
          <div role="radiogroup" aria-label="How should Bloom respond?" className="flex rounded-full bg-card p-1 shadow-sm">
            {STYLES.map((s) => (
              <button
                key={s.value}
                role="radio"
                aria-checked={style === s.value}
                onClick={() => setStyle(s.value)}
                className={`min-h-10 flex-1 rounded-full px-3 text-sm font-bold transition-colors ${
                  style === s.value ? "bg-brand text-primary-ink shadow-sm" : "text-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 px-2 text-center text-xs text-muted">{activeStyle.hint}</p>
          {mode === "therapist" && messages.length > 0 && streaming === null && (
            <div className="mt-1 flex justify-center">
              {confirmClear ? (
                <div className="animate-fade-up flex items-center gap-3 rounded-full bg-card px-4 py-2 text-sm shadow-sm">
                  <span className="text-muted">Clear this conversation?</span>
                  <button onClick={startFresh} className="font-bold text-primary">
                    Clear
                  </button>
                  <button onClick={() => setConfirmClear(false)} className="font-bold text-muted">
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-muted hover:text-primary"
                >
                  <Icon name="refresh" className="h-3.5 w-3.5" /> Start fresh
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-4 pb-4" aria-live="polite">
        {empty && (
          <div className="animate-fade-up rounded-3xl bg-card/80 p-6 text-center shadow-sm">
            <div className="flex justify-center">
              <BloomAvatar size={56} />
            </div>
            <p className="mt-4 font-display text-xl">
              {mode === "therapist" ? "This is your space." : "No question is too small."}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              {mode === "therapist"
                ? "Vent, cry, ramble, rant. There are no right words here, and nothing you say will be judged."
                : "Feeding, sleep, crying, nappies: ask anything, any time of night."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {STARTERS[mode].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="min-h-10 rounded-full border border-line bg-bg px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.ts + m.role} role={m.role} text={m.text} />
        ))}
        {streaming !== null && (streaming ? <Bubble role="model" text={streaming} /> : <Typing />)}
        {error && (
          <div className="rounded-2xl bg-amber-soft px-4 py-3 text-sm">
            {error}{" "}
            <button onClick={() => setError(null)} className="font-bold underline">
              OK
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer + privacy note stay together above the bottom nav; messages scroll under a soft fade. */}
      <div className="sticky bottom-14 -mx-5 bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pb-3 pt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2 rounded-[28px] border border-line bg-card p-2 pl-4 shadow-lg shadow-primary/5"
      >
        <label htmlFor={`composer-${mode}`} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={`composer-${mode}`}
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          maxLength={2000}
          enterKeyHint="send"
          placeholder={voicePhase === "recording" ? "Listening…" : voicePhase === "transcribing" ? "" : placeholder}
          className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-2.5 leading-snug outline-none placeholder:text-muted/70"
        />
        <MicButton onText={addVoiceText} onError={setError} onPhaseChange={setVoicePhase} disabled={streaming !== null} />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || streaming !== null}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-primary-ink transition-opacity disabled:opacity-30"
        >
          <Icon name="send" className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </form>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted">
        <Icon name="lock" className="h-3 w-3" /> Private. Your chats are saved only on this phone.
      </p>
      </div>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "model"; text: string }) {
  const mine = role === "user";
  if (mine)
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-brand px-4 py-3 text-[15px] leading-relaxed text-primary-ink">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  return (
    <div className="animate-fade-up flex items-end gap-2">
      <BloomAvatar size={28} calm />
      <div className="max-w-[85%] rounded-3xl rounded-bl-lg bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm">
        <Markdown text={text} />
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2" aria-label="Bloom is typing">
      <BloomAvatar size={28} />
      <div className="flex gap-1 rounded-3xl rounded-bl-lg bg-card px-4 py-4 shadow-sm">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}
