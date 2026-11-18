"use client";

import { useEffect, useState } from "react";
import type { EpdsResult } from "./epds";
import type { UserContext } from "./prompts";
import { DAY, type Checkin, type Profile } from "./storage";

/** Current time, but only after mount (null during prerender) so renders stay deterministic. Ticks every minute. */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start clock after mount
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Timestamp for event handlers (keeps the react-hooks purity lint happy). */
export const stamp = () => Date.now();

export function timeAgo(ts: number, now: number): string {
  const mins = Math.round((now - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60 ? `${mins % 60}m ` : ""}ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function babyAgeWeeks(profile: Profile, now: number): number | undefined {
  if (!profile.babyBirth) return undefined;
  const t = new Date(profile.babyBirth).getTime();
  if (!Number.isFinite(t) || t > now) return undefined;
  return Math.floor((now - t) / (7 * DAY));
}

export function buildContext(epds: EpdsResult[], checkins: Checkin[], profile: Profile, now: number): UserContext {
  const e = epds.at(-1);
  const c = checkins.at(-1);
  return {
    epdsTotal: e?.total,
    epdsDaysAgo: e ? Math.floor((now - e.ts) / DAY) : undefined,
    lastCheckin: c
      ? { mood: c.mood, sleep: c.sleep, support: c.support, daysAgo: Math.floor((now - c.ts) / DAY) }
      : undefined,
    babyAgeWeeks: babyAgeWeeks(profile, now),
    country: profile.country,
  };
}
