"use client";

import { usePathname } from "next/navigation";
import { getCountry } from "@/lib/safety";
import { useStore } from "@/lib/storage";

/** Quiet safety line. Hidden on chat screens, where it would sit under the composer. */
export default function FooterNote() {
  const path = usePathname();
  const [profile] = useStore("profile", {});
  if (path.startsWith("/talk") || path.startsWith("/baby")) return null;
  const emergency = getCountry(profile.country).emergency;
  return (
    <p className="px-6 pt-10 text-center text-xs leading-relaxed text-muted">
      Bloom is an AI companion, not a doctor or therapist. If you&apos;re ever in danger, call {emergency}.
    </p>
  );
}
