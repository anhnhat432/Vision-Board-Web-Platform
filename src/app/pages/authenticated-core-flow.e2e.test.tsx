import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { RootLayout } from "../components/RootLayout";
import { markFirstRunGuidanceCompleted, markNewUserGuideSeen } from "../utils/new-user-guide";
import { APP_STORAGE_KEYS, activateAuthenticatedUserData, getUserData, saveUserData } from "../utils/storage";
import { TwelveWeekSetup } from "./12WeekSetup";
import { TwelveWeekSystem } from "./12WeekSystem";
import { FeasibilityCheck } from "./FeasibilityCheck";
import { LifeBalance } from "./LifeBalance";
import { LifeInsight } from "./LifeInsight";
import { Onboarding } from "./Onboarding";
import { SMARTGoalSetup } from "./SMARTGoalSetup";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
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

const originalWindowAddEventListener = window.addEventListener.bind(window);

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
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
  shouldEnable12WeekMutationSync: () => false,
  shouldEnable12WeekPullSync: () => false,
  shouldEnable12WeekGoalTombstoneSync: () => true,
  shouldEnable12WeekImportDryRun: () => false,
  shouldEnable12WeekCloudImport: () => false,
  isPaidCheckoutDisabled: () => false,
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
  const context = {
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
  };
  authContextMock.useAuthContext.mockReturnValue(context);
  authContextMock.useOptionalAuthContext.mockReturnValue(context);
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
          { path: "life-balance", element: <LifeBalance /> },
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

function _seedAnonymousStaleGoal() {
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

function getEnabledButton(name: string | RegExp) {
  const button = screen.getAllByRole("button", { name }).find((item) => !item.hasAttribute("disabled"));
  expect(button).toBeInTheDocument();
  return button as HTMLElement;
}

async function findEnabledButton(name: string | RegExp, timeout = 5000) {
  let button: HTMLElement | undefined;

  await waitFor(
    () => {
      button = getEnabledButton(name);
      expect(button).toBeEnabled();
    },
    { timeout },
  );

  return button as HTMLElement;
}

async function clickSetupNext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await findEnabledButton(/Sắp xếp hành động cam kết|Thiết lập lịch trình|Xem trước kế hoạch Hôm nay/i),
  );
}

async function fillSmartGoal(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText(/Mục tiêu cụ thể của bạn/i, {}, { timeout: 5000 }),
    "Ra mắt hệ thống review cá nhân giúp tôi giữ nhịp thực thi mỗi tuần.",
  );
  await user.click(getEnabledButton(/Lưu mục tiêu cụ thể/i));

  await user.type(
    await screen.findByLabelText(/Tên chỉ số đo lường/i, {}, { timeout: 5000 }),
    "Số tuần review hoàn chỉnh",
  );
  await user.type(screen.getByLabelText(/Đơn vị đo lường/i), "tuần");
  await user.type(screen.getByLabelText(/Mức xuất phát/i), "0");
  await user.type(screen.getByLabelText(/Mức đích cần đạt/i), "12");
  await user.click(getEnabledButton(/Xác nhận chỉ số đo/i));

  // Đối với AchievableStep, nhãn là "Thời gian bạn dành cho mục tiêu mỗi tuần"
  const slider = await screen.findByLabelText(/Thời gian bạn dành cho mục tiêu/i, {}, { timeout: 5000 });
  fireEvent.change(slider, { target: { value: "6" } });
  await user.type(screen.getByLabelText(/Kỹ năng bạn muốn tập trung rèn luyện/i), "Lập kế hoạch\nReview tuần");
  await user.type(screen.getByLabelText(/Nguồn lực và công cụ hỗ trợ bạn/i), "Lịch cá nhân và dashboard 12 tuần");
  await user.click(getEnabledButton(/Thiết lập thời gian cam kết/i));

  await user.type(
    await screen.findByLabelText(/Vì sao mục tiêu này thực sự quan trọng/i, {}, { timeout: 5000 }),
    "Tôi cần một nhịp review đủ rõ để không bỏ dở mục tiêu dài hạn.",
  );
  await user.type(screen.getByLabelText(/Khía cạnh cuộc sống bạn muốn liên kết/i), "Sự nghiệp");
  await user.click(getEnabledButton(/Xác nhận động lực này/i));

  await screen.findByLabelText(/Số tuần bạn cam kết/i, {}, { timeout: 5000 });
  await user.click(getEnabledButton(/Kiểm tra khả thi nâng cao/i));
}

async function completeFeasibility(user: ReturnType<typeof userEvent.setup>) {
  const steps = [
    { question: /Mỗi tuần bạn có mấy giờ/i, answer: /Trên 5/i },
    { question: /Năng lượng còn lại/i, answer: /Dồi dào/i },
    { question: /Độ tự tin hoàn thành/i, answer: /chiến đấu/i },
  ];

  for (const [index, step] of steps.entries()) {
    await screen.findByRole("heading", { name: step.question }, { timeout: 5000 });
    await user.click(await screen.findByLabelText(step.answer, {}, { timeout: 5000 }));
    await user.click(getEnabledButton(index === steps.length - 1 ? /Xem phân tích khả thi/i : /Tiếp theo/i));
  }

  await user.click(await findEnabledButton(/Bắt đầu lập Kế hoạch 12 tuần ngay/i));
}

async function completeTwelveWeekSetup(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: /Tạo kế hoạch 12 tuần/i, level: 1 }, { timeout: 5000 });
  await clickSetupNext(user);

  const tacticInputs = await screen.findAllByLabelText("Tên việc");
  await user.clear(tacticInputs[0]);
  await user.type(tacticInputs[0], "Chốt review tuần");
  await user.clear(tacticInputs[1]);
  await user.type(tacticInputs[1], "Hoàn thành việc trọng tâm");

  await clickSetupNext(user);
  await clickSetupNext(user);
  await user.click(await findEnabledButton(/Lưu kế hoạch/i));
}

async function dismissScreenGuideIfOpen(user: ReturnType<typeof userEvent.setup>) {
  const gotItButton = await screen
    .findByRole("button", { name: /Tôi đã hiểu/i }, { timeout: 1200 })
    .catch(() => null);

  if (gotItButton) {
    await user.click(gotItButton);
  }
}

describe("authenticated new user core flow", () => {
  beforeEach(() => {
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (typeof options === "object" && options !== null && "signal" in options) {
        const sanitizedOptions = { ...(options as AddEventListenerOptions & { signal?: unknown }) };
        delete sanitizedOptions.signal;
        return originalWindowAddEventListener(type, listener, sanitizedOptions);
      }

      return originalWindowAddEventListener(type, listener, options);
    }) as typeof window.addEventListener;

    localStorage.clear();
    markNewUserGuideSeen();
    markFirstRunGuidanceCompleted();
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

  afterEach(() => {
    window.addEventListener = originalWindowAddEventListener;
  });

  it("starts clean after login, completes the core flow, and restores the 12-week system after reload", async () => {
    activateAuthenticatedUserData("firebase_uid_new_user");
    expect(getUserData().goals).toEqual([]);

    const user = userEvent.setup();
    const { router, ui } = renderAuthenticatedCoreFlow("/");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
    expect(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i })).toBeInTheDocument();
    expect(screen.getByTestId("email-verification-banner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mở bản đồ cuộc sống/i }));
    for (let i = 0; i < 8; i++) {
      const slider = await screen.findByRole("slider");
      slider.focus();
      await user.keyboard("{ArrowRight}");
      if (i < 7) {
        await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
      } else {
        await user.click(screen.getByRole("button", { name: /Chọn trọng tâm.*Dùng điểm mặc định/i }));
      }
    }

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/life-balance");
    });
    await dismissScreenGuideIfOpen(user);
    expect(await screen.findByRole("heading", { name: /Bức tranh hiện tại của bạn/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Trọng tâm/i }));
    await user.click(await screen.findByRole("link", { name: /Xem bản đầy đủ trang Góc nhìn/i }, { timeout: 5000 }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/life-insight");
    });
    await dismissScreenGuideIfOpen(user);
    expect(await screen.findByRole("heading", { name: /Chọn một điểm tựa cho 12 tuần tới/i })).toBeInTheDocument();
    expect(getUserData().onboardingCompleted).toBe(true);
    expect(getUserData().goals).toEqual([]);

    await user.click(screen.getAllByRole("button", { name: /Tiếp → Viết mục tiêu/i })[0]);
    await fillSmartGoal(user);
    await completeFeasibility(user);
    await completeTwelveWeekSetup(user);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/12-week-system");
    });
    expect((await screen.findAllByText(/Hệ thống 12 tuần/i, {}, { timeout: 10000 })).length).toBeGreaterThan(0);

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
    expect((await screen.findAllByText(/Hệ thống 12 tuần/i, {}, { timeout: 10000 })).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ra mắt hệ thống review cá nhân/i)).toBeInTheDocument();
    expect(getUserData().goals).toHaveLength(1);

    reloadRender.ui.unmount();
  }, 80_000);
});
