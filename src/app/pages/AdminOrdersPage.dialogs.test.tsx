import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const adminServiceMock = vi.hoisted(() => ({
  adminGetOverview: vi.fn(),
  adminListPaymentOrders: vi.fn(),
  adminListRefundRequests: vi.fn(),
  adminCompletePaymentOrderManually: vi.fn(),
  adminCompleteRefundRequest: vi.fn(),
  adminRejectRefundRequest: vi.fn(),
  adminSendExpiringBillingReminders: vi.fn(),
}));

const orderServiceMock = vi.hoisted(() => ({
  adminGetOrders: vi.fn(),
  adminUpdateOrderStatus: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/services/adminService", () => ({
  adminGetOverview: adminServiceMock.adminGetOverview,
  adminListPaymentOrders: adminServiceMock.adminListPaymentOrders,
  adminListRefundRequests: adminServiceMock.adminListRefundRequests,
  adminCompletePaymentOrderManually: adminServiceMock.adminCompletePaymentOrderManually,
  adminCompleteRefundRequest: adminServiceMock.adminCompleteRefundRequest,
  adminRejectRefundRequest: adminServiceMock.adminRejectRefundRequest,
  adminSendExpiringBillingReminders: adminServiceMock.adminSendExpiringBillingReminders,
}));

vi.mock("@/services/orderService", () => ({
  adminGetOrders: orderServiceMock.adminGetOrders,
  adminUpdateOrderStatus: orderServiceMock.adminUpdateOrderStatus,
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

  adminServiceMock.adminGetOverview.mockResolvedValue({
    generatedAt: new Date().toISOString(),
    email: { provider: "smtp", configured: true },
    summary: {
      totalUsers: 10,
      adminUsers: 1,
      activePlusSubscriptions: 4,
      expiringSoonSubscriptions: 1,
      pendingPaymentOrders: 1,
      completedPaymentOrders: 3,
      physicalOrders: 0,
      revenueTotalVnd: 300000,
      revenueLast30DaysVnd: 120000,
    },
    recentUsers: [],
    recentPayments: [],
  });

  orderServiceMock.adminGetOrders.mockResolvedValue([]);

  adminServiceMock.adminListPaymentOrders.mockResolvedValue({
    generatedAt: new Date().toISOString(),
    query: "",
    status: "all",
    limit: 50,
    total: 1,
    items: [
      {
        orderId: "VBPAY00001",
        userId: "user_1",
        planCode: "PLUS",
        billingCycle: "twelve_week",
        amount: 99000,
        currency: "VND",
        status: "pending",
        provider: "casso",
        createdAt: new Date().toISOString(),
        completedAt: undefined,
        expiresAt: undefined,
        updatedAt: new Date().toISOString(),
        user: {
          firebaseUid: "user_1",
          email: "user1@example.test",
          displayName: "User 1",
          role: "user",
          createdAt: new Date().toISOString(),
        },
      },
    ],
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

  adminServiceMock.adminCompletePaymentOrderManually.mockResolvedValue({
    orderId: "VBPAY00001",
    status: "completed",
    completedAt: new Date().toISOString(),
    eventStatus: "processed",
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

  adminServiceMock.adminRejectRefundRequest.mockResolvedValue({
    request: {
      id: "507f1f77bcf86cd799439011",
      orderId: "VBREF00001",
      userId: "user_1",
      userEmail: "user1@example.test",
      contactEmail: "user1@example.test",
      reason: "Không còn nhu cầu dùng Plus",
      refundAccount: "VCB - 0123456789 - Nguyen Van A",
      status: "rejected",
      adminNote: "Không đủ điều kiện hoàn tiền.",
      resolvedBy: "admin_uid",
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  adminServiceMock.adminSendExpiringBillingReminders.mockResolvedValue({
    configured: true,
    email: { provider: "smtp", configured: true },
    daysAhead: 7,
    windowEnd: new Date().toISOString(),
    scanned: 1,
    sent: 1,
    skipped: 0,
    duplicate: 0,
    failed: 0,
  });

  orderServiceMock.adminUpdateOrderStatus.mockResolvedValue({});
}

describe("AdminOrdersPage dialogs", () => {
  beforeEach(() => {
    vi.resetModules();
    seedMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses in-app dialog for manual payment note and never calls window.prompt", async () => {
    const promptSpy = vi.spyOn(window, "prompt");
    const user = userEvent.setup();
    const { AdminOrdersPage } = await import("./AdminOrdersPage");

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>,
    );

    const manualButton = await screen.findByRole("button", { name: "Mở Plus thủ công" });
    await user.click(manualButton);

    const dialog = await screen.findByRole("alertdialog", { name: "Mở Plus thủ công?" });
    const noteInput = within(dialog).getByLabelText("Ghi chú đối chiếu");
    await user.clear(noteInput);
    await user.type(noteInput, "Đã đối chiếu tiền vào Casso thành công.");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận mở Plus" }));

    await waitFor(() => {
      expect(adminServiceMock.adminCompletePaymentOrderManually).toHaveBeenCalledWith("VBPAY00001", {
        manualCompletionNote: "Đã đối chiếu tiền vào Casso thành công.",
      });
    });

    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("uses in-app dialog for refund resolve note and never calls window.prompt", async () => {
    const promptSpy = vi.spyOn(window, "prompt");
    const user = userEvent.setup();
    const { AdminOrdersPage } = await import("./AdminOrdersPage");

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>,
    );

    const refundTabButton = await screen.findByRole("button", { name: /Hoàn tiền \(1\)/i });
    await user.click(refundTabButton);

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
