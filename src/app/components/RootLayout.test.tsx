import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";
import { RootLayout } from "./RootLayout";
import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
} from "../utils/storage-constants";
import { createEmptyUserData } from "../utils/storage-demo-data";
import { activateAuthenticatedUserData, getUserData, saveUserData } from "../utils/storage";
import { getScopedUserDataStorageKey } from "../utils/storage-auth-scope";
import type { Goal, UserData } from "../utils/storage-types";

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
  return {
    triggerSyncNow,
    useAutoCloudSync: vi.fn(() => ({
      loading: false,
      lastResult: null,
      lastSyncedAt: null,
      pendingCount: 0,
      online: true,
      conflictPending: false,
      triggerSyncNow,
    })),
  };
});
const productionMock = vi.hoisted(() => ({
  maybeShowBrowserReminderNotification: vi.fn(),
  syncEntitlementsWithProvider: vi.fn(),
  syncPendingOutbox: vi.fn(),
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
  maybeShowBrowserReminderNotification: productionMock.maybeShowBrowserReminderNotification,
  syncEntitlementsWithProvider: productionMock.syncEntitlementsWithProvider,
  syncPendingOutbox: productionMock.syncPendingOutbox,
}));

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

function seedMeaningfulAnonymousTwelveWeekData() {
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
  data.onboardingCompleted = true;
  data.subscription = {
    planCode: "PLUS",
    status: "active",
    billingCycle: "monthly",
    startedAt: grantedAt,
    renewsAt: "2026-06-01T00:00:00.000Z",
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
          { path: "12-week-setup", element: <div data-testid="twelve-week-setup-page">12-week setup page</div> },
          { path: "goals", element: <div data-testid="goals-page">Goals page</div> },
          { path: "settings", element: <div data-testid="settings-page">Settings page</div> },
          { path: "billing/plan", element: <div data-testid="billing-plan-page">Billing plan page</div> },
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

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    expect(screen.queryByText("Đang mở workspace của bạn")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/goals");
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

  it("keeps signed-out visitors on the public home page with auth actions", async () => {
    const { router } = renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Đăng ký" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Trang chính" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mục tiêu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "12 tuần" })).not.toBeInTheDocument();
    expect(productionMock.maybeShowBrowserReminderNotification).not.toHaveBeenCalled();
    expect(productionMock.syncPendingOutbox).not.toHaveBeenCalled();
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

  it("shows an authenticated account dropdown and compact footer without sync status copy", async () => {
    seedPlusSubscription();
    setAuthContext({
      user: { uid: "user_test", email: "plus@example.com", displayName: "Plus User" },
      userProfile: { id: "profile_test", email: "plus@example.com", displayName: "Plus User" },
    });

    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("goals-page")).toBeInTheDocument();
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    expect(screen.getByText("plus@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cài đặt" })).toHaveAttribute("href", "/settings");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Mở menu tài khoản" }), { button: 0 });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Plus")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Quản lý subscription" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
    expect(screen.queryByText(/Đang đồng bộ|Đã đồng bộ|sync/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Quản lý subscription" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/billing/plan");
    });
  });

  it("sends public app routes to login before onboarding when signed out", async () => {
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2Fgoals");
    expect(router.state.location.state).toMatchObject({ from: "/goals" });
  });

  it("requires login before the 12-week setup route in real mode even when Firebase config is missing", async () => {
    setAuthContext({ isConfigured: false });
    const { router } = renderAppShell("/12-week-setup");

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2F12-week-setup");
    expect(router.state.location.state).toMatchObject({ from: "/12-week-setup" });
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

  it("shows the local data migration prompt when signed-in account has meaningful anonymous data", async () => {
    seedMeaningfulAnonymousData();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Chuyển dữ liệu cũ vào tài khoản?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nhập dữ liệu" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Xem dữ liệu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Để sau" })).toBeInTheDocument();
  });

  it("imports meaningful anonymous data into a fresh signed-in account scope", async () => {
    const anonymousData = seedMeaningfulAnonymousData();
    const rawAnonymousData = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
    activateAuthenticatedUserData("user_test");
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Chuyển dữ liệu cũ vào tài khoản?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nhập dữ liệu" }));

    expect(await screen.findByText(/Đã chuyển dữ liệu vào tài khoản/)).toBeInTheDocument();
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(anonymousData.goals.map((goal) => goal.title));
    expect(localStorage.getItem(getScopedUserDataStorageKey("user_test"))).toBe(rawAnonymousData);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawAnonymousData);
  });

  it("validates account-scope 12-week data with the cloud import dry-run endpoint after local import", async () => {
    seedMeaningfulAnonymousTwelveWeekData();
    activateAuthenticatedUserData("user_test");
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });
    window.dataLayer = [];
    window.gtag = vi.fn();

    renderAppShell("/");

    expect(await screen.findByText(/Chuyển dữ liệu cũ vào tài khoản/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kiểm tra dữ liệu" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Nhập dữ liệu" }));
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    await waitFor(() => {
      expect(syncServiceMock.post12WeekImportValidation).toHaveBeenCalledTimes(1);
    });
    expect(syncServiceMock.post12WeekImportValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "account_scope_import_dry_run",
        mode: "validate_only",
        workspace: {
          goals: [
            expect.objectContaining({
              clientGoalId: "goal_real_1",
              plan: expect.objectContaining({
                clientPlanId: "goal_real_1:12-week-system",
              }),
            }),
          ],
        },
      }),
    );
    expect(await screen.findByText(/Dữ liệu hợp lệ để đồng bộ lên tài khoản/i)).toBeInTheDocument();
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("shows account validation errors without deleting browser data", async () => {
    const anonymousData = seedMeaningfulAnonymousTwelveWeekData();
    const rawAnonymousData = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
    activateAuthenticatedUserData("user_test");
    syncServiceMock.post12WeekImportValidation.mockRejectedValueOnce({
      message: "12-week import payload validation failed.",
      details: {
        details: {
          status: "invalid",
          mode: "validate_only",
          dryRun: true,
          acceptedEntityCounts: {
            goals: 1,
            plans: 1,
            weeks: 0,
            tasks: 0,
            leadIndicators: 0,
            leadMetrics: 0,
            dailyCheckIns: 0,
            weeklyReviews: 0,
          },
          warnings: [],
          errors: [
            {
              path: "workspace.goals[0].plan.weeks",
              code: "required",
              message: "workspace.goals[0].plan.weeks is required.",
            },
          ],
          normalizedClientIdsCount: 2,
        },
      },
    });
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText(/Chuyển dữ liệu cũ vào tài khoản/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nhập dữ liệu" }));
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    expect(await screen.findByText(/Dữ liệu chưa sẵn sàng để đồng bộ lên tài khoản/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace.goals\[0\]\.plan\.weeks is required/i)).toBeInTheDocument();
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(anonymousData.goals.map((goal) => goal.title));
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawAnonymousData);
  });

  it("blocks browser import when the signed-in account already has meaningful data", async () => {
    activateAuthenticatedUserData("user_test");
    saveUserData(createFreshUserData());
    const accountData = createFreshUserData();
    accountData.goals.push(createRealGoal({ id: "goal_account_1", title: "Existing account goal" }));
    saveUserData(accountData);
    const rawAccountData = localStorage.getItem(getScopedUserDataStorageKey("user_test"));
    const anonymousData = createFreshUserData();
    anonymousData.goals.push(createRealGoal({ id: "goal_anonymous_1", title: "Anonymous local goal" }));
    seedAnonymousData(anonymousData);
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Chuyển dữ liệu cũ vào tài khoản?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nhập dữ liệu" }));

    expect(await screen.findByText(/không ghi đè tự động/)).toBeInTheDocument();
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(["Existing account goal"]);
    expect(localStorage.getItem(getScopedUserDataStorageKey("user_test"))).toBe(rawAccountData);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toContain("Anonymous local goal");
  });

  it("lets the user skip browser data migration without deleting anonymous data", async () => {
    seedMeaningfulAnonymousData();
    const rawAnonymousData = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Chuyển dữ liệu cũ vào tài khoản?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));

    await waitFor(() => {
      expect(screen.queryByText("Chuyển dữ liệu cũ vào tài khoản?")).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawAnonymousData);
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
