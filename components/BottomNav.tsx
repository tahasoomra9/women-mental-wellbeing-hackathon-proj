"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/talk", label: "Talk", icon: "M4 5h16v11H8l-4 4z" },
  { href: "/checkin", label: "Check-in", icon: "M12 21s-7-4.5-9-9.5C1.6 7.6 4.5 4 8 4c2 0 3.2 1 4 2.2C12.8 5 14 4 16 4c3.5 0 6.4 3.6 5 7.5-2 5-9 9.5-9 9.5z" },
  { href: "/baby", label: "Baby", icon: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 16c0-3.5 3-6 7-6s7 2.5 7 6" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-semibold ${active ? "text-rose" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
