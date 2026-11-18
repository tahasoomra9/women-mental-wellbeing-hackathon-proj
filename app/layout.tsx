import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CrisisBanner from "@/components/CrisisBanner";
import DisclaimerGate from "@/components/DisclaimerGate";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom · Postpartum wellbeing",
  description: "An AI companion for new mothers: gentle support, postpartum depression screening and baby-care help.",
};

export const viewport: Viewport = {
  themeColor: "#fbf6f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24">
          <CrisisBanner />
          <main className="flex flex-1 flex-col px-4 pt-6">{children}</main>
          <p className="px-4 pt-8 text-center text-xs text-muted">
            Bloom is an AI companion, not a replacement for a doctor or licensed therapist. If you are in danger, call
            your local emergency number.
          </p>
        </div>
        <BottomNav />
        <DisclaimerGate />
      </body>
    </html>
  );
}
