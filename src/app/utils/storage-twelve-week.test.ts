import { getDefaultScoreboard, getTwelveWeekCurrentWeek } from "./storage-twelve-week";
import type { TwelveWeekSystem } from "./storage-types";

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
