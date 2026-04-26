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

import { getTwelveWeekCurrentWeek } from "../utils/storage-twelve-week";
import { getUserData } from "../utils/storage";
import { getUniversalWeeklyReviewExecutionScore } from "@/features/plan12week/persistence/reviewExecutionScore";
import {
  readGoal,
  renderAppRoute,
  resetTestStorage,
  seedTwelveWeekGoal,
  updateUserData,
} from "../../test/app-flow-helpers";

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
  });

  it("keeps lag metric, weekly review, and scoreboard metric aligned before weekly-review sync", async () => {
    const { goalId } = seedTwelveWeekGoal();

    updateUserData((data) => {
      const goal = data.goals.find((item) => item.id === goalId);
      if (!goal?.twelveWeekSystem) return;
      goal.twelveWeekSystem.lagMetric.currentValue = "13 ngày giữ nhịp";
    });

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Tuần" }));
    await user.type(
      await screen.findByLabelText("1. Điều gì chạy tốt nhất trong tuần này?"),
      "Giữ được nhịp ship mỗi ngày.",
    );
    await user.type(
      screen.getByLabelText("2. Điều gì cản trở nhịp của bạn?"),
      "Bị phân tán vì đổi context.",
    );
    await user.type(
      screen.getByLabelText("3. Một ưu tiên duy nhất cho tuần sau là gì?"),
      "Chốt xong command center trước.",
    );
    await user.click(screen.getByRole("button", { name: "Chốt review tuần này" }));

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

    await user.click(screen.getByRole("tab", { name: "Tuần" }));
    await user.type(
      await screen.findByLabelText(/chạy tốt nhất/i),
      "Hoàn thành review local trước khi backend kịp trả lời.",
    );
    await user.type(
      screen.getByLabelText(/cản trở/i),
      "Backend đang chậm.",
    );
    await user.type(
      screen.getByLabelText(/ưu tiên duy nhất/i),
      "Giữ review hiển thị trong journal.",
    );
    await user.click(screen.getByRole("button", { name: "Chốt review tuần này" }));

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
