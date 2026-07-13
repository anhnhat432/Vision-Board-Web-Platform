import { CreditCard, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminClassificationMutationPayload,
  type AdminOperationalClassificationSummary,
  type AdminOperationalScope,
  type AdminPaymentOrderSummary,
  adminClassifyPaymentOrder,
  adminCompletePaymentOrderManually,
  adminListPaymentOrders,
  adminReconcilePaymentOrderPayerSource,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import {
  AdminPaymentPayerEvidenceDialog,
  getPayerEvidenceDescription,
} from "../components/admin/AdminPaymentPayerEvidenceDialog";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminOperationalScopeFilter } from "../components/admin/AdminOperationalScopeFilter";
import {
  PAYMENT_STATUS_FILTERS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from "../components/admin/statusMappings";
import { downloadCsv } from "../components/admin/csvExport";
import { formatDate, formatVnd, getErrorMessage } from "../components/admin/utils";
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

const SEARCH_DEBOUNCE_MS = 350;

const PAYER_SOURCE_LABELS = {
  internal: "Nội bộ",
  external: "Nguồn ngoài",
  unknown: "Chưa xác định",
} as const;

const PAYER_SOURCE_CLASS_NAMES = {
  internal: "text-amber-700 dark:text-amber-300",
  external: "text-emerald-700 dark:text-emerald-300",
  unknown: "text-app-ink-muted",
} as const;

const DEFAULT_OPERATIONAL_CLASSIFICATION: AdminOperationalClassificationSummary = {
  effectiveCategory: "real",
  source: "default",
};

function normalizePaymentOperationalClassification(payment: AdminPaymentOrderSummary): AdminPaymentOrderSummary {
  return payment.operationalClassification
    ? payment
    : { ...payment, operationalClassification: DEFAULT_OPERATIONAL_CLASSIFICATION };
}

function getEditableOperationalReason(
  reason: AdminOperationalClassificationSummary["reason"],
): AdminClassificationMutationPayload["reason"] | undefined {
  return reason === "legacy_sales_test" || reason === "legacy_sales_internal" ? undefined : reason;
}

function getPaymentOwnerLabel(payment: AdminPaymentOrderSummary): string {
  return payment.user?.email || payment.user?.displayName || payment.userId;
}

function getPayerIdentityLabel(payment: AdminPaymentOrderSummary): string | null {
  const payer = payment.payer;
  if (!payer) return null;

  const parts = [
    payer.accountNameMasked,
    payer.accountLast4 ? `****${payer.accountLast4}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : null;
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "errorCode" in error
    ? String(error.errorCode)
    : undefined;
}

export function AdminPaymentsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";
  const { setPaymentsPending } = useAdminPendingCounts();

  const [items, setItems] = useState<AdminPaymentOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminPaymentOrderSummary["status"] | "all">("all");
  const [operationalScope, setOperationalScope] = useState<AdminOperationalScope>("real");
  const [page, setPage] = useState(1);

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState("Đã đối chiếu giao dịch tiền vào trong cổng thanh toán/app ngân hàng.");
  const [evidencePayment, setEvidencePayment] = useState<AdminPaymentOrderSummary | null>(null);
  const [classificationPayment, setClassificationPayment] = useState<AdminPaymentOrderSummary | null>(null);
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState<string>();
  const classificationRequestRef = useRef<{ commandKey: string; requestId: string } | null>(null);
  const classificationMutationRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const currentViewKeyRef = useRef("");

  const handleSearchChange = useCallback((next: string) => {
    setQuery(next);
  }, []);
  useAdminSearch(query, handleSearchChange, "Tìm mã đơn, email, mã giao dịch");

  const loadPayments = useCallback(
    async (nextQuery: string, nextStatus: AdminPaymentOrderSummary["status"] | "all", nextScope: AdminOperationalScope, nextPage: number) => {
      const generation = ++loadGenerationRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await adminListPaymentOrders({
          q: nextQuery, status: nextStatus, operationalScope: nextScope, page: nextPage, limit: 30,
        });
        if (generation !== loadGenerationRef.current) return;
        const boundedPages = Math.max(1, result.totalPages);
        if (nextPage > boundedPages) {
          setPage(boundedPages);
          return;
        }
        setItems(result.items.map(normalizePaymentOperationalClassification));
        setTotal(result.total);
        setTotalPages(boundedPages);
      } catch (err) {
        if (generation !== loadGenerationRef.current) return;
        setError(getErrorMessage(err, "Không thể tải danh sách thanh toán tự động."));
      } finally {
        if (generation === loadGenerationRef.current) setLoading(false);
      }
    },
    [],
  );

  const viewKey = JSON.stringify({ q: debouncedQuery, statusFilter, operationalScope, page });
  currentViewKeyRef.current = viewKey;

  // A classification belongs to one server view. Changing that view releases its dialog;
  // an in-flight request is ignored by its generation guard when it later settles.
  useEffect(() => {
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationPayment(null);
    setClassificationBusy(false);
    setClassificationError(undefined);
  }, [viewKey]);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadPayments(debouncedQuery, statusFilter, operationalScope, page);
  }, [authLoading, debouncedQuery, isAdmin, loadPayments, operationalScope, page, statusFilter, user, userProfileLoading]);

  // Debounced reload when the user types in the topbar search input.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query !== debouncedQuery) {
        setDebouncedQuery(query);
        setPage(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [debouncedQuery, query]);

  // Track separate "all-pending" count for the sidebar badge — independent of the
  // current filter so users see the true backlog even when viewing "completed".
  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    adminListPaymentOrders({ status: "pending", operationalScope: "real", limit: 1 })
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

  const resetToFirstPage = () => setPage(1);

  const openClassification = (payment: AdminPaymentOrderSummary) => {
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationError(undefined);
    setClassificationPayment(payment);
  };

  const handleClassification = async (payload: Omit<AdminClassificationMutationPayload, "requestId">) => {
    const payment = classificationPayment;
    if (!payment) return;
    if (payment.operationalClassification.source === "user" && payload.category === "real") {
      setClassificationError("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.");
      return;
    }
    const commandKey = JSON.stringify({ id: payment.orderId, ...payload, note: payload.note?.trim() || null });
    const current = classificationRequestRef.current;
    const requestId = current?.commandKey === commandKey ? current.requestId : crypto.randomUUID();
    const viewKey = currentViewKeyRef.current;
    classificationRequestRef.current = { commandKey, requestId };
    const mutation = ++classificationMutationRef.current;
    setClassificationBusy(true);
    setClassificationError(undefined);
    try {
      const result = await adminClassifyPaymentOrder(payment.orderId, { ...payload, requestId });
      if (mutation !== classificationMutationRef.current || classificationPayment?.orderId !== payment.orderId || viewKey !== currentViewKeyRef.current) return;
      if (result.status === "updated" || result.status === "unchanged") {
        await loadPayments(debouncedQuery, statusFilter, operationalScope, page);
        if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
        classificationRequestRef.current = null;
        setClassificationPayment(null);
      } else if ((result as { errorCode?: string }).errorCode === "admin_audit_commit_unknown") {
        setClassificationError("Kết quả phân loại chưa rõ. Hãy thử lại cùng yêu cầu này.");
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn thanh toán. Hãy thử lại.");
      }
    } catch (err) {
      if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
      const errorCode = getErrorCode(err);
      if (errorCode === "admin_classification_request_conflict") {
        await loadPayments(debouncedQuery, statusFilter, operationalScope, page);
        if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
        setClassificationError("Dữ liệu đã thay đổi. Danh sách đã được tải lại.");
      } else if (errorCode === "admin_audit_commit_unknown" || !errorCode) {
        setClassificationError("Kết quả phân loại chưa rõ. Hãy thử lại cùng yêu cầu này.");
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn thanh toán. Hãy thử lại.");
      }
    } finally {
      if (mutation === classificationMutationRef.current && viewKey === currentViewKeyRef.current) setClassificationBusy(false);
    }
  };

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
      void loadPayments(debouncedQuery, statusFilter, operationalScope, page);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể hoàn tất đơn thanh toán."));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleReconcilePayerSource = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const result = await adminReconcilePaymentOrderPayerSource(orderId);
      const reconciledPayment = items.find((payment) => payment.orderId === result.orderId);
      setItems((currentItems) =>
        currentItems.map((payment) => (payment.orderId === result.orderId ? { ...payment, payer: result.payer } : payment)),
      );
      if (reconciledPayment && result.payer.source === "reconciliation") {
        setEvidencePayment({ ...reconciledPayment, payer: result.payer });
      }
      toast.success(`Đối chiếu xong: ${PAYER_SOURCE_LABELS[result.payer.classification]}.`, {
        description: getPayerEvidenceDescription(result.payer),
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể đối chiếu nguồn tiền từ PayOS."));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    const headers = ["Mã đơn", "User", "Gói", "Số tiền", "Trạng thái", "Provider", "Ngày tạo"];
    const rows = items.map((p) => [
      p.orderId,
      getPaymentOwnerLabel(p),
      p.planCode,
      String(p.amount),
      PAYMENT_STATUS_LABELS[p.status] ?? p.status,
      p.provider,
      formatDate(p.createdAt),
    ]);
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Đã xuất ${items.length} đơn thanh toán.`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Thanh toán tự động"
        description="Đối chiếu các giao dịch Plus được webhook ghi nhận, mở Plus thủ công khi cần khôi phục."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
              disabled={loading || items.length === 0}
              onClick={handleExportCsv}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
              disabled={loading}
              onClick={() => void loadPayments(debouncedQuery, statusFilter, operationalScope, page)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tải lại
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          <p className="font-semibold">Không tải được dữ liệu</p>
          <p className="mt-1 leading-6 text-rose-100/80">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            onClick={() => void loadPayments(debouncedQuery, statusFilter, operationalScope, page)}
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
              onClick={() => {
                resetToFirstPage();
                setStatusFilter(status);
              }}
              className={`rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-app-accent/40 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="w-full sm:w-56">
        <AdminOperationalScopeFilter
          value={operationalScope}
          onChange={(scope) => {
            resetToFirstPage();
            setOperationalScope(scope);
          }}
        />
      </div>

      <p className="text-sm text-app-ink-muted">
        Hiển thị {items.length.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")} đơn. Chỉ bấm{" "}
        <span className="text-app-ink-soft">Mở Plus thủ công</span> sau khi đối chiếu trong cổng thanh toán hoặc app ngân
        hàng.
        {query ? <span className="ml-1 text-app-ink-muted">Đang lọc theo "{query}".</span> : null}
      </p>

      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-app-ink-muted" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={CreditCard}
          title="Không có đơn thanh toán phù hợp"
          description="Thử thay đổi bộ lọc hoặc xoá từ khoá tìm kiếm trên thanh tiêu đề."
        />
      ) : (
        <Table
          containerClassName="rounded-[var(--r-card)] border-app-line bg-app-surface shadow-none"
          className="text-app-ink-soft"
        >
          <TableHeader className="sticky top-0 bg-app-bg-subtle text-app-ink-soft [&_tr]:border-b [&_tr]:border-app-line">
            <TableRow className="border-app-line hover:bg-transparent">
              <TableHead className="text-app-ink-muted">Mã đơn</TableHead>
              <TableHead className="text-app-ink-muted">Người dùng</TableHead>
              <TableHead className="text-app-ink-muted">Số tiền</TableHead>
              <TableHead className="text-app-ink-muted">Trạng thái</TableHead>
              <TableHead className="text-app-ink-muted">Phân loại</TableHead>
              <TableHead className="text-app-ink-muted">Nguồn tiền</TableHead>
              <TableHead className="text-app-ink-muted">Tạo lúc</TableHead>
              <TableHead className="text-right text-app-ink-muted">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/10">
            {items.map((payment) => {
              const canComplete =
                payment.status === "pending" || payment.status === "expired" || payment.status === "failed";
              const canReconcilePayerSource = payment.status === "completed" && payment.provider.toLowerCase() === "payos";
              const payerSource = payment.payer?.classification ?? "unknown";
              const payerIdentityLabel = getPayerIdentityLabel(payment);
              return (
                <TableRow key={payment.orderId} className="border-app-line hover:bg-app-bg-subtle">
                  <TableCell className="font-mono text-xs text-app-ink">
                    <p>{payment.orderId}</p>
                    {payment.cassoTransactionId ? (
                      <p className="mt-1 truncate text-xs text-app-ink-muted">TX: {payment.cassoTransactionId}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-app-ink-soft">
                    <p className="truncate text-sm font-medium">{getPaymentOwnerLabel(payment)}</p>
                    <p className="mt-0.5 truncate text-xs text-app-ink-muted">{payment.userId}</p>
                  </TableCell>
                  <TableCell className="text-app-ink-soft">
                    <p className="font-semibold text-app-ink">{formatVnd(payment.amount)}</p>
                    <p className="mt-0.5 text-xs text-app-ink-muted">{payment.bankName ?? "Nhà cung cấp thanh toán"}</p>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge tone={PAYMENT_STATUS_TONES[payment.status]}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </AdminStatusBadge>
                    {payment.manualCompletedBy ? (
                      <p className="mt-2 text-xs text-app-ink-muted">Manual: {payment.manualCompletedBy}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <AdminOperationalClassificationBadge classification={payment.operationalClassification} />
                    <p className="mt-1 text-xs text-app-ink-muted">
                      {getAdminOperationalClassificationSourceLabel(payment.operationalClassification.source)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className={`text-xs font-semibold ${PAYER_SOURCE_CLASS_NAMES[payerSource]}`}>
                      {PAYER_SOURCE_LABELS[payerSource]}
                    </p>
                    {payerIdentityLabel ? <p className="mt-1 text-xs text-app-ink-muted">{payerIdentityLabel}</p> : null}
                    {payment.payer?.bankName ? (
                      <p className="mt-1 text-xs text-app-ink-muted">{payment.payer.bankName}</p>
                    ) : null}
                    {payment.payer?.source === "reconciliation" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 border-app-line bg-app-surface text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
                        onClick={() => setEvidencePayment(payment)}
                      >
                        Xem chứng cứ
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-app-ink-muted">{formatDate(payment.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canComplete ? (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-app-accent text-app-ink hover:bg-app-accent-hover"
                          disabled={busyOrderId === payment.orderId}
                          onClick={() => handleManualComplete(payment.orderId)}
                        >
                          {busyOrderId === payment.orderId ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Mở Plus thủ công
                        </Button>
                      ) : null}
                      {canReconcilePayerSource ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
                          disabled={busyOrderId === payment.orderId}
                          onClick={() => void handleReconcilePayerSource(payment.orderId)}
                        >
                          {busyOrderId === payment.orderId ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Đối chiếu PayOS
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
                        disabled={classificationBusy}
                        onClick={() => openClassification(payment)}
                      >
                        Phân loại dữ liệu
                      </Button>
                      {!canComplete && !canReconcilePayerSource ? (
                        <span className="text-xs text-app-ink-muted">Đã xử lý</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2" aria-label="Phân trang thanh toán">
          <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>
            Trang trước
          </Button>
          <span className="text-sm text-app-ink-muted">Trang {page}/{totalPages}</span>
          <Button type="button" variant="outline" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)}>
            Trang sau
          </Button>
        </div>
      ) : null}

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
              Đơn <span className="font-mono">{pendingOrderId ?? "—"}</span> sẽ được đánh dấu đã nhận tiền. Chỉ xác nhận
              sau khi đã đối chiếu số tiền trong cổng thanh toán/app ngân hàng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <label htmlFor="manual-payment-note" className="text-sm font-medium text-app-ink-muted">
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

      <AdminOperationalClassificationDialog
        open={classificationPayment !== null}
        targetType="payment_order"
        targetLabel={classificationPayment?.orderId ?? "đơn thanh toán"}
        initialCategory={classificationPayment?.operationalClassification.effectiveCategory ?? "real"}
        initialReason={getEditableOperationalReason(classificationPayment?.operationalClassification.reason)}
        initialNote={classificationPayment?.operationalClassification.note}
        pending={classificationBusy}
        error={classificationError}
        disableRealCategory={
          classificationPayment?.operationalClassification.source === "user"
          && classificationPayment.operationalClassification.effectiveCategory !== "real"
        }
        disabledRealCategoryReason="Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng."
        onOpenChange={(open) => {
          if (!open && !classificationBusy) {
            classificationMutationRef.current += 1;
            classificationRequestRef.current = null;
            setClassificationPayment(null);
            setClassificationError(undefined);
          }
        }}
        onConfirm={handleClassification}
      />

      <AdminPaymentPayerEvidenceDialog
        open={evidencePayment !== null}
        payer={evidencePayment?.payer ?? null}
        onOpenChange={(open) => !open && setEvidencePayment(null)}
      />
    </div>
  );
}

export default AdminPaymentsPage;
