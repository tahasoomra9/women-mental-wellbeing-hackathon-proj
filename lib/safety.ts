// Crisis detection + country-specific support lines.
// Numbers verified Nov 2026. Re-check before shipping; helpline hours change.

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

/** English keyword check. Other languages rely on the model's CRISIS_TOKEN. */
export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/** The model is instructed to start its reply with this token when it detects risk. */
export const CRISIS_TOKEN = "[[CRISIS]]";

export type Hotline = { name: string; detail: string; href?: string };
export type Country = { code: string; name: string; flag: string; emergency: string; hotlines: Hotline[] };

const FIND_A_HELPLINE: Hotline = {
  name: "Find a helpline in your country",
  detail: "findahelpline.com",
  href: "https://findahelpline.com",
};

export const COUNTRIES: Country[] = [
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    emergency: "999",
    hotlines: [
      { name: "Emergency", detail: "Call 999 if you or your baby are in danger", href: "tel:999" },
      { name: "NHS 111", detail: "Call 111 and choose the mental health option (24/7)", href: "tel:111" },
      { name: "Samaritans", detail: "Call 116 123, free, any time", href: "tel:116123" },
      { name: "Shout", detail: "Text SHOUT to 85258 (24/7 text support)", href: "sms:85258?body=SHOUT" },
      { name: "PANDAS (perinatal support)", detail: "0808 1961 776, free (daily, check hours)", href: "tel:08081961776" },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    emergency: "911",
    hotlines: [
      { name: "Emergency", detail: "Call 911 if you or your baby are in danger", href: "tel:911" },
      { name: "988 Suicide & Crisis Lifeline", detail: "Call or text 988 (24/7)", href: "tel:988" },
      { name: "National Maternal Mental Health Hotline", detail: "Call or text 1-833-TLC-MAMA (1-833-852-6262), 24/7", href: "tel:18338526262" },
      { name: "Postpartum Support International", detail: "1-800-944-4773", href: "tel:18009444773" },
    ],
  },
  {
    code: "IE",
    name: "Ireland",
    flag: "🇮🇪",
    emergency: "112 / 999",
    hotlines: [
      { name: "Emergency", detail: "Call 112 or 999 if you or your baby are in danger", href: "tel:112" },
      { name: "Samaritans", detail: "Call 116 123, free, any time", href: "tel:116123" },
      { name: "Text About It", detail: "Text HELLO to 50808 (24/7)", href: "sms:50808?body=HELLO" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    emergency: "911",
    hotlines: [
      { name: "Emergency", detail: "Call 911 if you or your baby are in danger", href: "tel:911" },
      { name: "9-8-8 Suicide Crisis Helpline", detail: "Call or text 988 (24/7)", href: "tel:988" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    emergency: "000",
    hotlines: [
      { name: "Emergency", detail: "Call 000 if you or your baby are in danger", href: "tel:000" },
      { name: "Lifeline", detail: "Call 13 11 14 (24/7)", href: "tel:131114" },
      { name: "PANDA (perinatal helpline)", detail: "1300 726 306 (Mon–Sat)", href: "tel:1300726306" },
    ],
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    emergency: "112",
    hotlines: [
      { name: "Emergency", detail: "Call 112 if you or your baby are in danger", href: "tel:112" },
      { name: "Tele MANAS (Govt. of India)", detail: "Call 14416, free, 24/7, many languages", href: "tel:14416" },
    ],
  },
  {
    code: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    emergency: "1122",
    hotlines: [{ name: "Emergency (Rescue 1122)", detail: "Call 1122 if you or your baby are in danger", href: "tel:1122" }],
  },
  {
    code: "OTHER",
    name: "Other country",
    flag: "🌍",
    emergency: "your local emergency number",
    hotlines: [{ name: "Emergency", detail: "Call your local emergency number if you or your baby are in danger" }],
  },
];

export const DEFAULT_COUNTRY = "GB";

export function getCountry(code?: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)!;
}

export function getHotlines(code?: string): Hotline[] {
  return [...getCountry(code).hotlines, FIND_A_HELPLINE];
}
