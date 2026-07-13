import { CircleDollarSign, Clock3, ReceiptText, Undo2, Users, WalletCards } from "lucide-react";

import type { AdminSalesReportResult } from "@/services/adminService";

import { AdminStatCard } from "../AdminStatCard";
import { formatVnd } from "../utils";

export function AdminSalesKpiGrid({ summary }: { summary: AdminSalesReportResult["summary"] }) {
  const cards = [
    { label: "Giao dịch thành công", value: summary.successfulTransactions, icon: ReceiptText, accent: "orders" as const },
    { label: "Người dùng trả phí", value: summary.uniquePaidUsers, icon: Users, accent: "users" as const },
    { label: "Doanh thu gộp", value: formatVnd(summary.grossRevenueVnd), icon: WalletCards, accent: "revenue" as const },
    { label: "Đã hoàn tiền", value: formatVnd(summary.refundedAmountVnd), icon: Undo2, accent: "orders" as const },
    { label: "Doanh thu thuần", value: formatVnd(summary.netRevenueVnd), icon: CircleDollarSign, accent: "plus" as const },
    { label: "Chờ duyệt", value: summary.pendingReviews, icon: Clock3, accent: "users" as const },
  ];

  return (
    <section aria-label="Chỉ số bán hàng hiệu lực" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => <AdminStatCard key={card.label} {...card} />)}
    </section>
  );
}
