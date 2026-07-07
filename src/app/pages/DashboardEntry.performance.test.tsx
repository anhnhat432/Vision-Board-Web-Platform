import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardEntry } from "./DashboardEntry";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
}));

const loginPageImportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("../utils/app-mode", () => ({
  isDemoMode: appModeMock.isDemoMode,
}));

vi.mock("../utils/storage", () => ({
  getUserData: () => ({
    goals: [],
    currentWheelOfLife: [],
    reflections: [],
    visionBoards: [],
  }),
}));

vi.mock("@/features/dashboard/v2/PublicVisitorView", () => ({
  PublicVisitorView: ({
    onAuthIntent,
    onSignIn,
  }: {
    onAuthIntent?: () => void;
    onSignIn: () => void;
  }) => (
    <div>
      <div data-testid="public-visitor-view">Public landing</div>
      <button type="button" onPointerEnter={onAuthIntent} onClick={onSignIn}>
        Sign in
      </button>
    </div>
  ),
}));

vi.mock("./LoginPage", () => {
  loginPageImportMock();
  return {
    LoginPage: () => <div data-testid="login-page">Login page</div>,
  };
});

function renderDashboardEntry() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <DashboardEntry />
    </MemoryRouter>,
  );
}

describe("DashboardEntry performance behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loginPageImportMock.mockClear();
    appModeMock.isDemoMode.mockReturnValue(false);
    authContextMock.useAuthContext.mockReturnValue({
      isConfigured: true,
      user: null,
    });
    Object.defineProperty(window.navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "4g" },
    });
    Object.defineProperty(window.navigator, "hardwareConcurrency", {
      configurable: true,
      value: 8,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not auto-import the login route while a signed-out visitor is reading the landing page", async () => {
    renderDashboardEntry();

    expect(screen.getByTestId("public-visitor-view")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(loginPageImportMock).not.toHaveBeenCalled();
  });

});
