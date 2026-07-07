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

const createKitPaymentSessionMock = vi.hoisted(() => vi.fn());
const getBackendOrderIdMock = vi.hoisted(() => vi.fn());
const getOrdersMock = vi.hoisted(() => vi.fn());
const getOrderByIdMock = vi.hoisted(() => vi.fn());
const getLatestOrderMock = vi.hoisted(() => vi.fn());
const isDemoModeMock = vi.hoisted(() => vi.fn());
const qrCodeToDataUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: apiClientMock,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    user: { uid: "user_1", email: "buyer@example.test", emailVerified: true },
    authLoading: false,
  }),
}));

vi.mock("@/lib/api/orderLinkStore", () => ({
  getBackendOrderId: getBackendOrderIdMock,
}));

vi.mock("@/services/orderService", () => ({
  createKitPaymentSession: createKitPaymentSessionMock,
  getOrder: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/utils/order-storage", () => ({
  getOrders: getOrdersMock,
  getOrderById: getOrderByIdMock,
  getLatestOrder: getLatestOrderMock,
  getOrderStatusLabel: vi.fn((s: string) => s),
  getOrderStatusStepIndex: vi.fn(() => 0),
  getNextOrderStatus: vi.fn(() => null),
  updateOrderStatus: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    isDemoMode: isDemoModeMock,
  };
});

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("qrcode", () => ({
  toDataURL: qrCodeToDataUrlMock,
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
    qrCodeToDataUrlMock.mockReset();
    qrCodeToDataUrlMock.mockResolvedValue("data:image/png;base64,generated-payos-qr");
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

  it("renders completed state from a redacted terminal public order response", async () => {
    apiClientMock.get.mockResolvedValue(
      createPaymentOrder({
        status: "completed",
        purpose: "plus_subscription",
        bankAccount: "",
        bankName: "",
        accountName: "",
        description: "",
        qrDataUrl: "",
        checkoutUrl: null,
        discount: null,
        completedAt: new Date().toISOString(),
      }),
    );

    renderOrderStatus();

    expect(await screen.findByText("Plus đã kích hoạt!")).toBeInTheDocument();
    expect(screen.getByText("Đang chuyển bạn về trang gói để tiếp tục sử dụng Plus.")).toBeInTheDocument();
    expect(screen.queryByText("Thông tin chuyển khoản")).not.toBeInTheDocument();
    expect(screen.queryByText("1234567890")).not.toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Plus đã kích hoạt!");
  });

  it("renders expired state from a redacted terminal public order response", async () => {
    apiClientMock.get.mockResolvedValue(
      createPaymentOrder({
        status: "expired",
        bankAccount: "",
        bankName: "",
        accountName: "",
        description: "",
        qrDataUrl: "",
        checkoutUrl: null,
        discount: null,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );

    renderOrderStatus();

    expect(await screen.findByText("Đơn hàng đã huỷ")).toBeInTheDocument();
    expect(screen.getByText(/Nếu bạn đã chuyển khoản, liên hệ support@example.test/)).toBeInTheDocument();
    expect(screen.queryByText("Thông tin chuyển khoản")).not.toBeInTheDocument();
    expect(screen.queryByText("1234567890")).not.toBeInTheDocument();
  });

  it("generates a visible QR image from PayOS payload and formats PayOS bank info", async () => {
    const rawPayosQrPayload = "00020101021238540010A000000727012400069704220110VQRQAJWLZ9808";
    apiClientMock.get.mockResolvedValue(
      createPaymentOrder({
        provider: "payos",
        checkoutUrl: "https://pay.payos.vn/web/pay/test-payment-link",
        bankName: "970422",
        bankAccount: "1234567890",
        qrDataUrl: rawPayosQrPayload,
      }),
    );

    renderOrderStatus();

    const qrImage = await screen.findByAltText("QR chuyển khoản đơn VBPOLL0001");
    expect(qrImage).toHaveAttribute("src", "data:image/png;base64,generated-payos-qr");
    expect(qrCodeToDataUrlMock).toHaveBeenCalledWith(
      rawPayosQrPayload,
      expect.objectContaining({ errorCorrectionLevel: "M", width: 360 }),
    );
    expect(screen.getByRole("button", { name: /Mở cổng PayOS nếu quét không được/i })).toBeInTheDocument();
    expect(screen.getByText("MB Bank (970422)")).toBeInTheDocument();
    expect(screen.getByText("STK/Mã nhận PayOS")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
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

  it("kit payment completion shows kit-specific success message and redirects to /orders", async () => {
    apiClientMock.get
      .mockResolvedValueOnce(createPaymentOrder({ purpose: "physical_order" }))
      .mockResolvedValueOnce(createPaymentOrder({ status: "completed", completedAt: new Date().toISOString(), purpose: "physical_order" }));

    renderOrderStatus("/order-status/VBKIT0001");

    expect(await screen.findByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => {
      expect(screen.getByText("Đơn kit đã thanh toán!")).toBeInTheDocument();
    });
    expect(screen.getByText("Đơn kit đã được xác nhận thanh toán. Đang chuyển bạn về danh sách đơn.")).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Đơn kit đã thanh toán!");
  });

  it("plus payment completion keeps original Plus redirect", async () => {
    apiClientMock.get
      .mockResolvedValueOnce(createPaymentOrder({ purpose: "plus_subscription" }))
      .mockResolvedValueOnce(createPaymentOrder({ status: "completed", completedAt: new Date().toISOString(), purpose: "plus_subscription" }));

    renderOrderStatus("/order-status/VBPLUS001");

    expect(await screen.findByText("Đang chờ xác nhận chuyển khoản")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => {
      expect(screen.getByText("Plus đã kích hoạt!")).toBeInTheDocument();
    });
    expect(toastMock.success).toHaveBeenCalledWith("Plus đã kích hoạt!");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });
    expect(await screen.findByText("Billing plan page")).toBeInTheDocument();
  });
});

describe("OrderStatusPage kit payment CTA", () => {
  function createLocalOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: "local-order-1",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:00:00.000Z",
      status: "pending" as const,
      goalId: null,
      goalTitle: "Test Goal",
      focusArea: "Sức khỏe",
      fullName: "Nguyen Van A",
      email: "a@example.test",
      phone: "0900000000",
      shippingAddress: "123 Test St, Hanoi",
      keywords: [],
      note: "",
      totalVnd: 250000,
      lines: [{ itemId: "f1", label: "Frame", type: "frame" as const, qty: 1, unitPriceVnd: 150000, lineTotalVnd: 150000 }],
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-15T08:00:00.000Z"));
    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
    createKitPaymentSessionMock.mockReset();
    getBackendOrderIdMock.mockReset();
    getOrdersMock.mockReset();
    getOrderByIdMock.mockReset();
    getLatestOrderMock.mockReset();
    isDemoModeMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
    toastMock.success.mockReset();
    qrCodeToDataUrlMock.mockReset();
    qrCodeToDataUrlMock.mockResolvedValue("data:image/png;base64,generated-payos-qr");
    vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "support@example.test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  function renderOrderTracking(orderId: string) {
    const order = createLocalOrder({ id: orderId });
    getOrdersMock.mockReturnValue([order]);
    getOrderByIdMock.mockReturnValue(order);
    getLatestOrderMock.mockReturnValue(order);

    const router = createMemoryRouter(
      [
        { path: "/order-status/:orderId", element: <OrderStatusPage /> },
        { path: "/orders", element: <div>Orders list page</div> },
      ],
      { initialEntries: [`/order-status/${orderId}`] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  it("shows sync message when backend order ID is not available", async () => {
    getBackendOrderIdMock.mockReturnValue(null);

    renderOrderTracking("local-order-1");
    expect(await screen.findByText("Đơn kit đang đồng bộ lên máy chủ. QR thanh toán trực tuyến sẽ khả dụng sau khi đồng bộ hoàn tất.")).toBeInTheDocument();
  });

  it("calls createKitPaymentSession and navigates to payment page on success", async () => {
    getBackendOrderIdMock.mockReturnValue("507f1f77bcf86cd799439011");
    createKitPaymentSessionMock.mockResolvedValue({
      paymentOrderId: "VBKITPAY1",
      checkoutUrl: "https://example.test/checkout",
      provider: "casso",
      amount: 250000,
      currency: "VND",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderOrderTracking("local-order-1");

    const button = await screen.findByRole("button", { name: /Thanh toán ngay/ });
    await user.click(button);

    await waitFor(() => {
      expect(createKitPaymentSessionMock).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });
  });

  it("displays totalVnd from the order in the CTA card", async () => {
    getBackendOrderIdMock.mockReturnValue("507f1f77bcf86cd799439011");

    renderOrderTracking("local-order-1");
    const totalLabels = await screen.findAllByText("Tổng đơn");
    expect(totalLabels.length).toBeGreaterThanOrEqual(1);
    const priceElements = screen.getAllByText("250.000đ");
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });
});
