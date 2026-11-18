import { epdsBand } from "./epds";
import { getCountry } from "./safety";
import { dateKey, entryFor, lastDays, summarizeSleep, type SleepSummary } from "./sleep";
import type { BabyEvent, Checkin, DoctorNote, Feeding, Insight, Profile, SleepEntry } from "./storage";
import type { EpdsResult } from "./epds";

const DAY = 24 * 60 * 60 * 1000;
export const MOOD_LABELS = ["Really low", "Low", "Okay", "Good", "Great"];
export const SUPPORT_LABELS = ["Very alone", "Alone", "Some help", "Supported", "Very supported"];
const FEEDING_LABELS: Record<Feeding, string> = {
  breast: "Breastfeeding",
  formula: "Formula feeding",
  mixed: "Mixed feeding",
  solids: "Milk and solids",
};

export type ReportInput = {
  profile: Profile;
  epds: EpdsResult[];
  checkins: Checkin[];
  sleepLog: SleepEntry[];
  babyLog: BabyEvent[];
  insights: Insight[];
  doctorNotes: DoctorNote[];
};

export type DayRow = {
  date: string;
  mood?: number;
  sleep?: number; // total hours
  longest?: number;
  wakeups?: number;
  support?: number;
};

export type Report = {
  endTs: number;
  days: string[];
  rangeStart: string;
  rangeEnd: string;
  about: { label: string; value: string }[];
  emergency: string;
  epds: {
    inRange: { date: string; total: number; label: string; selfHarm: boolean }[];
    latest?: { date: string; total: number; label: string; selfHarm: boolean };
  };
  rows: DayRow[];
  avgMood: number | null;
  avgSupport: number | null;
  sleep: SleepSummary;
  checkinNotes: { date: string; text: string }[];
  points: DoctorNote[];
  questions: DoctorNote[];
  themes: string[];
  baby: { avgFeeds: number | null; avgNappies: number | null; daysLogged: number };
};

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Start of a local YYYY-MM-DD day as a timestamp. */
export function dayStart(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function formatDay(date: string, withWeekday = false): string {
  return new Date(dayStart(date)).toLocaleDateString("en-GB", {
    ...(withWeekday ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
  });
}

export function buildReport(input: ReportInput, endTs: number): Report {
  const days = lastDays(endTs, 7);
  const startTs = dayStart(days[0]);
  const endExclusive = dayStart(days[6]) + DAY;
  const inRange = (ts: number) => ts >= startTs && ts < endExclusive;

  // ---- about her
  const p = input.profile;
  const country = getCountry(p.country);
  const about: Report["about"] = [];
  if (p.name) about.push({ label: "Name", value: p.name });
  if (p.motherAge) about.push({ label: "Age", value: String(p.motherAge) });
  if (p.babyName) about.push({ label: "Baby's name", value: p.babyName });
  if (p.babyBirth) {
    const t = new Date(p.babyBirth).getTime();
    if (Number.isFinite(t) && t <= endTs) {
      const weeks = Math.floor((endTs - t) / (7 * DAY));
      about.push({ label: "Baby's age", value: weeks < 12 ? `${weeks} weeks` : `${Math.round(weeks / 4.345)} months` });
    }
  }
  if (p.firstBaby !== undefined) about.push({ label: "First baby", value: p.firstBaby ? "Yes" : "No" });
  if (p.feeding) about.push({ label: "Feeding", value: FEEDING_LABELS[p.feeding] });

  // ---- screening
  const epdsAll = [...input.epds].sort((a, b) => a.ts - b.ts);
  const toRow = (e: EpdsResult) => ({ date: dateKey(e.ts), total: e.total, label: epdsBand(e.total).label, selfHarm: e.selfHarm });
  const epdsRange = epdsAll.filter((e) => inRange(e.ts)).map(toRow);
  const latestEpds = epdsAll.filter((e) => e.ts < endExclusive).at(-1);

  // ---- daily rows: check-in values, with the sleep tracker taking priority for sleep
  const rows: DayRow[] = days.map((date) => {
    const dayCheckins = input.checkins.filter((c) => dateKey(c.ts) === date);
    const last = dayCheckins.at(-1);
    const sleep = entryFor(input.sleepLog, date);
    return {
      date,
      mood: last?.mood,
      support: last?.support,
      sleep: sleep?.hours ?? last?.sleep,
      longest: sleep?.longest,
      wakeups: sleep?.wakeups,
    };
  });
  const sleepHours = rows.map((r) => r.sleep).filter((v): v is number => v !== undefined);
  const sleepSummary = summarizeSleep(input.sleepLog, days);
  // Count a night from a check-in too, so the average isn't empty for people who only check in.
  const sleep: SleepSummary = {
    ...sleepSummary,
    nights: sleepHours.length,
    avgHours: avg(sleepHours),
    avgLongest: sleepSummary.avgLongest === null ? null : Math.round(sleepSummary.avgLongest * 10) / 10,
    avgWakeups: sleepSummary.avgWakeups === null ? null : Math.round(sleepSummary.avgWakeups * 10) / 10,
  };

  // ---- her own notes from check-ins
  const checkinNotes = input.checkins
    .filter((c) => inRange(c.ts) && c.note?.trim())
    .sort((a, b) => a.ts - b.ts)
    .map((c) => ({ date: dateKey(c.ts), text: (c.note as string).trim() }));

  // ---- conversation insights, doctor notes
  const notes = input.doctorNotes.filter((n) => inRange(n.ts)).sort((a, b) => a.ts - b.ts);
  const themeCounts = new Map<string, number>();
  for (const i of input.insights.filter((i) => inRange(i.ts)))
    for (const t of i.themes) themeCounts.set(t.toLowerCase(), (themeCounts.get(t.toLowerCase()) ?? 0) + 1);
  const themes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  // ---- baby log
  const babyInRange = input.babyLog.filter((e) => inRange(e.ts));
  const perDay = (kind: BabyEvent["kind"]) => {
    const counts = days.map((d) => babyInRange.filter((e) => e.kind === kind && dateKey(e.ts) === d).length);
    const logged = counts.filter((c) => c > 0);
    return logged.length ? Math.round((logged.reduce((a, b) => a + b, 0) / logged.length) * 10) / 10 : null;
  };

  return {
    endTs,
    days,
    rangeStart: days[0],
    rangeEnd: days[6],
    about,
    emergency: country.emergency,
    epds: { inRange: epdsRange, latest: latestEpds ? toRow(latestEpds) : undefined },
    rows,
    avgMood: avg(rows.map((r) => r.mood).filter((v): v is number => v !== undefined)),
    avgSupport: avg(rows.map((r) => r.support).filter((v): v is number => v !== undefined)),
    sleep,
    checkinNotes,
    points: notes.filter((n) => n.kind === "point"),
    questions: notes.filter((n) => n.kind === "question"),
    themes,
    baby: {
      avgFeeds: perDay("feed"),
      avgNappies: perDay("diaper"),
      daysLogged: new Set(babyInRange.map((e) => dateKey(e.ts))).size,
    },
  };
}

export const hasAnyData = (r: Report) =>
  r.rows.some((d) => d.mood !== undefined || d.sleep !== undefined) ||
  r.points.length > 0 ||
  r.questions.length > 0 ||
  r.epds.inRange.length > 0;
