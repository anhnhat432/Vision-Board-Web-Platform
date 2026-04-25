import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";
import { RootLayout } from "./RootLayout";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("../hooks/useBackendPlanHydration", () => ({
  BACKEND_PLAN_HYDRATION_EVENT_NAME: "visionboard:backend-hydrated",
  useBackendPlanHydration: () => ({
    loading: false,
    result: null,
    error: null,
  }),
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
}));

vi.mock("../utils/production", () => ({
  maybeShowBrowserReminderNotification: vi.fn(),
  syncPendingOutbox: vi.fn(),
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

function renderAppShell(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <div data-testid="login-page">Login page</div> },
      {
        path: "/",
        element: <RootLayout />,
        children: [
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
    setAuthContext({ user: { uid: "user_test" } });
    const { router } = renderAppShell("/order?kit=vision#recipient");

    expect(await screen.findByTestId("order-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/order");
  });

  it("still sends public app routes to onboarding when setup is incomplete", async () => {
    const { router } = renderAppShell("/goals");

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
  });
});
