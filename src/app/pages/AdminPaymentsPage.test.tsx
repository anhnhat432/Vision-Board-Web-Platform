import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPendingCountsProvider } from "../components/admin/AdminPendingCountsContext";

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: () => false });
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: () => undefined });

const service = vi.hoisted(() => ({
  adminListPaymentOrders: vi.fn(),
  adminClassifyPaymentOrder: vi.fn(),
  adminCompletePaymentOrderManually: vi.fn(),
  adminReconcilePaymentOrderPayerSource: vi.fn(),
}));
const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));

vi.mock("@/services/adminService", () => service);
vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: auth.useAuthContext,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function response(source: "default" | "user" = "default") {
  return {
    generatedAt: "2026-07-13T00:00:00.000Z", query: "", status: "all", operationalScope: "real",
    page: 1, limit: 30, total: 1, totalPages: 2,
    items: [{ orderId: "VBPAY1", userId: "user1", planCode: "PLUS", billingCycle: "month", amount: 99000,
      currency: "VND", status: "pending", provider: "payos", payer: null, user: null,
      createdAt: "2026-07-13T00:00:00.000Z", operationalClassification: { effectiveCategory: source === "user" ? "test" : "real", source } }],
  };
}

async function renderPage() {
  const { AdminPaymentsPage } = await import("./AdminPaymentsPage");
  render(<MemoryRouter><AdminPendingCountsProvider><AdminPaymentsPage /></AdminPendingCountsProvider></MemoryRouter>);
}

describe("AdminPaymentsPage operational classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.useAuthContext.mockReturnValue({
      authLoading: false, user: { uid: "admin" }, userProfileLoading: false,
      userProfile: { role: "admin" },
    });
    service.adminListPaymentOrders.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params.status === "pending" ? { ...response(), total: 3 } : response()));
    service.adminClassifyPaymentOrder.mockResolvedValue({ status: "updated" });
  });

  it("loads the real first page and keeps the pending sidebar query real", async () => {
    await renderPage();
    await waitFor(() => expect(service.adminListPaymentOrders).toHaveBeenCalledWith(
      expect.objectContaining({ operationalScope: "real", page: 1, limit: 30 }),
    ));
    expect(service.adminListPaymentOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", operationalScope: "real", limit: 1 }),
    );
  });

  it("reclassifies without optimistic row changes and reloads the server page", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(await screen.findByRole("button", { name: "Phân loại dữ liệu" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    await waitFor(() => expect(service.adminClassifyPaymentOrder).toHaveBeenCalledWith("VBPAY1", expect.objectContaining({ category: "real", requestId: expect.any(String) })));
    await waitFor(() => expect(service.adminListPaymentOrders).toHaveBeenCalledTimes(3));
  });

  it("shows an inherited source and prevents a misleading direct real action", async () => {
    service.adminListPaymentOrders.mockResolvedValue(response("user"));
    await renderPage();
    expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Phân loại dữ liệu" }));
    expect(screen.getByText("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("combobox", { name: "Phân loại" }));
    expect(screen.getByRole("option", { name: "Dữ liệu thật" })).toHaveAttribute("data-disabled");
  });
});
