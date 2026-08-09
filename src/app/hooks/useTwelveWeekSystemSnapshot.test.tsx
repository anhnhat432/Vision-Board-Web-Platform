import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTwelveWeekWeekRange, getUserData, saveUserData } from "@/app/utils/storage";
import { resetTestStorage, seedTwelveWeekGoal } from "@/test/app-flow-helpers";
import { useTwelveWeekSystemSnapshot } from "./useTwelveWeekSystemSnapshot";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    user: null,
  }),
}));

function wrapperFor(initialEntry: string) {
  return function RouterWrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe("useTwelveWeekSystemSnapshot route tabs", () => {
  beforeEach(() => {
    resetTestStorage();
    seedTwelveWeekGoal();
  });

  it("opens legacy review deep links on the Week tab", async () => {
    const { result } = renderHook(() => useTwelveWeekSystemSnapshot(), {
      wrapper: wrapperFor("/12-week-system?tab=review"),
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("week");
    });
  });

  it("derives a week-scoped evidence and insight view model on the Week tab", async () => {
    const { result } = renderHook(() => useTwelveWeekSystemSnapshot(), {
      wrapper: wrapperFor("/12-week-system?tab=week"),
    });

    await waitFor(() => {
      expect(result.current.weeklyReviewViewModels[1]?.evidence.completion.total).toBeGreaterThan(0);
    });
    const expectedWeekOneTaskCount =
      result.current.system?.taskInstances.filter((task) => task.weekNumber === 1 && !task.skipped).length ?? 0;
    expect(result.current.weeklyReviewViewModels[1]?.evidence.completion.total).toBe(expectedWeekOneTaskCount);
    expect(result.current.weeklyReviewViewModels[1]?.evidence.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.weeklyReviewViewModels[1]?.insights.length).toBeLessThanOrEqual(3);
  });

  it("does not derive insight judgements for a future weekly review view model", async () => {
    resetTestStorage();
    const { goalId } = seedTwelveWeekGoal();
    const data = getUserData();
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal?.twelveWeekSystem) throw new Error("Expected seeded 12-week system");

    const futureWeekStart = getTwelveWeekWeekRange(goal.twelveWeekSystem, 2).start;
    goal.twelveWeekSystem.lagMetric.currentValue = "20";
    goal.twelveWeekSystem.taskInstances.push(
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `future_week_${index}`,
        weekNumber: 2,
        scheduledDate: futureWeekStart,
        title: `Future task ${index}`,
        leadIndicatorName: "Ship",
        isCore: true,
        completed: false,
      })),
    );
    expect(saveUserData(data)).toBe(true);

    const { result } = renderHook(() => useTwelveWeekSystemSnapshot(), {
      wrapper: wrapperFor("/12-week-system?tab=week"),
    });

    await waitFor(() => {
      expect(result.current.weeklyReviewViewModels[2]).toBeDefined();
    });
    expect(result.current.weeklyReviewViewModels[2]?.insights).toEqual([]);
  });
});
