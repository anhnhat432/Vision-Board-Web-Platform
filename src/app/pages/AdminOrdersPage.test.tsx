import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPendingCountsProvider } from "../components/admin/AdminPendingCountsContext";
import { AdminSearchProvider, useAdminSearchSlot } from "../components/admin/AdminSearchContext";

const orders = vi.hoisted(() => ({ adminGetOrders: vi.fn(), adminExportOrders: vi.fn(), adminUpdateOrder: vi.fn(), adminUpdateOrderStatus: vi.fn(), adminClassifyPhysicalOrder: vi.fn() }));
const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
vi.mock("@/services/orderService", () => orders);
vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: auth.useAuthContext }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: vi.fn(), writable: true });

const response = { page: 1, limit: 30, total: 2, totalPages: 2, operationalScope: "real", query: "", status: "all", frame: "all", dateFrom: null, dateTo: null,
  statusCounts: { all: 2, pending: 1, confirmed: 0, printing: 0, shipping: 0, delivered: 1, cancelled: 0 }, frameOptions: ["Khung gỗ"],
  items: [{ id: "order-1", userId: "u1", status: "pending", fullName: "Nguyen A", email: "a@test", phone: "1", shippingAddress: { line1: "A", city: "HCM", country: "VN" }, statusHistory: [], lines: [], totalVnd: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z", operationalClassification: { effectiveCategory: "real", source: "default" } }] };

function AdminSearchTestInput() {
  const { handler } = useAdminSearchSlot();
  return handler ? <input aria-label="Tìm đơn" value={handler.value} onChange={(event) => handler.onChange(event.target.value)} /> : null;
}

function renderPage(Page: React.ComponentType) {
  return render(
    <MemoryRouter>
      <AdminSearchProvider>
        <AdminPendingCountsProvider>
          <AdminSearchTestInput />
          <Page />
        </AdminPendingCountsProvider>
      </AdminSearchProvider>
    </MemoryRouter>,
  );
}

describe("AdminOrdersPage server operational data", () => {
  beforeEach(() => { vi.clearAllMocks(); auth.useAuthContext.mockReturnValue({ authLoading: false, userProfileLoading: false, user: { uid: "admin" }, userProfile: { role: "admin" } }); orders.adminGetOrders.mockResolvedValue(response); });
  it("loads the real server page with counts and frame options", async () => {
    const { AdminOrdersPage } = await import("./AdminOrdersPage");
    renderPage(AdminOrdersPage);
    await waitFor(() => expect(orders.adminGetOrders).toHaveBeenCalledWith(expect.objectContaining({ operationalScope: "real", page: 1, limit: 30, status: "all", frame: "all" })));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Khung" }), { key: "ArrowDown" });
    expect(await screen.findByRole("option", { name: "Khung gỗ" })).toBeInTheDocument();
  });

  it("shows the operational scope filter and server pagination", async () => {
    const { AdminOrdersPage } = await import("./AdminOrdersPage");
    renderPage(AdminOrdersPage);
    expect(await screen.findByRole("combobox", { name: "Phạm vi dữ liệu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeEnabled();
  });

  it("sends all filters to the server before requesting the next page", async () => {
    const { AdminOrdersPage } = await import("./AdminOrdersPage");
    renderPage(AdminOrdersPage);
    await waitFor(() => expect(orders.adminGetOrders).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("textbox", { name: "Tìm đơn" }), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("tab", { name: /Chờ xác nhận/ }));
    fireEvent.change(screen.getByLabelText("Lọc từ ngày"), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByLabelText("Lọc đến ngày"), { target: { value: "2026-07-31" } });

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Khung" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Khung gỗ" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Phạm vi dữ liệu" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Test & nội bộ" }));

    await waitFor(() => expect(orders.adminGetOrders).toHaveBeenLastCalledWith(expect.objectContaining({
      q: "abc",
      status: "pending",
      frame: "Khung gỗ",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      operationalScope: "excluded",
      page: 1,
    })));
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    await waitFor(() => expect(orders.adminGetOrders).toHaveBeenLastCalledWith(expect.objectContaining({
      q: "abc",
      status: "pending",
      frame: "Khung gỗ",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      operationalScope: "excluded",
      page: 2,
    })));
  });

  it("explains inherited non-real classification and reloads after direct classification", async () => {
    const { AdminOrdersPage } = await import("./AdminOrdersPage");
    orders.adminGetOrders.mockResolvedValue({
      ...response,
      items: [{
        ...response.items[0],
        operationalClassification: { effectiveCategory: "test", source: "user", reason: "test_account" },
      }],
    });
    orders.adminClassifyPhysicalOrder.mockResolvedValue({ status: "updated" });
    renderPage(AdminOrdersPage);

    expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Phân loại dữ liệu" }));
    expect(await screen.findByText("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    await waitFor(() => expect(orders.adminClassifyPhysicalOrder).toHaveBeenCalledWith("order-1", expect.objectContaining({ category: "test", reason: "test_account" })));
    await waitFor(() => expect(orders.adminGetOrders).toHaveBeenCalledTimes(2));
  });
});
