import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserData } from "@/app/utils/storage-types";
import type { TwelveWeekPulledWorkspace, TwelveWeekPullResponse } from "@/services/syncService";
import { applyPulledWorkspaceToUserData } from "./pulledWorkspaceApply";

const baseNow = "2026-04-30T00:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(baseNow));
});

afterEach(() => {
  vi.useRealTimers();
});

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
        endDate: "2026-07-19",
        timezone: "Asia/Saigon",
        weekStartsOn: "Sunday",
        totalWeeks: 12,
        status: "paused",
        goalType: "Product",
        templateId: "template_launch",
        templateName: "Launch Sprint",
        lagMetric: {
          name: "Launch readiness",
          unit: "%",
          target: "100",
          currentValue: "25",
        },
        milestones: {
          week4: "Prototype validated",
          week8: "Beta cohort active",
          week12: "Public launch ready",
        },
        successEvidence: "Three users finish one cycle.",
        reviewDay: "Friday",
        week12Outcome: "Launch with restored cross-device plan metadata.",
        weeklyActions: ["Write", "Interview", "Ship"],
        successMetric: "5 active testers",
        dailyReminderTime: "20:30",
        tacticLoadPreference: "lighter",
        preferredDays: [2, 4, 6],
        personalConstraint: "time",
        reentryCount: 2,
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
    expect(nextData.goals[0].twelveWeekSystem).toEqual(
      expect.objectContaining({
        goalType: "Product",
        templateId: "template_launch",
        templateName: "Launch Sprint",
        lagMetric: {
          name: "Launch readiness",
          unit: "%",
          target: "100",
          currentValue: "25",
        },
        milestones: {
          week4: "Prototype validated",
          week8: "Beta cohort active",
          week12: "Public launch ready",
        },
        successEvidence: "Three users finish one cycle.",
        reviewDay: "Friday",
        week12Outcome: "Launch with restored cross-device plan metadata.",
        weeklyActions: ["Write", "Interview", "Ship"],
        successMetric: "5 active testers",
        endDate: "2026-07-19",
        timezone: "Asia/Saigon",
        weekStartsOn: "Sunday",
        status: "paused",
        dailyReminderTime: "20:30",
        tacticLoadPreference: "lighter",
        preferredDays: [2, 4, 6],
        personalConstraint: "time",
        reentryCount: 2,
      }),
    );
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
          syncUpdatedAt: "2026-04-30T02:00:00.000Z",
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
    expect(task?.lastModifiedAt).toBe(Date.parse("2026-04-30T02:00:00.000Z"));
    expect(nextData.goals[0].twelveWeekSystem?.dailyCheckIns).toHaveLength(1);
  });

  it("applies incremental goal, plan, week, and lead metric deltas without clearing local execution", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({
      goals: [
        {
          id: "backend_goal_1",
          clientGoalId: "goal_1",
          title: "Launch public beta",
          category: "Business",
          description: "Updated from another signed-in device.",
          deadline: "2026-08-01",
          status: "active",
          focusArea: "Business",
          readinessScore: 21,
        },
      ],
      plans: [
        {
          id: "backend_plan_1",
          clientGoalId: "goal_1",
          clientPlanId: "goal_1:12-week-system",
          vision: "Launch public beta with proof",
          startDate: "2026-05-04",
          endDate: "2026-07-26",
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          totalWeeks: 12,
          status: "active",
          goalType: "Business",
          templateId: "template_public_beta",
          templateName: "Public Beta Sprint",
          lagMetric: {
            name: "Beta readiness",
            unit: "%",
            target: "100",
            currentValue: "40",
          },
          milestones: {
            week4: "Beta waitlist ready",
            week8: "First payments tested",
            week12: "Launch decision",
          },
          successEvidence: "A user can restore the updated beta plan.",
          reviewDay: "Saturday",
          week12Outcome: "Public beta decision is made.",
          weeklyActions: ["Interview", "Ship", "Measure"],
          successMetric: "10 beta users",
          dailyReminderTime: "21:00",
          tacticLoadPreference: "balanced",
          preferredDays: [1, 3, 5],
          personalConstraint: "motivation",
          reentryCount: 3,
        },
      ],
      weeks: [
        {
          id: "backend_week_1",
          planId: "backend_plan_1",
          clientPlanId: "goal_1:12-week-system",
          clientWeekId: "goal_1:week:1",
          weekNumber: 1,
          focus: "Update positioning",
          expectedOutput: "New beta landing copy",
          review: { weekNumber: 1, executionScore: 8, reflection: "Done", adjustments: "" },
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
          name: "Write beta copy",
          weeklyTarget: 3,
          unit: "session/week",
          type: "core",
          priority: 1,
          schedule: [1, 3, 5],
          logs: [],
        },
      ],
    });

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });
    const nextGoal = nextData.goals[0];
    const system = nextGoal.twelveWeekSystem;

    expect(nextGoal).toEqual(
      expect.objectContaining({
        title: "Launch public beta",
        category: "Business",
        description: "Updated from another signed-in device.",
        deadline: "2026-08-01",
        focusArea: "Business",
        readinessScore: 21,
      }),
    );
    expect(system).toEqual(
      expect.objectContaining({
        vision12Week: "Launch public beta with proof",
        templateId: "template_public_beta",
        templateName: "Public Beta Sprint",
        lagMetric: {
          name: "Beta readiness",
          unit: "%",
          target: "100",
          currentValue: "40",
        },
        milestones: {
          week4: "Beta waitlist ready",
          week8: "First payments tested",
          week12: "Launch decision",
        },
        successEvidence: "A user can restore the updated beta plan.",
        reviewDay: "Saturday",
        week12Outcome: "Public beta decision is made.",
        weeklyActions: ["Interview", "Ship", "Measure"],
        successMetric: "10 beta users",
        startDate: "2026-05-04",
        endDate: "2026-07-26",
        timezone: "Asia/Ho_Chi_Minh",
        weekStartsOn: "Monday",
        status: "active",
        dailyReminderTime: "21:00",
        tacticLoadPreference: "balanced",
        preferredDays: [1, 3, 5],
        personalConstraint: "motivation",
        reentryCount: 3,
      }),
    );
    expect(system?.weeklyPlans.find((week) => week.weekNumber === 1)).toEqual(
      expect.objectContaining({
        focus: "Update positioning",
        milestone: "New beta landing copy",
        completed: true,
      }),
    );
    expect(system?.leadIndicators.find((indicator) => indicator.id === "tactic_write")).toEqual(
      expect.objectContaining({
        name: "Write beta copy",
        target: "3",
        unit: "session/week",
        type: "core",
        priority: 1,
        schedule: [1, 3, 5],
      }),
    );
    expect(system?.taskInstances.some((task) => task.id === "tw_task_1_tactic_write_0")).toBe(true);
    expect(system?.dailyCheckIns).toHaveLength(1);
    expect(system?.weeklyReviews).toHaveLength(1);
    expect(nextData.eventLog).toBe(userData.eventLog);
  });

  it("respects skipEntities during full pull for local-winning execution and setup records", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const localGoal = userData.goals[0];
    const localSystem = localGoal.twelveWeekSystem;
    expect(localSystem).toBeDefined();

    if (!localSystem) {
      throw new Error("Expected seeded twelveWeekSystem");
    }

    localSystem.weeklyPlans = localSystem.weeklyPlans.map((week) =>
      week.weekNumber === 1
        ? {
            ...week,
            focus: "Keep local week focus",
            milestone: "Keep local expected output",
            completed: false,
          }
        : week,
    );
    localSystem.taskInstances = localSystem.taskInstances.map((task) =>
      task.id === "tw_task_1_tactic_write_0"
        ? {
            ...task,
            completed: false,
            completedAt: undefined,
            title: "Keep local task title",
          }
        : task,
    );
    localSystem.dailyCheckIns = localSystem.dailyCheckIns.map((checkIn) =>
      checkIn.date === "2026-04-30"
        ? {
            ...checkIn,
            optionalNote: "Keep local check-in note",
          }
        : checkIn,
    );
    localSystem.weeklyReviews = localSystem.weeklyReviews.map((review) =>
      review.weekNumber === 1
        ? {
            ...review,
            nextWeekPriority: "Keep local weekly review priority",
            biggestOutputThisWeek: "Keep local weekly output",
          }
        : review,
    );
    localSystem.leadIndicators = localSystem.leadIndicators.map((indicator) =>
      indicator.id === "tactic_write"
        ? {
            ...indicator,
            name: "Keep local lead indicator",
            target: "9",
          }
        : indicator,
    );

    const fullPull = createDeltaResponse(createWorkspace());
    fullPull.mode = "full";

    const nextData = applyPulledWorkspaceToUserData(userData, fullPull, {
      now: baseNow,
      skipEntities: new Set([
        "week:goal_1:week:1",
        "task:tw_task_1_tactic_write_0",
        "dailyCheckIn:goal_1:12-week-system:checkin:2026-04-30",
        "weeklyReview:goal_1:12-week-system:review:1",
        "leadMetric:goal_1:week:1:metric:tactic_write",
      ]),
    });

    const system = nextData.goals[0].twelveWeekSystem;
    expect(system?.weeklyPlans.find((week) => week.weekNumber === 1)).toEqual(
      expect.objectContaining({
        focus: "Keep local week focus",
        milestone: "Keep local expected output",
        completed: false,
      }),
    );
    expect(system?.taskInstances.find((task) => task.id === "tw_task_1_tactic_write_0")).toEqual(
      expect.objectContaining({
        title: "Keep local task title",
        completed: false,
        completedAt: undefined,
      }),
    );
    expect(system?.dailyCheckIns.find((checkIn) => checkIn.date === "2026-04-30")).toEqual(
      expect.objectContaining({
        optionalNote: "Keep local check-in note",
      }),
    );
    expect(system?.weeklyReviews.find((review) => review.weekNumber === 1)).toEqual(
      expect.objectContaining({
        nextWeekPriority: "Keep local weekly review priority",
        biggestOutputThisWeek: "Keep local weekly output",
      }),
    );
    expect(system?.leadIndicators.find((indicator) => indicator.id === "tactic_write")).toEqual(
      expect.objectContaining({
        name: "Keep local lead indicator",
        target: "9",
      }),
    );
    expect(nextData.eventLog).toBe(userData.eventLog);
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

  it("applies week tombstones to week-level local execution records", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({});
    delta.tombstones.weeks = [
      {
        id: "backend_week_1",
        clientId: "goal_1:week:1",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });
    const system = nextData.goals[0].twelveWeekSystem;

    expect(system?.weeklyPlans.some((week) => week.weekNumber === 1)).toBe(false);
    expect(system?.taskInstances.some((task) => task.weekNumber === 1)).toBe(false);
    expect(system?.weeklyReviews.some((review) => review.weekNumber === 1)).toBe(false);
    expect(nextData.eventLog).toBe(userData.eventLog);
  });

  it("ignores lead metric tombstones without deleting derived local execution state", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({});
    delta.tombstones.leadMetrics = [
      {
        id: "backend_metric_1",
        clientId: "goal_1:week:1:metric:tactic_write",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });
    const system = nextData.goals[0].twelveWeekSystem;

    expect(system?.leadIndicators).toEqual(userData.goals[0].twelveWeekSystem?.leadIndicators);
    expect(system?.taskInstances.some((task) => task.id === "tw_task_1_tactic_write_0")).toBe(true);
    expect(system?.dailyCheckIns).toHaveLength(1);
    expect(nextData.eventLog).toBe(userData.eventLog);
  });

  it("removes a local goal when a goal tombstone is pulled", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({});
    delta.tombstones.goals = [
      {
        id: "backend_goal_1",
        clientId: "goal_1",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });

    expect(nextData.goals.some((goal) => goal.id === "goal_1")).toBe(false);
    expect(nextData.eventLog).toBe(userData.eventLog);
  });

  it("removes the local 12-week goal when a plan tombstone is pulled", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const delta = createDeltaResponse({});
    delta.tombstones.plans = [
      {
        id: "backend_plan_1",
        clientId: "goal_1:12-week-system",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, delta, { now: baseNow });

    expect(nextData.goals.some((goal) => goal.id === "goal_1")).toBe(false);
  });

  it("does not restore a local goal from full pull when the response includes its tombstone", () => {
    const userData = applyPulledWorkspaceToUserData(createUserData(), createWorkspace(), { now: baseNow });
    const response = createDeltaResponse(createWorkspace());
    response.mode = "full";
    response.tombstones.goals = [
      {
        id: "backend_goal_1",
        clientId: "goal_1",
        deletedAt: "2026-04-30T02:00:00.000Z",
      },
    ];

    const nextData = applyPulledWorkspaceToUserData(userData, response, { now: baseNow });

    expect(nextData.goals.some((goal) => goal.id === "goal_1")).toBe(false);
  });
});
