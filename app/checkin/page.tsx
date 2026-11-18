"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/storage";

const MOODS = ["😞", "😕", "😐", "🙂", "😊"];
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
        <p className="pt-10 text-5xl">🌷</p>
        <h1 className="font-display text-3xl font-semibold">Thank you for checking in</h1>
        <p className="text-muted">Noticing how you feel is a real act of self-care.</p>
        {mood <= 2 && (
          <p className="rounded-2xl bg-rose-soft p-4 text-sm">
            It sounds like today is hard. Would it help to talk about it?
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Link href="/talk" className="flex-1 rounded-full bg-rose py-3 font-bold text-rose-ink">
            Talk to Bloom
          </Link>
          <Link href="/" className="flex-1 rounded-full border border-line bg-card py-3 font-bold">
            Home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-semibold">Daily check-in</h1>
        <p className="text-sm text-muted">30 seconds, just for you.</p>
      </header>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">How is your mood today?</p>
        <div className="mt-3 flex justify-between">
          {MOODS.map((m, i) => (
            <button
              key={m}
              onClick={() => setMood(i + 1)}
              aria-label={`Mood ${i + 1} of 5`}
              className={`rounded-2xl p-2 text-3xl transition ${mood === i + 1 ? "scale-110 bg-rose-soft" : "opacity-60"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          Sleep in the last 24h: <span className="text-rose">{sleep}h</span>
        </p>
        <input type="range" min={0} max={12} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)} className="mt-3 w-full" />
        <p className="text-xs text-muted">Add up all the little bits; broken sleep counts.</p>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          How supported do you feel? <span className="text-rose">{SUPPORT[support - 1]}</span>
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
          className="mt-2 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-rose"
        />
      </div>

      <button
        onClick={() => {
          setCheckins((prev) => [...prev, { ts: Date.now(), mood, sleep, support, note: note.trim() || undefined }]);
          setSaved(true);
        }}
        className="w-full rounded-full bg-rose py-3 font-bold text-rose-ink"
      >
        Save check-in
      </button>
    </section>
  );
}
