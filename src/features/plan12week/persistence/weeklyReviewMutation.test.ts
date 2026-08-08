import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, resetUserDataCache, saveUserData } from "@/app/utils/storage";
import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance, UniversalWeeklyReview } from "@/app/utils/storage-types";
import { listStoredPendingMutations } from "./mutationQueue";
import { commitTwelveWeekWeeklyReview } from "./weeklyReviewMutation";

const GOAL_ID = "goal_canonical_weekly_review";
const WEEK_NUMBER = 4;
const NOW = new Date("2026-08-08T08:00:00.000Z");

function createTasks(): TwelveWeekTaskInstance[] {
  return Array.from({ length: 21 }, (_, index) => ({
    id: `review_task_${index + 1}`,
    weekNumber: WEEK_NUMBER,
    scheduledDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
    title: `Task ${index + 1}`,
    leadIndicatorName: "Deep work",
    isCore: index < 14,
    completed: index < 17,
    completedAt: index < 17 ? "2026-08-08T07:00:00.000Z" : undefined,
  }));
}

function createSystem(review?: UniversalWeeklyReview): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship portfolio",
    lagMetric: { name: "Portfolio progress", unit: "%", target: "100", currentValue: "20" },
    leadIndicators: [],
    milestones: { week4: "Case study", week8: "Portfolio", week12: "Applications" },
    successEvidence: "Portfolio is live",
    reviewDay: "Saturday",
    week12Outcome: "Ship portfolio",
    startDate: "2026-07-13",
    endDate: "2026-10-04",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: WEEK_NUMBER,
    totalWeeks: 12,
    weeklyPlans: Array.from({ length: 12 }, (_, index) => ({
      weekNumber: index + 1,
      phaseName: "Build",
      focus: `Week ${index + 1}`,
      milestone: "",
      completed: false,
    })),
    taskInstances: createTasks(),
    dailyCheckIns: [],
    weeklyReviews: review ? [review] : [],
    scoreboard: getDefaultScoreboard(12),
  };
}

function createExistingReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: WEEK_NUMBER,
    leadCompletionPercent: 50,
    executionScore: 50,
    lagProgressValue: "20",
    biggestOutputThisWeek: "Existing output",
    mainObstacle: "Existing obstacle",
    nextWeekPriority: "Existing priority",
    workloadDecision: "keep same",
    reviewCompleted: true,
    commitmentsKept: ["Deep work"],
    commitmentsMissed: ["Exercise"],
    insights: "Existing insight",
    nextWeekCommitments: ["Finish portfolio", "Train twice"],
    keepTactic: "Morning work",
    reduceTactic: "Late meetings",
    reflection: "Existing reflection",
    adjustments: "Existing adjustment",
    progressScore: 7,
    disciplineScore: 7,
    focusScore: 7,
    improvementScore: 7,
    outputQualityScore: 7,
    completedLeadIndicators: 2,
    lastReviewAt: "2026-08-01T08:00:00.000Z",
    ...overrides,
  };
}

function seedGoal(review?: UniversalWeeklyReview): void {
  const data = getUserData();
  const goal: Goal = {
    id: GOAL_ID,
    category: "Career",
    title: "Canonical weekly review",
    description: "",
    deadline: "2026-10-04",
    tasks: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    twelveWeekSystem: createSystem(review),
  };
  data.goals = [goal];
  expect(saveUserData(data)).toBe(true);
}

function readReview(): UniversalWeeklyReview {
  const review = getUserData().goals[0]?.twelveWeekSystem?.weeklyReviews.find(
    (item) => item.weekNumber === WEEK_NUMBER,
  );
  if (!review) throw new Error("Expected persisted weekly review");
  return review;
}

function weeklyReviewMutations() {
  return listStoredPendingMutations(null, { now: NOW }).filter((item) => item.kind === "weekly_review_upserted");
}

describe("canonical weekly review mutation", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    seedGoal();
  });

  it("saves the canonical review locally, derives 17/21 execution, rebuilds scoreboard, and queues once", () => {
    const result = commitTwelveWeekWeeklyReview({
      goalId: GOAL_ID,
      lagMetricCurrentValue: "42",
      now: NOW,
      review: {
        weekNumber: WEEK_NUMBER,
        lagProgressValue: "42",
        biggestOutputThisWeek: "Finished case study",
        mainObstacle: "Late meetings",
        nextWeekPriority: "Ship portfolio",
        workloadDecision: "reduce slightly",
        reviewCompleted: true,
        commitmentsKept: [" Deep work ", "", "Plan", "Write", "Ship", "Train", "Overflow"],
        commitmentsMissed: ["Exercise"],
        insights: "Morning work was more reliable",
        nextWeekCommitments: ["Finish portfolio", "Train twice"],
        keepTactic: "Morning deep work",
        reduceTactic: "Optional evening work",
        reflection: "Legacy reflection",
        adjustments: "Legacy adjustment",
      },
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") throw new Error("Expected applied result");
    expect(result.review).toEqual(
      expect.objectContaining({
        executionScore: 81,
        leadCompletionPercent: 81,
        commitmentsKept: ["Deep work", "Plan", "Write", "Ship", "Train"],
        lastReviewAt: NOW.toISOString(),
      }),
    );
    expect(result.review).not.toHaveProperty("progressScore");
    expect(result.updatedSystem.lagMetric.currentValue).toBe("42");
    expect(result.updatedSystem.scoreboard[WEEK_NUMBER - 1]).toEqual(
      expect.objectContaining({ reviewDone: true, outputDone: "Finished case study" }),
    );
    expect(readReview()).toEqual(result.review);
    expect(result.mutationEnqueued).toBe(true);

    const mutations = weeklyReviewMutations();
    expect(mutations).toHaveLength(1);
    expect(mutations[0]?.payload).toEqual(
      expect.objectContaining({
        weekNumber: WEEK_NUMBER,
        executionScore: 81,
        review: expect.objectContaining({
          insights: "Morning work was more reliable",
          nextWeekCommitments: ["Finish portfolio", "Train twice"],
        }),
      }),
    );
  });

  it("merges a partial Assistant-style update against the latest persisted review", () => {
    localStorage.clear();
    resetUserDataCache();
    seedGoal(createExistingReview());

    const result = commitTwelveWeekWeeklyReview({
      goalId: GOAL_ID,
      now: NOW,
      review: {
        weekNumber: WEEK_NUMBER,
        mainObstacle: "Updated obstacle",
        nextWeekPriority: "Updated priority",
        reflection: "Updated reflection",
      },
    });

    expect(result.status).toBe("applied");
    const review = readReview();
    expect(review).toEqual(
      expect.objectContaining({
        executionScore: 81,
        mainObstacle: "Updated obstacle",
        nextWeekPriority: "Updated priority",
        reflection: "Updated reflection",
        commitmentsKept: ["Deep work"],
        commitmentsMissed: ["Exercise"],
        insights: "Existing insight",
        nextWeekCommitments: ["Finish portfolio", "Train twice"],
        progressScore: 7,
      }),
    );
  });

  it("treats an exact normalized duplicate as a noop without another queue item", () => {
    const input = {
      goalId: GOAL_ID,
      now: NOW,
      review: {
        weekNumber: WEEK_NUMBER,
        biggestOutputThisWeek: "Finished case study",
        reviewCompleted: true,
      },
    } as const;
    const first = commitTwelveWeekWeeklyReview(input);
    const persistedAfterFirst = localStorage.getItem("visionboard_user_data");
    const second = commitTwelveWeekWeeklyReview({ ...input, now: new Date(NOW.getTime() + 1_000) });

    expect(first.status).toBe("applied");
    expect(second.status).toBe("noop");
    expect(localStorage.getItem("visionboard_user_data")).toBe(persistedAfterFirst);
    expect(weeklyReviewMutations()).toHaveLength(1);
  });

  it("allows explicit empty arrays to clear existing commitments", () => {
    localStorage.clear();
    resetUserDataCache();
    seedGoal(createExistingReview());

    const result = commitTwelveWeekWeeklyReview({
      goalId: GOAL_ID,
      now: NOW,
      review: {
        weekNumber: WEEK_NUMBER,
        commitmentsKept: [],
        commitmentsMissed: [],
        nextWeekCommitments: [],
      },
    });

    expect(result.status).toBe("applied");
    expect(readReview()).toEqual(
      expect.objectContaining({ commitmentsKept: [], commitmentsMissed: [], nextWeekCommitments: [] }),
    );
  });

  it("returns structured not_found results without queueing", () => {
    expect(
      commitTwelveWeekWeeklyReview({ goalId: "missing", review: { weekNumber: WEEK_NUMBER }, now: NOW }),
    ).toEqual({ status: "not_found", target: "goal" });
    expect(
      commitTwelveWeekWeeklyReview({ goalId: GOAL_ID, review: { weekNumber: 13 }, now: NOW }),
    ).toEqual({ status: "not_found", target: "week" });
    expect(weeklyReviewMutations()).toEqual([]);
  });

  it("reports local_save_failed without queueing or changing the persisted review", () => {
    const before = localStorage.getItem("visionboard_user_data");
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "visionboard_user_data") {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      const result = commitTwelveWeekWeeklyReview({
        goalId: GOAL_ID,
        now: NOW,
        review: { weekNumber: WEEK_NUMBER, biggestOutputThisWeek: "Should not persist" },
      });

      expect(result.status).toBe("local_save_failed");
      expect(localStorage.getItem("visionboard_user_data")).toBe(before);
      expect(getUserData().goals[0]?.twelveWeekSystem?.weeklyReviews).toEqual([]);
      expect(weeklyReviewMutations()).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("keeps the local review authoritative when queue persistence fails", () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("visionboard_data_mutation_queue")) {
        throw new Error("queue unavailable");
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      const result = commitTwelveWeekWeeklyReview({
        goalId: GOAL_ID,
        now: NOW,
        review: { weekNumber: WEEK_NUMBER, biggestOutputThisWeek: "Saved locally", reviewCompleted: true },
      });

      expect(result.status).toBe("applied");
      if (result.status !== "applied") throw new Error("Expected applied result");
      expect(result.mutationEnqueued).toBe(false);
      expect(readReview().biggestOutputThisWeek).toBe("Saved locally");
      expect(weeklyReviewMutations()).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
