import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";

import OrderPage from "./OrderPage";

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
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/order-catalog")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: DEFAULT_CATALOG }),
        });
      }
      if (typeof url === "string" && url.includes("/api/orders")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "srv-1" } }),
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

    fireEvent.click(screen.getByRole("button", { name: /Đặt đơn/ }));

    await waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const submitCall = calls.find(
        (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/orders"),
      );
      expect(submitCall).toBeDefined();
      const body = JSON.parse((submitCall![1] as { body: string }).body);
      expect(body.itemIds).toEqual(["frame:30x40", "theme:money"]);
      expect("priceVnd" in body).toBe(false);
    });
  });
});
