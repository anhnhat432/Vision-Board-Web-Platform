import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeasibilityCheck } from "./FeasibilityCheck";
import { LifeInsight } from "./LifeInsight";
import { SMARTGoalSetup } from "./SMARTGoalSetup";
import { TwelveWeekSetup } from "./12WeekSetup";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "../utils/storage";

const planSetupSyncMock = vi.hoisted(() => ({
  syncPlanForGoal: vi.fn(),
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlanSetupSync: () => ({
    loading: false,
    error: null,
    data: { lastSyncedPlanId: null },
    actions: {
      syncPlanForGoal: planSetupSyncMock.syncPlanForGoal,
      clearError: vi.fn(),
    },
  }),
}));

function renderCoreFunnel(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
      { path: "/life-insight", element: <LifeInsight /> },
      { path: "/smart-goal-setup", element: <SMARTGoalSetup /> },
      { path: "/feasibility", element: <FeasibilityCheck /> },
      { path: "/12-week-setup", element: <TwelveWeekSetup /> },
    ],
    { initialEntries: [initialEntry] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

function seedRealLifeBalanceWithoutInsight() {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  saveUserData(data);
}

function seedStaleGoalDrafts() {
  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: {
        goal_statement: "Ship a stable first-session funnel guard for new users",
      },
      measurable: {
        metric_name: "guarded routes",
        target_value: 4,
      },
      achievable: {
        weekly_time_commitment_hours: 4,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "This protects the core onboarding flow from stale local drafts.",
      },
      time_bound: {
        target_weeks: 12,
      },
    }),
  );
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    JSON.stringify({
      resultType: "realistic",
      resultTitle: "Khả thi",
      resultSummary: "Draft cũ này không được phép vượt qua guard khi thiếu Life Balance.",
      recommendation: "Quay lại Life Balance trước.",
      readinessScore: 16,
      adjustedScore: 16,
      wheelScore: 7,
    }),
  );
}

describe("core funnel guards", () => {
  beforeEach(() => {
    localStorage.clear();
    const data = getUserData();
    data.onboardingCompleted = false;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
    data.goals = [];
    data.reflections = [];
    data.syncOutbox = [];
    saveUserData(data);
    planSetupSyncMock.syncPlanForGoal.mockReset();
    planSetupSyncMock.syncPlanForGoal.mockResolvedValue("plan_backend_1");
  });

  it("treats the default zero-score wheel as missing Life Balance data", async () => {
    renderCoreFunnel("/life-insight");

    expect(await screen.findByRole("heading", { name: "Chưa có dữ liệu cân bằng cuộc sống" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đi tới Onboarding" })).toBeInTheDocument();
  });

  it("blocks direct SMART Goal access when Life Balance has not been completed", async () => {
    renderCoreFunnel("/smart-goal-setup");

    expect(await screen.findByRole("heading", { name: "Hoàn thành bước cân bằng trước" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Câu trả lời của bạn")).not.toBeInTheDocument();
  });

  it("blocks direct SMART Goal access when Life Insight has been skipped", async () => {
    seedRealLifeBalanceWithoutInsight();
    const user = userEvent.setup();
    const { router } = renderCoreFunnel("/smart-goal-setup");

    expect(await screen.findByRole("heading", { name: "Chọn trọng tâm trước" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mở bước chọn trọng tâm" }));

    expect(router.state.location.pathname).toBe("/life-insight");
  });

  it.each([
    "/feasibility",
    "/12-week-setup",
  ])("redirects %s to onboarding when only stale draft data exists", async (initialEntry) => {
    seedStaleGoalDrafts();
    const { router } = renderCoreFunnel(initialEntry);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
  });
});
