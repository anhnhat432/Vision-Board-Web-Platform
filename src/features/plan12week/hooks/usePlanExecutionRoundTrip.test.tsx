import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  shouldEnable12WeekMutationSync: () => true,
  shouldEnable12WeekPullSync: () => true,
  shouldEnable12WeekImportDryRun: () => true,
  shouldEnable12WeekCloudImport: () => true,
}));

const fakeBackend = vi.hoisted(() => {
  type TaskStatus = "todo" | "doing" | "done";

  interface FakePlan {
    id: string;
    userId: string;
    vision: string;
    smartGoalId?: string;
    startDate: string;
    createdAt: string;
    updatedAt: string;
  }

  interface FakeTask {
    id: string;
    weekId: string;
    title: string;
    status: TaskStatus;
    scheduledDate?: string;
    createdAt: string;
    updatedAt: string;
  }

  interface FakeMetricLog {
    id: string;
    date: string;
    value: number;
    completed: boolean;
  }

  interface FakeMetric {
    id: string;
    weekId: string;
    name: string;
    weeklyTarget: number;
    logs: FakeMetricLog[];
    createdAt: string;
    updatedAt: string;
  }

  interface FakeWeek {
    id: string;
    planId: string;
    weekNumber: number;
    focus: string;
    expectedOutput: string;
    review?: {
      weekNumber: number;
      executionScore: number;
      reflection?: string;
      adjustments?: string;
    };
    tasks: FakeTask[];
    metrics: FakeMetric[];
    createdAt: string;
    updatedAt: string;
  }

  const now = "2026-04-01T00:00:00.000Z";
  const state = {
    plans: [] as FakePlan[],
    weeksByPlanId: new Map<string, FakeWeek[]>(),
    apiGoals: [] as Array<{
      id: string;
      userId: string;
      title: string;
      category: string;
      description: string;
      deadline: string;
      status: "active" | "completed" | "archived";
      focusArea?: string;
      readinessScore?: number;
      tasks?: Array<{ title: string; completed: boolean }>;
      planId?: string;
      createdAt: string;
      updatedAt: string;
    }>,
    nextPlanId: 1,
    nextTaskId: 1,
    nextMetricId: 1,
    nextMetricLogId: 1,
  };

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function reset() {
    state.plans = [];
    state.weeksByPlanId = new Map();
    state.apiGoals = [];
    state.nextPlanId = 1;
    state.nextTaskId = 1;
    state.nextMetricId = 1;
    state.nextMetricLogId = 1;
  }

  function findWeek(weekId: string): FakeWeek {
    for (const weeks of state.weeksByPlanId.values()) {
      const week = weeks.find((item) => item.id === weekId);
      if (week) return week;
    }
    throw new Error(`Week ${weekId} was not found.`);
  }

  function findMetric(metricId: string): FakeMetric {
    for (const weeks of state.weeksByPlanId.values()) {
      for (const week of weeks) {
        const metric = week.metrics.find((item) => item.id === metricId);
        if (metric) return metric;
      }
    }
    throw new Error(`Metric ${metricId} was not found.`);
  }

  function findTask(taskId: string): FakeTask {
    for (const weeks of state.weeksByPlanId.values()) {
      for (const week of weeks) {
        const task = week.tasks.find((item) => item.id === taskId);
        if (task) return task;
      }
    }
    throw new Error(`Task ${taskId} was not found.`);
  }

  const getGoals = vi.fn(async () => clone(state.apiGoals));

  const createPlan = vi.fn(
    async (payload: {
      vision?: string;
      smartGoalId?: string;
      startDate?: string;
      initializeWeeks?: boolean;
      totalWeeks?: number;
    }) => {
      const plan: FakePlan = {
        id: `plan_${state.nextPlanId}`,
        userId: "user_1",
        vision: payload.vision ?? "",
        smartGoalId: payload.smartGoalId,
        startDate: payload.startDate ?? now,
        createdAt: now,
        updatedAt: now,
      };
      state.nextPlanId += 1;
      state.plans.push(plan);

      if (payload.initializeWeeks) {
        const totalWeeks = Math.max(payload.totalWeeks ?? 12, 1);
        state.weeksByPlanId.set(
          plan.id,
          Array.from({ length: totalWeeks }, (_, index) => ({
            id: `week_${index + 1}`,
            planId: plan.id,
            weekNumber: index + 1,
            focus: "",
            expectedOutput: "",
            tasks: [],
            metrics: [],
            createdAt: now,
            updatedAt: now,
          })),
        );
      }

      return clone(plan);
    },
  );

  const getPlans = vi.fn(async () => clone(state.plans));

  const getPlan = vi.fn(async (planId: string) => {
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan) throw new Error(`Plan ${planId} was not found.`);
    return clone({
      plan,
      weeks: state.weeksByPlanId.get(planId) ?? [],
    });
  });

  const updateWeek = vi.fn(async (weekId: string, payload: { focus?: string; expectedOutput?: string }) => {
    const week = findWeek(weekId);
    week.focus = payload.focus ?? week.focus;
    week.expectedOutput = payload.expectedOutput ?? week.expectedOutput;
    week.updatedAt = now;
    return clone(week);
  });

  const updateWeekReview = vi.fn(
    async (
      weekId: string,
      payload: {
        weekNumber: number;
        executionScore: number;
        reflection?: string;
        adjustments?: string;
      },
    ) => {
      const week = findWeek(weekId);
      week.review = {
        weekNumber: payload.weekNumber,
        executionScore: payload.executionScore,
        reflection: payload.reflection,
        adjustments: payload.adjustments,
      };
      week.updatedAt = now;
      return clone(week);
    },
  );

  const addTask = vi.fn(
    async (weekId: string, payload: { title: string; status?: TaskStatus; scheduledDate?: string }) => {
      const week = findWeek(weekId);
      const task: FakeTask = {
        id: `task_${state.nextTaskId}`,
        weekId,
        title: payload.title,
        status: payload.status ?? "todo",
        scheduledDate: payload.scheduledDate,
        createdAt: now,
        updatedAt: now,
      };
      state.nextTaskId += 1;
      week.tasks.push(task);
      return clone(task);
    },
  );

  const updateTask = vi.fn(
    async (taskId: string, payload: { title?: string; status?: TaskStatus; scheduledDate?: string }) => {
      const task = findTask(taskId);
      task.title = payload.title ?? task.title;
      task.status = payload.status ?? task.status;
      task.scheduledDate = payload.scheduledDate ?? task.scheduledDate;
      task.updatedAt = now;
      return clone(task);
    },
  );

  const getMetrics = vi.fn(async (weekId: string) => clone(findWeek(weekId).metrics));

  const createMetric = vi.fn(async (weekId: string, payload: { name: string; weeklyTarget: number }) => {
    const week = findWeek(weekId);
    const metric: FakeMetric = {
      id: `metric_${state.nextMetricId}`,
      weekId,
      name: payload.name,
      weeklyTarget: payload.weeklyTarget,
      logs: [],
      createdAt: now,
      updatedAt: now,
    };
    state.nextMetricId += 1;
    week.metrics.push(metric);
    return clone(metric);
  });

  const logMetric = vi.fn(async (metricId: string, payload: { date: string; value: number; completed: boolean }) => {
    const metric = findMetric(metricId);
    metric.logs.push({
      id: `metric_log_${state.nextMetricLogId}`,
      date: payload.date,
      value: payload.value,
      completed: payload.completed,
    });
    state.nextMetricLogId += 1;
    metric.updatedAt = now;
    return clone(metric);
  });

  const updateMetricLog = vi.fn(
    async (metricId: string, logId: string, payload: { date?: string; value?: number; completed?: boolean }) => {
      const metric = findMetric(metricId);
      const log = metric.logs.find((item) => item.id === logId);
      if (!log) throw new Error(`Metric log ${logId} was not found.`);
      log.date = payload.date ?? log.date;
      log.value = payload.value ?? log.value;
      log.completed = payload.completed ?? log.completed;
      metric.updatedAt = now;
      return clone(metric);
    },
  );

  return {
    state,
    reset,
    getGoals,
    createPlan,
    getPlans,
    getPlan,
    updateWeek,
    updateWeekReview,
    addTask,
    updateTask,
    getMetrics,
    createMetric,
    logMetric,
    updateMetricLog,
  };
});

vi.mock("@/services/goalService", () => ({
  getGoals: fakeBackend.getGoals,
}));

vi.mock("@/services/metricService", () => ({
  createMetric: fakeBackend.createMetric,
  getMetrics: fakeBackend.getMetrics,
  logMetric: fakeBackend.logMetric,
  updateMetricLog: fakeBackend.updateMetricLog,
}));

vi.mock("@/services/planService", () => ({
  createPlan: fakeBackend.createPlan,
  getPlan: fakeBackend.getPlan,
  getPlans: fakeBackend.getPlans,
  bulkSyncPlan: vi.fn().mockRejectedValue({
    status: 404,
    message: "Endpoint not found",
  }),
}));

vi.mock("@/services/taskService", () => ({
  addTask: fakeBackend.addTask,
  updateTask: fakeBackend.updateTask,
}));

vi.mock("@/services/weekService", () => ({
  updateWeek: fakeBackend.updateWeek,
  updateWeekReview: fakeBackend.updateWeekReview,
}));

import { hydrateTwelveWeekPlansFromBackend } from "@/app/hooks/useBackendPlanHydration";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "@/app/utils/storage";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import { getPlanLink } from "../persistence/planLinkStore";
import { usePlanExecutionSync } from "./usePlanExecutionSync";

function resetLocalUserData(): void {
  localStorage.clear();
  const data = getUserData();
  saveUserData({
    ...data,
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    subscription: null,
    entitlements: [],
    onboardingCompleted: false,
    isHydratedFromDemo: false,
  });
}

function buildRoundTripSystem(): TwelveWeekSystem {
  return {
    goalType: "Project",
    vision12Week: "Ship a round-trip sync flow",
    lagMetric: { name: "Launch readiness", unit: "%", target: "100", currentValue: "20" },
    leadIndicators: [
      {
        id: "tactic_launch_brief",
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
      week12: "Round-trip sync verified",
    },
    successEvidence: "A fresh device can restore the active cycle.",
    reviewDay: "Sunday",
    week12Outcome: "Round-trip sync verified",
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
        completedAt: "2026-04-07T10:00:00.000Z",
        tacticId: "tactic_launch_brief",
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
        optionalNote: "Kept the launch plan moving.",
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
        progressScore: 8,
        disciplineScore: 8,
        focusScore: 8,
        improvementScore: 7,
        outputQualityScore: 8,
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
  };
}

describe("12-week backend sync round trip", () => {
  beforeEach(() => {
    resetLocalUserData();
    fakeBackend.reset();
    vi.clearAllMocks();
  });

  it("pushes local execution data, restores it on a fresh device, and avoids duplicates", async () => {
    const system = buildRoundTripSystem();
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_roundtrip", system }));

    await act(async () => {
      const snapshot = await result.current.actions.syncLocalSnapshot({ system });
      expect(snapshot.status).toBe("success");
    });

    const backendPlan = fakeBackend.state.plans[0];
    expect(backendPlan?.smartGoalId).toBe("goal_roundtrip");
    expect(backendPlan?.id).toBe("plan_1");

    const backendDetails = await fakeBackend.getPlan("plan_1");
    const backendWeek = backendDetails.weeks[0];
    expect(backendWeek?.focus).toBe("Ship the launch brief");
    expect(backendWeek?.tasks[0]).toEqual(
      expect.objectContaining({
        title: "Write launch brief",
        status: "done",
      }),
    );
    expect(backendWeek?.metrics.some((metric) => metric.name === DAILY_CHECKIN_METRIC_NAME)).toBe(true);
    expect(backendWeek?.review).toEqual(
      expect.objectContaining({
        executionScore: 100,
        reflection: "Brief shipped",
        adjustments: "Publish",
      }),
    );

    fakeBackend.state.apiGoals = [
      {
        id: "remote_goal_1",
        userId: "user_1",
        title: "Round-trip launch goal",
        category: "Career",
        description: "Goal restored from backend.",
        deadline: "2026-04-12",
        status: "active",
        focusArea: "Career",
        readinessScore: 18,
        tasks: [{ title: "Write launch brief", completed: true }],
        planId: "plan_1",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ];

    resetLocalUserData();

    const hydrateResult = await hydrateTwelveWeekPlansFromBackend();
    expect(hydrateResult.status).toBe("success");
    expect(hydrateResult.hydratedCount).toBe(1);

    const restoredData = getUserData();
    expect(restoredData.onboardingCompleted).toBe(true);
    expect(restoredData.goals).toHaveLength(1);
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe("goal_roundtrip");

    const restoredGoal = restoredData.goals[0];
    const restoredSystem = restoredGoal?.twelveWeekSystem;
    expect(restoredGoal?.id).toBe("goal_roundtrip");
    expect(restoredSystem?.weeklyPlans[0]?.focus).toBe("Ship the launch brief");
    expect(restoredSystem?.dailyCheckIns[0]?.didWorkToday).toBe(true);
    expect(restoredSystem?.weeklyReviews[0]?.reviewCompleted).toBe(true);
    expect(restoredSystem?.weeklyReviews[0]?.biggestOutputThisWeek).toBe("Brief shipped");

    const restoredTask = restoredSystem?.taskInstances.find((task) => task.title === "Write launch brief");
    expect(restoredTask?.completed).toBe(true);

    const restoredLink = getPlanLink("goal_roundtrip");
    expect(restoredLink?.planId).toBe("plan_1");
    expect(restoredTask ? restoredLink?.taskIdByLocalTaskId[restoredTask.id] : null).toBe("task_1");

    const secondHydrateResult = await hydrateTwelveWeekPlansFromBackend();
    expect(secondHydrateResult.status).toBe("idle");
    expect(secondHydrateResult.skippedCount).toBe(1);
    expect(getUserData().goals).toHaveLength(1);
  });
});
