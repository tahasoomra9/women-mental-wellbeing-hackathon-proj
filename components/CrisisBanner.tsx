"use client";

import { HOTLINES } from "@/lib/safety";
import { useStore } from "@/lib/storage";

export function HotlineList() {
  return (
    <ul className="space-y-2">
      {HOTLINES.map((h) => (
        <li key={h.name} className="text-sm">
          <span className="font-bold">{h.name}</span>
          <br />
          {h.href ? (
            <a href={h.href} className="underline" target={h.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {h.detail}
            </a>
          ) : (
            h.detail
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CrisisBanner() {
  const [crisis, setCrisis] = useStore("crisis", { active: false, ts: 0 });
  if (!crisis.active) return null;
  return (
    <div role="alert" className="sticky top-0 z-40 border-b-2 border-alert bg-alert-soft px-4 py-4 text-ink">
      <p className="font-display text-lg font-semibold text-alert">You don&apos;t have to go through this alone</p>
      <p className="mb-3 mt-1 text-sm">
        It sounds like you&apos;re carrying something really heavy. Please reach out to someone right now, as these people
        are there to help, any time:
      </p>
      <HotlineList />
      <button
        onClick={() => setCrisis({ active: false, ts: Date.now() })}
        className="mt-3 rounded-full border border-alert px-4 py-1.5 text-sm font-semibold text-alert"
      >
        I&apos;m safe right now
      </button>
    </div>
  );
}
