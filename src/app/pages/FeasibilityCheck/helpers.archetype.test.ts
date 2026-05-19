import { describe, expect, it } from "vitest";

import { getArchetypeFeasibilityOverride } from "./archetypeCopy";
import { buildResult } from "./helpers";

const REALISTIC_ANSWERS: Record<number, string> = {
  1: "3to5",
  2: "energy_stable",
  3: "resources_mostly_ready",
  4: "realistic",
  5: "none",
  6: "mostly",
  7: "ready",
};

const CHALLENGING_ANSWERS: Record<number, string> = {
  1: "1to3",
  2: "energy_stable",
  3: "resources_basic",
  4: "challenging",
  5: "time",
  6: "mostly",
  7: "ready",
};

const TOO_AMBITIOUS_ANSWERS: Record<number, string> = {
  1: "1to3",
  2: "energy_low",
  3: "resources_basic",
  4: "overwhelming",
  5: "motivation",
  6: "sometimes",
  7: "interested",
};

describe("buildResult — archetype-aware copy", () => {
  it("backwards-compatible: no archetype produces the same generic copy as before", () => {
    const generic = buildResult(REALISTIC_ANSWERS, 7);
    const undefinedArch = buildResult(REALISTIC_ANSWERS, 7, { goalArchetype: undefined });

    expect(undefinedArch.firstWeekGuidance).toBe(generic.firstWeekGuidance);
    expect(undefinedArch.scopeRecommendation).toBe(generic.scopeRecommendation);
    expect(undefinedArch.bottleneck.action).toBe(generic.bottleneck.action);
  });

  it("'other' archetype falls back to generic copy", () => {
    const generic = buildResult(REALISTIC_ANSWERS, 7);
    const other = buildResult(REALISTIC_ANSWERS, 7, { goalArchetype: "other" });

    expect(other.firstWeekGuidance).toBe(generic.firstWeekGuidance);
    expect(other.scopeRecommendation).toBe(generic.scopeRecommendation);
  });

  it("same score, different archetypes → different first-week guidance", () => {
    const health = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "health_fitness" });
    const project = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "project_completion" });

    expect(health.type).toBe(project.type);
    expect(health.adjustedScore).toBe(project.adjustedScore);
    expect(health.firstWeekGuidance).not.toBe(project.firstWeekGuidance);
    expect(health.scopeRecommendation).not.toBe(project.scopeRecommendation);
  });

  it("project_completion warns about scope/dependencies/milestones", () => {
    const result = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "project_completion" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/scope|dependenc|mvp|mốc/i);
  });

  it("health_fitness warns about sustainable pace / recovery", () => {
    const result = buildResult(TOO_AMBITIOUS_ANSWERS, 4, { goalArchetype: "health_fitness" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/recovery|pace|nghỉ|chấn thương|sustainable|an toàn/i);
  });

  it("exam_study suggests practice tests / spaced repetition", () => {
    const result = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "exam_study" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/đề thi thử|spaced repetition|practice/i);
  });

  it("financial_goal recommends controllable actions / runway / risk buffer", () => {
    const result = buildResult(REALISTIC_ANSWERS, 7, { goalArchetype: "financial_goal" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/track|tự động|tiết kiệm|controllable|runway|saving/i);
  });

  it("habit_building recommends trigger / environment / friction", () => {
    const result = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "habit_building" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/cue|2-phút|friction|streak|môi trường/i);
  });

  it("skill_learning recommends practice consistency + feedback loop", () => {
    const result = buildResult(REALISTIC_ANSWERS, 7, { goalArchetype: "skill_learning" });
    const combined = `${result.firstWeekGuidance} ${result.scopeRecommendation}`.toLowerCase();
    expect(combined).toMatch(/feedback loop|dự án|output|consistency|luyện/i);
  });

  it("preserves numeric scoring regardless of archetype", () => {
    const generic = buildResult(REALISTIC_ANSWERS, 7);
    const archetypes = [
      "skill_learning",
      "health_fitness",
      "project_completion",
      "exam_study",
      "financial_goal",
      "habit_building",
      "creative_output",
      "career_growth",
      "relationship_life",
      "other",
    ] as const;
    for (const archetype of archetypes) {
      const result = buildResult(REALISTIC_ANSWERS, 7, { goalArchetype: archetype });
      expect(result.adjustedScore).toBe(generic.adjustedScore);
      expect(result.readinessScore).toBe(generic.readinessScore);
      expect(result.type).toBe(generic.type);
      expect(result.planLoad).toBe(generic.planLoad);
      expect(result.weeklyCapacity).toBe(generic.weeklyCapacity);
      expect(result.bottleneck.axis).toBe(generic.bottleneck.axis);
      expect(result.bottleneck.score).toBe(generic.bottleneck.score);
    }
  });

  it("appends bottleneck overlay note when archetype has one for the axis", () => {
    const generic = buildResult(CHALLENGING_ANSWERS, 6);
    expect(generic.bottleneck.axis).toBe("time"); // sanity
    const projectResult = buildResult(CHALLENGING_ANSWERS, 6, { goalArchetype: "project_completion" });
    expect(projectResult.bottleneck.action.length).toBeGreaterThan(generic.bottleneck.action.length);
    expect(projectResult.bottleneck.action).toContain(generic.bottleneck.action);
  });

  it("combines archetype scope copy with weak SMART quality suffix", () => {
    const result = buildResult(REALISTIC_ANSWERS, 7, {
      goalArchetype: "health_fitness",
      smartGoalQualityLevel: "weak",
    });
    // Archetype scope for realistic may be null (archetype only overrides challenging/too_ambitious scopes);
    // to force an archetype scope, use challenging answers:
    const challengingResult = buildResult(CHALLENGING_ANSWERS, 6, {
      goalArchetype: "health_fitness",
      smartGoalQualityLevel: "weak",
    });
    expect(challengingResult.scopeRecommendation).toContain("mục tiêu viết chưa rõ");
    expect(result.smartGoalQualityNote).toContain("chưa đủ rõ ràng");
  });
});

describe("getArchetypeFeasibilityOverride — accessor", () => {
  it("returns nulls for undefined archetype", () => {
    const override = getArchetypeFeasibilityOverride(undefined, "realistic", "time");
    expect(override.firstWeekGuidance).toBeNull();
    expect(override.scopeRecommendation).toBeNull();
    expect(override.bottleneckOverlayNote).toBeNull();
  });

  it("returns nulls for 'other'", () => {
    const override = getArchetypeFeasibilityOverride("other", "challenging", "time");
    expect(override.firstWeekGuidance).toBeNull();
    expect(override.scopeRecommendation).toBeNull();
    expect(override.bottleneckOverlayNote).toBeNull();
  });

  it("provides scope guidance for project_completion at 'too_ambitious'", () => {
    const override = getArchetypeFeasibilityOverride("project_completion", "too_ambitious", "clarity");
    expect(override.scopeRecommendation).not.toBeNull();
    expect(override.firstWeekGuidance).not.toBeNull();
  });

  it("returns null overlay when bottleneck axis is not in archetype's overlay table", () => {
    const override = getArchetypeFeasibilityOverride(
      "project_completion",
      "realistic",
      "energy", // not in project_completion overlay
    );
    expect(override.bottleneckOverlayNote).toBeNull();
  });
});
