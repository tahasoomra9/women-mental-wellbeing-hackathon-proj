"use client";

import Link from "next/link";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

/** Astryx theme + router-aware links. Bloom's own colours are mapped onto Astryx tokens in globals.css. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
