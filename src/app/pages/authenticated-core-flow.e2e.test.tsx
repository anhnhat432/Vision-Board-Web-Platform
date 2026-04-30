import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { RootLayout } from "../components/RootLayout";
import { Onboarding } from "./Onboarding";
import { LifeInsight } from "./LifeInsight";
import { SMARTGoalSetup } from "./SMARTGoalSetup";
import { FeasibilityCheck } from "./FeasibilityCheck";
import { TwelveWeekSetup } from "./12WeekSetup";
import { TwelveWeekSystem } from "./12WeekSystem";
import { APP_STORAGE_KEYS, activateAuthenticatedUserData, getUserData, saveUserData } from "../utils/storage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const backendHydrationMock = vi.hoisted(() => ({
  value: {
    loading: false,
    result: null,
    error: null,
  },
  hydrateTwelveWeekPlansFromBackend: vi.fn(),
  applyBackendPlanSnapshotToLocal: vi.fn(),
}));

const productionMock = vi.hoisted(() => ({
  getBillingProviderStatus: vi.fn(),
  getBrowserNotificationStatus: vi.fn(),
  getLastEntitlementSyncSnapshot: vi.fn(),
  getLastOutboxSyncSnapshot: vi.fn(),
  getLastRestoreAccessSnapshot: vi.fn(),
  maybeShowBrowserReminderNotification: vi.fn(),
  openBillingCustomerPortal: vi.fn(),
  requestBrowserNotificationPermission: vi.fn(),
  restorePlanAccess: vi.fn(),
  sendTestBrowserNotification: vi.fn(),
  startCheckoutFlow: vi.fn(),
  syncEntitlementsWithProvider: vi.fn(),
  syncPendingOutbox: vi.fn(),
}));

const goalServiceMock = vi.hoisted(() => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
}));

const planHookMock = vi.hoisted(() => ({
  syncPlanForGoal: vi.fn(),
  syncLocalSnapshot: vi.fn(),
  syncTaskToggle: vi.fn(),
  syncWeeklyReview: vi.fn(),
  syncDailyCheckIn: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("../hooks/useBackendPlanHydration", () => ({
  BACKEND_PLAN_HYDRATION_EVENT_NAME: "visionboard:backend-hydrated",
  useBackendPlanHydration: () => backendHydrationMock.value,
  hydrateTwelveWeekPlansFromBackend: backendHydrationMock.hydrateTwelveWeekPlansFromBackend,
  applyBackendPlanSnapshotToLocal: backendHydrationMock.applyBackendPlanSnapshotToLocal,
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
}));

vi.mock("../utils/production", () => ({
  getBillingProviderStatus: productionMock.getBillingProviderStatus,
  getBrowserNotificationStatus: productionMock.getBrowserNotificationStatus,
  getLastEntitlementSyncSnapshot: productionMock.getLastEntitlementSyncSnapshot,
  getLastOutboxSyncSnapshot: productionMock.getLastOutboxSyncSnapshot,
  getLastRestoreAccessSnapshot: productionMock.getLastRestoreAccessSnapshot,
  maybeShowBrowserReminderNotification: productionMock.maybeShowBrowserReminderNotification,
  openBillingCustomerPortal: productionMock.openBillingCustomerPortal,
  requestBrowserNotificationPermission: productionMock.requestBrowserNotificationPermission,
  restorePlanAccess: productionMock.restorePlanAccess,
  sendTestBrowserNotification: productionMock.sendTestBrowserNotification,
  startCheckoutFlow: productionMock.startCheckoutFlow,
  syncEntitlementsWithProvider: productionMock.syncEntitlementsWithProvider,
  syncPendingOutbox: productionMock.syncPendingOutbox,
}));

vi.mock("@/services/goalService", () => ({
  createGoal: goalServiceMock.createGoal,
  updateGoal: goalServiceMock.updateGoal,
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlanSetupSync: () => ({
    loading: false,
    error: null,
    data: { lastSyncedPlanId: null },
    actions: {
      syncPlanForGoal: planHookMock.syncPlanForGoal,
      clearError: vi.fn(),
    },
  }),
  usePlanExecutionSync: () => ({
    loading: false,
    error: null,
    data: { lastSnapshot: null },
    actions: {
      syncLocalSnapshot: planHookMock.syncLocalSnapshot,
      syncTaskToggle: planHookMock.syncTaskToggle,
      syncWeeklyReview: planHookMock.syncWeeklyReview,
      syncDailyCheckIn: planHookMock.syncDailyCheckIn,
      clearError: vi.fn(),
    },
  }),
}));

function setSignedInAuthContext() {
  authContextMock.useAuthContext.mockReturnValue({
    user: {
      uid: "firebase_uid_new_user",
      email: "new-user@example.com",
      displayName: "New User",
    },
    userProfile: {
      id: "profile_new_user",
      email: "new-user@example.com",
      displayName: "New User",
    },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  });
}

function renderAuthenticatedCoreFlow(initialEntry = "/") {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <div data-testid="login-page">Login page</div> },
      {
        path: "/",
        element: <RootLayout />,
        children: [
          { index: true, element: <div data-testid="home-page">Home page</div> },
          { path: "onboarding", element: <Onboarding /> },
          { path: "life-balance", element: <div data-testid="life-balance-page">Life Balance</div> },
          { path: "life-insight", element: <LifeInsight /> },
          { path: "smart-goal-setup", element: <SMARTGoalSetup /> },
          { path: "feasibility", element: <FeasibilityCheck /> },
          { path: "12-week-setup", element: <TwelveWeekSetup /> },
          { path: "12-week-system", element: <TwelveWeekSystem /> },
          { path: "goals", element: <div data-testid="goals-page">Goals</div> },
          { path: "journal", element: <div data-testid="journal-page">Journal</div> },
          {
            element: <ProtectedRoute />,
            children: [{ path: "order", element: <div data-testid="order-page">Order</div> }],
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

function seedAnonymousStaleGoal() {
  const data = getUserData();
  data.goals = [
    {
      id: "goal_anonymous_leak",
      category: "Career",
      title: "Anonymous stale goal must stay hidden",
      description: "This goal belongs to the browser before login.",
      deadline: "2026-06-06",
      tasks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ] as typeof data.goals;
  data.onboardingCompleted = true;
  saveUserData(data);
}

async function fillSmartGoal(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText("Câu trả lời của bạn"),
    "Ra mắt hệ thống review cá nhân giúp tôi giữ nhịp thực thi mỗi tuần.",
  );
  await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

  await user.type(await screen.findByLabelText("Con số hoặc dấu hiệu theo dõi"), "Số tuần review hoàn chỉnh");
  await user.type(screen.getByLabelText(/Mốc hiện tại/i), "0");
  await user.type(screen.getByLabelText(/Mốc mục tiêu/i), "12");
  await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

  await user.type(await screen.findByLabelText("Thời gian mỗi tuần"), "6");
  await user.type(screen.getByLabelText("Kỹ năng cần có"), "Lập kế hoạch\nReview tuần");
  await user.type(screen.getByLabelText("Nguồn lực hỗ trợ"), "Lịch cá nhân và dashboard 12 tuần");
  await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

  await user.type(
    await screen.findByLabelText("Lý do bạn thật sự muốn theo đuổi"),
    "Tôi cần một nhịp review đủ rõ để không bỏ dở mục tiêu dài hạn.",
  );
  await user.type(screen.getByLabelText(/Lĩnh vực cuộc sống liên quan/i), "Sự nghiệp");
  await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

  await screen.findByLabelText("Số tuần mục tiêu");
  await user.click(screen.getByRole("button", { name: "Tiếp theo: kiểm tra tính thực tế" }));
}

async function completeFeasibility(user: ReturnType<typeof userEvent.setup>) {
  const answers = [
    /Hơn 5 giờ mỗi tuần/i,
    /Còn khá tốt và chủ động được/i,
    /Đủ để bắt đầu ngay/i,
    /Rất thực tế/i,
    /Hiện chưa thấy trở ngại lớn/i,
    /Đã có khung giờ khá cố định/i,
    /Cam kết hoàn toàn/i,
  ];

  for (const [index, answer] of answers.entries()) {
    await user.click(await screen.findByLabelText(answer));
    await user.click(
      screen.getByRole("button", {
        name: index === answers.length - 1 ? "Hoàn thành đánh giá" : "Tiếp theo",
      }),
    );
  }

  await user.click(await screen.findByRole("button", { name: "Tạo kế hoạch 12 tuần" }));
}

async function completeTwelveWeekSetup(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" });
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

  const tacticInputs = await screen.findAllByLabelText("Tên việc");
  await user.clear(tacticInputs[0]);
  await user.type(tacticInputs[0], "Chốt review tuần");
  await user.clear(tacticInputs[1]);
  await user.type(tacticInputs[1], "Hoàn thành việc trọng tâm");

  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await user.click(screen.getByRole("button", { name: "Tạo kế hoạch 12 tuần" }));
}

describe("authenticated new user core flow", () => {
  beforeEach(() => {
    localStorage.clear();
    setSignedInAuthContext();
    backendHydrationMock.value = {
      loading: false,
      result: null,
      error: null,
    };
    backendHydrationMock.hydrateTwelveWeekPlansFromBackend.mockResolvedValue({
      status: "success",
      message: "No backend plans to hydrate.",
      hydratedCount: 0,
      updatedCount: 0,
      conflictCount: 0,
      conflicts: [],
      latestGoalId: null,
    });
    backendHydrationMock.applyBackendPlanSnapshotToLocal.mockResolvedValue({ status: "success" });
    productionMock.getBillingProviderStatus.mockReturnValue({
      mode: "none",
      providerLabel: "Chưa cấu hình",
      checkoutReady: false,
      restoreReady: false,
      entitlementSyncReady: false,
      manageBillingReady: false,
    });
    productionMock.getBrowserNotificationStatus.mockReturnValue("default");
    productionMock.getLastEntitlementSyncSnapshot.mockReturnValue(null);
    productionMock.getLastOutboxSyncSnapshot.mockReturnValue(null);
    productionMock.getLastRestoreAccessSnapshot.mockReturnValue(null);
    productionMock.openBillingCustomerPortal.mockResolvedValue({ ok: false });
    productionMock.requestBrowserNotificationPermission.mockResolvedValue(false);
    productionMock.restorePlanAccess.mockResolvedValue({ ok: false });
    productionMock.sendTestBrowserNotification.mockResolvedValue(false);
    productionMock.startCheckoutFlow.mockResolvedValue({
      ok: false,
      status: "not_configured",
      providerMode: "none",
      providerLabel: "Chưa cấu hình",
      message: "Checkout provider is not configured.",
    });
    productionMock.syncEntitlementsWithProvider.mockResolvedValue({ ok: false });
    productionMock.syncPendingOutbox.mockResolvedValue({
      status: "idle",
      message: "No pending outbox items.",
      attemptedCount: 0,
      syncedCount: 0,
      failedCount: 0,
      archivedCount: 0,
      at: new Date().toISOString(),
    });
    goalServiceMock.createGoal.mockResolvedValue({ id: "backend_goal_1" });
    goalServiceMock.updateGoal.mockResolvedValue({ id: "backend_goal_1" });
    planHookMock.syncPlanForGoal.mockResolvedValue("backend_plan_1");
    planHookMock.syncLocalSnapshot.mockResolvedValue({
      status: "success",
      message: "Synced local snapshot.",
      attemptedCount: 0,
      syncedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      at: new Date().toISOString(),
    });
    planHookMock.syncTaskToggle.mockResolvedValue(true);
    planHookMock.syncWeeklyReview.mockResolvedValue(true);
    planHookMock.syncDailyCheckIn.mockResolvedValue(true);
  });

  it("starts clean after login, completes the core flow, and restores the 12-week system after reload", async () => {
    seedAnonymousStaleGoal();
    activateAuthenticatedUserData("firebase_uid_new_user");
    expect(getUserData().goals).toEqual([]);

    const user = userEvent.setup();
    const { router, ui } = renderAuthenticatedCoreFlow("/");

    expect(await screen.findByText(/Tạo một điểm bắt đầu đủ rõ/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
    expect(screen.queryByText("Anonymous stale goal must stay hidden")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Skip for now" }));

    await user.click(screen.getByRole("button", { name: "Chấm Life Balance" }));
    await user.click(await screen.findByRole("button", { name: "Hoàn thành đánh giá" }));

    expect(await screen.findByText(/Bạn đã có một tín hiệu rất rõ/i)).toBeInTheDocument();
    expect(getUserData().onboardingCompleted).toBe(true);
    expect(getUserData().goals).toEqual([]);

    await user.click(screen.getAllByRole("button", { name: /Tạo mục tiêu với/i })[0]);
    await fillSmartGoal(user);
    await completeFeasibility(user);
    await completeTwelveWeekSetup(user);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/12-week-system");
    });
    expect(await screen.findByText("Nhịp 12 tuần")).toBeInTheDocument();

    const dataAfterSetup = getUserData();
    expect(dataAfterSetup.goals).toHaveLength(1);
    expect(dataAfterSetup.goals[0]?.title).toContain("Ra mắt hệ thống review cá nhân");
    expect(dataAfterSetup.goals[0]?.twelveWeekSystem?.taskInstances.length).toBeGreaterThan(0);
    expect(dataAfterSetup.eventLog.some((event) => event.type === "12_week_plan_created")).toBe(true);
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult)).toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe(dataAfterSetup.goals[0]?.id);
    await waitFor(() => {
      expect(planHookMock.syncPlanForGoal).toHaveBeenCalledTimes(1);
    });
    expect(planHookMock.syncPlanForGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        localGoalId: dataAfterSetup.goals[0]?.id,
        backendGoalId: "backend_goal_1",
      }),
    );
    await waitFor(() => {
      expect(goalServiceMock.updateGoal).toHaveBeenCalledWith("backend_goal_1", { planId: "backend_plan_1" });
    });

    ui.unmount();

    const reloadRender = renderAuthenticatedCoreFlow("/12-week-system");
    expect(await screen.findByText("Nhịp 12 tuần")).toBeInTheDocument();
    expect(screen.getByText(/Ra mắt hệ thống review cá nhân/i)).toBeInTheDocument();
    expect(getUserData().goals).toHaveLength(1);

    reloadRender.ui.unmount();
  }, 40_000);
});
