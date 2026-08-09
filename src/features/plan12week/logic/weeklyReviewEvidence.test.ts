import { describe, expect, it } from "vitest";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { getWeeklyReviewEvidence } from "./weeklyReviewEvidence";

function makeTask(input: {
  id: string;
  weekNumber: number;
  isCore?: boolean;
  completed?: boolean;
  scheduledDate: string;
  completedAt?: string;
  rescheduledFrom?: string;
  skipped?: boolean;
}): TwelveWeekTaskInstance {
  return {
    id: input.id,
    weekNumber: input.weekNumber,
    scheduledDate: input.scheduledDate,
    title: input.id,
    leadIndicatorName: input.isCore === false ? "Optional" : "Core",
    tacticId: input.isCore === false ? "optional" : "core",
    isCore: input.isCore ?? true,
    completed: input.completed ?? false,
    completedAt: input.completedAt,
    rescheduledFrom: input.rescheduledFrom,
    skipped: input.skipped,
  };
}

function makeSystem(taskInstances: TwelveWeekTaskInstance[] = []): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship Weekly Review V2",
    lagMetric: { name: "Output", unit: "%", target: "100", currentValue: "" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 2,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function makeWeekTasks(input: {
  prefix: string;
  weekNumber: number;
  completed: number;
  total: number;
  scheduledDate: string;
}): TwelveWeekTaskInstance[] {
  return Array.from({ length: input.total }, (_, index) =>
    makeTask({
      id: `${input.prefix}_${index}`,
      weekNumber: input.weekNumber,
      scheduledDate: input.scheduledDate,
      completed: index < input.completed,
      completedAt: index < input.completed ? input.scheduledDate : undefined,
    }),
  );
}

describe("getWeeklyReviewEvidence", () => {
  it("derives 17/21 overall, 12/14 core, and 5/7 optional completion", () => {
    const tasks = Array.from({ length: 21 }, (_, index) => {
      const isCore = index < 14;
      const completed = isCore ? index < 12 : index < 19;
      return makeTask({
        id: `task_${index}`,
        weekNumber: 1,
        isCore,
        completed,
        scheduledDate: "2026-08-03",
        completedAt: completed ? "2026-08-03" : undefined,
      });
    });

    const evidence = getWeeklyReviewEvidence(makeSystem(tasks), 1, new Date(2026, 7, 10, 12));

    expect(evidence.completion).toEqual({ completed: 17, total: 21, percent: 81, isEmpty: false });
    expect(evidence.core).toEqual({ completed: 12, total: 14, percent: 86 });
    expect(evidence.optional).toEqual({ completed: 5, total: 7, percent: 71 });
  });

  it("returns a neutral null metric for an unscheduled category", () => {
    const evidence = getWeeklyReviewEvidence(
      makeSystem([
        makeTask({
          id: "optional",
          weekNumber: 1,
          isCore: false,
          completed: true,
          scheduledDate: "2026-08-03",
          completedAt: "2026-08-03",
        }),
      ]),
      1,
      new Date(2026, 7, 10, 12),
    );

    expect(evidence.core).toBeNull();
    expect(evidence.optional).toEqual({ completed: 1, total: 1, percent: 100 });
  });

  it("marks a no-task week as empty without a previous comparison", () => {
    const evidence = getWeeklyReviewEvidence(
      makeSystem(makeWeekTasks({ prefix: "previous", weekNumber: 1, completed: 4, total: 5, scheduledDate: "2026-08-03" })),
      2,
      new Date(2026, 7, 17, 12),
    );

    expect(evidence.completion).toEqual({ completed: 0, total: 0, percent: 0, isEmpty: true });
    expect(evidence.core).toBeNull();
    expect(evidence.optional).toBeNull();
    expect(evidence.previousWeek).toBeNull();
  });

  it("counts duplicate same-date check-ins once", () => {
    const system = makeSystem();
    system.dailyCheckIns = [
      {
        date: "2026-08-04",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "",
        amountDone: "",
        outputCreated: "",
        obstacleOrIssue: "",
        dailySelfRating: 4,
        optionalNote: "",
        updatedCount: 1,
      },
      {
        date: "2026-08-04T20:00:00+07:00",
        didWorkToday: false,
        whichLeadIndicatorWorkedOn: "",
        amountDone: "",
        outputCreated: "",
        obstacleOrIssue: "",
        dailySelfRating: 3,
        optionalNote: "edited",
        updatedCount: 2,
      },
      {
        date: "2026-08-06",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "",
        amountDone: "",
        outputCreated: "",
        obstacleOrIssue: "",
        dailySelfRating: 5,
        optionalNote: "",
      },
      {
        date: "2026-08-12",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "",
        amountDone: "",
        outputCreated: "",
        obstacleOrIssue: "",
        dailySelfRating: 5,
        optionalNote: "next week",
      },
    ];

    expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 10, 12)).checkIns).toEqual({
      days: 2,
      possibleDays: 7,
    });
  });

  it("returns a neutral zero-day check-in metric when the reviewed week has none", () => {
    expect(getWeeklyReviewEvidence(makeSystem(), 1, new Date(2026, 7, 10, 12)).checkIns).toEqual({
      days: 0,
      possibleDays: 7,
    });
  });

  it("counts only true overdue work and separates later-week carry-over", () => {
    const system = makeSystem([
      makeTask({ id: "old-open", weekNumber: 1, scheduledDate: "2026-08-04" }),
      makeTask({
        id: "carried",
        weekNumber: 2,
        scheduledDate: "2026-08-10",
        rescheduledFrom: "2026-08-05",
      }),
      makeTask({ id: "current-past", weekNumber: 2, scheduledDate: "2026-08-10" }),
      makeTask({ id: "current-today", weekNumber: 2, scheduledDate: "2026-08-12" }),
    ]);

    const historical = getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 12, 12));
    expect(historical.overdueOpenCount).toBe(1);
    expect(historical.carryOverCount).toBe(1);

    const current = getWeeklyReviewEvidence(system, 2, new Date(2026, 7, 12, 12));
    expect(current.overdueOpenCount).toBe(2);
    expect(current.carryOverCount).toBe(0);
  });

  it("shows on-time completion only when every completed task has a valid completion date", () => {
    const system = makeSystem([
      makeTask({
        id: "on-time",
        weekNumber: 1,
        completed: true,
        scheduledDate: "2026-08-03",
        completedAt: "2026-08-03",
      }),
      makeTask({
        id: "late",
        weekNumber: 1,
        completed: true,
        scheduledDate: "2026-08-04",
        completedAt: "2026-08-05",
      }),
    ]);

    expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 10, 12)).onTime).toEqual({
      completed: 1,
      total: 2,
    });

    system.taskInstances[1] = { ...system.taskInstances[1], completedAt: undefined };
    expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 10, 12)).onTime).toBeNull();
  });

  it("derives a positive previous-week delta in percentage points", () => {
    const previous = makeWeekTasks({
      prefix: "previous",
      weekNumber: 1,
      completed: 18,
      total: 25,
      scheduledDate: "2026-08-03",
    });
    const current = makeWeekTasks({
      prefix: "current",
      weekNumber: 2,
      completed: 17,
      total: 21,
      scheduledDate: "2026-08-10",
    });

    expect(getWeeklyReviewEvidence(makeSystem([...previous, ...current]), 2, new Date(2026, 7, 17, 12)).previousWeek).toEqual({
      completed: 18,
      total: 25,
      percent: 72,
      deltaPoints: 9,
    });
  });

  it("derives a negative previous-week delta in percentage points", () => {
    const previous = makeWeekTasks({
      prefix: "previous",
      weekNumber: 1,
      completed: 17,
      total: 21,
      scheduledDate: "2026-08-03",
    });
    const current = makeWeekTasks({
      prefix: "current",
      weekNumber: 2,
      completed: 7,
      total: 10,
      scheduledDate: "2026-08-10",
    });

    expect(getWeeklyReviewEvidence(makeSystem([...previous, ...current]), 2, new Date(2026, 7, 17, 12)).previousWeek).toEqual({
      completed: 17,
      total: 21,
      percent: 81,
      deltaPoints: -11,
    });
  });

  it("omits comparison for week 1 and when the previous week has no tasks", () => {
    const weekOne = makeSystem(
      makeWeekTasks({ prefix: "week1", weekNumber: 1, completed: 1, total: 1, scheduledDate: "2026-08-03" }),
    );
    expect(getWeeklyReviewEvidence(weekOne, 1, new Date(2026, 7, 10, 12)).previousWeek).toBeNull();

    const weekTwoOnly = makeSystem(
      makeWeekTasks({ prefix: "week2", weekNumber: 2, completed: 1, total: 2, scheduledDate: "2026-08-10" }),
    );
    expect(getWeeklyReviewEvidence(weekTwoOnly, 2, new Date(2026, 7, 17, 12)).previousWeek).toBeNull();
  });
});
