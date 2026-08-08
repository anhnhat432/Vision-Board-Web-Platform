import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, resetUserDataCache, saveUserData } from "@/app/utils/storage";
import { getDefaultScoreboard, getWeekTaskBreakdown } from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { listStoredPendingMutations } from "./mutationQueue";
import { commitTwelveWeekTaskCompletion, rollbackTwelveWeekTaskCompletion } from "./taskCompletionMutation";

const GOAL_ID = "goal_canonical_completion";
const TASK_ID = "task_write_draft";

function createTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: TASK_ID,
    weekNumber: 1,
    scheduledDate: "2026-08-08",
    title: "Write the first draft",
    leadIndicatorName: "Deep work",
    tacticId: "lead_deep_work",
    isCore: true,
    completed: false,
    lastModifiedAt: 100,
    ...overrides,
  };
}

function createSystem(task: TwelveWeekTaskInstance = createTask()): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship the product",
    lagMetric: {
      name: "Released milestones",
      unit: "milestones",
      target: "1",
      currentValue: "0",
    },
    leadIndicators: [
      {
        id: "lead_deep_work",
        name: "Deep work",
        target: "1",
        unit: "session/week",
        type: "core",
        priority: 1,
        schedule: [5],
      },
    ],
    milestones: { week4: "", week8: "", week12: "Ship" },
    successEvidence: "The release is live",
    reviewDay: "Sunday",
    week12Outcome: "Ship",
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Start",
        focus: "Draft",
        milestone: "First draft",
        completed: false,
      },
    ],
    taskInstances: [task],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
  };
}

function seedGoal(task: TwelveWeekTaskInstance = createTask()): void {
  const data = getUserData();
  const goal: Goal = {
    id: GOAL_ID,
    category: "Career",
    title: "Canonical completion goal",
    description: "",
    deadline: "2026-10-25",
    tasks: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    twelveWeekSystem: createSystem(task),
  };

  data.goals = [goal];
  expect(saveUserData(data)).toBe(true);
}

function readTask(): TwelveWeekTaskInstance {
  const task = getUserData().goals[0]?.twelveWeekSystem?.taskInstances.find((item) => item.id === TASK_ID);
  if (!task) throw new Error("Expected seeded task");
  return task;
}

function pendingMutations() {
  return listStoredPendingMutations(null, { now: "2026-08-08T12:30:00.000Z" });
}

describe("canonical 12-week task completion mutation", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    seedGoal();
  });

  it("completes locally with one task mutation and the matching lead metric mutation", () => {
    const now = 1_754_654_400_000;

    const result = commitTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      completed: true,
      now,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") throw new Error("Expected applied result");
    expect(result.previousTask).toEqual(createTask());
    expect(result.updatedTask).toEqual(
      expect.objectContaining({
        completed: true,
        completedAt: new Date(now).toISOString(),
        lastModifiedAt: now,
      }),
    );
    expect(result.taskMutationEnqueued).toBe(true);
    expect(result.leadMetricMutationCount).toBe(1);
    expect(readTask()).toEqual(result.updatedTask);
    expect(result.updatedSystem.scoreboard[0]?.leadCompletionPercent).toBe(
      getWeekTaskBreakdown(result.updatedSystem, 1).corePercent,
    );
    expect(result.updatedSystem.scoreboard[0]?.leadCompletionPercent).toBeGreaterThan(0);

    const pending = pendingMutations();
    expect(pending.filter((item) => item.kind === "task_completed_changed")).toHaveLength(1);
    expect(pending.filter((item) => item.kind === "lead_metric_upserted")).toHaveLength(1);
    expect(pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task_completed_changed",
          payload: expect.objectContaining({
            taskId: TASK_ID,
            clientTaskId: TASK_ID,
            completed: true,
            completedAt: new Date(now).toISOString(),
          }),
        }),
        expect.objectContaining({
          kind: "lead_metric_upserted",
          payload: expect.objectContaining({
            leadIndicatorId: "lead_deep_work",
            currentValue: 1,
            reason: "task_progress",
          }),
        }),
      ]),
    );
  });

  it("reopens locally by clearing completedAt and updating both queued states", () => {
    const completedTask = createTask({
      completed: true,
      completedAt: "2026-08-08T08:00:00.000Z",
      lastModifiedAt: 200,
    });
    localStorage.clear();
    resetUserDataCache();
    seedGoal(completedTask);
    const now = 1_754_658_000_000;

    const result = commitTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      completed: false,
      now,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") throw new Error("Expected applied result");
    expect(readTask()).toEqual(
      expect.objectContaining({
        completed: false,
        completedAt: undefined,
        lastModifiedAt: now,
      }),
    );
    expect(result.updatedSystem.scoreboard[0]?.leadCompletionPercent).toBe(0);

    const pending = pendingMutations();
    const taskMutation = pending.find((item) => item.kind === "task_completed_changed");
    const leadMutation = pending.find((item) => item.kind === "lead_metric_upserted");
    expect(taskMutation?.payload).toEqual(expect.objectContaining({ completed: false }));
    expect(taskMutation?.payload).not.toHaveProperty("completedAt");
    expect(leadMutation?.payload).toEqual(expect.objectContaining({ currentValue: 0 }));
  });

  it("returns noop for an identical requested state without another write or mutation", () => {
    const now = 1_754_654_400_000;
    const first = commitTwelveWeekTaskCompletion({ goalId: GOAL_ID, taskId: TASK_ID, completed: true, now });
    const persistedAfterFirst = localStorage.getItem("visionboard_user_data");
    const second = commitTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      completed: true,
      now: now + 1_000,
    });

    expect(first.status).toBe("applied");
    expect(second.status).toBe("noop");
    expect(localStorage.getItem("visionboard_user_data")).toBe(persistedAfterFirst);
    expect(pendingMutations().filter((item) => item.kind === "task_completed_changed")).toHaveLength(1);
    expect(pendingMutations().filter((item) => item.kind === "lead_metric_upserted")).toHaveLength(1);
  });

  it("collapses a rapid complete then reopen sequence to the final queued state", () => {
    const completedAt = 1_754_654_400_000;
    const reopenedAt = completedAt + 1_000;

    expect(
      commitTwelveWeekTaskCompletion({ goalId: GOAL_ID, taskId: TASK_ID, completed: true, now: completedAt }).status,
    ).toBe("applied");
    expect(
      commitTwelveWeekTaskCompletion({ goalId: GOAL_ID, taskId: TASK_ID, completed: false, now: reopenedAt }).status,
    ).toBe("applied");

    expect(readTask()).toEqual(
      expect.objectContaining({ completed: false, completedAt: undefined, lastModifiedAt: reopenedAt }),
    );
    const pending = pendingMutations();
    const taskMutations = pending.filter((item) => item.kind === "task_completed_changed");
    const leadMutations = pending.filter((item) => item.kind === "lead_metric_upserted");
    expect(taskMutations).toHaveLength(1);
    expect(taskMutations[0]?.payload).toEqual(expect.objectContaining({ completed: false }));
    expect(leadMutations).toHaveLength(1);
    expect(leadMutations[0]?.payload).toEqual(expect.objectContaining({ currentValue: 0 }));
  });

  it("keeps the local task authoritative when queue persistence fails", () => {
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
      const result = commitTwelveWeekTaskCompletion({
        goalId: GOAL_ID,
        taskId: TASK_ID,
        completed: true,
        now: 1_754_654_400_000,
      });

      expect(result.status).toBe("applied");
      if (result.status !== "applied") throw new Error("Expected applied result");
      expect(result.taskMutationEnqueued).toBe(false);
      expect(result.leadMetricMutationCount).toBe(0);
      expect(readTask().completed).toBe(true);
      expect(pendingMutations()).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("reports local_save_failed without mutating the cached or persisted task", () => {
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
      const result = commitTwelveWeekTaskCompletion({
        goalId: GOAL_ID,
        taskId: TASK_ID,
        completed: true,
        now: 1_754_654_400_000,
      });

      expect(result.status).toBe("local_save_failed");
      expect(readTask()).toEqual(createTask());
      expect(localStorage.getItem("visionboard_user_data")).toBe(before);
      expect(pendingMutations()).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("restores the exact previous snapshot and enqueues the rolled-back state", () => {
    const previousTask = createTask({
      completed: true,
      completedAt: "2026-08-08T07:30:00.000Z",
      lastModifiedAt: 321,
    });
    localStorage.clear();
    resetUserDataCache();
    seedGoal(previousTask);
    const applied = commitTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      completed: false,
      now: 1_754_654_400_000,
    });
    if (applied.status !== "applied") throw new Error("Expected applied result");

    const rollback = rollbackTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      previousTask: applied.previousTask,
      attemptedTask: applied.updatedTask,
      now: 1_754_654_401_000,
    });

    expect(rollback.status).toBe("applied");
    expect(readTask()).toEqual(previousTask);
    const taskMutation = pendingMutations().find((item) => item.kind === "task_completed_changed");
    const leadMutation = pendingMutations().find((item) => item.kind === "lead_metric_upserted");
    expect(taskMutation?.payload).toEqual(
      expect.objectContaining({
        completed: true,
        completedAt: previousTask.completedAt,
      }),
    );
    expect(leadMutation?.payload).toEqual(expect.objectContaining({ currentValue: 1 }));
  });

  it("does not roll back when a newer task snapshot replaced the failed attempt", () => {
    const applied = commitTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      completed: true,
      now: 1_754_654_400_000,
    });
    if (applied.status !== "applied") throw new Error("Expected applied result");

    const data = getUserData();
    const goal = data.goals.find((item) => item.id === GOAL_ID);
    if (!goal?.twelveWeekSystem) throw new Error("Expected seeded system");
    goal.twelveWeekSystem.taskInstances = goal.twelveWeekSystem.taskInstances.map((task) =>
      task.id === TASK_ID
        ? {
            ...task,
            scheduledDate: "2026-08-09",
            lastModifiedAt: 1_754_654_401_000,
          }
        : task,
    );
    expect(saveUserData(data)).toBe(true);

    const rollback = rollbackTwelveWeekTaskCompletion({
      goalId: GOAL_ID,
      taskId: TASK_ID,
      previousTask: applied.previousTask,
      attemptedTask: applied.updatedTask,
    });

    expect(rollback.status).toBe("noop");
    expect(readTask()).toEqual(
      expect.objectContaining({
        completed: true,
        scheduledDate: "2026-08-09",
        lastModifiedAt: 1_754_654_401_000,
      }),
    );
  });
});
