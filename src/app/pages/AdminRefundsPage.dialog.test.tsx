import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const adminServiceMock = vi.hoisted(() => ({
  adminListRefundRequests: vi.fn(),
  adminCompleteRefundRequest: vi.fn(),
  adminRejectRefundRequest: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/services/adminService", () => ({
  adminListRefundRequests: adminServiceMock.adminListRefundRequests,
  adminCompleteRefundRequest: adminServiceMock.adminCompleteRefundRequest,
  adminRejectRefundRequest: adminServiceMock.adminRejectRefundRequest,
}));

function seedMocks() {
  authContextMock.useAuthContext.mockReturnValue({
    authLoading: false,
    refreshUserProfile: vi.fn(),
    user: { uid: "admin_uid", email: "admin@example.test" },
    userProfile: {
      id: "profile_admin",
      firebaseUid: "admin_uid",
      email: "admin@example.test",
      displayName: "Admin",
      role: "admin",
      onboardingCompletedAt: null,
      termsAcceptedAt: null,
      avatarUrl: null,
      locale: "vi-VN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    userProfileError: null,
    userProfileLoading: false,
  });

  adminServiceMock.adminListRefundRequests.mockResolvedValue({
    status: "pending",
    total: 1,
    items: [
      {
        id: "507f1f77bcf86cd799439011",
        orderId: "VBREF00001",
        userId: "user_1",
        userEmail: "user1@example.test",
        contactEmail: "user1@example.test",
        reason: "Không còn nhu cầu dùng Plus",
        refundAccount: "VCB - 0123456789 - Nguyen Van A",
        status: "pending",
        adminNote: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  adminServiceMock.adminCompleteRefundRequest.mockResolvedValue({
    request: {
      id: "507f1f77bcf86cd799439011",
      orderId: "VBREF00001",
      userId: "user_1",
      userEmail: "user1@example.test",
      contactEmail: "user1@example.test",
      reason: "Không còn nhu cầu dùng Plus",
      refundAccount: "VCB - 0123456789 - Nguyen Van A",
      status: "completed",
      adminNote: "Đã chuyển khoản hoàn tiền thủ công.",
      resolvedBy: "admin_uid",
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

describe("AdminRefundsPage resolve dialog", () => {
  beforeEach(() => {
    vi.resetModules();
    seedMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses in-app dialog for refund resolve note and never calls window.prompt", async () => {
    const promptSpy = vi.spyOn(window, "prompt");
    const user = userEvent.setup();
    const { AdminRefundsPage } = await import("./AdminRefundsPage");

    render(
      <MemoryRouter>
        <AdminRefundsPage />
      </MemoryRouter>,
    );

    const completeRefundButton = await screen.findByRole("button", { name: "Đã hoàn tiền" });
    await user.click(completeRefundButton);

    const dialog = await screen.findByRole("alertdialog", { name: "Xác nhận đã hoàn tiền?" });
    expect(within(dialog).getByText("VCB - 0123456789 - Nguyen Van A")).toBeInTheDocument();

    const noteInput = within(dialog).getByLabelText("Ghi chú admin");
    await user.clear(noteInput);
    await user.type(noteInput, "Đã chuyển khoản hoàn tiền ngày 15/05.");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận đã hoàn tiền" }));

    await waitFor(() => {
      expect(adminServiceMock.adminCompleteRefundRequest).toHaveBeenCalledWith("507f1f77bcf86cd799439011", {
        adminNote: "Đã chuyển khoản hoàn tiền ngày 15/05.",
      });
    });

    expect(promptSpy).not.toHaveBeenCalled();
  });
});
