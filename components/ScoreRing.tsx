import type { Wellbeing } from "@/lib/score";

const TONE_COLOR: Record<Wellbeing["tone"], string> = {
  good: "var(--sage)",
  ok: "var(--sage)",
  low: "var(--peach-glow)",
  alert: "var(--primary)", // never red: this is a care signal, not an alarm
  none: "var(--line)",
};

export default function ScoreRing({ w, size = 168 }: { w: Wellbeing; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = w.score === null ? 0 : w.score / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_COLOR[w.tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-medium">{w.score ?? "–"}</span>
        <span className="text-sm font-bold" style={{ color: TONE_COLOR[w.tone] === "var(--line)" ? "var(--muted)" : TONE_COLOR[w.tone] }}>
          {w.label}
        </span>
      </div>
    </div>
  );
}

export function Sparkline({ values }: { values: (number | null)[] }) {
  const W = 240;
  const H = 48;
  const step = W / Math.max(values.length - 1, 1);
  const pts = values
    .map((v, i) => (v === null ? null : ([i * step, H - 4 - (v / 100) * (H - 8)] as const)))
    .filter((p): p is readonly [number, number] => p !== null);
  if (pts.length < 2) return <p className="text-xs text-muted">Your 7-day trend appears after a couple of check-ins.</p>;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" role="img" aria-label="Wellbeing score over the last 7 days">
      <path d={d} fill="none" stroke="var(--peach-glow)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill="var(--peach-glow)" />
    </svg>
  );
}
