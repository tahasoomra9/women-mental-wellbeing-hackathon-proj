"use client";

import { getCountry, getHotlines } from "@/lib/safety";
import { stamp } from "@/lib/client";
import { useStore } from "@/lib/storage";
import CountrySelect from "./CountrySelect";

/** Hotlines for the country in her profile (default: UK), with a picker to switch. */
export function HotlineList({ showPicker = true }: { showPicker?: boolean }) {
  const [profile, setProfile] = useStore("profile", {});
  const country = getCountry(profile.country);
  return (
    <div>
      {showPicker && (
        <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
          Showing help for
          <CountrySelect
            value={country.code}
            onChange={(code) => setProfile((p) => ({ ...p, country: code }))}
            className="py-1 text-xs"
          />
        </label>
      )}
      <ul className="space-y-2">
        {getHotlines(country.code).map((h) => (
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
    </div>
  );
}

export default function CrisisBanner() {
  const [crisis, setCrisis] = useStore("crisis", { active: false, ts: 0 });
  if (!crisis.active) return null;
  return (
    <div role="alert" className="sticky top-0 z-40 max-h-[80vh] overflow-y-auto border-b-2 border-alert bg-alert-soft px-4 py-4 text-ink">
      <p className="font-display text-lg font-semibold text-alert">You don&apos;t have to go through this alone</p>
      <p className="mb-3 mt-1 text-sm">
        It sounds like you&apos;re carrying something really heavy. Please reach out to someone right now, as these people
        are there to help:
      </p>
      <HotlineList />
      <button
        onClick={() => setCrisis({ active: false, ts: stamp() })}
        className="mt-3 rounded-full border border-alert px-4 py-1.5 text-sm font-semibold text-alert"
      >
        I&apos;m safe right now
      </button>
    </div>
  );
}
