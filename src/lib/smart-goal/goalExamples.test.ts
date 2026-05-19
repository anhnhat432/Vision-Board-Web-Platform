import { describe, expect, it } from "vitest";

import type { GoalArchetype } from "./goalArchetypes";
import { getAllGoalArchetypeExamples, getGoalArchetypeExample, type ArchetypeExample } from "./goalExamples";

const ARCHETYPES: readonly GoalArchetype[] = [
  "skill_learning",
  "health_fitness",
  "career_growth",
  "financial_goal",
  "exam_study",
  "project_completion",
  "habit_building",
  "creative_output",
  "relationship_life",
  "other",
];

const REQUIRED_FIELDS: ReadonlyArray<keyof ArchetypeExample> = [
  "weakGoal",
  "strongerGoal",
  "goodMetric",
  "badMetric",
  "goodLeadIndicator",
  "badLeadIndicator",
  "week1StarterTask",
];

/**
 * v1 examples are calibrated to be realistic and 12-week-friendly. This
 * regex set blocks copy that would over-promise (e.g. "trong 1 tuần",
 * "lập tức", or single-digit-day timeframes attached to a transformation).
 *
 * It is intentionally narrow: it flags only obvious over-promises so the
 * test never blocks a legitimately ambitious example.
 */
const OVER_PROMISE_PATTERNS: readonly RegExp[] = [
  /\btrong\s+1\s+(?:tuần|ngày)\b/i,
  /\blập\s*tức\b/i,
  /\bngay\s+lập\s+tức\b/i,
  /\bsiêu\s+nhanh\b/i,
  /\b(?:guarantee|đảm\s*bảo)\s+(?:thành\s*công|kết\s*quả)\b/i,
];

describe("goalExamples — coverage", () => {
  for (const archetype of ARCHETYPES) {
    it(`provides a complete example bundle for ${archetype}`, () => {
      const example = getGoalArchetypeExample(archetype);
      expect(example.archetype).toBe(archetype);
      for (const field of REQUIRED_FIELDS) {
        const value = example[field];
        expect(typeof value, `${archetype}.${String(field)}`).toBe("string");
        expect(value.length, `${archetype}.${String(field)} length`).toBeGreaterThan(8);
      }
    });
  }

  it("getAllGoalArchetypeExamples enumerates exactly the 10 archetypes", () => {
    const all = getAllGoalArchetypeExamples();
    const ids = all.map((entry) => entry.archetype).sort();
    expect(ids).toEqual([...ARCHETYPES].sort());
  });
});

describe("goalExamples — quality guardrails", () => {
  it("the weak and stronger goal differ for every archetype", () => {
    for (const archetype of ARCHETYPES) {
      const example = getGoalArchetypeExample(archetype);
      expect(example.weakGoal, archetype).not.toBe(example.strongerGoal);
    }
  });

  it("the good and bad metric differ for every archetype", () => {
    for (const archetype of ARCHETYPES) {
      const example = getGoalArchetypeExample(archetype);
      expect(example.goodMetric, archetype).not.toBe(example.badMetric);
    }
  });

  it("the good and bad lead indicator differ for every archetype", () => {
    for (const archetype of ARCHETYPES) {
      const example = getGoalArchetypeExample(archetype);
      expect(example.goodLeadIndicator, archetype).not.toBe(example.badLeadIndicator);
    }
  });

  it("no example uses unrealistic over-promise wording", () => {
    for (const archetype of ARCHETYPES) {
      const example = getGoalArchetypeExample(archetype);
      const allText = REQUIRED_FIELDS.map((field) => example[field]).join(" \n ");
      for (const pattern of OVER_PROMISE_PATTERNS) {
        expect(pattern.test(allText), `${archetype} matched ${pattern}`).toBe(false);
      }
    }
  });

  it("week1StarterTask reads as a small concrete first action (not a 12-week vision)", () => {
    for (const archetype of ARCHETYPES) {
      const { week1StarterTask } = getGoalArchetypeExample(archetype);
      // Sanity: should not say "trong 12 tuần" — that's the vision, not the starter.
      expect(week1StarterTask, archetype).not.toMatch(/\btrong\s+12\s+tuần\b/i);
    }
  });
});

describe("goalExamples — fallback", () => {
  it("returns the 'other' bundle for unknown archetypes (defensive lookup)", () => {
    const fallback = getGoalArchetypeExample("other");
    // Type-cast to access via key; the function intentionally never throws.
    const lookup = (getGoalArchetypeExample as (a: GoalArchetype) => ArchetypeExample)("skill_learning");
    expect(fallback.archetype).toBe("other");
    expect(lookup.archetype).toBe("skill_learning");
  });
});
