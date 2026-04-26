import {
  getActiveTwelveWeekGoal,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  sortTwelveWeekGoalsForSelection,
} from "./storage-twelve-week";
import type { Goal, TwelveWeekSystem } from "./storage-types";

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

function createGoal(
  id: string,
  createdAt: string,
  systemOverrides: Partial<TwelveWeekSystem> = {},
): Goal {
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

    expect(sortTwelveWeekGoalsForSelection([newerCompleted, newestPaused, olderActive]).map((goal) => goal.id)).toEqual([
      "older-active",
      "newest-paused",
      "newer-completed",
    ]);
  });
});
