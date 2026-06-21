import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminSubscriptionListItem,
  adminListSubscriptions,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { adminSurface } from "../components/admin/tokens";
import { formatDate, getErrorMessage } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const SUB_STATUS_TONES: Record<string, "completed" | "pending" | "failed" | "expired"> = {
  active: "completed",
  trialing: "completed",
  past_due: "pending",
  canceled: "failed",
  incomplete: "expired",
  unpaid: "pending",
};

const SUB_STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  trialing: "Dùng thử",
  past_due: "Quá hạn",
  canceled: "Đã hủy",
  incomplete: "Chưa hoàn tất",
  unpaid: "Chưa thanh toán",
};

export function AdminSubscriptionsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";

  const [items, setItems] = useState<AdminSubscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const limit = 30;

  const load = useCallback(async (p: number, status: string, plan: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListSubscriptions({ status, planCode: plan, page: p, limit });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách subscription."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) { setLoading(false); return; }
    void load(1, statusFilter, planFilter);
  }, [authLoading, isAdmin, load, statusFilter, planFilter, user, userProfileLoading]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Subscription"
        description={`${total.toLocaleString("vi-VN")} gói đăng ký`}
        actions={
          <Button type="button" variant="outline" className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft" disabled={loading} onClick={() => void load(page, statusFilter, planFilter)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="trialing">Dùng thử</SelectItem>
            <SelectItem value="past_due">Quá hạn</SelectItem>
            <SelectItem value="canceled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Gói" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả gói</SelectItem>
            <SelectItem value="PLUS">Plus</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10">
          {error}
          <Button type="button" variant="ghost" size="sm" className="ml-2 underline" onClick={() => void load(page, statusFilter, planFilter)}>Thử lại</Button>
        </div>
      ) : null}

      <div className={`${adminSurface.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-line bg-gradient-to-r from-app-bg-subtle/80 to-app-bg-subtle/40">
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">User</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Gói</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Chu kỳ</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Hết hạn</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded-full bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={6}><AdminEmptyState icon={CreditCard} title="Không có subscription nào" description="Thử đổi bộ lọc." /></td></tr>
              ) : (
                items.map((sub) => (
                  <tr key={sub.id} className="border-b border-app-line/50 last:border-0 hover:bg-app-accent-soft/20 transition-colors duration-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-app-ink text-xs">{sub.userDisplayName || sub.userEmail}</p>
                      <p className="text-xs text-app-ink-muted">{sub.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${sub.planCode === "PLUS" ? "bg-app-accent-soft text-app-accent border-app-accent/20" : "bg-app-bg-subtle text-app-ink-soft border-app-line"}`}>
                        {sub.planCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={SUB_STATUS_TONES[sub.status] ?? "neutral"}>
                        {SUB_STATUS_LABELS[sub.status] ?? sub.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-app-ink-soft">{sub.billingCycle ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-app-ink-soft">{sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-app-ink-muted">{formatDate(sub.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-app-ink-muted">Trang {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1, statusFilter, planFilter)}>Trước</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1, statusFilter, planFilter)}>Sau</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminSubscriptionsPage;
