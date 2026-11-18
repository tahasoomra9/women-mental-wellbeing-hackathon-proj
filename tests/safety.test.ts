import { describe, expect, it } from "vitest";
import { COUNTRIES, CRISIS_TOKEN, DEFAULT_COUNTRY, detectCrisis, getCountry, getHotlines } from "@/lib/safety";

// Things a mum in crisis might actually type. Missing any of these is a safety bug.
const MUST_FLAG = [
  "I want to kill myself",
  "I'm thinking about suicide",
  "I feel suicidal",
  "i keep thinking about killing myself",
  "I've been thinking about hurting myself",
  "I've been harming myself",
  "I want to die",
  "I just want to disappear",
  "I wish I was dead",
  "I wish I wasn't here",
  "I wish I had never been born",
  "I don't want to live anymore",
  "I do not want to be alive",
  "I don't want to be here any more",
  "everyone would be better off without me",
  "my baby would be better off without me",
  "there's no point in living",
  "no reason to live",
  "I want to end it all",
  "I'm going to end my life",
  "I want to end it",
  "I'm thinking about ending my life",
  "I'm going to take my own life",
  "I might take an overdose",
  "I have thoughts of self-harm",
  "I self harm sometimes",
  "I'm scared I'll hurt my baby",
  "I keep having thoughts of hurting my baby",
  "I'm afraid I might shake the baby",
  "I want to smother my baby",
  "I think about drowning my baby",
  "I can't go on",
  "I feel like I can't go on like this",
  "I'm going to cut myself",
  "SUICIDE",
  "i want to KILL MYSELF!!!",
];

// Ordinary exhaustion and everyday language must NOT raise the crisis banner.
const MUST_NOT_FLAG = [
  "I'm so tired",
  "He cried all night and I feel awful",
  "This baby is killing me",
  "The lack of sleep is killing me",
  "I could kill for a nap",
  "I need to cut myself some slack",
  "I want to end the evening feed early",
  "I want to end things with the formula and go back to breastfeeding",
  "I'm dying for a coffee",
  "How often should a newborn feed?",
  "My baby won't stop crying in the evenings",
  "I feel like a terrible mother",
  "I'm struggling to get any sleep",
  "I'm overwhelmed and I cried today",
  "My partner never helps at night and I'm so angry",
  "I want to go back to work",
  "She hurt her knee falling over",
  "",
];

describe("crisis detection", () => {
  it.each(MUST_FLAG)("flags: %s", (text) => {
    expect(detectCrisis(text)).toBe(true);
  });

  it.each(MUST_NOT_FLAG)("does not flag: %j", (text) => {
    expect(detectCrisis(text)).toBe(false);
  });

  it("is safe to call repeatedly (no stateful regex bugs)", () => {
    for (let i = 0; i < 5; i++) expect(detectCrisis("I want to die")).toBe(true);
  });

  it("exposes a stable crisis token", () => {
    expect(CRISIS_TOKEN).toBe("[[CRISIS]]");
  });
});

describe("country helplines", () => {
  it("defaults to the UK", () => {
    expect(DEFAULT_COUNTRY).toBe("GB");
    expect(getCountry(undefined).code).toBe("GB");
    expect(getCountry("not-a-country").code).toBe("GB");
  });

  it("every country has an emergency number and well-formed hotlines", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(8);
    const codes = new Set<string>();
    for (const c of COUNTRIES) {
      expect(codes.has(c.code)).toBe(false);
      codes.add(c.code);
      expect(c.emergency.length).toBeGreaterThan(1);
      expect(c.hotlines.length).toBeGreaterThan(0);
      expect(c.hotlines[0].name.toLowerCase()).toContain("emergency");
      for (const h of c.hotlines) {
        expect(h.name.length).toBeGreaterThan(2);
        expect(h.detail.length).toBeGreaterThan(5);
        if (h.href) expect(h.href).toMatch(/^(tel:\+?\d+|sms:\d+(\?body=\w+)?|https:\/\/[^\s]+)$/);
      }
    }
  });

  it("always ends with the find-a-helpline fallback", () => {
    for (const c of COUNTRIES) {
      const list = getHotlines(c.code);
      expect(list.at(-1)?.href).toBe("https://findahelpline.com");
    }
  });

  it("UK list has Samaritans, NHS 111, Shout, PANDAS and 999", () => {
    const text = JSON.stringify(getHotlines("GB"));
    for (const must of ["116 123", "111", "85258", "0808 1961 776", "999"]) expect(text).toContain(must);
  });

  it("US list has 988 and the maternal mental health hotline", () => {
    const text = JSON.stringify(getHotlines("US"));
    expect(text).toContain("988");
    expect(text).toContain("1-833-TLC-MAMA");
  });

  it("every dialable href matches the number shown to the user", () => {
    for (const c of COUNTRIES) {
      for (const h of c.hotlines) {
        if (!h.href?.startsWith("tel:")) continue;
        const digits = h.href.replace(/\D/g, "");
        const shown = h.detail.replace(/[^\dA-Za-z]/g, "");
        // The first number in the visible text must contain the dialled digits (handles TLC-MAMA spelling)
        const firstNumber = (h.detail.match(/\d[\d\s-]{1,}\d/g) ?? [])[0]?.replace(/\D/g, "") ?? "";
        expect(
          shown.includes(digits) || firstNumber === digits || digits.endsWith(firstNumber) || h.detail.includes("TLC-MAMA"),
          `${c.code} ${h.name}: href ${h.href} vs "${h.detail}"`,
        ).toBe(true);
      }
    }
  });
});
