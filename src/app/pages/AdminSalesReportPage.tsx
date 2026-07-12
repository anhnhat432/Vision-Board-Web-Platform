import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import {
  type AdminSalesReportParams,
  type AdminSalesReportResult,
  adminGetSalesReport,
} from "@/services/adminService";

import {
  AdminSalesReportFilters,
  type SalesReportUrlState,
  parseSalesReportUrlState,
  validateSalesReportUrlState,
} from "../components/admin/sales/AdminSalesReportFilters";
import { AdminSalesKpiGrid } from "../components/admin/sales/AdminSalesKpiGrid";
import { AdminSalesReportList } from "../components/admin/sales/AdminSalesReportList";
import { AdminSalesRevenueChart } from "../components/admin/sales/AdminSalesRevenueChart";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { getErrorMessage } from "../components/admin/utils";
import { Button } from "../components/ui/button";

function toSearchParams(state: SalesReportUrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("range", state.range);
  params.set("from", state.from);
  params.set("to", state.to);
  if (state.provider !== "all") params.set("provider", state.provider);
  params.set("status", state.kpiStatus);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function AdminSalesReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<AdminSalesReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const state = useMemo(() => parseSalesReportUrlState(searchParams), [searchParams]);
  const validationError = validateSalesReportUrlState(state);
  const activeParams = useMemo<AdminSalesReportParams>(() => ({
    from: state.from,
    to: state.to,
    provider: state.provider,
    kpiStatus: state.kpiStatus,
    page: state.page,
    limit: 20,
  }), [state]);

  const loadReport = useCallback(async (params: AdminSalesReportParams) => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await adminGetSalesReport(params));
    } catch (error) {
      setLoadError(getErrorMessage(error, "Không thể tải báo cáo kinh doanh. Thử lại."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (validationError) {
      setLoading(false);
      return;
    }
    void loadReport(activeParams);
  }, [activeParams, loadReport, validationError]);

  const updateState = (next: SalesReportUrlState) => setSearchParams(toSearchParams(next), { replace: true });
  const noQualifyingSales = report
    ? report.tabCounts.pending + report.tabCounts.included + report.tabCounts.excluded === 0
    : false;
  const tabs = [
    { status: "included" as const, label: "Được tính KPI" },
    { status: "pending" as const, label: "Chờ duyệt" },
    { status: "excluded" as const, label: "Đã loại" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Báo cáo kinh doanh" description="Đối soát giao dịch Plus thực, duyệt KPI và xuất bằng chứng đã ẩn thông tin nhạy cảm." />
      <AdminSalesReportFilters
        value={state}
        availableProviders={report?.availableProviders ?? ["payos", "casso"]}
        onChange={updateState}
      />
      {validationError ? <p role="alert" className="text-sm text-rose-600">{validationError}</p> : null}
      {loadError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-[var(--r-card)] border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{loadError}</p>
          <Button type="button" variant="outline" onClick={() => void loadReport(activeParams)}>Thử lại</Button>
        </div>
      ) : null}
      {loading && !report ? <p role="status">Đang tải báo cáo kinh doanh…</p> : null}
      {report ? (
        <>
          <AdminSalesKpiGrid summary={report.summary} />
          <AdminSalesRevenueChart dailyBuckets={report.dailyBuckets} />
          <div role="tablist" aria-label="Trạng thái duyệt KPI" className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.status}
                type="button"
                role="tab"
                aria-selected={state.kpiStatus === tab.status}
                variant={state.kpiStatus === tab.status ? "default" : "outline"}
                onClick={() => updateState({ ...state, kpiStatus: tab.status, page: 1 })}
              >
                {tab.label} ({report.tabCounts[tab.status]})
              </Button>
            ))}
          </div>
          {noQualifyingSales ? (
            <AdminEmptyState title="Chưa có giao dịch phù hợp" description="Khoảng ngày và provider hiện tại chưa có giao dịch Plus thực đã hoàn tất." />
          ) : report.total === 0 ? (
            <AdminEmptyState title="Không có giao dịch trong trạng thái này" description="Đổi tab hoặc bộ lọc để xem các giao dịch khác." />
          ) : (
            <AdminSalesReportList items={report.items} />
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-ink-muted">Trang {report.page}/{report.totalPages}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={report.page <= 1} onClick={() => updateState({ ...state, page: state.page - 1 })}>Trang trước</Button>
              <Button type="button" variant="outline" disabled={report.page >= report.totalPages} onClick={() => updateState({ ...state, page: state.page + 1 })}>Trang sau</Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
