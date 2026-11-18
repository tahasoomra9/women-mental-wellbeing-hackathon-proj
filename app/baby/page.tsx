"use client";

import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import Icon, { type IconName } from "@/components/Icon";
import { babyAgeWeeks, stamp, timeAgo, useNow } from "@/lib/client";
import { DEFAULT_COUNTRY } from "@/lib/safety";
import { DAY, useStore, type BabyEvent } from "@/lib/storage";

const NAPPY_COUNTRIES = ["GB", "IE", "AU", "IN", "PK"];

const KINDS: { kind: BabyEvent["kind"]; label: string; icon: IconName; tone: string }[] = [
  { kind: "feed", label: "Fed", icon: "bottle", tone: "bg-peach-soft text-peach" },
  { kind: "sleep", label: "Slept", icon: "moon", tone: "bg-primary-soft text-primary" },
  { kind: "diaper", label: "Diaper", icon: "droplet", tone: "bg-sage-soft text-sage" },
];

export default function BabyPage() {
  const [log, setLog] = useStore("babyLog", []);
  const [profile, setProfile] = useStore("profile", {});
  const [justLogged, setJustLogged] = useState<BabyEvent["kind"] | null>(null);
  const now = useNow();
  const weeks = now ? babyAgeWeeks(profile, now) : undefined;
  const nappy = NAPPY_COUNTRIES.includes(profile.country ?? DEFAULT_COUNTRY);

  useEffect(() => {
    if (!justLogged) return;
    const id = setTimeout(() => setJustLogged(null), 1500);
    return () => clearTimeout(id);
  }, [justLogged]);

  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-3xl">Baby care</h1>
        <p className="text-sm text-muted">
          {weeks !== undefined ? `Your little one is ${weeks} weeks old. ` : ""}One less thing to keep in your head.
        </p>
      </header>

      <div className="mb-5 rounded-3xl bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold text-muted">Tap to log</p>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const last = log.filter((e) => e.kind === k.kind).at(-1);
            const today = now ? log.filter((e) => e.kind === k.kind && e.ts > now - DAY).length : 0;
            const label = k.kind === "diaper" && nappy ? "Nappy" : k.label;
            const logged = justLogged === k.kind;
            return (
              <button
                key={k.kind}
                onClick={() => {
                  setLog((prev) => [...prev, { ts: stamp(), kind: k.kind }].slice(-500));
                  setJustLogged(k.kind);
                }}
                aria-label={`Log ${label.toLowerCase()}`}
                className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-line px-2 py-3 text-center transition active:scale-95"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${k.tone}`}>
                  <Icon name={logged ? "check" : k.icon} className="h-5 w-5" strokeWidth={logged ? 2.5 : 1.75} />
                </span>
                <span className="mt-1.5 block text-sm font-bold">{logged ? "Logged" : label}</span>
                <span className="block text-xs text-muted">{last && now ? timeAgo(last.ts, now) : "–"}</span>
                <span className="block text-[11px] text-muted">{today} today</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <label className="flex items-center gap-2">
            Birthday
            <input
              type="date"
              value={profile.babyBirth ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, babyBirth: e.target.value || undefined }))}
              className="min-h-9 rounded-lg border border-line bg-bg px-2 text-ink"
            />
          </label>
          {log.length > 0 && (
            <button onClick={() => setLog((prev) => prev.slice(0, -1))} className="min-h-9 px-2 font-semibold underline">
              Undo last
            </button>
          )}
        </div>
      </div>

      <ChatWindow mode="baby" placeholder="Ask about feeding, sleep, crying…" />
    </>
  );
}
