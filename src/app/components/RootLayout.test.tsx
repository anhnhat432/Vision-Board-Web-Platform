import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
import { activateAuthenticatedUserData, getUserData, resetUserDataCache, saveUserData } from "../utils/storage";
import { getScopedUserDataStorageKey } from "../utils/storage-auth-scope";
import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
} from "../utils/storage-constants";
import { createEmptyUserData } from "../utils/storage-demo-data";
import type { Goal, UserData } from "../utils/storage-types";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootLayout } from "./RootLayout";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));
const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
  shouldEnable12WeekImportDryRun: vi.fn(() => true),
  shouldEnable12WeekCloudImport: vi.fn(() => true),
}));
const apiClientMock = vi.hoisted(() => ({
  isApiBaseUrlConfigured: vi.fn(() => true),
}));
const syncServiceMock = vi.hoisted(() => ({
  post12WeekImportValidation: vi.fn(),
  post12WeekImport: vi.fn(),
}));
const backendHydrationMock = vi.hoisted(() => ({
  value: {
    loading: false,
    result: null,
    error: null,
  },
}));
const autoCloudSyncMock = vi.hoisted(() => {
  const triggerSyncNow = vi.fn();
  const triggerDrainOnly = vi.fn();
  const resolveConflictKeepLocal = vi.fn();
  const resolveConflictUseCloud = vi.fn();
  const clearFirstLoginRestoreSummary = vi.fn();
  return {
    clearFirstLoginRestoreSummary,
    resolveConflictKeepLocal,
    resolveConflictUseCloud,
    triggerDrainOnly,
    triggerSyncNow,
    useAutoCloudSync: vi.fn<() => AutoCloudSyncState>(() => ({
      loading: false,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 0,
      online: true,
      conflictPending: false,
      syncing: false,
      firstLoginRestoreSummary: null,
      triggerSyncNow,
      triggerDrainOnly,
      resolveConflictKeepLocal,
      resolveConflictUseCloud,
      clearFirstLoginRestoreSummary,
    })),
  };
});
const productionMock = vi.hoisted(() => ({
  getLastOutboxSyncSnapshot: vi.fn(() => null),
  maybeShowBrowserReminderNotification: vi.fn(),
  syncEntitlementsWithProvider: vi.fn(),
  syncPendingOutbox: vi.fn(),
}));
const pageTourMock = vi.hoisted(() => ({
  startPageTour: vi.fn(),
}));
const screenGuideMock = vi.hoisted(() => ({
  startScreenGuide: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/features/plan12week/hooks/useAutoCloudSync", () => ({
  useAutoCloudSync: autoCloudSyncMock.useAutoCloudSync,
}));

vi.mock("../hooks/useBackendPlanHydration", () => ({
  BACKEND_PLAN_HYDRATION_EVENT_NAME: "visionboard:backend-hydrated",
  useBackendPlanHydration: () => backendHydrationMock.value,
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => (appModeMock.isDemoMode() ? "demo" : "real"),
  isDemoMode: appModeMock.isDemoMode,
  isRealMode: () => !appModeMock.isDemoMode(),
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  shouldEnable12WeekImportDryRun: appModeMock.shouldEnable12WeekImportDryRun,
  shouldEnable12WeekCloudImport: appModeMock.shouldEnable12WeekCloudImport,
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: apiClientMock.isApiBaseUrlConfigured,
}));

vi.mock("@/services/syncService", () => ({
  post12WeekImportValidation: syncServiceMock.post12WeekImportValidation,
  post12WeekImport: syncServiceMock.post12WeekImport,
}));

vi.mock("../utils/production", () => ({
  getLastOutboxSyncSnapshot: productionMock.getLastOutboxSyncSnapshot,
  maybeShowBrowserReminderNotification: productionMock.maybeShowBrowserReminderNotification,
  syncEntitlementsWithProvider: productionMock.syncEntitlementsWithProvider,
  syncPendingOutbox: productionMock.syncPendingOutbox,
}));

vi.mock("@/app/features/assistant/AIAssistant", () => ({
  AIAssistant: () => <div data-testid="ai-assistant" />,
}));

vi.mock("../hooks/usePageTour", () => ({
  startPageTour: pageTourMock.startPageTour,
}));

vi.mock("./ScreenGuide", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ScreenGuide")>();
  return {
    ...actual,
    startScreenGuide: screenGuideMock.startScreenGuide,
  };
});

function setAuthContext(overrides: Record<string, unknown> = {}) {
  authContextMock.useAuthContext.mockReturnValue({
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
    ...overrides,
  });
}

function createFreshUserData(): UserData {
  return createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function createRealGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal_real_1",
    category: "Career",
    title: "Prepare account migration",
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-04-30T00:00:00.000Z",
    ...overrides,
  };
}

function createTwelveWeekSystem(): NonNullable<Goal["twelveWeekSystem"]> {
  return {
    goalType: "Project",
    vision12Week: "Validate cloud import dry-run without writing cloud data",
    lagMetric: { name: "Tester feedback", unit: "responses", target: "5", currentValue: "1" },
    leadIndicators: [{ id: "lead_1", name: "User interview", target: "1", unit: "session/week" }],
    milestones: { week4: "First signal", week8: "Clear pattern", week12: "Decision ready" },
    successEvidence: "A safe dry-run report is available.",
    reviewDay: "Sunday",
    week12Outcome: "Know whether import payload is cloud-ready",
    startDate: "2026-04-30",
    endDate: "2026-07-23",
    timezone: "Asia/Saigon",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Start",
        focus: "Validate the import contract",
        milestone: "One dry-run result",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "task_private_1",
        weekNumber: 1,
        scheduledDate: "2026-04-30",
        title: "Private task title should stay first-party only",
        leadIndicatorName: "User interview",
        isCore: true,
        completed: false,
      },
    ],
    dailyCheckIns: [
      {
        date: "2026-04-30",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "User interview",
        amountDone: "1 session",
        outputCreated: "Private check-in output",
        obstacleOrIssue: "",
        dailySelfRating: 4,
        optionalNote: "Private check-in note should not go to external analytics",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 75,
        lagProgressValue: "1 response",
        biggestOutputThisWeek: "Private review output",
        mainObstacle: "Private review obstacle",
        nextWeekPriority: "Private review priority",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 8,
        disciplineScore: 7,
        focusScore: 8,
        improvementScore: 7,
        outputQualityScore: 8,
        completedLeadIndicators: 1,
      },
    ],
    scoreboard: [],
  };
}

function _seedMeaningfulAnonymousTwelveWeekData() {
  const data = createFreshUserData();
  data.goals.push(
    createRealGoal({
      description: "Private goal description should stay first-party only",
      twelveWeekSystem: createTwelveWeekSystem(),
    }),
  );
  seedAnonymousData(data);
  return data;
}

function seedAnonymousData(data: UserData) {
  localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));
}

function seedMeaningfulAnonymousData() {
  const data = createFreshUserData();
  data.goals.push(createRealGoal());
  seedAnonymousData(data);
  return data;
}

function seedAuthenticatedCompletedWorkspace(uid = "user_test") {
  activateAuthenticatedUserData(uid);
  const data = createFreshUserData();
  data.onboardingCompleted = true;
  saveUserData(data);
}

function seedPlusSubscription(uid = "user_test") {
  activateAuthenticatedUserData(uid);
  const data = createFreshUserData();
  const grantedAt = "2026-05-01T00:00:00.000Z";
  const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  data.onboardingCompleted = true;
  data.subscription = {
    planCode: "PLUS",
    status: "active",
    billingCycle: "monthly",
    startedAt: grantedAt,
    renewsAt,
    providerMode: "api_contract",
  };
  data.entitlements = [
    { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
    { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
  ];
  saveUserData(data);
}

function renderAppShell(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <div data-testid="login-page">Login page</div> },
      {
        path: "/",
        element: <RootLayout />,
        children: [
          { index: true, element: <div data-testid="home-page">Home page</div> },
          { path: "onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
          { path: "vision", element: <div data-testid="vision-page">Vision page</div> },
          { path: "vision-board/:id?", element: <div data-testid="vision-board-page">Vision board page</div> },
          { path: "gallery", element: <div data-testid="gallery-page">Gallery page</div> },
          { path: "life-insight", element: <div data-testid="life-insight-page">Life insight page</div> },
          { path: "smart-goal-setup", element: <div data-testid="smart-goal-setup-page">Smart goal setup page</div> },
          { path: "feasibility", element: <div data-testid="feasibility-page">Feasibility page</div> },
          { path: "12-week-setup", element: <div data-testid="twelve-week-setup-page">12-week setup page</div> },
          { path: "goals", element: <div data-testid="goals-page">Goals page</div> },
          { path: "settings", element: <div data-testid="settings-page">Settings page</div> },
          { path: "billing/plan", element: <div data-testid="billing-plan-page">Billing plan page</div> },
          { path: "billing/confirm", element: <div data-testid="billing-confirm-page">Confirm checkout</div> },
          { path: "billing/checkout/:orderId?", element: <div data-testid="billing-checkout-page">Checkout page</div> },
          {
            element: <ProtectedRoute />,
            children: [{ path: "order", element: <div data-testid="order-page">Order page</div> }],
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

describe("RootLayout onboarding redirect", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    localStorage.setItem("visionboard_new_user_guide_seen_at", new Date().toISOString());
    backendHydrationMock.value = {
      loading: false,
      result: null,
      error: null,
    };
    appModeMock.isDemoMode.mockReturnValue(false);
    appModeMock.shouldEnable12WeekImportDryRun.mockReturnValue(true);
    appModeMock.shouldEnable12WeekCloudImport.mockReturnValue(true);
    apiClientMock.isApiBaseUrlConfigured.mockReturnValue(true);
    syncServiceMock.post12WeekImportValidation.mockReset();
    syncServiceMock.post12WeekImport.mockReset();
    syncServiceMock.post12WeekImportValidation.mockResolvedValue({
      status: "valid",
      mode: "validate_only",
      dryRun: true,
      acceptedEntityCounts: {
        goals: 1,
        plans: 1,
        weeks: 1,
        tasks: 1,
        leadIndicators: 1,
        leadMetrics: 1,
        dailyCheckIns: 1,
        weeklyReviews: 1,
      },
      warnings: [],
      errors: [],
      normalizedClientIdsCount: 8,
    });
    productionMock.maybeShowBrowserReminderNotification.mockClear();
    productionMock.syncEntitlementsWithProvider.mockReset();
    productionMock.syncEntitlementsWithProvider.mockResolvedValue({
      ok: true,
      status: "already_current",
      providerMode: "api_contract",
      planCode: "FREE",
      entitlementKeys: [],
      message: "No premium entitlement.",
    });
    productionMock.syncPendingOutbox.mockClear();
    pageTourMock.startPageTour.mockClear();
    screenGuideMock.startScreenGuide.mockClear();
    autoCloudSyncMock.triggerSyncNow.mockClear();
    autoCloudSyncMock.triggerDrainOnly.mockClear();
    autoCloudSyncMock.resolveConflictKeepLocal.mockClear();
    autoCloudSyncMock.resolveConflictUseCloud.mockClear();
    autoCloudSyncMock.clearFirstLoginRestoreSummary.mockClear();
    autoCloudSyncMock.useAutoCloudSync.mockImplementation(() => ({
      loading: false,
      syncing: false,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 0,
      online: true,
      conflictPending: false,
      firstLoginRestoreSummary: null,
      triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
      triggerDrainOnly: autoCloudSyncMock.triggerDrainOnly,
      resolveConflictKeepLocal: autoCloudSyncMock.resolveConflictKeepLocal,
      resolveConflictUseCloud: autoCloudSyncMock.resolveConflictUseCloud,
      clearFirstLoginRestoreSummary: autoCloudSyncMock.clearFirstLoginRestoreSummary,
    }));
    setAuthContext();
  });

  it("lets auth protected routes reach the login gate before onboarding", async () => {
    const { router } = renderAppShell("/order?kit=vision#recipient");

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2Forder%3Fkit%3Dvision%23recipient");
    expect(router.state.location.state).toMatchObject({ from: "/order?kit=vision#recipient" });
  });

  it("does not force onboarding after login returns to a protected route", async () => {
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });
    const { router } = renderAppShell("/order?kit=vision#recipient");

    expect(await screen.findByTestId("order-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/order");
  });

  it("does not show the workspace loading gate while the authenticated profile is loading", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: null,
      userProfileLoading: true,
    });
    const { router } = renderAppShell("/goals");

    await waitFor(() => expect(router.state.location.pathname).toBe("/goals"));
    expect(screen.queryByText("Đang mở workspace của bạn")).not.toBeInTheDocument();
  });

  it("keeps the workspace usable while backend data is hydrating", async () => {
    seedAuthenticatedCompletedWorkspace();
    backendHydrationMock.value = {
      loading: true,
      result: null,
      error: null,
    };
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-page")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/goals");
  });

  it("defers header chrome to the public landing for signed-out visitors on the home page", async () => {
    const { router } = renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    // Landing "Dear Our Future" dựng header riêng (gồm Đăng nhập/Đăng ký/âm thanh
    // tập trung), nên shell ẩn chrome mặc định ở "/" để tránh trùng header.
    expect(screen.queryByText("12 tuần sống có chủ đích")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mục tiêu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "12 tuần" })).not.toBeInTheDocument();
    expect(productionMock.maybeShowBrowserReminderNotification).not.toHaveBeenCalled();
    expect(productionMock.syncPendingOutbox).not.toHaveBeenCalled();
  });

  it("auto-opens the new user guide once on the first dashboard visit without starting the spotlight tour", async () => {
    localStorage.removeItem("visionboard_new_user_guide_seen_at");
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(await screen.findByRole("dialog")).toHaveTextContent("Cách bắt đầu nhanh");
    expect(localStorage.getItem("visionboard_new_user_guide_seen_at")).toEqual(expect.any(String));

    await new Promise((resolve) => window.setTimeout(resolve, 750));

    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it.each([
    ["/vision-board", "vision-board-page"],
    ["/gallery", "gallery-page"],
  ])("does not auto-open the new user guide on %s", async (path, testId) => {
    localStorage.removeItem("visionboard_new_user_guide_seen_at");
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell(path);

    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("visionboard_new_user_guide_seen_at")).toBeNull();
  });

  it("does not auto-open the new user guide again after it has been seen", async () => {
    localStorage.setItem("visionboard_new_user_guide_seen_at", new Date().toISOString());
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/settings");

    expect(await screen.findByTestId("settings-page")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not auto-open spotlight tours after first-run guidance is completed", async () => {
    localStorage.setItem("visionboard_first_run_guidance_completed_at", new Date().toISOString());
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it("opens the current dashboard spotlight tour from the persistent guide button", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    pageTourMock.startPageTour.mockClear();

    fireEvent.click(screen.getAllByRole("button", { name: "Mở hướng dẫn sử dụng" })[0]);

    expect(pageTourMock.startPageTour).toHaveBeenCalledWith("dashboard", { force: true });
    expect(screenGuideMock.startScreenGuide).not.toHaveBeenCalled();
  });

  it("opens the current screen guide from the persistent guide button on settings", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/settings");

    expect(await screen.findByTestId("settings-page")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Mở hướng dẫn sử dụng" })[0]);

    expect(screenGuideMock.startScreenGuide).toHaveBeenCalledWith("settings", { force: true });
    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it("opens the aspirational vision guide from the persistent guide button", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/vision");

    expect(await screen.findByTestId("vision-page")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Mở hướng dẫn sử dụng" })[0]);

    expect(screenGuideMock.startScreenGuide).toHaveBeenCalledWith("aspirational-vision", { force: true });
    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it("opens the vision board editor guide instead of the long-term vision guide", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/vision-board");

    expect(await screen.findByTestId("vision-board-page")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Mở hướng dẫn sử dụng" })[0]);

    expect(screenGuideMock.startScreenGuide).toHaveBeenCalledWith("vision-board-editor", { force: true });
    expect(screenGuideMock.startScreenGuide).not.toHaveBeenCalledWith("aspirational-vision", { force: true });
    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it("opens the vision board gallery guide from the persistent guide button", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    renderAppShell("/gallery");

    expect(await screen.findByTestId("gallery-page")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Mở hướng dẫn sử dụng" })[0]);

    expect(screenGuideMock.startScreenGuide).toHaveBeenCalledWith("vision-board-gallery", { force: true });
    expect(pageTourMock.startPageTour).not.toHaveBeenCalled();
  });

  it("keeps a replay guide button on guided core-flow pages", async () => {
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "fresh@example.com" },
      userProfile: { id: "profile_test", email: "fresh@example.com" },
    });

    const guidedRoutes = [
      { path: "/onboarding", testId: "onboarding-page", screenId: "onboarding" },
      { path: "/life-insight", testId: "life-insight-page", screenId: "life-insight" },
      { path: "/smart-goal-setup", testId: "smart-goal-setup-page", screenId: "smart-goal" },
      { path: "/feasibility", testId: "feasibility-page", screenId: "feasibility" },
      { path: "/12-week-setup", testId: "twelve-week-setup-page", screenId: "12-week-setup" },
    ] as const;

    for (const route of guidedRoutes) {
      const { ui } = renderAppShell(route.path);

      expect(await screen.findByTestId(route.testId)).toBeInTheDocument();

      pageTourMock.startPageTour.mockClear();
      screenGuideMock.startScreenGuide.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Mở hướng dẫn sử dụng" }));

      expect(screenGuideMock.startScreenGuide).toHaveBeenCalledWith(route.screenId, { force: true });
      expect(pageTourMock.startPageTour).not.toHaveBeenCalled();

      ui.unmount();
    }
  });

  it("shows the AI assistant on dashboard, goal, and setup help routes for signed-in users", async () => {
    appModeMock.isDemoMode.mockReturnValue(true);
    seedAuthenticatedCompletedWorkspace();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    for (const [path, testId] of [
      ["/", "home-page"],
      ["/goals", "goals-page"],
      ["/smart-goal-setup", "smart-goal-setup-page"],
      ["/feasibility", "feasibility-page"],
      ["/12-week-setup", "twelve-week-setup-page"],
    ] as const) {
      const { ui } = renderAppShell(path);

      expect(await screen.findByTestId(testId)).toBeInTheDocument();
      expect(screen.getByTestId("ai-assistant")).toBeInTheDocument();

      ui.unmount();
    }
  });

  it("does not show the AI assistant on non-core support routes", async () => {
    appModeMock.isDemoMode.mockReturnValue(true);
    const { router } = renderAppShell("/billing/plan");

    expect(await screen.findByTestId("billing-plan-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/billing/plan");
    expect(screen.queryByTestId("ai-assistant")).not.toBeInTheDocument();
  });

  it("resets the viewport to the top when the app route changes", async () => {
    const scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    appModeMock.isDemoMode.mockReturnValue(true);
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    scrollToMock.mockClear();

    await router.navigate("/onboarding");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    });

    scrollToMock.mockRestore();
  });

  it("keeps the skip link connected to main content on guided routes", async () => {
    appModeMock.isDemoMode.mockReturnValue(true);
    renderAppShell("/onboarding");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    const skipLink = document.querySelector<HTMLAnchorElement>('a.skip-to-content[href="#main-content"]');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(document.querySelector("main#main-content")).toBeInTheDocument();
  });

  it("does not block the public home page while auth is loading", async () => {
    setAuthContext({ authLoading: true });
    const { router } = renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Đang kiểm tra tài khoản")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("keeps the public home usable while backend data is hydrating", async () => {
    seedAuthenticatedCompletedWorkspace();
    backendHydrationMock.value = {
      loading: true,
      result: null,
      error: null,
    };
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });
    const { router } = renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("shows an authenticated account dropdown with the sync status pill", async () => {
    seedPlusSubscription();
    autoCloudSyncMock.useAutoCloudSync.mockReturnValue({
      loading: false,
      syncing: true,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 0,
      online: true,
      conflictPending: false,
      firstLoginRestoreSummary: null,
      triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
      triggerDrainOnly: autoCloudSyncMock.triggerDrainOnly,
      resolveConflictKeepLocal: autoCloudSyncMock.resolveConflictKeepLocal,
      resolveConflictUseCloud: autoCloudSyncMock.resolveConflictUseCloud,
      clearFirstLoginRestoreSummary: autoCloudSyncMock.clearFirstLoginRestoreSummary,
    });
    setAuthContext({
      user: { uid: "user_test", email: "plus@example.com", displayName: "Plus User" },
      userProfile: { id: "profile_test", email: "plus@example.com", displayName: "Plus User" },
    });

    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Về trang chủ Dear Our Future" }).length).toBeGreaterThan(0);
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    expect(screen.getAllByText("plus@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Cài đặt" })).toHaveAttribute("href", "/settings");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Mở menu tài khoản" }), { button: 0 });

    const demoMenu = await screen.findByRole("menu");
    expect(demoMenu).toBeInTheDocument();
    expect(within(demoMenu).getByText("Plus")).toBeInTheDocument();
    expect(
      within(demoMenu).getByRole("button", {
        name: /(đồng bộ|Đã sao lưu|Đang sao lưu)/i,
      }),
    ).toBeInTheDocument();
    expect(within(demoMenu).getByRole("menuitem", { name: "Cài đặt" })).toBeInTheDocument();
    expect(within(demoMenu).getByRole("menuitem", { name: "Quản lý gói" })).toBeInTheDocument();
    expect(within(demoMenu).getByRole("menuitem", { name: "Đăng xuất" })).toBeInTheDocument();

    fireEvent.click(within(demoMenu).getByRole("menuitem", { name: "Quản lý gói" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/billing/plan");
    });
  });

  it("shows the sync status pill in the mobile account dropdown", async () => {
    seedPlusSubscription();
    autoCloudSyncMock.useAutoCloudSync.mockReturnValue({
      loading: false,
      syncing: false,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 2,
      online: true,
      conflictPending: false,
      firstLoginRestoreSummary: null,
      triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
      triggerDrainOnly: autoCloudSyncMock.triggerDrainOnly,
      resolveConflictKeepLocal: autoCloudSyncMock.resolveConflictKeepLocal,
      resolveConflictUseCloud: autoCloudSyncMock.resolveConflictUseCloud,
      clearFirstLoginRestoreSummary: autoCloudSyncMock.clearFirstLoginRestoreSummary,
    });
    setAuthContext({
      user: { uid: "user_test", email: "plus@example.com", displayName: "Plus User" },
      userProfile: { id: "profile_test", email: "plus@example.com", displayName: "Plus User" },
    });

    renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    const accountMenuTriggers = screen.getAllByTitle("plus@example.com");
    fireEvent.pointerDown(accountMenuTriggers[1], { button: 0 });

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    const pill = within(menu).getByRole("button", { name: "Đã lưu trên thiết bị này. Chưa sao lưu" });
    expect(pill).toBeInTheDocument();
    expect(pill.getAttribute("title")).toContain("2 thay đổi");
  });

  it("does not render the sync status pill in demo mode", async () => {
    appModeMock.isDemoMode.mockReturnValue(true);
    seedPlusSubscription();
    autoCloudSyncMock.useAutoCloudSync.mockReturnValue({
      loading: false,
      syncing: false,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 7,
      online: true,
      conflictPending: false,
      firstLoginRestoreSummary: null,
      triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
      triggerDrainOnly: autoCloudSyncMock.triggerDrainOnly,
      resolveConflictKeepLocal: autoCloudSyncMock.resolveConflictKeepLocal,
      resolveConflictUseCloud: autoCloudSyncMock.resolveConflictUseCloud,
      clearFirstLoginRestoreSummary: autoCloudSyncMock.clearFirstLoginRestoreSummary,
    });
    setAuthContext({
      user: { uid: "user_test", email: "plus@example.com", displayName: "Plus User" },
      userProfile: { id: "profile_test", email: "plus@example.com", displayName: "Plus User" },
    });

    renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getAllByTitle("plus@example.com")[0], { button: 0 });

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(within(menu).queryByText(/^7 /)).not.toBeInTheDocument();
  });

  it("sends public app routes to login before onboarding when signed out", async () => {
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2Fgoals");
    expect(router.state.location.state).toMatchObject({ from: "/goals" });
  });

  it("keeps signed-out visitors on the Plus confirmation page", async () => {
    const { router } = renderAppShell("/billing/confirm");

    expect(await screen.findByTestId("billing-confirm-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/billing/confirm");
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("lets the 12-week setup route render its own real-mode login gate", async () => {
    setAuthContext({ isConfigured: false });
    const { router } = renderAppShell("/12-week-setup");

    expect(await screen.findByTestId("twelve-week-setup-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/12-week-setup");
  });

  it("sends signed-in users to onboarding when setup is incomplete", async () => {
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
  });

  it("does not show the local data migration prompt for fresh anonymous data", async () => {
    seedAnonymousData(createFreshUserData());
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();
  });

  it("does not show the local data migration prompt and instead auto-imports when signed-in account has meaningful anonymous data", async () => {
    seedMeaningfulAnonymousData();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();
  });

  it("automatically imports meaningful anonymous data into a fresh signed-in account scope on mount", async () => {
    const anonymousData = seedMeaningfulAnonymousData();
    const rawAnonymousData = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
    activateAuthenticatedUserData("user_test");
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();

    expect(getUserData().goals.map((goal) => goal.title)).toEqual(anonymousData.goals.map((goal) => goal.title));
    expect(localStorage.getItem(getScopedUserDataStorageKey("user_test"))).toBe(rawAnonymousData);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawAnonymousData);
  });

  it("automatically merges browser data when the signed-in account already has meaningful data", async () => {
    activateAuthenticatedUserData("user_test");
    saveUserData(createFreshUserData());
    const accountData = createFreshUserData();
    accountData.goals.push(createRealGoal({ id: "goal_account_1", title: "Existing account goal" }));
    saveUserData(accountData);

    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal({ id: "goal_anonymous_1", title: "Anonymous local goal" }));
    seedAnonymousData(anonymousData);

    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();

    const mergedGoals = getUserData().goals;
    const titles = mergedGoals.map((goal) => goal.title);
    expect(titles).toContain("Existing account goal");
    expect(titles).toContain("Anonymous local goal");
  });

  it("does not show the local data migration prompt in demo mode", async () => {
    appModeMock.isDemoMode.mockReturnValue(true);
    seedMeaningfulAnonymousData();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");
    expect(syncServiceMock.post12WeekImportValidation).not.toHaveBeenCalled();

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();
  });

  it("does not show the local data migration prompt while signed out", async () => {
    seedMeaningfulAnonymousData();

    renderAppShell("/");
    expect(syncServiceMock.post12WeekImportValidation).not.toHaveBeenCalled();

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();
  });
});
