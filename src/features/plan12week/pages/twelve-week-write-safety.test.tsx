import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  syncTaskToggleMock,
  syncWeeklyReviewMock,
  syncDailyCheckInMock,
} = vi.hoisted(() => ({
  syncTaskToggleMock: vi.fn(),
  syncWeeklyReviewMock: vi.fn(),
  syncDailyCheckInMock: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: null,
  }),
}));

vi.mock("@/features/plan12week/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/features/plan12week/hooks")>(
    "@/features/plan12week/hooks",
  );

  return {
    ...actual,
    usePlanExecutionSync: ({ goalId }: { goalId: string | null }) => ({
      loading: false,
      error: null,
      data: { goalId },
      actions: {
        syncTaskToggle: syncTaskToggleMock,
        syncWeeklyReview: syncWeeklyReviewMock,
        syncDailyCheckIn: syncDailyCheckInMock,
        clearError: vi.fn(),
      },
    }),
  };
});

import { getTwelveWeekCurrentWeek } from '@/app/utils/storage-twelve-week';
import { getUserData } from '@/app/utils/storage';
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";
import { getUniversalWeeklyReviewExecutionScore } from "@/features/plan12week/persistence/reviewExecutionScore";
import {
  readGoal,
  renderAppRoute,
  resetTestStorage,
  seedTwelveWeekGoal,
  updateUserData,
} from '@/test/app-flow-helpers';

const INTEGRATION_TEST_TIMEOUT_MS = 10_000;

function getPrimaryButton(name: string | RegExp) {
  const [button] = screen.getAllByRole("button", { name });
  expect(button).toBeInTheDocument();
  return button;
}

async function openWeeklyReviewDetails(_user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("wam-section-next-commitments", undefined, {
    timeout: INTEGRATION_TEST_TIMEOUT_MS,
  });
}

async function typeWamReview(
  user: ReturnType<typeof userEvent.setup>,
  input: { insights: string; nextWeekCommitments: string },
) {
  await openWeeklyReviewDetails(user);
  const insightsInput = document.querySelector("#weekly-insights");
  const commitmentsInput = document.querySelector("#weekly-next-commitments");
  expect(insightsInput).toBeInTheDocument();
  expect(commitmentsInput).toBeInTheDocument();
  await user.type(insightsInput as HTMLElement, input.insights);
  await user.type(commitmentsInput as HTMLElement, `${input.nextWeekCommitments}{Enter}`);
}

describe("12-week write-path safety", () => {
  beforeEach(() => {
    resetTestStorage();
    syncTaskToggleMock.mockReset();
    syncWeeklyReviewMock.mockReset();
    syncDailyCheckInMock.mockReset();
    syncTaskToggleMock.mockResolvedValue(true);
    syncWeeklyReviewMock.mockResolvedValue(true);
    syncDailyCheckInMock.mockResolvedValue(true);
  });

  it("rolls back only the toggled task on async failure and keeps newer local task changes", async () => {
    const { goalId } = seedTwelveWeekGoal();
    const initialTasks = readGoal(goalId).twelveWeekSystem?.taskInstances ?? [];
    const initialCompletionById = new Map(initialTasks.map((task) => [task.id, task.completed]));
    expect(initialTasks.length).toBeGreaterThanOrEqual(2);

    let resolveSync: ((value: boolean) => void) | null = null;
    const syncPromise = new Promise<boolean>((resolve) => {
      resolveSync = resolve;
    });
    syncTaskToggleMock.mockImplementationOnce(() => syncPromise);

    renderAppRoute("/12-week-system");

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    const firstCheckbox = within(taskListCard as HTMLElement).getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);

    let toggledTaskId: string | null = null;
    await waitFor(() => {
      const changedTask = readGoal(goalId).twelveWeekSystem?.taskInstances.find(
        (task) => (initialCompletionById.get(task.id) ?? false) !== task.completed,
      );
      expect(changedTask).toBeDefined();
      expect(changedTask?.completed).toBe(true);
      toggledTaskId = changedTask?.id ?? null;
    });

    const peerTaskId = initialTasks.find((task) => task.id !== toggledTaskId)?.id;
    expect(toggledTaskId).toBeTruthy();
    expect(peerTaskId).toBeTruthy();

    updateUserData((data) => {
      const goal = data.goals.find((item) => item.id === goalId);
      if (!goal?.twelveWeekSystem) return;

      goal.twelveWeekSystem.taskInstances = goal.twelveWeekSystem.taskInstances.map((task) =>
        task.id === peerTaskId
          ? {
              ...task,
              completed: true,
              completedAt: "2026-04-02T00:00:00.000Z",
            }
          : task,
      );
    });

    await act(async () => {
      resolveSync?.(false);
      await syncPromise;
    });

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const toggledTask = system?.taskInstances.find((task) => task.id === toggledTaskId);
      const updatedPeerTask = system?.taskInstances.find((task) => task.id === peerTaskId);

      expect(toggledTask?.completed).toBe(false);
      expect(updatedPeerTask?.completed).toBe(true);
    });

    const pendingMutations = listStoredPendingMutations(null);
    const taskMutations = pendingMutations.filter((m) => m.kind === "task_completed_changed");
    expect(taskMutations).toHaveLength(1);
    expect(taskMutations[0].supersedes).toHaveLength(1);
    expect(taskMutations[0].payload.clientTaskId).toBe(toggledTaskId);
    expect(taskMutations[0].payload.completed).toBe(false);
    expect(taskMutations[0].payload.completedAt).toBeUndefined();
  });

  it("keeps local daily check-in saved when queue persistence fails", async () => {
    const { goalId } = seedTwelveWeekGoal();

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();
    const noteInput = await screen.findByRole("textbox", { name: /note/i });
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("visionboard_data_mutation_queue")) {
        throw new Error("queue write failed");
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      await user.type(noteInput, "Check-in still saves locally.");
      await user.click(getPrimaryButton(/check-in/i));

      await waitFor(() => {
        expect(readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0]?.optionalNote).toBe(
          "Check-in still saves locally.",
        );
      });

      expect(syncDailyCheckInMock).toHaveBeenCalledTimes(1);
      expect(listStoredPendingMutations(null)).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("keeps local weekly review and reflection saved when queue persistence fails", async () => {
    const { goalId } = seedTwelveWeekGoal();

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await typeWamReview(user, {
      insights: "Weekly review still saves locally.",
      nextWeekCommitments: "Keep the local review.",
    });

    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("visionboard_data_mutation_queue")) {
        throw new Error("queue write failed");
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      await user.click(getPrimaryButton("Chốt review tuần này"));

      await waitFor(() => {
        expect(syncWeeklyReviewMock).toHaveBeenCalledTimes(1);
      });

      const system = readGoal(goalId).twelveWeekSystem;
      const data = getUserData();
      const reflection = data.reflections.find(
        (item) => item.entryType === "weekly-review" && item.linkedGoalId === goalId,
      );

      expect(system?.weeklyReviews[0]?.insights).toBe("Weekly review still saves locally.");
      expect(reflection?.content).toContain("Weekly review still saves locally.");
      expect(listStoredPendingMutations(null)).toEqual([]);
    } finally {
      setItemSpy.mockRestore();
    }
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("keeps lag metric, weekly review, and scoreboard metric aligned before weekly-review sync", async () => {
    const { goalId } = seedTwelveWeekGoal();

    updateUserData((data) => {
      const goal = data.goals.find((item) => item.id === goalId);
      if (!goal?.twelveWeekSystem) return;
      goal.twelveWeekSystem.lagMetric.currentValue = "13 ngày giữ nhịp";
    });

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await typeWamReview(user, {
      insights: "Bị phân tán vì đổi context.",
      nextWeekCommitments: "Chốt xong command center trước.",
    });
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      expect(syncWeeklyReviewMock).toHaveBeenCalledTimes(1);
    });

    const system = readGoal(goalId).twelveWeekSystem;
    expect(system).toBeDefined();

    if (!system) {
      throw new Error("Expected seeded 12-week system to exist.");
    }

    const currentWeek = getTwelveWeekCurrentWeek(system);
    const review = system?.weeklyReviews.find((item) => item.weekNumber === currentWeek);
    const scoreWeek = system?.scoreboard.find((item) => item.weekNumber === currentWeek);
    const lastSyncCall = syncWeeklyReviewMock.mock.calls[syncWeeklyReviewMock.mock.calls.length - 1];
    const syncPayload = lastSyncCall?.[0] as
      | { weekNumber: number; executionScore: number }
      | undefined;

    expect(review?.lagProgressValue).toBe("13 ngày giữ nhịp");
    expect(system?.lagMetric.currentValue).toBe("13 ngày giữ nhịp");
    expect(scoreWeek?.mainMetricProgress).toBe("13 ngày giữ nhịp");
    expect(syncPayload).toEqual(
      expect.objectContaining({
        weekNumber: currentWeek,
        executionScore: review ? getUniversalWeeklyReviewExecutionScore(review) : undefined,
      }),
    );
  }, 10_000);

  it("keeps weekly review, linked reflection, and outbox event when backend review sync fails", async () => {
    syncWeeklyReviewMock.mockResolvedValueOnce(false);
    const { goalId } = seedTwelveWeekGoal();

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);
    expect(screen.queryByLabelText("Reflection")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Adjustments")).not.toBeInTheDocument();
    await typeWamReview(user, {
      insights: "Hoàn thành review local trước khi backend kịp trả lời.",
      nextWeekCommitments: "Giữ review hiển thị trong journal.",
    });
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      expect(syncWeeklyReviewMock).toHaveBeenCalledTimes(1);
    });

    const system = readGoal(goalId).twelveWeekSystem;
    const currentWeek = system ? getTwelveWeekCurrentWeek(system) : 1;
    const data = getUserData();
    const reflection = data.reflections.find(
      (item) => item.entryType === "weekly-review" && item.linkedGoalId === goalId,
    );

    expect(system?.weeklyReviews.find((review) => review.weekNumber === currentWeek)?.reviewCompleted).toBe(true);
    expect(reflection?.content).toContain("Hoàn thành review local trước khi backend kịp trả lời.");
    expect(data.eventLog.some((event) => event.type === "12_week_weekly_review_submitted")).toBe(true);
    expect(data.syncOutbox.some((item) => item.type === "12_week_weekly_review_submitted")).toBe(true);
  }, 10_000);
});
