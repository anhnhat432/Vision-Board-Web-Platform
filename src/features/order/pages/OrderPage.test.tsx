import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import { getOrders } from "@/features/order/storage/order";
import { saveOrderLink } from "@/lib/api/orderLinkStore";
import { createOrder } from "@/services/orderService";

import OrderPage from "./OrderPage";

vi.mock("@/services/orderService", () => ({
  createOrder: vi.fn(),
}));

vi.mock("@/lib/api/orderLinkStore", () => ({
  saveOrderLink: vi.fn(),
}));

const mockUser = (emailVerified: boolean) => ({ emailVerified } as { emailVerified: boolean });

let _isRealMode = false;
vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: () => _isRealMode,
}));

let _mockUserValue: { emailVerified: boolean } = mockUser(true);
vi.mock("@/lib/auth/AuthContext", () => ({
  useOptionalAuthContext: () => ({ user: _mockUserValue }),
}));

function renderOrderPage() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <OrderPage /> },
      { path: "/order-status/:id", element: <div>order-status</div> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

async function fillShippingForm() {
  fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: "A B" } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "a@b.c" } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: "0900000000" } });
  fireEvent.change(screen.getByLabelText(/Địa chỉ giao hàng/), { target: { value: "Hanoi" } });
}

async function selectFrameAndTheme() {
  await screen.findByText(/Khung 30×40/);
  fireEvent.click(screen.getByText(/Khung 30×40/));
  fireEvent.click(screen.getByText("MONEY"));
}

async function confirmDialog() {
  await waitFor(() => {
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận đặt đơn" }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  _isRealMode = false;
  _mockUserValue = mockUser(true);
  vi.mocked(createOrder).mockResolvedValue({ id: "srv-1" } as Awaited<ReturnType<typeof createOrder>>);
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/order-catalog")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: DEFAULT_CATALOG }),
        });
      }
      return Promise.reject(new Error("unhandled"));
    }),
  );
});

describe("OrderPage", () => {
  it("submits with itemIds[] (no priceVnd) and saves localStorage", async () => {
    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

    await confirmDialog();

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalled();
      const payload = vi.mocked(createOrder).mock.calls[0]?.[0];
      expect(payload?.itemIds).toEqual(["frame:30x40", "theme:money"]);
      expect("priceVnd" in (payload ?? {})).toBe(false);
    });

    const [localOrder] = getOrders();
    expect(localOrder).toBeDefined();
    expect(saveOrderLink).toHaveBeenCalledWith(localOrder.id, "srv-1");
    expect(await screen.findByText("order-status")).toBeInTheDocument();
  });

  it("shows confirm dialog with order summary and allows cancel", async () => {
    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Xem lại" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("shows error when backend fails and allows retry", async () => {
    vi.mocked(createOrder).mockRejectedValueOnce(
      Object.assign(new Error("raw"), { status: 500 }),
    );

    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));
    await confirmDialog();

    await waitFor(() => {
      expect(
        screen.getAllByText("Máy chủ đang gặp sự cố. Đơn của bạn đã được lưu cục bộ, có thể thử lại sau.").length,
      ).toBeGreaterThan(0);
    });

    const [localOrder] = getOrders();
    expect(localOrder).toBeDefined();

    vi.mocked(createOrder).mockResolvedValueOnce({ id: "srv-2" } as Awaited<ReturnType<typeof createOrder>>);
    fireEvent.click(screen.getAllByRole("button", { name: "Thử lại" })[0]);

    await waitFor(() => {
      expect(screen.findByText("order-status")).toBeDefined();
    });
    expect(saveOrderLink).toHaveBeenCalled();

    expect(getOrders()).toHaveLength(1);
  });

  it("navigates to order-status on network error without showing error", async () => {
    vi.mocked(createOrder).mockRejectedValueOnce(new Error("Network Error"));

    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));
    await confirmDialog();

    expect(await screen.findByText("order-status")).toBeInTheDocument();
    expect(screen.queryByText(/Không thể/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });

  it("blocks submit when email not verified in real mode", async () => {
    _isRealMode = true;
    _mockUserValue = mockUser(false);

    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

    await waitFor(() => {
      expect(screen.getAllByText(/Email của bạn chưa được xác thực/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("does not block submit when email not verified in demo mode", async () => {
    _isRealMode = false;
    _mockUserValue = mockUser(false);

    renderOrderPage();
    await selectFrameAndTheme();
    await fillShippingForm();

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });
});
