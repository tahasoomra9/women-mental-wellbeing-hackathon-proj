"use client";

import Link from "next/link";
import { Slider } from "@astryxdesign/core/Slider";
import { TextArea } from "@astryxdesign/core/TextArea";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import { dateKey, entryFor, upsertSleep } from "@/lib/sleep";
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
  const [, setSleepLog] = useStore("sleepLog", []);
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
      <PageHeader title="A gentle check-in" subtitle="30 seconds, just for you. There are no wrong answers." />

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
              <span className="text-xs font-bold leading-tight">{m}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          Sleep in the last 24h: <span className="text-primary">{sleep}h</span>
        </p>
        <div className="mt-3 px-1 pb-7">
          <Slider
            label="Hours of sleep in the last 24 hours"
            isLabelHidden
            value={sleep}
            onChange={setSleep}
            min={0}
            max={12}
            step={0.5}
            width="100%"
            valueDisplay="tooltip"
            formatValue={(v) => `${v}h`}
            marks={[
              { value: 0, label: "0h" },
              { value: 6, label: "6h" },
              { value: 12, label: "12h" },
            ]}
          />
        </div>
        <p className="mt-2 text-xs text-muted">Add up all the little bits; broken sleep counts.</p>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          How supported do you feel? <span className="text-primary">{SUPPORT[support - 1]}</span>
        </p>
        <div className="mt-3 px-1 pb-7">
          <Slider
            label="How supported you feel"
            isLabelHidden
            value={support}
            onChange={setSupport}
            min={1}
            max={5}
            step={1}
            width="100%"
            valueDisplay="none"
            formatValue={(v) => SUPPORT[v - 1] ?? String(v)}
            marks={[
              { value: 1, label: "Alone" },
              { value: 5, label: "Supported" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">
          Anything on your mind? <span className="font-normal text-muted">(optional)</span>
        </p>
        <div className="mt-2">
          <TextArea
            label="Anything on your mind?"
            isLabelHidden
            value={note}
            onChange={setNote}
            rows={2}
            width="100%"
            maxLength={500}
            placeholder="Write as much or as little as you like"
          />
        </div>
      </div>

      <button
        onClick={() => {
          const ts = Date.now();
          setCheckins((prev) => [...prev, { ts, mood, sleep, support, note: note.trim() || undefined }]);
          setSleepLog((prev) => (entryFor(prev, dateKey(ts)) ? prev : upsertSleep(prev, dateKey(ts), { hours: sleep }, ts)));
          setSaved(true);
        }}
        className="w-full rounded-full bg-brand py-3 font-bold text-primary-ink"
      >
        Save check-in
      </button>
    </section>
  );
}
