import type { AdminSalesReportRow } from "@/services/adminService";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { formatDate, formatVnd } from "../utils";

export function AdminSalesReportList({ items }: { items: AdminSalesReportRow[] }) {
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
                <TableCell>{item.reporting.kpiStatus}</TableCell>
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
              <dt className="text-app-ink-muted">KPI</dt><dd className="text-right">{item.reporting.kpiStatus}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
