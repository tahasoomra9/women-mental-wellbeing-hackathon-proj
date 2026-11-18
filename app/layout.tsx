import type { Metadata, Viewport } from "next";
import { Lora, Nunito } from "next/font/google";
import "./globals.css";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import CrisisBanner from "@/components/CrisisBanner";
import DisclaimerGate from "@/components/DisclaimerGate";
import FooterNote from "@/components/FooterNote";
import Providers from "./providers";

// Lora: soft, warm serif for headings. Nunito: rounded and very legible for tired eyes.
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom · A gentle space for new mums",
  description: "Somewhere to vent, breathe and get support in the months after birth: an AI companion for new mothers.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#16131d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24">
            <CrisisBanner />
            <main className="flex flex-1 flex-col px-5 pt-4">
              <BackButton />
              {children}
            </main>
            <FooterNote />
          </div>
          <BottomNav />
          <DisclaimerGate />
        </Providers>
      </body>
    </html>
  );
}
