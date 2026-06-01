import { describe, expect, it } from "vitest";
import type { UniversalWeeklyReview } from "@/app/utils/storage-types";
import { calculateCycleSummary } from "./cycleReview";

function makeReview(
  weekNumber: number,
  leadScore: number,
  overrides: Partial<UniversalWeeklyReview> = {},
): UniversalWeeklyReview {
  return {
    weekNumber,
    leadCompletionPercent: leadScore,
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    nextWeekPriority: "",
    workloadDecision: "keep same",
    reviewCompleted: true,
    progressScore: 0,
    disciplineScore: 0,
    focusScore: 0,
    improvementScore: 0,
    outputQualityScore: 0,
    completedLeadIndicators: 0,
    leadScore,
    commitmentsKept: ["Giữ nhịp việc cốt lõi"],
    commitmentsMissed: weekNumber % 2 === 0 ? ["Bỏ lỡ review cuối tuần"] : [],
    insights: `Insight tuần ${weekNumber}`,
    nextWeekCommitments: [`Cam kết tuần ${weekNumber + 1}`],
    ...overrides,
  } as UniversalWeeklyReview;
}

describe("calculateCycleSummary", () => {
  it("averages 12 weekly lead scores and counts weeks at or above 85", () => {
    const leadScores = [90, 70, 85, 100, 64, 88, 92, 55, 85, 86, 40, 95];
    const reviews = leadScores.map((score, index) => makeReview(index + 1, score));

    const summary = calculateCycleSummary(
      { totalWeeks: 12 },
      { name: "Revenue", unit: "%", target: "100", currentValue: "92" },
      reviews,
    );

    expect(summary.averageLeadScore).toBe(79);
    expect(summary.weeksWith85Plus).toBe(8);
    expect(summary.finalLagPercent).toBe(92);
    expect(summary.commitmentsKeptRate).toBe(67);
    expect(summary.biggestWins).toContain("Insight tuần 1");
    expect(summary.topAdjustments[0]).toBe("Bỏ lỡ review cuối tuần");
  });

  it("returns zero KPIs when there are no reviews or valid lag target", () => {
    const summary = calculateCycleSummary(
      { totalWeeks: 12 },
      { name: "Revenue", unit: "%", target: "0", currentValue: "10" },
      [],
    );

    expect(summary).toEqual({
      finalLagPercent: 0,
      averageLeadScore: 0,
      commitmentsKeptRate: 0,
      weeksWith85Plus: 0,
      biggestWins: [],
      topAdjustments: [],
    });
  });
});
