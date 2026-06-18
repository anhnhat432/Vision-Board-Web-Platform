import { describe, expect, it } from "vitest";

import { LIFE_AREAS } from "./storage-constants";
import type { LifeArea } from "./storage-types";
import { mergeOnboardingLifeAreas } from "./onboarding-life-areas";

function normalizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(0, Math.round(value)));
}

describe("mergeOnboardingLifeAreas", () => {
  it("returns 8 base areas with preserved scores for a standard 8-area draft (backward compat)", () => {
    const draft: Array<Partial<LifeArea>> = LIFE_AREAS.map((area, i) => ({
      ...area,
      score: i + 1,
    }));

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ name: "Career", color: "#8b5cf6", score: 1 });
    expect(result[7]).toEqual({ name: "Leisure", color: "#a855f7", score: 8 });
    for (let i = 0; i < 8; i++) {
      expect(result[i].name).toBe(LIFE_AREAS[i].name);
      expect(result[i].color).toBe(LIFE_AREAS[i].color);
    }
  });

  it("preserves a custom area appended after the 8 base areas", () => {
    const draft: Array<Partial<LifeArea>> = [
      ...LIFE_AREAS.map((area, i) => ({ ...area, score: i + 1 })),
      { name: "Du lịch", score: 6, color: "#abc" },
    ];

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result).toHaveLength(9);
    expect(result[8]).toEqual({ name: "Du lịch", score: 6, color: "#abc" });
  });

  it("fills in a missing base area with default score from normalizeScore(undefined)", () => {
    const draft = LIFE_AREAS.slice(1).map((area, i) => ({
      ...area,
      score: i + 1,
    }));

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result).toHaveLength(8);
    expect(result[0].name).toBe("Career");
    expect(result[0].score).toBe(5); // default from normalizeScore(undefined)
    expect(result[0].color).toBe("#8b5cf6");
  });

  it("assigns fallback color when a custom area lacks color", () => {
    const draft: Array<Partial<LifeArea>> = [
      ...LIFE_AREAS.map((area, i) => ({ ...area, score: i + 1 })),
      { name: "Nghệ thuật", score: 7 },
    ];

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result).toHaveLength(9);
    expect(result[8].name).toBe("Nghệ thuật");
    expect(result[8].score).toBe(7);
    expect(result[8].color).toBe("#64748b"); // CUSTOM_AREA_FALLBACK_COLOR
  });

  it("discards custom areas with empty or whitespace-only names", () => {
    const draft: Array<Partial<LifeArea>> = [
      ...LIFE_AREAS.map((area, i) => ({ ...area, score: i + 1 })),
      { name: "", score: 5, color: "#fff" },
      { name: "   ", score: 3, color: "#eee" },
      { name: "Valid Custom", score: 8, color: "#333" },
    ];

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result).toHaveLength(9); // 8 base + 1 valid custom
    expect(result[8].name).toBe("Valid Custom");
  });

  it("returns exactly 8 base areas when draft is undefined or empty", () => {
    const fromUndefined = mergeOnboardingLifeAreas(undefined, normalizeScore);
    const fromEmpty: Array<Partial<LifeArea>> = [];

    expect(fromUndefined).toHaveLength(8);
    expect(fromUndefined[0].name).toBe("Career");
    expect(fromUndefined[0].score).toBe(5);

    const fromEmptyResult = mergeOnboardingLifeAreas(fromEmpty, normalizeScore);
    expect(fromEmptyResult).toHaveLength(8);
  });

  it("clamps scores to 0-10 range via normalizeScore", () => {
    const draft: Array<Partial<LifeArea>> = [
      { name: "Career", score: -3 },
      { name: "Finance", score: 15 },
      { name: "Health", score: 5.5 },
      { name: "Education", score: 0 },
      { name: "Relationships", score: 10 },
    ];

    const result = mergeOnboardingLifeAreas(draft, normalizeScore);

    expect(result[0].score).toBe(0); // -3 clamped to 0
    expect(result[1].score).toBe(10); // 15 clamped to 10
    expect(result[2].score).toBe(6); // 5.5 rounded to 6
    expect(result[3].score).toBe(0); // exactly 0
    expect(result[4].score).toBe(10); // exactly 10
  });
});
