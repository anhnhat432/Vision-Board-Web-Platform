import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { appMode, createPlan, getPlan, savePlanDetailsLink } = vi.hoisted(() => ({
  appMode: { value: "real" as "demo" | "real" },
  createPlan: vi.fn(),
  getPlan: vi.fn(),
  savePlanDetailsLink: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", () => ({
  getAppMode: () => appMode.value,
  isDemoMode: () => appMode.value === "demo",
  isRealMode: () => appMode.value === "real",
  shouldSeedDemoData: () => appMode.value === "demo",
  shouldShowBillingDebugUi: () => false,
}));

vi.mock("@/services/planService", () => ({
  createPlan,
  getPlan,
}));

vi.mock("../persistence/planLinkStore", () => ({
  savePlanDetailsLink,
}));

import { usePlanSetupSync } from "./usePlanSetupSync";

function buildPlanDetails() {
  return {
    plan: {
      id: "backend_plan_1",
      userId: "user_1",
      vision: "Ship a 12-week plan",
      smartGoalId: "backend_goal_1",
      startDate: "2026-04-06T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [],
  };
}

describe("usePlanSetupSync", () => {
  beforeEach(() => {
    appMode.value = "real";
    createPlan.mockReset();
    getPlan.mockReset();
    savePlanDetailsLink.mockReset();
    createPlan.mockResolvedValue(buildPlanDetails().plan);
    getPlan.mockResolvedValue(buildPlanDetails());
  });

  it("creates the backend plan with the backend goal id and stores details by local goal id", async () => {
    const { result } = renderHook(() => usePlanSetupSync());

    let planId: string | null = null;
    await act(async () => {
      planId = await result.current.actions.syncPlanForGoal({
        localGoalId: "local_goal_1",
        backendGoalId: "backend_goal_1",
        vision: "Ship a 12-week plan",
        startDate: "2026-04-06T00:00:00.000Z",
        totalWeeks: 12,
      });
    });

    expect(planId).toBe("backend_plan_1");
    expect(createPlan).toHaveBeenCalledWith({
      vision: "Ship a 12-week plan",
      smartGoalId: "backend_goal_1",
      startDate: "2026-04-06T00:00:00.000Z",
      initializeWeeks: true,
      totalWeeks: 12,
    });
    expect(savePlanDetailsLink).toHaveBeenCalledWith("local_goal_1", buildPlanDetails());
  });

  it("falls back to the local goal id when backend goal creation was not available", async () => {
    const { result } = renderHook(() => usePlanSetupSync());

    await act(async () => {
      await result.current.actions.syncPlanForGoal({
        localGoalId: "local_goal_1",
        vision: "Ship a local-first plan",
        startDate: "2026-04-06T00:00:00.000Z",
      });
    });

    expect(createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        smartGoalId: "local_goal_1",
      }),
    );
    expect(savePlanDetailsLink).toHaveBeenCalledWith("local_goal_1", buildPlanDetails());
  });

  it("does not call backend services in demo mode", async () => {
    appMode.value = "demo";
    const { result } = renderHook(() => usePlanSetupSync());

    let planId: string | null = "not-null";
    await act(async () => {
      planId = await result.current.actions.syncPlanForGoal({
        localGoalId: "local_goal_1",
        backendGoalId: "backend_goal_1",
        vision: "Ship a 12-week plan",
        startDate: "2026-04-06T00:00:00.000Z",
      });
    });

    expect(planId).toBeNull();
    expect(createPlan).not.toHaveBeenCalled();
    expect(getPlan).not.toHaveBeenCalled();
    expect(savePlanDetailsLink).not.toHaveBeenCalled();
  });
});
