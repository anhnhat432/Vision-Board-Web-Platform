import { render, screen, waitFor } from "@testing-library/react";
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
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: authMock.useAuthContext }));
vi.mock("@/services/adminService", () => adminServiceMock);
vi.mock("@/services/orderService", () => orderServiceMock);
vi.mock("sonner", () => ({ toast: toastMock }));

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

const reminderResult = {
  configured: true,
  email: { provider: "resend", configured: true },
  daysAhead: 7,
  windowEnd: "2026-07-21T00:00:00.000Z",
  scanned: 2,
  sent: 1,
  skipped: 0,
  duplicate: 0,
  failed: 1,
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

  it("keeps reminder transport failures visible and retries the same request", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetOverview.mockResolvedValue({
      ...overview,
      summary: { ...overview.summary, expiringSoonSubscriptions: 2 },
    });
    adminServiceMock.adminSendExpiringBillingReminders
      .mockRejectedValueOnce(new Error("reminder service offline"))
      .mockResolvedValueOnce(reminderResult);

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Gửi email nhắc hạn" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("reminder service offline");
    expect(toastMock.error).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Thử gửi lại" }));
    expect(adminServiceMock.adminSendExpiringBillingReminders).toHaveBeenNthCalledWith(2, { daysAhead: 7 });
  });

  it("keeps the previous reminder result when a later run fails", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetOverview.mockResolvedValue({
      ...overview,
      summary: { ...overview.summary, expiringSoonSubscriptions: 2 },
    });
    adminServiceMock.adminSendExpiringBillingReminders
      .mockResolvedValueOnce(reminderResult)
      .mockRejectedValueOnce(new Error("second run failed"));

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
    const runButton = await screen.findByRole("button", { name: "Gửi email nhắc hạn" });
    await user.click(runButton);
    expect(await screen.findByText(/Lần chạy gần nhất: quét 2, gửi 1/)).toBeInTheDocument();
    await waitFor(() => expect(runButton).toBeEnabled());

    await user.click(runButton);
    expect(await screen.findByRole("alert")).toHaveTextContent("second run failed");
    expect(screen.getByText(/Lần chạy gần nhất: quét 2, gửi 1/)).toBeInTheDocument();
  });
});
