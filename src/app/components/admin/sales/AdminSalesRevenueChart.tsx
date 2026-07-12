import type { AdminSalesReportResult } from "@/services/adminService";

import { formatVnd } from "../utils";

export function AdminSalesRevenueChart({ dailyBuckets }: { dailyBuckets: AdminSalesReportResult["dailyBuckets"] }) {
  if (dailyBuckets.length === 0) {
    return <p className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-6 text-sm text-app-ink-muted">Chưa có doanh thu được tính KPI trong khoảng này.</p>;
  }

  const width = Math.max(640, dailyBuckets.length * 48);
  const maxValue = Math.max(1, ...dailyBuckets.map((bucket) => bucket.grossRevenueVnd));

  return (
    <section className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4" aria-labelledby="sales-revenue-chart-title">
      <h2 id="sales-revenue-chart-title" className="text-base font-semibold text-app-ink">Doanh thu theo ngày</h2>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} 180`} className="h-48 min-w-[40rem]" role="img" aria-label="Biểu đồ doanh thu gộp và doanh thu thuần theo ngày">
          {dailyBuckets.map((bucket, index) => {
            const x = index * 48 + 12;
            const grossHeight = (bucket.grossRevenueVnd / maxValue) * 140;
            const netHeight = (bucket.netRevenueVnd / maxValue) * 140;
            return (
              <g key={bucket.date}>
                <rect x={x} y={150 - grossHeight} width="12" height={grossHeight} fill="var(--chart-2)" />
                <rect x={x + 14} y={150 - netHeight} width="12" height={netHeight} fill="var(--chart-1)" />
                <text x={x + 13} y="170" textAnchor="middle" className="fill-app-ink-muted text-[8px]">{bucket.date.slice(5)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>Doanh thu theo ngày</caption>
        <thead><tr><th>Ngày</th><th>Doanh thu gộp</th><th>Hoàn tiền</th><th>Doanh thu thuần</th></tr></thead>
        <tbody>
          {dailyBuckets.map((bucket) => (
            <tr key={bucket.date}>
              <td>{bucket.date}</td>
              <td>{formatVnd(bucket.grossRevenueVnd)}</td>
              <td>{formatVnd(bucket.refundedAmountVnd)}</td>
              <td>{formatVnd(bucket.netRevenueVnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
