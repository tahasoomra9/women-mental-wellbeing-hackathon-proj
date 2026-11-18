"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { useEffect, useState } from "react";

// 1-minute paced breathing: in 4s, hold 2s, out 6s. A longer out-breath calms the body. 5 rounds.
const PHASES = [
  { key: "in", label: "Breathe in", seconds: 4, scale: 1 },
  { key: "hold", label: "Hold gently", seconds: 2, scale: 1 },
  { key: "out", label: "Breathe out slowly", seconds: 6, scale: 0.55 },
] as const;
const ROUNDS = 5;

type State = { status: "idle" } | { status: "running"; round: number; phase: number; left: number } | { status: "done" };

export default function BreathePage() {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "running") return;
    const id = setTimeout(() => {
      setState((s) => {
        if (s.status !== "running") return s;
        if (s.left > 1) return { ...s, left: s.left - 1 };
        const nextPhase = (s.phase + 1) % PHASES.length;
        const nextRound = nextPhase === 0 ? s.round + 1 : s.round;
        if (nextRound > ROUNDS) return { status: "done" };
        return { status: "running", round: nextRound, phase: nextPhase, left: PHASES[nextPhase].seconds };
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [state]);

  const running = state.status === "running";
  const phase = running ? PHASES[state.phase] : null;
  const scale = phase ? phase.scale : 0.55;
  const duration = phase && phase.key !== "hold" ? phase.seconds : 0.3;

  return (
    <section className="flex flex-1 flex-col items-center text-center">
      <PageHeader
        title="Take a minute"
        subtitle={state.status === "done" ? "Well done. You gave yourself a moment." : "Just follow the circle. Nothing else needs you right now."}
      />

      <div className="relative my-10 flex h-64 w-64 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-sage-soft motion-reduce:transition-none"
          style={{ transform: `scale(${scale})`, transition: `transform ${duration}s ease-in-out` }}
        />
        <div
          aria-hidden
          className="absolute inset-6 rounded-full bg-sage/30 motion-reduce:transition-none"
          style={{ transform: `scale(${scale})`, transition: `transform ${duration}s ease-in-out` }}
        />
        <div className="relative" aria-live="polite">
          {running && phase ? (
            <>
              <p className="font-display text-2xl font-semibold">{phase.label}</p>
              <p className="mt-1 text-4xl font-bold text-sage">{state.left}</p>
            </>
          ) : state.status === "done" ? (
            <Icon name="sprout" className="h-14 w-14 text-sage" />
          ) : (
            <p className="font-display text-xl font-semibold text-sage">1 minute</p>
          )}
        </div>
      </div>

      {running && (
        <>
          <p className="text-sm text-muted">
            Round {state.round} of {ROUNDS}
          </p>
          <button onClick={() => setState({ status: "idle" })} className="mt-4 text-sm font-semibold text-muted underline">
            Stop
          </button>
        </>
      )}

      {state.status === "idle" && (
        <button
          onClick={() => setState({ status: "running", round: 1, phase: 0, left: PHASES[0].seconds })}
          className="w-full max-w-xs rounded-full bg-sage py-3 font-bold text-sage-ink"
        >
          Start
        </button>
      )}

      {state.status === "done" && (
        <div className="w-full space-y-3">
          <p className="font-bold">How do you feel now?</p>
          <div className="flex gap-3">
            <Link href="/" className="flex-1 rounded-full bg-sage py-3 font-bold text-sage-ink">
              A bit calmer
            </Link>
            <Link href="/talk" className="flex-1 rounded-full border border-line bg-card py-3 font-bold">
              Still tense, let&apos;s talk
            </Link>
          </div>
          <button
            onClick={() => setState({ status: "running", round: 1, phase: 0, left: PHASES[0].seconds })}
            className="text-sm font-semibold text-muted underline"
          >
            Go again
          </button>
        </div>
      )}
    </section>
  );
}
