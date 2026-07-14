import {
  Bell,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
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
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-app-accent-soft motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
          <div className="h-6 w-20 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
          <div className="h-3 w-32 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
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
    <div className={`${adminSurface.card} border-app-accent/25 p-5`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
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
          className="gap-2"
          disabled={loading || !emailConfigured || expiringCount === 0}
          onClick={onRun}
        >
          {loading ? (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
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
          className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-app-bg-subtle/30 motion-reduce:transition-none"
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
          className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-app-bg-subtle/30 motion-reduce:transition-none"
        >
          <div className="min-w-0 flex items-center gap-3">
            {/* Avatar placeholder */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent-soft to-app-bg-subtle text-xs font-bold text-app-accent">
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
    <AdminDataPanel
      title="Đơn in mới nhất"
      description="5 đơn gần đây nhất."
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-app-accent"
          onClick={onSeeAll}
        >
          Xem tất cả
          <span aria-hidden="true">→</span>
        </Button>
      }
      contentClassName="px-5 py-1"
    >
      {orders.length === 0 ? (
        <p className="py-4 text-center text-sm text-app-ink-muted">
          Chưa có đơn in nào.
        </p>
      ) : (
        <ul className="divide-y divide-app-line/60">
          {orders.slice(0, 5).map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
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
    </AdminDataPanel>
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
  const [reminderError, setReminderError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, orderData] = await withTimeout(
        Promise.all([adminGetOverview(), adminGetOrders({ operationalScope: "real", page: 1, limit: 12 })]),
        ADMIN_LOAD_TIMEOUT_MS,
        "Máy chủ quản trị phản hồi quá lâu. Render có thể đang cold start; hãy thử lại sau vài giây.",
      );
      setOverview(overviewData);
      setOrders(orderData.items);
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
    setReminderError(null);
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
      setReminderError(getErrorMessage(err, "Không thể gửi lời nhắc lúc này."));
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
            className="gap-2 rounded-xl border-app-line bg-app-bg-subtle text-app-ink transition-colors duration-150 hover:bg-app-accent-soft hover:text-app-ink motion-reduce:transition-none"
            disabled={loading}
            onClick={() => void loadData()}
          >
            {loading ? (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải lại
          </Button>
        }
      />

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={
            <div>
              <p className="font-semibold">Không tải được dữ liệu</p>
              <p className="mt-1 font-normal">{error}</p>
            </div>
          }
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {loading && !overview ? (
        <div
          role="status"
          aria-label="Đang tải tổng quan quản trị"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <span className="sr-only">Đang tải tổng quan quản trị</span>
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

      {summary && (summary.excludedUsers.test > 0 || summary.excludedUsers.internal > 0) ? (
        <div className="flex flex-wrap gap-3 text-sm text-app-ink-soft">
          <span>Dữ liệu đã loại khỏi tổng quan:</span>
          {summary.excludedUsers.test > 0 ? (
            <Link to="/admin/users?operationalCategory=test" className="font-medium text-app-accent hover:underline">
              {summary.excludedUsers.test} tài khoản test
            </Link>
          ) : null}
          {summary.excludedUsers.internal > 0 ? (
            <Link to="/admin/users?operationalCategory=internal" className="font-medium text-app-accent hover:underline">
              {summary.excludedUsers.internal} tài khoản nội bộ
            </Link>
          ) : null}
        </div>
      ) : null}

      <ReminderBanner
        loading={reminderLoading}
        onRun={() => void handleReminderRun()}
        overview={overview}
        result={reminderResult}
      />

      {reminderError ? (
        <AdminFeedbackBanner
          tone="error"
          summary={
            <div>
              <p className="font-semibold">Không gửi được email nhắc hạn</p>
              <p className="mt-1 font-normal">{reminderError}</p>
            </div>
          }
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reminderLoading}
              onClick={() => void handleReminderRun()}
            >
              Thử gửi lại
            </Button>
          }
        />
      ) : null}

      {summary ? (
        <AdminDataPanel
          title="Doanh thu"
          description="Tổng và 30 ngày gần nhất."
          contentClassName="space-y-4 p-5"
        >
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-app-ink-soft">Tổng doanh thu</span>
              <span className="font-semibold text-app-ink">{formatVnd(summary.revenueTotalVnd)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-app-bg-subtle">
              <div className="h-full w-full rounded-full bg-app-accent" />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-app-ink-soft">30 ngày qua</span>
              <span className="font-semibold text-app-ink">{formatVnd(summary.revenueLast30DaysVnd)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-app-bg-subtle">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${summary.revenueTotalVnd > 0 ? Math.min(100, Math.round((summary.revenueLast30DaysVnd / summary.revenueTotalVnd) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-[var(--r-control)] bg-app-bg-subtle p-3 text-center">
              <p className="text-xs text-app-ink-muted">Plus đang dùng</p>
              <p className="text-lg font-bold text-app-ink">{summary.activePlusSubscriptions}</p>
            </div>
            <div className="rounded-[var(--r-control)] bg-app-bg-subtle p-3 text-center">
              <p className="text-xs text-app-ink-muted">Đơn in</p>
              <p className="text-lg font-bold text-app-ink">{summary.physicalOrders}</p>
            </div>
          </div>
        </AdminDataPanel>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminDataPanel
          title="Thanh toán gần đây"
          description="Các đơn thanh toán tự động mới nhất."
          contentClassName="px-5 py-1"
        >
          <RecentPaymentList payments={overview?.recentPayments ?? []} />
        </AdminDataPanel>

        <AdminDataPanel
          title="Người dùng mới"
          description={`Email: ${overview?.email.configured ? "đã cấu hình" : "chưa cấu hình"}`}
          contentClassName="px-5 py-1"
        >
          <RecentUserList users={overview?.recentUsers ?? []} />
        </AdminDataPanel>
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
