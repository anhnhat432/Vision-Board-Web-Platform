import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminOperationalClassificationSummary,
  type AdminOperationalScope,
  type AdminSubscriptionListItem,
  adminListSubscriptions,
} from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminOperationalScopeFilter } from "../components/admin/AdminOperationalScopeFilter";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { AdminToolbar } from "../components/admin/AdminToolbar";
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

const DEFAULT_OPERATIONAL_CLASSIFICATION: AdminOperationalClassificationSummary = {
  effectiveCategory: "real",
  source: "default",
};

function getSubscriptionClassification(subscription: AdminSubscriptionListItem): AdminOperationalClassificationSummary {
  return subscription.operationalClassification ?? DEFAULT_OPERATIONAL_CLASSIFICATION;
}

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
  const [operationalScope, setOperationalScope] = useState<AdminOperationalScope>("real");
  const limit = 30;

  const load = useCallback(async (p: number, status: string, plan: string, scope: AdminOperationalScope) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListSubscriptions({ status, planCode: plan, operationalScope: scope, page: p, limit });
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
    void load(1, statusFilter, planFilter, operationalScope);
  }, [authLoading, isAdmin, load, operationalScope, statusFilter, planFilter, user, userProfileLoading]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Subscription"
        description={`${total.toLocaleString("vi-VN")} gói đăng ký`}
        actions={
          <Button type="button" variant="outline" className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft" disabled={loading} onClick={() => void load(page, statusFilter, planFilter, operationalScope)}>
            {loading ? (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải lại
          </Button>
        }
      />

      <AdminToolbar
        label="Bộ lọc subscription"
        meta={`${total.toLocaleString("vi-VN")} gói đăng ký`}
      >
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Trạng thái subscription"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="trialing">Dùng thử</SelectItem>
            <SelectItem value="past_due">Quá hạn</SelectItem>
            <SelectItem value="canceled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36" aria-label="Gói subscription"><SelectValue placeholder="Gói" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả gói</SelectItem>
            <SelectItem value="PLUS">Plus</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
          </SelectContent>
        </Select>
        <AdminOperationalScopeFilter value={operationalScope} onChange={(scope) => { setOperationalScope(scope); setPage(1); }} />
      </AdminToolbar>

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={
            <div>
              <p className="font-semibold">Không tải được danh sách subscription</p>
              <p className="mt-1 font-normal">{error}</p>
            </div>
          }
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load(page, statusFilter, planFilter, operationalScope)}
            >
              Thử lại
            </Button>
          }
        />
      ) : null}

      <AdminDataPanel
        title="Danh sách subscription"
        description="Gói, trạng thái, chu kỳ, thời hạn và phân loại hiệu lực theo tài khoản."
        busy={loading}
        contentClassName="overflow-x-auto"
      >
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">Danh sách subscription</caption>
            <thead>
              <tr className="border-b border-app-line bg-gradient-to-r from-app-bg-subtle/80 to-app-bg-subtle/40">
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">User</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Gói</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Chu kỳ</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Hết hạn</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Ngày tạo</th>
                <th scope="col" className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Phân loại</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }, (_, i) => `subscription-skeleton-${i}`).map((skeletonKey) => (
                  <tr key={skeletonKey}>
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded-full bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><AdminEmptyState icon={CreditCard} title="Không có subscription nào" description="Thử đổi bộ lọc." /></td></tr>
              ) : (
                items.map((sub) => {
                  const classification = getSubscriptionClassification(sub);
                  return (
                  <tr key={sub.id} className="border-b border-app-line/50 last:border-0 hover:bg-app-accent-soft/20 transition-colors duration-100 motion-reduce:transition-none">
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
                    <td className="px-4 py-3">
                      <AdminOperationalClassificationBadge classification={classification} />
                      <p className="mt-1 text-xs text-app-ink-muted">{getAdminOperationalClassificationSourceLabel(classification.source)}</p>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </AdminDataPanel>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          itemLabel="subscription"
          onPageChange={(nextPage) =>
            void load(nextPage, statusFilter, planFilter, operationalScope)
          }
        />
      ) : null}
    </div>
  );
}

export default AdminSubscriptionsPage;
