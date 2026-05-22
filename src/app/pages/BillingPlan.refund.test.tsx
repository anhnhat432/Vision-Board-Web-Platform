import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: apiClientMock,
  toAppError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Không thể gửi yêu cầu.",
  }),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useOptionalAuthContext: () => ({
    user: {
      uid: "refund_user_1",
      email: "buyer@example.test",
      emailVerified: true,
    },
  }),
}));

const UI_TEST_TIMEOUT_MS = 30_000;

describe("BillingPlan refund request", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
    vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", "Nhà cung cấp thanh toán");
    vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "support@example.test");
    vi.stubEnv("VITE_REFUND_WINDOW_DAYS", "7");
    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it(
    "opens the refund form and updates the order status after submit",
    async () => {
      const paidAt = new Date().toISOString();
      apiClientMock.get.mockResolvedValue({
        orders: [
          {
            orderId: "VBREF0001",
            planCode: "PLUS",
            billingCycle: "twelve_week",
            amount: 99000,
            currency: "VND",
            status: "completed",
            provider: "casso",
            createdAt: paidAt,
            completedAt: paidAt,
            expiresAt: null,
            receiptSentAt: paidAt,
            refundRequest: null,
          },
        ],
      });
      apiClientMock.post.mockResolvedValue({
        request: {
          id: "refund_1",
          orderId: "VBREF0001",
          contactEmail: "buyer@example.test",
          status: "pending",
          createdAt: paidAt,
          resolvedAt: null,
        },
      });

      const { BillingPlan } = await import("./BillingPlan");
      const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
        initialEntries: ["/billing/plan"],
      });
      const user = userEvent.setup();
      render(<RouterProvider router={router} />);

      const refundButton = await screen.findByRole("button", { name: "Yêu cầu hoàn tiền" });
      await user.click(refundButton);

      const dialog = await screen.findByRole("dialog", { name: "Yêu cầu hoàn tiền" });
      expect(within(dialog).getByLabelText("Mã đơn hàng")).toHaveValue("VBREF0001");
      expect(within(dialog).getByLabelText("Email liên hệ")).toHaveValue("buyer@example.test");

      fireEvent.change(within(dialog).getByLabelText("Lý do hoàn tiền"), {
        target: { value: "Tôi không còn nhu cầu sử dụng Plus." },
      });
      fireEvent.change(within(dialog).getByLabelText("Số tài khoản ngân hàng nhận tiền hoàn"), {
        target: { value: "VCB - 0123456789 - Nguyen Van A" },
      });
      await user.click(within(dialog).getByRole("button", { name: "Gửi yêu cầu hoàn tiền" }));

      await waitFor(() => {
        expect(apiClientMock.post).toHaveBeenCalledWith(
          "/billing/orders/VBREF0001/refund-request",
          expect.objectContaining({
            contactEmail: "buyer@example.test",
            reason: "Tôi không còn nhu cầu sử dụng Plus.",
            refundAccount: "VCB - 0123456789 - Nguyen Van A",
          }),
        );
      });
      expect(await screen.findByText(/Hoàn tiền: Đang chờ xử lý/i)).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );
});
