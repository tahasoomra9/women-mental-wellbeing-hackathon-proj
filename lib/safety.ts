// Crisis detection + support lines. Edit HOTLINES for the region you demo in.

const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill (my ?self|me)\b/i,
  /\bend (it all|my life|things)\b/i,
  /\b(want|wish) (to|i could|i was|i were) (die|dead|disappear|not (be )?here)\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\b(hurt|harm|cut) (my ?self)\b/i,
  /\bself[- ]?harm/i,
  /\b(hurt|harm|kill|shake|smother) (the|my) (baby|son|daughter|child|kid)\b/i,
  /\bno reason to live\b/i,
  /\bcan'?t go on\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/** The model is instructed to start its reply with this token when it detects risk. */
export const CRISIS_TOKEN = "[[CRISIS]]";

export type Hotline = { name: string; detail: string; href?: string };

export const HOTLINES: Hotline[] = [
  { name: "Emergency services", detail: "Call your local emergency number if you are in immediate danger" },
  { name: "988 Suicide & Crisis Lifeline (US)", detail: "Call or text 988", href: "tel:988" },
  {
    name: "Postpartum Support International",
    detail: "Call 1-800-944-4773 · Text “HELP” to 800-944-4773",
    href: "tel:18009444773",
  },
  { name: "Find a helpline in your country", detail: "findahelpline.com", href: "https://findahelpline.com" },
];
