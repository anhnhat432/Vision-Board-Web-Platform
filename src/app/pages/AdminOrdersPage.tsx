import { ClipboardList, Download, Loader2, Pencil, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type AdminApiOrder, type AdminOrderListResponse, type AdminUpdateOrderPayload, type ApiOrder, type ApiOrderStatus, adminClassifyPhysicalOrder, adminExportOrders, adminGetOrders, adminUpdateOrder, adminUpdateOrderStatus } from "@/services/orderService";
import type { AdminClassificationMutationPayload, AdminOperationalClassificationSummary, AdminOperationalScope } from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminOperationalScopeFilter } from "../components/admin/AdminOperationalScopeFilter";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { AdminToolbar } from "../components/admin/AdminToolbar";
import { ADMIN_STATUS_TRANSITIONS, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../components/admin/statusMappings";
import { adminInput, adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, formatVnd, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

const STATUS_FILTER_ORDER: Array<ApiOrderStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "printing",
  "shipping",
  "delivered",
  "cancelled",
];

type OrderListView = {
  query: string;
  statusFilter: ApiOrderStatus | "all";
  frameFilter: string;
  dateFrom: string;
  dateTo: string;
  operationalScope: AdminOperationalScope;
  page: number;
};

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "errorCode" in error
    ? String(error.errorCode)
    : undefined;
}

const DEFAULT_OPERATIONAL_CLASSIFICATION: AdminOperationalClassificationSummary = { effectiveCategory: "real", source: "default" };
function normalizeOrderOperationalClassification(order: AdminApiOrder): AdminApiOrder {
  return order.operationalClassification ? order : { ...order, operationalClassification: DEFAULT_OPERATIONAL_CLASSIFICATION };
}

function getEditableOperationalReason(
  reason: AdminOperationalClassificationSummary["reason"],
): AdminClassificationMutationPayload["reason"] | undefined {
  return reason === "legacy_sales_test" || reason === "legacy_sales_internal" ? undefined : reason;
}

function OrderActions({
  order,
  busy,
  onTransition,
}: {
  order: ApiOrder;
  busy: boolean;
  onTransition: (orderId: string, nextStatus: ApiOrderStatus) => void;
}) {
  const allowed = ADMIN_STATUS_TRANSITIONS[order.status] ?? [];
  if (allowed.length === 0) return <span className="text-xs text-app-ink-muted">Không có hành động</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed
        .filter((status) => status !== "cancelled")
        .map((nextStatus) => (
          <Button
            key={nextStatus}
            type="button"
            size="sm"
            variant="outline"
            className="border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            disabled={busy}
            onClick={() => onTransition(order.id, nextStatus)}
          >
            {ORDER_STATUS_LABELS[nextStatus]}
          </Button>
        ))}
      {allowed.includes("cancelled") ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
          disabled={busy}
          onClick={() => onTransition(order.id, "cancelled")}
        >
          Hủy đơn
        </Button>
      ) : null}
    </div>
  );
}

export function AdminOrdersPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";
  const { setOrdersPending } = useAdminPendingCounts();

  const [orders, setOrders] = useState<AdminApiOrder[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<ApiOrderStatus | "all", number>>({ all: 0, pending: 0, confirmed: 0, printing: 0, shipping: 0, delivered: 0, cancelled: 0 });
  const [frameOptions, setFrameOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus | "all">("all");
  const [frameFilter, setFrameFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [operationalScope, setOperationalScope] = useState<AdminOperationalScope>("real");
  const [page, setPage] = useState(1);
  const loadGeneration = useRef(0);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [classificationOrder, setClassificationOrder] = useState<AdminApiOrder | null>(null);
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState<string | undefined>();
  const classificationRequestRef = useRef<{ commandKey: string; requestId: string } | null>(null);
  const classificationMutationRef = useRef(0);
  const classificationViewKeyRef = useRef<string | null>(null);
  const currentViewKeyRef = useRef("");
  const currentViewRef = useRef<OrderListView>({
    query: "", statusFilter: "all", frameFilter: "all", dateFrom: "", dateTo: "", operationalScope: "real", page: 1,
  });

  // Edit dialog state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editOrder, setEditOrder] = useState<ApiOrder | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    note: string;
    adminNote: string;
  }>({
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    note: "",
    adminNote: "",
  });

  const resetListPosition = useCallback(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, []);
  const handleSearchChange = useCallback((next: string) => {
    resetListPosition();
    setQuery(next);
  }, [resetListPosition]);
  useAdminSearch(query, handleSearchChange, "Tìm email, mã đơn, họ tên, số điện thoại");
  const currentView: OrderListView = { query, statusFilter, frameFilter, dateFrom, dateTo, operationalScope, page };
  const viewKey = JSON.stringify(currentView);
  currentViewKeyRef.current = viewKey;
  currentViewRef.current = currentView;

  const loadOrders = useCallback(async (
    view = currentViewRef.current,
    requestViewKey = JSON.stringify(view),
  ) => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(
        adminGetOrders({ q: view.query, status: view.statusFilter, frame: view.frameFilter, dateFrom: view.dateFrom || undefined, dateTo: view.dateTo || undefined, operationalScope: view.operationalScope, page: view.page, limit: 30 }) as Promise<AdminOrderListResponse>,
        ADMIN_LOAD_TIMEOUT_MS,
        "Máy chủ phản hồi quá lâu. Render có thể đang cold start; hãy thử lại sau vài giây.",
      );
      if (generation !== loadGeneration.current || requestViewKey !== currentViewKeyRef.current) return;
      const boundedPages = Math.max(1, data.totalPages);
      if (view.page > boundedPages) {
        setPage(boundedPages);
        return;
      }
      setOrders(data.items.map(normalizeOrderOperationalClassification));
      setTotalPages(boundedPages);
      setStatusCounts(data.statusCounts);
      setFrameOptions(data.frameOptions);
    } catch (err) {
      if (generation === loadGeneration.current && requestViewKey === currentViewKeyRef.current) setError(getErrorMessage(err, "Không thể tải danh sách đơn in."));
    } finally {
      if (generation === loadGeneration.current && requestViewKey === currentViewKeyRef.current) setLoading(false);
    }
  }, []);

  // A classification dialog cannot outlive the server view it was opened from.
  useEffect(() => {
    if (classificationViewKeyRef.current === viewKey) return;
    classificationViewKeyRef.current = viewKey;
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationOrder(null);
    setClassificationBusy(false);
    setClassificationError(undefined);
  }, [viewKey]);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadOrders(currentViewRef.current, viewKey);
  }, [authLoading, isAdmin, loadOrders, user, userProfileLoading, viewKey]);

  const handleTransition = async (orderId: string, nextStatus: ApiOrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await adminUpdateOrderStatus(orderId, { status: nextStatus });
      await loadOrders();
      toast.success(`Đơn ${orderId.slice(-6)} -> ${ORDER_STATUS_LABELS[nextStatus]}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Cập nhật thất bại."));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleEditOpen = (order: ApiOrder) => {
    setEditOrder(order);
    setEditForm({
      fullName: order.fullName || "",
      email: order.email || "",
      phone: order.phone || "",
      line1: order.shippingAddress?.line1 || "",
      line2: order.shippingAddress?.line2 || "",
      city: order.shippingAddress?.city || "",
      note: order.note || "",
      adminNote: order.adminNote || "",
    });
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    setEditSaving(true);
    try {
      const payload: AdminUpdateOrderPayload = {
        fullName: editForm.fullName.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        shippingAddress: {
          line1: editForm.line1.trim(),
          line2: editForm.line2.trim() || undefined,
          city: editForm.city.trim(),
          country: "",
        },
        note: editForm.note.trim() || undefined,
        adminNote: editForm.adminNote.trim() || undefined,
      };
      await adminUpdateOrder(editOrder.id, payload);
      await loadOrders();
      toast.success(`Đã cập nhật đơn ${editOrder.id.slice(-6)}.`);
      setEditOrder(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật đơn hàng."));
    } finally {
      setEditSaving(false);
    }
  };

  const counts = statusCounts;

  const handleExportCsv = async () => {
    setExportBusy(true);
    setExportError(null);
    try {
      const exported = await adminExportOrders({
        q: query,
        status: statusFilter,
        frame: frameFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        operationalScope,
      });
      const url = URL.createObjectURL(exported.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.filename || `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(getErrorMessage(err, "Không thể xuất đơn hàng. Thử lại."));
    } finally {
      setExportBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBulkStatus = async (status: ApiOrderStatus) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    let done = 0;
    let failed = 0;
    const ids = [...selectedIds];
    for (const orderId of ids) {
      try {
        await adminUpdateOrderStatus(orderId, { status });
        done++;
      } catch {
        failed++;
      }
    }
    setSelectedIds(new Set());
    setBulkBusy(false);
    if (done > 0) await loadOrders();
    if (failed > 0) {
      toast.warning(`Đã cập nhật ${done} đơn, ${failed} đơn thất bại.`);
    } else {
      toast.success(`Đã chuyển ${done} đơn sang "${ORDER_STATUS_LABELS[status]}".`);
    }
  };

  const openClassification = (order: AdminApiOrder) => {
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationError(undefined);
    setClassificationOrder(order);
  };

  const handleClassification = async (payload: Omit<AdminClassificationMutationPayload, "requestId">) => {
    const order = classificationOrder;
    if (!order) return;
    if (order.operationalClassification.source === "user" && payload.category === "real") {
      setClassificationError("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.");
      return;
    }
    const commandKey = JSON.stringify({ id: order.id, ...payload, note: payload.note?.trim() || null });
    const current = classificationRequestRef.current;
    const requestId = current?.commandKey === commandKey ? current.requestId : crypto.randomUUID();
    const viewKey = currentViewKeyRef.current;
    classificationRequestRef.current = { commandKey, requestId };
    const mutation = ++classificationMutationRef.current;
    setClassificationBusy(true);
    setClassificationError(undefined);
    try {
      const result = await adminClassifyPhysicalOrder(order.id, { ...payload, requestId });
      if (mutation !== classificationMutationRef.current || classificationOrder?.id !== order.id || viewKey !== currentViewKeyRef.current) return;
      if (result.status === "updated" || result.status === "unchanged") {
        await loadOrders();
        if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
        classificationRequestRef.current = null;
        setClassificationOrder(null);
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn in. Hãy thử lại.");
      }
    } catch (err) {
      if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
      const errorCode = getErrorCode(err);
      if (errorCode === "admin_classification_request_conflict") {
        await loadOrders();
        if (mutation !== classificationMutationRef.current || viewKey !== currentViewKeyRef.current) return;
        setClassificationError("Dữ liệu đã thay đổi. Danh sách đã được tải lại.");
      } else if (errorCode === "admin_audit_commit_unknown" || !errorCode) {
        setClassificationError("Kết quả phân loại chưa rõ. Hãy thử lại cùng yêu cầu này.");
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn in. Hãy thử lại.");
      }
    } finally {
      if (mutation === classificationMutationRef.current && viewKey === currentViewKeyRef.current) setClassificationBusy(false);
    }
  };

  // Báo lên sidebar số đơn in đang chờ xác nhận để hiển thị badge.
  useEffect(() => {
    setOrdersPending(counts.pending || undefined);
    return () => setOrdersPending(undefined);
  }, [counts.pending, setOrdersPending]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    frameFilter !== "all" ||
    dateFrom.length > 0 ||
    dateTo.length > 0 ||
    operationalScope !== "real";
  const showSelectionBar = selectedIds.size > 0 || bulkBusy;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Đơn in vision board"
        description={`${counts.all.toLocaleString("vi-VN")} đơn · ${counts.pending} đang chờ xác nhận. Chuyển trạng thái sau khi đối chiếu thực tế.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
              disabled={loading || exportBusy}
              onClick={() => void handleExportCsv()}
            >
              <Download className="h-3.5 w-3.5" />
              {exportBusy ? "Đang xuất..." : "CSV"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
              disabled={loading}
              onClick={() => void loadOrders()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tải lại
            </Button>
          </div>
        }
      />

      <AdminToolbar
        label="Bộ lọc đơn in"
        meta={`${counts.all.toLocaleString("vi-VN")} đơn trong phạm vi hiện tại`}
      >
        <div className="relative w-full sm:max-w-md md:hidden">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Tìm kiếm đơn in"
            autoComplete="off"
            placeholder="Tìm email, mã đơn, họ tên, số điện thoại"
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            resetListPosition();
            setStatusFilter(value as ApiOrderStatus | "all");
          }}
        >
          <SelectTrigger className={adminInput} aria-label="Trạng thái đơn in">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all" ? "Tất cả trạng thái" : ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={frameFilter}
          onValueChange={(value) => {
            resetListPosition();
            setFrameFilter(value);
          }}
        >
          <SelectTrigger className={adminInput} aria-label="Khung">
            <SelectValue placeholder="Khung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khung</SelectItem>
            {frameOptions.map((frame) => (
              <SelectItem key={frame} value={frame}>
                {frame}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => {
            resetListPosition();
            setDateFrom(event.target.value);
          }}
          className={adminInput}
          aria-label="Lọc từ ngày"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => {
            resetListPosition();
            setDateTo(event.target.value);
          }}
          className={adminInput}
          aria-label="Lọc đến ngày"
        />
        <div className="w-full sm:w-56">
          <AdminOperationalScopeFilter
            value={operationalScope}
            onChange={(scope) => {
              resetListPosition();
              setOperationalScope(scope);
            }}
          />
        </div>
      </AdminToolbar>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
        {STATUS_FILTER_ORDER.map((status) => {
          const active = statusFilter === status;
          const label = status === "all" ? "Tất cả" : ORDER_STATUS_LABELS[status];
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                resetListPosition();
                setStatusFilter(status);
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 motion-reduce:transition-none ${
                active
                  ? "border-app-accent/40 bg-app-accent-soft text-app-accent shadow-sm"
                  : "border-app-line/60 bg-app-surface text-app-ink-soft hover:bg-app-accent-soft/50 hover:text-app-ink hover:border-app-accent/20"
              }`}
            >
              <span>{label}</span>
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${
                active ? "bg-app-accent/15 text-app-accent font-semibold" : "bg-app-bg-subtle text-app-ink-soft"
              }`}>
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={
            <div>
              <p className="font-semibold">Không tải được đơn in</p>
              <p className="mt-1 font-normal">{error}</p>
            </div>
          }
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void loadOrders()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {exportError ? (
        <AdminFeedbackBanner
          tone="error"
          summary={exportError}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportBusy}
              onClick={() => void handleExportCsv()}
            >
              Thử xuất lại
            </Button>
          }
          onDismiss={() => setExportError(null)}
          dismissLabel="Đóng lỗi xuất đơn in"
        />
      ) : null}

      {/* Bulk Actions Bar */}
      {showSelectionBar ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-card)] border border-app-line/60 bg-app-bg-subtle/50 px-4 py-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              aria-label="Chọn tất cả đơn trên trang"
              className="h-4 w-4 rounded border-app-line-strong text-app-accent accent-app-accent"
              checked={selectedIds.size === orders.length && orders.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs text-app-ink-soft">
              Đã chọn {selectedIds.size}/{orders.length}
            </span>
          </label>
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <span className="text-xs text-app-ink-muted mr-1">Chuyển sang:</span>
              {(["confirmed", "printing", "shipping", "delivered"] as ApiOrderStatus[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-app-line/60 bg-app-bg-subtle text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink"
                  disabled={bulkBusy}
                  onClick={() => void handleBulkStatus(status)}
                >
                  {ORDER_STATUS_LABELS[status]}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                disabled={bulkBusy}
                onClick={() => void handleBulkStatus("cancelled")}
              >
                Hủy đơn
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-app-ink-muted"
                onClick={() => setSelectedIds(new Set())}
              >
                Bỏ chọn
              </Button>
            </div>
          ) : null}
          {bulkBusy ? <Loader2 className="ml-2 h-4 w-4 animate-spin text-app-ink-muted motion-reduce:animate-none" /> : null}
        </div>
      ) : null}

      <AdminDataPanel
        title="Danh sách đơn in"
        description="Thông tin khách hàng, cấu hình đơn, phân loại và bước xử lý tiếp theo."
        busy={loading}
        contentClassName="p-3 sm:p-4"
      >
      {loading && orders.length === 0 ? (
        <ul className="space-y-3" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Đang tải danh sách đơn in...</span>
          {[0, 1, 2, 3].map((index) => (
            <li
              key={index}
              className={`${adminSurface.card} animate-pulse space-y-4 p-5 motion-reduce:animate-none motion-reduce:opacity-60`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-app-line pb-4">
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-app-accent-soft" />
                  <div className="h-3 w-56 rounded bg-app-accent-soft" />
                </div>
                <div className="h-6 w-24 rounded bg-app-accent-soft" />
              </div>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map((cell) => (
                  <div key={cell} className="space-y-2">
                    <div className="h-3 w-16 rounded bg-app-accent-soft" />
                    <div className="h-4 w-24 rounded bg-app-accent-soft" />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : orders.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardList}
          title={hasActiveFilters ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn hàng nào"}
          description={
            hasActiveFilters
              ? "Thử bỏ bộ lọc hoặc thay đổi từ khóa tìm kiếm."
              : "Đơn hàng từ người dùng sẽ xuất hiện ở đây khi có."
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const frameLabel = order.lines?.find((line) => line.type === "frame")?.label ?? order.kitType ?? "—";
            const themeLabels = order.lines?.filter((line) => line.type === "theme").map((l) => l.label) ?? [];
            const shippingAddr = order.shippingAddress;
            const addressText = shippingAddr
              ? [shippingAddr.line1, shippingAddr.line2, shippingAddr.city].filter(Boolean).join(", ")
              : "—";
            return (
              <li key={order.id} className={`${adminSurface.card} ${adminSurface.cardHover} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line/60 pb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Chọn đơn ${order.id}`}
                      className="h-4 w-4 rounded border-app-line-strong text-app-accent accent-app-accent shrink-0 mt-0.5"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                    />
                    <Link to={`/admin/orders/${order.id}`} className="min-w-0 flex items-center gap-3 group">
                      {/* Avatar circle */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-bg-subtle text-xs font-bold text-app-accent">
                        {(order.fullName || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-app-ink group-hover:text-app-accent transition-colors duration-150">{order.fullName}</p>
                        <p className="mt-0.5 text-xs text-app-ink-muted">
                          {order.email} · {order.phone || "—"}
                        </p>
                      </div>
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AdminOperationalClassificationBadge classification={order.operationalClassification} />
                    <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </AdminStatusBadge>
                  </div>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-7">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Mã đơn</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-app-ink-soft">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Khung</p>
                    <p className="mt-0.5 text-app-ink-soft">{frameLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Set ảnh</p>
                    <p className="mt-0.5 text-app-ink-soft text-xs leading-relaxed">
                      {themeLabels.length > 0 ? themeLabels.join(", ") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Tổng tiền</p>
                    <p className="mt-0.5 text-app-ink-soft font-medium">
                      {order.totalVnd ? formatVnd(order.totalVnd) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Địa chỉ</p>
                    <p className="mt-0.5 text-app-ink-soft text-xs leading-relaxed">{addressText}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Ngày tạo</p>
                    <p className="mt-0.5 text-app-ink-soft">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Mục tiêu</p>
                    <p className="mt-0.5 truncate text-app-ink-soft">
                      {order.goalSnapshot?.title ?? "Không gắn mục tiêu"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Phân loại</p>
                    <p className="mt-0.5 text-xs text-app-ink-soft">
                      {getAdminOperationalClassificationSourceLabel(order.operationalClassification.source)}
                    </p>
                  </div>
                </div>

                {order.note ? (
                  <div className="mt-4 rounded-xl border border-app-line/60 bg-app-bg-subtle/50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Ghi chú KH</p>
                    <p className="mt-1 text-sm leading-6 text-app-ink-soft">{order.note}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 border-t border-app-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-app-ink-muted hover:text-app-ink hover:bg-app-accent-soft"
                      onClick={() => handleEditOpen(order)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
                      disabled={classificationBusy}
                      onClick={() => openClassification(order)}
                    >
                      Phân loại dữ liệu
                    </Button>
                  </div>
                  <OrderActions order={order} busy={busyOrderId === order.id} onTransition={(id, status) => void handleTransition(id, status)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </AdminDataPanel>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          itemLabel="đơn in"
          onPageChange={(nextPage) => {
            setSelectedIds(new Set());
            setPage(nextPage);
          }}
        />
      ) : null}

      {/* Edit Order Dialog */}
      <Dialog open={editOrder !== null} onOpenChange={(open) => { if (!open) setEditOrder(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa thông tin đơn hàng</DialogTitle>
            <DialogDescription>
              Mã đơn: <span className="font-mono text-xs">{editOrder?.id}</span> · {editOrder?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fullName">Họ tên</Label>
                <Input
                  id="edit-fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Số điện thoại</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ giao hàng</Label>
              <Input
                placeholder="Địa chỉ (dòng 1)"
                value={editForm.line1}
                onChange={(e) => setEditForm((prev) => ({ ...prev, line1: e.target.value }))}
              />
              <Input
                className="mt-2"
                placeholder="Địa chỉ (dòng 2)"
                value={editForm.line2}
                onChange={(e) => setEditForm((prev) => ({ ...prev, line2: e.target.value }))}
              />
              <Input
                className="mt-2"
                placeholder="Thành phố"
                value={editForm.city}
                onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Ghi chú khách hàng</Label>
              <Textarea
                id="edit-note"
                rows={2}
                value={editForm.note}
                onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-adminNote">Ghi chú nội bộ (admin)</Label>
              <Textarea
                id="edit-adminNote"
                rows={2}
                value={editForm.adminNote}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminNote: e.target.value }))}
                placeholder="Ghi chú chỉ admin nhìn thấy..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOrder(null)}
              disabled={editSaving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={editSaving}
              onClick={() => void handleEditSave()}
            >
              {editSaving ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminOperationalClassificationDialog
        open={classificationOrder !== null}
        targetType="physical_order"
        targetLabel={classificationOrder?.id ?? "đơn in"}
        initialCategory={classificationOrder?.operationalClassification.effectiveCategory ?? "real"}
        initialReason={getEditableOperationalReason(classificationOrder?.operationalClassification.reason)}
        initialNote={classificationOrder?.operationalClassification.note}
        pending={classificationBusy}
        error={classificationError}
        disableRealCategory={
          classificationOrder?.operationalClassification.source === "user"
          && classificationOrder.operationalClassification.effectiveCategory !== "real"
        }
        disabledRealCategoryReason="Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng."
        onOpenChange={(open) => {
          if (!open && !classificationBusy) {
            classificationMutationRef.current += 1;
            classificationRequestRef.current = null;
            setClassificationOrder(null);
            setClassificationError(undefined);
          }
        }}
        onConfirm={handleClassification}
      />
    </div>
  );
}

export default AdminOrdersPage;
