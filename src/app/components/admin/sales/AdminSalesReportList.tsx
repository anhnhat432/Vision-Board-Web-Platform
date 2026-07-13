import type { AdminSalesReportRow } from "@/services/adminService";

import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "../AdminOperationalClassificationBadge";
import { Button } from "../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { formatDate, formatVnd } from "../utils";

interface AdminSalesReportListProps {
  items: AdminSalesReportRow[];
  busyOrderId: string | null;
  onReview(item: AdminSalesReportRow): void;
  onReconcile(orderId: string): void;
  onViewEvidence(item: AdminSalesReportRow): void;
}

const SALES_STATUS_LABELS = {
  pending: "Chờ duyệt",
  included: "Được tính KPI",
  excluded: "Không tính KPI",
} as const;

function SalesKpiStatus({ item }: { item: AdminSalesReportRow }) {
  const classification = item.operationalClassification ?? { effectiveCategory: "real", source: "default" as const };
  const effectiveKpiStatus = item.effectiveKpiStatus ?? item.reporting.kpiStatus;
  const excludedByClassification = effectiveKpiStatus === "excluded" && classification.effectiveCategory !== "real";

  return (
    <div className="space-y-1 text-xs">
      <p>Đã duyệt: {SALES_STATUS_LABELS[item.reporting.kpiStatus]}</p>
      {item.reporting.kpiStatus !== effectiveKpiStatus ? <p>Hiệu lực: Đã loại theo tài khoản</p> : null}
      {excludedByClassification ? (
        <div className="flex flex-wrap items-center gap-2">
          <AdminOperationalClassificationBadge classification={classification} />
          <p className="text-app-ink-muted">{getAdminOperationalClassificationSourceLabel(classification.source)}</p>
        </div>
      ) : null}
    </div>
  );
}

function SalesActions({ item, busyOrderId, onReview, onReconcile, onViewEvidence }: Omit<AdminSalesReportListProps, "items"> & { item: AdminSalesReportRow }) {
  const hasEvidence = item.payer?.source === "reconciliation";
  const canReconcile = item.provider === "payos" && !hasEvidence;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onReview(item)} disabled={busyOrderId !== null}>
        Duyệt KPI {item.orderId}
      </Button>
      {canReconcile ? (
        <Button type="button" size="sm" variant="outline" onClick={() => onReconcile(item.orderId)} disabled={busyOrderId !== null}>
          {busyOrderId === item.orderId ? "Đang đối chiếu..." : "Đối chiếu PayOS"}
        </Button>
      ) : null}
      {hasEvidence ? (
        <Button type="button" size="sm" variant="outline" onClick={() => onViewEvidence(item)} disabled={busyOrderId !== null}>
          Xem chứng cứ
        </Button>
      ) : null}
    </div>
  );
}

export function AdminSalesReportList({ items, busyOrderId, onReview, onReconcile, onViewEvidence }: AdminSalesReportListProps) {
  return (
    <>
      <div className="hidden md:block" data-testid="sales-report-desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Giao dịch</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Đối chiếu</TableHead>
              <TableHead>Trạng thái KPI</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.orderId}>
                <TableCell>
                  <p className="font-medium text-app-ink">{item.customerLabelMasked}</p>
                  <p className="text-xs text-app-ink-muted">{item.customerEmailMasked}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-xs">{item.orderId}</p>
                  <p className="text-xs text-app-ink-muted">{item.provider} · {item.providerReference ?? "Chưa có mã"}</p>
                  <p className="text-xs text-app-ink-muted">{formatDate(item.completedAt)}</p>
                </TableCell>
                <TableCell>{formatVnd(item.amountVnd)}</TableCell>
                <TableCell>
                  <p>{item.payer?.classification ?? "unknown"}</p>
                  <p className="text-xs text-app-ink-muted">{item.refund.status === "completed" ? "Đã hoàn tiền" : "Chưa hoàn tiền"}</p>
                </TableCell>
                <TableCell><SalesKpiStatus item={item} /></TableCell>
                <TableCell><SalesActions item={item} busyOrderId={busyOrderId} onReview={onReview} onReconcile={onReconcile} onViewEvidence={onViewEvidence} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden" data-testid="sales-report-mobile-list">
        {items.map((item) => (
          <li key={item.orderId} className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-app-ink">{item.customerLabelMasked}</p>
                <p className="text-xs text-app-ink-muted">{item.customerEmailMasked}</p>
              </div>
              <span className="text-sm font-semibold text-app-ink">{formatVnd(item.amountVnd)}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <dt className="text-app-ink-muted">Mã đơn</dt><dd className="font-mono text-right">{item.orderId}</dd>
              <dt className="text-app-ink-muted">Provider</dt><dd className="text-right">{item.provider}</dd>
              <dt className="text-app-ink-muted">Mã provider</dt><dd className="break-all text-right">{item.providerReference ?? "Chưa có mã"}</dd>
              <dt className="text-app-ink-muted">Hoàn tất</dt><dd className="text-right">{formatDate(item.completedAt)}</dd>
              <dt className="text-app-ink-muted">Nguồn tiền</dt><dd className="text-right">{item.payer?.classification ?? "unknown"}</dd>
              <dt className="text-app-ink-muted">Hoàn tiền</dt><dd className="text-right">{item.refund.status === "completed" ? "Đã hoàn tiền" : "Chưa hoàn tiền"}</dd>
              <dt className="text-app-ink-muted">KPI</dt><dd className="text-right"><SalesKpiStatus item={item} /></dd>
            </dl>
            <div className="mt-4"><SalesActions item={item} busyOrderId={busyOrderId} onReview={onReview} onReconcile={onReconcile} onViewEvidence={onViewEvidence} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}
