import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  adminCompletePaymentOrderManually,
  adminListPaymentOrders,
  type AdminPaymentOrderSummary,
} from "@/services/adminService";

import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import {
  PAYMENT_STATUS_FILTERS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from "../components/admin/statusMappings";
import { formatDate, formatVnd, getErrorMessage } from "../components/admin/utils";

const SEARCH_DEBOUNCE_MS = 350;

function getPaymentOwnerLabel(payment: AdminPaymentOrderSummary): string {
  return payment.user?.email || payment.user?.displayName || payment.userId;
}

export function AdminPaymentsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";
  const { setPaymentsPending } = useAdminPendingCounts();

  const [items, setItems] = useState<AdminPaymentOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminPaymentOrderSummary["status"] | "all">("all");

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState(
    "Đã đối chiếu giao dịch tiền vào trong cổng thanh toán/app ngân hàng.",
  );

  const handleSearchChange = useCallback((next: string) => setQuery(next), []);
  useAdminSearch(query, handleSearchChange, "Tìm mã đơn, email, mã giao dịch");

  const loadPayments = useCallback(
    async (nextQuery: string, nextStatus: AdminPaymentOrderSummary["status"] | "all") => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminListPaymentOrders({ q: nextQuery, status: nextStatus, limit: 50 });
        setItems(result.items);
        setTotal(result.total);
      } catch (err) {
        setError(getErrorMessage(err, "Không thể tải danh sách thanh toán tự động."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load + filter changes (query has its own debounced effect below).
  // We use a stable ref pattern: ref captures the latest query without making
  // the effect re-run on every keystroke.
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadPayments(queryRef.current, statusFilter);
  }, [authLoading, isAdmin, loadPayments, statusFilter, user, userProfileLoading]);

  // Debounced reload when the user types in the topbar search input.
  const isFirstRunRef = useRef(true);
  const statusRef = useRef(statusFilter);
  statusRef.current = statusFilter;
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (authLoading || userProfileLoading || !user || !isAdmin) return;
    const handle = window.setTimeout(() => {
      void loadPayments(query, statusRef.current);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, authLoading, isAdmin, loadPayments, user, userProfileLoading]);

  // Track separate "all-pending" count for the sidebar badge — independent of the
  // current filter so users see the true backlog even when viewing "completed".
  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    adminListPaymentOrders({ status: "pending", limit: 1 })
      .then((result) => {
        if (!cancelled) setPaymentsPending(result.total || undefined);
      })
      .catch(() => {
        // Silent — sidebar badge is informational; loading errors surface in the page itself.
      });
    return () => {
      cancelled = true;
      setPaymentsPending(undefined);
    };
  }, [isAdmin, setPaymentsPending, user]);

  const handleManualComplete = (orderId: string) => {
    setPendingOrderId(orderId);
    setManualNote("Đã đối chiếu giao dịch tiền vào trong cổng thanh toán/app ngân hàng.");
  };

  const confirmManualComplete = async () => {
    if (!pendingOrderId) return;
    setBusyOrderId(pendingOrderId);
    try {
      const result = await adminCompletePaymentOrderManually(pendingOrderId, {
        manualCompletionNote: manualNote.trim() || undefined,
      });
      toast.success(`Đã mở Plus cho đơn ${result.orderId}.`);
      setPendingOrderId(null);
      setManualNote("Đã đối chiếu giao dịch tiền vào trong cổng thanh toán/app ngân hàng.");
      void loadPayments(query, statusFilter);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể hoàn tất đơn thanh toán."));
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Thanh toán tự động"
        description="Đối chiếu các giao dịch Plus được webhook ghi nhận, mở Plus thủ công khi cần khôi phục."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            disabled={loading}
            onClick={() => void loadPayments(query, statusFilter)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          <p className="font-semibold">Không tải được dữ liệu</p>
          <p className="mt-1 leading-6 text-rose-100/80">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={() => void loadPayments(query, statusFilter)}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc nhanh theo trạng thái">
        {PAYMENT_STATUS_FILTERS.map((status) => {
          const active = statusFilter === status;
          const label = status === "all" ? "Tất cả" : PAYMENT_STATUS_LABELS[status];
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(status)}
              className={`rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-slate-400">
        Hiển thị {items.length.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")} đơn. Chỉ bấm{" "}
        <span className="text-slate-200">Mở Plus thủ công</span> sau khi đối chiếu trong cổng thanh toán hoặc app ngân
        hàng.
        {query ? <span className="ml-1 text-slate-500">Đang lọc theo "{query}".</span> : null}
      </p>

      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={CreditCard}
          title="Không có đơn thanh toán phù hợp"
          description="Thử thay đổi bộ lọc hoặc xoá từ khoá tìm kiếm trên thanh tiêu đề."
        />
      ) : (
        <div className="rounded-[var(--r-card)] border border-white/10 bg-white/[0.02]">
          <Table className="text-slate-200">
            <TableHeader className="sticky top-0 bg-white/[0.04] text-slate-300 [&_tr]:border-b [&_tr]:border-white/10">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-slate-400">Mã đơn</TableHead>
                <TableHead className="text-slate-400">Người dùng</TableHead>
                <TableHead className="text-slate-400">Số tiền</TableHead>
                <TableHead className="text-slate-400">Trạng thái</TableHead>
                <TableHead className="text-slate-400">Tạo lúc</TableHead>
                <TableHead className="text-right text-slate-400">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/10">
              {items.map((payment) => {
                const canComplete =
                  payment.status === "pending" ||
                  payment.status === "expired" ||
                  payment.status === "failed";
                return (
                  <TableRow key={payment.orderId} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-white">
                      <p>{payment.orderId}</p>
                      {payment.cassoTransactionId ? (
                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          TX: {payment.cassoTransactionId}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      <p className="truncate text-sm font-medium">{getPaymentOwnerLabel(payment)}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{payment.userId}</p>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      <p className="font-semibold text-white">{formatVnd(payment.amount)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {payment.bankName ?? "Nhà cung cấp thanh toán"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge tone={PAYMENT_STATUS_TONES[payment.status]}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </AdminStatusBadge>
                      {payment.manualCompletedBy ? (
                        <p className="mt-2 text-[11px] text-slate-500">Manual: {payment.manualCompletedBy}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canComplete ? (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          disabled={busyOrderId === payment.orderId}
                          onClick={() => handleManualComplete(payment.orderId)}
                        >
                          {busyOrderId === payment.orderId ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Mở Plus thủ công
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">Đã xử lý</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={pendingOrderId !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPendingOrderId(null);
          setManualNote("Đã đối chiếu giao dịch tiền vào trong cổng thanh toán/app ngân hàng.");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mở Plus thủ công?</AlertDialogTitle>
            <AlertDialogDescription>
              Đơn <span className="font-mono">{pendingOrderId ?? "—"}</span> sẽ được đánh dấu đã nhận tiền. Chỉ xác
              nhận sau khi đã đối chiếu số tiền trong cổng thanh toán/app ngân hàng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <label htmlFor="manual-payment-note" className="text-sm font-medium text-slate-700">
              Ghi chú đối chiếu
            </label>
            <Textarea
              id="manual-payment-note"
              value={manualNote}
              onChange={(event) => setManualNote(event.target.value)}
              placeholder="Nhập ghi chú đối chiếu giao dịch"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyOrderId !== null}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyOrderId !== null}
              onClick={(event) => {
                event.preventDefault();
                void confirmManualComplete();
              }}
            >
              {busyOrderId !== null ? "Đang mở Plus…" : "Xác nhận mở Plus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminPaymentsPage;
