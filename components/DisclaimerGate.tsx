"use client";

import { useState } from "react";
import { DEFAULT_COUNTRY } from "@/lib/safety";
import { useStore } from "@/lib/storage";
import BloomAvatar from "./BloomAvatar";
import CountrySelect from "./CountrySelect";

export default function DisclaimerGate() {
  const [profile, setProfile, loaded] = useStore("profile", {});
  const [name, setName] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  if (!loaded || profile.acceptedDisclaimer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <BloomAvatar size={44} />
          <p className="font-display text-2xl">Welcome to Bloom</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          A gentle space for the months after birth. Somewhere to vent without judgment, breathe, check in on
          yourself, and get help with your baby.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>It is <b>not</b> a doctor or licensed therapist and can&apos;t diagnose.</li>
          <li>Your history is saved only on this device. Messages are sent to an AI service to generate replies.</li>
          <li>If you ever feel unsafe, call your local emergency number straight away.</li>
        </ul>
        <label className="mt-4 block text-sm font-semibold">
          What should we call you? <span className="font-normal text-muted">(optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 font-normal outline-none focus:border-primary"
            placeholder="Your first name"
          />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Where are you? <span className="font-normal text-muted">(so we show the right helplines)</span>
          <CountrySelect value={country} onChange={setCountry} className="mt-1 w-full font-normal" />
        </label>
        <button
          onClick={() =>
            setProfile({ ...profile, name: name.trim() || undefined, country, acceptedDisclaimer: true })
          }
          className="mt-5 w-full rounded-full bg-brand py-3 font-bold text-primary-ink"
        >
          I understand, let&apos;s begin
        </button>
      </div>
    </div>
  );
}
