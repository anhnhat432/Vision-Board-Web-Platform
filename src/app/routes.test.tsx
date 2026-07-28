import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));
const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
}));
const adminServiceMock = vi.hoisted(() => ({
  adminGetSalesReport: vi.fn(),
}));
const autoCloudSyncMock = vi.hoisted(() => ({
  triggerSyncNow: vi.fn(),
  triggerDrainOnly: vi.fn(),
  resolveConflictKeepLocal: vi.fn(),
  resolveConflictUseCloud: vi.fn(),
  clearFirstLoginRestoreSummary: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/features/plan12week/hooks/useAutoCloudSync", () => ({
  useAutoCloudSync: () => ({
    loading: false,
    lastResult: null,
    lastSyncedAt: null,
    pendingCount: 0,
    online: true,
    conflictPending: false,
    syncing: false,
    firstLoginRestoreSummary: null,
    triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
    triggerDrainOnly: autoCloudSyncMock.triggerDrainOnly,
    resolveConflictKeepLocal: autoCloudSyncMock.resolveConflictKeepLocal,
    resolveConflictUseCloud: autoCloudSyncMock.resolveConflictUseCloud,
    clearFirstLoginRestoreSummary:
      autoCloudSyncMock.clearFirstLoginRestoreSummary,
  }),
}));

vi.mock("@/features/plan12week/hooks/AutoCloudSyncProvider", () => ({
  AutoCloudSyncProvider: ({ children }: { children: ReactNode }) => children,
  useAutoCloudSyncContext: () => ({
    loading: false,
    lastResult: null,
    lastSyncedAt: null,
    pendingCount: 0,
    online: true,
    conflictPending: false,
    syncing: false,
    triggerSyncNow: autoCloudSyncMock.triggerSyncNow,
  }),
  useOptionalAutoCloudSyncContext: () => null,
}));

vi.mock("./hooks/useBackendPlanHydration", () => ({
  BACKEND_PLAN_HYDRATION_EVENT_NAME: "visionboard:backend-hydrated",
  useBackendPlanHydration: () => ({
    loading: false,
    result: null,
    error: null,
  }),
}));

vi.mock("./utils/app-mode", () => ({
  getAppMode: () => (appModeMock.isDemoMode() ? "demo" : "real"),
  isDemoMode: appModeMock.isDemoMode,
  isRealMode: () => !appModeMock.isDemoMode(),
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  shouldEnable12WeekGoalTombstoneSync: () => true,
  shouldEnable12WeekImportDryRun: () => false,
  shouldEnable12WeekCloudImport: () => false,
  isPaidCheckoutDisabled: () => false,
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ orders: [] }),
    post: vi.fn(),
  },
  isApiBaseUrlConfigured: () => false,
  toAppError: (error: unknown) => error,
}));

vi.mock("@/services/adminService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/adminService")>()),
  adminGetSalesReport: adminServiceMock.adminGetSalesReport,
}));

vi.mock("@/services/syncService", () => ({
  post12WeekImportValidation: vi.fn(),
  post12WeekImport: vi.fn(),
}));

vi.mock("./utils/production", () => ({
  getBillingProviderStatus: () => ({
    mode: "local_test",
    providerLabel: "Test billing",
    checkoutReady: true,
    restoreReady: true,
    entitlementSyncReady: true,
    manageBillingReady: true,
  }),
  getLastEntitlementSyncSnapshot: () => null,
  getLastOutboxSyncSnapshot: () => null,
  getLastRestoreAccessSnapshot: () => null,
  maybeShowBrowserReminderNotification: vi.fn(),
  openBillingCustomerPortal: vi
    .fn()
    .mockResolvedValue({ ok: true, message: "Opened" }),
  resolveAppReturnPath: (path: string) => path,
  restorePlanAccess: vi
    .fn()
    .mockResolvedValue({ ok: true, message: "Restored" }),
  syncEntitlementsWithProvider: vi
    .fn()
    .mockResolvedValue({ ok: true, planCode: "FREE", message: "Synced" }),
  syncPendingOutbox: vi.fn(),
}));

import { appRoutes, createAppRoutes } from "./routes";
import { resolveModeAwareCopy } from "./utils/demo-copy-guard";
import { initializeUserData, saveUserData } from "./utils/storage";

beforeAll(async () => {
  await Promise.all([
    import("./components/admin/AdminLayout"),
    import("./components/root-layout/AppShellLayout"),
  ]);
});

function renderRoute(pathname: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [pathname] });
  const result = render(<RouterProvider router={router} />);

  return {
    ...result,
    router,
    async waitForIdle() {
      await waitFor(() => expect(router.state.navigation.state).toBe("idle"));
    },
    async dispose() {
      await waitFor(() => expect(router.state.navigation.state).toBe("idle"));
      router.dispose();
      result.unmount();
    },
  };
}

function collectRoutePaths(routes: readonly unknown[]): string[] {
  const paths: string[] = [];

  const walk = (entries: readonly unknown[]) => {
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const route = entry as { path?: unknown; children?: unknown };
      if (typeof route.path === "string") {
        paths.push(route.path);
      }
      if (Array.isArray(route.children)) {
        walk(route.children);
      }
    });
  };

  walk(routes);
  return paths;
}

function expectNoDemoOnlyCopy() {
  expect(
    screen.queryByText(
      /bản dùng thử|dùng thử|trên trình duyệt này|không thu tiền thật|không cần đăng nhập|mock|demo/i,
    ),
  ).not.toBeInTheDocument();
}

describe("app routes", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "visionboard_new_user_guide_seen_at",
      new Date().toISOString(),
    );
    adminServiceMock.adminGetSalesReport.mockReset();
    authContextMock.useAuthContext.mockReturnValue({
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
    });
    appModeMock.isDemoMode.mockReturnValue(false);
  });

  it("resolves /terms through the app route table", async () => {
    const route = renderRoute("/terms");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Điều khoản dịch vụ/i,
      }),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("resolves /help through the app route table", async () => {
    const route = renderRoute("/help");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Trung tâm trợ giúp/i,
      }),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("resolves /privacy through the app route table", async () => {
    const route = renderRoute("/privacy");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", { name: /Chính sách bảo mật/i }),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("resolves /contact through the app route table", async () => {
    const route = renderRoute("/contact");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Liên hệ hỗ trợ/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Trang này vừa gặp lỗi/i)).not.toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("resolves /billing/faq through the app route table", async () => {
    const route = renderRoute("/billing/faq");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", { name: /Câu hỏi thường gặp/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Làm sao tôi biết đã thanh toán thành công?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn nhận biên nhận qua email/),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("does not register demo-only routes in the production route table", () => {
    const paths = collectRoutePaths(createAppRoutes("real"));
    const bannedPatterns: ReadonlyArray<RegExp> = [
      /(?:^|\/)mock-/i,
      /(?:^|\/)demo-/i,
      /(?:^|\/)seeder?(?:[\W_]|$)/i,
      /(?:^|\/)__debug/i,
      /\/billing\/mock/i,
    ];
    const offenders = paths.filter((path) =>
      bannedPatterns.some((pattern) => pattern.test(path)),
    );

    expect(
      offenders,
      `Production route table contains demo-only routes: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("registers mock checkout only in the demo route table", () => {
    const realPaths = collectRoutePaths(createAppRoutes("real"));
    const demoPaths = collectRoutePaths(createAppRoutes("demo"));

    expect(realPaths).not.toContain("billing/mock-checkout");
    expect(demoPaths).toContain("billing/mock-checkout");
  });

  it("registers the sales report only in the real-mode route table", () => {
    const realPaths = collectRoutePaths(createAppRoutes("real"));
    const demoPaths = collectRoutePaths(createAppRoutes("demo"));

    expect(realPaths).toContain("reports/sales");
    expect(demoPaths).not.toContain("reports/sales");
  });

  it("blocks a non-admin sales-report URL before loading report data", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: { uid: "regular-user", email: "user@example.test" },
      userProfile: { id: "regular-user", email: "user@example.test", role: "user" },
      userProfileLoading: false,
      userProfileError: null,
      authLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    });
    const userData = initializeUserData();
    saveUserData({ ...userData, onboardingCompleted: true });

    const route = renderRoute("/admin/reports/sales");
    await route.waitForIdle();

    expect(
      await screen.findByRole(
        "heading",
        { name: "Không có quyền quản trị" },
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument();
    expect(adminServiceMock.adminGetSalesReport).not.toHaveBeenCalled();
    await route.dispose();
  });

  it("redirects /billing to the billing plan page", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        displayName: "Test User",
        email: "test@example.com",
        emailVerified: true,
      },
      userProfile: { email: "test@example.com", id: "test-user", role: "user" },
      userProfileLoading: false,
      userProfileError: null,
      authLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    });
    const userData = initializeUserData();
    saveUserData({ ...userData, onboardingCompleted: true });

    const route = renderRoute("/billing");
    await route.waitForIdle();

    expect(await screen.findByText("Đi nhanh")).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("redirects legacy mock checkout URLs to a safe real-mode surface", async () => {
    const route = renderRoute("/billing/mock-checkout?session=legacy_checkout_test");
    await route.waitForIdle();

    const { pathname, search } = route.router.state.location;
    expect(["/billing/plan", "/login"]).toContain(pathname);
    if (pathname === "/login") {
      expect(search).toContain(
        encodeURIComponent("/billing/mock-checkout?session=legacy_checkout_test"),
      );
    } else {
      expect(search).toBe("");
    }
    expect(screen.queryByText(/Trang này vừa gặp lỗi/i)).not.toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("redirects /today to /12-week-system?tab=today", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        displayName: "Test User",
        email: "test@example.com",
        emailVerified: true,
      },
      userProfile: { email: "test@example.com", id: "test-user", role: "user" },
      userProfileLoading: false,
      userProfileError: null,
      authLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    });
    const userData = initializeUserData();
    saveUserData({ ...userData, onboardingCompleted: true });

    const route = renderRoute("/today");
    await route.waitForIdle();

    expect(route.router.state.location.pathname).toBe("/12-week-system");
    expect(route.router.state.location.search).toBe("?tab=today");
    await route.dispose();
  });

  it("resolves /settings through the app route table", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        displayName: "Test User",
        email: "test@example.com",
        emailVerified: true,
      },
      userProfile: { email: "test@example.com", id: "test-user", role: "user" },
      userProfileLoading: false,
      userProfileError: null,
      authLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    });
    const userData = initializeUserData();
    saveUserData({ ...userData, onboardingCompleted: true });
    const route = renderRoute("/settings");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Tu. ch.nh t.i kho.n/i,
      }),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });

  it("resolves /vision through the app route table", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        displayName: "Test User",
        email: "test@example.com",
        emailVerified: true,
      },
      userProfile: { email: "test@example.com", id: "test-user", role: "user" },
      userProfileLoading: false,
      userProfileError: null,
      authLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    });
    const userData = initializeUserData();
    saveUserData({ ...userData, onboardingCompleted: true });

    const route = renderRoute("/vision");
    await route.waitForIdle();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Tầm nhìn 3 năm của bạn/i,
      }),
    ).toBeInTheDocument();
    expectNoDemoOnlyCopy();
    await route.dispose();
  });
});

// Task 9.2: copy đếm ngược/hạn gói theo mode ở cấp helper `resolveModeAwareCopy`.
// TrialCountdownBanner (src/app/pages/Dashboard.tsx) dựng `detailCopy` qua helper
// này; test ở cấp helper là cách nhẹ và ổn định nhất để bảo đảm real mode dùng
// copy gắn với tài khoản, không rò rỉ "trên trình duyệt này".
// Validates: Requirements 8.3, 8.5, 9.7
describe("mode-aware countdown copy (Dashboard TrialCountdownBanner)", () => {
  // Tái hiện đúng cách TrialCountdownBanner dựng detailCopy theo App_Mode.
  const buildCountdownDetail = (daysLeft: number, demoMode: boolean) =>
    resolveModeAwareCopy(
      `còn ${daysLeft} ngày ${demoMode ? "trên trình duyệt này" : "trên tài khoản này"}.`,
      demoMode ? "demo" : "real",
    );

  it("uses account-bound countdown copy in real mode", () => {
    const detail = buildCountdownDetail(7, false);

    expect(detail).toContain("trên tài khoản này");
    expect(detail).not.toContain("trên trình duyệt này");
  });

  it("keeps browser-bound countdown copy in demo mode", () => {
    const detail = buildCountdownDetail(7, true);

    expect(detail).toContain("trên trình duyệt này");
  });

  it("sanitizes browser-bound countdown copy if it ever reaches real mode", () => {
    // Ngay cả khi chuỗi Demo_Only_Copy lọt vào real mode, helper phải rewrite
    // thành copy gắn với tài khoản (Req 8.3).
    const detail = resolveModeAwareCopy("còn 7 ngày trên trình duyệt này.", "real");

    expect(detail).toContain("trên tài khoản này");
    expect(detail).not.toContain("trên trình duyệt này");
  });
});
