import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: apiClientMock,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    user: { uid: "user_1", email: "buyer@example.test", emailVerified: true },
    authLoading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { OrderStatusPage } from "./OrderStatusPage";

function createPaymentOrder(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    orderId: "VBPOLL0001",
    status: "pending",
    amount: 99000,
    currency: "VND",
    bankAccount: "1234567890",
    bankName: "VCB",
    accountName: "DEAR OUR FUTURE",
    description: "VBPOLL0001",
    qrDataUrl: "data:image/png;base64,qr",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 15 * 60_000).toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function renderOrderStatus(initialPath = "/order-status/VBPOLL0001") {
  const router = createMemoryRouter(
    [
      { path: "/order-status/:orderId", element: <OrderStatusPage /> },
      { path: "/billing/plan", element: <div>Billing plan page</div> },
    ],
    { initialEntries: [initialPath] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("OrderStatusPage payment polling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-15T08:00:00.000Z"));
    vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "support@example.test");
    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
    toastMock.success.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("redirects to billing plan when polling returns completed", async () => {
    apiClientMock.get
      .mockResolvedValueOnce(createPaymentOrder())
      .mockResolvedValueOnce(createPaymentOrder({ status: "completed", completedAt: new Date().toISOString() }));

    renderOrderStatus();

    expect(await screen.findByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => {
      expect(screen.getByText("Plus đã kích hoạt!")).toBeInTheDocument();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(await screen.findByText("Billing plan page")).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Plus đã kích hoạt!");
  });

  it("shows cancelled message after 15 minute timeout", async () => {
    apiClientMock.get.mockResolvedValue(createPaymentOrder());

    renderOrderStatus();

    expect(await screen.findByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(await screen.findByText("Đơn hàng đã huỷ")).toBeInTheDocument();
    expect(screen.getByText(/Nếu bạn đã chuyển khoản, liên hệ support@example.test/)).toBeInTheDocument();
  });

  it("posts user confirmation without changing local status", async () => {
    apiClientMock.get.mockResolvedValue(createPaymentOrder());
    apiClientMock.post.mockResolvedValue({ orderId: "VBPOLL0001", userConfirmedTransferAt: new Date().toISOString() });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderOrderStatus();

    expect(await screen.findByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await user.click(await screen.findByRole("button", { name: "Tôi đã chuyển khoản xong" }));

    await waitFor(() => {
      expect(apiClientMock.post).toHaveBeenCalledWith(
        "/billing/orders/VBPOLL0001/userConfirmedTransfer",
        expect.objectContaining({ userConfirmedTransferAt: expect.any(String) }),
      );
    });
    expect(screen.getByText("Cảm ơn bạn! Chúng tôi đang xác nhận giao dịch (thường 1-2 phút).")).toBeInTheDocument();
    expect(screen.getByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
  });
});
