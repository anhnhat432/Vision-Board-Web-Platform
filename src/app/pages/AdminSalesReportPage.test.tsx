import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSalesReportPage } from "./AdminSalesReportPage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const adminServiceMock = vi.hoisted(() => ({
  adminGetSalesReport: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/services/adminService", () => ({
  adminGetSalesReport: adminServiceMock.adminGetSalesReport,
}));

const report = {
  generatedAt: "2026-07-12T04:00:00.000Z",
  filters: {
    from: "2026-06-13",
    to: "2026-07-12",
    provider: "all" as const,
    kpiStatus: "pending" as const,
    timezone: "Asia/Ho_Chi_Minh" as const,
  },
  availableProviders: ["payos", "casso"] as const,
  summary: {
    successfulTransactions: 4,
    uniquePaidUsers: 3,
    grossRevenueVnd: 396000,
    refundedAmountVnd: 99000,
    netRevenueVnd: 297000,
    pendingReviews: 1,
  },
  tabCounts: { pending: 1, included: 3, excluded: 0 },
  dailyBuckets: [
    {
      date: "2026-07-10",
      transactions: 2,
      grossRevenueVnd: 198000,
      refundedAmountVnd: 0,
      netRevenueVnd: 198000,
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 2,
  items: [
    {
      orderId: "VBPAY00001",
      customerLabelMasked: "N*** A***",
      customerEmailMasked: "n***@example.test",
      provider: "payos" as const,
      providerReference: "PAYOS-001",
      amountVnd: 99000,
      currency: "VND" as const,
      completedAt: "2026-07-10T09:30:00.000Z",
      isManualCompletion: false,
      payer: {
        classification: "external" as const,
        source: "webhook" as const,
        observedAt: "2026-07-10T09:30:00.000Z",
      },
      refund: { status: "none" as const, amountVnd: 0, completedAt: null },
      reporting: { kpiStatus: "pending" as const, exclusionReason: null, reviewedAt: null },
    },
  ],
};

function renderPage(entry = "/admin/reports/sales") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AdminSalesReportPage />
    </MemoryRouter>,
  );
}

function seedMocks() {
  authContextMock.useAuthContext.mockReturnValue({
    authLoading: false,
    user: { uid: "admin_uid", email: "admin@example.test" },
    userProfile: { role: "admin" },
    userProfileLoading: false,
  });
  adminServiceMock.adminGetSalesReport.mockResolvedValue(report);
}

describe("AdminSalesReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the default pending report with six KPIs and both responsive layouts", async () => {
    renderPage();

    await waitFor(() => {
      expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledWith(expect.objectContaining({
        kpiStatus: "pending",
        page: 1,
        limit: 20,
      }));
    });

    expect(await screen.findByText("Giao dịch thành công")).toBeInTheDocument();
    expect(screen.getByText("Người dùng trả phí")).toBeInTheDocument();
    expect(screen.getAllByText("Doanh thu gộp").length).toBeGreaterThan(0);
    expect(screen.getByText("Đã hoàn tiền")).toBeInTheDocument();
    expect(screen.getAllByText("Doanh thu thuần").length).toBeGreaterThan(0);
    expect(screen.getByText("Chờ duyệt")).toBeInTheDocument();
    expect(screen.getByTestId("sales-report-desktop-table")).toBeInTheDocument();
    expect(screen.getByTestId("sales-report-mobile-list")).toBeInTheDocument();
    expect(screen.getByText("2026-07-10")).toBeInTheDocument();
  });

  it("preserves a URL-selected 7-day range", async () => {
    renderPage("/admin/reports/sales?range=7d");

    await waitFor(() => {
      expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledWith(expect.objectContaining({
        kpiStatus: "pending",
        page: 1,
        limit: 20,
      }));
    });
    expect(screen.getByRole("button", { name: "7 ngày" })).toHaveAttribute("aria-pressed", "true");
  });

  it("rejects reversed custom dates without loading the API", async () => {
    renderPage("/admin/reports/sales?range=custom&from=2026-07-12&to=2026-07-01");

    expect(await screen.findByRole("alert")).toHaveTextContent("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    expect(adminServiceMock.adminGetSalesReport).not.toHaveBeenCalled();
  });

  it("resets to the first page when the provider or KPI tab changes", async () => {
    const user = userEvent.setup();
    renderPage("/admin/reports/sales?range=7d&page=2");

    await screen.findByText("Giao dịch thành công");
    await user.selectOptions(screen.getByLabelText("Provider"), "payos");
    await waitFor(() => {
      expect(adminServiceMock.adminGetSalesReport).toHaveBeenLastCalledWith(expect.objectContaining({
        provider: "payos",
        page: 1,
      }));
    });

    await user.click(screen.getByRole("tab", { name: /Được tính KPI/ }));
    await waitFor(() => {
      expect(adminServiceMock.adminGetSalesReport).toHaveBeenLastCalledWith(expect.objectContaining({
        provider: "payos",
        kpiStatus: "included",
        page: 1,
      }));
    });
  });

  it("distinguishes a fully empty report from an empty selected tab", async () => {
    adminServiceMock.adminGetSalesReport
      .mockResolvedValueOnce({ ...report, total: 0, totalPages: 1, items: [], tabCounts: { pending: 0, included: 0, excluded: 0 } })
      .mockResolvedValueOnce({ ...report, total: 0, totalPages: 1, items: [], tabCounts: { pending: 0, included: 3, excluded: 0 } });

    const first = renderPage();
    expect(await screen.findByText("Chưa có giao dịch phù hợp")).toBeInTheDocument();
    first.unmount();

    renderPage();
    expect(await screen.findByText("Không có giao dịch trong trạng thái này")).toBeInTheDocument();
  });

  it("keeps filters visible after a timeout and retries the same request", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetSalesReport.mockRejectedValueOnce(new Error("Hết thời gian chờ"));
    renderPage("/admin/reports/sales?range=7d&provider=payos");

    expect(await screen.findByRole("alert")).toHaveTextContent("Hết thời gian chờ");
    expect(screen.getByLabelText("Provider")).toHaveValue("payos");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(2));
  });
});
