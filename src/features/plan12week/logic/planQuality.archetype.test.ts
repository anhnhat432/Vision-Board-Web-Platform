import { describe, expect, it } from "vitest";

import { evaluateTwelveWeekPlanQuality, type PlanQualityInput } from "./planQuality";

function makePlan(overrides: Partial<PlanQualityInput> = {}): PlanQualityInput {
  return {
    vision12Week:
      overrides.vision12Week ??
      "Trong 12 tuần tôi sẽ xây dựng một kỹ năng/thói quen/dự án cụ thể với kết quả đo được rõ ràng.",
    week12Outcome: overrides.week12Outcome ?? "Kết quả 12 tuần đo được.",
    goalType: overrides.goalType,
    goalArchetype: overrides.goalArchetype,
    lagMetric: overrides.lagMetric ?? { name: "Chỉ số chính", target: "12", unit: "lần" },
    leadIndicators:
      overrides.leadIndicators ?? [
        { name: "Việc 1", target: "2", schedule: [1, 4], type: "core" },
        { name: "Việc 2", target: "1", schedule: [6], type: "core" },
      ],
    milestones:
      overrides.milestones ?? {
        week4: "Mốc tuần 4 đã hoàn thành một phần đầu tiên.",
        week8: "Mốc tuần 8 đã đạt nửa mục tiêu.",
        week12: "Đạt kết quả tuần 12.",
      },
    reviewDay: overrides.reviewDay ?? "Sunday",
    tacticLoadPreference: overrides.tacticLoadPreference ?? "balanced",
    dailyTimeBudget: overrides.dailyTimeBudget ?? "1h",
    personalConstraint: overrides.personalConstraint ?? "consistency",
  };
}

describe("planQuality - archetype backwards compatibility", () => {
  it("no archetype produces same warnings as before", () => {
    const withoutArchetype = evaluateTwelveWeekPlanQuality(makePlan());
    const withOther = evaluateTwelveWeekPlanQuality(makePlan({ goalArchetype: "other" }));
    expect(withOther.warnings).toEqual(withoutArchetype.warnings);
    expect(withOther.suggestions).toEqual(withoutArchetype.suggestions);
  });

  it("scoring is unchanged regardless of archetype", () => {
    const baseline = evaluateTwelveWeekPlanQuality(makePlan());
    const archetypes = [
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
    ] as const;
    for (const archetype of archetypes) {
      const result = evaluateTwelveWeekPlanQuality(makePlan({ goalArchetype: archetype }));
      expect(result.overallScore).toBe(baseline.overallScore);
      expect(result.dimensions.map((d) => d.score)).toEqual(baseline.dimensions.map((d) => d.score));
    }
  });
});

describe("planQuality - skill_learning archetype", () => {
  it("warns when indicator names don't include practice/demo/feedback-loop keywords", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "skill_learning",
        leadIndicators: [
          { name: "Đọc sách", target: "3", schedule: [1, 3, 5], type: "core" },
          { name: "Xem video", target: "2", schedule: [2, 4], type: "core" },
        ],
      }),
    );
    const combined = [...result.warnings, ...result.suggestions].join(" ").toLowerCase();
    expect(combined).toMatch(/feedback|output|demo|pair review|luyện/i);
  });

  it("does not warn when skill plan has practice and demo indicators", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "skill_learning",
        leadIndicators: [
          { name: "Luyện tập dự án", target: "3", schedule: [1, 3, 5], type: "core" },
          { name: "Pair review / demo", target: "1", schedule: [6], type: "core" },
        ],
      }),
    );
    const skillFeedbackWarning = [...result.warnings, ...result.suggestions].find((msg) =>
      msg.toLowerCase().includes("feedback loop"),
    );
    expect(skillFeedbackWarning).toBeUndefined();
  });
});

describe("planQuality - health_fitness archetype", () => {
  it("warns when tacticLoadPreference is 'push' for health goal", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "health_fitness",
        tacticLoadPreference: "push",
        leadIndicators: [
          { name: "Cardio 30 phút", target: "3", schedule: [1, 3, 5], type: "core" },
          { name: "Strength session", target: "2", schedule: [2, 5], type: "core" },
        ],
      }),
    );
    const hasPushWarning = result.warnings.some((w) => /chấn thương|kiệt sức|push/i.test(w));
    expect(hasPushWarning).toBe(true);
  });

  it("suggests adding recovery when health plan has no recovery indicator", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "health_fitness",
        leadIndicators: [
          { name: "Cardio", target: "3", schedule: [1, 3, 5], type: "core" },
          { name: "Strength", target: "2", schedule: [2, 5], type: "core" },
        ],
      }),
    );
    const hasRecoverySuggestion = result.suggestions.some((s) =>
      /recovery|nghỉ/i.test(s),
    );
    expect(hasRecoverySuggestion).toBe(true);
  });
});

describe("planQuality - project_completion archetype", () => {
  it("warns when milestones are too short to be deliverables", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "project_completion",
        milestones: {
          week4: "OK",
          week8: "Tiếp",
          week12: "Xong",
        },
      }),
    );
    const hasDeliverableWarning = result.warnings.some((w) =>
      /deliverable|ship|release/i.test(w),
    );
    expect(hasDeliverableWarning).toBe(true);
  });

  it("does not warn when project plan has deliverable milestones", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "project_completion",
        leadIndicators: [
          { name: "Build session", target: "3", schedule: [1, 3, 5], type: "core" },
          { name: "User feedback", target: "1", schedule: [6], type: "core" },
        ],
        milestones: {
          week4: "Ship được 50% MVP scope với user đầu tiên.",
          week8: "Đạt 80% scope MVP và fix dependency blocker.",
          week12: "Ship MVP v1 công khai với metric đo rõ.",
        },
      }),
    );
    const hasDeliverableWarning = result.warnings.some((w) =>
      /deliverable|ship/i.test(w) && /2 trong 3/.test(w),
    );
    expect(hasDeliverableWarning).toBe(false);
  });
});

describe("planQuality - exam_study archetype", () => {
  it("warns when no practice test indicator is present", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "exam_study",
        leadIndicators: [
          { name: "Học từ vựng", target: "5", schedule: [1, 2, 3, 4, 5], type: "core" },
          { name: "Đọc tài liệu", target: "3", schedule: [2, 4, 6], type: "core" },
        ],
      }),
    );
    const hasPracticeTestWarning = result.warnings.some((w) =>
      /đề thi thử|practice test/i.test(w),
    );
    expect(hasPracticeTestWarning).toBe(true);
  });

  it("does not warn when exam plan has practice test indicator", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "exam_study",
        leadIndicators: [
          { name: "Làm đề thi thử", target: "1", schedule: [6], type: "core" },
          { name: "Review lỗi", target: "2", schedule: [1, 4], type: "core" },
        ],
      }),
    );
    const hasPracticeTestWarning = result.warnings.some((w) =>
      /đề thi thử|practice test/i.test(w),
    );
    expect(hasPracticeTestWarning).toBe(false);
  });
});

describe("planQuality - financial_goal archetype", () => {
  it("warns when financial plan has no lead indicators (only lag metric)", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "financial_goal",
        leadIndicators: [],
      }),
    );
    const hasControllableActionWarning = result.warnings.some((w) =>
      /kiểm soát|tracking|chuyển khoản tự động/i.test(w),
    );
    expect(hasControllableActionWarning).toBe(true);
  });

  it("suggests more actions when financial plan has only 1 indicator", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "financial_goal",
        leadIndicators: [
          { name: "Track chi tiêu", target: "7", schedule: [0, 1, 2, 3, 4, 5, 6], type: "core" },
        ],
      }),
    );
    const hasTwoActionsSuggestion = result.suggestions.some((s) =>
      /2 hành động|weekly review/i.test(s),
    );
    expect(hasTwoActionsSuggestion).toBe(true);
  });
});

describe("planQuality - habit_building archetype", () => {
  it("suggests cue/trigger when habit plan lacks cue signal", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "habit_building",
        leadIndicators: [
          { name: "Đọc 30 phút", target: "7", schedule: [0, 1, 2, 3, 4, 5, 6], type: "core" },
        ],
      }),
    );
    const hasCueSuggestion = result.suggestions.some((s) =>
      /cue|trigger|routine|sau cà phê|đánh răng/i.test(s),
    );
    expect(hasCueSuggestion).toBe(true);
  });
});

describe("planQuality - fallback 'other' archetype", () => {
  it("still evaluates plan without adding archetype-specific warnings", () => {
    const result = evaluateTwelveWeekPlanQuality(
      makePlan({
        goalArchetype: "other",
        leadIndicators: [
          { name: "Việc bất kỳ", target: "3", schedule: [1, 3, 5], type: "core" },
        ],
      }),
    );
    const archetypeSpecificWarnings = result.warnings.filter((w) =>
      /loại mục tiêu|archetype|deliverable.*ship|đề thi thử|tracking/i.test(w),
    );
    expect(archetypeSpecificWarnings).toEqual([]);
  });
});
