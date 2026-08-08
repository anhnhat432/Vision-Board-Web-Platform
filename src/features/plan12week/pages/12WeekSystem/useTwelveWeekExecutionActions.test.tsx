import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    shouldEnable12WeekMutationSync: () => false,
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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
    weeklyPlans: [{ weekNumber: 1, phaseName: "Start", focus: "Draft", milestone: "Draft", completed: false }],
    taskInstances: [createTask()],
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
        hasPremiumReviewInsights: false,
        suggestedNextWeekPlan: null,
        rescuePlanSummary: null,
        executionSyncActions: {
          syncTaskToggle,
          syncDailyCheckIn: vi.fn().mockResolvedValue(true),
          syncWeeklyReview: vi.fn().mockResolvedValue(true),
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
});
