import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSearchProvider } from "../components/admin/AdminSearchContext";

const authMock = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const service = vi.hoisted(() => ({
  adminCreateDiscount: vi.fn(),
  adminDeleteDiscount: vi.fn(),
  adminListCouponUsages: vi.fn(),
  adminListDiscounts: vi.fn(),
  adminUpdateDiscount: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: authMock.useAuthContext }));
vi.mock("@/services/adminService", () => service);
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

const discount = {
  _id: "discount-1",
  type: "coupon",
  code: "LAUNCH20",
  name: "Ra mắt Plus",
  discountType: "percentage",
  discountValue: 20,
  minAmount: 99000,
  maxUses: 50,
  usedCount: 3,
  startsAt: "2026-07-01T00:00:00.000Z",
  endsAt: "2026-12-31T00:00:00.000Z",
  appliesTo: ["PLUS"],
  active: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const response = {
  items: [discount],
  total: 101,
  page: 1,
  limit: 100,
  totalPages: 2,
};

async function renderPage() {
  const { AdminDiscountsPage } = await import("./AdminDiscountsPage");
  return render(
    <MemoryRouter>
      <AdminSearchProvider>
        <AdminDiscountsPage />
      </AdminSearchProvider>
    </MemoryRouter>,
  );
}

describe("AdminDiscountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    service.adminListDiscounts.mockImplementation((params: { page?: number }) =>
      Promise.resolve({ ...response, page: params.page ?? 1 }),
    );
    service.adminCreateDiscount.mockResolvedValue(discount);
    service.adminUpdateDiscount.mockResolvedValue(discount);
    service.adminDeleteDiscount.mockResolvedValue({ status: "deleted" });
    service.adminListCouponUsages.mockResolvedValue({
      items: [
        {
          _id: "usage-1",
          userId: "user-1",
          orderId: "order-1",
          usedAt: "2026-07-10T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it("loads a paginated list and exposes toolbar/table semantics", async () => {
    await renderPage();

    await waitFor(() =>
      expect(service.adminListDiscounts).toHaveBeenCalledWith({
        q: "",
        type: undefined,
        active: true,
        page: 1,
        limit: 100,
      }),
    );
    expect(screen.getByRole("region", { name: "Bộ lọc giảm giá" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Tìm kiếm giảm giá" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Danh sách discount" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Giảm" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("navigation", { name: "Phân trang discount" })).toBeInTheDocument();
  });

  it("resets pagination when search or filters change", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Trang sau" }));
    await waitFor(() =>
      expect(service.adminListDiscounts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm giảm giá" }), {
      target: { value: "launch" },
    });
    await waitFor(() =>
      expect(service.adminListDiscounts).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "launch", page: 1 }),
      ),
    );

    await user.click(screen.getByRole("combobox", { name: "Loại discount" }));
    await user.click(await screen.findByRole("option", { name: "Coupon" }));
    await waitFor(() =>
      expect(service.adminListDiscounts).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "coupon", page: 1 }),
      ),
    );
  });

  it("keeps the three-step create payload unchanged", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Tạo mới" }));
    const dialog = screen.getByRole("dialog", { name: "Tạo discount mới" });
    await user.type(within(dialog).getByLabelText("Mã code"), "NEW20");
    await user.type(within(dialog).getByLabelText("Tên hiển thị"), "Ưu đãi mới");
    await user.click(within(dialog).getByRole("button", { name: "Tiếp theo" }));
    await user.click(within(dialog).getByRole("button", { name: "Tiếp theo" }));
    await user.click(within(dialog).getByRole("button", { name: "Tạo discount" }));

    await waitFor(() =>
      expect(service.adminCreateDiscount).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "coupon",
          code: "NEW20",
          name: "Ưu đãi mới",
          discountType: "percentage",
          discountValue: 10,
          appliesTo: ["PLUS", "physical_order"],
        }),
      ),
    );
  });

  it("keeps usage and delete actions inside their existing dialogs", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Chi tiết" }));
    expect(await screen.findByRole("dialog", { name: "Lịch sử sử dụng: LAUNCH20" })).toHaveTextContent(
      "order-1",
    );
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Xóa" }));
    const alertDialog = await screen.findByRole("alertdialog", { name: "Vô hiệu hóa discount?" });
    await user.click(within(alertDialog).getByRole("button", { name: "Vô hiệu hóa" }));
    await waitFor(() => expect(service.adminDeleteDiscount).toHaveBeenCalledWith("discount-1"));
  });
});
