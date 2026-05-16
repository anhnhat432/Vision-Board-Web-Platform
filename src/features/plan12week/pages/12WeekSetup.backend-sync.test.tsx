import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const { appMode, authContext, createGoal, updateGoal, createPlan, getPlan } = vi.hoisted(() => ({
  appMode: { value: "real" as "demo" | "real" },
  authContext: {
    useAuthContext: vi.fn(),
    useOptionalAuthContext: vi.fn(),
  },
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  createPlan: vi.fn(),
  getPlan: vi.fn(),
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => appMode.value,
  isDemoMode: () => appMode.value === "demo",
  isRealMode: () => appMode.value === "real",
  shouldSeedDemoData: () => appMode.value === "demo",
  shouldShowBillingDebugUi: () => false,
}));

vi.mock("@/app/utils/app-mode", () => ({
  getAppMode: () => appMode.value,
  isDemoMode: () => appMode.value === "demo",
  isRealMode: () => appMode.value === "real",
  shouldSeedDemoData: () => appMode.value === "demo",
  shouldShowBillingDebugUi: () => false,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContext.useAuthContext,
  useOptionalAuthContext: authContext.useOptionalAuthContext,
}));

vi.mock("@/services/goalService", () => ({
  createGoal,
  updateGoal,
}));

vi.mock("@/services/planService", () => ({
  createPlan,
  getPlan,
}));

import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { APP_STORAGE_KEYS, formatDateInputValue, getUserData, saveUserData } from '@/app/utils/storage';
import { TwelveWeekSetup } from "./12WeekSetup";

const INTEGRATION_TEST_TIMEOUT_MS = 20_000;

function setAuthReady() {
  const value = {
    user: { uid: "firebase_uid_1", email: "user@example.com" },
    userProfile: {
      id: "profile_1",
      firebaseUid: "firebase_uid_1",
      email: "user@example.com",
      displayName: "User",
      role: "user",
      onboardingCompletedAt: null,
      avatarUrl: null,
      locale: "vi",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };
  authContext.useAuthContext.mockReturnValue(value);
  authContext.useOptionalAuthContext.mockReturnValue(value);
}

function setAuthNotConfigured() {
  const value = {
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isConfigured: false,
  };
  authContext.useAuthContext.mockReturnValue(value);
  authContext.useOptionalAuthContext.mockReturnValue(value);
}

function setAuthSignedOut() {
  const value = {
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };
  authContext.useAuthContext.mockReturnValue(value);
  authContext.useOptionalAuthContext.mockReturnValue(value);
}

function buildPlanDetails(planId = "backend_plan_1", smartGoalId = "backend_goal_1") {
  return {
    plan: {
      id: planId,
      userId: "user_1",
      vision: "Giữ nhịp review trong 12 tuần.",
      smartGoalId,
      startDate: "2026-04-06T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    weeks: [
      {
        id: "backend_week_1",
        planId,
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

function seedReadyTwelveWeekSetup() {
  const todayDateKey = formatDateInputValue(new Date());
  const data = getUserData();
  data.onboardingCompleted = true;
  data.goals = [];
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  saveUserData(data);

  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: {
        goal_statement: "Ra mắt hệ thống review cá nhân giúp tôi giữ nhịp thực thi mỗi tuần.",
      },
      measurable: {
        metric_name: "Số tuần review hoàn thành",
        baseline_value: 0,
        target_value: 12,
      },
      achievable: {
        weekly_time_commitment_hours: 4,
        required_skills: ["Lập kế hoạch tuần"],
        support_resources: ["Dashboard 12 tuần"],
      },
      relevant: {
        motivation_reason: "Tôi cần một nhịp review rõ để không bỏ dở mục tiêu dài hạn.",
        life_dimension_alignment: "Sự nghiệp",
      },
      time_bound: {
        target_weeks: 12,
      },
      created_at: "2026-04-01T00:00:00.000Z",
    }),
  );
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    JSON.stringify({
      resultType: "realistic",
      resultTitle: "Khả thi",
      resultSummary: "Có đủ thời gian và nguồn lực để bắt đầu.",
      recommendation: "Đi tiếp với kế hoạch cân bằng.",
      readinessScore: 18,
      adjustedScore: 18,
      wheelScore: 7,
      diagnosticScore: 24,
      maxDiagnosticScore: 28,
      planLoad: "balanced",
      weeklyCapacity: "medium",
      bottleneck: {
        axis: "routine",
        label: "Lịch cố định",
        score: 3,
        action: "Khóa lịch review hằng tuần.",
      },
    }),
  );
  localStorage.setItem(
    APP_STORAGE_KEYS.pending12WeekSetupDraft,
    JSON.stringify({
      templateId: "",
      goalType: "Personal Growth",
      vision12Week: "Giữ nhịp review trong 12 tuần.",
      week12Outcome: "Hoàn thành 12 tuần review.",
      lagMetricName: "Số tuần review hoàn thành",
      lagMetricTarget: "12",
      lagMetricUnit: "tuần",
      leadIndicators: [
        {
          id: "indicator_1",
          name: "Chốt review tuần",
          target: "1",
          unit: "lần/tuần",
          type: "core",
          cadence: "spread",
        },
        {
          id: "indicator_2",
          name: "Hoàn thành việc trọng tâm",
          target: "2",
          unit: "lần/tuần",
          type: "core",
          cadence: "spread",
        },
      ],
      startDate: todayDateKey,
      reviewDay: "Sunday",
      tacticLoadPreference: "balanced",
      week4Milestone: "Giữ được 4 tuần đầu.",
      week8Milestone: "Giữ được 8 tuần.",
      successEvidence: "Có review đều và ít nhất một kết quả rõ.",
      dailyTimeBudget: "1h",
      preferredDays: [],
      personalConstraint: "",
    }),
  );
}

async function submitSetupFlow() {
  const router = createMemoryRouter(
    [
      { path: "/12-week-setup", element: <TwelveWeekSetup /> },
      { path: "/12-week-system", element: <div data-testid="system-page">12-week system</div> },
      { path: "/smart-goal-setup", element: <div>SMART setup</div> },
      { path: "/onboarding", element: <div>Onboarding</div> },
      { path: "/life-insight", element: <div>Life Insight</div> },
      { path: "/feasibility", element: <div>Feasibility</div> },
    ],
    { initialEntries: ["/12-week-setup"] },
  );

  render(<RouterProvider router={router} />);
  const user = userEvent.setup();

  expect(await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tiếp →" }));
  await user.click(screen.getByRole("button", { name: "Tiếp →" }));
  await user.click(screen.getByRole("button", { name: "Tiếp →" }));
  await user.click(screen.getByRole("button", { name: "Lưu kế hoạch" }));

  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/12-week-system");
  });

  const localGoal = getUserData().goals.find((goal) =>
    goal.title.includes("Ra mắt hệ thống review cá nhân"),
  );
  if (!localGoal) {
    throw new Error("Expected local 12-week goal to be saved.");
  }

  return { localGoal };
}

describe("12-week setup backend sync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    appMode.value = "real";
    setAuthReady();
    createGoal.mockReset();
    updateGoal.mockReset();
    createPlan.mockReset();
    getPlan.mockReset();
    createGoal.mockResolvedValue({ id: "backend_goal_1" });
    updateGoal.mockResolvedValue({ id: "backend_goal_1" });
    createPlan.mockResolvedValue(buildPlanDetails().plan);
    getPlan.mockResolvedValue(buildPlanDetails());
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("completes locally without backend calls in demo mode or when Firebase is not configured", async () => {
    appMode.value = "demo";
    setAuthNotConfigured();
    seedReadyTwelveWeekSetup();

    const { localGoal } = await submitSetupFlow();

    expect(localGoal.twelveWeekSystem).toBeDefined();
    expect(createGoal).not.toHaveBeenCalled();
    expect(createPlan).not.toHaveBeenCalled();
    expect(updateGoal).not.toHaveBeenCalled();
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("lets signed-out users preview setup steps but gates the final preview in real mode", async () => {
    appMode.value = "real";
    setAuthSignedOut();
    seedReadyTwelveWeekSetup();

    const router = createMemoryRouter(
      [
        { path: "/12-week-setup", element: <TwelveWeekSetup /> },
        { path: "/login", element: <div>Login</div> },
        { path: "/", element: <div>Home</div> },
      ],
      { initialEntries: ["/12-week-setup"] },
    );

    render(<RouterProvider router={router} />);
    const user = userEvent.setup();

    // Step 0 — preview-first: setup heading visible, login gate not yet shown
    expect(await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đăng nhập để bắt đầu" })).not.toBeInTheDocument();

    // Walk through steps 0 → 1 → 2 → 3
    await user.click(screen.getByRole("button", { name: "Tiếp →" }));
    await user.click(screen.getByRole("button", { name: "Tiếp →" }));
    await user.click(screen.getByRole("button", { name: "Tiếp →" }));

    // Step 3 — gate now appears alongside the preview
    expect(await screen.findByRole("heading", { name: "Đăng nhập để bắt đầu" })).toBeInTheDocument();
    expect(screen.getByText(/Tài khoản giúp lưu kế hoạch 12 tuần và đồng bộ giữa các thiết bị/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đăng nhập với Google" })).toHaveAttribute(
      "href",
      "/login?next=%2F12-week-setup",
    );
    expect(screen.getByRole("link", { name: "Quay về trang chính" })).toHaveAttribute("href", "/");
  });

  it("creates backend goal, syncs plan with backend goal id, stores links, then updates goal with plan id", async () => {
    seedReadyTwelveWeekSetup();

    const { localGoal } = await submitSetupFlow();

    await waitFor(() => {
      expect(updateGoal).toHaveBeenCalledWith("backend_goal_1", { planId: "backend_plan_1" });
    });
    expect(createGoal).toHaveBeenCalledTimes(1);
    expect(createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        smartGoalId: "backend_goal_1",
        vision: "Giữ nhịp review trong 12 tuần.",
        initializeWeeks: true,
        totalWeeks: 12,
      }),
    );
    expect(getBackendGoalId(localGoal.id)).toBe("backend_goal_1");
    expect(getPlanLink(localGoal.id)?.planId).toBe("backend_plan_1");
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("keeps local flow when backend goal creation fails and falls back to local goal id for plan sync", async () => {
    createGoal.mockRejectedValueOnce(new Error("goal sync failed"));
    seedReadyTwelveWeekSetup();

    const { localGoal } = await submitSetupFlow();

    await waitFor(() => {
      expect(createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          smartGoalId: localGoal.id,
        }),
      );
    });
    expect(localGoal.twelveWeekSystem).toBeDefined();
    expect(getBackendGoalId(localGoal.id)).toBeNull();
    expect(getPlanLink(localGoal.id)?.planId).toBe("backend_plan_1");
    expect(updateGoal).not.toHaveBeenCalled();
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("keeps local flow when backend plan sync fails and does not link an empty plan id", async () => {
    createPlan.mockRejectedValueOnce(new Error("plan sync failed"));
    seedReadyTwelveWeekSetup();

    const { localGoal } = await submitSetupFlow();

    await waitFor(() => {
      expect(createPlan).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(localGoal.twelveWeekSystem).toBeDefined();
    expect(getBackendGoalId(localGoal.id)).toBe("backend_goal_1");
    expect(getPlanLink(localGoal.id)).toBeNull();
    expect(updateGoal).not.toHaveBeenCalled();
  }, INTEGRATION_TEST_TIMEOUT_MS);
});
