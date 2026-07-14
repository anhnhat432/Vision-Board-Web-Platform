import { Loader2, RefreshCw, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminRefundRequestSummary,
  adminCompleteRefundRequest,
  adminListRefundRequests,
  adminRejectRefundRequest,
} from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { REFUND_STATUS_LABELS, REFUND_STATUS_TONES } from "../components/admin/statusMappings";
import { formatDate, getErrorMessage } from "../components/admin/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

type RefundActionStatus = Extract<AdminRefundRequestSummary["status"], "completed" | "rejected">;

export function AdminRefundsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";
  const { setRefundsPending } = useAdminPendingCounts();

  const [items, setItems] = useState<AdminRefundRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pending, setPending] = useState<{ request: AdminRefundRequestSummary; status: RefundActionStatus } | null>(
    null,
  );
  const [adminNote, setAdminNote] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListRefundRequests("pending");
      setItems(result.items);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách yêu cầu hoàn tiền."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadRefunds();
  }, [authLoading, isAdmin, loadRefunds, user, userProfileLoading]);

  // Cập nhật badge "Hoàn tiền" trên sidebar theo số yêu cầu pending hiện tại.
  useEffect(() => {
    setRefundsPending(items.length || undefined);
    return () => setRefundsPending(undefined);
  }, [items.length, setRefundsPending]);

  const openConfirm = (request: AdminRefundRequestSummary, status: RefundActionStatus) => {
    setActionError(null);
    setPending({ request, status });
    setAdminNote(status === "completed" ? "Đã chuyển khoản hoàn tiền thủ công." : "Không đủ điều kiện hoàn tiền.");
  };

  const confirmResolve = async () => {
    if (!pending) return;
    const { request, status } = pending;
    setBusyId(request.id);
    try {
      const result =
        status === "completed"
          ? await adminCompleteRefundRequest(request.id, { adminNote: adminNote.trim() || undefined })
          : await adminRejectRefundRequest(request.id, { adminNote: adminNote.trim() || undefined });
      setItems((prev) => prev.filter((item) => item.id !== result.request.id));
      setPending(null);
      setAdminNote("");
      toast.success(
        status === "completed"
          ? `Đã đánh dấu hoàn tiền cho ${request.orderId}.`
          : `Đã từ chối hoàn tiền cho ${request.orderId}.`,
      );
      void loadRefunds();
    } catch (err) {
      setActionError(getErrorMessage(err, "Không thể xử lý yêu cầu hoàn tiền."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Hoàn tiền"
        description={`${items.length} yêu cầu đang chờ xử lý. Đối chiếu kỹ tài khoản nhận hoàn tiền trước khi xác nhận.`}
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            disabled={loading}
            onClick={() => void loadRefunds()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={
            <div>
              <p className="font-semibold">Không tải được yêu cầu hoàn tiền</p>
              <p className="mt-1 font-normal">{error}</p>
            </div>
          }
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void loadRefunds()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {actionError && pending === null ? (
        <AdminFeedbackBanner
          tone="error"
          summary={actionError}
          onDismiss={() => setActionError(null)}
          dismissLabel="Đóng lỗi xử lý hoàn tiền"
        />
      ) : null}

      <AdminDataPanel
        title="Yêu cầu hoàn tiền đang chờ"
        description="Đối chiếu lý do, tài khoản nhận tiền và ghi chú trước khi xác nhận."
        busy={loading}
        contentClassName="p-3 sm:p-4"
      >
      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-app-ink-muted motion-reduce:animate-none" />
          <span className="sr-only">Đang tải yêu cầu hoàn tiền</span>
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={WalletCards}
          title="Không có yêu cầu hoàn tiền"
          description="Khi user yêu cầu hoàn tiền, đơn sẽ xuất hiện ở đây để bạn duyệt."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((request) => (
            <li key={request.id} className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs font-semibold text-app-ink">{request.orderId}</p>
                    <AdminStatusBadge tone={REFUND_STATUS_TONES[request.status]}>
                      {REFUND_STATUS_LABELS[request.status]}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-app-ink-muted">
                    {request.contactEmail} · tạo {formatDate(request.createdAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-app-status-success text-white hover:bg-app-status-success/80"
                    disabled={busyId === request.id}
                    onClick={() => openConfirm(request, "completed")}
                  >
                    {busyId === request.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Đã hoàn tiền
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
                    disabled={busyId === request.id}
                    onClick={() => openConfirm(request, "rejected")}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[var(--r-control)] border border-app-line bg-app-bg-subtle p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Lý do user</p>
                  <p className="mt-1 text-sm leading-6 text-app-ink-soft">{request.reason}</p>
                </div>
                <div className="rounded-[var(--r-control)] border border-app-status-warning/40 bg-app-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-status-warning">
                    Tài khoản nhận hoàn tiền
                  </p>
                  <p className="mt-1 break-words text-sm font-medium leading-6 text-app-ink">{request.refundAccount}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      </AdminDataPanel>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPending(null);
          setAdminNote("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.status === "completed" ? "Xác nhận đã hoàn tiền?" : "Xác nhận từ chối hoàn tiền?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Đơn <span className="font-mono">{pending?.request.orderId ?? "—"}</span> ·{" "}
              {pending?.request.contactEmail ?? "—"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? (
            <AdminFeedbackBanner
              tone="error"
              summary={actionError}
              onDismiss={() => setActionError(null)}
              dismissLabel="Đóng lỗi xử lý hoàn tiền"
            />
          ) : null}
          <div className="grid gap-3">
            <div className="rounded-[var(--r-control)] bg-app-bg-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Lý do user</p>
              <p className="mt-1 text-sm leading-6 text-app-ink-muted">{pending?.request.reason ?? "—"}</p>
            </div>
            <div className="rounded-[var(--r-control)] bg-app-status-warning/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-status-warning">Tài khoản nhận hoàn tiền</p>
              <p className="mt-1 text-sm leading-6 text-app-status-warning">{pending?.request.refundAccount ?? "—"}</p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-admin-note" className="text-sm font-medium text-app-ink-muted">
                Ghi chú admin
              </label>
              <Textarea
                id="refund-admin-note"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Nhập ghi chú xử lý hoàn tiền"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId !== null}
              onClick={(event) => {
                event.preventDefault();
                void confirmResolve();
              }}
            >
              {busyId !== null
                ? "Đang xử lý…"
                : pending?.status === "completed"
                  ? "Xác nhận đã hoàn tiền"
                  : "Xác nhận từ chối"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminRefundsPage;
