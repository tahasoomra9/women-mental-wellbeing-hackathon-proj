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
  if (wsum === 0) return { score: null, label: "No data yet", tone: "none", parts };

  const score = Math.round(sum / wsum);
  // Clinical override: a high EPDS or any self-harm answer always means "needs support".
  if (epds && (epds.total >= 13 || epds.selfHarm)) return { score, label: "Needs support", tone: "alert", parts };
  if (score >= 75) return { score, label: "Thriving", tone: "good", parts };
  if (score >= 55) return { score, label: "Coping", tone: "ok", parts };
  if (score >= 35) return { score, label: "Struggling", tone: "low", parts };
  return { score, label: "Needs support", tone: "alert", parts };
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
