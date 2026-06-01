import { describe, expect, it } from "vitest";
import type { Plan12Week } from "../types/planTypes";
import { calculateLeadProgress } from "./progress";

function makePlan(reviewScores: number[]): Plan12Week {
  return {
    id: "plan-1",
    vision: "Ship the 12-week system",
    smartGoalId: "goal-1",
    startDate: "2026-05-04",
    weeks: reviewScores.map((score, index) => ({
      id: `week-${index + 1}`,
      weekNumber: index + 1,
      focus: "Weekly focus",
      expectedOutput: "Weekly output",
      tasks: [],
      leadMetrics: [],
      review: {
        weekNumber: index + 1,
        leadScore: score,
        commitmentsKept: [],
        commitmentsMissed: [],
        nextWeekCommitments: [],
        executionScore: score,
      },
    })),
  };
}

describe("calculateLeadProgress", () => {
  it("returns the mean lead score for reviewed weeks", () => {
    expect(calculateLeadProgress(makePlan([90, 70, 50]))).toBe(70);
  });
});
