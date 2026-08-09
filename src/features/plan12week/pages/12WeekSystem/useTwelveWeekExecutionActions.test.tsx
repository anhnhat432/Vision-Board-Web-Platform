import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    shouldEnable12WeekMutationSync: () => false,
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@/app/utils/analytics", () => ({
  trackAnalyticsEvent: vi.fn(),
}));

vi.mock("@/app/utils/haptics", () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock("@/app/utils/sound", () => ({
  playAllCompleteSound: vi.fn(),
  playTaskCompleteSound: vi.fn(),
}));

vi.mock("@/lib/effects/celebrate", () => ({
  celebrateMedium: vi.fn(),
  celebrateSmall: vi.fn(),
}));

import { getUserData, resetUserDataCache, saveUserData, updateGoal } from "@/app/utils/storage";
import { getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";
import * as weeklyReviewMutation from "@/features/plan12week/persistence/weeklyReviewMutation";
import { hapticSuccess } from "@/app/utils/haptics";
import { celebrateMedium } from "@/lib/effects/celebrate";
import { toast } from "sonner";
import { useTwelveWeekExecutionActions } from "./useTwelveWeekExecutionActions";

const GOAL_ID = "goal_today_legacy_rollback";
const TASK_ID = "task_today_legacy_rollback";

function createTask(): TwelveWeekTaskInstance {
  return {
    id: TASK_ID,
    weekNumber: 1,
    scheduledDate: "2026-08-08",
    title: "Write rollback proof",
    leadIndicatorName: "Deep work",
    tacticId: "lead_deep_work",
    isCore: true,
    completed: false,
    lastModifiedAt: 111,
  };
}

function createOptionalNextWeekTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: "task_optional_week_2",
    weekNumber: 2,
    scheduledDate: "2026-08-11",
    title: "Optional reading",
    leadIndicatorName: "Optional reading",
    tacticId: "lead_optional_reading",
    isCore: false,
    completed: false,
    lastModifiedAt: 222,
    ...overrides,
  };
}

function createSystem(): TwelveWeekSystem {
  return {
    goalType: "Career",
    vision12Week: "Ship",
    lagMetric: { name: "Release", unit: "release", target: "1", currentValue: "0" },
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
    successEvidence: "Live",
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
      { weekNumber: 1, phaseName: "Start", focus: "Draft", milestone: "Draft", completed: false },
      { weekNumber: 2, phaseName: "Build", focus: "Original week 2 focus", milestone: "", completed: false },
    ],
    taskInstances: [createTask(), createOptionalNextWeekTask()],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(12),
  };
}

function seedGoal(): Goal {
  const goal: Goal = {
    id: GOAL_ID,
    category: "Career",
    title: "Legacy rollback",
    description: "",
    deadline: "2026-10-25",
    tasks: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    twelveWeekSystem: createSystem(),
  };
  const data = getUserData();
  data.goals = [goal];
  expect(saveUserData(data)).toBe(true);
  return getUserData().goals[0];
}

describe("useTwelveWeekExecutionActions legacy task rollback", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores the exact pre-click task snapshot when direct sync fails", async () => {
    const activeGoal = seedGoal();
    const system = activeGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected seeded 12-week system");

    const syncTaskToggle = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "",
          biggestOutputThisWeek: "",
          mainObstacle: "",
          keepTactic: "",
          reduceTactic: "",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle,
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate: (nextSystem) => {
          updateGoal(GOAL_ID, { twelveWeekSystem: nextSystem });
          return nextSystem;
        },
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleToggleTask(TASK_ID, true);
    });

    expect(syncTaskToggle).toHaveBeenCalledWith(TASK_ID, true);
    const persistedTask = getUserData().goals[0]?.twelveWeekSystem?.taskInstances.find((task) => task.id === TASK_ID);
    expect(persistedTask).toEqual(createTask());

    const taskMutations = listStoredPendingMutations(null).filter(
      (mutation) => mutation.kind === "task_completed_changed",
    );
    expect(taskMutations).toHaveLength(1);
    expect(taskMutations[0]?.payload).toEqual(expect.objectContaining({ completed: false }));
  });

  it("routes manual Weekly Review through one canonical local write while preserving Journal feedback", async () => {
    const activeGoal = seedGoal();
    const system = activeGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected seeded 12-week system");

    const commitSystemUpdate = vi.fn((nextSystem: TwelveWeekSystem) => nextSystem);
    const updateActiveSystemState = vi.fn();
    const syncWeeklyReview = vi.fn().mockRejectedValue(new Error("backend unavailable"));
    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "42",
          biggestOutputThisWeek: "Finished case study",
          mainObstacle: "Late meetings",
          keepTactic: "Morning deep work",
          reduceTactic: "Optional evening work",
          nextWeekPriority: "Ship portfolio",
          commitmentStatuses: {},
          insights: "Morning work was more reliable",
          nextWeekCommitments: ["Ship portfolio", "Train twice"],
          workloadDecision: "reduce slightly",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview,
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate,
        updateActiveSystemState,
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let saveResults: unknown[] = [];
    await act(async () => {
      saveResults = await Promise.all([
        result.current.handleSaveWeeklyReview(),
        result.current.handleSaveWeeklyReview(),
      ]);
    });

    const data = getUserData();
    const savedSystem = data.goals[0]?.twelveWeekSystem;
    const savedReview = savedSystem?.weeklyReviews[0];
    expect(savedReview).toEqual(
      expect.objectContaining({
        weekNumber: 1,
        keepTactic: "Morning deep work",
        mainObstacle: "Late meetings",
        reduceTactic: "Optional evening work",
        nextWeekCommitments: ["Ship portfolio", "Train twice"],
        lastReviewAt: "2026-08-08T08:00:00.000Z",
      }),
    );
    expect(savedSystem?.scoreboard[0]?.reviewDone).toBe(true);
    expect(data.reflections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entryType: "weekly-review", linkedGoalId: GOAL_ID, linkedWeekNumber: 1 }),
      ]),
    );
    expect(commitSystemUpdate).not.toHaveBeenCalled();
    expect(updateActiveSystemState).toHaveBeenCalledTimes(1);
    expect(syncWeeklyReview).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(hapticSuccess).toHaveBeenCalledTimes(1);
    expect(celebrateMedium).toHaveBeenCalledTimes(1);
    expect(saveResults[1]).toEqual(saveResults[0]);
    expect(saveResults[0]).toMatchObject({ status: "saved", syncStatus: "pending" });
    expect(toast.info).toHaveBeenCalledWith(
      "Review tuần đã lưu trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.",
    );

    const reviewMutations = listStoredPendingMutations(null).filter(
      (mutation) => mutation.kind === "weekly_review_upserted",
    );
    expect(reviewMutations).toHaveLength(1);
  });

  it("saves a review patch without mutating the next-week plan and preserves hidden legacy fields", async () => {
    const activeGoal = seedGoal();
    const existingSystem = activeGoal.twelveWeekSystem;
    if (!existingSystem) throw new Error("Expected seeded 12-week system");
    updateGoal(GOAL_ID, {
      twelveWeekSystem: {
        ...existingSystem,
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 50,
            lagProgressValue: "10",
            biggestOutputThisWeek: "Legacy output stays",
            mainObstacle: "Old obstacle",
            nextWeekPriority: "Old priority",
            workloadDecision: "keep same",
            reviewCompleted: true,
            insights: "Legacy insight stays",
            reflection: "Legacy reflection stays",
            nextWeekCommitments: ["Old priority"],
          },
        ],
      },
    });
    const refreshedGoal = getUserData().goals[0];
    const system = refreshedGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected refreshed 12-week system");
    const beforePlan = structuredClone({ weeklyPlans: system.weeklyPlans, taskInstances: system.taskInstances });
    const commitSystemUpdate = vi.fn((nextSystem: TwelveWeekSystem) => nextSystem);

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal: refreshedGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "42",
          biggestOutputThisWeek: "Legacy output stays",
          mainObstacle: "New obstacle",
          keepTactic: "Morning deep work",
          reduceTactic: "Optional evening work",
          nextWeekPriority: "Ship portfolio",
          commitmentStatuses: {},
          insights: "Legacy insight stays",
          nextWeekCommitments: ["Ship portfolio"],
          workloadDecision: "reduce slightly",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate,
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let saveResult: Awaited<ReturnType<typeof result.current.handleSaveWeeklyReview>> | undefined;
    await act(async () => {
      saveResult = await result.current.handleSaveWeeklyReview(1);
    });

    expect(saveResult).toMatchObject({ status: "saved" });
    const savedSystem = getUserData().goals[0]?.twelveWeekSystem;
    const savedReview = savedSystem?.weeklyReviews.find((review) => review.weekNumber === 1);
    expect(savedReview).toEqual(
      expect.objectContaining({
        biggestOutputThisWeek: "Legacy output stays",
        insights: "Legacy insight stays",
        reflection: "Legacy reflection stays",
        mainObstacle: "New obstacle",
        keepTactic: "Morning deep work",
        reduceTactic: "Optional evening work",
        nextWeekPriority: "Ship portfolio",
      }),
    );
    expect({ weeklyPlans: savedSystem?.weeklyPlans, taskInstances: savedSystem?.taskInstances }).toEqual(beforePlan);
    expect(commitSystemUpdate).not.toHaveBeenCalled();
  });

  it("saves the selected historical review week instead of the current week", async () => {
    const activeGoal = seedGoal();
    const baseSystem = activeGoal.twelveWeekSystem;
    if (!baseSystem) throw new Error("Expected seeded 12-week system");
    const historicalReview = {
      weekNumber: 1,
      leadCompletionPercent: 50,
      lagProgressValue: "10",
      biggestOutputThisWeek: "Historical output",
      mainObstacle: "Historical obstacle",
      nextWeekPriority: "",
      workloadDecision: "keep same" as const,
      reviewCompleted: true,
      nextWeekCommitments: [],
      adjustments: "Legacy adjustment stays",
    };
    updateGoal(GOAL_ID, {
      twelveWeekSystem: {
        ...baseSystem,
        currentWeek: 2,
        weeklyReviews: [historicalReview],
      },
    });
    const refreshedGoal = getUserData().goals[0];
    const system = refreshedGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected refreshed system");

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal: refreshedGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "15",
          biggestOutputThisWeek: "Historical output",
          mainObstacle: "Edited historical obstacle",
          keepTactic: "Historical keep",
          reduceTactic: "",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate: vi.fn((nextSystem: TwelveWeekSystem) => nextSystem),
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let saveResult: Awaited<ReturnType<typeof result.current.handleSaveWeeklyReview>> | undefined;
    await act(async () => {
      saveResult = await result.current.handleSaveWeeklyReview(1);
    });

    expect(saveResult).toMatchObject({ status: "saved" });
    const savedReviews = getUserData().goals[0]?.twelveWeekSystem?.weeklyReviews ?? [];
    expect(savedReviews.find((review) => review.weekNumber === 1)?.mainObstacle).toBe("Edited historical obstacle");
    expect(savedReviews.find((review) => review.weekNumber === 1)?.adjustments).toBe("Legacy adjustment stays");
    expect(savedReviews.some((review) => review.weekNumber === 2)).toBe(false);
  });

  it("rejects a future review target before the canonical write", async () => {
    const activeGoal = seedGoal();
    const system = activeGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected seeded 12-week system");
    const commitSpy = vi.spyOn(weeklyReviewMutation, "commitTwelveWeekWeeklyReview");
    const syncWeeklyReview = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "42",
          biggestOutputThisWeek: "",
          mainObstacle: "",
          keepTactic: "Morning deep work",
          reduceTactic: "Reduce optional meetings",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview,
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate: vi.fn((nextSystem: TwelveWeekSystem) => nextSystem),
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let saveResult: Awaited<ReturnType<typeof result.current.handleSaveWeeklyReview>> | undefined;
    await act(async () => {
      saveResult = await result.current.handleSaveWeeklyReview(2);
    });

    expect(saveResult).toEqual({ status: "failed", reason: "validation" });
    expect(commitSpy).not.toHaveBeenCalled();
    expect(syncWeeklyReview).not.toHaveBeenCalled();
    expect(getUserData().goals[0]?.twelveWeekSystem?.weeklyReviews).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith("Không thể lưu review cho tuần tương lai.");
  });

  it("keeps the review form in a failed state when the canonical local commit fails", async () => {
    const activeGoal = seedGoal();
    const system = activeGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected seeded 12-week system");
    vi.spyOn(weeklyReviewMutation, "commitTwelveWeekWeeklyReview").mockReturnValueOnce({
      status: "local_save_failed",
    });

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "42",
          biggestOutputThisWeek: "",
          mainObstacle: "Late meetings",
          keepTactic: "Morning deep work",
          reduceTactic: "Reduce optional meetings",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate: vi.fn((nextSystem: TwelveWeekSystem) => nextSystem),
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let saveResult: Awaited<ReturnType<typeof result.current.handleSaveWeeklyReview>> | undefined;
    await act(async () => {
      saveResult = await result.current.handleSaveWeeklyReview(1);
    });

    expect(saveResult).toMatchObject({ status: "failed", reason: "local_save_failed" });
    expect(toast.error).toHaveBeenCalledWith("Không thể lưu review tuần. Dữ liệu cũ vẫn được giữ nguyên.");
  });

  it("applies a confirmed next-week handoff once and syncs the exact local snapshot", async () => {
    const activeGoal = seedGoal();
    const baseSystem = activeGoal.twelveWeekSystem;
    if (!baseSystem) throw new Error("Expected seeded 12-week system");
    updateGoal(GOAL_ID, {
      twelveWeekSystem: {
        ...baseSystem,
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 60,
            lagProgressValue: "42",
            biggestOutputThisWeek: "",
            mainObstacle: "Late meetings",
            nextWeekPriority: "Ship portfolio",
            workloadDecision: "reduce slightly",
            reviewCompleted: true,
            nextWeekCommitments: ["Ship portfolio"],
          },
        ],
      },
    });
    const refreshedGoal = getUserData().goals[0];
    const system = refreshedGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected refreshed system");
    const commitSystemUpdate = vi.fn((nextSystem: TwelveWeekSystem) => {
      updateGoal(GOAL_ID, { twelveWeekSystem: nextSystem });
      return nextSystem;
    });
    const syncLocalSnapshot = vi.fn().mockResolvedValue({ status: "success", failedCount: 0 });

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal: refreshedGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "42",
          biggestOutputThisWeek: "",
          mainObstacle: "Late meetings",
          keepTactic: "Morning deep work",
          reduceTactic: "Optional reading",
          nextWeekPriority: "Ship portfolio",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: ["Ship portfolio"],
          workloadDecision: "reduce slightly",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot,
        },
        commitSystemUpdate,
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    const applyResults: unknown[] = [];
    await act(async () => {
      applyResults.push(
        ...(await Promise.all([
          result.current.handleApplyNextWeekHandoff(1, { applyPriority: true, applyWorkload: true }),
          result.current.handleApplyNextWeekHandoff(1, { applyPriority: true, applyWorkload: true }),
        ])),
      );
    });

    expect(applyResults).toHaveLength(2);
    expect(applyResults[0]).toMatchObject({ status: "applied", syncStatus: "synced" });
    expect(applyResults[1]).toEqual(applyResults[0]);
    expect(commitSystemUpdate).toHaveBeenCalledTimes(1);
    expect(syncLocalSnapshot).toHaveBeenCalledTimes(1);
    const syncedSystem = syncLocalSnapshot.mock.calls[0]?.[0]?.system as TwelveWeekSystem;
    expect(syncedSystem.weeklyPlans.find((week) => week.weekNumber === 2)?.focus).toBe("Ship portfolio");
    expect(syncedSystem.taskInstances.find((task) => task.id === "task_optional_week_2")?.skipped).toBe(true);
    const planMutations = listStoredPendingMutations(null).filter((mutation) => mutation.kind === "plan_snapshot_updated");
    expect(planMutations).toHaveLength(1);
  });

  it("reports truthful partial success when plan local apply fails after the review is saved", async () => {
    const activeGoal = seedGoal();
    const baseSystem = activeGoal.twelveWeekSystem;
    if (!baseSystem) throw new Error("Expected seeded 12-week system");
    updateGoal(GOAL_ID, {
      twelveWeekSystem: {
        ...baseSystem,
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 60,
            lagProgressValue: "42",
            biggestOutputThisWeek: "",
            mainObstacle: "Late meetings",
            nextWeekPriority: "Ship portfolio",
            workloadDecision: "reduce slightly",
            reviewCompleted: true,
            nextWeekCommitments: ["Ship portfolio"],
          },
        ],
      },
    });
    const refreshedGoal = getUserData().goals[0];
    const system = refreshedGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected refreshed system");

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal: refreshedGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "",
          biggestOutputThisWeek: "",
          mainObstacle: "",
          keepTactic: "",
          reduceTactic: "",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue({ status: "success", failedCount: 0 }),
        },
        commitSystemUpdate: vi.fn(() => {
          throw new Error("disk full");
        }),
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let applyResult: Awaited<ReturnType<typeof result.current.handleApplyNextWeekHandoff>> | undefined;
    await act(async () => {
      applyResult = await result.current.handleApplyNextWeekHandoff(1, {
        applyPriority: true,
        applyWorkload: true,
      });
    });

    expect(applyResult).toMatchObject({ status: "failed", reason: "local_save_failed" });
    expect(getUserData().goals[0]?.twelveWeekSystem?.weeklyReviews[0]?.reviewCompleted).toBe(true);
    expect(toast.error).toHaveBeenCalledWith("Review đã lưu. Thay đổi kế hoạch tuần sau chưa áp dụng được.");
  });

  it.each([
    { snapshot: { status: "error", failedCount: 1 }, label: "snapshot sync fails" },
    { snapshot: { status: "idle", failedCount: 0 }, label: "snapshot sync is unavailable" },
  ])("reports local apply success with pending sync when $label", async ({ snapshot }) => {
    const activeGoal = seedGoal();
    const baseSystem = activeGoal.twelveWeekSystem;
    if (!baseSystem) throw new Error("Expected seeded 12-week system");
    updateGoal(GOAL_ID, {
      twelveWeekSystem: {
        ...baseSystem,
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 60,
            lagProgressValue: "42",
            biggestOutputThisWeek: "",
            mainObstacle: "Late meetings",
            nextWeekPriority: "Ship portfolio",
            workloadDecision: "keep same",
            reviewCompleted: true,
            nextWeekCommitments: ["Ship portfolio"],
          },
        ],
      },
    });
    const refreshedGoal = getUserData().goals[0];
    const system = refreshedGoal.twelveWeekSystem;
    if (!system) throw new Error("Expected refreshed system");

    const { result } = renderHook(() =>
      useTwelveWeekExecutionActions({
        activeGoal: refreshedGoal,
        system,
        activeGoalIdRef: { current: GOAL_ID },
        dailyMood: "steady",
        dailyNote: "",
        weeklyForm: {
          lagProgressValue: "",
          biggestOutputThisWeek: "",
          mainObstacle: "",
          keepTactic: "",
          reduceTactic: "",
          nextWeekPriority: "",
          commitmentStatuses: {},
          insights: "",
          nextWeekCommitments: [],
          workloadDecision: "keep same",
        },
        setWeeklyForm: vi.fn(),
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle: vi.fn().mockResolvedValue(true),
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
          syncLocalSnapshot: vi.fn().mockResolvedValue(snapshot),
        },
        commitSystemUpdate: (nextSystem) => {
          updateGoal(GOAL_ID, { twelveWeekSystem: nextSystem });
          return nextSystem;
        },
        updateActiveSystemState: vi.fn(),
        refreshBackendProgressOverlay: vi.fn(),
        invalidateOverlay: vi.fn(),
        refreshSnapshotMeta: vi.fn(),
      }),
    );

    let applyResult: Awaited<ReturnType<typeof result.current.handleApplyNextWeekHandoff>> | undefined;
    await act(async () => {
      applyResult = await result.current.handleApplyNextWeekHandoff(1, {
        applyPriority: true,
        applyWorkload: false,
      });
    });

    expect(applyResult).toMatchObject({ status: "applied", syncStatus: "pending" });
    expect(getUserData().goals[0]?.twelveWeekSystem?.weeklyPlans[1]?.focus).toBe("Ship portfolio");
    expect(toast.info).toHaveBeenCalledWith(
      "Thay đổi tuần sau đã áp dụng trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.",
    );
  });
});
