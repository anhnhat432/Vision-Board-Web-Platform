import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

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

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
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
    await screen.findByText(/Khung 30×40/);

    fireEvent.click(screen.getByText(/Khung 30×40/));
    fireEvent.click(screen.getByText("MONEY"));

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: "A B" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: "0900000000" } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ giao hàng/), { target: { value: "Hanoi" } });

    fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

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
});
