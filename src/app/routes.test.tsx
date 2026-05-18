import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));
const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
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
    clearFirstLoginRestoreSummary: autoCloudSyncMock.clearFirstLoginRestoreSummary,
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
}));

vi.mock("./hooks/useBackendPlanHydration", () => ({
  BACKEND_PLAN_HYDRATION_EVENT_NAME: "visionboard:backend-hydrated",
  useBackendPlanHydration: () => ({ loading: false, result: null, error: null }),
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
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ orders: [] }),
    post: vi.fn(),
  },
  isApiBaseUrlConfigured: () => false,
  toAppError: (error: unknown) => error,
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
  getLastRestoreAccessSnapshot: () => null,
  maybeShowBrowserReminderNotification: vi.fn(),
  openBillingCustomerPortal: vi.fn().mockResolvedValue({ ok: true, message: "Opened" }),
  resolveAppReturnPath: (path: string) => path,
  restorePlanAccess: vi.fn().mockResolvedValue({ ok: true, message: "Restored" }),
  syncEntitlementsWithProvider: vi.fn().mockResolvedValue({ ok: true, planCode: "FREE", message: "Synced" }),
  syncPendingOutbox: vi.fn(),
}));

import { initializeUserData, saveUserData } from "./utils/storage";
import { appRoutes } from "./routes";

function renderRoute(pathname: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [pathname] });
  return render(<RouterProvider router={router} />);
}

describe("app routes", () => {
  beforeEach(() => {
    localStorage.clear();
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
    renderRoute("/terms");
    expect(await screen.findByRole("heading", { name: /Điều khoản dịch vụ/i })).toBeInTheDocument();
  });

  it("resolves /privacy through the app route table", async () => {
    renderRoute("/privacy");
    expect(await screen.findByRole("heading", { name: /Chính sách bảo mật/i })).toBeInTheDocument();
  });

  it("resolves /billing/faq through the app route table", async () => {
    renderRoute("/billing/faq");

    expect(await screen.findByRole("heading", { name: /Câu hỏi thường gặp/i })).toBeInTheDocument();
    expect(screen.getByText("Làm sao tôi biết đã thanh toán thành công?")).toBeInTheDocument();
    expect(screen.getByText(/Bạn nhận biên nhận qua email/)).toBeInTheDocument();
  });

  it("redirects /billing to the billing plan page", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: { displayName: "Test User", email: "test@example.com" },
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

    renderRoute("/billing");

    expect(await screen.findByRole("heading", { name: /Chọn gói phù hợp với bạn/i })).toBeInTheDocument();
  });

  it("resolves /today-v2 through the app route table", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: { displayName: "Test User", email: "test@example.com" },
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

    renderRoute("/today-v2");

    expect(await screen.findByRole("heading", { name: /Hôm nay là một ngày bình tĩnh/i })).toBeInTheDocument();
    expect(screen.getByText("v0.4 · Design preview")).toBeInTheDocument();
  });

  it("resolves /settings through the app route table", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      user: { displayName: "Test User", email: "test@example.com" },
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
    renderRoute("/settings");

    expect(await screen.findByRole("heading", { level: 1, name: /Tu. ch.nh t.i kho.n/i })).toBeInTheDocument();
  });
});
