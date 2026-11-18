"use client";

import { useStore } from "@/lib/storage";

export default function DisclaimerGate() {
  const [profile, setProfile, loaded] = useStore("profile", {});
  if (!loaded || profile.acceptedDisclaimer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
        <p className="font-display text-2xl font-semibold">Welcome to Bloom 🌷</p>
        <p className="mt-3 text-sm leading-relaxed">
          Bloom is a gentle AI companion for the months after birth. It can listen, help you check in on your mood,
          and answer baby-care questions.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>It is <b>not</b> a doctor or licensed therapist and can&apos;t diagnose.</li>
          <li>Everything you write stays on this device.</li>
          <li>If you ever feel unsafe, call your local emergency number straight away.</li>
        </ul>
        <label className="mt-4 block text-sm font-semibold">
          What should we call you? <span className="font-normal text-muted">(optional)</span>
          <input
            id="name"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 font-normal outline-none focus:border-rose"
            placeholder="Your first name"
          />
        </label>
        <button
          onClick={() => {
            const name = (document.getElementById("name") as HTMLInputElement | null)?.value.trim();
            setProfile({ ...profile, name: name || undefined, acceptedDisclaimer: true });
          }}
          className="mt-5 w-full rounded-full bg-rose py-3 font-bold text-rose-ink"
        >
          I understand, let&apos;s begin
        </button>
      </div>
    </div>
  );
}
