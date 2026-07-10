import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const adminServiceMock = vi.hoisted(() => ({
  adminListPaymentOrders: vi.fn(),
  adminCompletePaymentOrderManually: vi.fn(),
  adminReconcilePaymentOrderPayerSource: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/services/adminService", () => ({
  adminListPaymentOrders: adminServiceMock.adminListPaymentOrders,
  adminCompletePaymentOrderManually: adminServiceMock.adminCompletePaymentOrderManually,
  adminReconcilePaymentOrderPayerSource: adminServiceMock.adminReconcilePaymentOrderPayerSource,
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

  adminServiceMock.adminCompletePaymentOrderManually.mockResolvedValue({
    orderId: "VBPAY00001",
    status: "completed",
    completedAt: new Date().toISOString(),
    eventStatus: "processed",
  });
  adminServiceMock.adminReconcilePaymentOrderPayerSource.mockResolvedValue({
    orderId: "VBPAY00001",
    payer: {
      classification: "external",
      accountLast4: "6789",
      accountNameMasked: "N*** V*** A***",
      bankName: "MB Bank",
      source: "reconciliation",
      observedAt: new Date().toISOString(),
    },
  });
}

describe("AdminPaymentsPage manual-complete dialog", () => {
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
    const { AdminPaymentsPage } = await import("./AdminPaymentsPage");

    render(
      <MemoryRouter>
        <AdminPaymentsPage />
      </MemoryRouter>,
    );

    const manualButton = await screen.findByRole("button", { name: "Mở Plus thủ công" });
    await user.click(manualButton);

    const dialog = await screen.findByRole("alertdialog", { name: "Mở Plus thủ công?" });
    const noteInput = within(dialog).getByLabelText("Ghi chú đối chiếu");
    await user.clear(noteInput);
    await user.type(noteInput, "Đã đối chiếu tiền vào cổng thanh toán thành công.");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận mở Plus" }));

    await waitFor(() => {
      expect(adminServiceMock.adminCompletePaymentOrderManually).toHaveBeenCalledWith("VBPAY00001", {
        manualCompletionNote: "Đã đối chiếu tiền vào cổng thanh toán thành công.",
      });
    });

    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("shows an unknown PayOS source and lets an admin reconcile the completed historical order", async () => {
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
          status: "completed",
          provider: "payos",
          payer: null,
          createdAt: new Date().toISOString(),
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
    const user = userEvent.setup();
    const { AdminPaymentsPage } = await import("./AdminPaymentsPage");

    render(
      <MemoryRouter>
        <AdminPaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Chưa xác định")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đối chiếu PayOS" }));

    await waitFor(() => {
      expect(adminServiceMock.adminReconcilePaymentOrderPayerSource).toHaveBeenCalledWith("VBPAY00001");
    });
    expect(await screen.findByText("Nguồn ngoài")).toBeInTheDocument();
    expect(screen.getByText("N*** V*** A*** · ****6789")).toBeInTheDocument();
  });
});
