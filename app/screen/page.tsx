"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import { HotlineList } from "@/components/CrisisBanner";
import { EPDS_ITEMS, EPDS_MAX, epdsBand, scoreEpds, type EpdsResult } from "@/lib/epds";
import { stamp } from "@/lib/client";
import { useStore } from "@/lib/storage";

export default function ScreenPage() {
  const [, setEpds] = useStore("epds", []);
  const [, setCrisis] = useStore("crisis", { active: false, ts: 0 });
  const [step, setStep] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<EpdsResult | null>(null);

  function answer(score: number) {
    const next = [...answers.slice(0, step), score];
    setAnswers(next);
    if (step < EPDS_ITEMS.length - 1) {
      setStep(step + 1);
      return;
    }
    const r: EpdsResult = { ts: stamp(), ...scoreEpds(next) };
    setEpds((prev) => [...prev, r]);
    if (r.selfHarm) setCrisis({ active: true, ts: r.ts });
    setResult(r);
  }

  if (result) {
    const band = epdsBand(result.total);
    // Never red here: this is information and an invitation to get support, not an alarm.
    const color = band.key === "likely" ? "text-primary" : band.key === "possible" ? "text-amber" : "text-sage";
    return (
      <section className="space-y-4">
        <PageHeader title="Thank you for sharing" />
        <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-muted">EPDS score</p>
          <p className={`font-display text-6xl font-medium ${color}`}>
            {result.total}
            <span className="text-2xl text-muted">/{EPDS_MAX}</span>
          </p>
          <p className={`mt-1 font-bold ${color}`}>{band.label}</p>
          <p className="mt-3 text-sm leading-relaxed">{band.advice}</p>
        </div>
        {result.selfHarm && (
          <div className="rounded-3xl border-2 border-alert bg-alert-soft p-5">
            <p className="font-bold text-alert">You mentioned thoughts of harming yourself.</p>
            <p className="mb-3 mt-1 text-sm">
              Thank you for being honest. That took courage. Please talk to someone today: your doctor, a crisis line,
              or someone you trust.
            </p>
            <HotlineList />
          </div>
        )}
        <p className="text-xs text-muted">
          This is a screening tool, not a diagnosis. Only a health professional can diagnose postnatal depression.
        </p>
        <div className="flex gap-3">
          <Link href="/talk" className="flex-1 rounded-full bg-primary py-3 text-center font-bold text-primary-ink">
            Talk to Bloom
          </Link>
          <Link href="/journey" className="flex-1 rounded-full border border-line bg-card py-3 text-center font-bold">
            My journey
          </Link>
        </div>
      </section>
    );
  }

  if (step === -1) {
    return (
      <section className="space-y-4">
        <PageHeader title="How have you been feeling?" />
        <div className="space-y-3 rounded-3xl bg-card p-6 text-sm leading-relaxed shadow-sm">
          <p>
            These 10 questions are the <b>Edinburgh Postnatal Depression Scale (EPDS)</b>, the screening used by
            midwives and doctors worldwide. It takes about 2 minutes.
          </p>
          <p>
            Choose the answer that comes closest to how you have felt <b>in the past 7 days</b>, not just today. There
            are no wrong answers.
          </p>
          <p className="text-xs text-muted">Cox, J.L., Holden, J.M., & Sagovsky, R. (1987). British Journal of Psychiatry, 150.</p>
        </div>
        <button onClick={() => setStep(0)} className="w-full rounded-full bg-brand py-3 font-bold text-primary-ink">
          Start
        </button>
      </section>
    );
  }

  const item = EPDS_ITEMS[step];
  return (
    <section className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <button onClick={() => setStep(step - 1)} className="font-semibold">
            ← Back
          </button>
          <span>
            {step + 1} of {EPDS_ITEMS.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / EPDS_ITEMS.length) * 100}%` }} />
        </div>
      </div>
      <p className="text-sm font-semibold text-muted">In the past 7 days…</p>
      <h2 className="font-display text-2xl leading-snug">{item.q}</h2>
      <div className="space-y-2">
        {item.options.map((o) => (
          <button
            key={o.label}
            onClick={() => answer(o.score)}
            className={`w-full rounded-2xl border bg-card px-4 py-3.5 text-left transition hover:border-primary ${
              answers[step] === o.score ? "border-primary" : "border-line"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
