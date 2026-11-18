"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { useState } from "react";
import { useStore } from "@/lib/storage";

const MOODS = ["Really low", "Low", "Okay", "Good", "Great"];

/** Simple drawn face: the mouth curves from a frown (mood 1) to a smile (mood 5). Same on every device. */
function Face({ mood }: { mood: number }) {
  const curve = (mood - 3) * 2.5; // -5 … +5
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      <circle cx="20" cy="20" r="17" fill="currentColor" opacity="0.15" />
      <circle cx="14" cy="17" r="1.8" fill="currentColor" />
      <circle cx="26" cy="17" r="1.8" fill="currentColor" />
      <path d={`M13 ${26 - curve / 2} Q20 ${26 + curve} 27 ${26 - curve / 2}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
const SUPPORT = ["Very alone", "Alone", "Some help", "Supported", "Very supported"];

export default function CheckinPage() {
  const [, setCheckins] = useStore("checkins", []);
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState(5);
  const [support, setSupport] = useState(3);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <section className="space-y-4 text-center">
        <span className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-sage">
          <Icon name="check" className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <h1 className="font-display text-3xl">Thank you for checking in</h1>
        <p className="text-muted">Noticing how you feel is a real act of self-care.</p>
        {mood <= 2 && (
          <p className="rounded-2xl bg-primary-soft p-4 text-sm">
            It sounds like today is hard. Would it help to talk about it?
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Link href="/talk" className="flex-1 rounded-full bg-brand py-3 font-bold text-primary-ink">
            Talk to Bloom
          </Link>
          <Link href="/journey" className="flex-1 rounded-full border border-line bg-card py-3 font-bold">
            My journey
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-display text-3xl">A gentle check-in</h1>
        <p className="text-sm text-muted">30 seconds, just for you. There are no wrong answers.</p>
      </header>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">How is your mood today?</p>
        <div role="radiogroup" aria-label="Mood" className="mt-3 grid grid-cols-5 gap-1">
          {MOODS.map((m, i) => (
            <button
              key={m}
              role="radio"
              aria-checked={mood === i + 1}
              onClick={() => setMood(i + 1)}
              className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl p-1 transition ${
                mood === i + 1 ? "bg-primary-soft text-primary" : "text-muted"
              }`}
            >
              <Face mood={i + 1} />
              <span className="text-[11px] font-bold leading-tight">{m}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          Sleep in the last 24h: <span className="text-primary">{sleep}h</span>
        </p>
        <input type="range" min={0} max={12} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)} className="mt-3 w-full" />
        <p className="text-xs text-muted">Add up all the little bits; broken sleep counts.</p>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          How supported do you feel? <span className="text-primary">{SUPPORT[support - 1]}</span>
        </p>
        <input type="range" min={1} max={5} value={support} onChange={(e) => setSupport(+e.target.value)} className="mt-3 w-full" />
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          Anything on your mind? <span className="font-normal text-muted">(optional)</span>
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-primary"
        />
      </div>

      <button
        onClick={() => {
          setCheckins((prev) => [...prev, { ts: Date.now(), mood, sleep, support, note: note.trim() || undefined }]);
          setSaved(true);
        }}
        className="w-full rounded-full bg-brand py-3 font-bold text-primary-ink"
      >
        Save check-in
      </button>
    </section>
  );
}
