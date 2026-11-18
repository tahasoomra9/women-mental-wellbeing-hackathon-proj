"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BloomAvatar from "@/components/BloomAvatar";
import Icon from "@/components/Icon";
import { timeAgo, useNow } from "@/lib/client";
import { computeWellbeing } from "@/lib/score";
import { DAY, useStore, writeStore } from "@/lib/storage";

// One gentle line per day. Never about productivity or "should".
const AFFIRMATIONS = [
  "You don't have to have it all figured out today.",
  "Rest is not a reward you have to earn.",
  "Your baby doesn't need a perfect mum. They need you.",
  "Hard days don't make you a bad mother.",
  "It's okay to ask for help. It's okay to need it.",
  "You're doing more than you give yourself credit for.",
  "Feeling this way is common, and it can get better.",
  "Small steps still count. So does just getting through.",
  "Be as gentle with yourself as you are with your baby.",
  "You matter too, not just as a mum.",
];

// Quick "how I feel" chips: one tap opens a conversation, nothing is scored.
const FEELINGS: { label: string; message: string }[] = [
  { label: "Overwhelmed", message: "I'm feeling really overwhelmed right now." },
  { label: "Low", message: "I'm feeling low today." },
  { label: "Anxious", message: "I'm feeling anxious and on edge." },
  { label: "Exhausted", message: "I'm completely exhausted." },
  { label: "Lonely", message: "I'm feeling lonely." },
  { label: "Okay, actually", message: "I'm actually feeling okay today." },
];

export default function Home() {
  const router = useRouter();
  const [epds] = useStore("epds", []);
  const [checkins] = useStore("checkins", []);
  const [insights] = useStore("insights", []);
  const [babyLog] = useStore("babyLog", []);
  const [profile, , loaded] = useStore("profile", {});
  const [draft, setDraft] = useState("");
  const now = useNow();

  function openTalk(text: string) {
    if (!text.trim()) return;
    writeStore("pending", { mode: "therapist", text: text.trim() });
    router.push("/talk");
  }

  if (!loaded || now === null) return <div className="h-64" />;

  const hour = new Date(now).getHours();
  const night = hour < 5;
  const greeting = night ? "Up in the night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dayIndex = Math.floor(now / DAY);
  const affirmation = AFFIRMATIONS[dayIndex % AFFIRMATIONS.length];

  const needsCare = computeWellbeing({ epds, checkins, insights }, now).tone === "alert";
  const weekCheckins = new Set(
    checkins.filter((c) => c.ts > now - 7 * DAY).map((c) => new Date(c.ts).toDateString()),
  ).size;
  const lastFeed = babyLog.filter((e) => e.kind === "feed").at(-1);

  return (
    <section className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-semibold text-muted">
          {greeting}
          {profile.name ? `, ${profile.name}` : ""}
        </p>
        <p className="mt-1 font-display text-lg italic leading-snug text-ink/80">&ldquo;{affirmation}&rdquo;</p>
      </header>

      {/* The heart of the app: a place to say how she really is. */}
      <div className="animate-fade-up rounded-[32px] bg-card p-5 shadow-lg shadow-primary/5">
        <div className="flex items-center gap-3">
          <BloomAvatar size={44} />
          <div>
            <h1 className="font-display text-2xl leading-tight">How are you, really?</h1>
            <p className="text-sm text-muted">
              {night ? "Night feeds can feel lonely. I'm here." : "I'm here to listen, not to judge."}
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            openTalk(draft);
          }}
          className="mt-4"
        >
          <label htmlFor="home-composer" className="sr-only">
            Tell Bloom how you&apos;re feeling
          </label>
          <div className="flex items-end gap-2 rounded-3xl border border-line bg-bg p-2 pl-4 focus-within:border-primary">
            <textarea
              id="home-composer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  openTalk(draft);
                }
              }}
              rows={2}
              maxLength={2000}
              enterKeyHint="send"
              placeholder="Say anything. There are no right words."
              className="min-h-12 flex-1 resize-none bg-transparent py-2 leading-snug outline-none placeholder:text-muted/70"
            />
            <button
              type="submit"
              aria-label="Send to Bloom"
              disabled={!draft.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-primary-ink transition-opacity disabled:opacity-30"
            >
              <Icon name="send" className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs font-bold text-muted">Or just tap what fits</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.label}
              onClick={() => openTalk(f.message)}
              className="min-h-10 rounded-full bg-primary-soft px-4 text-sm font-semibold text-ink transition-colors hover:bg-primary hover:text-primary-ink"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Link
        href="/breathe"
        className="flex items-center gap-4 rounded-3xl bg-sage-soft p-4 transition active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-sage">
          <Icon name="wind" />
        </span>
        <span className="flex-1">
          <span className="block font-bold">I need a minute</span>
          <span className="block text-xs text-muted">A 1-minute breathing exercise</span>
        </span>
        <Icon name="chevron" className="h-4 w-4 text-muted" />
      </Link>

      {needsCare && (
        <div className="rounded-3xl bg-primary-soft p-5">
          <p className="flex items-center gap-2 font-display text-lg">
            <Icon name="heart" className="h-5 w-5 text-primary" /> You deserve care too
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Lately things have felt heavy. Talking to your GP, midwife or health visitor can really help, and many mums
            do. It&apos;s one of the kindest things you can do for yourself.
          </p>
          <button
            onClick={() => openTalk("How do I bring up how I've been feeling with my GP or health visitor?")}
            className="mt-3 min-h-10 rounded-full bg-card px-4 text-sm font-bold text-primary"
          >
            Help me work out what to say
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/baby" className="rounded-3xl bg-card p-4 shadow-sm transition active:scale-[0.98]">
          <Icon name="bottle" className="h-5 w-5 text-peach" />
          <p className="mt-2 font-bold leading-tight">Baby</p>
          <p className="mt-0.5 text-xs text-muted">{lastFeed ? `Last fed ${timeAgo(lastFeed.ts, now)}` : "Log feeds & ask anything"}</p>
        </Link>
        <Link href="/checkin" className="rounded-3xl bg-card p-4 shadow-sm transition active:scale-[0.98]">
          <Icon name="heart" className="h-5 w-5 text-primary" />
          <p className="mt-2 font-bold leading-tight">Check in</p>
          <p className="mt-0.5 text-xs text-muted">30 seconds, just for you</p>
        </Link>
      </div>

      {/* Celebrate effort, never show a number here. */}
      <Link href="/journey" className="flex items-center gap-4 rounded-3xl bg-card/70 p-4 transition active:scale-[0.99]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage">
          <Icon name="sprout" />
        </span>
        <span className="flex-1 text-sm">
          {weekCheckins > 0 ? (
            <>
              You&apos;ve checked in on yourself <b>{weekCheckins} {weekCheckins === 1 ? "day" : "days"}</b> this week.
              That&apos;s you looking after you.
            </>
          ) : (
            <>Noticing how you feel is a small act of care. Your journey is here whenever you&apos;re ready.</>
          )}
        </span>
        <Icon name="chevron" className="h-4 w-4 text-muted" />
      </Link>
    </section>
  );
}
