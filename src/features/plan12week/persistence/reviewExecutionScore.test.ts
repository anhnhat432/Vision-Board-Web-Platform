import { describe, expect, it } from "vitest";

import type { UniversalWeeklyReview } from "@/app/utils/storage-types";
import { getUniversalWeeklyReviewExecutionScore } from "./reviewExecutionScore";

function createReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: 1,
    leadCompletionPercent: 80,
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    nextWeekPriority: "",
    workloadDecision: "",
    reviewCompleted: true,
    progressScore: 8,
    disciplineScore: 8,
    focusScore: 8,
    improvementScore: 8,
    outputQualityScore: 8,
    ...overrides,
  };
}

describe("getUniversalWeeklyReviewExecutionScore", () => {
  it("keeps explicit canonical execution score ahead of legacy ratings", () => {
    expect(getUniversalWeeklyReviewExecutionScore(createReview({ executionScore: 20 }))).toBe(20);
  });

  it("uses lead completion before legacy ratings for compatibility", () => {
    expect(getUniversalWeeklyReviewExecutionScore(createReview({ leadCompletionPercent: 35 }))).toBe(35);
  });

  it("keeps rating-derived score only as a legacy fallback", () => {
    expect(
      getUniversalWeeklyReviewExecutionScore(
        createReview({
          leadCompletionPercent: Number.NaN,
          progressScore: 8,
          disciplineScore: 8,
          focusScore: 8,
          improvementScore: 8,
          outputQualityScore: 8,
        }),
      ),
    ).toBe(80);
  });
});
