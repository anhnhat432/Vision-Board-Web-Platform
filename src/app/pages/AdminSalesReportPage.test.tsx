import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSalesReportPage } from "./AdminSalesReportPage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const adminServiceMock = vi.hoisted(() => ({
  adminGetSalesReport: vi.fn(),
  adminReviewSalesOrder: vi.fn(),
  adminReconcilePaymentOrderPayerSource: vi.fn(),
  adminExportSalesReport: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/services/adminService", () => ({
  adminGetSalesReport: adminServiceMock.adminGetSalesReport,
  adminReviewSalesOrder: adminServiceMock.adminReviewSalesOrder,
  adminReconcilePaymentOrderPayerSource: adminServiceMock.adminReconcilePaymentOrderPayerSource,
  adminExportSalesReport: adminServiceMock.adminExportSalesReport,
}));

vi.mock("sonner", () => ({ toast: toastMock }));

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

function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

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
  adminServiceMock.adminReviewSalesOrder.mockResolvedValue({ item: report.items[0] });
  adminServiceMock.adminReconcilePaymentOrderPayerSource.mockResolvedValue({
    orderId: report.items[0].orderId,
    payer: {
      classification: "external",
      accountNameMasked: "N*** A***",
      accountLast4: "6789",
      bankName: "Ngân hàng kiểm thử",
      transactionReference: "PAYOS-001",
      transactionDateTime: "2026-07-10T09:30:00.000Z",
      source: "reconciliation",
      observedAt: "2026-07-10T09:30:00.000Z",
    },
  });
  adminServiceMock.adminExportSalesReport.mockResolvedValue({
    blob: new Blob(["orderId"], { type: "text/csv" }),
    filename: "sales-report.csv",
  });
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
    const chartTable = screen.getByRole("table", { name: "Doanh thu theo ngày" });
    expect(within(chartTable).getByText("2026-07-10")).toBeInTheDocument();
    expect(within(chartTable).getAllByText("198.000đ")).toHaveLength(2);
    expect(within(chartTable).getByText("0đ")).toBeInTheDocument();
  });

  it("exposes labelled report filters, a named table, and shared pagination", async () => {
    renderPage();

    expect(await screen.findByRole("region", { name: "Bộ lọc báo cáo kinh doanh" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Giao dịch trong báo cáo kinh doanh" });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Số tiền" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("navigation", { name: "Phân trang báo cáo kinh doanh" })).toBeInTheDocument();
  });

  it("keeps export failure persistent and retries the active export", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminExportSalesReport
      .mockRejectedValueOnce(new Error("Export timeout"))
      .mockResolvedValueOnce({
        blob: new Blob(["orderId"], { type: "text/csv" }),
        filename: "sales-report.csv",
      });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:report"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    renderPage();
    await screen.findByText("Giao dịch thành công");
    await user.click(screen.getByRole("button", { name: "Xuất CSV" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Export timeout");
    await user.click(screen.getByRole("button", { name: "Thử xuất lại" }));
    await waitFor(() => expect(adminServiceMock.adminExportSalesReport).toHaveBeenCalledTimes(2));
  });

  it("shows a stored included review as effectively excluded by account classification", async () => {
    adminServiceMock.adminGetSalesReport.mockResolvedValue({
      ...report,
      items: [{
        ...report.items[0],
        reporting: { kpiStatus: "included" as const, exclusionReason: null, reviewedAt: "2026-07-11T00:00:00.000Z" },
        effectiveKpiStatus: "excluded" as const,
        operationalClassification: { effectiveCategory: "test" as const, source: "user" as const },
      }],
    });

    renderPage();

    expect(await screen.findAllByText("Đã duyệt: Được tính KPI")).toHaveLength(2);
    expect(screen.getAllByText("Hiệu lực: Đã loại theo tài khoản")).toHaveLength(2);
  });

  it("labels legacy sales-review classification separately from direct record classification", async () => {
    adminServiceMock.adminGetSalesReport.mockResolvedValue({
      ...report,
      items: [{
        ...report.items[0],
        reporting: { kpiStatus: "excluded" as const, exclusionReason: "test" as const, reviewedAt: "2026-07-11T00:00:00.000Z" },
        effectiveKpiStatus: "excluded" as const,
        operationalClassification: { effectiveCategory: "test" as const, source: "legacy_sales_review" as const },
      }],
    });

    renderPage();

    expect(await screen.findAllByText("Theo duyệt KPI cũ")).toHaveLength(2);
    expect(screen.queryByText("Đánh dấu trực tiếp")).not.toBeInTheDocument();
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

  it("keeps the newest filter response when an earlier request resolves last", async () => {
    const user = userEvent.setup();
    const earlierRequest = createDeferred<typeof report>();
    const newestRequest = createDeferred<typeof report>();
    adminServiceMock.adminGetSalesReport
      .mockImplementationOnce(() => earlierRequest.promise)
      .mockImplementationOnce(() => newestRequest.promise);

    renderPage("/admin/reports/sales?range=7d");
    await waitFor(() => expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Provider"), "payos");
    await waitFor(() => expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(2));

    await act(async () => {
      newestRequest.resolve({
        ...report,
        summary: { ...report.summary, successfulTransactions: 9 },
        items: [{ ...report.items[0], customerLabelMasked: "Báo cáo mới" }],
      });
    });
    expect(screen.getAllByText("Báo cáo mới")).toHaveLength(2);

    await act(async () => {
      earlierRequest.resolve({
        ...report,
        summary: { ...report.summary, successfulTransactions: 1 },
        items: [{ ...report.items[0], customerLabelMasked: "Báo cáo cũ" }],
      });
    });
    expect(screen.queryAllByText("Báo cáo cũ")).toHaveLength(0);
    expect(screen.getAllByText("Báo cáo mới")).toHaveLength(2);
  });

  it("hides a previous report when the active filter request fails", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetSalesReport
      .mockResolvedValueOnce(report)
      .mockRejectedValueOnce(new Error("Không thể tải provider PayOS"));

    renderPage("/admin/reports/sales?range=7d");
    expect(await screen.findAllByText("N*** A***")).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText("Provider"), "payos");
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải provider PayOS");
    expect(screen.getByLabelText("Provider")).toHaveValue("payos");
    expect(screen.queryAllByText("N*** A***")).toHaveLength(0);
    expect(screen.queryByTestId("sales-report-desktop-table")).not.toBeInTheDocument();
  });

  it("validates manual inclusions and excluded orders before enabling confirmation", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminGetSalesReport.mockResolvedValue({
      ...report,
      items: [{ ...report.items[0], isManualCompletion: true }],
    });
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Duyệt KPI VBPAY00001" }))[0]);
    expect(screen.getByRole("button", { name: "Xác nhận duyệt" })).toBeDisabled();

    await user.click(screen.getByLabelText("Không tính KPI"));
    expect(screen.getByText("Chọn lý do loại khỏi KPI.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Lý do loại khỏi KPI"), "other");
    expect(screen.getByText("Nhập ghi chú cho lý do khác.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Ghi chú duyệt"), "Không phải giao dịch doanh thu.");
    expect(screen.getByRole("button", { name: "Xác nhận duyệt" })).toBeEnabled();
  });

  it("sends the review payload then reloads the active report without an optimistic update", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Duyệt KPI VBPAY00001" }))[0]);
    await user.click(screen.getByLabelText("Được tính KPI"));
    await user.type(screen.getByLabelText("Ghi chú duyệt"), "Đã đối chiếu PayOS và giao dịch ngân hàng.");
    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));

    await waitFor(() => expect(adminServiceMock.adminReviewSalesOrder).toHaveBeenCalledWith("VBPAY00001", expect.objectContaining({
      kpiStatus: "included",
      reviewNote: "Đã đối chiếu PayOS và giao dịch ngân hàng.",
      reviewRequestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    })));
    await waitFor(() => expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(2));
  });

  it("keeps review dialog open with a retryable error when PATCH fails", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminReviewSalesOrder.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Duyệt KPI VBPAY00001" }))[0]);
    await user.click(screen.getByLabelText("Được tính KPI"));
    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));

    expect(await screen.findByText("timeout")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(adminServiceMock.adminGetSalesReport).toHaveBeenCalledTimes(1);
  });

  it("reuses the request ID when retrying an unchanged failed review", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminReviewSalesOrder.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Duyệt KPI VBPAY00001" }))[0]);
    await user.click(screen.getByLabelText("Được tính KPI"));
    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));
    await waitFor(() => expect(adminServiceMock.adminReviewSalesOrder).toHaveBeenCalledTimes(2));

    const firstPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[0][1];
    const secondPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[1][1];
    expect(firstPayload.reviewRequestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(secondPayload.reviewRequestId).toBe(firstPayload.reviewRequestId);
  });

  it("uses a new request ID when a failed review command changes", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminReviewSalesOrder.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Duyệt KPI VBPAY00001" }))[0]);
    await user.click(screen.getByLabelText("Được tính KPI"));
    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Ghi chú duyệt"), "Đã bổ sung bằng chứng.");
    await user.click(screen.getByRole("button", { name: "Xác nhận duyệt" }));
    await waitFor(() => expect(adminServiceMock.adminReviewSalesOrder).toHaveBeenCalledTimes(2));

    const firstPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[0][1];
    const secondPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[1][1];
    expect(secondPayload.reviewRequestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(secondPayload.reviewRequestId).not.toBe(firstPayload.reviewRequestId);
  });

  it("reconciles only the matching PayOS row and opens shared safe evidence", async () => {
    const user = userEvent.setup();
    const otherItem = { ...report.items[0], orderId: "VBPAY00002", customerLabelMasked: "M*** B***" };
    adminServiceMock.adminGetSalesReport.mockResolvedValue({ ...report, items: [report.items[0], otherItem], total: 2 });
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Đối chiếu PayOS" }))[0]);
    await waitFor(() => expect(adminServiceMock.adminReconcilePaymentOrderPayerSource).toHaveBeenCalledWith("VBPAY00001"));

    const evidence = await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" });
    expect(within(evidence).getByText("Nguồn ngoài")).toBeInTheDocument();
    expect(within(evidence).queryByText("M*** B***")).not.toBeInTheDocument();
  });

  it("exports using active filters only after the server responds", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:report");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderPage("/admin/reports/sales?range=custom&from=2026-07-01&to=2026-07-12&provider=payos&status=included");

    await screen.findByText("Giao dịch thành công");
    await user.click(screen.getByRole("button", { name: "Xuất CSV" }));

    await waitFor(() => expect(adminServiceMock.adminExportSalesReport).toHaveBeenCalledWith(expect.objectContaining({
      from: "2026-07-01",
      to: "2026-07-12",
      provider: "payos",
      kpiStatus: "included",
    })));
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:report");
  });

  it("shows a retryable export error without creating a blob URL", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:report");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    adminServiceMock.adminExportSalesReport.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    await screen.findByText("Giao dịch thành công");
    await user.click(screen.getByRole("button", { name: "Xuất CSV" }));

    expect(await screen.findByText("timeout")).toBeInTheDocument();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});
