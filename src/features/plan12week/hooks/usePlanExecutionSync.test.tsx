import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createMetric,
  createPlan,
  getPlan,
  getPlans,
  getMetrics,
  logMetric,
  updateMetricLog,
  addTask,
  toggleTask,
  updateTask,
  updateWeek,
  updateWeekReview,
  getMetricIdForGoal,
  getPlanLink,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  savePlanDetailsLink,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
  bulkSyncPlan,
  shouldEnableMutationSync,
} = vi.hoisted(() => ({
  createMetric: vi.fn(),
  createPlan: vi.fn(),
  getPlan: vi.fn(),
  getPlans: vi.fn(),
  getMetrics: vi.fn(),
  logMetric: vi.fn(),
  updateMetricLog: vi.fn(),
  addTask: vi.fn(),
  toggleTask: vi.fn(),
  updateTask: vi.fn(),
  updateWeek: vi.fn(),
  updateWeekReview: vi.fn(),
  getMetricIdForGoal: vi.fn(),
  getPlanLink: vi.fn(),
  getRemoteTaskIdForGoal: vi.fn(),
  getWeekIdForGoal: vi.fn(),
  savePlanDetailsLink: vi.fn(),
  setMetricIdForGoal: vi.fn(),
  setRemoteTaskIdForGoal: vi.fn(),
  bulkSyncPlan: vi.fn().mockRejectedValue({
    status: 404,
    message: "Endpoint not found",
  }),
  shouldEnableMutationSync: vi.fn(() => false),
}));

vi.mock("@/services/metricService", () => ({
  createMetric,
  getMetrics,
  logMetric,
  updateMetricLog,
}));

vi.mock("@/services/planService", () => ({
  createPlan,
  getPlan,
  getPlans,
  bulkSyncPlan,
}));

vi.mock("@/services/taskService", () => ({
  addTask,
  updateTask,
  toggleTask,
}));

vi.mock("@/services/weekService", () => ({
  updateWeek,
  updateWeekReview,
}));

vi.mock("../persistence/planLinkStore", () => ({
  getMetricIdForGoal,
  getPlanLink,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  savePlanDetailsLink,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
  getTaskRemoteRevision: vi.fn().mockReturnValue(undefined),
  getWeekRemoteRevision: vi.fn().mockReturnValue(undefined),
  updateTaskRevisionInLink: vi.fn(),
  updateWeekRevisionInLink: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  shouldEnable12WeekMutationSync: shouldEnableMutationSync,
  shouldEnable12WeekPullSync: () => true,
  shouldEnable12WeekImportDryRun: () => true,
  shouldEnable12WeekCloudImport: () => true,
}));

import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import { detectBackendPlanConflicts } from "../persistence/backendConflictDetector";
import { usePlanExecutionSync } from "./usePlanExecutionSync";

function buildPlanDetails() {
  return {
    plan: {
      id: "plan_1",
      userId: "user_1",
      vision: "Ship the product",
      smartGoalId: "goal_1",
      startDate: "2026-04-01T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: "week_1",
        planId: "plan_1",
        weekNumber: 1,
        focus: "",
        expectedOutput: "",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        tasks: [],
        metrics: [],
      },
    ],
  };
}

function buildSystem(): TwelveWeekSystem {
  return {
    goalType: "Project",
    vision12Week: "Ship the product",
    lagMetric: { name: "Users", unit: "users", target: "100", currentValue: "0" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-04-01",
    endDate: "2026-06-24",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function buildMetric(logs: Array<{ id: string; date: string; value: number; completed: boolean }> = []) {
  return {
    id: "metric_1",
    weekId: "week_1",
    name: DAILY_CHECKIN_METRIC_NAME,
    weeklyTarget: 0,
    logs,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

function buildTask(overrides: Partial<{ id: string; status: "todo" | "doing" | "done" }> = {}) {
  return {
    id: overrides.id ?? "remote_task_1",
    weekId: "week_1",
    title: "Write launch brief",
    status: overrides.status ?? "done",
    scheduledDate: "2026-04-01T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

function buildTaskSystem(completed = false): TwelveWeekSystem {
  return {
    ...buildSystem(),
    taskInstances: [
      {
        id: "local_task_1",
        weekNumber: 1,
        scheduledDate: "2026-04-01",
        title: "Write launch brief",
        leadIndicatorName: "",
        isCore: true,
        completed,
        completedAt: completed ? "2026-04-01T10:00:00.000Z" : undefined,
      },
    ],
  };
}

describe("usePlanExecutionSync.syncDailyCheckIn", () => {
  beforeEach(() => {
    localStorage.clear();
    shouldEnableMutationSync.mockReset();
    shouldEnableMutationSync.mockReturnValue(false);
    createMetric.mockReset();
    createPlan.mockReset();
    getPlan.mockReset();
    getPlans.mockReset();
    getMetrics.mockReset();
    logMetric.mockReset();
    updateMetricLog.mockReset();
    addTask.mockReset();
    toggleTask.mockReset();
    updateTask.mockReset();
    updateWeek.mockReset();
    updateWeekReview.mockReset();
    getMetricIdForGoal.mockReset();
    getPlanLink.mockReset();
    getRemoteTaskIdForGoal.mockReset();
    getWeekIdForGoal.mockReset();
    savePlanDetailsLink.mockReset();
    setMetricIdForGoal.mockReset();
    setRemoteTaskIdForGoal.mockReset();
    bulkSyncPlan.mockRejectedValue({
      status: 404,
      message: "Endpoint not found",
    });

    getPlanLink.mockReturnValue({
      planId: "plan_1",
      weekIdByNumber: { 1: "week_1" },
      metricIdByKey: {},
      taskIdByLocalTaskId: {},
      weekRevisionById: {},
      taskRevisionByRemoteId: {},
    });
    getPlan.mockResolvedValue(buildPlanDetails());
    getPlans.mockResolvedValue([]);
    createPlan.mockResolvedValue(buildPlanDetails().plan);
    getWeekIdForGoal.mockReturnValue("week_1");
    getMetricIdForGoal.mockReturnValue("metric_1");
    getRemoteTaskIdForGoal.mockReturnValue(null);
    createMetric.mockResolvedValue(buildMetric());
    logMetric.mockResolvedValue(buildMetric());
    updateMetricLog.mockResolvedValue(buildMetric());
    addTask.mockResolvedValue(buildTask());
    updateTask.mockResolvedValue(buildTask());
    updateWeek.mockResolvedValue(buildPlanDetails().weeks[0]);
    updateWeekReview.mockResolvedValue(buildPlanDetails().weeks[0]);
  });

  it("does not enqueue or run legacy task sync when mutation sync is enabled", async () => {
    shouldEnableMutationSync.mockReturnValue(true);
    const { result } = renderHook(() =>
      usePlanExecutionSync({ goalId: "goal_1", system: buildTaskSystem(false) }),
    );

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncTaskToggle("local_task_1", true);
    });

    expect(synced).toBe(true);
    expect(result.current.queueStatus.queueSummary.totalCount).toBe(0);
    expect(getPlan).not.toHaveBeenCalled();
    expect(getPlans).not.toHaveBeenCalled();
    expect(toggleTask).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("does not run legacy check-in or review sync when mutation sync is enabled", async () => {
    shouldEnableMutationSync.mockReturnValue(true);
    getMetrics.mockResolvedValue([]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));

    let checkInSynced = false;
    let reviewSynced = false;
    await act(async () => {
      checkInSynced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-08-07",
        didWorkToday: true,
      });
      reviewSynced = await result.current.actions.syncWeeklyReview({
        weekNumber: 1,
        executionScore: 80,
      });
    });

    expect(checkInSynced).toBe(true);
    expect(reviewSynced).toBe(true);
    expect(result.current.queueStatus.queueSummary.totalCount).toBe(0);
    expect(getPlan).not.toHaveBeenCalled();
    expect(getMetrics).not.toHaveBeenCalled();
    expect(logMetric).not.toHaveBeenCalled();
    expect(updateMetricLog).not.toHaveBeenCalled();
    expect(updateWeekReview).not.toHaveBeenCalled();
  });

  it("creates a metric log on first daily check-in", async () => {
    getMetrics.mockResolvedValueOnce([buildMetric([])]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: true,
      });
    });

    expect(synced).toBe(true);
    expect(logMetric).toHaveBeenCalledTimes(1);
    expect(logMetric).toHaveBeenCalledWith(
      "metric_1",
      expect.objectContaining({
        date: "2026-04-01T00:00:00.000Z",
        value: 1,
        completed: true,
      }),
    );
    expect(updateMetricLog).not.toHaveBeenCalled();
  });

  it("updates existing same-day metric log when check-in state changes", async () => {
    getMetrics.mockResolvedValueOnce([
      buildMetric([
        {
          id: "log_1",
          date: "2026-04-01T00:00:00.000Z",
          value: 1,
          completed: true,
        },
      ]),
    ]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: false,
      });
    });

    expect(synced).toBe(true);
    expect(updateMetricLog).toHaveBeenCalledTimes(1);
    expect(updateMetricLog).toHaveBeenCalledWith(
      "metric_1",
      "log_1",
      expect.objectContaining({
        date: "2026-04-01T00:00:00.000Z",
        value: 0,
        completed: false,
      }),
    );
    expect(logMetric).not.toHaveBeenCalled();
  });

  it("does nothing when same-day check-in state is unchanged", async () => {
    getMetrics.mockResolvedValueOnce([
      buildMetric([
        {
          id: "log_1",
          date: "2026-04-01T00:00:00.000Z",
          value: 0,
          completed: false,
        },
      ]),
    ]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: false,
      });
    });

    expect(synced).toBe(true);
    expect(updateMetricLog).not.toHaveBeenCalled();
    expect(logMetric).not.toHaveBeenCalled();
  });

  it("does not downgrade a completed backend task during broad snapshot sync", async () => {
    const backendTask = buildTask({ status: "done" });
    const backendDetails = {
      ...buildPlanDetails(),
      weeks: [
        {
          ...buildPlanDetails().weeks[0],
          tasks: [backendTask],
        },
      ],
    };
    const staleSystem = buildTaskSystem(false);

    getPlan.mockImplementation(async () => backendDetails);
    getRemoteTaskIdForGoal.mockReturnValue("remote_task_1");
    updateTask.mockImplementation((_taskId, input) => {
      backendTask.status = input.status ?? backendTask.status;
      return Promise.resolve({ ...backendTask });
    });

    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: staleSystem }));

    await act(async () => {
      await result.current.actions.syncLocalSnapshot({ system: staleSystem });
    });

    expect(updateTask).not.toHaveBeenCalled();
    expect(backendTask.status).toBe("done");
  });

  it("bootstraps a backend plan and backfills local 12-week state", async () => {
    getPlanLink.mockReturnValue(null);
    getMetrics.mockResolvedValue([buildMetric([])]);
    const system = {
      ...buildSystem(),
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
          scheduledDate: "2026-04-01",
          title: "Write launch brief",
          leadIndicatorName: "Deep work",
          isCore: true,
          completed: true,
          completedAt: "2026-04-01T10:00:00.000Z",
        },
      ],
      dailyCheckIns: [
        {
          date: "2026-04-01",
          didWorkToday: true,
          whichLeadIndicatorWorkedOn: "Deep work",
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
    } satisfies TwelveWeekSystem;
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system }));

    let status: string | undefined;
    await act(async () => {
      const snapshot = await result.current.actions.syncLocalSnapshot({ system });
      status = snapshot.status;
    });

    expect(status).toBe("success");
    expect(createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        smartGoalId: "goal_1",
        initializeWeeks: true,
      }),
    );
    expect(updateWeek).toHaveBeenCalledWith(
      "week_1",
      expect.objectContaining({
        focus: "Ship the launch brief",
        expectedOutput: "Brief approved",
      }),
    );
    expect(addTask).toHaveBeenCalledWith(
      "week_1",
      expect.objectContaining({
        title: "Write launch brief",
        status: "done",
      }),
    );
    expect(logMetric).toHaveBeenCalledWith(
      "metric_1",
      expect.objectContaining({
        completed: true,
        value: 1,
      }),
    );
    expect(updateWeekReview).toHaveBeenCalledWith(
      "week_1",
      expect.objectContaining({
        executionScore: 100,
        reflection: "Brief shipped",
        adjustments: "Publish",
      }),
    );
  });

  it("pushes the local snapshot over a divergent backend plan so conflicts clear", async () => {
    const backendDetails = {
      ...buildPlanDetails(),
      weeks: [
        {
          ...buildPlanDetails().weeks[0],
          focus: "Backend focus",
          expectedOutput: "Backend milestone",
          tasks: [
            {
              ...buildTask({ status: "done" }),
              title: "Backend brief",
              scheduledDate: "2026-04-02T00:00:00.000Z",
            },
          ],
          metrics: [
            buildMetric([
              {
                id: "daily_log_1",
                date: "2026-04-01T00:00:00.000Z",
                value: 1,
                completed: true,
              },
            ]),
          ],
          review: {
            weekNumber: 1,
            executionScore: 20,
            reflection: "Backend review",
            adjustments: "Backend priority",
          },
        },
      ],
    };
    const localSystem = {
      ...buildSystem(),
      weeklyPlans: [
        {
          weekNumber: 1,
          phaseName: "Launch",
          focus: "Local focus",
          milestone: "Local milestone",
          completed: false,
        },
      ],
      taskInstances: [
        {
          id: "local_task_1",
          weekNumber: 1,
          scheduledDate: "2026-04-01",
          title: "Write launch brief",
          leadIndicatorName: "Deep work",
          isCore: true,
          completed: true,
          completedAt: "2026-04-01T10:00:00.000Z",
        },
      ],
      dailyCheckIns: [
        {
          date: "2026-04-01",
          didWorkToday: false,
          whichLeadIndicatorWorkedOn: "Deep work",
          amountDone: "0",
          outputCreated: "",
          obstacleOrIssue: "Blocked",
          dailySelfRating: 2,
          optionalNote: "",
          mood: "low",
        },
      ],
      weeklyReviews: [
        {
          weekNumber: 1,
          leadCompletionPercent: 0,
          lagProgressValue: "0/1",
          biggestOutputThisWeek: "Local review",
          mainObstacle: "",
          nextWeekPriority: "Local priority",
          workloadDecision: "reduce slightly",
          reviewCompleted: true,
          progressScore: 4,
          disciplineScore: 4,
          focusScore: 4,
          improvementScore: 4,
          outputQualityScore: 4,
          completedLeadIndicators: 0,
        },
      ],
      scoreboard: [],
    } satisfies TwelveWeekSystem;
    const taskLinkMap = { local_task_1: "remote_task_1" };

    getPlan.mockImplementation(async () => backendDetails);
    getMetrics.mockImplementation(async () => backendDetails.weeks[0].metrics);
    getRemoteTaskIdForGoal.mockReturnValue("remote_task_1");
    getPlanLink.mockReturnValue({
      planId: "plan_1",
      weekIdByNumber: { 1: "week_1" },
      metricIdByKey: {},
      taskIdByLocalTaskId: taskLinkMap,
      weekRevisionById: {},
      taskRevisionByRemoteId: {},
    });
    updateWeek.mockImplementation(async (_weekId, input) => {
      backendDetails.weeks[0].focus = input.focus ?? "";
      backendDetails.weeks[0].expectedOutput = input.expectedOutput ?? "";
      return backendDetails.weeks[0];
    });
    updateTask.mockImplementation(async (_taskId, input) => {
      const task = backendDetails.weeks[0].tasks[0];
      task.title = input.title ?? task.title;
      task.status = input.status ?? task.status;
      task.scheduledDate = input.scheduledDate ?? task.scheduledDate;
      return task;
    });
    updateMetricLog.mockImplementation(async (_metricId, logId, input) => {
      const log = backendDetails.weeks[0].metrics[0].logs.find((item) => item.id === logId);
      if (log) {
        log.date = input.date ?? log.date;
        log.value = input.value ?? log.value;
        log.completed = input.completed ?? log.completed;
      }
      return backendDetails.weeks[0].metrics[0];
    });
    updateWeekReview.mockImplementation(async (_weekId, input) => {
      backendDetails.weeks[0].review = input;
      return backendDetails.weeks[0];
    });

    const beforeSync = detectBackendPlanConflicts(localSystem, backendDetails, taskLinkMap);
    expect(beforeSync.hasConflicts).toBe(true);

    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: localSystem }));

    let status: string | undefined;
    await act(async () => {
      const snapshot = await result.current.actions.syncLocalSnapshot({ system: localSystem });
      status = snapshot.status;
    });

    expect(status).toBe("success");
    expect(updateWeek).toHaveBeenCalledWith(
      "week_1",
      expect.objectContaining({
        focus: "Local focus",
        expectedOutput: "Local milestone",
      }),
    );
    expect(updateTask).toHaveBeenCalledWith(
      "remote_task_1",
      expect.objectContaining({
        title: "Write launch brief",
        status: "done",
        scheduledDate: "2026-04-01T00:00:00.000Z",
        baseRevision: undefined,
      }),
    );
    expect(updateMetricLog).toHaveBeenCalledWith(
      "metric_1",
      "daily_log_1",
      expect.objectContaining({
        value: 0,
        completed: false,
      }),
    );
    expect(updateWeekReview).toHaveBeenCalledWith(
      "week_1",
      expect.objectContaining({
        reflection: "Local review",
        adjustments: "Local priority",
      }),
    );

    const afterSync = detectBackendPlanConflicts(localSystem, backendDetails, taskLinkMap);
    expect(afterSync.conflicts).toHaveLength(0);
  });
});
