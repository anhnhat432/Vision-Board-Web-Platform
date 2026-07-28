import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteCloudWorkspaceMock, deleteAccountMock } = vi.hoisted(() => ({
  deleteCloudWorkspaceMock: vi.fn(() => Promise.resolve({ policy: "soft", counts: {} })),
  deleteAccountMock: vi.fn(() => Promise.resolve({ firebaseAccountDeleted: true })),
}));

vi.mock("@/services/syncService", () => ({
  deleteCloudWorkspace: deleteCloudWorkspaceMock,
  deleteAccount: deleteAccountMock,
  exportCloudWorkspace: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: { uid: "test-user-123" },
    userProfile: { displayName: "Test User" },
    authLoading: false,
    isConfigured: true,
  }),
  useOptionalAuthContext: () => ({
    user: { uid: "test-user-123" },
  }),
}));

import * as appMode from "@/app/utils/app-mode";
import { readGoal, renderAppRoute, resetTestStorage, seedTwelveWeekGoal } from "@/test/app-flow-helpers";

describe("12-week destructive confirmations", () => {
  beforeEach(() => {
    resetTestStorage();
    deleteCloudWorkspaceMock.mockClear();
    deleteAccountMock.mockClear();
    vi.spyOn(appMode, "isDemoMode").mockReturnValue(false);
    vi.spyOn(appMode, "isRealMode").mockReturnValue(true);
    vi.spyOn(appMode, "shouldEnable12WeekPullSync").mockReturnValue(true);
    vi.spyOn(appMode, "shouldEnable12WeekMutationSync").mockReturnValue(true);
  });

  it("requires checkbox confirmation before deleting cloud workspace", async () => {
    seedTwelveWeekGoal();
    renderAppRoute("/12-week-system?tab=settings");
    const user = userEvent.setup();

    // Click tab Cài đặt to ensure we are on the settings view
    const settingsTab = await screen.findByRole("tab", { name: /Cài đặt/i });
    await user.click(settingsTab);

    // Wait for the destructive settings group to fully render
    await screen.findByRole("heading", { name: "Dữ liệu và nguy hiểm" });

    // Click "Xóa dữ liệu tài khoản" button to open AlertDialog
    const deleteCloudBtn = await screen.findByRole("button", { name: /Xóa dữ liệu tài khoản/i });
    await user.click(deleteCloudBtn);

    // Verify AlertDialog is open
    expect(await screen.findByText("Xóa dữ liệu 12 tuần đã đồng bộ?")).toBeInTheDocument();

    // Action button should be disabled initially before checking the checkbox
    const confirmActionBtn = screen.getByRole("button", { name: "Xóa dữ liệu đã đồng bộ" });
    expect(confirmActionBtn).toBeDisabled();

    // Clicking it should do nothing
    fireEvent.click(confirmActionBtn);
    expect(deleteCloudWorkspaceMock).not.toHaveBeenCalled();

    // Check the confirmation checkbox
    const checkbox = screen.getByLabelText("Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.");
    await user.click(checkbox);

    // Type the confirmation text XOACLOUD
    const textInput = screen.getByPlaceholderText("XOACLOUD");
    await user.type(textInput, "XOACLOUD");

    // Action button should now be enabled
    expect(confirmActionBtn).toBeEnabled();

    // Click to confirm
    await user.click(confirmActionBtn);

    // Verify API is called
    await waitFor(() => {
      expect(deleteCloudWorkspaceMock).toHaveBeenCalled();
    });
  });

  it("requires checkbox confirmation before deleting account and all data", async () => {
    seedTwelveWeekGoal();
    renderAppRoute("/12-week-system?tab=settings");
    const user = userEvent.setup();

    // Click tab Cài đặt to ensure we are on the settings view
    const settingsTab = await screen.findByRole("tab", { name: /Cài đặt/i });
    await user.click(settingsTab);

    // Wait for the destructive settings group to fully render
    await screen.findByRole("heading", { name: "Dữ liệu và nguy hiểm" });

    // Click "Xóa tài khoản" button to open DeleteDataConfirmationDialog (lấy nút đầu tiên vì có 2 nút trùng tên)
    const deleteAccountBtns = await screen.findAllByRole("button", { name: /Xóa tài khoản/i });
    await user.click(deleteAccountBtns[0]);

    // Verify Dialog is open
    expect(await screen.findByText("Xóa tài khoản và dữ liệu?")).toBeInTheDocument();

    // Action button should be disabled initially
    const confirmActionBtn = screen.getByRole("button", { name: "Xóa tài khoản và dữ liệu" });
    expect(confirmActionBtn).toBeDisabled();

    // Clicking it should do nothing
    fireEvent.click(confirmActionBtn);
    expect(deleteAccountMock).not.toHaveBeenCalled();

    // Check the confirmation checkbox
    const checkbox = screen.getByLabelText("Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.");
    await user.click(checkbox);

    // Type the confirmation text XOATAIKHOAN
    const textInput = screen.getByPlaceholderText("XOATAIKHOAN");
    await user.type(textInput, "XOATAIKHOAN");

    // Action button should now be enabled
    expect(confirmActionBtn).toBeEnabled();

    // Click to confirm
    await user.click(confirmActionBtn);

    // Verify API is called
    await waitFor(() => {
      expect(deleteAccountMock).toHaveBeenCalled();
    });
  });

  it("keeps local 12-week data when account deletion fails", async () => {
    deleteAccountMock.mockRejectedValueOnce(new Error("Backend account deletion failed"));
    const { goalId } = seedTwelveWeekGoal({ title: "Keep local 12-week cycle" });
    const { router } = renderAppRoute("/12-week-system?tab=settings");
    const user = userEvent.setup();

    const settingsTab = await screen.findByRole("tab", { name: /Cài đặt/i });
    await user.click(settingsTab);
    await screen.findByRole("heading", { name: "Dữ liệu và nguy hiểm" });

    const deleteAccountBtns = await screen.findAllByRole("button", { name: /Xóa tài khoản/i });
    await user.click(deleteAccountBtns[0]);

    const checkbox = screen.getByLabelText("Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.");
    await user.click(checkbox);
    await user.type(screen.getByPlaceholderText("XOATAIKHOAN"), "XOATAIKHOAN");
    await user.click(screen.getByRole("button", { name: "Xóa tài khoản và dữ liệu" }));

    await waitFor(() => {
      expect(deleteAccountMock).toHaveBeenCalledTimes(1);
    });
    expect(readGoal(goalId).title).toBe("Keep local 12-week cycle");
    expect(router.state.location.pathname).toBe("/12-week-system");
  });
});
