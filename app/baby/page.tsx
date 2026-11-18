"use client";

import ChatWindow from "@/components/ChatWindow";
import { babyAgeWeeks, timeAgo, useNow } from "@/lib/client";
import { DAY, useStore, type BabyEvent } from "@/lib/storage";

const KINDS: { kind: BabyEvent["kind"]; label: string; emoji: string }[] = [
  { kind: "feed", label: "Fed", emoji: "🍼" },
  { kind: "sleep", label: "Slept", emoji: "😴" },
  { kind: "diaper", label: "Diaper", emoji: "🧷" },
];

export default function BabyPage() {
  const [log, setLog] = useStore("babyLog", []);
  const [profile, setProfile] = useStore("profile", {});
  const now = useNow();
  const weeks = now ? babyAgeWeeks(profile, now) : undefined;

  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-3xl font-semibold">Baby care</h1>
        <p className="text-sm text-muted">One less thing to keep in your head.</p>
      </header>

      <div className="mb-4 rounded-3xl bg-card p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const last = log.filter((e) => e.kind === k.kind).at(-1);
            const today = now ? log.filter((e) => e.kind === k.kind && e.ts > now - DAY).length : 0;
            return (
              <button
                key={k.kind}
                onClick={() => setLog((prev) => [...prev, { ts: Date.now(), kind: k.kind }].slice(-500))}
                className="rounded-2xl bg-rose-soft px-2 py-3 text-center active:scale-95"
              >
                <span className="text-2xl">{k.emoji}</span>
                <span className="block text-sm font-bold">{k.label}</span>
                <span className="block text-xs text-muted">{last && now ? timeAgo(last.ts, now) : "–"}</span>
                <span className="block text-xs text-muted">{today} in 24h</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <label className="flex items-center gap-2">
            Baby&apos;s birthday
            <input
              type="date"
              value={profile.babyBirth ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, babyBirth: e.target.value || undefined }))}
              className="rounded-lg border border-line bg-bg px-2 py-1 text-ink"
            />
          </label>
          {weeks !== undefined && <span className="font-semibold">{weeks} weeks old</span>}
          {log.length > 0 && (
            <button onClick={() => setLog((prev) => prev.slice(0, -1))} className="underline">
              Undo
            </button>
          )}
        </div>
      </div>

      <ChatWindow mode="baby" placeholder="Ask about feeding, sleep, crying…" />
    </>
  );
}
