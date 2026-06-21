import { Loader2, Mail, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminEmailEventItem,
  adminListEmailEvents,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { adminSurface } from "../components/admin/tokens";
import { formatDate, getErrorMessage } from "../components/admin/utils";
import { Button } from "../components/ui/button";

const EMAIL_STATUS_TONES: Record<string, "completed" | "pending" | "failed" | "expired"> = {
  sent: "completed",
  processed: "completed",
  skipped: "expired",
  failed: "failed",
  ignored: "expired",
  received: "pending",
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: "Đã gửi",
  processed: "Đã xử lý",
  skipped: "Bỏ qua",
  failed: "Lỗi",
  ignored: "Đã bỏ qua",
  received: "Đã nhận",
};

export function AdminEmailHistoryPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";

  const [items, setItems] = useState<AdminEmailEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 30;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListEmailEvents({ page: p, limit });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải lịch sử email."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) { setLoading(false); return; }
    void load(1);
  }, [authLoading, isAdmin, load, user, userProfileLoading]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lịch sử Email"
        description={`${total.toLocaleString("vi-VN")} email nhắc hạn đã xử lý`}
        actions={
          <Button type="button" variant="outline" className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft" disabled={loading} onClick={() => void load(page)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10">
          {error}
          <Button type="button" variant="ghost" size="sm" className="ml-2 underline" onClick={() => void load(page)}>Thử lại</Button>
        </div>
      ) : null}

      <div className={`${adminSurface.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-line bg-gradient-to-r from-app-bg-subtle/80 to-app-bg-subtle/40">
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Người nhận</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Lỗi</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Xử lý lúc</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded-full bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={5}><AdminEmptyState icon={Mail} title="Chưa có email nào" description="Email nhắc hạn sẽ xuất hiện ở đây sau khi admin gửi." /></td></tr>
              ) : (
                items.map((evt) => (
                  <tr key={evt.id} className="border-b border-app-line/50 last:border-0 hover:bg-app-accent-soft/20 transition-colors duration-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-app-ink text-xs">{evt.userDisplayName || evt.userEmail}</p>
                      <p className="text-xs text-app-ink-muted">{evt.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={EMAIL_STATUS_TONES[evt.status] ?? "neutral"}>
                        {EMAIL_STATUS_LABELS[evt.status] ?? evt.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-500 max-w-[200px] truncate">{evt.error || "—"}</td>
                    <td className="px-4 py-3 text-xs text-app-ink-soft">{evt.processedAt ? formatDate(evt.processedAt) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-app-ink-muted">{formatDate(evt.createdAt)}</td>
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
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>Trước</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1)}>Sau</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminEmailHistoryPage;
