import { ArrowLeft, Calendar, CreditCard, Loader2, Mail, MapPin, Package, Shield, Target, User as UserIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import {
  type AdminUserDetail,
  adminGetUserDetail,
  adminUpdateUserRole,
} from "@/services/adminService";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, formatVnd, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-app-ink-muted">{label}</span>
      <span className="text-sm text-app-ink text-right">{value || "—"}</span>
    </div>
  );
}

export function AdminUserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(
        adminGetUserDetail(uid),
        ADMIN_LOAD_TIMEOUT_MS,
        "Hết thời gian tải thông tin người dùng.",
      );
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải thông tin người dùng."));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleRole = async () => {
    if (!data || !uid) return;
    const newRole = data.user.role === "admin" ? "user" : "admin";
    const confirmMsg =
      newRole === "admin"
        ? `Cấp quyền admin cho ${data.user.email}?`
        : `Gỡ quyền admin của ${data.user.email}?`;
    if (!window.confirm(confirmMsg)) return;

    setRoleUpdating(true);
    try {
      const res = await adminUpdateUserRole(uid, newRole);
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, role: res.role } } : prev));
      toast.success(`Đã cập nhật vai trò thành ${newRole === "admin" ? "Admin" : "User"}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật vai trò."));
    } finally {
      setRoleUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-app-ink-soft" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-app-ink-muted hover:text-app-ink">
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <div className="rounded-[var(--r-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Không tìm thấy người dùng."}
          <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-700 underline" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const { user, subscription, goals, paymentOrders, physicalOrders } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-app-ink-muted hover:text-app-ink transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <AdminPageHeader
        title={user.displayName || user.email}
        description={`UID: ${user.firebaseUid}`}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 border-app-line"
            disabled={roleUpdating}
            onClick={() => void handleToggleRole()}
          >
            {roleUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
            {user.role === "admin" ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <UserIcon className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Thông tin cá nhân</h3>
          </div>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Tên hiển thị" value={user.displayName} />
          <InfoRow
            label="Vai trò"
            value={user.role === "admin" ? "Admin" : "User"}
          />
          <InfoRow label="Ngôn ngữ" value={user.locale} />
          <InfoRow label="Đã hoàn thành onboarding" value={user.onboardingCompletedAt ? formatDate(user.onboardingCompletedAt) : "Chưa"} />
          <InfoRow label="Đã đồng ý điều khoản" value={user.termsAcceptedAt ? formatDate(user.termsAcceptedAt) : "Chưa"} />
          <InfoRow label="Ngày tạo" value={formatDate(user.createdAt)} />
        </div>

        {/* Subscription Card */}
        <div className={`${adminSurface.card} p-5 space-y-1`}>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Gói dịch vụ</h3>
          </div>
          {subscription ? (
            <>
              <InfoRow label="Gói" value={subscription.planCode} />
              <InfoRow label="Trạng thái" value={subscription.status} />
              <InfoRow label="Nhà cung cấp" value={subscription.provider} />
              <InfoRow label="Chu kỳ" value={subscription.billingCycle} />
              <InfoRow label="Hết hạn" value={subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "—"} />
            </>
          ) : (
            <p className="text-sm text-app-ink-muted">Chưa có gói dịch vụ nào.</p>
          )}
        </div>

        {/* Goals Summary Card */}
        <div className={`${adminSurface.card} p-5 space-y-3`}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Mục tiêu ({goals.length})</h3>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-app-ink-muted">Chưa có mục tiêu nào.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {goals.map((goal) => (
                <div key={goal.id} className="rounded-[var(--r-control)] border border-app-line p-3">
                  <p className="text-sm font-medium text-app-ink truncate">{goal.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-app-ink-muted">
                    <span className="rounded bg-app-bg-subtle px-1.5 py-0.5">{goal.category}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 ${
                        goal.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : goal.status === "completed"
                            ? "bg-app-accent-soft text-app-accent"
                            : "bg-app-bg-subtle text-app-ink-muted"
                      }`}
                    >
                      {goal.status}
                    </span>
                    {goal.readinessScore != null && (
                      <span>Score: {goal.readinessScore}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Orders */}
      <div className={`${adminSurface.card} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-app-ink-muted" />
          <h3 className="text-sm font-semibold text-app-ink">Lịch sử thanh toán ({paymentOrders.length})</h3>
        </div>
        {paymentOrders.length === 0 ? (
          <p className="text-sm text-app-ink-muted">Chưa có thanh toán nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-line">
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Mã đơn</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Gói</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Số tiền</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Trạng thái</th>
                  <th className="pb-2 font-medium text-app-ink-soft">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {paymentOrders.map((po) => (
                  <tr key={po.orderId} className="border-b border-app-line last:border-0">
                    <td className="py-2 pr-4 text-app-ink font-mono text-xs">{po.orderId}</td>
                    <td className="py-2 pr-4 text-app-ink-soft">{po.planCode}</td>
                    <td className="py-2 pr-4 text-app-ink">{formatVnd(po.amount)}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded-[var(--r-pill)] border px-2 py-0.5 text-xs font-medium ${
                          po.status === "completed"
                            ? "bg-app-accent-soft text-app-accent border-app-accent/30"
                            : po.status === "pending"
                              ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                              : "bg-app-bg-subtle text-app-ink-soft border-app-line-strong"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-2 text-app-ink-muted text-xs">{formatDate(po.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Physical Orders */}
      {physicalOrders.length > 0 ? (
        <div className={`${adminSurface.card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-app-ink-muted" />
            <h3 className="text-sm font-semibold text-app-ink">Đơn hàng vật lý ({physicalOrders.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-line">
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Mã đơn</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Người nhận</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Tổng tiền</th>
                  <th className="pb-2 pr-4 font-medium text-app-ink-soft">Trạng thái</th>
                  <th className="pb-2 font-medium text-app-ink-soft">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {physicalOrders.map((o) => (
                  <tr key={o.id} className="border-b border-app-line last:border-0">
                    <td className="py-2 pr-4 text-app-ink font-mono text-xs">{o.id.slice(-8)}</td>
                    <td className="py-2 pr-4 text-app-ink-soft">{o.fullName}</td>
                    <td className="py-2 pr-4 text-app-ink">{formatVnd(o.totalVnd)}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-[var(--r-pill)] border px-2 py-0.5 text-xs font-medium bg-app-bg-subtle text-app-ink-soft border-app-line-strong">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 text-app-ink-muted text-xs">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}