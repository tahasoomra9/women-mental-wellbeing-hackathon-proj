import Link from "next/link";
import type { Explanation } from "@/lib/score";

const ICON = { down: "↓", up: "↑", steady: "→" } as const;
const COLOR = { down: "text-amber", up: "text-sage", steady: "text-muted" } as const;

export default function ScoreExplainer({ ex, delta }: { ex: Explanation; delta: number | null }) {
  return (
    <div className="w-full rounded-3xl bg-card p-5 text-left shadow-sm">
      <p className="text-sm font-bold">
        What&apos;s shaping this
        {delta !== null && delta !== 0 && (
          <span className={`ml-2 font-semibold ${delta > 0 ? "text-sage" : "text-amber"}`}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} since yesterday
          </span>
        )}
      </p>
      {ex.factors.length > 0 && (
        <ul className="mt-2 space-y-2.5">
          {ex.factors.map((f) => (
            <li key={f.key} className="flex gap-2.5 text-sm">
              <span className={`mt-0.5 w-4 shrink-0 text-center font-bold ${COLOR[f.direction]}`} aria-hidden>
                {ICON[f.direction]}
              </span>
              <div>
                <p className="font-semibold">
                  {f.label}
                  <span className="sr-only">
                    {f.direction === "down" ? " (weighing on you)" : f.direction === "up" ? " (lifting your score)" : " (neutral)"}
                  </span>
                </p>
                {f.tip && f.direction !== "up" && <p className="text-xs text-muted">{f.tip}</p>}
                {f.action && f.direction === "down" && (
                  <Link href={f.action.href} className="inline-flex min-h-10 items-center text-xs font-bold text-primary underline">
                    {f.action.label}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {ex.notes.map((n) => (
        <p key={n.text} className="mt-3 text-xs text-muted">
          {n.text}{" "}
          {n.action && (
            <Link href={n.action.href} className="inline-flex min-h-10 items-center font-bold text-primary underline">
              {n.action.label}
            </Link>
          )}
        </p>
      ))}
      <p className="mt-3 text-xs text-muted">
        <span className="font-bold text-amber">↓</span> weighing on you · <span className="font-bold text-sage">↑</span> lifting
        up. Biggest effect first.
      </p>
    </div>
  );
}
