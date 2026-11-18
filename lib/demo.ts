"use client";

import { dateKey } from "./sleep";
import { DAY, readStore, writeStore } from "./storage";

/** Fills the app with a realistic week for a mum who is struggling (EPDS 9 → 14). For demos. */
export function seedDemo(now: number) {
  const h = 60 * 60 * 1000;
  writeStore("profile", {
    ...readStore("profile", {}),
    name: "Sara",
    motherAge: 31,
    babyName: "Noah",
    feeding: "mixed" as const,
    firstBaby: true,
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
  // Seven nights of broken sleep (oldest first), shaped like a mum who is slowly running on empty.
  const nights: [number, number, number][] = [
    [6, 3, 2],
    [5.5, 2.5, 3],
    [4.5, 2, 3],
    [4, 1.5, 4],
    [3.5, 1.5, 4],
    [3, 1, 5],
    [4, 2, 4],
  ];
  writeStore(
    "sleepLog",
    nights.map(([hours, longest, wakeups], i) => ({
      date: dateKey(now - (6 - i) * DAY),
      hours,
      longest,
      wakeups,
      ts: now - (6 - i) * DAY,
    })),
  );
  writeStore("doctorNotes", [
    { id: "d1", ts: now - 3 * DAY, kind: "point", source: "chat", text: "Sleeping about 3 to 4 hours a day in short stretches since the baby was born" },
    { id: "d2", ts: now - 2 * DAY, kind: "point", source: "chat", text: "Crying most evenings and feeling like she is failing as a mother" },
    { id: "d3", ts: now - 2 * DAY, kind: "point", source: "chat", text: "Feels anxious and on edge, especially at night" },
    { id: "d4", ts: now - 1 * DAY, kind: "point", source: "chat", text: "Limited support at home during the night feeds" },
    { id: "d5", ts: now - 1 * DAY, kind: "question", source: "chat", text: "Could my low mood be postnatal depression rather than tiredness?" },
    { id: "d6", ts: now - 1 * DAY, kind: "question", source: "chat", text: "What support is available for new mums in my area?" },
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
