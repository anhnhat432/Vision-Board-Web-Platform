import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserData } from "@/app/utils/storage-types";
import type { TwelveWeekPulledWorkspace, TwelveWeekPullResponse } from "@/services/syncService";
import { enqueueStoredMutation } from "../persistence/mutationQueue";
import { runTwelveWeekManualCloudSync } from "./useTwelveWeekManualCloudSync";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
}

function createUserData(goals: UserData["goals"] = []): UserData {
  return {
    storageVersion: 1,
    userId: "local",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals,
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      allowLocalAnalytics: false,
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      keepLocalOutbox: false,
      preferredReminderHour: 19,
    },
    onboardingCompleted: false,
  };
}

function createEmptyWorkspace(overrides: Partial<TwelveWeekPulledWorkspace> = {}): TwelveWeekPulledWorkspace {
  return {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    ...overrides,
  };
}

function createPullResponse(workspace: TwelveWeekPulledWorkspace): TwelveWeekPullResponse {
  return {
    serverTime: at(10),
    mode: "full",
    cursor: null,
    nextCursor: "cursor_1",
    hasMore: false,
    cursorStatus: "not_provided",
    warnings: [],
    workspace,
    changes: workspace,
    tombstones: {
      goals: [],
      plans: [],
      weeks: [],
      tasks: [],
      leadMetrics: [],
      dailyCheckIns: [],
      weeklyReviews: [],
    },
    counts: {
      goals: workspace.goals.length,
      plans: workspace.plans.length,
      weeks: workspace.weeks.length,
      tasks: workspace.tasks.length,
      leadMetrics: workspace.leadMetrics.length,
      dailyCheckIns: workspace.dailyCheckIns.length,
      weeklyReviews: workspace.weeklyReviews.length,
    },
  };
}

function createSafeCloudWorkspace(): TwelveWeekPulledWorkspace {
  return createEmptyWorkspace({
    goals: [
      {
        id: "backend_goal_1",
        clientGoalId: "goal_1",
        title: "Launch demo",
        category: "Career",
        description: "Ship demo",
        status: "active",
      },
    ],
    plans: [
      {
        id: "backend_plan_1",
        clientGoalId: "goal_1",
        clientPlanId: "goal_1:12-week-system",
        vision: "Launch demo",
        startDate: "2026-04-27",
      },
    ],
    weeks: [
      {
        id: "backend_week_1",
        planId: "backend_plan_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        weekNumber: 1,
        focus: "Validate",
        expectedOutput: "One test",
      },
    ],
    tasks: [
      {
        id: "backend_task_1",
        weekId: "backend_week_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientTaskId: "tw_task_1_tactic_write_0",
        weekNumber: 1,
        title: "Write",
        status: "done",
        scheduledDate: "2026-04-27",
        completedAt: at(2),
        leadIndicatorName: "Write",
        tacticId: "tactic_write",
        isCore: true,
      },
    ],
    leadMetrics: [
      {
        id: "backend_metric_1",
        weekId: "backend_week_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientMetricId: "goal_1:week:1:metric:tactic_write",
        leadIndicatorId: "tactic_write",
        name: "Write",
        weeklyTarget: 1,
        unit: "session/week",
        type: "core",
        priority: 1,
        schedule: [0],
        logs: [],
      },
    ],
  });
}

function createLocalDataWithDifferentTask(): UserData {
  return createUserData([
    {
      id: "goal_1",
      category: "Career",
      title: "Launch demo",
      description: "Ship demo",
      deadline: "",
      tasks: [],
      createdAt: baseNow,
      twelveWeekSystem: {
        goalType: "Career",
        vision12Week: "Launch demo",
        lagMetric: {
          name: "",
          unit: "",
          target: "",
          currentValue: "",
        },
        leadIndicators: [
          {
            id: "tactic_write",
            name: "Write",
            target: "1",
            unit: "session/week",
            type: "core",
            schedule: [0],
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
        startDate: "2026-04-27",
        endDate: "2026-07-19",
        timezone: "Asia/Ho_Chi_Minh",
        weekStartsOn: "Monday",
        status: "active",
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans: [
          {
            weekNumber: 1,
            phaseName: "Foundation",
            focus: "Validate",
            milestone: "One test",
            completed: false,
          },
        ],
        taskInstances: [
          {
            id: "tw_task_1_tactic_write_0",
            weekNumber: 1,
            scheduledDate: "2026-04-27",
            title: "Write",
            leadIndicatorName: "Write",
            isCore: true,
            completed: false,
          },
        ],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: [],
      },
    },
  ]);
}

function baseOptions() {
  return {
    ownerUid: "user_1",
    authenticated: true,
    realMode: true,
    mutationFeatureEnabled: true,
    pullFeatureEnabled: true,
    apiConfigured: true,
    storage: localStorage,
    now: at(5),
  } as const;
}

describe("runTwelveWeekManualCloudSync", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not call API dependencies in demo mode", async () => {
    const drainMutations = vi.fn();
    const pullWorkspace = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      realMode: false,
      drainMutations,
      pullWorkspace,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("demo_mode");
    expect(drainMutations).not.toHaveBeenCalled();
    expect(pullWorkspace).not.toHaveBeenCalled();
  });

  it("does not call API dependencies when a feature flag is off", async () => {
    const drainMutations = vi.fn();
    const pullWorkspace = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      pullFeatureEnabled: false,
      drainMutations,
      pullWorkspace,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("pull_feature_disabled");
    expect(drainMutations).not.toHaveBeenCalled();
    expect(pullWorkspace).not.toHaveBeenCalled();
  });

  it("does not call API dependencies when mutation sync flag is off", async () => {
    const drainMutations = vi.fn();
    const pullWorkspace = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      mutationFeatureEnabled: false,
      drainMutations,
      pullWorkspace,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("mutation_feature_disabled");
    expect(drainMutations).not.toHaveBeenCalled();
    expect(pullWorkspace).not.toHaveBeenCalled();
  });

  it("does not call API dependencies when the backend API is not configured", async () => {
    const drainMutations = vi.fn();
    const pullWorkspace = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      apiConfigured: false,
      drainMutations,
      pullWorkspace,
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("api_not_configured");
    expect(drainMutations).not.toHaveBeenCalled();
    expect(pullWorkspace).not.toHaveBeenCalled();
  });

  it("drains queue before pulling cloud workspace for a real authenticated account", async () => {
    const drainMutations = vi.fn(async () => ({
      status: "idle" as const,
      skipReason: "empty" as const,
      attemptedCount: 0,
      succeededCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      pendingCount: 0,
    }));
    const pullWorkspace = vi.fn(async () => createPullResponse(createSafeCloudWorkspace()));
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations,
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData,
    });

    expect(result.status).toBe("applied");
    expect(drainMutations.mock.invocationCallOrder[0]).toBeLessThan(pullWorkspace.mock.invocationCallOrder[0]);
    expect(writeUserData).toHaveBeenCalledTimes(1);
  });

  it("does not pull or overwrite local data when queue drain fails", async () => {
    const pullWorkspace = vi.fn();
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "partial" as const,
        attemptedCount: 2,
        succeededCount: 1,
        duplicateCount: 0,
        failedCount: 1,
        pendingCount: 1,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData,
    });

    expect(result.status).toBe("drain_failed");
    expect(pullWorkspace).not.toHaveBeenCalled();
    expect(writeUserData).not.toHaveBeenCalled();
  });

  it("does not pull or overwrite local data when queue drain is skipped because the browser is offline", async () => {
    const pullWorkspace = vi.fn();
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "skipped" as const,
        skipReason: "offline" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 1,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData,
    });

    expect(result.status).toBe("drain_failed");
    expect(pullWorkspace).not.toHaveBeenCalled();
    expect(writeUserData).not.toHaveBeenCalled();
  });

  it("does not overwrite local data when pull merge reports a conflict", async () => {
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => createPullResponse(createSafeCloudWorkspace())),
      readUserData: () => createLocalDataWithDifferentTask(),
      writeUserData,
    });

    expect(result.status).toBe("conflict");
    expect(result.mergeReport?.conflicts).not.toEqual([]);
    expect(writeUserData).not.toHaveBeenCalled();
  });

  it("applies safe cloud data into local storage through the injected writer", async () => {
    let writtenData: UserData | undefined;
    const writeUserData = vi.fn((data: UserData) => {
      writtenData = data;
      return true;
    });

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "success" as const,
        attemptedCount: 1,
        succeededCount: 1,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => createPullResponse(createSafeCloudWorkspace())),
      readUserData: () => createUserData(),
      writeUserData,
    });

    expect(result.status).toBe("applied");
    expect(writtenData?.goals[0].id).toBe("goal_1");
    expect(writtenData?.goals[0].twelveWeekSystem?.taskInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tw_task_1_tactic_write_0",
          completed: true,
        }),
      ]),
    );
  });

  it("keeps local data untouched when unresolved local mutations remain after drain", async () => {
    enqueueStoredMutation(
      {
        kind: "task_completed_changed",
        goalId: "goal_1",
        payload: {
          taskId: "tw_task_1_tactic_write_0",
          clientTaskId: "tw_task_1_tactic_write_0",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          completed: true,
          completedAt: at(1),
          scheduledDate: "2026-04-27",
        },
      },
      {
        ownerUid: "user_1",
        storage: localStorage,
        deviceId: "device_1",
        now: at(1),
        createId: () => "mutation_pending",
      },
    );
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => createPullResponse(createSafeCloudWorkspace())),
      readUserData: () => createUserData(),
      writeUserData,
    });

    expect(result.status).toBe("conflict");
    expect(result.unresolvedLocalMutationCount).toBe(1);
    expect(writeUserData).not.toHaveBeenCalled();
  });

  it("saves the nextCursor after a successful pull+apply", async () => {
    let savedCursor: string | null | undefined;
    const writeCursor = vi.fn((uid: string, cursor: string | null) => {
      savedCursor = cursor;
    });

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => createPullResponse(createSafeCloudWorkspace())),
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => null,
      writeCursor,
    });

    expect(result.status).toBe("applied");
    expect(writeCursor).toHaveBeenCalledWith("user_1", "cursor_1");
    expect(savedCursor).toBe("cursor_1");
  });

  it("sends the stored cursor to the pull API", async () => {
    const pullWorkspace = vi.fn(async () => createPullResponse(createSafeCloudWorkspace()));

    await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => "stored_cursor_abc",
      writeCursor: vi.fn(),
    });

    expect(pullWorkspace).toHaveBeenCalledWith({ cursor: "stored_cursor_abc" });
  });

  it("does not send cursor when no stored cursor exists", async () => {
    const pullWorkspace = vi.fn(async () => createPullResponse(createSafeCloudWorkspace()));

    await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => null,
      writeCursor: vi.fn(),
    });

    expect(pullWorkspace).toHaveBeenCalledWith(undefined);
  });

  it("clears cursor and retries full pull when backend reports invalid cursor", async () => {
    const clearCursorFn = vi.fn();
    let callCount = 0;
    const pullWorkspace = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        // First call with cursor returns invalid
        return {
          ...createPullResponse(createEmptyWorkspace()),
          cursorStatus: "invalid" as const,
          warnings: [{ code: "cursor_invalid", message: "Invalid cursor format" }],
        };
      }
      // Second call without cursor returns clean workspace
      return createPullResponse(createSafeCloudWorkspace());
    });

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => "old_invalid_cursor",
      writeCursor: vi.fn(),
      clearCursorFn,
    });

    expect(clearCursorFn).toHaveBeenCalledWith("user_1");
    expect(pullWorkspace).toHaveBeenCalledTimes(2);
    expect(pullWorkspace.mock.calls[0]).toEqual([{ cursor: "old_invalid_cursor" }]);
    expect(pullWorkspace.mock.calls[1]).toEqual([]);
    expect(result.status).toBe("applied");
  });

  it("does not retry when cursor is not stored even if backend says invalid", async () => {
    const pullWorkspace = vi.fn(async () => ({
      ...createPullResponse(createSafeCloudWorkspace()),
      cursorStatus: "invalid" as const,
    }));

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace,
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => null,
      writeCursor: vi.fn(),
    });

    // Should not retry since there was no stored cursor
    expect(pullWorkspace).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("applied");
  });

  it("does not update cursor on conflict", async () => {
    const writeCursor = vi.fn();
    const recordConflictFn = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => createPullResponse(createSafeCloudWorkspace())),
      readUserData: () => createLocalDataWithDifferentTask(),
      writeUserData: vi.fn(() => true),
      readCursor: () => "existing_cursor",
      writeCursor,
      recordConflictFn,
    });

    expect(result.status).toBe("conflict");
    expect(writeCursor).not.toHaveBeenCalled();
    expect(recordConflictFn).toHaveBeenCalledWith("user_1");
  });

  it("records error status when pull throws an exception", async () => {
    const recordErrorFn = vi.fn();
    const writeCursor = vi.fn();

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => {
        throw new Error("Network error");
      }),
      readUserData: () => createUserData(),
      writeUserData: vi.fn(() => true),
      readCursor: () => "stored_cursor",
      writeCursor,
      recordErrorFn,
    });

    expect(result.status).toBe("error");
    expect(writeCursor).not.toHaveBeenCalled();
    expect(recordErrorFn).toHaveBeenCalledWith("user_1");
  });

  it("preserves local data when pull fails with an error", async () => {
    const writeUserData = vi.fn(() => true);

    const result = await runTwelveWeekManualCloudSync({
      ...baseOptions(),
      drainMutations: vi.fn(async () => ({
        status: "idle" as const,
        skipReason: "empty" as const,
        attemptedCount: 0,
        succeededCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        pendingCount: 0,
      })),
      pullWorkspace: vi.fn(async () => {
        throw new Error("Server unavailable");
      }),
      readUserData: () => createLocalDataWithDifferentTask(),
      writeUserData,
      readCursor: () => null,
      writeCursor: vi.fn(),
      recordErrorFn: vi.fn(),
    });

    expect(result.status).toBe("error");
    expect(writeUserData).not.toHaveBeenCalled();
  });
});
