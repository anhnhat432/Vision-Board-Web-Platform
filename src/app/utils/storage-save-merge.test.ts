import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyUserData } from "./storage-demo-data";
import { getDefaultScoreboard } from "./storage-twelve-week";
import {
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
} from "./storage-constants";
import { getUserData, resetUserDataCache, saveUserData } from "./storage";
import type { Goal, TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview, UserData } from "./storage-types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship production smoke reliability",
    lagMetric: {
      name: "Smoke reliability",
      unit: "%",
      target: "100",
      currentValue: "",
    },
    leadIndicators: [
      {
        id: "tactic_1",
        name: "Verify",
        target: "1",
        unit: "times/week",
        type: "core",
        priority: 1,
        schedule: [1],
      },
    ],
    milestones: {
      week4: "",
      week8: "",
      week12: "",
    },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "Reliable smoke",
    startDate: "2026-06-22",
    endDate: "2026-09-13",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
    ...overrides,
  };
}

function createGoal(system: TwelveWeekSystem): Goal {
  return {
    id: "goal_1",
    category: "Career",
    title: "Ship smoke",
    description: "",
    deadline: "2026-09-13",
    tasks: [],
    createdAt: "2026-06-22T00:00:00.000Z",
    twelveWeekSystem: system,
  };
}

function createUserData(system: TwelveWeekSystem): UserData {
  const data = createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
  data.goals = [createGoal(system)];
  return data;
}

const dailyCheckIn: UniversalDailyCheckIn = {
  date: "2026-06-27",
  didWorkToday: true,
  whichLeadIndicatorWorkedOn: "Verify",
  amountDone: "1/1 viec",
  outputCreated: "Smoke check",
  obstacleOrIssue: "",
  dailySelfRating: 3,
  optionalNote: "Local check-in should survive.",
  mood: "steady",
  updatedCount: 1,
};

function createDailyCheckInVersion(version: number): UniversalDailyCheckIn {
  return {
    ...dailyCheckIn,
    optionalNote: `Local check-in ${version}`,
    updatedCount: version,
  };
}

const weeklyReview: UniversalWeeklyReview = {
  weekNumber: 1,
  leadCompletionPercent: 100,
  lagProgressValue: "Smoke reliability: 100",
  biggestOutputThisWeek: "CI smoke mutation applied",
  mainObstacle: "",
  nextWeekPriority: "Keep smoke green",
  workloadDecision: "keep same",
  reviewCompleted: true,
  progressScore: 5,
  disciplineScore: 5,
  focusScore: 8,
  improvementScore: 8,
  outputQualityScore: 6,
  completedLeadIndicators: 1,
};

describe("saveUserData merge protection", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
  });

  it("preserves same-cycle daily check-ins when a stale save writes a weekly review", () => {
    const baseData = createUserData(createSystem());
    expect(saveUserData(baseData)).toBe(true);

    const staleBeforeCheckIn = clone(getUserData());
    const dataWithCheckIn = clone(getUserData());
    dataWithCheckIn.goals[0]!.twelveWeekSystem!.dailyCheckIns = [dailyCheckIn];
    expect(saveUserData(dataWithCheckIn)).toBe(true);

    const staleReviewSave = clone(staleBeforeCheckIn);
    staleReviewSave.goals[0]!.twelveWeekSystem!.weeklyReviews = [weeklyReview];
    expect(saveUserData(staleReviewSave)).toBe(true);

    const savedSystem = getUserData().goals[0]!.twelveWeekSystem;
    expect(savedSystem?.dailyCheckIns).toEqual([dailyCheckIn]);
    expect(savedSystem?.weeklyReviews).toHaveLength(1);
    expect(savedSystem?.weeklyReviews[0]).toEqual(expect.objectContaining(weeklyReview));
  });

  it("keeps only the five latest same-day check-ins when merging stale local records", () => {
    const baseData = createUserData(
      createSystem({
        dailyCheckIns: [6, 5, 4, 3, 2, 1].map(createDailyCheckInVersion),
      }),
    );
    expect(saveUserData(baseData)).toBe(true);

    const prunedSave = clone(getUserData());
    prunedSave.goals[0]!.twelveWeekSystem!.dailyCheckIns = [7, 6, 5, 4, 3].map(createDailyCheckInVersion);
    expect(saveUserData(prunedSave)).toBe(true);

    const savedSystem = getUserData().goals[0]!.twelveWeekSystem;
    expect(savedSystem?.dailyCheckIns.map((checkIn) => checkIn.optionalNote)).toEqual([
      "Local check-in 7",
      "Local check-in 6",
      "Local check-in 5",
      "Local check-in 4",
      "Local check-in 3",
    ]);
  });

  it("allows an intentional new cycle save to clear old execution records", () => {
    const baseData = createUserData(createSystem({ dailyCheckIns: [dailyCheckIn], weeklyReviews: [weeklyReview] }));
    expect(saveUserData(baseData)).toBe(true);

    const nextCycleData = clone(getUserData());
    nextCycleData.goals[0]!.twelveWeekSystem = createSystem({
      cycleNumber: 2,
      startDate: "2026-09-14",
      endDate: "2026-12-06",
      dailyCheckIns: [],
      weeklyReviews: [],
    });
    expect(saveUserData(nextCycleData)).toBe(true);

    const savedSystem = getUserData().goals[0]!.twelveWeekSystem;
    expect(savedSystem?.dailyCheckIns).toEqual([]);
    expect(savedSystem?.weeklyReviews).toEqual([]);
  });
});
