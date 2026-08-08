import { describe, expect, it } from "vitest";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { buildDashboardDailyExecutionSnapshot } from "./dashboardDailyExecution";

const REFERENCE_DATE = new Date("2026-08-08T10:00:00+07:00");

function task(
  id: string,
  title: string,
  scheduledDate: string,
  completed = false,
): TwelveWeekTaskInstance {
  return {
    id,
    weekNumber: 1,
    scheduledDate,
    title,
    leadIndicatorName: "Deep work",
    isCore: true,
    completed,
  };
}

function system(tasks: TwelveWeekTaskInstance[]): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship Daily Home V2",
    lagMetric: { name: "Release", unit: "%", target: "100", currentValue: "25" },
    leadIndicators: [{ name: "Deep work", target: "3", unit: "sessions/week" }],
    milestones: { week4: "Alpha", week8: "Beta", week12: "Release" },
    successEvidence: "Daily action is obvious",
    reviewDay: "Saturday",
    week12Outcome: "Daily Home shipped",
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: tasks,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

describe("buildDashboardDailyExecutionSnapshot", () => {
  it("uses only open tasks scheduled today for Home primary and secondary work", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("overdue", "Overdue task", "2026-08-07"),
        task("primary", "Primary today", "2026-08-08"),
        task("secondary", "Secondary today", "2026-08-08"),
        task("future", "Future task", "2026-08-09"),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask?.id).toBe("primary");
    expect(snapshot.homeSecondaryTasks.map((item) => item.id)).toEqual(["secondary"]);
    expect(snapshot.overdueOpenCount).toBe(1);
  });

  it("does not fallback an unfinished weekly task into Home when today has no scheduled task", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([task("future", "Future task", "2026-08-09")]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask).toBeNull();
    expect(snapshot.todayTotalCount).toBe(0);
  });

  it("separates unfinished-today count from true overdue count", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("one", "Today one", "2026-08-08"),
        task("two", "Today two", "2026-08-08"),
        task("three", "Today three", "2026-08-08"),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.todayRemainingCount).toBe(3);
    expect(snapshot.overdueOpenCount).toBe(0);
  });

  it("removes completed tasks from primary selection and reports all-done counts", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("one", "Today one", "2026-08-08", true),
        task("two", "Today two", "2026-08-08", true),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask).toBeNull();
    expect(snapshot.todayCompletedCount).toBe(2);
    expect(snapshot.todayTotalCount).toBe(2);
  });
});
