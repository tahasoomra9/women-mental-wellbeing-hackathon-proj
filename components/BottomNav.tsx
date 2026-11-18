"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/", label: "Home", icon: "home", match: ["/", "/breathe"] },
  { href: "/talk", label: "Talk", icon: "chat", match: ["/talk"] },
  { href: "/baby", label: "Baby", icon: "baby", match: ["/baby"] },
  { href: "/journey", label: "Journey", icon: "sprout", match: ["/journey", "/checkin", "/screen"] },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 backdrop-blur-md">
      <ul className="mx-auto flex max-w-md justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 px-3 text-xs font-bold transition-colors ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className={`rounded-full px-4 py-1 transition-colors ${active ? "bg-primary-soft" : ""}`}>
                  <Icon name={t.icon} className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
