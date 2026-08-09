import { describe, expect, it } from "vitest";
import type {
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalScoreboardWeek,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";
import {
  type ExecutionInsight,
  type ExecutionInsightId,
  getExecutionInsights,
  getNextActionFromInsights,
  getWeeklyReflectionInsights,
} from "./executionInsights";
import { getWeeklyReviewEvidence } from "./weeklyReviewEvidence";

function makeScoreboard(overrides: Partial<UniversalScoreboardWeek> = {}): UniversalScoreboardWeek {
  return {
    weekNumber: overrides.weekNumber ?? 1,
    leadCompletionPercent: overrides.leadCompletionPercent ?? 0,
    mainMetricProgress: overrides.mainMetricProgress ?? "",
    outputDone: overrides.outputDone ?? "",
    reviewDone: overrides.reviewDone ?? false,
    weeklyScore: overrides.weeklyScore ?? 0,
  };
}

function makeReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: overrides.weekNumber ?? 1,
    leadCompletionPercent: overrides.leadCompletionPercent ?? 0,
    lagProgressValue: overrides.lagProgressValue ?? "",
    biggestOutputThisWeek: overrides.biggestOutputThisWeek ?? "",
    mainObstacle: overrides.mainObstacle ?? "",
    nextWeekPriority: overrides.nextWeekPriority ?? "",
    workloadDecision: overrides.workloadDecision ?? "keep same",
    reviewCompleted: overrides.reviewCompleted ?? false,
    progressScore: overrides.progressScore ?? 0,
    disciplineScore: overrides.disciplineScore ?? 0,
    focusScore: overrides.focusScore ?? 0,
    improvementScore: overrides.improvementScore ?? 0,
    outputQualityScore: overrides.outputQualityScore ?? 0,
  };
}

function makeTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: overrides.id ?? "task_1",
    weekNumber: overrides.weekNumber ?? 3,
    scheduledDate: overrides.scheduledDate ?? "2026-05-01",
    title: overrides.title ?? "Việc giữ nhịp",
    leadIndicatorName: overrides.leadIndicatorName ?? "Ship",
    isCore: overrides.isCore ?? true,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt,
    tacticId: overrides.tacticId,
    rescheduledFrom: overrides.rescheduledFrom,
    skipped: overrides.skipped,
  };
}

function makeCheckIn(overrides: Partial<UniversalDailyCheckIn> = {}): UniversalDailyCheckIn {
  return {
    date: overrides.date ?? "2026-05-01",
    didWorkToday: overrides.didWorkToday ?? true,
    whichLeadIndicatorWorkedOn: overrides.whichLeadIndicatorWorkedOn ?? "Ship",
    amountDone: overrides.amountDone ?? "",
    outputCreated: overrides.outputCreated ?? "",
    obstacleOrIssue: overrides.obstacleOrIssue ?? "",
    dailySelfRating: overrides.dailySelfRating ?? 3,
    optionalNote: overrides.optionalNote ?? "",
    mood: overrides.mood,
  };
}

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship",
    lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-04-13",
    endDate: "2026-07-05",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
    ...overrides,
  };
}

function makeTaskBatch(input: {
  prefix: string;
  count: number;
  completedCount: number;
  scheduledDate: string;
  weekNumber?: number;
  isCore?: boolean;
}): TwelveWeekTaskInstance[] {
  return Array.from({ length: input.count }, (_, index) =>
    makeTask({
      id: `${input.prefix}_${index}`,
      weekNumber: input.weekNumber ?? 1,
      scheduledDate: input.scheduledDate,
      completed: index < input.completedCount,
      isCore: input.isCore ?? true,
    }),
  );
}

function makeAugustSystem(
  taskInstances: TwelveWeekTaskInstance[],
  overrides: Partial<TwelveWeekSystem> = {},
): TwelveWeekSystem {
  return makeSystem({
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    currentWeek: 1,
    lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "20" },
    taskInstances,
    scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 40, leadCompletionPercent: 0 })],
    ...overrides,
  });
}

function ids(insights: ExecutionInsight[]): ExecutionInsightId[] {
  return insights.map((insight) => insight.id);
}

describe("getExecutionInsights — empty state", () => {
  it("returns a no_data insight when system is null", () => {
    const insights = getExecutionInsights(null);
    expect(ids(insights)).toEqual(["no_data"]);
    expect(insights[0].headline.length).toBeGreaterThan(0);
  });

  it("returns no_data when system has no execution signals", () => {
    const insights = getExecutionInsights(makeSystem(), { todayDateKey: "2026-05-01" });
    expect(ids(insights)).toEqual(["no_data"]);
    expect(insights[0].nextActionId).toBe("open_today");
  });
});

describe("getExecutionInsights — review_missing", () => {
  it("flags missing previous-week review on week 3", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 70 })],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          // week 2 missing → expect review_missing
        ],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("review_missing");
  });

  it("does not flag review_missing on week 1", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 1,
        weeklyReviews: [],
        scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 60 })],
      }),
      { todayDateKey: "2026-04-15" },
    );
    expect(ids(insights)).not.toContain("review_missing");
  });
});

describe("getExecutionInsights — overloaded_week", () => {
  it("flags overloaded when many tasks AND completion is low", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => makeTask({ id: `task_${i}`, weekNumber: 3, completed: i < 3 }));
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 25 })],
        taskInstances: tasks,
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("overloaded_week");
  });

  it("does not flag overloaded when task count is small", () => {
    const tasks = [makeTask({ weekNumber: 3, completed: false })];
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 30 })],
        taskInstances: tasks,
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).not.toContain("overloaded_week");
  });
});

describe("getExecutionInsights — task_completion_without_progress", () => {
  it("flags when completion is high but lag metric is empty", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask({ id: `task_${i}`, weekNumber: 3, completed: i < 4 }));
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 80 })],
        taskInstances: tasks,
        lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "" },
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("task_completion_without_progress");
  });

  it("does not flag when lag metric has been updated", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask({ id: `task_${i}`, weekNumber: 3, completed: i < 4 }));
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 80 })],
        taskInstances: tasks,
        lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "20" },
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).not.toContain("task_completion_without_progress");
  });
});

describe("getExecutionInsights — consistency trend", () => {
  it("suppresses consistency_dropping for an active unfinished week", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 2, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 50 }),
        ],
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );

    expect(ids(insights)).not.toContain("consistency_dropping");
  });

  it("suppresses consistency_improving for an active unfinished week", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 2, weeklyScore: 50 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 78 }),
        ],
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );

    expect(ids(insights)).not.toContain("consistency_improving");
  });

  it("flags consistency_dropping when current week is much lower than previous", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 50 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
      }),
      { todayDateKey: "2026-05-10" },
    );
    expect(ids(insights)).toContain("consistency_dropping");
  });

  it("flags consistency_improving when current week rose meaningfully", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 50 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 60 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 78 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
      }),
      { todayDateKey: "2026-05-10" },
    );
    expect(ids(insights)).toContain("consistency_improving");
  });
});

describe("getExecutionInsights — strong_lead_metric", () => {
  it("celebrates when recent average lead completion is high", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 70, leadCompletionPercent: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 75, leadCompletionPercent: 85 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 78, leadCompletionPercent: 80 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("strong_lead_metric");
  });
});

describe("getExecutionInsights — needs_scope_reduction", () => {
  it("flags when completion is high but lead completion is low", () => {
    const tasks = [
      ...makeTaskBatch({
        prefix: "scope_optional",
        count: 8,
        completedCount: 8,
        scheduledDate: "2026-05-01",
        weekNumber: 3,
        isCore: false,
      }),
      ...makeTaskBatch({
        prefix: "scope_core",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-05-01",
        weekNumber: 3,
        isCore: true,
      }),
    ];
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "20" },
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 70, leadCompletionPercent: 0 })],
        taskInstances: tasks,
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("needs_scope_reduction");
  });
});

describe("getExecutionInsights — progress_without_consistency", () => {
  it("flags when lag metric moved but completion is low", () => {
    const tasks = Array.from({ length: 6 }, (_, i) => makeTask({ id: `task_${i}`, weekNumber: 3, completed: i < 2 }));
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 3, weeklyScore: 30 })],
        taskInstances: tasks,
        lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "20" },
        weeklyReviews: [makeReview({ weekNumber: 2, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(ids(insights)).toContain("progress_without_consistency");
  });
});

describe("getExecutionInsights — ready_to_push", () => {
  it("suppresses ready_to_push for an active unfinished week", () => {
    const checkIns = ["2026-04-25", "2026-04-26", "2026-04-27", "2026-04-28", "2026-04-29"].map((date) =>
      makeCheckIn({ date, didWorkToday: true }),
    );
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 88 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 90 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
        dailyCheckIns: checkIns,
      }),
      { todayDateKey: "2026-05-01" },
    );

    expect(ids(insights)).not.toContain("ready_to_push");
  });

  it("flags when recent avg score is strong AND check-in rate is strong", () => {
    const checkIns = ["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"].map((date) =>
      makeCheckIn({ date, didWorkToday: true }),
    );
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 88 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 90 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
        dailyCheckIns: checkIns,
      }),
      { todayDateKey: "2026-05-10" },
    );
    expect(ids(insights)).toContain("ready_to_push");
  });
});

describe("getExecutionInsights — priority and capping", () => {
  it("returns at most 3 insights, sorted by priority", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => makeTask({ id: `task_${i}`, weekNumber: 3, completed: i < 3 }));
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 25 }),
        ],
        taskInstances: tasks,
        weeklyReviews: [makeReview({ weekNumber: 1, reviewCompleted: true })],
        // Week 2 review is missing
      }),
      { todayDateKey: "2026-05-01" },
    );
    expect(insights.length).toBeLessThanOrEqual(3);
    // First should be the highest priority warning — review_missing.
    expect(insights[0].id).toBe("review_missing");
  });
});

describe("getWeeklyReflectionInsights", () => {
  it("suppresses incomplete-score trend and readiness judgements for an active reviewed week", () => {
    const checkIns = ["2026-04-25", "2026-04-26", "2026-04-27", "2026-04-28", "2026-04-29"].map((date) =>
      makeCheckIn({ date, didWorkToday: true }),
    );
    const insights = getWeeklyReflectionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 88 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 50 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
        dailyCheckIns: checkIns,
      }),
      3,
      { todayDateKey: "2026-05-01" },
    );

    expect(ids(insights)).not.toContain("consistency_dropping");
    expect(ids(insights)).not.toContain("consistency_improving");
    expect(ids(insights)).not.toContain("ready_to_push");
  });

  it("scopes to a specific week and surfaces relevant insights", () => {
    const insights = getWeeklyReflectionInsights(
      makeSystem({
        currentWeek: 5,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 60 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 40 }),
        ],
        weeklyReviews: [
          makeReview({ weekNumber: 1, reviewCompleted: true }),
          makeReview({ weekNumber: 2, reviewCompleted: true }),
        ],
      }),
      3,
      { todayDateKey: "2026-05-10" },
    );
    // Week 3 vs week 2 = drop of 20 → consistency_dropping should fire
    expect(ids(insights)).toContain("consistency_dropping");
  });

  it("includes the highest-ranked positive when the first three weekly candidates are warnings", () => {
    const insights = getWeeklyReflectionInsights(
      makeSystem({
        currentWeek: 2,
        lagMetric: { name: "Output", unit: "%", target: "100", currentValue: "" },
        scoreboard: [
          makeScoreboard({ weekNumber: 1, leadCompletionPercent: 90, weeklyScore: 80 }),
          makeScoreboard({ weekNumber: 2, leadCompletionPercent: 90, weeklyScore: 40 }),
        ],
        weeklyReviews: [],
        taskInstances: Array.from({ length: 11 }, (_, index) =>
          makeTask({ id: `overload_${index}`, weekNumber: 2, completed: false }),
        ),
      }),
      2,
      { todayDateKey: "2026-05-10" },
    );

    expect(insights).toHaveLength(3);
    expect(ids(insights)).toContain("strong_lead_metric");
    expect(insights.filter((insight) => insight.severity === "warning")).toHaveLength(2);
  });

  it("keeps whole-week evidence factual while early-review insights use tasks due so far", () => {
    const dueTasks = [
      ...makeTaskBatch({ prefix: "mon", count: 1, completedCount: 1, scheduledDate: "2026-08-03" }),
      ...makeTaskBatch({ prefix: "tue", count: 1, completedCount: 1, scheduledDate: "2026-08-04" }),
      ...makeTaskBatch({ prefix: "wed", count: 2, completedCount: 2, scheduledDate: "2026-08-05" }),
    ];
    const futureTasks = [
      ...makeTaskBatch({ prefix: "thu", count: 2, completedCount: 0, scheduledDate: "2026-08-06" }),
      ...makeTaskBatch({ prefix: "fri", count: 2, completedCount: 0, scheduledDate: "2026-08-07" }),
      ...makeTaskBatch({ prefix: "sat", count: 1, completedCount: 0, scheduledDate: "2026-08-08" }),
      ...makeTaskBatch({ prefix: "sun", count: 1, completedCount: 0, scheduledDate: "2026-08-09" }),
    ];
    const system = makeAugustSystem([...dueTasks, ...futureTasks]);

    expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 5, 12)).completion).toEqual({
      completed: 4,
      total: 10,
      percent: 40,
      isEmpty: false,
    });

    const insights = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" });
    expect(ids(insights)).not.toContain("progress_without_consistency");
    expect(ids(insights)).not.toContain("overloaded_week");
  });

  it("does not call an active week overloaded from future workload", () => {
    const dueTasks = [
      ...makeTaskBatch({
        prefix: "overload_mon",
        count: 1,
        completedCount: 1,
        scheduledDate: "2026-08-03",
      }),
      ...makeTaskBatch({
        prefix: "overload_tue",
        count: 1,
        completedCount: 1,
        scheduledDate: "2026-08-04",
      }),
      ...makeTaskBatch({
        prefix: "overload_wed",
        count: 2,
        completedCount: 2,
        scheduledDate: "2026-08-05",
      }),
    ];
    const futureTasks = [
      ...makeTaskBatch({
        prefix: "overload_thu",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-06",
      }),
      ...makeTaskBatch({
        prefix: "overload_fri",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-07",
      }),
      ...makeTaskBatch({
        prefix: "overload_sat",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-08",
      }),
      ...makeTaskBatch({
        prefix: "overload_sun",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-09",
      }),
    ];
    const system = makeAugustSystem([...dueTasks, ...futureTasks]);

    expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).not.toContain(
      "overloaded_week",
    );
  });

  it("keeps real missed due work eligible during an early review", () => {
    const dueTasks = [
      ...makeTaskBatch({ prefix: "miss_mon", count: 2, completedCount: 1, scheduledDate: "2026-08-03" }),
      ...makeTaskBatch({ prefix: "miss_tue", count: 1, completedCount: 0, scheduledDate: "2026-08-04" }),
      ...makeTaskBatch({ prefix: "miss_wed", count: 1, completedCount: 0, scheduledDate: "2026-08-05" }),
    ];
    const futureTasks = makeTaskBatch({
      prefix: "miss_future",
      count: 6,
      completedCount: 0,
      scheduledDate: "2026-08-07",
    });
    const system = makeAugustSystem([...dueTasks, ...futureTasks]);

    const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }).find(
      (item) => item.id === "progress_without_consistency",
    );
    expect(insight?.metrics.completionPercent).toBe(25);
  });

  it("includes tasks scheduled today and excludes tasks scheduled tomorrow", () => {
    const system = makeAugustSystem(
      [
        ...makeTaskBatch({
          prefix: "boundary_mon",
          count: 1,
          completedCount: 1,
          scheduledDate: "2026-08-03",
        }),
        ...makeTaskBatch({
          prefix: "boundary_today",
          count: 1,
          completedCount: 1,
          scheduledDate: "2026-08-05",
        }),
        ...makeTaskBatch({
          prefix: "boundary_tomorrow",
          count: 1,
          completedCount: 0,
          scheduledDate: "2026-08-06",
        }),
      ],
      {
        lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "" },
        scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 67, leadCompletionPercent: 67 })],
      },
    );

    const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }).find(
      (item) => item.id === "task_completion_without_progress",
    );
    expect(insight?.metrics.completionPercent).toBe(100);
  });

  it("does not derive a zero-percent warning when no tasks are due yet", () => {
    const system = makeAugustSystem([
      ...makeTaskBatch({ prefix: "not_due_tue", count: 2, completedCount: 0, scheduledDate: "2026-08-04" }),
      ...makeTaskBatch({ prefix: "not_due_wed", count: 2, completedCount: 0, scheduledDate: "2026-08-05" }),
    ]);

    expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-03" }))).not.toContain(
      "progress_without_consistency",
    );
  });

  it("does not treat future core tasks as low lead execution", () => {
    const system = makeAugustSystem([
      ...makeTaskBatch({
        prefix: "scope_optional_due",
        count: 8,
        completedCount: 8,
        scheduledDate: "2026-08-05",
        isCore: false,
      }),
      ...makeTaskBatch({
        prefix: "scope_core_future",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-06",
        isCore: true,
      }),
    ]);

    expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).not.toContain(
      "needs_scope_reduction",
    );
  });

  it("still flags scope reduction when due core execution is genuinely low", () => {
    const system = makeAugustSystem([
      ...makeTaskBatch({
        prefix: "real_scope_optional",
        count: 8,
        completedCount: 8,
        scheduledDate: "2026-08-05",
        isCore: false,
      }),
      ...makeTaskBatch({
        prefix: "real_scope_core",
        count: 2,
        completedCount: 0,
        scheduledDate: "2026-08-05",
        isCore: true,
      }),
    ]);

    expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).toContain(
      "needs_scope_reduction",
    );
  });

  it("uses the whole ended week for historical completion insights", () => {
    const system = makeAugustSystem(
      makeTaskBatch({ prefix: "historical", count: 10, completedCount: 4, scheduledDate: "2026-08-03" }),
    );

    const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-19" }).find(
      (item) => item.id === "progress_without_consistency",
    );
    expect(insight?.metrics.completionPercent).toBe(40);
  });

  it("returns no deterministic insights for a future reviewed week", () => {
    const system = makeAugustSystem(
      makeTaskBatch({
        prefix: "future_week",
        count: 12,
        completedCount: 0,
        scheduledDate: "2026-08-10",
        weekNumber: 2,
      }),
      {
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 80, leadCompletionPercent: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 20, leadCompletionPercent: 0 }),
        ],
        weeklyReviews: [makeReview({ weekNumber: 1, reviewCompleted: true })],
      },
    );

    expect(getWeeklyReflectionInsights(system, 2, { todayDateKey: "2026-08-05" })).toEqual([]);
  });

  it("uses due-to-date task completion on the Progress surface", () => {
    const system = makeAugustSystem([
      ...makeTaskBatch({ prefix: "progress_due", count: 4, completedCount: 4, scheduledDate: "2026-08-05" }),
      ...makeTaskBatch({
        prefix: "progress_future",
        count: 6,
        completedCount: 0,
        scheduledDate: "2026-08-07",
      }),
    ]);

    expect(ids(getExecutionInsights(system, { weekNumber: 1, todayDateKey: "2026-08-05" }))).not.toContain(
      "progress_without_consistency",
    );
  });

  it("returns no_data when system is null", () => {
    const insights = getWeeklyReflectionInsights(null, 1);
    expect(ids(insights)).toEqual(["no_data"]);
  });
});

describe("getNextActionFromInsights", () => {
  it("returns the next action of the highest-priority insight", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 70 })],
        weeklyReviews: [makeReview({ weekNumber: 1, reviewCompleted: true })],
      }),
      { todayDateKey: "2026-05-01" },
    );
    const action = getNextActionFromInsights(insights);
    expect(action.id).toBe("open_week_review");
    expect(action.label.length).toBeGreaterThan(0);
  });

  it("returns 'no_action' when given an empty list", () => {
    const action = getNextActionFromInsights([]);
    expect(action.id).toBe("no_action");
  });

  it("returns 'open_today' as fallback for ready_to_push", () => {
    const insights: ExecutionInsight[] = [
      {
        id: "ready_to_push",
        severity: "positive",
        headline: "x",
        body: "x",
        nextActionId: "open_today",
        metrics: {},
      },
    ];
    expect(getNextActionFromInsights(insights).id).toBe("open_today");
  });
});

describe("Analytics safety", () => {
  it("does not include user free text in any insight metric", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({
            weekNumber: 3,
            weeklyScore: 70,
            mainMetricProgress: "raw user note",
            outputDone: "raw output",
          }),
        ],
        weeklyReviews: [
          makeReview({
            weekNumber: 2,
            reviewCompleted: true,
            biggestOutputThisWeek: "raw output text",
            mainObstacle: "raw obstacle text",
            nextWeekPriority: "raw priority text",
          }),
        ],
      }),
      { todayDateKey: "2026-05-01" },
    );
    const serialized = JSON.stringify(insights);
    expect(serialized).not.toContain("raw user note");
    expect(serialized).not.toContain("raw output");
    expect(serialized).not.toContain("raw obstacle");
    expect(serialized).not.toContain("raw priority");
    // Metric values should be numbers or null only
    for (const insight of insights) {
      for (const value of Object.values(insight.metrics)) {
        expect(value === null || typeof value === "number").toBe(true);
      }
    }
  });

  it("uses only canned Vietnamese copy in headline/body (no template placeholders)", () => {
    const insights = getExecutionInsights(
      makeSystem({
        currentWeek: 3,
        scoreboard: [
          makeScoreboard({ weekNumber: 1, weeklyScore: 80 }),
          makeScoreboard({ weekNumber: 2, weeklyScore: 85 }),
          makeScoreboard({ weekNumber: 3, weeklyScore: 50 }),
        ],
      }),
      { todayDateKey: "2026-05-01" },
    );
    for (const insight of insights) {
      expect(insight.headline).not.toMatch(/\{[^}]+\}/);
      expect(insight.body).not.toMatch(/\{[^}]+\}/);
      expect(insight.headline.length).toBeGreaterThan(0);
      expect(insight.body.length).toBeGreaterThan(0);
    }
  });
});
