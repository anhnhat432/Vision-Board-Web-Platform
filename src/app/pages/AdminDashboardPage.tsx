import {
  BarChart3,
  Bell,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  type AdminOverview,
  type AdminPaymentOrderSummary,
  type AdminReminderRunResult,
  type AdminUserSummary,
  adminGetOverview,
  adminSendExpiringBillingReminders,
} from "@/services/adminService";
import { type ApiOrder, adminGetOrders } from "@/services/orderService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from "../components/admin/statusMappings";
import { adminSurface } from "../components/admin/tokens";
import {
  ADMIN_LOAD_TIMEOUT_MS,
  formatDate,
  formatVnd,
  getErrorMessage,
  withTimeout,
} from "../components/admin/utils";
import { Button } from "../components/ui/button";

function StatSkeleton() {
  return (
    <div className={`${adminSurface.card} p-5`}>
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-app-accent-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-app-accent-soft" />
          <div className="h-6 w-20 animate-pulse rounded bg-app-accent-soft" />
          <div className="h-3 w-32 animate-pulse rounded bg-app-accent-soft" />
        </div>
      </div>
    </div>
  );
}

function ReminderBanner({
  loading,
  onRun,
  overview,
  result,
}: {
  loading: boolean;
  onRun: () => void;
  overview: AdminOverview | null;
  result: AdminReminderRunResult | null;
}) {
  const emailConfigured = overview?.email.configured ?? false;
  const expiringCount = overview?.summary.expiringSoonSubscriptions ?? 0;

  return (
    <div className="surface-raised relative overflow-hidden rounded-[var(--r-card)] p-5">
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-app-accent text-white shadow-app-sm">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-app-ink">
              Nhắc gia hạn Plus
            </p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">
              {expiringCount > 0
                ? `${expiringCount.toLocaleString("vi-VN")} gói Plus sẽ hết hạn trong 7 ngày.`
                : "Không có gói Plus nào sắp hết hạn trong 7 ngày."}{" "}
              Email:{" "}
              <span className="text-app-ink-soft">
                {emailConfigured
                  ? "đã cấu hình"
                  : (overview?.email.reason ?? "chưa cấu hình")}
              </span>
              .
            </p>
            {result ? (
              <p className="mt-2 text-xs leading-5 text-app-ink-muted">
                Lần chạy gần nhất: quét {result.scanned}, gửi {result.sent},
                trùng {result.duplicate}, bỏ qua {result.skipped}, lỗi{" "}
                {result.failed}.
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          className="gap-2 rounded-xl bg-app-accent text-white shadow-sm hover:bg-app-accent-hover hover:shadow-md transition-all duration-150"
          disabled={loading || !emailConfigured || expiringCount === 0}
          onClick={onRun}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Gửi email nhắc hạn
        </Button>
      </div>
    </div>
  );
}

function RecentPaymentList({
  payments,
}: {
  payments: AdminPaymentOrderSummary[];
}) {
  if (payments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-app-ink-muted">
        Chưa có đơn thanh toán tự động.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-app-line/60">
      {payments.slice(0, 5).map((payment) => (
        <li
          key={payment.orderId}
          className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-app-bg-subtle/30 -mx-2 px-2 rounded-lg"
        >
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-app-ink">
              {payment.orderId}
            </p>
            <p className="mt-1 text-xs text-app-ink-muted">
              {formatVnd(payment.amount)} ·{" "}
              {formatDate(payment.completedAt ?? payment.createdAt)}
            </p>
          </div>
          <AdminStatusBadge tone={PAYMENT_STATUS_TONES[payment.status]}>
            {PAYMENT_STATUS_LABELS[payment.status]}
          </AdminStatusBadge>
        </li>
      ))}
    </ul>
  );
}

function RecentUserList({ users }: { users: AdminUserSummary[] }) {
  if (users.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-app-ink-muted">
        Chưa có người dùng mới.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-app-line/60">
      {users.slice(0, 5).map((user) => (
        <li
          key={user.firebaseUid}
          className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-app-bg-subtle/30 -mx-2 px-2 rounded-lg"
        >
          <div className="min-w-0 flex items-center gap-3">
            {/* Avatar placeholder */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-tile)] border border-app-line bg-app-surface text-xs font-bold text-app-accent">
              {(user.displayName || user.email || "?")
                .charAt(0)
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-ink">
                {user.displayName || user.email}
              </p>
              <p className="truncate text-xs text-app-ink-muted">
                {user.email}
              </p>
            </div>
          </div>
          <span className="text-right text-xs text-app-ink-muted">
            {user.role === "admin" ? "Admin" : "User"}
            {user.subscription ? (
              <span className="ml-1 text-app-accent font-medium">· Plus</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecentOrdersPreview({
  orders,
  onSeeAll,
}: {
  orders: ApiOrder[];
  onSeeAll: () => void;
}) {
  return (
    <div className={`${adminSurface.card} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-app-ink">
            Đơn in mới nhất
          </p>
          <p className="text-xs text-app-ink-muted">5 đơn gần đây nhất.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-app-accent hover:bg-app-accent-soft hover:text-app-accent rounded-lg font-medium"
          onClick={onSeeAll}
        >
          Xem tất cả
          <span aria-hidden="true">→</span>
        </Button>
      </div>
      {orders.length === 0 ? (
        <p className="py-4 text-center text-sm text-app-ink-muted">
          Chưa có đơn in nào.
        </p>
      ) : (
        <ul className="divide-y divide-app-line/60">
          {orders.slice(0, 5).map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-app-bg-subtle/30 -mx-2 px-2 rounded-lg"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-ink">
                  {order.fullName}
                </p>
                <p className="mt-1 truncate text-xs text-app-ink-muted">
                  {order.email} · {formatDate(order.createdAt)}
                </p>
              </div>
              <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </AdminStatusBadge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { authLoading, user, userProfile, userProfileLoading } =
    useAuthContext();
  const isAdmin = userProfile?.role === "admin";

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] =
    useState<AdminReminderRunResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, orderData] = await withTimeout(
        Promise.all([adminGetOverview(), adminGetOrders()]),
        ADMIN_LOAD_TIMEOUT_MS,
        "Máy chủ quản trị phản hồi quá lâu. Render có thể đang cold start; hãy thử lại sau vài giây.",
      );
      setOverview(overviewData);
      setOrders(orderData);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải dữ liệu quản trị."));
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
    void loadData();
  }, [authLoading, isAdmin, loadData, user, userProfileLoading]);

  const handleReminderRun = async () => {
    setReminderLoading(true);
    try {
      const result = await adminSendExpiringBillingReminders({ daysAhead: 7 });
      setReminderResult(result);
      if (!result.configured) {
        toast.info(
          `Email chưa cấu hình: ${result.email.reason ?? result.email.provider}`,
        );
        return;
      }
      toast.success(
        `Đã gửi ${result.sent} lời nhắc, bỏ qua ${result.duplicate + result.skipped}.`,
      );
      void loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi lời nhắc lúc này."));
    } finally {
      setReminderLoading(false);
    }
  };

  const summary = overview?.summary;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tổng quan vận hành"
        description="Theo dõi nhanh user, doanh thu Plus, đơn thanh toán và đơn in từ một màn hình."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink transition-colors duration-150"
            disabled={loading}
            onClick={() => void loadData()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-5 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="font-semibold text-rose-700 dark:text-rose-200">
            Không tải được dữ liệu
          </p>
          <p className="mt-1 leading-6 text-rose-600 dark:text-rose-100/80">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-xl border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            onClick={() => void loadData()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      {loading && !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Users}
            label="Tổng người dùng"
            value={summary.totalUsers.toLocaleString("vi-VN")}
            detail={`${summary.adminUsers} admin`}
            accent="users"
          />
          <AdminStatCard
            icon={CreditCard}
            label="Plus đang dùng"
            value={summary.activePlusSubscriptions.toLocaleString("vi-VN")}
            detail={`${summary.expiringSoonSubscriptions} gói sắp hết hạn 7 ngày`}
            accent="plus"
          />
          <AdminStatCard
            icon={WalletCards}
            label="Doanh thu"
            value={formatVnd(summary.revenueTotalVnd)}
            detail={`${formatVnd(summary.revenueLast30DaysVnd)} trong 30 ngày`}
            accent="revenue"
          />
          <AdminStatCard
            icon={Package}
            label="Đơn thanh toán"
            value={summary.completedPaymentOrders.toLocaleString("vi-VN")}
            detail={`${summary.pendingPaymentOrders} đang chờ, ${summary.physicalOrders} đơn in`}
            accent="orders"
          />
        </div>
      ) : null}

      <ReminderBanner
        loading={reminderLoading}
        onRun={() => void handleReminderRun()}
        overview={overview}
        result={reminderResult}
      />

      {/* Revenue Chart */}
      {summary ? (
        <div className={`${adminSurface.card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-app-ink-muted" />
            <div>
              <p className="text-sm font-semibold text-app-ink">Doanh thu</p>
              <p className="text-xs text-app-ink-muted">Tổng và 30 ngày gần nhất</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-app-ink-soft">Tổng doanh thu</span>
                <span className="font-semibold text-app-ink">{formatVnd(summary.revenueTotalVnd)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-app-bg-subtle overflow-hidden">
                <div className="h-full rounded-full bg-app-accent" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-app-ink-soft">30 ngày qua</span>
                <span className="font-semibold text-app-ink">{formatVnd(summary.revenueLast30DaysVnd)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-app-bg-subtle overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${summary.revenueTotalVnd > 0 ? Math.min(100, Math.round((summary.revenueLast30DaysVnd / summary.revenueTotalVnd) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-app-bg-subtle p-3 text-center">
                <p className="text-xs text-app-ink-muted">Plus đang dùng</p>
                <p className="text-lg font-bold text-app-ink">{summary.activePlusSubscriptions}</p>
              </div>
              <div className="rounded-xl bg-app-bg-subtle p-3 text-center">
                <p className="text-xs text-app-ink-muted">Đơn in</p>
                <p className="text-lg font-bold text-app-ink">{summary.physicalOrders}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${adminSurface.card} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CreditCard className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-app-ink">
                Thanh toán gần đây
              </p>
              <p className="text-xs text-app-ink-muted">
                Các đơn thanh toán tự động mới nhất.
              </p>
            </div>
          </div>
          <RecentPaymentList payments={overview?.recentPayments ?? []} />
        </div>

        <div className={`${adminSurface.card} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent dark:bg-app-accent/15">
              <Users className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-app-ink">User mới</p>
              <p className="text-xs text-app-ink-muted">
                Email:{" "}
                {overview?.email.configured
                  ? "đã cấu hình"
                  : "chưa cấu hình"}
              </p>
            </div>
          </div>
          <RecentUserList users={overview?.recentUsers ?? []} />
        </div>
      </section>

      <RecentOrdersPreview
        orders={orders}
        onSeeAll={() => navigate("/admin/orders")}
      />

      {!loading && !error && !summary ? (
        <AdminEmptyState
          title="Chưa có dữ liệu"
          description="Khi user và đơn hàng đầu tiên xuất hiện, dashboard sẽ hiển thị tóm tắt ngay tại đây."
        />
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
