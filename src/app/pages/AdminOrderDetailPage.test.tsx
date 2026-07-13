import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const orders = vi.hoisted(() => ({ adminGetOrder: vi.fn(), adminClassifyPhysicalOrder: vi.fn() }));
vi.mock("@/services/orderService", () => orders);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const order = {
  id: "order-1",
  userId: "user-1",
  status: "pending",
  fullName: "Nguyen A",
  email: "a@test.example",
  phone: "0900000000",
  shippingAddress: { line1: "A", city: "HCM", country: "VN" },
  statusHistory: [],
  lines: [],
  totalVnd: 100000,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  operationalClassification: { effectiveCategory: "test", source: "user", reason: "test_account" },
};

function renderPage(Page: React.ComponentType) {
  return render(
    <MemoryRouter initialEntries={["/admin/orders/order-1"]}>
      <Routes><Route path="/admin/orders/:id" element={<Page />} /></Routes>
    </MemoryRouter>,
  );
}

describe("AdminOrderDetailPage operational classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orders.adminGetOrder.mockResolvedValue(order);
  });

  it("shows inherited classification and reloads the detail after direct classification", async () => {
    const { AdminOrderDetailPage } = await import("./AdminOrderDetailPage");
    orders.adminClassifyPhysicalOrder.mockResolvedValue({ status: "updated" });
    renderPage(AdminOrderDetailPage);

    expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Phân loại dữ liệu" }));
    expect(await screen.findByText("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    await waitFor(() => expect(orders.adminClassifyPhysicalOrder).toHaveBeenCalledWith("order-1", expect.objectContaining({ category: "test", reason: "test_account" })));
    await waitFor(() => expect(orders.adminGetOrder).toHaveBeenCalledTimes(2));
  });

  it("normalizes a legacy order without operational classification to the real default", async () => {
    const { AdminOrderDetailPage } = await import("./AdminOrderDetailPage");
    orders.adminGetOrder.mockResolvedValue({
      ...order,
      operationalClassification: undefined,
    });

    renderPage(AdminOrderDetailPage);

    expect(await screen.findByText("Mặc định dữ liệu thật")).toBeInTheDocument();
  });
});
