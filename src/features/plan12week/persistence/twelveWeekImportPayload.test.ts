import { describe, expect, it } from "vitest";

import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { createTwelveWeekImportPayload } from "./twelveWeekImportPayload";

function buildSystem(): TwelveWeekSystem {
  return {
    goalType: "Project",
    vision12Week: "Ship MVP 2 sync foundation",
    templateId: "template_focus",
    templateName: "Focus sprint",
    lagMetric: {
      name: "Launch readiness",
      unit: "%",
      target: "100",
      currentValue: "25",
    },
    leadIndicators: [
      {
        id: "tactic_launch_brief",
        name: "Write launch brief",
        target: "2",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3],
      },
      {
        id: "tactic_user_calls",
        name: "User calls",
        target: "1",
        unit: "call/week",
        type: "optional",
        priority: 2,
        schedule: [5],
      },
    ],
    milestones: {
      week4: "Prototype stable",
      week8: "Beta testers active",
      week12: "Public beta ready",
    },
    successEvidence: "A tester can restore the workspace safely.",
    reviewDay: "Sunday",
    week12Outcome: "Public beta ready",
    weeklyActions: ["Write", "Test", "Review"],
    successMetric: "Five testers complete one week.",
    startDate: "2026-04-06",
    endDate: "2026-04-19",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    preferredDays: [1, 3, 5],
    personalConstraint: "time",
    reentryCount: 1,
    currentWeek: 2,
    totalWeeks: 2,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Foundation",
        focus: "Build import payload",
        milestone: "Serializer tested",
        completed: true,
      },
      {
        weekNumber: 2,
        phaseName: "Validation",
        focus: "Use payload in import design",
        milestone: "Backend-ready contract",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "task_launch_brief_1",
        weekNumber: 1,
        scheduledDate: "2026-04-07",
        title: "Write launch brief",
        leadIndicatorName: "Write launch brief",
        isCore: true,
        completed: true,
        completedAt: "2026-04-07T10:00:00.000Z",
        tacticId: "tactic_launch_brief",
      },
      {
        id: "task_user_call_1",
        weekNumber: 2,
        scheduledDate: "2026-04-15",
        title: "Run user call",
        leadIndicatorName: "User calls",
        isCore: false,
        completed: false,
        tacticId: "tactic_user_calls",
        rescheduledFrom: "2026-04-14",
      },
    ],
    dailyCheckIns: [
      {
        date: "2026-04-07",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Write launch brief",
        amountDone: "90 minutes",
        outputCreated: "Payload outline",
        obstacleOrIssue: "None",
        dailySelfRating: 4,
        optionalNote: "Preserve this local note.",
        mood: "high",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "50%",
        biggestOutputThisWeek: "Serializer draft",
        mainObstacle: "Backend spec is still moving",
        nextWeekPriority: "Wire import endpoint later",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 8,
        disciplineScore: 8,
        focusScore: 8,
        improvementScore: 7,
        outputQualityScore: 8,
        completedLeadIndicators: 2,
      },
    ],
    scoreboard: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        mainMetricProgress: "50%",
        outputDone: "Serializer draft",
        reviewDone: true,
        weeklyScore: 92,
      },
    ],
  };
}

function buildGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal_mvp2_sync",
    category: "Product",
    title: "MVP 2 cloud sync",
    description: "Prepare reliable local-first sync.",
    deadline: "2026-04-30",
    tasks: [{ id: "onboarding_task_1", title: "Define sync contract", completed: true }],
    focusArea: "Product",
    readinessScore: 18,
    twelveWeekSystem: buildSystem(),
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("createTwelveWeekImportPayload", () => {
  it("returns null when a goal has no twelve-week system", () => {
    const payload = createTwelveWeekImportPayload(buildGoal({ twelveWeekSystem: undefined }));

    expect(payload).toBeNull();
  });

  it("creates a stable import payload for a complete local system", () => {
    const payload = createTwelveWeekImportPayload(buildGoal());

    expect(payload).toEqual(
      expect.objectContaining({
        clientGoalId: "goal_mvp2_sync",
        title: "MVP 2 cloud sync",
        category: "Product",
        description: "Prepare reliable local-first sync.",
        deadline: "2026-04-30",
        status: "active",
        focusArea: "Product",
        readinessScore: 18,
      }),
    );
    expect(payload?.tasks).toEqual([{ title: "Define sync contract", completed: true }]);
    expect(payload?.plan).toEqual(
      expect.objectContaining({
        clientPlanId: "goal_mvp2_sync:12-week-system",
        clientGoalId: "goal_mvp2_sync",
        vision: "Ship MVP 2 sync foundation",
        startDate: "2026-04-06",
        endDate: "2026-04-19",
        timezone: "Asia/Ho_Chi_Minh",
        weekStartsOn: "Monday",
        totalWeeks: 2,
        templateId: "template_focus",
        templateName: "Focus sprint",
      }),
    );
    expect(payload?.plan.leadIndicators[0]).toEqual(
      expect.objectContaining({
        id: "tactic_launch_brief",
        leadIndicatorId: "tactic_launch_brief",
        name: "Write launch brief",
        target: "2",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3],
      }),
    );
    expect(payload?.plan.weeks[0]).toEqual(
      expect.objectContaining({
        clientWeekId: "goal_mvp2_sync:week:1",
        clientPlanId: "goal_mvp2_sync:12-week-system",
        weekNumber: 1,
        phaseName: "Foundation",
        focus: "Build import payload",
        expectedOutput: "Serializer tested",
        completed: true,
      }),
    );
    expect(payload?.plan.tasks[0]).toEqual(
      expect.objectContaining({
        clientTaskId: "task_launch_brief_1",
        clientPlanId: "goal_mvp2_sync:12-week-system",
        clientWeekId: "goal_mvp2_sync:week:1",
        weekNumber: 1,
        title: "Write launch brief",
        status: "done",
        scheduledDate: "2026-04-07",
        completedAt: "2026-04-07T10:00:00.000Z",
        tacticId: "tactic_launch_brief",
      }),
    );
    expect(payload?.plan.leadMetrics).toHaveLength(4);
    expect(payload?.plan.leadMetrics[0]).toEqual(
      expect.objectContaining({
        clientMetricId: "goal_mvp2_sync:week:1:metric:tactic_launch_brief",
        clientWeekId: "goal_mvp2_sync:week:1",
        leadIndicatorId: "tactic_launch_brief",
        weekNumber: 1,
        weeklyTarget: 2,
      }),
    );
  });

  it("preserves daily check-in fields", () => {
    const payload = createTwelveWeekImportPayload(buildGoal());
    const checkIn = payload?.plan.dailyCheckIns[0];

    expect(checkIn).toEqual(
      expect.objectContaining({
        clientCheckInId: "goal_mvp2_sync:12-week-system:checkin:2026-04-07",
        clientGoalId: "goal_mvp2_sync",
        clientPlanId: "goal_mvp2_sync:12-week-system",
        clientWeekId: "goal_mvp2_sync:week:1",
        localDate: "2026-04-07",
        weekNumber: 1,
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Write launch brief",
        amountDone: "90 minutes",
        outputCreated: "Payload outline",
        obstacleOrIssue: "None",
        dailySelfRating: 4,
        optionalNote: "Preserve this local note.",
        mood: "high",
      }),
    );
  });

  it("preserves weekly review fields and adds an execution score", () => {
    const payload = createTwelveWeekImportPayload(buildGoal());
    const review = payload?.plan.weeklyReviews[0];

    expect(review).toEqual(
      expect.objectContaining({
        clientReviewId: "goal_mvp2_sync:12-week-system:review:1",
        clientGoalId: "goal_mvp2_sync",
        clientPlanId: "goal_mvp2_sync:12-week-system",
        clientWeekId: "goal_mvp2_sync:week:1",
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "50%",
        biggestOutputThisWeek: "Serializer draft",
        mainObstacle: "Backend spec is still moving",
        nextWeekPriority: "Wire import endpoint later",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 8,
        disciplineScore: 8,
        focusScore: 8,
        improvementScore: 7,
        outputQualityScore: 8,
        completedLeadIndicators: 2,
        executionScore: 100,
      }),
    );
  });

  it("returns the same client ids for repeated calls with the same local ids", () => {
    const goal = buildGoal();
    const firstPayload = createTwelveWeekImportPayload(goal);
    const secondPayload = createTwelveWeekImportPayload(goal);

    expect(secondPayload).toEqual(firstPayload);
    expect(firstPayload?.plan.tasks.map((task) => task.clientTaskId)).toEqual([
      "task_launch_brief_1",
      "task_user_call_1",
    ]);
    expect(firstPayload?.plan.weeks.map((week) => week.clientWeekId)).toEqual([
      "goal_mvp2_sync:week:1",
      "goal_mvp2_sync:week:2",
    ]);
  });

  it("does not leak analytics, billing, or browser-local fields", () => {
    const leakyGoal = {
      ...buildGoal(),
      eventLog: [{ type: "analytics_event", metadata: { raw: "do not send" } }],
      syncOutbox: [{ payloadSummary: "analytics outbox" }],
      subscription: { planCode: "PLUS" },
      entitlements: [{ key: "premium_templates" }],
      pushSubscription: { endpoint: "browser push endpoint" },
      mockCheckoutState: { sessionId: "mock_session" },
    } as Goal & Record<string, unknown>;

    const serializedPayload = JSON.stringify(createTwelveWeekImportPayload(leakyGoal));

    expect(serializedPayload).not.toContain("eventLog");
    expect(serializedPayload).not.toContain("syncOutbox");
    expect(serializedPayload).not.toContain("subscription");
    expect(serializedPayload).not.toContain("entitlements");
    expect(serializedPayload).not.toContain("pushSubscription");
    expect(serializedPayload).not.toContain("mockCheckoutState");
    expect(serializedPayload).not.toContain("do not send");
    expect(serializedPayload).not.toContain("mock_session");
  });
});
