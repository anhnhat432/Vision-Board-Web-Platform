import { render, screen } from "@testing-library/react";
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
  shouldEnable12WeekImportDryRun: () => false,
  shouldEnable12WeekCloudImport: () => false,
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: () => false,
}));

vi.mock("@/services/syncService", () => ({
  post12WeekImportValidation: vi.fn(),
  post12WeekImport: vi.fn(),
}));

vi.mock("./utils/production", () => ({
  maybeShowBrowserReminderNotification: vi.fn(),
  syncEntitlementsWithProvider: vi.fn(),
  syncPendingOutbox: vi.fn(),
}));

import { appRoutes } from "./routes";

function renderRoute(pathname: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [pathname] });
  return render(<RouterProvider router={router} />);
}

describe("public legal routes", () => {
  beforeEach(() => {
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
});
