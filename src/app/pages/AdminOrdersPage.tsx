import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  adminCompletePaymentOrderManually,
  adminGetOverview,
  adminListPaymentOrders,
  adminSendExpiringBillingReminders,
  type AdminOverview,
  type AdminPaymentOrderSummary,
  type AdminUserSummary,
} from "@/services/adminService";
import {
  adminGetOrders,
  adminUpdateOrderStatus,
  type ApiOrder,
  type ApiOrderStatus,
} from "@/services/orderService";

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
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<ApiOrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-sky-200 bg-sky-50 text-sky-800",
  printing: "border-violet-200 bg-violet-50 text-violet-800",
  shipping: "border-blue-200 bg-blue-50 text-blue-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
};

const PAYMENT_STATUS_COLORS: Record<AdminPaymentOrderSummary["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
};
const PAYMENT_STATUS_LABELS: Record<AdminPaymentOrderSummary["status"], string> = {
  pending: "Chờ xác nhận",
  completed: "Đã mở Plus",
  expired: "Hết hạn",
  failed: "Thất bại",
};
const PAYMENT_STATUS_FILTERS: Array<AdminPaymentOrderSummary["status"] | "all"> = [
  "all",
  "pending",
  "completed",
  "expired",
  "failed",
];
const ADMIN_LOAD_TIMEOUT_MS = 18_000;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "Chưa có";
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

function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-0 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.22)]">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
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
        .filter((status) => status !== "cancelled")
        .map((nextStatus) => (
          <Button
            key={nextStatus}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onTransition(order.id, nextStatus)}
          >
            {STATUS_LABELS[nextStatus]}
          </Button>
        ))}
      {allowed.includes("cancelled") ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => onTransition(order.id, "cancelled")}
        >
          Hủy đơn
        </Button>
      ) : null}
    </div>
  );
}

function RecentPaymentList({
  busyOrderId,
  onManualComplete,
  payments,
}: {
  busyOrderId: string | null;
  onManualComplete: (orderId: string) => void;
  payments: AdminPaymentOrderSummary[];
}) {
  if (payments.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có đơn thanh toán VietQR.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {payments.map((payment) => (
        <div key={payment.orderId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-slate-900">{payment.orderId}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatVnd(payment.amount)} · {formatDate(payment.completedAt ?? payment.createdAt)}
            </p>
          </div>
          <Badge variant="outline" className={PAYMENT_STATUS_COLORS[payment.status]}>
            {PAYMENT_STATUS_LABELS[payment.status]}
          </Badge>
          {payment.status === "pending" || payment.status === "expired" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={busyOrderId === payment.orderId}
              onClick={() => onManualComplete(payment.orderId)}
            >
              {busyOrderId === payment.orderId ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Đã nhận tiền
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getPaymentOwnerLabel(payment: AdminPaymentOrderSummary): string {
  return payment.user?.email || payment.user?.displayName || payment.userId;
}

function PaymentRecoveryPanel({
  busyOrderId,
  loading,
  onManualComplete,
  onRefresh,
  onSearch,
  payments,
  query,
  status,
  total,
}: {
  busyOrderId: string | null;
  loading: boolean;
  onManualComplete: (orderId: string) => void;
  onRefresh: () => void;
  onSearch: (query: string, status: AdminPaymentOrderSummary["status"] | "all") => void;
  payments: AdminPaymentOrderSummary[];
  query: string;
  status: AdminPaymentOrderSummary["status"] | "all";
  total: number;
}) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftStatus, setDraftStatus] = useState<AdminPaymentOrderSummary["status"] | "all">(status);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    setDraftStatus(status);
  }, [status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draftQuery, draftStatus);
  };

  return (
    <Card className="border-0 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Khôi phục thanh toán VietQR
            </CardTitle>
            <CardDescription>
              Dùng khi người dùng đã chuyển tiền nhưng Casso không match được nội dung chuyển khoản.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" className="rounded-full" disabled={loading} onClick={onRefresh}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Tải lại
          </Button>
        </div>

        <form className="grid gap-3 lg:grid-cols-[1fr_180px_auto]" onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-11"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Tìm order code, email, user id, mã giao dịch"
            />
          </div>
          <Select
            value={draftStatus}
            onValueChange={(value) => setDraftStatus(value as AdminPaymentOrderSummary["status"] | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUS_FILTERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "Tất cả" : PAYMENT_STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="rounded-full" disabled={loading}>
            Tìm
          </Button>
        </form>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>
            Hiển thị {payments.length.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")} đơn
          </span>
          <span>Chỉ bấm mở Plus sau khi đã đối chiếu số tiền trong app ngân hàng/Casso.</span>
        </div>

        {payments.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Không tìm thấy payment order phù hợp.</p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <div className="hidden grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_1fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid">
              <span>Order</span>
              <span>User</span>
              <span>Số tiền</span>
              <span>Trạng thái</span>
              <span className="text-right">Hành động</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {payments.map((payment) => {
                const canComplete = payment.status === "pending" || payment.status === "expired" || payment.status === "failed";
                return (
                  <div
                    key={payment.orderId}
                    className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_1fr] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-slate-950">{payment.orderId}</p>
                      <p className="mt-1 text-xs text-slate-500">Tạo: {formatDate(payment.createdAt)}</p>
                      {payment.cassoTransactionId ? (
                        <p className="mt-1 truncate text-xs text-slate-400">TX: {payment.cassoTransactionId}</p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{getPaymentOwnerLabel(payment)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{payment.userId}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{formatVnd(payment.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">{payment.bankName ?? "VietQR"}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className={PAYMENT_STATUS_COLORS[payment.status]}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                      {payment.manualCompletedBy ? (
                        <p className="mt-2 text-xs text-slate-500">Manual: {payment.manualCompletedBy}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                      {canComplete ? (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full"
                          disabled={busyOrderId === payment.orderId}
                          onClick={() => onManualComplete(payment.orderId)}
                        >
                          {busyOrderId === payment.orderId ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Mở Plus thủ công
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">Đã xử lý</span>
                      )}
                    </div>
                    {payment.manualCompletionNote ? (
                      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500 lg:col-span-5">
                        Ghi chú: {payment.manualCompletionNote}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentUserList({ users }: { users: AdminUserSummary[] }) {
  if (users.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có user.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {users.map((user) => (
        <div key={user.firebaseUid} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user.displayName || user.email}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              {user.subscription?.planCode ?? "FREE"}
            </Badge>
            <p className="mt-1 text-xs text-slate-400">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const {
    authLoading,
    refreshUserProfile,
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
  } = useAuthContext();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<AdminPaymentOrderSummary[]>([]);
  const [paymentOrdersTotal, setPaymentOrdersTotal] = useState(0);
  const [paymentOrdersQuery, setPaymentOrdersQuery] = useState("");
  const [paymentOrdersStatus, setPaymentOrdersStatus] = useState<AdminPaymentOrderSummary["status"] | "all">("all");
  const [paymentOrdersLoading, setPaymentOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [busyPaymentOrderId, setBusyPaymentOrderId] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  const isAdmin = userProfile?.role === "admin";

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, orderData] = await withTimeout(
        Promise.all([adminGetOverview(), adminGetOrders()]),
        ADMIN_LOAD_TIMEOUT_MS,
        "Backend admin phản hồi quá lâu. Render có thể đang cold start; hãy thử lại sau vài giây.",
      );
      setOverview(overviewData);
      setOrders(orderData);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải dữ liệu quản trị."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentOrders = useCallback(
    async (nextQuery: string, nextStatus: AdminPaymentOrderSummary["status"] | "all") => {
      setPaymentOrdersLoading(true);
      try {
        const result = await adminListPaymentOrders({
          q: nextQuery,
          status: nextStatus,
          limit: 50,
        });
        setPaymentOrders(result.items);
        setPaymentOrdersTotal(result.total);
      } catch (err) {
        toast.error(getErrorMessage(err, "Không thể tải danh sách thanh toán VietQR."));
      } finally {
        setPaymentOrdersLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (userProfileLoading) return;

    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    void loadAdminData();
    void loadPaymentOrders("", "all");
  }, [authLoading, isAdmin, loadAdminData, loadPaymentOrders, user, userProfileLoading]);

  const handlePaymentOrderSearch = (
    nextQuery: string,
    nextStatus: AdminPaymentOrderSummary["status"] | "all",
  ) => {
    setPaymentOrdersQuery(nextQuery);
    setPaymentOrdersStatus(nextStatus);
    void loadPaymentOrders(nextQuery, nextStatus);
  };

  const handlePaymentOrderRefresh = () => {
    void loadPaymentOrders(paymentOrdersQuery, paymentOrdersStatus);
  };

  const handleReminderRun = async () => {
    setReminderLoading(true);
    try {
      const result = await adminSendExpiringBillingReminders({ daysAhead: 7 });
      if (!result.configured) {
        toast.info(`Email chưa cấu hình: ${result.email.reason ?? result.email.provider}`);
        return;
      }

      toast.success(`Đã gửi ${result.sent} reminder, bỏ qua ${result.duplicate + result.skipped}.`);
      void loadAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi reminder lúc này."));
    } finally {
      setReminderLoading(false);
    }
  };

  const handleManualCompletePayment = async (orderId: string) => {
    const manualCompletionNote = window.prompt(
      `Ghi chú đối chiếu cho đơn ${orderId}`,
      "Đã đối chiếu giao dịch tiền vào trong Casso/app ngân hàng.",
    );
    if (manualCompletionNote === null) return;
    if (!window.confirm(`Đánh dấu đơn ${orderId} là đã nhận tiền và mở Plus?`)) return;

    setBusyPaymentOrderId(orderId);
    try {
      const result = await adminCompletePaymentOrderManually(orderId, { manualCompletionNote });
      toast.success(`Đã mở Plus cho đơn ${result.orderId}.`);
      void loadAdminData();
      void loadPaymentOrders(paymentOrdersQuery, paymentOrdersStatus);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể hoàn tất đơn thanh toán."));
    } finally {
      setBusyPaymentOrderId(null);
    }
  };

  const handleTransition = (orderId: string, nextStatus: ApiOrderStatus) => {
    setBusyOrderId(orderId);

    adminUpdateOrderStatus(orderId, { status: nextStatus })
      .then((updated) => {
        setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
        toast.success(`Đơn ${orderId.slice(-6)} -> ${STATUS_LABELS[nextStatus]}`);
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err, "Cập nhật thất bại."));
      })
      .finally(() => {
        setBusyOrderId(null);
      });
  };

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

  if (userProfileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="space-y-8 pb-12">
        <Card className="border-0 bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.28)]">
          <CardContent className="p-10 text-center lg:p-14">
            <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Không tải được quyền admin</h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
              {userProfileError ||
                "Backend chưa trả profile cho tài khoản này. Kiểm tra Render đã deploy, VITE_API_BASE_URL trỏ đúng backend và ADMIN_EMAILS có email admin."}
            </p>
            <Button className="mt-6" variant="outline" onClick={refreshUserProfile}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
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
            <Button className="mt-6" variant="outline" onClick={() => void loadAdminData()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = overview?.summary;

  return (
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <BarChart3 className="h-4 w-4" />
                Quản trị vận hành
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users, billing và đơn hàng</h1>
                <p className="mt-3 max-w-3xl text-base leading-8 text-white/82">
                  Theo dõi user, doanh thu VietQR, trạng thái email và xử lý đơn in từ một màn hình.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 rounded-full bg-white text-slate-900 hover:bg-white/92"
              disabled={reminderLoading}
              onClick={handleReminderRun}
            >
              {reminderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Gửi reminder 7 ngày
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Tổng user"
            value={summary.totalUsers.toLocaleString("vi-VN")}
            detail={`${summary.adminUsers} admin`}
          />
          <SummaryCard
            icon={CreditCard}
            label="Plus active"
            value={summary.activePlusSubscriptions.toLocaleString("vi-VN")}
            detail={`${summary.expiringSoonSubscriptions} gói sắp hết hạn 7 ngày`}
          />
          <SummaryCard
            icon={WalletCards}
            label="Doanh thu"
            value={formatVnd(summary.revenueTotalVnd)}
            detail={`${formatVnd(summary.revenueLast30DaysVnd)} trong 30 ngày`}
          />
          <SummaryCard
            icon={Package}
            label="Đơn thanh toán"
            value={summary.completedPaymentOrders.toLocaleString("vi-VN")}
            detail={`${summary.pendingPaymentOrders} đang chờ, ${summary.physicalOrders} đơn in`}
          />
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.2)]">
          <CardHeader>
            <CardTitle className="text-base">Thanh toán VietQR gần đây</CardTitle>
            <CardDescription>Các order Casso/VietQR mới nhất.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentPaymentList
              busyOrderId={busyPaymentOrderId}
              onManualComplete={handleManualCompletePayment}
              payments={overview?.recentPayments ?? []}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.2)]">
          <CardHeader>
            <CardTitle className="text-base">User mới</CardTitle>
            <CardDescription>Email provider: {overview?.email.configured ? "đã cấu hình" : "chưa cấu hình"}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentUserList users={overview?.recentUsers ?? []} />
          </CardContent>
        </Card>
      </section>

      <PaymentRecoveryPanel
        busyOrderId={busyPaymentOrderId}
        loading={paymentOrdersLoading}
        onManualComplete={handleManualCompletePayment}
        onRefresh={handlePaymentOrderRefresh}
        onSearch={handlePaymentOrderSearch}
        payments={paymentOrders}
        query={paymentOrdersQuery}
        status={paymentOrdersStatus}
        total={paymentOrdersTotal}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Đơn in vision board</h2>
          <p className="mt-1 text-sm text-slate-500">{orders.length} đơn. Chọn hành động để chuyển trạng thái.</p>
        </div>

        {orders.length === 0 ? (
          <Card className="border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
            <CardContent className="p-10 text-center lg:p-14">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-6 text-xl font-semibold text-slate-900">Chưa có đơn hàng nào</h3>
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
                      <CardTitle className="text-base font-semibold text-slate-900">{order.fullName}</CardTitle>
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
                      <p className="mt-0.5 truncate text-slate-700">
                        {order.goalSnapshot?.title ?? "Không gắn mục tiêu"}
                      </p>
                    </div>
                  </div>

                  {order.note ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ghi chú</p>
                      <p className="mt-1 text-sm text-slate-600">{order.note}</p>
                    </div>
                  ) : null}

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
      </section>
    </div>
  );
}
