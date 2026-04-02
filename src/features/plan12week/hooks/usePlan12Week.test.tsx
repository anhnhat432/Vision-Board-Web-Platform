import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPlan,
  getPlanById,
  addTask,
  updateTask,
  createMetric,
  getMetrics,
  logMetric,
  submitWeeklyReview,
  updateWeek,
  savePlanDetailsLink,
} = vi.hoisted(() => ({
  createPlan: vi.fn(),
  getPlanById: vi.fn(),
  addTask: vi.fn(),
  updateTask: vi.fn(),
  createMetric: vi.fn(),
  getMetrics: vi.fn(),
  logMetric: vi.fn(),
  submitWeeklyReview: vi.fn(),
  updateWeek: vi.fn(),
  savePlanDetailsLink: vi.fn(),
}));

vi.mock("@/services/planService", () => ({
  createPlan,
  getPlanById,
}));

vi.mock("@/services/taskService", () => ({
  addTask,
  updateTask,
}));

vi.mock("@/services/metricService", () => ({
  createMetric,
  getMetrics,
  logMetric,
}));

vi.mock("@/services/weekService", () => ({
  submitWeeklyReview,
  updateWeek,
}));

vi.mock("../persistence/planLinkStore", () => ({
  savePlanDetailsLink,
}));

import { usePlan12Week } from "./usePlan12Week";

function createPlanDetails(planId: string, vision: string) {
  return {
    plan: {
      id: planId,
      userId: "user_1",
      vision,
      smartGoalId: "goal_1",
      startDate: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: `${planId}_week_1`,
        planId,
        weekNumber: 1,
        focus: `${vision} focus`,
        expectedOutput: `${vision} output`,
        tasks: [],
        metrics: [],
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  };
}

describe("usePlan12Week hydration safety", () => {
  beforeEach(() => {
    createPlan.mockReset();
    getPlanById.mockReset();
    addTask.mockReset();
    updateTask.mockReset();
    createMetric.mockReset();
    getMetrics.mockReset();
    logMetric.mockReset();
    submitWeeklyReview.mockReset();
    updateWeek.mockReset();
    savePlanDetailsLink.mockReset();
  });

  it("ignores late loadPlan responses after a newer request has already been applied", async () => {
    let resolveSlow: ((value: ReturnType<typeof createPlanDetails>) => void) | null = null;
    const slowPromise = new Promise<ReturnType<typeof createPlanDetails>>((resolve) => {
      resolveSlow = resolve;
    });

    getPlanById.mockImplementation((planId: string) => {
      if (planId === "plan_slow") return slowPromise;
      if (planId === "plan_fast") return Promise.resolve(createPlanDetails("plan_fast", "Fast plan"));
      return Promise.resolve(createPlanDetails(planId, "Fallback"));
    });

    const { result } = renderHook(() => usePlan12Week(null));

    let firstResult: Awaited<ReturnType<typeof result.current.loadPlan>> | null = null;
    act(() => {
      void result.current.loadPlan("plan_slow").then((value) => {
        firstResult = value;
      });
    });

    await act(async () => {
      const secondResult = await result.current.loadPlan("plan_fast");
      expect(secondResult?.id).toBe("plan_fast");
    });

    expect(result.current.plan?.id).toBe("plan_fast");
    expect(result.current.plan?.vision).toBe("Fast plan");

    await act(async () => {
      resolveSlow?.(createPlanDetails("plan_slow", "Slow plan"));
      await slowPromise;
    });

    expect(firstResult).toBeNull();
    expect(result.current.plan?.id).toBe("plan_fast");
    expect(result.current.plan?.vision).toBe("Fast plan");
  });
});
