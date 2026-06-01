import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import type { PlanDetails } from "@/types/plan";
import { detectBackendPlanConflicts } from "./backendConflictDetector";

function createSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project",
    vision12Week: "Ship a reliable sync flow",
    lagMetric: {
      name: "Progress",
      unit: "%",
      target: "100",
      currentValue: "25",
    },
    leadIndicators: [
      {
        id: "tactic_brief",
        name: "Write launch brief",
        target: "1",
        unit: "task/week",
        type: "core",
        priority: 1,
        schedule: [1],
      },
    ],
    milestones: {
      week4: "",
      week8: "",
      week12: "Reliable sync verified",
    },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "Reliable sync verified",
    startDate: "2026-04-06",
    endDate: "2026-04-12",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 1,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Launch",
        focus: "Ship the launch brief",
        milestone: "Brief approved",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "local_task_1",
        weekNumber: 1,
        scheduledDate: "2026-04-07",
        title: "Write launch brief",
        leadIndicatorName: "Write launch brief",
        isCore: true,
        completed: true,
        tacticId: "tactic_brief",
      },
    ],
    dailyCheckIns: [
      {
        date: "2026-04-07",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Write launch brief",
        amountDone: "1 task",
        outputCreated: "Brief",
        obstacleOrIssue: "",
        dailySelfRating: 4,
        optionalNote: "",
        mood: "high",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "1/1",
        biggestOutputThisWeek: "Brief shipped",
        mainObstacle: "",
        nextWeekPriority: "Publish",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 9,
        disciplineScore: 9,
        focusScore: 9,
        improvementScore: 10,
        outputQualityScore: 9,
        completedLeadIndicators: 1,
      },
    ],
    scoreboard: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        mainMetricProgress: "1/1",
        outputDone: "Brief shipped",
        reviewDone: true,
        weeklyScore: 92,
      },
    ],
    ...overrides,
  };
}

function createPlanDetails(overrides: Partial<PlanDetails["weeks"][number]> = {}): PlanDetails {
  return {
    plan: {
      id: "plan_1",
      userId: "user_1",
      vision: "Ship a reliable sync flow",
      smartGoalId: "goal_1",
      startDate: "2026-04-06",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: "week_1",
        planId: "plan_1",
        weekNumber: 1,
        focus: "Ship the launch brief",
        expectedOutput: "Brief approved",
        review: {
          weekNumber: 1,
          executionScore: 92,
          reflection: "Brief shipped",
          adjustments: "Publish",
        },
        tasks: [
          {
            id: "remote_task_1",
            weekId: "week_1",
            title: "Write launch brief",
            status: "done",
            scheduledDate: "2026-04-07T00:00:00.000Z",
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-07T00:00:00.000Z",
          },
        ],
        metrics: [
          {
            id: "daily_metric_1",
            weekId: "week_1",
            name: "__daily_checkin__",
            weeklyTarget: 0,
            logs: [
              {
                id: "daily_log_1",
                date: "2026-04-07T00:00:00.000Z",
                value: 1,
                completed: true,
              },
            ],
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-07T00:00:00.000Z",
          },
        ],
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-07T00:00:00.000Z",
        ...overrides,
      },
    ],
  };
}

describe("detectBackendPlanConflicts", () => {
  it("returns no conflicts when local and backend execution state match", () => {
    const report = detectBackendPlanConflicts(createSystem(), createPlanDetails(), {
      local_task_1: "remote_task_1",
    });

    expect(report.hasConflicts).toBe(false);
    expect(report.conflicts).toHaveLength(0);
    expect(report.conflictCountByKind.task_completion).toBe(0);
  });

  it("detects divergent task, check-in, weekly plan, and review values", () => {
    const report = detectBackendPlanConflicts(
      createSystem(),
      createPlanDetails({
        focus: "Backend-only focus",
        expectedOutput: "Backend milestone",
        review: {
          weekNumber: 1,
          executionScore: 80,
          reflection: "Backend output",
          adjustments: "Backend priority",
        },
        tasks: [
          {
            id: "remote_task_1",
            weekId: "week_1",
            title: "Backend launch brief",
            status: "todo",
            scheduledDate: "2026-04-08T00:00:00.000Z",
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z",
          },
        ],
        metrics: [
          {
            id: "daily_metric_1",
            weekId: "week_1",
            name: "__daily_checkin__",
            weeklyTarget: 0,
            logs: [
              {
                id: "daily_log_1",
                date: "2026-04-07T00:00:00.000Z",
                value: 0,
                completed: false,
              },
            ],
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      }),
      {
        local_task_1: "remote_task_1",
      },
    );

    expect(report.hasConflicts).toBe(true);
    expect(report.conflicts.map((conflict) => conflict.kind)).toEqual(
      expect.arrayContaining([
        "weekly_focus",
        "weekly_milestone",
        "task_completion",
        "task_title",
        "task_schedule",
        "daily_checkin",
        "weekly_review_output",
        "weekly_review_priority",
        "weekly_review_score",
      ]),
    );
    expect(report.conflictCountByKind.task_completion).toBe(1);
    expect(report.conflictCountByKind.daily_checkin).toBe(1);
  });

  it("flags a local task whose linked backend task no longer exists", () => {
    const report = detectBackendPlanConflicts(
      createSystem(),
      createPlanDetails({
        tasks: [],
      }),
      {
        local_task_1: "missing_remote_task",
      },
    );

    expect(report.conflicts).toEqual([
      expect.objectContaining({
        kind: "linked_task_missing_backend",
        localId: "local_task_1",
        backendId: "missing_remote_task",
      }),
    ]);
  });

  it("does not flag merge-safe backend additions when local fields are empty", () => {
    const report = detectBackendPlanConflicts(
      createSystem({
        weeklyPlans: [{ weekNumber: 1, phaseName: "Launch", focus: "", milestone: "", completed: false }],
        taskInstances: [],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: [],
      }),
      createPlanDetails(),
    );

    expect(report.hasConflicts).toBe(false);
  });
});
