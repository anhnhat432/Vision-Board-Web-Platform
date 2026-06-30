import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserData, saveUserData } from "../utils/storage";
import { SettingsPage } from "./SettingsPage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const authActionsMock = vi.hoisted(() => ({
  logout: vi.fn(),
}));

type MockAutoSyncLastResult = {
  status: string;
  message: string;
};

const autoSyncStateMock = vi.hoisted(
  (): {
    syncing: boolean;
    online: boolean;
    pendingCount: number;
    lastSyncedAt: string | null;
    lastResult: MockAutoSyncLastResult | null;
    triggerSyncNow: ReturnType<typeof vi.fn>;
  } => ({
    syncing: false,
    online: true,
    pendingCount: 0,
    lastSyncedAt: null,
    lastResult: null,
    triggerSyncNow: vi.fn().mockResolvedValue({ status: "idle" }),
  }),
);

const syncedUserDataMock = vi.hoisted(() => ({
  useSyncedUserData: vi.fn(),
  reloadUserData: vi.fn(),
}));

const themeMock = vi.hoisted(() => ({
  useTheme: vi.fn(),
}));

const syncServiceMock = vi.hoisted(() => ({
  exportAccountData: vi.fn(),
  deleteAccount: vi.fn(),
  deleteCloudWorkspace: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(() => "toast-loading"),
  warning: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/features/plan12week/hooks/AutoCloudSyncProvider", () => ({
  useAutoCloudSyncContext: () => autoSyncStateMock,
}));

vi.mock("../hooks/useSyncedUserData", () => ({
  useSyncedUserData: syncedUserDataMock.useSyncedUserData,
}));

vi.mock("../hooks/useTheme", () => ({
  useTheme: themeMock.useTheme,
}));

vi.mock("@/services/syncService", () => ({
  exportAccountData: syncServiceMock.exportAccountData,
  deleteAccount: syncServiceMock.deleteAccount,
  deleteCloudWorkspace: syncServiceMock.deleteCloudWorkspace,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("../components/ScreenGuide", () => ({
  ScreenGuide: () => null,
}));

vi.mock("../components/layout/PageHero", () => ({
  PageHero: ({ title }: { title: string }) => <div>{title}</div>,
}));

function LocationProbe({
  onPathnameChange,
}: {
  onPathnameChange: (pathname: string) => void;
}) {
  const location = useLocation();
  onPathnameChange(location.pathname);
  return null;
}

function renderPage(initialEntry = "/settings") {
  let pathname = initialEntry;
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe
        onPathnameChange={(nextPathname) => {
          pathname = nextPathname;
        }}
      />
      <SettingsPage />
    </MemoryRouter>,
  );
  return { getPathname: () => pathname };
}

function saveLocalVisionSummary(summary: string) {
  saveUserData({
    ...getUserData(),
    aspirationalVision: {
      id: "vision_3y_1",
      horizonYears: 3,
      summary,
      lifeAreas: [],
      createdAt: "2026-06-25T08:00:00.000Z",
      updatedAt: "2026-06-25T08:00:00.000Z",
    },
  });
}

describe("SettingsPage account lifecycle", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    autoSyncStateMock.syncing = false;
    autoSyncStateMock.online = true;
    autoSyncStateMock.pendingCount = 0;
    autoSyncStateMock.lastSyncedAt = null;
    autoSyncStateMock.lastResult = null;

    authContextMock.useAuthContext.mockReturnValue({
      isConfigured: true,
      user: {
        uid: "user_1",
        email: "user@example.test",
        displayName: "User Test",
        photoURL: null,
      },
      userProfile: {
        email: "user@example.test",
        displayName: "User Test",
        avatarUrl: null,
        locale: "vi-VN",
      },
      logout: authActionsMock.logout,
    });

    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });

    themeMock.useTheme.mockReturnValue({
      theme: "light",
      resolvedTheme: "light",
      setTheme: vi.fn(),
    });

    syncServiceMock.exportAccountData.mockResolvedValue({
      generatedAt: "2026-06-25T08:00:00.000Z",
      version: 1,
      userId: "user_1",
      profile: { email: "user@example.test" },
      data: { goals: [] },
      counts: { goals: 0 },
    });
    syncServiceMock.deleteAccount.mockResolvedValue({
      deleted: true,
      deletedAt: "2026-06-25T08:00:00.000Z",
      firebaseAccountDeleted: true,
      counts: {},
    });
    syncServiceMock.deleteCloudWorkspace.mockResolvedValue({
      deletedAt: "2026-06-25T08:00:00.000Z",
      policy: "all",
      counts: {
        goals: 0,
        plans: 0,
        weeks: 0,
        tasks: 0,
        leadMetrics: 0,
        dailyCheckIns: 0,
        weeklyReviews: 0,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows account export for signed-in configured users and downloads account export", async () => {
    let downloadedFilename = "";
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:account-export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download;
    });

    const user = userEvent.setup();
    renderPage();
    expect(
      await screen.findByTestId("settings-account-export"),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: /Xuất dữ liệu tài khoản/i }),
    );

    await waitFor(() => {
      expect(syncServiceMock.exportAccountData).toHaveBeenCalledTimes(1);
    });
    expect(downloadedFilename).toBe(
      "dear-our-future-account-export-2026-06-25.json",
    );
    expect(toastMock.success).toHaveBeenCalledWith(
      "Đã tải bản xuất dữ liệu tài khoản.",
    );
  });

  it("hides cloud account actions when auth is unavailable", async () => {
    authContextMock.useAuthContext.mockReturnValue({
      isConfigured: false,
      user: null,
      userProfile: null,
      logout: authActionsMock.logout,
    });

    renderPage();

    expect(
      screen.queryByRole("button", { name: /Xuất dữ liệu tài khoản/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xóa tài khoản" }),
    ).not.toBeInTheDocument();
  });

  it("keeps local data intact when account export fails", async () => {
    saveLocalVisionSummary("Keep local vision safe");
    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });
    syncServiceMock.exportAccountData.mockRejectedValueOnce(
      new Error("Export unavailable"),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: /Xuất dữ liệu tài khoản/i }),
    );

    await waitFor(() => {
      expect(syncServiceMock.exportAccountData).toHaveBeenCalledTimes(1);
    });
    expect(getUserData().aspirationalVision?.summary).toBe(
      "Keep local vision safe",
    );
    expect(toastMock.error).toHaveBeenCalledWith("Export unavailable");
  });

  it("shows sync status, last sync time, and last result in the data section", async () => {
    const lastResultMessage =
      "Đồng bộ gần nhất chưa xong. Dữ liệu trên thiết bị vẫn an toàn để thử lại.";
    autoSyncStateMock.online = false;
    autoSyncStateMock.pendingCount = 2;
    autoSyncStateMock.lastSyncedAt = "2026-06-25T08:15:00.000Z";
    autoSyncStateMock.lastResult = {
      status: "drain_failed",
      message: lastResultMessage,
    };

    renderPage();

    expect(
      await screen.findByText("Lần cuối: 15:15:00 25/6/2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 thay đổi chờ đồng bộ")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Bạn đang mất kết nối\. Dữ liệu vẫn được lưu trên thiết bị và sẽ gửi lên tài khoản khi có mạng\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Kết quả gần nhất")).toBeInTheDocument();
    expect(screen.getByText(lastResultMessage)).toBeInTheDocument();
  });

  it("exposes stable sync trust test ids for production smoke coverage", async () => {
    autoSyncStateMock.online = true;
    autoSyncStateMock.pendingCount = 0;
    autoSyncStateMock.lastSyncedAt = "2026-06-25T08:15:00.000Z";

    renderPage();

    expect(
      await screen.findByTestId("settings-sync-section"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-sync-last-synced")).toHaveTextContent(
      "L\u1ea7n cu\u1ed1i: 15:15:00 25/6/2026",
    );
    expect(
      screen.getByTestId("settings-sync-pending-count"),
    ).toHaveTextContent(
      "Kh\u00f4ng c\u00f3 thay \u0111\u1ed5i ch\u1edd \u0111\u1ed3ng b\u1ed9",
    );
    expect(screen.getByTestId("settings-sync-status-copy")).toHaveTextContent(
      /Sao l\u01b0u s\u1eb5n s\u00e0ng\./i,
    );
    expect(
      screen.queryByTestId("settings-sync-last-result"),
    ).not.toBeInTheDocument();
  });

  it("shows account sync as local-only when outbox sync is blocked by unverified email", async () => {
    localStorage.setItem(
      "visionboard_last_outbox_sync",
      JSON.stringify({
        at: "2026-06-25T08:16:00.000Z",
        status: "email_unverified",
        syncedCount: 0,
        pendingCount: 2,
        message:
          "Vui lòng xác thực email trước khi đồng bộ cloud để bảo vệ dữ liệu tài khoản.",
      }),
    );

    renderPage();

    expect(
      await screen.findByTestId("settings-sync-email-unverified"),
    ).toHaveTextContent("Email chưa xác thực, cloud sync đang tạm dừng");
    expect(
      screen.getByTestId("settings-sync-email-unverified"),
    ).toHaveTextContent(
      "Vui lòng xác thực email trước khi đồng bộ cloud để bảo vệ dữ liệu tài khoản.",
    );
    expect(
      screen.getByText(/chưa thể sao lưu lên tài khoản/i),
    ).toBeInTheDocument();
  });

  it("deletes only synced 12-week cloud data from Settings after explicit confirmation", async () => {
    saveLocalVisionSummary("Keep this local vision");
    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Xóa dữ liệu tài khoản" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Xóa dữ liệu 12 tuần đã đồng bộ?"),
    ).toBeInTheDocument();
    const action = within(dialog).getByRole("button", {
      name: "Xóa dữ liệu đã đồng bộ",
    });
    expect(action).toBeDisabled();

    await user.click(
      within(dialog).getByLabelText(
        "Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.",
      ),
    );
    expect(action).toBeEnabled();
    await user.click(action);

    await waitFor(() => {
      expect(syncServiceMock.deleteCloudWorkspace).toHaveBeenCalledTimes(1);
    });
    expect(getUserData().aspirationalVision?.summary).toBe(
      "Keep this local vision",
    );
    expect(toastMock.success).toHaveBeenCalledWith(
      "Đã xóa dữ liệu 12 tuần đã sao lưu.",
      {
        description:
          "Dữ liệu trên thiết bị, quyền Plus và tài khoản không bị ảnh hưởng.",
      },
    );
  });

  it("clears local temporary signals from Settings without wiping core data", async () => {
    saveLocalVisionSummary("Keep data after clearing local signals");
    localStorage.setItem(
      "visionboard_last_outbox_sync",
      JSON.stringify({
        at: "2026-06-25T08:16:00.000Z",
        status: "drain_failed",
        syncedCount: 0,
        pendingCount: 1,
        message: "Một thay đổi chưa gửi được.",
      }),
    );
    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Xóa dữ liệu tạm" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Xóa dữ liệu tạm trên thiết bị?"),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Xóa dữ liệu tạm" }),
    );

    expect(localStorage.getItem("visionboard_last_outbox_sync")).toBeNull();
    expect(getUserData().aspirationalVision?.summary).toBe(
      "Keep data after clearing local signals",
    );
    expect(syncedUserDataMock.reloadUserData).toHaveBeenCalled();
  });

  it("deletes account through a two-step AlertDialog without window.confirm", async () => {
    saveLocalVisionSummary("Delete this after backend succeeds");
    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });
    const confirmSpy = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    const page = renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Xóa tài khoản" }),
    );
    const reviewDialog = await screen.findByTestId(
      "settings-delete-account-dialog",
    );
    expect(
      within(reviewDialog).getByText(/Hành động này xóa dữ liệu tài khoản/),
    ).toBeInTheDocument();

    await user.click(
      within(reviewDialog).getByTestId("settings-delete-account-continue"),
    );
    const finalDialog = await screen.findByTestId(
      "settings-delete-account-dialog",
    );
    expect(
      within(finalDialog).getByTestId("settings-delete-account-confirm"),
    ).toBeVisible();

    await user.click(
      within(finalDialog).getByTestId("settings-delete-account-confirm"),
    );

    await waitFor(() => {
      expect(syncServiceMock.deleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(authActionsMock.logout).toHaveBeenCalledTimes(1);
    expect(syncedUserDataMock.reloadUserData).toHaveBeenCalledTimes(1);
    expect(getUserData().aspirationalVision).toBeUndefined();
    expect(page.getPathname()).toBe("/");
  });

  it("keeps local data when backend account delete fails", async () => {
    saveLocalVisionSummary("Keep local data after failed delete");
    syncedUserDataMock.useSyncedUserData.mockReturnValue({
      userData: getUserData(),
      reloadUserData: syncedUserDataMock.reloadUserData,
    });
    syncServiceMock.deleteAccount.mockRejectedValueOnce(
      new Error("Delete unavailable"),
    );
    const user = userEvent.setup();
    const page = renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Xóa tài khoản" }),
    );
    const reviewDialog = await screen.findByTestId(
      "settings-delete-account-dialog",
    );
    await user.click(
      within(reviewDialog).getByTestId("settings-delete-account-continue"),
    );
    const finalDialog = await screen.findByTestId(
      "settings-delete-account-dialog",
    );
    await user.click(
      within(finalDialog).getByTestId("settings-delete-account-confirm"),
    );

    await waitFor(() => {
      expect(syncServiceMock.deleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(getUserData().aspirationalVision?.summary).toBe(
      "Keep local data after failed delete",
    );
    expect(authActionsMock.logout).not.toHaveBeenCalled();
    expect(syncedUserDataMock.reloadUserData).not.toHaveBeenCalled();
    expect(page.getPathname()).toBe("/settings");
    expect(toastMock.error).toHaveBeenCalledWith("Delete unavailable", {
      id: "toast-loading",
    });
  });
});
