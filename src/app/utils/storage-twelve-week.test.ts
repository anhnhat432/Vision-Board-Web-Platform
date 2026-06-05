import { describe, expect, it } from "vitest";
import { CURRENT_STORAGE_VERSION, DEFAULT_APP_PREFERENCES, MOTIVATIONAL_QUOTES } from "./storage-constants";
import { createEmptyUserData } from "./storage-demo-data";
import { recomputeGoalProgressFromWeeksInData } from "./storage-goal-ops";
import {
  getActiveTwelveWeekGoal,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  getTwelveWeekCycleWeekNumber,
  getTwelveWeekMissedTasks,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  getWeekTaskBreakdown,
  hasFilledCommitment,
  isTwelveWeekCycleReviewPhase,
  migrateLegacyUserData,
  normalizeGoal,
  regenerateUpcomingTaskInstances,
  rescheduleTwelveWeekTaskToNextWeek,
  rescheduleTwelveWeekTaskWithinWeek,
  skipTwelveWeekNonCoreTask,
  sortTwelveWeekGoalsForSelection,
} from "./storage-twelve-week";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "./storage-types";

function createSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship core flow",
    lagMetric: {
      name: "Lag",
      unit: "units",
      target: "100",
      currentValue: "",
    },
    leadIndicators: [
      {
        id: "tactic_1",
        name: "Ship",
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
    week12Outcome: "",
    startDate: "2026-03-02",
    endDate: "2026-05-24",
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

function createGoal(id: string, createdAt: string, systemOverrides: Partial<TwelveWeekSystem> = {}): Goal {
  return {
    id,
    category: "Career",
    title: id,
    description: "",
    deadline: "2026-06-30",
    tasks: [],
    createdAt,
    twelveWeekSystem: createSystem(systemOverrides),
  };
}

describe("getTwelveWeekCurrentWeek boundary derivation", () => {
  it("switches weeks at Monday boundary for Monday-start systems", () => {
    const system = createSystem({
      weekStartsOn: "Monday",
      startDate: "2026-03-02",
    });

    expect(getTwelveWeekCurrentWeek(system, new Date(2026, 2, 8))).toBe(1);
    expect(getTwelveWeekCurrentWeek(system, new Date(2026, 2, 9))).toBe(2);
  });

  it("switches weeks at Sunday boundary for Sunday-start systems", () => {
    const system = createSystem({
      weekStartsOn: "Sunday",
      startDate: "2026-03-01",
    });

    expect(getTwelveWeekCurrentWeek(system, new Date(2026, 2, 7))).toBe(1);
    expect(getTwelveWeekCurrentWeek(system, new Date(2026, 2, 8))).toBe(2);
  });
});

describe("getActiveTwelveWeekGoal", () => {
  it("prefers the newest active cycle over a newer completed cycle", () => {
    const olderActive = createGoal("older-active", "2026-04-01T00:00:00.000Z", { status: "active" });
    const newerCompleted = createGoal("newer-completed", "2026-04-20T00:00:00.000Z", { status: "completed" });

    expect(getActiveTwelveWeekGoal([newerCompleted, olderActive])?.id).toBe("older-active");
  });

  it("keeps an explicit preferred cycle when it exists", () => {
    const olderActive = createGoal("older-active", "2026-04-01T00:00:00.000Z", { status: "active" });
    const newerCompleted = createGoal("newer-completed", "2026-04-20T00:00:00.000Z", { status: "completed" });

    expect(getActiveTwelveWeekGoal([olderActive, newerCompleted], "newer-completed")?.id).toBe("newer-completed");
  });
});

describe("sortTwelveWeekGoalsForSelection", () => {
  it("orders selectable cycles by status before recency", () => {
    const newerCompleted = createGoal("newer-completed", "2026-04-20T00:00:00.000Z", { status: "completed" });
    const newestPaused = createGoal("newest-paused", "2026-04-25T00:00:00.000Z", { status: "paused" });
    const olderActive = createGoal("older-active", "2026-04-01T00:00:00.000Z", { status: "active" });

    expect(sortTwelveWeekGoalsForSelection([newerCompleted, newestPaused, olderActive]).map((goal) => goal.id)).toEqual(
      ["older-active", "newest-paused", "newer-completed"],
    );
  });
});

function makeTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: overrides.id ?? "task_1",
    weekNumber: overrides.weekNumber ?? 1,
    scheduledDate: overrides.scheduledDate ?? "2026-03-03",
    title: overrides.title ?? "Việc giữ nhịp",
    leadIndicatorName: overrides.leadIndicatorName ?? "Ship",
    isCore: overrides.isCore ?? true,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt,
    tacticId: overrides.tacticId ?? "tactic_1",
    rescheduledFrom: overrides.rescheduledFrom,
    skipped: overrides.skipped,
  };
}

function createSystemWithTasks(tasks: TwelveWeekTaskInstance[]): TwelveWeekSystem {
  return createSystem({ taskInstances: tasks });
}

describe("recomputeGoalProgressFromWeeksInData", () => {
  it("returns 50 when five of ten 12-week tasks are completed", () => {
    const taskInstances = Array.from({ length: 10 }, (_, index) =>
      makeTask({
        id: `task_${index + 1}`,
        completed: index < 5,
      }),
    );
    const data = createEmptyUserData({
      currentStorageVersion: CURRENT_STORAGE_VERSION,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    data.goals = [createGoal("goal_12_week", "2026-03-01T00:00:00.000Z", { taskInstances })];

    expect(recomputeGoalProgressFromWeeksInData(data, "goal_12_week")).toBe(50);
  });
});

describe("rescheduleTwelveWeekTaskWithinWeek", () => {
  it("moves an overdue task to today (within current week range)", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", weekNumber: 1, scheduledDate: "2026-03-03" })]);
    const today = new Date(2026, 2, 5); // Mar 5, week 1 (Mar 2 - Mar 8)
    const result = rescheduleTwelveWeekTaskWithinWeek(system, "task_a", today);

    expect(result.applied).toBe(true);
    expect(result.reason).toBe("ok");
    expect(result.updatedTask?.scheduledDate).toBe("2026-03-05");
    expect(result.updatedTask?.weekNumber).toBe(1);
    expect(result.updatedTask?.rescheduledFrom).toBe("2026-03-03");
  });

  it("preserves the original rescheduledFrom when re-rescheduled later", () => {
    const system = createSystemWithTasks([
      makeTask({ id: "task_a", scheduledDate: "2026-03-04", rescheduledFrom: "2026-03-02" }),
    ]);
    const today = new Date(2026, 2, 6);
    const result = rescheduleTwelveWeekTaskWithinWeek(system, "task_a", today);

    expect(result.applied).toBe(true);
    expect(result.updatedTask?.rescheduledFrom).toBe("2026-03-02");
  });

  it("refuses when there is no room left in the current week", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", weekNumber: 1, scheduledDate: "2026-03-08" })]);
    // Today is Sunday, last day of week 1 → no later day available within week
    const today = new Date(2026, 2, 8);
    const result = rescheduleTwelveWeekTaskWithinWeek(system, "task_a", today);

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("no_room_in_current_week");
    expect(result.system).toBe(system);
  });

  it("refuses when task does not exist", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a" })]);
    const result = rescheduleTwelveWeekTaskWithinWeek(system, "missing", new Date(2026, 2, 5));
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("task_not_found");
  });

  it("refuses when task is already completed", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", completed: true })]);
    const result = rescheduleTwelveWeekTaskWithinWeek(system, "task_a", new Date(2026, 2, 5));
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("task_already_completed");
  });
});

describe("rescheduleTwelveWeekTaskToNextWeek", () => {
  it("moves a task into the first day of next week and bumps weekNumber", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", weekNumber: 2, scheduledDate: "2026-03-10" })]);
    const result = rescheduleTwelveWeekTaskToNextWeek(system, "task_a");

    expect(result.applied).toBe(true);
    expect(result.updatedTask?.weekNumber).toBe(3);
    // Week 3 starts 14 days after start (2026-03-02) = 2026-03-16
    expect(result.updatedTask?.scheduledDate).toBe("2026-03-16");
    expect(result.updatedTask?.rescheduledFrom).toBe("2026-03-10");
  });

  it("refuses when current week is the final week of the cycle", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", weekNumber: 12, scheduledDate: "2026-05-20" })]);
    const result = rescheduleTwelveWeekTaskToNextWeek(system, "task_a");

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("no_next_week_available");
  });

  it("refuses when task is already skipped", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_a", weekNumber: 2, skipped: true, isCore: false })]);
    const result = rescheduleTwelveWeekTaskToNextWeek(system, "task_a");

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("task_already_skipped");
  });
});

describe("skipTwelveWeekNonCoreTask", () => {
  it("skips a non-core task", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_opt", isCore: false })]);
    const result = skipTwelveWeekNonCoreTask(system, "task_opt");

    expect(result.applied).toBe(true);
    expect(result.updatedTask?.skipped).toBe(true);
    expect(result.system.taskInstances[0]?.skipped).toBe(true);
  });

  it("refuses to skip a core task", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_core", isCore: true })]);
    const result = skipTwelveWeekNonCoreTask(system, "task_core");

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("core_task_cannot_skip");
    expect(result.system).toBe(system);
  });

  it("refuses when task is already skipped", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_opt", isCore: false, skipped: true })]);
    const result = skipTwelveWeekNonCoreTask(system, "task_opt");

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("task_already_skipped");
  });

  it("refuses when task is already completed", () => {
    const system = createSystemWithTasks([makeTask({ id: "task_opt", isCore: false, completed: true })]);
    const result = skipTwelveWeekNonCoreTask(system, "task_opt");

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("task_already_completed");
  });
});

describe("Skipped tasks excluded from queries", () => {
  it("marks an empty week as empty with 0 percent", () => {
    const system = createSystemWithTasks([]);

    const breakdown = getWeekTaskBreakdown(system, 1);
    expect(breakdown.total).toBe(0);
    expect(breakdown.rate).toBe(0);
    expect(breakdown.overallPercent).toBe(0);
    expect(breakdown.isEmpty).toBe(true);

    expect(getTwelveWeekWeekCompletion(system, 1)).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
      isEmpty: true,
    });
  });

  it("excludes skipped tasks from getTwelveWeekMissedTasks", () => {
    const system = createSystemWithTasks([
      makeTask({ id: "task_opt", isCore: false, skipped: true, scheduledDate: "2026-03-03" }),
      makeTask({ id: "task_core", isCore: true, scheduledDate: "2026-03-03" }),
    ]);
    const today = new Date(2026, 2, 5);
    const missed = getTwelveWeekMissedTasks(system, today);
    expect(missed.map((task) => task.id)).toEqual(["task_core"]);
  });

  it("excludes skipped tasks from getTwelveWeekTodayTasks", () => {
    const system = createSystemWithTasks([
      makeTask({ id: "task_opt", isCore: false, skipped: true, scheduledDate: "2026-03-05" }),
      makeTask({ id: "task_core", isCore: true, scheduledDate: "2026-03-05" }),
    ]);
    const today = new Date(2026, 2, 5);
    const todayTasks = getTwelveWeekTodayTasks(system, today);
    expect(todayTasks.map((task) => task.id)).toEqual(["task_core"]);
  });

  it("excludes skipped tasks from getTwelveWeekWeekCompletion total + percent", () => {
    const system = createSystemWithTasks([
      makeTask({ id: "task_opt", isCore: false, skipped: true, weekNumber: 1 }),
      makeTask({ id: "task_a", weekNumber: 1, completed: true }),
      makeTask({ id: "task_b", weekNumber: 1, completed: false }),
    ]);
    const completion = getTwelveWeekWeekCompletion(system, 1);
    expect(completion.total).toBe(2);
    expect(completion.completed).toBe(1);
    expect(completion.percent).toBe(50);
  });
});

describe("hasFilledCommitment", () => {
  it("returns false when commitment is missing or empty", () => {
    expect(hasFilledCommitment({ name: "Ship", target: "1", unit: "lần/tuần" })).toBe(false);
    expect(
      hasFilledCommitment({
        name: "Ship",
        target: "1",
        unit: "lần/tuần",
        commitment: {
          want: "",
          cost: " ",
          means: "",
          tradeoff: "",
          reward: "",
        },
      }),
    ).toBe(false);
  });

  it("returns true when at least one commitment answer is filled", () => {
    expect(
      hasFilledCommitment({
        name: "Ship",
        target: "1",
        unit: "lần/tuần",
        commitment: {
          want: "Tôi muốn có nhịp ship đều.",
          cost: "",
          means: "",
          tradeoff: "",
          reward: "",
        },
      }),
    ).toBe(true);
  });

  it("returns true when all five commitment answers are filled", () => {
    expect(
      hasFilledCommitment({
        name: "Ship",
        target: "1",
        unit: "lần/tuần",
        commitment: {
          want: "Muốn ship đều.",
          cost: "Dậy sớm hơn.",
          means: "Block lịch sáng.",
          tradeoff: "Giảm lướt mạng.",
          reward: "Một buổi nghỉ.",
        },
      }),
    ).toBe(true);
  });
});

describe("regenerateUpcomingTaskInstances", () => {
  it("rebuilds current and future task dates after review day changes while preserving reviewed weeks", () => {
    const system = createSystem({
      currentWeek: 2,
      reviewDay: "Friday",
      leadIndicators: [
        {
          id: "tactic_1",
          name: "Ship",
          target: "2",
          unit: "times/week",
          type: "core",
          priority: 1,
          schedule: [1, 4],
        },
      ],
      taskInstances: [
        makeTask({ id: "tw_task_1_tactic_1_0", weekNumber: 1, scheduledDate: "2026-03-03", tacticId: "tactic_1" }),
        makeTask({ id: "tw_task_1_tactic_1_1", weekNumber: 1, scheduledDate: "2026-03-06", tacticId: "tactic_1" }),
        makeTask({ id: "tw_task_2_tactic_1_0", weekNumber: 2, scheduledDate: "2026-03-10", tacticId: "tactic_1" }),
        makeTask({ id: "tw_task_2_tactic_1_1", weekNumber: 2, scheduledDate: "2026-03-13", tacticId: "tactic_1" }),
      ],
      weeklyReviews: [
        {
          weekNumber: 1,
          leadCompletionPercent: 100,
          lagProgressValue: "",
          biggestOutputThisWeek: "",
          mainObstacle: "",
          nextWeekPriority: "",
          workloadDecision: "keep same",
          reviewCompleted: true,
          progressScore: 5,
          disciplineScore: 5,
          focusScore: 5,
          improvementScore: 5,
          outputQualityScore: 5,
        },
      ],
    });

    const regenerated = regenerateUpcomingTaskInstances(system, { currentWeek: 2 });

    expect(regenerated.taskInstances.filter((task) => task.weekNumber === 1).map((task) => task.scheduledDate)).toEqual(
      ["2026-03-03", "2026-03-06"],
    );
    expect(regenerated.taskInstances.filter((task) => task.weekNumber === 2).map((task) => task.scheduledDate)).toEqual(
      ["2026-03-10", "2026-03-12"],
    );
  });
});

describe("weekly review storage migration", () => {
  it("loads v7 daily check-ins without updatedCount", () => {
    const data = createEmptyUserData({
      currentStorageVersion: 7,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    data.goals.push(
      createGoal("goal-with-v7-checkin", "2026-05-01T00:00:00.000Z", {
        dailyCheckIns: [
          {
            date: "2026-05-09",
            mood: "steady",
          },
        ] as unknown as TwelveWeekSystem["dailyCheckIns"],
      }),
    );

    const migrated = migrateLegacyUserData(data, CURRENT_STORAGE_VERSION);
    const checkIn = migrated.goals[0]?.twelveWeekSystem?.dailyCheckIns[0];

    expect(migrated.storageVersion).toBe(CURRENT_STORAGE_VERSION);
    expect(checkIn).toMatchObject({
      date: "2026-05-09",
      mood: "steady",
    });
    expect(checkIn?.updatedCount).toBeUndefined();
  });

  it("migrates v6 storage directly to v8 WAM reviews and daily check-ins", () => {
    const data = createEmptyUserData({
      currentStorageVersion: 6,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    data.goals.push(
      createGoal("goal-with-v6-review", "2026-05-01T00:00:00.000Z", {
        dailyCheckIns: [
          {
            date: "2026-05-09",
            mood: "steady",
          },
        ] as unknown as TwelveWeekSystem["dailyCheckIns"],
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 75,
            lagProgressValue: "30",
            biggestOutputThisWeek: "Legacy win",
            mainObstacle: "Legacy miss",
            nextWeekPriority: "Keep focus block",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 4,
            disciplineScore: 4,
            focusScore: 5,
            improvementScore: 5,
            outputQualityScore: 5,
            completedLeadIndicators: 2,
          },
        ],
      }),
    );

    const migrated = migrateLegacyUserData(data, CURRENT_STORAGE_VERSION);
    const system = migrated.goals[0]?.twelveWeekSystem;
    const review = system?.weeklyReviews[0];

    expect(migrated.storageVersion).toBe(CURRENT_STORAGE_VERSION);
    expect(system?.dailyCheckIns[0]?.date).toBe("2026-05-09");
    expect(review).toMatchObject({
      commitmentsKept: [],
      commitmentsMissed: [],
      insights: "Legacy win",
      nextWeekCommitments: ["Keep focus block"],
      executionScore: 75,
      reflection: "Legacy win",
      adjustments: "Keep focus block",
    });
  });

  it("normalizes week 13 systems into completed cycle-review state with cycle number", () => {
    const testStartDate = new Date();
    testStartDate.setDate(testStartDate.getDate() - 12 * 7);
    const day = testStartDate.getDay();
    const diff = testStartDate.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekDate = new Date(testStartDate.setDate(diff));
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 83);

    const pad = (n: number) => String(n).padStart(2, "0");
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const goal = createGoal("week-13-cycle", "2026-05-01T00:00:00.000Z", {
      currentWeek: 13,
      status: "active",
      cycleNumber: undefined,
      startDate: format(startOfWeekDate),
      endDate: format(endOfWeekDate),
    });

    const normalized = normalizeGoal(goal);
    const system = normalized.twelveWeekSystem;

    expect(system?.cycleNumber).toBe(1);
    expect(system?.status).toBe("completed");
    expect(system?.currentWeek).toBe(13);
    expect(system && getTwelveWeekCycleWeekNumber(system)).toBeGreaterThan(12);
    expect(system && isTwelveWeekCycleReviewPhase(system)).toBe(true);
    expect(system && getTwelveWeekTodayTasks(system)).toEqual([]);
    expect(system && getTwelveWeekMissedTasks(system)).toEqual([]);
  });

  it("migrates legacy weekly review fields into WAM commitment fields", () => {
    const data = createEmptyUserData({
      currentStorageVersion: CURRENT_STORAGE_VERSION - 1,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    data.goals.push(
      createGoal("goal-with-legacy-review", "2026-05-01T00:00:00.000Z", {
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 80,
            lagProgressValue: "40",
            biggestOutputThisWeek: "Legacy output",
            mainObstacle: "Legacy obstacle",
            nextWeekPriority: "Legacy priority",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 4,
            disciplineScore: 4,
            focusScore: 6,
            improvementScore: 6,
            outputQualityScore: 6,
            completedLeadIndicators: 2,
            keepTactic: "Keep review ritual",
            reduceTactic: "Reduce meetings",
          },
        ],
      }),
    );

    const migrated = migrateLegacyUserData(data, CURRENT_STORAGE_VERSION);
    const review = migrated.goals[0]?.twelveWeekSystem?.weeklyReviews[0];

    expect(migrated.storageVersion).toBe(CURRENT_STORAGE_VERSION);
    expect(review).toMatchObject({
      commitmentsKept: [],
      commitmentsMissed: [],
      insights: "Legacy output",
      nextWeekCommitments: ["Legacy priority"],
      executionScore: 80,
      reflection: "Legacy output",
      adjustments: "Legacy priority",
    });
  });
});

describe("normalizeGoal ad-hoc tasks preservation", () => {
  it("preserves ad-hoc tasks that do not start with tw_task_", () => {
    const goal = createGoal("preservation-test", "2026-05-01T00:00:00.000Z", {
      taskInstances: [
        makeTask({ id: "tw_task_1_tactic_1_0", weekNumber: 1, scheduledDate: "2026-03-03", tacticId: "tactic_1" }),
        makeTask({ id: "task_adhoc_123", weekNumber: 1, scheduledDate: "2026-03-05", title: "Adhoc Task" }),
      ],
    });

    const normalized = normalizeGoal(goal);
    const system = normalized.twelveWeekSystem;

    const taskIds = system?.taskInstances.map((t) => t.id) ?? [];
    expect(taskIds).toContain("task_adhoc_123");
  });
});

