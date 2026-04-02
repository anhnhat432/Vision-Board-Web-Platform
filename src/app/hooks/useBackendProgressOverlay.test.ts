import { applyBackendProgressOverlay } from "./useBackendProgressOverlay";
import { getDefaultScoreboard } from "../utils/storage-twelve-week";
import type { TwelveWeekSystem, UniversalWeeklyReview } from "../utils/storage-types";
import type { Metric, PlanDetails, WeekReview } from "@/types/plan";

function createMetric(
  name: string,
  logs: Array<{ id: string; date: string; value: number; completed: boolean }>,
): Metric {
  return {
    id: `${name}_id`,
    weekId: "week_1",
    name,
    weeklyTarget: 0,
    logs,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

function createPlanDetails({
  metrics,
  review,
}: {
  metrics: Metric[];
  review?: WeekReview;
}): PlanDetails {
  return {
    plan: {
      id: "plan_1",
      userId: "user_1",
      vision: "Vision",
      smartGoalId: "goal_1",
      startDate: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: "week_1",
        planId: "plan_1",
        weekNumber: 1,
        focus: "Focus",
        expectedOutput: "Output",
        review,
        tasks: [],
        metrics,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  };
}

function createLocalReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: 1,
    leadCompletionPercent: 0,
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    nextWeekPriority: "",
    workloadDecision: "",
    reviewCompleted: false,
    progressScore: 0,
    disciplineScore: 0,
    focusScore: 0,
    improvementScore: 0,
    outputQualityScore: 0,
    completedLeadIndicators: 0,
    ...overrides,
  };
}

function createSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship core flow",
    lagMetric: {
      name: "Lag",
      unit: "units",
      target: "100",
      currentValue: "local lag",
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
    startDate: "2026-04-01",
    endDate: "2026-04-07",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 1,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Foundation",
        focus: "",
        milestone: "",
        completed: false,
      },
    ],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(1),
    ...overrides,
  };
}

describe("applyBackendProgressOverlay", () => {
  it("excludes __daily_checkin__ from lag and scoreboard metric summaries", () => {
    const system = createSystem({
      lagMetric: {
        name: "Lag",
        unit: "units",
        target: "100",
        currentValue: "",
      },
      scoreboard: getDefaultScoreboard(1),
    });
    const details = createPlanDetails({
      metrics: [
        createMetric("__daily_checkin__", [
          { id: "daily_1", date: "2026-04-01", value: 1, completed: true },
        ]),
        createMetric("Revenue", [{ id: "rev_1", date: "2026-04-01", value: 3, completed: true }]),
      ],
    });

    const overlaid = applyBackendProgressOverlay(system, details, {});

    expect(overlaid.lagMetric.currentValue).toBe("Revenue: 3");
    expect(overlaid.weeklyReviews[0]?.lagProgressValue).toBe("Revenue: 3");
    expect(overlaid.scoreboard[0]?.mainMetricProgress).toBe("Revenue: 3");
  });

  it("keeps local reviewDone fallback when backend review is missing", () => {
    const system = createSystem({
      scoreboard: [{ ...getDefaultScoreboard(1)[0], reviewDone: true }],
    });
    const details = createPlanDetails({
      metrics: [],
    });

    const overlaid = applyBackendProgressOverlay(system, details, {});

    expect(overlaid.scoreboard[0]?.reviewDone).toBe(true);
  });

  it("prefers merged current-week review lag value over backend metric summary", () => {
    const system = createSystem({
      lagMetric: {
        name: "Lag",
        unit: "units",
        target: "100",
        currentValue: "legacy lag",
      },
      weeklyReviews: [
        createLocalReview({
          lagProgressValue: "Review-owned lag",
          reviewCompleted: true,
        }),
      ],
      scoreboard: getDefaultScoreboard(1),
    });
    const details = createPlanDetails({
      metrics: [createMetric("Revenue", [{ id: "rev_1", date: "2026-04-01", value: 9, completed: true }])],
    });

    const overlaid = applyBackendProgressOverlay(system, details, {});

    expect(overlaid.lagMetric.currentValue).toBe("Review-owned lag");
    expect(overlaid.scoreboard[0]?.mainMetricProgress).toBe("Review-owned lag");
  });
});
