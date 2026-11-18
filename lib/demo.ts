"use client";

import { DAY, readStore, writeStore } from "./storage";

/** Fills the app with a realistic week for a mum who is struggling (EPDS 9 → 14). For demos. */
export function seedDemo(now: number) {
  const h = 60 * 60 * 1000;
  writeStore("profile", {
    ...readStore("profile", {}),
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
