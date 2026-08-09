import { describe, expect, it } from "vitest";

import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem, TwelveWeekTaskInstance, UniversalWeeklyReview } from "@/app/utils/storage-types";

import { applyConfirmedNextWeekHandoff, buildNextWeekHandoffPreview } from "./nextWeekHandoff";

function makeTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: overrides.id ?? "task-1",
    weekNumber: overrides.weekNumber ?? 5,
    scheduledDate: overrides.scheduledDate ?? "2026-06-01",
    title: overrides.title ?? "Deep work",
    leadIndicatorName: overrides.leadIndicatorName ?? "Deep work",
    tacticId: overrides.tacticId ?? "deep-work",
    isCore: overrides.isCore ?? true,
    completed: overrides.completed ?? false,
    ...(overrides.completedAt ? { completedAt: overrides.completedAt } : {}),
    ...(overrides.lastModifiedAt !== undefined ? { lastModifiedAt: overrides.lastModifiedAt } : {}),
    ...(overrides.skipped !== undefined ? { skipped: overrides.skipped } : {}),
  };
}

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship portfolio",
    lagMetric: { name: "Portfolio", unit: "%", target: "100", currentValue: "35" },
    leadIndicators: [
      { id: "deep-work", name: "Deep work", target: "2", unit: "buổi", type: "core" },
      { id: "optional-reading", name: "Optional reading", target: "1", unit: "buổi", type: "optional" },
    ],
    milestones: { week4: "Draft", week8: "Publish", week12: "Ship" },
    successEvidence: "Portfolio live",
    reviewDay: "Sunday",
    week12Outcome: "Portfolio live",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    tacticLoadPreference: "balanced",
    currentWeek: 4,
    totalWeeks: 12,
    weeklyPlans: Array.from({ length: 12 }, (_, index) => ({
      weekNumber: index + 1,
      phaseName: `Phase ${index + 1}`,
      focus: `Focus ${index + 1}`,
      milestone: "",
      completed: false,
    })),
    taskInstances: [
      makeTask({ id: "current-future", weekNumber: 4, scheduledDate: "2026-05-31", isCore: false }),
      makeTask({ id: "next-core", weekNumber: 5, scheduledDate: "2026-06-01", isCore: true }),
      makeTask({ id: "next-optional", weekNumber: 5, scheduledDate: "2026-06-02", isCore: false }),
      makeTask({ id: "week-6-optional", weekNumber: 6, scheduledDate: "2026-06-09", isCore: false }),
    ],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
    ...overrides,
  };
}

function makeReview(overrides: Partial<UniversalWeeklyReview> = {}): UniversalWeeklyReview {
  return {
    weekNumber: 4,
    leadCompletionPercent: 65,
    lagProgressValue: "35",
    biggestOutputThisWeek: "Drafted the portfolio",
    mainObstacle: "Late meetings",
    nextWeekPriority: "Ship the portfolio case study",
    workloadDecision: "reduce slightly",
    reviewCompleted: true,
    nextWeekCommitments: ["Ship the portfolio case study", "Protect two morning blocks"],
    keepTactic: "Morning deep work",
    reduceTactic: "Optional evening work",
    ...overrides,
  };
}

describe("next-week confirmed handoff", () => {
  it("previews exact priority and workload effects without mutating the source system", () => {
    const system = makeSystem();
    const before = structuredClone(system);

    const preview = buildNextWeekHandoffPreview(system, makeReview());

    expect(preview).toEqual(
      expect.objectContaining({
        status: "available",
        reviewedWeekNumber: 4,
        nextWeekNumber: 5,
        proposedPriority: "Ship the portfolio case study",
        currentPriority: "Focus 5",
        workloadDecision: "reduce slightly",
        affectedOptionalTaskCount: 1,
        workloadWillChange: true,
      }),
    );
    expect(system).toEqual(before);
  });

  it("does nothing when no preview effect is selected", () => {
    const system = makeSystem();

    const result = applyConfirmedNextWeekHandoff(system, makeReview(), {
      applyPriority: false,
      applyWorkload: false,
      now: 1234,
    });

    expect(result.status).toBe("noop");
    expect(result.system).toBe(system);
  });

  it("updates only the next-week focus when priority is confirmed", () => {
    const system = makeSystem();

    const result = applyConfirmedNextWeekHandoff(system, makeReview(), {
      applyPriority: true,
      applyWorkload: false,
      now: 1234,
    });

    expect(result.status).toBe("applied");
    expect(result.system.weeklyPlans.find((week) => week.weekNumber === 4)?.focus).toBe("Focus 4");
    expect(result.system.weeklyPlans.find((week) => week.weekNumber === 5)?.focus).toBe(
      "Ship the portfolio case study",
    );
    expect(result.system.taskInstances).toEqual(system.taskInstances);
  });

  it("reduces next-week workload by skipping only unfinished optional tasks", () => {
    const system = makeSystem({
      taskInstances: [
        makeTask({ id: "current-optional", weekNumber: 4, isCore: false }),
        makeTask({ id: "next-core", weekNumber: 5, isCore: true }),
        makeTask({ id: "next-optional", weekNumber: 5, isCore: false }),
        makeTask({
          id: "next-optional-complete",
          weekNumber: 5,
          isCore: false,
          completed: true,
          completedAt: "2026-06-02T09:00:00.000Z",
        }),
        makeTask({ id: "later-optional", weekNumber: 6, isCore: false }),
      ],
    });

    const result = applyConfirmedNextWeekHandoff(system, makeReview(), {
      applyPriority: false,
      applyWorkload: true,
      now: 1234,
    });

    expect(result.status).toBe("applied");
    expect(result.system.tacticLoadPreference).toBe("lighter");
    expect(result.system.taskInstances.find((task) => task.id === "next-optional")).toMatchObject({
      skipped: true,
      lastModifiedAt: 1234,
    });
    expect(result.system.taskInstances.find((task) => task.id === "next-core")?.skipped).not.toBe(true);
    expect(result.system.taskInstances.find((task) => task.id === "current-optional")?.skipped).not.toBe(true);
    expect(result.system.taskInstances.find((task) => task.id === "later-optional")?.skipped).not.toBe(true);
    expect(result.system.taskInstances.find((task) => task.id === "next-optional-complete")?.skipped).not.toBe(true);
  });

  it("increases next-week workload only by restoring already-skipped optional tasks", () => {
    const system = makeSystem({
      tacticLoadPreference: "lighter",
      taskInstances: [
        makeTask({ id: "next-core", weekNumber: 5, isCore: true, skipped: true }),
        makeTask({ id: "next-optional", weekNumber: 5, isCore: false, skipped: true }),
      ],
    });
    const review = makeReview({ workloadDecision: "increase slightly" });

    const result = applyConfirmedNextWeekHandoff(system, review, {
      applyPriority: false,
      applyWorkload: true,
      now: 5678,
    });

    expect(result.status).toBe("applied");
    expect(result.system.tacticLoadPreference).toBe("push");
    expect(result.system.taskInstances).toHaveLength(2);
    expect(result.system.taskInstances.find((task) => task.id === "next-optional")).toMatchObject({
      skipped: false,
      lastModifiedAt: 5678,
    });
    expect(result.system.taskInstances.find((task) => task.id === "next-core")?.skipped).toBe(true);
  });

  it("is idempotent when the same confirmed effects are applied twice", () => {
    const first = applyConfirmedNextWeekHandoff(makeSystem(), makeReview(), {
      applyPriority: true,
      applyWorkload: true,
      now: 1234,
    });
    expect(first.status).toBe("applied");

    const second = applyConfirmedNextWeekHandoff(first.system, makeReview(), {
      applyPriority: true,
      applyWorkload: true,
      now: 9999,
    });

    expect(second.status).toBe("noop");
    expect(second.system).toBe(first.system);
  });

  it("keeps remaining current-week tasks unchanged during an early review", () => {
    const system = makeSystem();
    const currentWeekTask = system.taskInstances.find((task) => task.id === "current-future");

    const result = applyConfirmedNextWeekHandoff(system, makeReview(), {
      applyPriority: true,
      applyWorkload: true,
      now: 1234,
    });

    expect(result.system.taskInstances.find((task) => task.id === "current-future")).toEqual(currentWeekTask);
  });

  it("allows a priority handoff for a no-task next week without manufacturing tasks", () => {
    const system = makeSystem({ taskInstances: [] });

    const result = applyConfirmedNextWeekHandoff(system, makeReview({ workloadDecision: "keep same" }), {
      applyPriority: true,
      applyWorkload: false,
      now: 1234,
    });

    expect(result.status).toBe("applied");
    expect(result.system.weeklyPlans.find((week) => week.weekNumber === 5)?.focus).toBe(
      "Ship the portfolio case study",
    );
    expect(result.system.taskInstances).toEqual([]);
  });

  it("does not preview a priority mutation when the next-week plan entry is missing", () => {
    const system = makeSystem({
      weeklyPlans: makeSystem().weeklyPlans.filter((week) => week.weekNumber !== 5),
      taskInstances: [],
      tacticLoadPreference: "balanced",
    });
    const review = makeReview({ workloadDecision: "keep same" });

    const preview = buildNextWeekHandoffPreview(system, review);
    const result = applyConfirmedNextWeekHandoff(system, review, {
      applyPriority: true,
      applyWorkload: false,
      now: 1234,
    });

    expect(preview).toMatchObject({
      status: "available",
      currentPriority: "",
      priorityWillChange: false,
      workloadWillChange: false,
    });
    expect(result.status).toBe("noop");
    expect(result.system).toBe(system);
  });

  it("does not offer plan mutation for a historical review", () => {
    const system = makeSystem({ currentWeek: 6 });

    const preview = buildNextWeekHandoffPreview(system, makeReview({ weekNumber: 4 }));
    const result = applyConfirmedNextWeekHandoff(system, makeReview({ weekNumber: 4 }), {
      applyPriority: true,
      applyWorkload: true,
      now: 1234,
    });

    expect(preview).toMatchObject({ status: "unavailable", reason: "historical_review" });
    expect(result.status).toBe("unavailable");
    expect(result.system).toBe(system);
  });

  it("does not offer a next-week apply for Week 12", () => {
    const system = makeSystem({ currentWeek: 12 });
    const review = makeReview({ weekNumber: 12 });

    const preview = buildNextWeekHandoffPreview(system, review);
    const result = applyConfirmedNextWeekHandoff(system, review, {
      applyPriority: true,
      applyWorkload: true,
      now: 1234,
    });

    expect(preview).toMatchObject({ status: "unavailable", reason: "final_week" });
    expect(result.status).toBe("unavailable");
    expect(result.system).toBe(system);
  });
});
