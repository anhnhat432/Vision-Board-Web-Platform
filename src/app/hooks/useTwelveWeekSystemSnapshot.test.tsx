import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
