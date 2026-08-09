import { describe, expect, it } from "vitest";

import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem, UniversalWeeklyReview } from "@/app/utils/storage-types";

import { buildWeeklyReviewForm } from "./useWeeklyReviewFormState";

function makeReview(weekNumber: number, overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber,
    leadCompletionPercent: 70,
    lagProgressValue: String(weekNumber * 10),
    biggestOutputThisWeek: `Legacy output ${weekNumber}`,
    mainObstacle: `Obstacle ${weekNumber}`,
    nextWeekPriority: `Priority ${weekNumber + 1}`,
    workloadDecision: "keep same",
    reviewCompleted: true,
    commitmentsKept: [],
    commitmentsMissed: [],
    insights: `Legacy insight ${weekNumber}`,
    nextWeekCommitments: [`Commitment ${weekNumber + 1}`],
    ...overrides,
  };
}

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship portfolio",
    lagMetric: { name: "Portfolio", unit: "%", target: "100", currentValue: "40" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "Ship" },
    successEvidence: "Live",
    reviewDay: "Sunday",
    week12Outcome: "Ship",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
    ...overrides,
  };
}

describe("buildWeeklyReviewForm", () => {
  it("builds a new current-week form from the current lag value and previous commitments", () => {
    const system = makeSystem({
      weeklyReviews: [makeReview(2, { nextWeekCommitments: ["Publish draft", "Train twice"] })],
    });

    const form = buildWeeklyReviewForm(system, 3, "45");

    expect(form).toMatchObject({
      lagProgressValue: "45",
      keepTactic: "",
      mainObstacle: "",
      reduceTactic: "",
      nextWeekCommitments: [],
      commitmentStatuses: {
        "Publish draft": "unanswered",
        "Train twice": "unanswered",
      },
    });
  });

  it("maps the three-question canonical fields while retaining legacy form values", () => {
    const review = makeReview(3, {
      keepTactic: "Morning deep work",
      mainObstacle: "Late meetings",
      reduceTactic: "Optional evening work",
      nextWeekPriority: "Ship portfolio",
      nextWeekCommitments: ["Ship portfolio", "Protect two mornings"],
      workloadDecision: "reduce slightly",
      insights: "Legacy insight must stay available for patch preservation",
      biggestOutputThisWeek: "Legacy output must stay available for patch preservation",
    });
    const system = makeSystem({ weeklyReviews: [makeReview(2), review] });

    const form = buildWeeklyReviewForm(system, 3, "45");

    expect(form).toEqual(
      expect.objectContaining({
        keepTactic: "Morning deep work",
        mainObstacle: "Late meetings",
        reduceTactic: "Optional evening work",
        nextWeekPriority: "Ship portfolio",
        nextWeekCommitments: ["Ship portfolio", "Protect two mornings"],
        workloadDecision: "reduce slightly",
        insights: "Legacy insight must stay available for patch preservation",
        biggestOutputThisWeek: "Legacy output must stay available for patch preservation",
      }),
    );
  });

  it("targets a selected historical review and its own previous commitments", () => {
    const week1 = makeReview(1, { nextWeekCommitments: ["Week 2 promise"] });
    const week2 = makeReview(2, {
      commitmentsKept: ["Week 2 promise"],
      keepTactic: "Historical keep",
      nextWeekCommitments: ["Week 3 promise"],
    });
    const system = makeSystem({ currentWeek: 5, weeklyReviews: [week1, week2, makeReview(5)] });

    const form = buildWeeklyReviewForm(system, 2, "99");

    expect(form.keepTactic).toBe("Historical keep");
    expect(form.nextWeekCommitments).toEqual(["Week 3 promise"]);
    expect(form.commitmentStatuses).toEqual({ "Week 2 promise": "kept" });
    expect(form.lagProgressValue).toBe("20");
  });

  it("falls back from legacy priority when canonical commitments are absent", () => {
    const system = makeSystem({
      weeklyReviews: [makeReview(3, { nextWeekCommitments: [], nextWeekPriority: "Legacy next priority" })],
    });

    const form = buildWeeklyReviewForm(system, 3, "45");

    expect(form.nextWeekCommitments).toEqual(["Legacy next priority"]);
    expect(form.nextWeekPriority).toBe("Legacy next priority");
  });
});
