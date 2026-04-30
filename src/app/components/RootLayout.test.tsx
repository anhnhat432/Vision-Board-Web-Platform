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
}));
const backendHydrationMock = vi.hoisted(() => ({
  value: {
    loading: false,
    result: null,
    error: null,
  },
}));
const productionMock = vi.hoisted(() => ({
  maybeShowBrowserReminderNotification: vi.fn(),
  syncPendingOutbox: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
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
}));

vi.mock("../utils/production", () => ({
  maybeShowBrowserReminderNotification: productionMock.maybeShowBrowserReminderNotification,
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

function seedAnonymousData(data: UserData) {
  localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(data));
}

function seedMeaningfulAnonymousData() {
  const data = createFreshUserData();
  data.goals.push(createRealGoal());
  seedAnonymousData(data);
  return data;
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
          { path: "goals", element: <div data-testid="goals-page">Goals page</div> },
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
    productionMock.maybeShowBrowserReminderNotification.mockClear();
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

  it("shows a workspace gate while an authenticated profile is loading", async () => {
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: null,
      userProfileLoading: true,
    });
    const { router } = renderAppShell("/goals");

    expect(await screen.findByText("Đang mở workspace của bạn")).toBeInTheDocument();
    expect(screen.queryByTestId("goals-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-page")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/goals");
  });

  it("shows a workspace gate while backend data is hydrating", async () => {
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

    expect(await screen.findByText("Đang đồng bộ dữ liệu")).toBeInTheDocument();
    expect(screen.queryByTestId("goals-page")).not.toBeInTheDocument();
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
    setAuthContext({ isConfigured: false });
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

  it("does not block the public home page while auth is loading", async () => {
    setAuthContext({ authLoading: true });
    const { router } = renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Đang kiểm tra tài khoản")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("waits for backend hydration on the public home page once a user is signed in", async () => {
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

    expect(await screen.findByText(/workspace/i)).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("sends public app routes to login before onboarding when signed out", async () => {
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2Fgoals");
    expect(router.state.location.state).toMatchObject({ from: "/goals" });
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
    expect(screen.queryByText("Có dữ liệu local trên trình duyệt này")).not.toBeInTheDocument();
  });

  it("shows the local data migration prompt when signed-in account has meaningful anonymous data", async () => {
    seedMeaningfulAnonymousData();
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Có dữ liệu local trên trình duyệt này")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import local data" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Review local data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
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

    expect(await screen.findByText("Có dữ liệu local trên trình duyệt này")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import local data" }));

    expect(await screen.findByText(/Đã copy dữ liệu vào account scope/)).toBeInTheDocument();
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(anonymousData.goals.map((goal) => goal.title));
    expect(localStorage.getItem(getScopedUserDataStorageKey("user_test"))).toBe(rawAnonymousData);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBe(rawAnonymousData);
  });

  it("blocks local import when the signed-in account already has meaningful data", async () => {
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

    expect(await screen.findByText("Có dữ liệu local trên trình duyệt này")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import local data" }));

    expect(await screen.findByText(/sẽ không ghi đè tự động/)).toBeInTheDocument();
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(["Existing account goal"]);
    expect(localStorage.getItem(getScopedUserDataStorageKey("user_test"))).toBe(rawAccountData);
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toContain("Anonymous local goal");
  });

  it("lets the user skip local data migration without deleting anonymous data", async () => {
    seedMeaningfulAnonymousData();
    const rawAnonymousData = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
    setAuthContext({
      user: { uid: "user_test", email: "test@example.com" },
      userProfile: { id: "profile_test", email: "test@example.com" },
    });

    renderAppShell("/");

    expect(await screen.findByText("Có dữ liệu local trên trình duyệt này")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => {
      expect(screen.queryByText("Có dữ liệu local trên trình duyệt này")).not.toBeInTheDocument();
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

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Có dữ liệu local trên trình duyệt này")).not.toBeInTheDocument();
  });

  it("does not show the local data migration prompt while signed out", async () => {
    seedMeaningfulAnonymousData();

    renderAppShell("/");

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Có dữ liệu local trên trình duyệt này")).not.toBeInTheDocument();
  });
});
