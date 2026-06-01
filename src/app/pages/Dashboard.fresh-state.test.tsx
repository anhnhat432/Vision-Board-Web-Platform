import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, saveUserData, initializeUserData } from "../utils/storage";
import { Dashboard } from "./Dashboard";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

const planHookMock = vi.hoisted(() => ({
  loadPlan: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  mode: "real" as "demo" | "real",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => appModeMock.mode,
  isDemoMode: () => appModeMock.mode === "demo",
  isRealMode: () => appModeMock.mode === "real",
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  isPaidCheckoutDisabled: () => false,
}));

vi.mock("@/features/dashboard/hooks/useDashboardPlanLink", () => ({
  useDashboardPlanLink: () => null,
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlan12Week: () => ({
    plan: null,
    loading: false,
    error: null,
    actions: {
      loadPlan: planHookMock.loadPlan,
    },
  }),
}));

vi.mock("../utils/production", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/production")>();
  return {
    ...original,
    getBillingProviderStatus: () => ({
      mode: "none",
      providerLabel: "Chưa cấu hình",
      checkoutReady: false,
      restoreReady: false,
      entitlementSyncReady: false,
      manageBillingReady: false,
    }),
  };
});

function setAuthContext(overrides: Record<string, unknown> = {}) {
  const context = {
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
    ...overrides,
  };
  authContextMock.useAuthContext.mockReturnValue(context);
  authContextMock.useOptionalAuthContext.mockReturnValue(context);
}

function renderDashboard() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "/login",
        element: <div data-testid="login-page">Login page</div>,
      },
      {
        path: "/onboarding",
        element: <div data-testid="onboarding-page">Onboarding page</div>,
      },
      {
        path: "/life-insight",
        element: <div data-testid="life-insight-page">Life Insight page</div>,
      },
      {
        path: "/vision",
        element: <div data-testid="vision-page">Vision page</div>,
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

function seedStaleLocalGoal() {
  const data = getUserData();
  data.goals = [
    {
      id: "goal_stale_private",
      category: "Career",
      title: "Private stale goal must stay hidden",
      description: "This stale local goal should not appear on the public home.",
      deadline: "2026-06-06",
      tasks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  data.onboardingCompleted = true;
  saveUserData(data);
}

describe("Dashboard fresh workspace states", () => {
  beforeEach(() => {
    localStorage.clear();
    initializeUserData();
    appModeMock.mode = "real";
    planHookMock.loadPlan.mockReset();
    setAuthContext();
  });

  it("keeps signed-out visitors from seeing stale local goals", async () => {
    seedStaleLocalGoal();

    const { container } = renderDashboard();

    expect(
      await screen.findByRole("heading", {
        name: /Thiết lập cuộc sống mơ ước qua.*kế hoạch 12 tuần/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Private stale goal must stay hidden")).not.toBeInTheDocument();
    expect(screen.getByText("Có dữ liệu đã lưu trên thiết bị này")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập để khôi phục/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tạo tài khoản mới/i })).toBeInTheDocument();
    expect(screen.queryByText("Một luồng chính, không phải ba lựa chọn ngang nhau.")).not.toBeInTheDocument();
    expect(container.querySelector('[data-tour-id="dashboard-plan-card"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-tour-id="dashboard-next-card"]')).not.toBeInTheDocument();
  });

  it("lets demo-mode signed-out visitors start onboarding even when Firebase auth is configured", async () => {
    appModeMock.mode = "demo";
    const user = userEvent.setup();

    renderDashboard();

    const startButton = (await screen.findAllByRole("button", { name: /Thiết lập chu kỳ 12 tuần ngay/i }))[0];
    expect(
      screen.getByRole("heading", {
        name: /Thiết lập cuộc sống mơ ước qua.*kế hoạch 12 tuần/i,
      }),
    ).toBeInTheDocument();

    await user.click(startButton);

    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("shows a true empty execution state for a newly signed-in user", async () => {
    setAuthContext({
      user: { uid: "fresh_user", email: "fresh@example.com" },
      userProfile: { id: "profile_fresh", email: "fresh@example.com" },
    });
    const openGuideHandler = vi.fn();
    window.addEventListener("visionboard:open-guide", openGuideHandler);
    expect(getUserData().goals).toEqual([]);
    const user = userEvent.setup();

    renderDashboard();

    expect(await screen.findByTestId("fresh-workspace-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/Cần xem hướng dẫn nhanh\?/)).toBeInTheDocument();
    expect(screen.queryByText(/Free: 0\/3/)).not.toBeInTheDocument();
    expect(screen.getByText(/Hoàn thành 4 chặng cốt lõi/i)).toBeInTheDocument();
    expect(screen.queryByText("Chưa có dữ liệu bánh xe cuộc sống")).not.toBeInTheDocument();
    expect(screen.queryByText("Tổng quan hiệu suất 12 tuần")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bắt đầu: Cân bằng cuộc sống →" })).toBeInTheDocument();
    expect(screen.getByText("Cân bằng cuộc sống")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tôi đã có insight" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mục tiêu gần đây")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mở cẩm nang →" }));
    expect(openGuideHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener("visionboard:open-guide", openGuideHandler);
  });
});
