"use client";

import { useCallback, useEffect, useState } from "react";
import type { EpdsResult } from "./epds";

export type ChatMessage = { role: "user" | "model"; text: string; ts: number };
export type Checkin = { ts: number; mood: number; sleep: number; support: number; note?: string };
export type BabyEvent = { ts: number; kind: "feed" | "sleep" | "diaper" };
export type Insight = { ts: number; moodScore: number; themes: string[]; suggestion: string };
export type Profile = { name?: string; babyBirth?: string; acceptedDisclaimer?: boolean; country?: string };
export type CrisisState = { active: boolean; ts: number };
/** A message started elsewhere (e.g. Home) for a chat to send when it opens. */
export type Pending = { mode: "therapist" | "baby"; text: string } | null;
/** "listen" = reflect and validate only; "guide" = gentle suggestions / CBT. */
export type TalkStyle = "listen" | "guide";

export type Store = {
  "chat:therapist": ChatMessage[];
  "chat:baby": ChatMessage[];
  epds: EpdsResult[];
  checkins: Checkin[];
  babyLog: BabyEvent[];
  insights: Insight[];
  profile: Profile;
  crisis: CrisisState;
  pending: Pending;
  talkStyle: TalkStyle;
};

const PREFIX = "bloom:";
const EVENT = "bloom-storage";

export function readStore<K extends keyof Store>(key: K, fallback: Store[K]): Store[K] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Store[K]) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<K extends keyof Store>(key: K, value: Store[K]) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }));
}

export function clearStore() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key: "*" } }));
}

/** localStorage-backed state, synced across components in the same tab. `loaded` is false during SSR/first render. */
export function useStore<K extends keyof Store>(key: K, fallback: Store[K]) {
  const [value, setValue] = useState<Store[K]>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setValue(readStore(key, fallback));
    setLoaded(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string; value?: Store[K] };
      if (detail.key === key) setValue(detail.value as Store[K]);
      else if (detail.key === "*") setValue(readStore(key, fallback));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: Store[K] | ((prev: Store[K]) => Store[K])) => {
      const resolved =
        typeof next === "function" ? (next as (p: Store[K]) => Store[K])(readStore(key, fallback)) : next;
      writeStore(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set, loaded] as const;
}

export const DAY = 24 * 60 * 60 * 1000;
