import { EPDS_MAX, type EpdsResult } from "./epds";
import type { Checkin, Insight } from "./storage";

const DAY = 24 * 60 * 60 * 1000;

export type Wellbeing = {
  score: number | null;
  label: string;
  tone: "good" | "ok" | "low" | "alert" | "none";
  parts: { epds?: number; checkin?: number; chat?: number };
};

export function checkinScore(c: Checkin): number {
  const mood = (c.mood - 1) / 4;
  const sleep = Math.min(c.sleep / 8, 1);
  const support = (c.support - 1) / 4;
  return ((mood + sleep + support) / 3) * 100;
}

/** Wellbeing score (0–100) using data available up to time `at`. */
export function computeWellbeing(
  data: { epds: EpdsResult[]; checkins: Checkin[]; insights: Insight[] },
  at: number,
): Wellbeing {
  const epds = latest(data.epds.filter((e) => e.ts <= at));
  const recentCheckins = data.checkins.filter((c) => c.ts <= at && c.ts > at - 3 * DAY);
  const recentInsights = data.insights.filter((i) => i.ts <= at && i.ts > at - 7 * DAY);

  const parts: Wellbeing["parts"] = {};
  if (epds) parts.epds = (1 - epds.total / EPDS_MAX) * 100;
  if (recentCheckins.length) parts.checkin = avg(recentCheckins.map(checkinScore));
  if (recentInsights.length) parts.chat = avg(recentInsights.map((i) => i.moodScore * 10));

  const weights = { epds: 0.6, checkin: 0.25, chat: 0.15 } as const;
  let sum = 0;
  let wsum = 0;
  for (const k of Object.keys(weights) as (keyof typeof weights)[]) {
    if (parts[k] !== undefined) {
      sum += parts[k]! * weights[k];
      wsum += weights[k];
    }
  }
  if (wsum === 0) return { score: null, label: "Just getting started", tone: "none", parts };

  const score = Math.round(sum / wsum);
  // Clinical override: a high EPDS or any self-harm answer always means "needs support".
  // Labels are deliberately gentle: this is a guide for her, not a grade.
  if (epds && (epds.total >= 13 || epds.selfHarm)) return { score, label: "Needs extra care", tone: "alert", parts };
  if (score >= 75) return { score, label: "Blooming", tone: "good", parts };
  if (score >= 55) return { score, label: "Steady", tone: "ok", parts };
  if (score >= 35) return { score, label: "Tender days", tone: "low", parts };
  return { score, label: "Needs extra care", tone: "alert", parts };
}

export function wellbeingHistory(
  data: { epds: EpdsResult[]; checkins: Checkin[]; insights: Insight[] },
  now: number,
  days = 7,
): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const endOfDay = new Date(now - i * DAY);
    endOfDay.setHours(23, 59, 59, 999);
    out.push(computeWellbeing(data, Math.min(endOfDay.getTime(), now)).score);
  }
  return out;
}

function latest<T extends { ts: number }>(xs: T[]): T | undefined {
  return xs.reduce<T | undefined>((a, b) => (!a || b.ts > a.ts ? b : a), undefined);
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---------------------------------------------------------------------------
// Explanation: what moved the score (shown when she taps the ring)
// ---------------------------------------------------------------------------

export type Factor = {
  key: "epds" | "mood" | "sleep" | "support" | "chat";
  label: string;
  /** Points this factor pulls the score up (+) or down (-) relative to a healthy baseline. */
  pull: number;
  direction: "up" | "down" | "steady";
  tip?: string;
  action?: { href: string; label: string };
};

export type Explanation = {
  factors: Factor[];
  notes: { text: string; action?: { href: string; label: string } }[];
};

const BASELINE = 70; // a part scoring 70/100 neither helps nor hurts

export function explainWellbeing(
  data: { epds: EpdsResult[]; checkins: Checkin[]; insights: Insight[] },
  at: number,
): Explanation {
  const epds = latest(data.epds.filter((e) => e.ts <= at));
  const recent = data.checkins.filter((c) => c.ts <= at && c.ts > at - 3 * DAY);
  const insights = data.insights.filter((i) => i.ts <= at && i.ts > at - 7 * DAY);

  // Same weights as computeWellbeing, renormalised over available parts.
  const w = { epds: epds ? 0.6 : 0, checkin: recent.length ? 0.25 : 0, chat: insights.length ? 0.15 : 0 };
  const wsum = w.epds + w.checkin + w.chat;
  const factors: Factor[] = [];
  const add = (f: Omit<Factor, "direction" | "pull">, value: number, weight: number) => {
    const pull = (weight / wsum) * (value - BASELINE);
    factors.push({ ...f, pull, direction: pull <= -2 ? "down" : pull >= 2 ? "up" : "steady" });
  };

  if (wsum > 0 && epds) {
    const days = Math.floor((at - epds.ts) / DAY);
    add({
      key: "epds",
      label: `Screening score ${epds.total}/30 (${days === 0 ? "today" : `${days}d ago`})`,
      tip:
        epds.total >= 10
          ? "Your answers showed signs of low mood. Sharing this score with your doctor, midwife or health visitor is a strong next step."
          : "Your screening looked reassuring.",
    }, (1 - epds.total / EPDS_MAX) * 100, w.epds);
  }
  if (wsum > 0 && recent.length) {
    const mood = avg(recent.map((c) => c.mood));
    const sleep = avg(recent.map((c) => c.sleep));
    const support = avg(recent.map((c) => c.support));
    const each = w.checkin / 3;
    add({
      key: "mood",
      label: `Mood averaging ${fmt(mood)}/5`,
      ...(mood < 3 ? { tip: "Low days add up. Talking it through can help.", action: { href: "/talk", label: "Talk to Bloom" } } : {}),
    }, ((mood - 1) / 4) * 100, each);
    add({
      key: "sleep",
      label: `Sleep averaging ${fmt(sleep)}h a day`,
      ...(sleep < 5
        ? { tip: "Broken sleep hits mood hard. Could someone take one feed so you get one longer stretch?" }
        : {}),
    }, Math.min(sleep / 8, 1) * 100, each);
    add({
      key: "support",
      label: `Feeling supported ${fmt(support)}/5`,
      ...(support < 3
        ? { tip: "You shouldn't have to do this alone.", action: { href: "/talk", label: "Think through who could help" } }
        : {}),
    }, ((support - 1) / 4) * 100, each);
  }
  if (wsum > 0 && insights.length) {
    const m = avg(insights.map((i) => i.moodScore));
    add({ key: "chat", label: `Your conversations suggest mood ${fmt(m)}/10` }, m * 10, w.chat);
  }

  factors.sort((a, b) => a.pull - b.pull); // biggest drag first

  const notes: Explanation["notes"] = [];
  if (epds && (epds.total >= 13 || epds.selfHarm))
    notes.push({
      text: "Shown as “Needs extra care” because your screening score is 13 or more.",
    });
  if (!epds) notes.push({ text: "Your score is more accurate with a screening.", action: { href: "/screen", label: "Take the 2-min EPDS" } });
  if (!recent.length)
    notes.push({ text: "No check-in in the last 3 days.", action: { href: "/checkin", label: "Check in now" } });

  return { factors, notes };
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
