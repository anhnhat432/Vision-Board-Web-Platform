import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Package, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  adminGetOrders,
  adminUpdateOrderStatus,
  type ApiOrder,
  type ApiOrderStatus,
} from "@/services/orderService";

// Mirror backend ADMIN_STATUS_TRANSITIONS so the UI only offers valid actions.
const ADMIN_STATUS_TRANSITIONS: Record<ApiOrderStatus, ApiOrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["printing", "cancelled"],
  printing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_LABELS: Record<ApiOrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  printing: "Đang in",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

const STATUS_COLORS: Record<ApiOrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-sky-200 bg-sky-50 text-sky-800",
  printing: "border-violet-200 bg-violet-50 text-violet-800",
  shipping: "border-blue-200 bg-blue-50 text-blue-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
};

function ActionButton({
  label,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  variant: "default" | "destructive" | "outline";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant={variant} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
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
  if (allowed.length === 0) return <span className="text-xs text-slate-400">Không có hành động</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed
        .filter((s) => s !== "cancelled")
        .map((nextStatus) => (
          <ActionButton
            key={nextStatus}
            label={STATUS_LABELS[nextStatus]}
            variant="outline"
            disabled={busy}
            onClick={() => onTransition(order.id, nextStatus)}
          />
        ))}
      {allowed.includes("cancelled") && (
        <ActionButton
          label="Huỷ đơn"
          variant="destructive"
          disabled={busy}
          onClick={() => onTransition(order.id, "cancelled")}
        />
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const { user, userProfile, authLoading } = useAuthContext();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    adminGetOrders()
      .then((data) => {
        setOrders(data);
      })
      .catch((err: unknown) => {
        const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Không thể tải danh sách đơn.";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authLoading, user, isAdmin]);

  const handleTransition = (orderId: string, nextStatus: ApiOrderStatus) => {
    setBusyOrderId(orderId);

    adminUpdateOrderStatus(orderId, { status: nextStatus })
      .then((updated) => {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        toast.success(`Đơn ${orderId.slice(-6)} → ${STATUS_LABELS[nextStatus]}`);
      })
      .catch((err: unknown) => {
        const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Cập nhật thất bại.";
        toast.error(message);
      })
      .finally(() => {
        setBusyOrderId(null);
      });
  };

  // --- Access control ---

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8 pb-12">
        <Card className="border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
          <CardContent className="p-10 text-center lg:p-14">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-400" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Yêu cầu đăng nhập</h1>
            <p className="mt-3 text-base text-slate-500">Bạn cần đăng nhập để truy cập trang quản trị.</p>
            <Button className="mt-6" onClick={() => navigate("/login")}>
              Đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile still bootstrapping — wait before deciding admin access
  if (!userProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-8 pb-12">
        <Card className="border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
          <CardContent className="p-10 text-center lg:p-14">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Không có quyền truy cập</h1>
            <p className="mt-3 text-base text-slate-500">Trang này chỉ dành cho quản trị viên.</p>
            <Button className="mt-6" variant="outline" onClick={() => navigate("/")}>
              Quay về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Loading / Error ---

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 pb-12">
        <Card className="border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
          <CardContent className="p-10 text-center lg:p-14">
            <p className="text-base text-rose-600">{error}</p>
            <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main content ---

  return (
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
              <Package className="h-4 w-4" />
              Quản trị đơn hàng
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Danh sách đơn hàng</h1>
            <p className="max-w-3xl text-base leading-8 text-white/82">
              {orders.length} đơn hàng. Chọn hành động để chuyển trạng thái.
            </p>
          </div>
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <Card className="border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
          <CardContent className="p-10 text-center lg:p-14">
            <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-6 text-xl font-semibold text-slate-900">Chưa có đơn hàng nào</h2>
            <p className="mt-3 text-sm text-slate-500">Đơn hàng từ người dùng sẽ xuất hiện ở đây khi có.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-0 shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {order.fullName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {order.email} · {order.phone || "—"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mã đơn</span>
                    <p className="mt-0.5 font-mono text-xs text-slate-600">{order.id}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loại kit</span>
                    <p className="mt-0.5 text-slate-700">{order.kitType}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ngày tạo</span>
                    <p className="mt-0.5 text-slate-700">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mục tiêu</span>
                    <p className="mt-0.5 text-slate-700 truncate">
                      {order.goalSnapshot?.title ?? "Không gắn mục tiêu"}
                    </p>
                  </div>
                </div>

                {order.note && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ghi chú</p>
                    <p className="mt-1 text-sm text-slate-600">{order.note}</p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <OrderActions
                    order={order}
                    busy={busyOrderId === order.id}
                    onTransition={handleTransition}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
