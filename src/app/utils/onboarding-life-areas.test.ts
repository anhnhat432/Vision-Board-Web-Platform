import { describe, expect, it } from "vitest";

import { LIFE_AREAS } from "./storage-constants";
import type { LifeArea } from "./storage-types";
import {
  buildCustomArea,
  isDefaultLifeArea,
  MAX_LIFE_AREAS,
  mergeOnboardingLifeAreas,
  pickCustomAreaColor,
  removeAreaAtIndex,
} from "./onboarding-life-areas";

function normalizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(0, Math.round(value)));
}

/**
 * Convert LIFE_AREAS constant (no score) to LifeArea[] for use in
 * buildCustomArea / removeAreaAtIndex tests.
 */
function toLifeAreas(areas: Array<{ name: string; color: string }>): LifeArea[] {
  return areas.map((a) => ({ ...a, score: 5 }));
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

describe("buildCustomArea", () => {
  it("returns error for empty name", () => {
    const result = buildCustomArea("", toLifeAreas(LIFE_AREAS));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("nhập");
  });

  it("returns error for name exceeding max length", () => {
    const longName = "A".repeat(31);
    const result = buildCustomArea(longName, toLifeAreas(LIFE_AREAS));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ký tự");
  });

  it("returns error for duplicate base name (case-insensitive)", () => {
    const result1 = buildCustomArea("Career", toLifeAreas(LIFE_AREAS));
    expect(result1.ok).toBe(false);
    if (!result1.ok) expect(result1.error).toContain("tồn tại");

    const result2 = buildCustomArea("career", toLifeAreas(LIFE_AREAS));
    expect(result2.ok).toBe(false);
  });

  it("returns error for duplicate custom name", () => {
    const existing: LifeArea[] = [
      ...toLifeAreas(LIFE_AREAS),
      { name: "Du lịch", score: 5, color: "#abc" },
    ];
    const result = buildCustomArea("Du lịch", existing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("tồn tại");
  });

  it("returns error when max areas is reached", () => {
    const existing: LifeArea[] = [];
    for (let i = 0; i < MAX_LIFE_AREAS; i++) {
      existing.push({ name: `Custom ${i}`, score: 5, color: "#abc" });
    }
    const result = buildCustomArea("New", existing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(`${MAX_LIFE_AREAS}`);
  });

  it("returns ok with valid custom area", () => {
    const result = buildCustomArea("Du lịch", toLifeAreas(LIFE_AREAS));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.area.name).toBe("Du lịch");
      expect(result.area.score).toBe(5);
      // color must be one of the LIFE_AREAS hex palette
      const palette = LIFE_AREAS.map((a) => a.color);
      expect(palette).toContain(result.area.color);
    }
  });

  it("trims whitespace from name", () => {
    const result = buildCustomArea("  Tâm linh  ", toLifeAreas(LIFE_AREAS));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.area.name).toBe("Tâm linh");
    }
  });
});

describe("removeAreaAtIndex", () => {
  it("removes area at middle index and re-indexes reviewed correctly", () => {
    const areas: LifeArea[] = [
      { name: "A", score: 5, color: "#111" },
      { name: "B", score: 5, color: "#222" },
      { name: "C", score: 5, color: "#333" },
    ];
    const reviewed = new Set([0, 1, 2]);
    const { lifeAreas, reviewed: nextReviewed } = removeAreaAtIndex(areas, reviewed, 1);

    expect(lifeAreas).toHaveLength(2);
    expect(lifeAreas[0].name).toBe("A");
    expect(lifeAreas[1].name).toBe("C");
    expect([...nextReviewed].sort()).toEqual([0, 1]);
  });

  it("removes first index and re-indexes correctly", () => {
    const areas: LifeArea[] = [
      { name: "A", score: 5, color: "#111" },
      { name: "B", score: 5, color: "#222" },
      { name: "C", score: 5, color: "#333" },
    ];
    const reviewed = new Set([0, 1, 2]);
    const { lifeAreas, reviewed: nextReviewed } = removeAreaAtIndex(areas, reviewed, 0);

    expect(lifeAreas).toHaveLength(2);
    expect(lifeAreas[0].name).toBe("B");
    expect(lifeAreas[1].name).toBe("C");
    // 0 removed, 1→0, 2→1
    expect([...nextReviewed].sort()).toEqual([0, 1]);
  });

  it("removes last index and re-indexes correctly", () => {
    const areas: LifeArea[] = [
      { name: "A", score: 5, color: "#111" },
      { name: "B", score: 5, color: "#222" },
      { name: "C", score: 5, color: "#333" },
    ];
    const reviewed = new Set([0, 1, 2]);
    const { lifeAreas, reviewed: nextReviewed } = removeAreaAtIndex(areas, reviewed, 2);

    expect(lifeAreas).toHaveLength(2);
    expect(lifeAreas[0].name).toBe("A");
    expect(lifeAreas[1].name).toBe("B");
    // 2 removed, 0→0, 1→1
    expect([...nextReviewed].sort()).toEqual([0, 1]);
  });

  it("re-indexes reviewed correctly: areas length 10, reviewed={2,5,7}, remove 5 → reviewed={2,6}", () => {
    const areas: LifeArea[] = Array.from({ length: 10 }, (_, i) => ({
      name: `Area ${i}`,
      score: 5,
      color: "#abc",
    }));
    const reviewed = new Set([2, 5, 7]);
    const { lifeAreas, reviewed: nextReviewed } = removeAreaAtIndex(areas, reviewed, 5);

    expect(lifeAreas).toHaveLength(9);
    // index 2 < 5 giữ nguyên → 2; index 7 > 5 giảm 1 → 6; index 5 bị loại
    expect([...nextReviewed].sort()).toEqual([2, 6]);
  });

  it("removes only item", () => {
    const areas: LifeArea[] = [{ name: "A", score: 5, color: "#111" }];
    const reviewed = new Set([0]);
    const { lifeAreas, reviewed: nextReviewed } = removeAreaAtIndex(areas, reviewed, 0);

    expect(lifeAreas).toHaveLength(0);
    expect(nextReviewed.size).toBe(0);
  });
});

describe("isDefaultLifeArea", () => {
  it("returns true for base area names", () => {
    expect(isDefaultLifeArea("Career")).toBe(true);
    expect(isDefaultLifeArea("Finance")).toBe(true);
    expect(isDefaultLifeArea("Health")).toBe(true);
    expect(isDefaultLifeArea("Leisure")).toBe(true);
  });

  it("returns false for custom area names", () => {
    expect(isDefaultLifeArea("Du lịch")).toBe(false);
    expect(isDefaultLifeArea("Tâm linh")).toBe(false);
    expect(isDefaultLifeArea("")).toBe(false);
  });

  it("all 8 base names return true", () => {
    for (const area of LIFE_AREAS) {
      expect(isDefaultLifeArea(area.name)).toBe(true);
    }
  });
});

describe("pickCustomAreaColor", () => {
  const palette = LIFE_AREAS.map((a) => a.color);

  it("returns a color from the LIFE_AREAS palette", () => {
    const color = pickCustomAreaColor("Du lịch");
    expect(palette).toContain(color);
  });

  it("is deterministic: same name always returns same color", () => {
    const color1 = pickCustomAreaColor("Du lịch");
    const color2 = pickCustomAreaColor("Du lịch");
    expect(color1).toBe(color2);
  });

  it("different names may get different colors", () => {
    const color1 = pickCustomAreaColor("Du lịch");
    const color2 = pickCustomAreaColor("Nghệ thuật");
    // They should both be valid palette colors
    expect(palette).toContain(color1);
    expect(palette).toContain(color2);
  });
});
