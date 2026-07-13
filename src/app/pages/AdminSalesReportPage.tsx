import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import {
  type AdminSalesReviewDecisionPayload,
  type AdminSalesReportRow,
  type AdminSalesReportParams,
  type AdminSalesReportResult,
  adminExportSalesReport,
  adminGetSalesReport,
  adminReconcilePaymentOrderPayerSource,
  adminReviewSalesOrder,
} from "@/services/adminService";

import {
  AdminSalesReportFilters,
  type SalesReportUrlState,
  parseSalesReportUrlState,
  validateSalesReportUrlState,
} from "../components/admin/sales/AdminSalesReportFilters";
import { AdminSalesKpiGrid } from "../components/admin/sales/AdminSalesKpiGrid";
import { AdminSalesReportList } from "../components/admin/sales/AdminSalesReportList";
import { AdminSalesReviewDialog } from "../components/admin/sales/AdminSalesReviewDialog";
import { AdminSalesRevenueChart } from "../components/admin/sales/AdminSalesRevenueChart";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminPaymentPayerEvidenceDialog } from "../components/admin/AdminPaymentPayerEvidenceDialog";
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

function buildReviewCommandKey(orderId: string, decision: AdminSalesReviewDecisionPayload): string {
  return JSON.stringify({
    orderId,
    kpiStatus: decision.kpiStatus,
    exclusionReason: decision.kpiStatus === "excluded" ? decision.exclusionReason ?? null : null,
    reviewNote: decision.reviewNote?.trim().slice(0, 500) || null,
  });
}

export function AdminSalesReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<AdminSalesReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<AdminSalesReportRow | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [evidenceItem, setEvidenceItem] = useState<AdminSalesReportRow | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const reviewRequestRef = useRef<{ commandKey: string; reviewRequestId: string } | null>(null);
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
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(null);
    setReport(null);
    try {
      const nextReport = await adminGetSalesReport(params);
      if (generation !== requestGeneration.current) return;
      setReport(nextReport);
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setLoadError(getErrorMessage(error, "Không thể tải báo cáo kinh doanh. Thử lại."));
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (validationError) {
      requestGeneration.current += 1;
      setReport(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    void loadReport(activeParams);
  }, [activeParams, loadReport, validationError]);

  const updateState = (next: SalesReportUrlState) => setSearchParams(toSearchParams(next), { replace: true });
  const handleReview = async (decision: AdminSalesReviewDecisionPayload) => {
    if (!reviewItem) return;
    const commandKey = buildReviewCommandKey(reviewItem.orderId, decision);
    const current = reviewRequestRef.current;
    const reviewRequestId = current?.commandKey === commandKey
      ? current.reviewRequestId
      : crypto.randomUUID();
    reviewRequestRef.current = { commandKey, reviewRequestId };
    try {
      setReviewBusy(true);
      setReviewError(null);
      await adminReviewSalesOrder(reviewItem.orderId, { ...decision, reviewRequestId });
      reviewRequestRef.current = null;
      await loadReport(activeParams);
      setReviewItem(null);
      toast.success("Đã cập nhật trạng thái KPI.");
    } catch (error) {
      setReviewError(getErrorMessage(error, "Không thể lưu duyệt KPI. Thử lại."));
    } finally {
      setReviewBusy(false);
    }
  };
  const handleReconcile = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const result = await adminReconcilePaymentOrderPayerSource(orderId);
      setReport((current) => current ? {
        ...current,
        items: current.items.map((item) => item.orderId === orderId ? { ...item, payer: result.payer } : item),
      } : current);
      if (result.payer.source === "reconciliation") {
        const item = report?.items.find((candidate) => candidate.orderId === orderId);
        if (item) setEvidenceItem({ ...item, payer: result.payer });
      }
      toast.success("Đã đối chiếu PayOS.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đối chiếu PayOS. Thử lại."));
    } finally {
      setBusyOrderId(null);
    }
  };
  const handleExport = async () => {
    setExportBusy(true);
    setExportError(null);
    try {
      const exported = await adminExportSalesReport(activeParams);
      const url = URL.createObjectURL(exported.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.filename || `sales-report-${activeParams.from}-to-${activeParams.to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getErrorMessage(error, "Không thể xuất báo cáo. Thử lại."));
    } finally {
      setExportBusy(false);
    }
  };
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
      <AdminPageHeader
        title="Báo cáo kinh doanh"
        description="Đối soát giao dịch Plus thực, duyệt KPI và xuất bằng chứng đã ẩn thông tin nhạy cảm."
        actions={<Button type="button" variant="outline" disabled={exportBusy} onClick={() => void handleExport()}>{exportBusy ? "Đang xuất..." : "Xuất CSV"}</Button>}
      />
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
      {exportError ? <p role="alert" className="text-sm text-rose-600">{exportError}</p> : null}
      {loading && !report ? <p role="status">Đang tải báo cáo kinh doanh…</p> : null}
      {report ? (
        <>
          <AdminSalesKpiGrid summary={report.summary} />
          <AdminSalesRevenueChart dailyBuckets={report.dailyBuckets} />
          <div role="tablist" aria-label="Trạng thái KPI hiệu lực" className="flex flex-wrap gap-2">
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
            <AdminSalesReportList
              items={report.items}
              busyOrderId={busyOrderId}
              onReview={(item) => {
                reviewRequestRef.current = null;
                setReviewError(null);
                setReviewItem(item);
              }}
              onReconcile={(orderId) => void handleReconcile(orderId)}
              onViewEvidence={setEvidenceItem}
            />
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
      <AdminSalesReviewDialog
        item={reviewItem}
        busy={reviewBusy}
        error={reviewError}
        onOpenChange={(open) => {
          if (!open && !reviewBusy) {
            reviewRequestRef.current = null;
            setReviewItem(null);
          }
        }}
        onConfirm={handleReview}
      />
      <AdminPaymentPayerEvidenceDialog
        open={evidenceItem !== null}
        payer={evidenceItem?.payer ?? null}
        onOpenChange={(open) => { if (!open) setEvidenceItem(null); }}
      />
    </div>
  );
}
