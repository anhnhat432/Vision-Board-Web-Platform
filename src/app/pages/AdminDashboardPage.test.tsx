import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminDashboardPage } from "./AdminDashboardPage";

const authMock = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const adminServiceMock = vi.hoisted(() => ({
  adminGetOverview: vi.fn(),
  adminSendExpiringBillingReminders: vi.fn(),
}));
const orderServiceMock = vi.hoisted(() => ({ adminGetOrders: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: authMock.useAuthContext }));
vi.mock("@/services/adminService", () => adminServiceMock);
vi.mock("@/services/orderService", () => orderServiceMock);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const overview = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  email: { provider: "resend", configured: true },
  summary: {
    totalUsers: 20,
    adminUsers: 1,
    excludedUsers: { test: 15, internal: 2 },
    activePlusSubscriptions: 3,
    expiringSoonSubscriptions: 0,
    pendingPaymentOrders: 1,
    completedPaymentOrders: 2,
    physicalOrders: 4,
    revenueTotalVnd: 198000,
    revenueLast30DaysVnd: 99000,
  },
  recentUsers: [],
  recentPayments: [],
};

describe("AdminDashboardPage operational summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    adminServiceMock.adminGetOverview.mockResolvedValue(overview);
    orderServiceMock.adminGetOrders.mockResolvedValue({
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 1,
      items: [],
    });
  });

  it("shows filtered KPIs and links to each excluded user category", async () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(await screen.findByText("20")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /15 tài khoản test/i })).toHaveAttribute("href", "/admin/users?operationalCategory=test");
    expect(screen.getByRole("link", { name: /2 tài khoản nội bộ/i })).toHaveAttribute("href", "/admin/users?operationalCategory=internal");
    expect(orderServiceMock.adminGetOrders).toHaveBeenCalledWith({ operationalScope: "real", page: 1, limit: 12 });
  });

  it("uses labelled operational panels without adding unsupported active-user claims", async () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(await screen.findByRole("region", { name: "Thanh toán gần đây" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Người dùng mới" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Đơn in mới nhất" })).toBeInTheDocument();
    expect(screen.queryByText(/active user|DAU/i)).not.toBeInTheDocument();
  });

  it("keeps rendered KPIs visible when a refresh fails", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetOverview
      .mockResolvedValueOnce(overview)
      .mockRejectedValueOnce(new Error("network unavailable"));

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
    expect(await screen.findByText("20")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tải lại" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("network unavailable");
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows the shared empty state when no overview is returned", async () => {
    adminServiceMock.adminGetOverview.mockResolvedValueOnce(null);
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(await screen.findByText("Chưa có dữ liệu")).toBeInTheDocument();
  });
});
