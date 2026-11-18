"use client";

import Link from "next/link";
import CountrySelect from "@/components/CountrySelect";
import Icon from "@/components/Icon";
import ScoreExplainer from "@/components/ScoreExplainer";
import ScoreRing, { Sparkline } from "@/components/ScoreRing";
import { timeAgo, useNow } from "@/lib/client";
import { seedDemo } from "@/lib/demo";
import { EPDS_MAX, epdsBand } from "@/lib/epds";
import { computeWellbeing, explainWellbeing, wellbeingHistory } from "@/lib/score";
import { clearStore, DAY, useStore } from "@/lib/storage";

export default function JourneyPage() {
  const [epds] = useStore("epds", []);
  const [checkins] = useStore("checkins", []);
  const [insights] = useStore("insights", []);
  const [profile, setProfile, loaded] = useStore("profile", {});
  const now = useNow();

  if (!loaded || now === null) return <div className="h-64" />;

  const data = { epds, checkins, insights };
  const w = computeWellbeing(data, now);
  const history = wellbeingHistory(data, now);
  const explanation = explainWellbeing(data, now);
  const [yesterday, today] = history.slice(-2);
  const delta = yesterday != null && today != null ? today - yesterday : null;
  const lastEpds = epds.at(-1);
  const insight = insights.at(-1);
  const checkedInToday = checkins.some((c) => new Date(c.ts).toDateString() === new Date(now).toDateString());

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-display text-3xl">Your journey</h1>
        <p className="mt-1 text-sm text-muted">Not a grade. Just a gentle way to notice patterns over time.</p>
      </header>

      {w.score === null ? (
        <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-soft text-sage">
            <Icon name="sprout" className="h-7 w-7" />
          </span>
          <p className="mt-4 font-display text-xl">Your journey starts here</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            A quick check-in or the 2-minute screening helps Bloom understand how you&apos;ve been, and only you can see it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl bg-card p-6 shadow-sm">
          <ScoreRing w={w} />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">How you&apos;ve been</p>
          <div className="mt-4 w-full">
            <p className="mb-1 text-xs font-semibold text-muted">Last 7 days</p>
            <Sparkline values={history} />
          </div>
        </div>
      )}

      {w.tone === "alert" && (
        <div className="rounded-3xl bg-primary-soft p-5">
          <p className="flex items-center gap-2 font-display text-lg">
            <Icon name="heart" className="h-5 w-5 text-primary" /> You deserve care too
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Postnatal depression is common, treatable, and never your fault. A chat with your GP, midwife or health
            visitor could really help, and Bloom can help you work out what to say.
          </p>
        </div>
      )}

      {w.score !== null && <ScoreExplainer ex={explanation} delta={delta} />}

      {insight && (
        <div className="rounded-3xl bg-sage-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sage">What Bloom noticed</p>
          {insight.themes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insight.themes.map((t) => (
                <span key={t} className="rounded-full bg-card px-3 py-1 text-xs font-semibold">
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed">{insight.suggestion}</p>
        </div>
      )}

      <div className="space-y-3">
        <RowLink
          href="/checkin"
          icon="heart"
          title={checkedInToday ? "Checked in today" : "Daily check-in"}
          sub={checkedInToday ? "Update it any time" : "Mood, sleep & support · 30 seconds"}
        />
        <RowLink
          href="/screen"
          icon="compass"
          title={lastEpds ? `Screening: ${lastEpds.total}/${EPDS_MAX}` : "Wellbeing screening"}
          sub={
            lastEpds
              ? `${epdsBand(lastEpds.total).label} · ${timeAgo(lastEpds.ts, now)}${now - lastEpds.ts > 14 * DAY ? " · time to retake" : ""}`
              : "The EPDS · 10 questions · 2 minutes"
          }
        />
      </div>

      <details className="rounded-3xl bg-card p-5 text-sm shadow-sm">
        <summary className="cursor-pointer font-bold">Settings</summary>
        <div className="mt-4 flex items-center justify-between gap-3">
          Helplines for
          <CountrySelect value={profile.country} onChange={(code) => setProfile((p) => ({ ...p, country: code }))} width={200} />
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted">
          <button onClick={() => seedDemo(now)} className="underline">
            Load demo data
          </button>
          <button
            onClick={() => {
              if (confirm("Delete all Bloom data on this device?")) clearStore();
            }}
            className="underline"
          >
            Reset all data
          </button>
        </div>
      </details>
    </section>
  );
}

function RowLink({ href, icon, title, sub }: { href: string; icon: "heart" | "compass"; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm transition active:scale-[0.99]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} />
      </span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
      <Icon name="chevron" className="h-4 w-4 text-muted" />
    </Link>
  );
}
