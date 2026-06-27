import { ClipboardList, Download, Loader2, Pencil, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type AdminUpdateOrderPayload, type ApiOrder, type ApiOrderStatus, adminGetOrders, adminUpdateOrder, adminUpdateOrderStatus } from "@/services/orderService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { ADMIN_STATUS_TRANSITIONS, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../components/admin/statusMappings";
import { adminInput, adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, formatVnd, getErrorMessage, withTimeout } from "../components/admin/utils";
import { downloadCsv } from "../components/admin/csvExport";
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

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus | "all">("all");
  const [frameFilter, setFrameFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const handleSearchChange = useCallback((next: string) => setQuery(next), []);
  useAdminSearch(query, handleSearchChange, "Tìm email, mã đơn, họ tên, số điện thoại");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(
        adminGetOrders(),
        ADMIN_LOAD_TIMEOUT_MS,
        "Máy chủ phản hồi quá lâu. Render có thể đang cold start; hãy thử lại sau vài giây.",
      );
      setOrders(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách đơn in."));
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
    void loadOrders();
  }, [authLoading, isAdmin, loadOrders, user, userProfileLoading]);

  const handleTransition = (orderId: string, nextStatus: ApiOrderStatus) => {
    setBusyOrderId(orderId);

    adminUpdateOrderStatus(orderId, { status: nextStatus })
      .then((updated) => {
        setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
        toast.success(`Đơn ${orderId.slice(-6)} -> ${ORDER_STATUS_LABELS[nextStatus]}`);
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err, "Cập nhật thất bại."));
      })
      .finally(() => {
        setBusyOrderId(null);
      });
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
      const updated = await adminUpdateOrder(editOrder.id, payload);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(`Đã cập nhật đơn ${editOrder.id.slice(-6)}.`);
      setEditOrder(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật đơn hàng."));
    } finally {
      setEditSaving(false);
    }
  };

  const frameOptions = useMemo(() => {
    const labels = new Set<string>();
    orders.forEach((order) => {
      const frame = order.lines?.find((line) => line.type === "frame")?.label ?? order.kitType;
      if (frame) labels.add(frame);
    });
    return Array.from(labels).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      const orderFrame = order.lines?.find((line) => line.type === "frame")?.label ?? order.kitType ?? "";
      if (frameFilter !== "all" && orderFrame !== frameFilter) return false;

      if (dateFrom || dateTo) {
        const orderTime = new Date(order.createdAt).getTime();
        if (fromMs && orderTime < fromMs) return false;
        if (toMs && orderTime > toMs) return false;
      }

      if (normalisedQuery.length === 0) return true;
      const haystack = [order.id, order.email ?? "", order.fullName ?? "", order.phone ?? ""].join("\n").toLowerCase();
      return haystack.includes(normalisedQuery);
    });
  }, [dateFrom, dateTo, frameFilter, orders, query, statusFilter]);

  const counts = useMemo(() => {
    const totals: Record<ApiOrderStatus | "all", number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      printing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((order) => {
      totals[order.status] += 1;
    });
    return totals;
  }, [orders]);

  const handleExportCsv = () => {
    const data = filteredOrders;
    if (data.length === 0) {
      toast.info("Không có dữ liệu để xuất.");
      return;
    }
    const headers = ["Mã đơn", "Họ tên", "Email", "SĐT", "Trạng thái", "Khung", "Set ảnh", "Tổng tiền", "Địa chỉ", "Ngày tạo", "Mục tiêu"];
    const rows = data.map((o) => {
      const frame = o.lines?.find((l) => l.type === "frame")?.label ?? o.kitType ?? "";
      const themes = o.lines?.filter((l) => l.type === "theme").map((l) => l.label).join("; ") ?? "";
      const addr = o.shippingAddress ? [o.shippingAddress.line1, o.shippingAddress.line2, o.shippingAddress.city].filter(Boolean).join(", ") : "";
      return [
        o.id,
        o.fullName,
        o.email ?? "",
        o.phone ?? "",
        ORDER_STATUS_LABELS[o.status],
        frame,
        themes,
        o.totalVnd != null ? String(o.totalVnd) : "",
        addr,
        formatDate(o.createdAt),
        o.goalSnapshot?.title ?? "",
      ];
    });
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Đã xuất ${data.length} đơn hàng.`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
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
        const updated = await adminUpdateOrderStatus(orderId, { status });
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        done++;
      } catch {
        failed++;
      }
    }
    setSelectedIds(new Set());
    setBulkBusy(false);
    if (failed > 0) {
      toast.warning(`Đã cập nhật ${done} đơn, ${failed} đơn thất bại.`);
    } else {
      toast.success(`Đã chuyển ${done} đơn sang "${ORDER_STATUS_LABELS[status]}".`);
    }
  };

  // Báo lên sidebar số đơn in đang chờ xác nhận để hiển thị badge.
  useEffect(() => {
    setOrdersPending(counts.pending || undefined);
    return () => setOrdersPending(undefined);
  }, [counts.pending, setOrdersPending]);

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
              disabled={loading || filteredOrders.length === 0}
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
              onClick={() => void loadOrders()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tải lại
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-5 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="font-semibold text-rose-700 dark:text-rose-200">Không tải được đơn in</p>
          <p className="mt-1 leading-6 text-rose-600 dark:text-rose-100/80">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-xl border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            onClick={() => void loadOrders()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApiOrderStatus | "all")}>
          <SelectTrigger className={adminInput}>
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
        <Select value={frameFilter} onValueChange={(value) => setFrameFilter(value)}>
          <SelectTrigger className={adminInput}>
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
        <div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={adminInput}
            placeholder="Từ ngày"
            aria-label="Lọc từ ngày"
          />
        </div>
        <div>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={adminInput}
            placeholder="Đến ngày"
            aria-label="Lọc đến ngày"
          />
        </div>
      </div>

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
              onClick={() => setStatusFilter(status)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
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

      {/* Bulk Actions Bar */}
      {!loading && filteredOrders.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-card)] border border-app-line/60 bg-app-bg-subtle/50 px-4 py-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-app-line-strong text-app-accent accent-app-accent"
              checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs text-app-ink-soft">
              {selectedIds.size > 0 ? `Đã chọn ${selectedIds.size}/${filteredOrders.length}` : "Chọn tất cả"}
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
          {bulkBusy ? <Loader2 className="ml-2 h-4 w-4 animate-spin text-app-ink-muted" /> : null}
        </div>
      ) : null}

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
      ) : filteredOrders.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardList}
          title={orders.length === 0 ? "Chưa có đơn hàng nào" : "Không tìm thấy đơn phù hợp"}
          description={
            orders.length === 0
              ? "Đơn hàng từ người dùng sẽ xuất hiện ở đây khi có."
              : "Thử bỏ bộ lọc hoặc thay đổi từ khóa tìm kiếm."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map((order) => {
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
                      className="h-4 w-4 rounded border-app-line-strong text-app-accent accent-app-accent shrink-0 mt-0.5"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                    />
                    <Link to={`/admin/orders/${order.id}`} className="min-w-0 flex items-center gap-3 group">
                      {/* Avatar circle */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent-soft to-app-bg-subtle text-xs font-bold text-app-accent transition-transform duration-150 group-hover:scale-105">
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
                  <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </AdminStatusBadge>
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
                </div>

                {order.note ? (
                  <div className="mt-4 rounded-xl border border-app-line/60 bg-app-bg-subtle/50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">Ghi chú KH</p>
                    <p className="mt-1 text-sm leading-6 text-app-ink-soft">{order.note}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between border-t border-app-line/60 pt-4">
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
                  <OrderActions order={order} busy={busyOrderId === order.id} onTransition={handleTransition} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
    </div>
  );
}

export default AdminOrdersPage;
