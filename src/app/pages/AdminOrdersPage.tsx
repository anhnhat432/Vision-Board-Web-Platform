import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type ApiOrder, type ApiOrderStatus, adminGetOrders, adminUpdateOrderStatus } from "@/services/orderService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminPendingCounts } from "../components/admin/AdminPendingCountsContext";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { ADMIN_STATUS_TRANSITIONS, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../components/admin/statusMappings";
import { adminInput, adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

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
  if (allowed.length === 0) return <span className="text-xs text-slate-500">Không có hành động</span>;

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
            className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
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
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      const orderFrame = order.lines?.find((line) => line.type === "frame")?.label ?? order.kitType ?? "";
      if (frameFilter !== "all" && orderFrame !== frameFilter) return false;

      if (normalisedQuery.length === 0) return true;
      const haystack = [order.id, order.email ?? "", order.fullName ?? "", order.phone ?? ""].join("\n").toLowerCase();
      return haystack.includes(normalisedQuery);
    });
  }, [frameFilter, orders, query, statusFilter]);

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
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            disabled={loading}
            onClick={() => void loadOrders()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          <p className="font-semibold">Không tải được đơn in</p>
          <p className="mt-1 leading-6 text-rose-100/80">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={() => void loadOrders()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
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
              className={`inline-flex items-center gap-2 rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span>{label}</span>
              <span className="rounded-[var(--r-pill)] bg-white/10 px-1.5 text-xs tabular-nums text-slate-200">
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && orders.length === 0 ? (
        <ul className="space-y-3" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Đang tải danh sách đơn in...</span>
          {[0, 1, 2, 3].map((index) => (
            <li
              key={index}
              className={`${adminSurface.card} animate-pulse space-y-4 p-5 motion-reduce:animate-none motion-reduce:opacity-60`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-white/10" />
                  <div className="h-3 w-56 rounded bg-white/10" />
                </div>
                <div className="h-6 w-24 rounded bg-white/10" />
              </div>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map((cell) => (
                  <div key={cell} className="space-y-2">
                    <div className="h-3 w-16 rounded bg-white/10" />
                    <div className="h-4 w-24 rounded bg-white/10" />
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
            const themeCount = order.lines?.filter((line) => line.type === "theme").length ?? 0;
            return (
              <li key={order.id} className={`${adminSurface.card} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{order.fullName}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {order.email} · {order.phone || "—"}
                    </p>
                  </div>
                  <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </AdminStatusBadge>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mã đơn</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-200">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khung</p>
                    <p className="mt-0.5 text-slate-200">{frameLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số set ảnh</p>
                    <p className="mt-0.5 text-slate-200">{themeCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</p>
                    <p className="mt-0.5 text-slate-200">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mục tiêu</p>
                    <p className="mt-0.5 truncate text-slate-200">
                      {order.goalSnapshot?.title ?? "Không gắn mục tiêu"}
                    </p>
                  </div>
                </div>

                {order.note ? (
                  <div className="mt-4 rounded-[var(--r-control)] border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{order.note}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-end border-t border-white/10 pt-4">
                  <OrderActions order={order} busy={busyOrderId === order.id} onTransition={handleTransition} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AdminOrdersPage;
