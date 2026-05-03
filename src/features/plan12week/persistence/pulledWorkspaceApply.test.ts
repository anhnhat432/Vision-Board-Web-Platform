import { describe, expect, it } from "vitest";

import type { UserData } from "@/app/utils/storage-types";
import type { TwelveWeekPulledWorkspace, TwelveWeekPullResponse } from "@/services/syncService";
import { applyPulledWorkspaceToUserData } from "./pulledWorkspaceApply";

const baseNow = "2026-04-30T00:00:00.000Z";

function createUserData(): UserData {
  return {
    storageVersion: 1,
    userId: "local",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [
      {
        id: "event_1",
        type: "local_only",
        createdAt: baseNow,
      },
    ],
    syncOutbox: [],
    appPreferences: {
      allowLocalAnalytics: false,
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      keepLocalOutbox: false,
      preferredReminderHour: 19,
    },
    subscription: {
      planCode: "PLUS",
      status: "active",
      billingCycle: "season-pass",
      startedAt: baseNow,
      providerMode: "mock_provider",
      isLocalTestMode: true,
    },
    entitlements: [
      {
        key: "premium_templates",
        sourcePlan: "PLUS",
        grantedAt: baseNow,
      },
    ],
    onboardingCompleted: false,
  };
}

function createWorkspace(): TwelveWeekPulledWorkspace {
  return {
    goals: [
      {
        id: "backend_goal_1",
        clientGoalId: "goal_1",
        title: "Launch demo",
        category: "Career",
        description: "Ship the public demo.",
        deadline: "2026-07-22",
        status: "active",
        focusArea: "Career",
        createdAt: baseNow,
      },
    ],
    plans: [
      {
        id: "backend_plan_1",
        clientGoalId: "goal_1",
        clientPlanId: "goal_1:12-week-system",
        vision: "Launch demo in 12 weeks",
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
        focus: "Validate clarity",
        expectedOutput: "Three user notes",
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
        completedAt: "2026-04-30T01:00:00.000Z",
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
    dailyCheckIns: [
      {
        id: "backend_checkin_1",
        planId: "backend_plan_1",
        weekId: "backend_week_1",
        clientGoalId: "goal_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientCheckInId: "goal_1:12-week-system:checkin:2026-04-30",
        weekNumber: 1,
        localDate: "2026-04-30",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Write",
        amountDone: "1 session",
        outputCreated: "Draft",
        obstacleOrIssue: "",
        dailySelfRating: 4,
        optionalNote: "Kept local note in first-party sync payload.",
        mood: "steady",
      },
    ],
    weeklyReviews: [
      {
        id: "backend_review_1",
        planId: "backend_plan_1",
        weekId: "backend_week_1",
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:1",
        clientReviewId: "goal_1:12-week-system:review:1",
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "1/12",
        biggestOutputThisWeek: "Draft completed",
        mainObstacle: "Context switching",
        nextWeekPriority: "Interview users",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 8,
        disciplineScore: 8,
        focusScore: 7,
        improvementScore: 7,
        outputQualityScore: 8,
        completedLeadIndicators: 1,
      },
    ],
  };
}

function createDeltaResponse(workspace: Partial<TwelveWeekPulledWorkspace>): TwelveWeekPullResponse {
  const deltaWorkspace: TwelveWeekPulledWorkspace = {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    ...workspace,
  };

  return {
    serverTime: "2026-04-30T02:00:00.000Z",
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

describe("applyPulledWorkspaceToUserData", () => {
  it("adds a safe pulled cloud workspace to empty local user data", () => {
    const nextData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });

    expect(nextData.goals).toHaveLength(1);
    expect(nextData.goals[0].id).toBe("goal_1");
    expect(nextData.goals[0].twelveWeekSystem?.vision12Week).toBe("Launch demo in 12 weeks");
    expect(nextData.goals[0].twelveWeekSystem?.taskInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tw_task_1_tactic_write_0",
          completed: true,
          completedAt: "2026-04-30T01:00:00.000Z",
        }),
      ]),
    );
    expect(nextData.goals[0].twelveWeekSystem?.dailyCheckIns[0]).toEqual(
      expect.objectContaining({
        date: "2026-04-30",
        optionalNote: "Kept local note in first-party sync payload.",
      }),
    );
    expect(nextData.goals[0].twelveWeekSystem?.weeklyReviews[0]).toEqual(
      expect.objectContaining({
        weekNumber: 1,
        biggestOutputThisWeek: "Draft completed",
        nextWeekPriority: "Interview users",
      }),
    );
  });

  it("does not sync billing or analytics state from pulled workspace", () => {
    const userData = createUserData();
    const nextData = applyPulledWorkspaceToUserData(userData, createWorkspace(), { now: baseNow });

    expect(nextData.eventLog).toBe(userData.eventLog);
    expect(nextData.subscription).toBe(userData.subscription);
    expect(nextData.entitlements).toBe(userData.entitlements);
  });

  it("does not mutate input user data", () => {
    const userData = createUserData();
    const before = JSON.parse(JSON.stringify(userData)) as UserData;

    applyPulledWorkspaceToUserData(userData, createWorkspace(), { now: baseNow });

    expect(userData).toEqual(before);
  });

  it("applies an incremental task delta to the existing local 12-week system", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({
      tasks: [
        {
          id: "backend_task_1",
          weekId: "backend_week_1",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          clientTaskId: "tw_task_1_tactic_write_0",
          weekNumber: 1,
          title: "Write",
          status: "todo",
          scheduledDate: "2026-04-27",
          leadIndicatorName: "Write",
          tacticId: "tactic_write",
          isCore: true,
        },
      ],
    });

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });
    const task = nextData.goals[0].twelveWeekSystem?.taskInstances.find(
      (item) => item.id === "tw_task_1_tactic_write_0",
    );

    expect(task?.completed).toBe(false);
    expect(task?.completedAt).toBeUndefined();
    expect(nextData.goals[0].twelveWeekSystem?.dailyCheckIns).toHaveLength(1);
  });

  it("applies supported incremental tombstones without clearing unrelated local data", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({});
    delta.tombstones.tasks = [
      {
        id: "backend_task_1",
        clientId: "tw_task_1_tactic_write_0",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });

    expect(
      nextData.goals[0].twelveWeekSystem?.taskInstances.some((task) => task.id === "tw_task_1_tactic_write_0"),
    ).toBe(false);
    expect(nextData.goals[0].twelveWeekSystem?.dailyCheckIns).toHaveLength(1);
    expect(nextData.eventLog).toBe(userData.eventLog);
  });
});
