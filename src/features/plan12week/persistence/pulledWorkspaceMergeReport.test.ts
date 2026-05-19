import { describe, expect, it } from "vitest";

import type { Goal, TwelveWeekSystem, UserData } from "@/app/utils/storage-types";
import type { DataMutationItem } from "./mutationQueue";
import { createPulledWorkspaceMergeReport } from "./pulledWorkspaceMergeReport";
import type { TwelveWeekPulledWorkspace, TwelveWeekPullResponse } from "@/services/syncService";

const baseNow = "2026-04-30T00:00:00.000Z";

function at(minutes: number): string {
  return new Date(new Date(baseNow).getTime() + minutes * 60_000).toISOString();
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

function createCloudWorkspace(overrides: Partial<TwelveWeekPulledWorkspace> = {}): TwelveWeekPulledWorkspace {
  return createEmptyWorkspace({
    goals: [
      {
        id: "backend_goal_1",
        clientGoalId: "goal_1",
        title: "Launch demo",
        category: "Career",
        description: "Ship the public demo.",
        deadline: "2026-07-22",
        status: "active",
        syncUpdatedAt: at(10),
      },
    ],
    plans: [
      {
        id: "backend_plan_1",
        clientPlanId: "goal_1:12-week-system",
        clientGoalId: "goal_1",
        vision: "Launch demo",
        startDate: "2026-04-30",
        syncUpdatedAt: at(10),
      },
    ],
    weeks: [
      {
        id: "backend_week_1",
        planId: "backend_plan_1",
        clientWeekId: "goal_1:week:1",
        clientPlanId: "goal_1:12-week-system",
        weekNumber: 1,
        focus: "Validate clarity",
        expectedOutput: "Three notes",
        syncUpdatedAt: at(10),
      },
    ],
    tasks: [
      {
        id: "backend_task_1",
        weekId: "backend_week_1",
        clientTaskId: "task_1",
        clientWeekId: "goal_1:week:1",
        clientPlanId: "goal_1:12-week-system",
        weekNumber: 1,
        title: "Run one test",
        status: "done",
        scheduledDate: "2026-04-30",
        completedAt: at(10),
        isCore: true,
        syncUpdatedAt: at(10),
      },
    ],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    ...overrides,
  });
}

function createDeltaPullResponse(workspace: Partial<TwelveWeekPulledWorkspace>): TwelveWeekPullResponse {
  const deltaWorkspace = createEmptyWorkspace(workspace);

  return {
    serverTime: at(20),
    mode: "delta",
    cursor: "cursor_before",
    nextCursor: "cursor_after",
    hasMore: false,
    cursorStatus: "applied",
    warnings: [],
    workspace: deltaWorkspace,
    changes: deltaWorkspace,
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
      goals: deltaWorkspace.goals.length,
      plans: deltaWorkspace.plans.length,
      weeks: deltaWorkspace.weeks.length,
      tasks: deltaWorkspace.tasks.length,
      leadMetrics: deltaWorkspace.leadMetrics.length,
      dailyCheckIns: deltaWorkspace.dailyCheckIns.length,
      weeklyReviews: deltaWorkspace.weeklyReviews.length,
    },
  };
}

function createTwelveWeekSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Launch demo",
    lagMetric: {
      name: "",
      unit: "",
      target: "",
      currentValue: "",
    },
    leadIndicators: [],
    milestones: {
      week4: "",
      week8: "",
      week12: "",
    },
    successEvidence: "",
    reviewDay: "",
    week12Outcome: "",
    startDate: "2026-04-30",
    endDate: "2026-07-22",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Foundation",
        focus: "Validate clarity",
        milestone: "Three notes",
        completed: false,
      },
    ],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
    ...overrides,
  };
}

function createGoal(overrides: Partial<Goal> = {}, systemOverrides: Partial<TwelveWeekSystem> = {}): Goal {
  return {
    id: "goal_1",
    category: "Career",
    title: "Launch demo",
    description: "Ship the public demo.",
    deadline: "2026-07-22",
    tasks: [],
    focusArea: "Career",
    twelveWeekSystem: createTwelveWeekSystem(systemOverrides),
    createdAt: "2026-04-30T00:00:00.000Z",
    ...overrides,
  };
}

function createUserData(goals: Goal[]): UserData {
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

function createPendingDeleteMutation(kind: "goal_deleted" | "plan_deleted"): DataMutationItem {
  const base = {
    id: `mutation_${kind}`,
    idempotencyKey: `user_1:device_1:mutation_${kind}`,
    collapseKey: kind === "goal_deleted" ? "delete:goal_deleted:goal_1" : "delete:plan_deleted:goal_1:12-week-system",
    kind,
    status: "pending" as const,
    createdAt: at(1),
    updatedAt: at(1),
    attemptCount: 0,
    maxAttempts: 7,
    ownerUid: "user_1",
    goalId: "goal_1",
    planId: "goal_1:12-week-system",
  };

  if (kind === "goal_deleted") {
    return {
      ...base,
      kind,
      payload: {
        clientGoalId: "goal_1",
        backendGoalId: "backend_goal_1",
        deletedAt: at(1),
      },
    };
  }

  return {
    ...base,
    kind,
    payload: {
      clientPlanId: "goal_1:12-week-system",
      backendPlanId: "backend_plan_1",
      clientGoalId: "goal_1",
      deletedAt: at(1),
    },
  };
}

function createPendingTaskMutation(): DataMutationItem {
  return {
    id: "mutation_task_1",
    idempotencyKey: "user_1:device_1:mutation_task_1",
    collapseKey: "task:goal_1:task_1",
    kind: "task_completed_changed",
    status: "pending",
    createdAt: at(1),
    updatedAt: at(1),
    attemptCount: 0,
    maxAttempts: 7,
    ownerUid: "user_1",
    goalId: "goal_1",
    planId: "goal_1:12-week-system",
    payload: {
      taskId: "task_1",
      clientTaskId: "task_1",
      clientPlanId: "goal_1:12-week-system",
      clientWeekId: "goal_1:week:1",
      weekNumber: 1,
      completed: false,
      scheduledDate: "2026-04-30",
    },
  };
}

describe("pulled workspace merge report", () => {
  it("marks empty local data plus a cloud workspace as safe to apply", () => {
    const report = createPulledWorkspaceMergeReport(createUserData([]), createCloudWorkspace());

    expect(report.safeToApply).toBe(true);
    expect(report.cloudOnlyChanges.map((change) => change.kind)).toContain("goal");
    expect(report.cloudOnlyChanges.map((change) => change.kind)).toContain("task");
    expect(report.localOnlyChanges).toEqual([]);
    expect(report.conflicts).toEqual([]);
  });

  it("reports pending local mutation conflict when the cloud entity is newer", () => {
    const localGoal = createGoal(
      {},
      {
        taskInstances: [
          {
            id: "task_1",
            weekNumber: 1,
            scheduledDate: "2026-04-30",
            title: "Run one test",
            leadIndicatorName: "",
            isCore: true,
            completed: false,
          },
        ],
      },
    );
    const report = createPulledWorkspaceMergeReport(localGoal, createCloudWorkspace(), {
      pendingMutations: [createPendingTaskMutation()],
    });

    expect(report.safeToApply).toBe(false);
    expect(report.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          clientId: "task_1",
          mutationId: "mutation_task_1",
          reason: "pending_local_mutation_cloud_newer",
        }),
      ]),
    );
  });

  it("warns when pulled entities are missing client ids", () => {
    const report = createPulledWorkspaceMergeReport(
      createUserData([]),
      createCloudWorkspace({
        tasks: [
          {
            id: "backend_task_missing_client_id",
            weekId: "backend_week_1",
            title: "Missing client id",
            status: "todo",
          },
        ],
      }),
    );

    expect(report.safeToApply).toBe(false);
    expect(report.missingClientIds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          cloudId: "backend_task_missing_client_id",
        }),
      ]),
    );
  });

  it("reports cloud-only tasks without mutating local data", () => {
    const localGoal = createGoal();
    const before = JSON.parse(JSON.stringify(localGoal)) as Goal;

    const report = createPulledWorkspaceMergeReport(localGoal, createCloudWorkspace());

    expect(report.cloudOnlyChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          clientId: "task_1",
          source: "cloud",
        }),
      ]),
    );
    expect(localGoal).toEqual(before);
  });

  it("reports local-only tasks", () => {
    const localGoal = createGoal(
      {},
      {
        taskInstances: [
          {
            id: "task_local_only",
            weekNumber: 1,
            scheduledDate: "2026-04-30",
            title: "Local draft task",
            leadIndicatorName: "",
            isCore: true,
            completed: false,
          },
        ],
      },
    );

    const report = createPulledWorkspaceMergeReport(
      localGoal,
      createCloudWorkspace({
        tasks: [],
      }),
    );

    expect(report.localOnlyChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          clientId: "task_local_only",
          source: "local",
        }),
      ]),
    );
  });

  it("does not treat omitted local records as local-only during delta pull", () => {
    const localGoal = createGoal(
      {},
      {
        taskInstances: [
          {
            id: "task_1",
            weekNumber: 1,
            scheduledDate: "2026-04-30",
            title: "Run one test",
            leadIndicatorName: "",
            isCore: true,
            completed: false,
          },
          {
            id: "task_local_unchanged",
            weekNumber: 1,
            scheduledDate: "2026-04-30",
            title: "Unchanged local task",
            leadIndicatorName: "",
            isCore: true,
            completed: false,
          },
        ],
      },
    );
    const delta = createDeltaPullResponse({
      tasks: createCloudWorkspace().tasks,
    });

    const report = createPulledWorkspaceMergeReport(localGoal, delta);

    expect(report.safeToApply).toBe(true);
    expect(report.localOnlyChanges).toEqual([]);
    expect(report.conflicts).toEqual([]);
    expect(report.cloudOnlyChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          clientId: "task_1",
        }),
      ]),
    );
  });

  it("ignores local-only goal and plan when delete mutations are pending", () => {
    const report = createPulledWorkspaceMergeReport(createGoal(), createEmptyWorkspace(), {
      pendingMutations: [createPendingDeleteMutation("goal_deleted"), createPendingDeleteMutation("plan_deleted")],
    });

    expect(report.localOnlyChanges).toEqual([]);
  });

  it("ignores cloud-only goal and plan when pull response contains matching tombstones", () => {
    const response = createDeltaPullResponse(createCloudWorkspace());
    response.mode = "full";
    response.tombstones.goals = [
      {
        id: "backend_goal_1",
        clientId: "goal_1",
        deletedAt: at(20),
      },
    ];
    response.tombstones.plans = [
      {
        id: "backend_plan_1",
        clientId: "goal_1:12-week-system",
        deletedAt: at(20),
      },
    ];

    const report = createPulledWorkspaceMergeReport(createUserData([]), response);

    expect(report.cloudOnlyChanges.some((change) => change.kind === "goal" && change.clientId === "goal_1")).toBe(
      false,
    );
    expect(
      report.cloudOnlyChanges.some((change) => change.kind === "plan" && change.clientId === "goal_1:12-week-system"),
    ).toBe(false);
  });

  it("does not mutate UserData input", () => {
    const userData = createUserData([
      createGoal(
        {},
        {
          taskInstances: [
            {
              id: "task_1",
              weekNumber: 1,
              scheduledDate: "2026-04-30",
              title: "Run one test",
              leadIndicatorName: "",
              isCore: true,
              completed: false,
            },
          ],
        },
      ),
    ]);
    const before = JSON.parse(JSON.stringify(userData)) as UserData;

    createPulledWorkspaceMergeReport(userData, createCloudWorkspace());

    expect(userData).toEqual(before);
  });
});
