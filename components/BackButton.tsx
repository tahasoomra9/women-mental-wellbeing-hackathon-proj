"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";

// Secondary screens (opened from Home / Journey / chat links) get a Back button.
// The four tab screens (Home, Talk, Baby, Journey) are reached from the bottom nav and don't need one.
const SECONDARY = ["/breathe", "/checkin", "/screen", "/sleep", "/weekly", "/about"];

export default function BackButton() {
  const path = usePathname();
  const router = useRouter();
  if (!SECONDARY.some((p) => path.startsWith(p))) return null;

  function goBack() {
    // With no earlier page in this tab (e.g. opened by link), fall back to Home.
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      onClick={goBack}
      className="-ml-2 mb-3 flex min-h-11 items-center gap-1 self-start rounded-full px-2 pr-4 text-sm font-bold text-muted transition-colors hover:text-primary"
    >
      <Icon name="chevron" className="h-5 w-5 rotate-180" strokeWidth={2.25} />
      Back
    </button>
  );
}
