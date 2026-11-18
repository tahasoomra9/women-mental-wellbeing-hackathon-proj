"use client";

import Link from "next/link";
import ScoreRing, { Sparkline } from "@/components/ScoreRing";
import { timeAgo, useNow } from "@/lib/client";
import { EPDS_MAX, epdsBand } from "@/lib/epds";
import { computeWellbeing, wellbeingHistory } from "@/lib/score";
import { clearStore, DAY, useStore, writeStore } from "@/lib/storage";

export default function Home() {
  const [epds] = useStore("epds", []);
  const [checkins] = useStore("checkins", []);
  const [insights] = useStore("insights", []);
  const [babyLog] = useStore("babyLog", []);
  const [profile, , loaded] = useStore("profile", {});
  const now = useNow();

  if (!loaded || now === null) return <div className="h-64" />;

  const data = { epds, checkins, insights };
  const w = computeWellbeing(data, now);
  const history = wellbeingHistory(data, now);
  const lastEpds = epds.at(-1);
  const lastCheckin = checkins.at(-1);
  const checkedInToday = lastCheckin && new Date(lastCheckin.ts).toDateString() === new Date(now).toDateString();
  const insight = insights.at(-1);
  const lastFeed = babyLog.filter((e) => e.kind === "feed").at(-1);
  const hour = new Date(now).getHours();
  const greeting = hour < 5 ? "Up in the night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-muted">{greeting}{profile.name ? `, ${profile.name}` : ""} 🌷</p>
        <h1 className="font-display text-3xl font-semibold">How you&apos;re doing</h1>
      </header>

      <div className="flex flex-col items-center rounded-3xl bg-card p-6 shadow-sm">
        <ScoreRing w={w} />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Wellbeing score</p>
        <div className="mt-4 w-full">
          <Sparkline values={history} />
        </div>
        <div className="mt-3 flex w-full justify-around text-center text-xs text-muted">
          <Part label="Screening" v={w.parts.epds} />
          <Part label="Check-ins" v={w.parts.checkin} />
          <Part label="Conversations" v={w.parts.chat} />
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          A gentle guide based on your screening, check-ins and chats. It is not a diagnosis.
        </p>
      </div>

      {w.tone === "alert" && (
        <div className="rounded-3xl bg-alert-soft p-5">
          <p className="font-bold text-alert">You deserve more support right now</p>
          <p className="mt-1 text-sm">
            Postpartum depression is common and very treatable. Please consider booking a chat with your doctor, midwife
            or health visitor this week. You don&apos;t need to wait until it gets worse.
          </p>
        </div>
      )}

      {insight && (
        <div className="rounded-3xl bg-sage-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-sage">From your conversations</p>
          {insight.themes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insight.themes.map((t) => (
                <span key={t} className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold">
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed">💡 {insight.suggestion}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card href="/checkin" title={checkedInToday ? "Checked in ✓" : "Daily check-in"} sub={checkedInToday ? "Update today's" : "30 seconds"} accent={!checkedInToday} />
        <Card href="/talk" title="Talk to Bloom" sub="Vent, reflect, breathe" />
        <Card
          href="/screen"
          title={lastEpds ? `EPDS ${lastEpds.total}/${EPDS_MAX}` : "Take the EPDS"}
          sub={lastEpds ? `${epdsBand(lastEpds.total).label} · ${timeAgo(lastEpds.ts, now)}` : "2-min PPD screening"}
          accent={!lastEpds || now - lastEpds.ts > 14 * DAY}
        />
        <Card href="/baby" title="Baby care" sub={lastFeed ? `Last fed ${timeAgo(lastFeed.ts, now)}` : "Log & ask anything"} />
      </div>

      <div className="flex justify-center gap-4 pt-2 text-xs text-muted">
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
    </section>
  );
}

function Part({ label, v }: { label: string; v?: number }) {
  return (
    <div>
      <p className="text-base font-bold text-ink">{v === undefined ? "–" : Math.round(v)}</p>
      <p>{label}</p>
    </div>
  );
}

function Card({ href, title, sub, accent }: { href: string; title: string; sub: string; accent?: boolean }) {
  return (
    <Link href={href} className={`rounded-3xl p-4 shadow-sm transition active:scale-[0.98] ${accent ? "bg-rose-soft" : "bg-card"}`}>
      <p className="font-bold leading-tight">{title}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Link>
  );
}

function seedDemo(now: number) {
  const h = 60 * 60 * 1000;
  writeStore("profile", {
    name: "Sara",
    acceptedDisclaimer: true,
    babyBirth: new Date(now - 6 * 7 * DAY).toISOString().slice(0, 10),
  });
  writeStore("checkins", [
    { ts: now - 6 * DAY, mood: 4, sleep: 6, support: 4 },
    { ts: now - 5 * DAY, mood: 3, sleep: 5, support: 3 },
    { ts: now - 4 * DAY, mood: 3, sleep: 4, support: 3 },
    { ts: now - 3 * DAY, mood: 2, sleep: 3.5, support: 2 },
    { ts: now - 2 * DAY, mood: 2, sleep: 3, support: 2 },
    { ts: now - 1 * DAY, mood: 2, sleep: 4, support: 2, note: "Baby cried all evening" },
  ]);
  writeStore("epds", [
    { ts: now - 6 * DAY, total: 9, answers: [1, 1, 2, 1, 1, 1, 1, 1, 0, 0], selfHarm: false },
    { ts: now - 2 * DAY, total: 14, answers: [2, 1, 2, 2, 1, 2, 2, 1, 1, 0], selfHarm: false },
  ]);
  writeStore("insights", [
    {
      ts: now - 1 * DAY,
      moodScore: 4,
      themes: ["sleep deprivation", "feeling like a failure", "isolation"],
      suggestion: "Ask your partner to take one night feed this week so you can get a 5-hour stretch of sleep.",
    },
  ]);
  writeStore("babyLog", [
    { ts: now - 7 * h, kind: "feed" },
    { ts: now - 6 * h, kind: "diaper" },
    { ts: now - 5 * h, kind: "sleep" },
    { ts: now - 4 * h, kind: "feed" },
    { ts: now - 2.2 * h, kind: "feed" },
    { ts: now - 2 * h, kind: "diaper" },
  ]);
}
