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

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/services/adminService", () => ({
  adminListPaymentOrders: adminServiceMock.adminListPaymentOrders,
  adminCompletePaymentOrderManually: adminServiceMock.adminCompletePaymentOrderManually,
  adminReconcilePaymentOrderPayerSource: adminServiceMock.adminReconcilePaymentOrderPayerSource,
}));

function seedMocks() {
  toastMock.error.mockReset();
  toastMock.success.mockReset();
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
      accountMasked: "012****6789",
      bankName: "MB Bank",
      transactionReference: "TF_PAYOS_1",
      transactionDateTime: "2026-07-10T09:30:00.000Z",
      source: "reconciliation",
      observedAt: new Date().toISOString(),
    },
  });
}

describe("AdminPaymentsPage payment dialogs", () => {
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

  it("opens and reopens safe PayOS evidence after reconciling a completed historical order", async () => {
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
    const evidenceDialog = await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" });
    expect(within(evidenceDialog).getByText("Nguồn ngoài")).toBeInTheDocument();
    expect(within(evidenceDialog).getByText("012****6789")).toBeInTheDocument();
    expect(within(evidenceDialog).getByText("MB Bank")).toBeInTheDocument();
    expect(within(evidenceDialog).getByText("TF_PAYOS_1")).toBeInTheDocument();
    expect(
      within(evidenceDialog).getByText(
        "Kết quả chỉ so sánh với danh sách tài khoản nội bộ đã cấu hình, không chứng minh danh tính người chuyển tiền hoặc KYC.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("N*** V*** A*** · ****6789")).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Đối chiếu xong: Nguồn ngoài.", {
      description: "Tài khoản chuyển tiền không nằm trong danh sách nội bộ đã cấu hình.",
    });

    await user.click(within(evidenceDialog).getByRole("button", { name: "Đóng" }));
    await user.click(screen.getByRole("button", { name: "Xem chứng cứ" }));
    expect(await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" })).toBeInTheDocument();
  });

  it("shows fallback values when reopening legacy reconciliation evidence with missing fields", async () => {
    adminServiceMock.adminListPaymentOrders.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      query: "",
      status: "all",
      limit: 50,
      total: 1,
      items: [
        {
          orderId: "VBPAY_LEGACY",
          userId: "user_legacy",
          planCode: "PLUS",
          billingCycle: "twelve_week",
          amount: 99000,
          currency: "VND",
          status: "completed",
          provider: "payos",
          payer: {
            classification: "unknown",
            source: "reconciliation",
            observedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null,
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

    await user.click(await screen.findByRole("button", { name: "Xem chứng cứ" }));
    const evidenceDialog = await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" });
    expect(within(evidenceDialog).getAllByText("Không có dữ liệu")).toHaveLength(5);
  });

  it("does not expose evidence controls for webhook-only payer data", async () => {
    adminServiceMock.adminListPaymentOrders.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      query: "",
      status: "all",
      limit: 50,
      total: 1,
      items: [
        {
          orderId: "VBPAY_WEBHOOK",
          userId: "user_webhook",
          planCode: "PLUS",
          billingCycle: "twelve_week",
          amount: 99000,
          currency: "VND",
          status: "completed",
          provider: "payos",
          payer: {
            classification: "external",
            accountLast4: "6789",
            source: "webhook",
            observedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null,
        },
      ],
    });
    const { AdminPaymentsPage } = await import("./AdminPaymentsPage");

    render(
      <MemoryRouter>
        <AdminPaymentsPage />
      </MemoryRouter>,
    );

    await screen.findByText("Nguồn ngoài");
    expect(screen.queryByRole("button", { name: "Xem chứng cứ" })).not.toBeInTheDocument();
  });
});
