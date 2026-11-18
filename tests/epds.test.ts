import { describe, expect, it } from "vitest";
import { EPDS_ITEMS, EPDS_MAX, epdsBand, scoreEpds } from "@/lib/epds";

describe("EPDS instrument", () => {
  it("has the 10 standard items, each with 4 distinct scores 0-3", () => {
    expect(EPDS_ITEMS).toHaveLength(10);
    for (const item of EPDS_ITEMS) {
      expect(item.q.length).toBeGreaterThan(10);
      expect(item.options).toHaveLength(4);
      expect(item.options.map((o) => o.score).sort()).toEqual([0, 1, 2, 3]);
      expect(new Set(item.options.map((o) => o.label)).size).toBe(4);
    }
  });

  it("scores items 1, 2, 4 forward and items 3, 5-10 reverse (published scoring key)", () => {
    // Options are listed in the standard display order; the first option's score identifies direction.
    const firstScores = EPDS_ITEMS.map((i) => i.options[0].score);
    expect(firstScores).toEqual([0, 0, 3, 0, 3, 3, 3, 3, 3, 3]);
    // And the last option is the opposite extreme
    const lastScores = EPDS_ITEMS.map((i) => i.options[3].score);
    expect(lastScores).toEqual([3, 3, 0, 3, 0, 0, 0, 0, 0, 0]);
  });

  it("scores 0 when every answer is the healthiest and 30 when every answer is the most distressed", () => {
    const best = EPDS_ITEMS.map((i) => i.options.find((o) => o.score === 0)!.score);
    const worst = EPDS_ITEMS.map((i) => i.options.find((o) => o.score === 3)!.score);
    expect(scoreEpds(best).total).toBe(0);
    expect(scoreEpds(worst).total).toBe(EPDS_MAX);
    expect(EPDS_MAX).toBe(30);
  });

  it("flags self-harm (item 10) for ANY answer above 0, whatever the total", () => {
    const base = Array(10).fill(0);
    expect(scoreEpds(base).selfHarm).toBe(false);
    for (const v of [1, 2, 3]) {
      const answers = [...base];
      answers[9] = v;
      const r = scoreEpds(answers);
      expect(r.selfHarm).toBe(true);
      expect(r.total).toBe(v); // a tiny total must still raise the flag
    }
  });

  it("does not flag self-harm from other items", () => {
    const answers = Array(10).fill(3);
    answers[9] = 0;
    expect(scoreEpds(answers).selfHarm).toBe(false);
  });

  it("uses the correct bands at every boundary", () => {
    const key = (n: number) => epdsBand(n).key;
    expect(key(0)).toBe("low");
    expect(key(9)).toBe("low");
    expect(key(10)).toBe("possible");
    expect(key(12)).toBe("possible");
    expect(key(13)).toBe("likely");
    expect(key(30)).toBe("likely");
    expect(epdsBand(13).advice.toLowerCase()).toContain("doctor");
  });
});
