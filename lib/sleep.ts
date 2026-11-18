import type { SleepEntry } from "./storage";

const DAY = 24 * 60 * 60 * 1000;

/** Local-time YYYY-MM-DD (toISOString would shift the day for people behind UTC). */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The last `days` date keys ending at `endTs` (oldest first). */
export function lastDays(endTs: number, days = 7): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dateKey(endTs - i * DAY));
  return out;
}

export function entryFor(log: SleepEntry[], date: string): SleepEntry | undefined {
  return log.find((e) => e.date === date);
}

/** Insert or replace the entry for a date. Fields not passed keep their old value. */
export function upsertSleep(log: SleepEntry[], date: string, patch: Partial<Omit<SleepEntry, "date" | "ts">>, ts: number): SleepEntry[] {
  const existing = entryFor(log, date);
  const next: SleepEntry = { hours: 0, ...existing, ...patch, date, ts };
  return [...log.filter((e) => e.date !== date), next].sort((a, b) => a.date.localeCompare(b.date)).slice(-400);
}

export type SleepSummary = {
  nights: number;
  avgHours: number | null;
  avgLongest: number | null;
  avgWakeups: number | null;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarizeSleep(log: SleepEntry[], dates: string[]): SleepSummary {
  const set = new Set(dates);
  const inRange = log.filter((e) => set.has(e.date));
  return {
    nights: inRange.length,
    avgHours: avg(inRange.map((e) => e.hours)),
    avgLongest: avg(inRange.filter((e) => e.longest !== undefined).map((e) => e.longest as number)),
    avgWakeups: avg(inRange.filter((e) => e.wakeups !== undefined).map((e) => e.wakeups as number)),
  };
}

export const fmtHours = (h: number | null | undefined) => (h == null ? "–" : `${Math.round(h * 10) / 10}h`);
