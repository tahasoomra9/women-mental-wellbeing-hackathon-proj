import "server-only";
import type { UserContext } from "./prompts";
import { COUNTRIES, CRISIS_TOKEN, DEFAULT_COUNTRY } from "./safety";

// Prompt-injection defence that runs before any message reaches the main model.
// Layer 1 (here): Llama Prompt Guard 2 classifier on Groq + input sanitising.
// Layer 2 (lib/prompts.ts): scope and anti-injection rules in every system prompt.

const GUARD_MODEL = process.env.GROQ_GUARD_MODEL || "meta-llama/llama-prompt-guard-2-86m";
const GUARD_THRESHOLD = 0.8;
export const MAX_MESSAGE_CHARS = 2000;

/** True if the text looks like a jailbreak / prompt-injection attempt. Fails open (layer 2 still applies). */
export async function isInjection(text: string): Promise<boolean> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // The classifier has a 512-token window; check the start and the end of long messages.
      body: JSON.stringify({ model: GUARD_MODEL, messages: [{ role: "user", content: clip(text) }] }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const score = Number(data.choices?.[0]?.message?.content);
    return Number.isFinite(score) && score >= GUARD_THRESHOLD;
  } catch {
    return false;
  }
}

function clip(text: string): string {
  return text.length <= 1500 ? text : `${text.slice(0, 750)}\n…\n${text.slice(-750)}`;
}

/** Normalise one chat message from the client: cap length, remove our control token. */
export function cleanText(text: unknown): string {
  return String(text ?? "")
    .replaceAll(CRISIS_TOKEN, "")
    .slice(0, MAX_MESSAGE_CHARS)
    .trim();
}

/** Context comes from the browser, so keep only well-typed numbers (no free text reaches the prompt). */
export function cleanContext(raw: unknown): UserContext {
  const c = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number) => {
    const n = Number(v);
    return v !== undefined && v !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : undefined;
  };
  const ck = (c.lastCheckin ?? null) as Record<string, unknown> | null;
  const mood = num(ck?.mood, 1, 5);
  const sleep = num(ck?.sleep, 0, 24);
  const support = num(ck?.support, 1, 5);
  return {
    epdsTotal: num(c.epdsTotal, 0, 30),
    epdsDaysAgo: num(c.epdsDaysAgo, 0, 3650),
    lastCheckin:
      mood !== undefined && sleep !== undefined && support !== undefined
        ? { mood, sleep, support, daysAgo: num(ck?.daysAgo, 0, 3650) ?? 0 }
        : undefined,
    babyAgeWeeks: num(c.babyAgeWeeks, 0, 520),
    // Allow-listed code only, so no free text reaches the prompt.
    motherAge: num(c.motherAge, 12, 70),
    feeding: (["breast", "formula", "mixed", "solids"] as const).find((f) => f === c.feeding),
    firstBaby: typeof c.firstBaby === "boolean" ? c.firstBaby : undefined,
    country: COUNTRIES.some((x) => x.code === c.country) ? (c.country as string) : DEFAULT_COUNTRY,
  };
}

export const GUARD_REPLY: Record<"therapist" | "baby", string> = {
  therapist:
    "I'm Bloom, and I'm only here to support you and how you're feeling as a mum, so I can't change how I work or take on other tasks. How are you doing today, really?",
  baby:
    "I'm Bloom's baby-care helper, so I can only help with caring for your baby, and I can't change how I work. What's going on with your little one?",
};
