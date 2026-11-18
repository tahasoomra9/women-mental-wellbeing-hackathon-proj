"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { DateInput } from "@astryxdesign/core/DateInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Slider } from "@astryxdesign/core/Slider";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { stamp, useNow } from "@/lib/client";
import { dateKey, entryFor, fmtHours, lastDays, summarizeSleep, upsertSleep } from "@/lib/sleep";
import { useStore, writeStore } from "@/lib/storage";

const MIN_CHART_MAX = 8; // the scale grows only if she logged more than this, so bars never look cramped

function dayLabel(date: string, long = false) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    "en-GB",
    long ? { weekday: "long", day: "numeric", month: "short" } : { weekday: "narrow" },
  );
}

type Draft = { hours?: number; longest?: number; wakeups?: number };

export default function SleepPage() {
  const router = useRouter();
  const [log, setLog, loaded] = useStore("sleepLog", []);
  const [checkins] = useStore("checkins", []);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [saved, setSaved] = useState(false);
  const now = useNow();

  if (!loaded || now === null) return <div className="h-64" />;

  const days = lastDays(now, 7);
  const today = days[6];
  const date = selected ?? today;
  const entry = entryFor(log, date);

  const hours = draft.hours ?? entry?.hours ?? 5;
  const longest = Math.min(draft.longest ?? entry?.longest ?? Math.min(2, hours), hours);
  const wakeups = draft.wakeups ?? entry?.wakeups ?? 2;

  // Bars use the sleep log, falling back to the hours from that day's check-in.
  const hoursFor = (d: string): number | undefined =>
    entryFor(log, d)?.hours ?? checkins.filter((c) => dateKey(c.ts) === d).at(-1)?.sleep;
  const summary = summarizeSleep(log, days);
  const trackedHours = days.map(hoursFor).filter((h): h is number => h !== undefined);
  const avgHours = trackedHours.length ? trackedHours.reduce((a, b) => a + b, 0) / trackedHours.length : null;
  const CHART_MAX = Math.max(MIN_CHART_MAX, Math.ceil(Math.max(0, ...trackedHours)));

  const missed = days.slice(0, 6).filter((d) => hoursFor(d) === undefined);
  const inChart = days.includes(date);

  function pick(d: string) {
    setSelected(d);
    setDraft({});
    setSaved(false);
  }

  function save() {
    setLog((prev) => upsertSleep(prev, date, { hours, longest, wakeups }, stamp()));
    setDraft({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function talkAboutSleep() {
    writeStore("pending", { mode: "therapist", text: "I'm struggling to get a decent stretch of sleep. What could help?" });
    router.push("/talk");
  }

  const readout = (() => {
    const e = entryFor(log, date);
    const h = hoursFor(date);
    if (h === undefined) return `${dayLabel(date, true)}: nothing logged yet`;
    const extra = [
      e?.longest !== undefined ? `longest stretch ${fmtHours(e.longest)}` : "",
      e?.wakeups !== undefined ? `${e.wakeups} waking${e.wakeups === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    return `${dayLabel(date, true)}: ${fmtHours(h)} slept${extra.length ? ` · ${extra.join(" · ")}` : ""}`;
  })();

  return (
    <section className="space-y-5">
      <PageHeader title="Sleep" subtitle="Broken sleep counts. Log what you got, however it came." />

      {/* Week chart: one series, so no legend. Tap a bar to read that day or to edit it. */}
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-bold">This week</p>
          <p className="text-sm text-muted">{avgHours === null ? "No nights logged yet" : `Average ${fmtHours(avgHours)} a day`}</p>
        </div>

        <div className="relative mt-4 h-40" role="group" aria-label="Hours of sleep over the last 7 days. Select a day to see or change it.">
          {[4, 8].map((g) => (
            <div
              key={g}
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ bottom: `${(g / CHART_MAX) * 100}%` }}
            >
              <span className="absolute -top-2.5 left-0 bg-card pr-1 text-xs text-muted">{g}h</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-end gap-2 pl-7">
            {days.map((d) => {
              const h = hoursFor(d);
              const isSel = d === date;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  aria-pressed={isSel}
                  aria-label={`${dayLabel(d, true)}: ${h === undefined ? "nothing logged" : fmtHours(h)}`}
                  className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-xl outline-offset-2"
                >
                  {h === undefined ? (
                    <span aria-hidden className="h-1 w-3/4 rounded-full bg-line" />
                  ) : (
                    <span
                      aria-hidden
                      className={`w-3/4 rounded-t-[6px] transition-opacity ${isSel ? "bg-primary" : "bg-primary/55 group-hover:bg-primary/80"}`}
                      style={{ height: `${Math.max(3, (Math.min(h, CHART_MAX) / CHART_MAX) * 100)}%` }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pl-7" aria-hidden>
          {days.map((d) => (
            <span key={d} className={`mt-1 flex-1 text-center text-xs ${d === date ? "font-bold text-ink" : "text-muted"}`}>
              {dayLabel(d)}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm" aria-live="polite">
          {readout}
        </p>

        <table className="sr-only">
          <caption>Sleep over the last 7 days</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Hours slept</th>
              <th>Longest stretch</th>
              <th>Night wakings</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const e = entryFor(log, d);
              return (
                <tr key={d}>
                  <td>{dayLabel(d, true)}</td>
                  <td>{fmtHours(hoursFor(d))}</td>
                  <td>{fmtHours(e?.longest)}</td>
                  <td>{e?.wakeups ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The log form */}
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-bold">{date === today ? "Last 24 hours" : dayLabel(date, true)}</p>
        <p className="mt-0.5 text-xs text-muted">
          {date === today ? "Add up all the little bits." : entry ? "Editing a day you already logged." : "Adding a day you missed."}
        </p>

        <div className="mt-4">
          <DateInput
            label="Which day?"
            width="100%"
            format="date_weekday"
            value={date as ISODateString}
            max={today as ISODateString}
            onChange={(v) => pick(v ?? today)}
          />
          {missed.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Forgot to log? No problem. Tap a day in the chart or pick any date above.{" "}
              <span className="font-semibold">Nothing logged: {missed.map((d) => dayLabel(d, true).split(" ")[0].slice(0, 3)).join(", ")}.</span>
            </p>
          )}
          {!inChart && <p className="mt-2 text-xs text-muted">This day is earlier than the chart above, but it will count in your weekly doctor summary for that week.</p>}
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-bold">
              Total sleep: <span className="text-primary">{fmtHours(hours)}</span>
            </p>
            <div className="mt-2 px-1 pb-7">
              <Slider
                label="Total hours of sleep"
                isLabelHidden
                value={hours}
                onChange={(v: number) => setDraft((d) => ({ ...d, hours: v }))}
                min={0}
                max={12}
                step={0.5}
                width="100%"
                valueDisplay="none"
                formatValue={(v) => `${v} hours`}
                marks={[
                  { value: 0, label: "0h" },
                  { value: 6, label: "6h" },
                  { value: 12, label: "12h" },
                ]}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-bold">
              Longest stretch without waking: <span className="text-primary">{fmtHours(longest)}</span>
            </p>
            <div className="mt-2 px-1 pb-7">
              <Slider
                label="Longest stretch of sleep in hours"
                isLabelHidden
                value={longest}
                onChange={(v: number) => setDraft((d) => ({ ...d, longest: v }))}
                min={0}
                max={Math.max(hours, 0.5)}
                step={0.5}
                width="100%"
                valueDisplay="none"
                formatValue={(v) => `${v} hours`}
              />
            </div>
          </div>

          <NumberInput
            label="Times you were woken"
            value={wakeups}
            onChange={(v) => setDraft((d) => ({ ...d, wakeups: v }))}
            min={0}
            max={12}
            step={1}
            width="100%"
          />
        </div>

        <button
          onClick={save}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-bold text-primary-ink"
        >
          {saved ? (
            <>
              <Icon name="check" className="h-5 w-5" strokeWidth={2.5} /> Saved
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>

      {/* A gentle reading of the week */}
      {summary.nights > 0 && (
        <div className="rounded-3xl bg-sage-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sage">This week</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Stat label="Sleep a day" value={fmtHours(avgHours)} />
            <Stat label="Longest stretch" value={fmtHours(summary.avgLongest)} />
            <Stat
              label="Wakings a night"
              value={summary.avgWakeups === null ? "-" : String(Math.round(summary.avgWakeups * 10) / 10)}
            />
          </div>
          {summary.avgLongest !== null && summary.avgLongest < 3 ? (
            <>
              <p className="mt-4 text-sm leading-relaxed">
                Your longest stretch has averaged under 3 hours. Even one 4-hour block can make a real difference to how you feel.
              </p>
              <button onClick={talkAboutSleep} className="mt-3 min-h-11 rounded-full bg-card px-4 text-sm font-bold text-primary">
                Talk about getting a longer stretch
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed">
              Thank you for tracking this. Patterns like these are really useful to share with your GP or health visitor.
            </p>
          )}
        </div>
      )}

      <Link href="/weekly" className="flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-primary underline">
        <Icon name="file" className="h-4 w-4" /> Include this in my doctor summary
      </Link>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <p className="font-display text-xl">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
