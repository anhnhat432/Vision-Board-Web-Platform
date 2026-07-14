import { Loader2, Mail, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminEmailEventItem,
  adminListEmailEvents,
} from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { formatDate, getErrorMessage } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

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
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft"
            disabled={loading}
            onClick={() => void load(page)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void load(page)}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      <AdminDataPanel
        title="Email đã xử lý"
        description={`Hiển thị ${items.length.toLocaleString("vi-VN")} / ${total.toLocaleString("vi-VN")} email`}
        busy={loading}
      >
        <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
          <TableCaption className="sr-only">Lịch sử email</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Người nhận</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col">Lỗi</TableHead>
              <TableHead scope="col">Xử lý lúc</TableHead>
              <TableHead scope="col">Tạo lúc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }, (_, i) => `email-history-skeleton-${i}`).map((skeletonKey) => (
                  <TableRow key={skeletonKey}>
                    <TableCell>
                      <div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-20 animate-pulse rounded-full bg-app-accent-soft motion-reduce:animate-none" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="whitespace-normal p-4">
                    <AdminEmptyState
                      icon={Mail}
                      title="Chưa có email nào"
                      description="Email nhắc hạn sẽ xuất hiện ở đây sau khi admin gửi."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell>
                      <p className="font-medium text-app-ink text-xs">{evt.userDisplayName || evt.userEmail}</p>
                      <p className="text-xs text-app-ink-muted">{evt.userEmail}</p>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge tone={EMAIL_STATUS_TONES[evt.status] ?? "neutral"}>
                        {EMAIL_STATUS_LABELS[evt.status] ?? evt.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-app-status-error">
                      {evt.error || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-app-ink-soft">
                      {evt.processedAt ? formatDate(evt.processedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-app-ink-muted">{formatDate(evt.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </AdminDataPanel>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          itemLabel="email"
          onPageChange={(nextPage) => void load(nextPage)}
        />
      ) : null}
    </div>
  );
}

export default AdminEmailHistoryPage;
