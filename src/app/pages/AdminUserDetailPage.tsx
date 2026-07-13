import { ArrowLeft, ArrowUpCircle, CreditCard, Loader2, Package, Shield, Target, User as UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import {
  type AdminUserDetail,
  type AdminOperationalClassificationReason,
  adminClassifyUsers,
  adminGetUserDetail,
  adminUpdateUserRole,
  adminUpdateUserSubscription,
} from "@/services/adminService";
import { AdminOperationalClassificationBadge } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, formatVnd, getErrorMessage, withTimeout } from "../components/admin/utils";
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
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<"user" | "admin" | null>(null);
  const [subUpdating, setSubUpdating] = useState(false);
  const [subConfirmOpen, setSubConfirmOpen] = useState(false);
  const [pendingPlanCode, setPendingPlanCode] = useState<"PLUS" | "FREE" | null>(null);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState<string | undefined>();
  const classificationRequestRef = useRef<{
    commandKey: string;
    requestId: string;
  } | null>(null);
  const classificationMutationRef = useRef(0);
  const loadGeneration = useRef(0);
  const currentUidRef = useRef(uid);
  const previousUidRef = useRef(uid);
  currentUidRef.current = uid;

  const load = useCallback(async (requestedUid = currentUidRef.current) => {
    if (!requestedUid) return;
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(
        adminGetUserDetail(requestedUid),
        ADMIN_LOAD_TIMEOUT_MS,
        "Hết thời gian tải thông tin người dùng.",
      );
      if (generation !== loadGeneration.current || requestedUid !== currentUidRef.current) return;
      setData(res);
    } catch (err) {
      if (generation !== loadGeneration.current || requestedUid !== currentUidRef.current) return;
      setError(getErrorMessage(err, "Không thể tải thông tin người dùng."));
    } finally {
      if (generation === loadGeneration.current && requestedUid === currentUidRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(uid);
  }, [load, uid]);

  useEffect(() => {
    if (previousUidRef.current === uid) return;
    previousUidRef.current = uid;
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationBusy(false);
    setClassificationOpen(false);
    setClassificationError(undefined);
  }, [uid]);

  const handleToggleRole = () => {
    if (!data) return;
    setPendingRole(data.user.role === "admin" ? "user" : "admin");
    setRoleConfirmOpen(true);
  };

  const handleRoleDialogChange = (open: boolean) => {
    if (roleUpdating) return;
    setRoleConfirmOpen(open);
    if (!open) setPendingRole(null);
  };

  const handleRoleChange = async () => {
    if (!data || !uid || !pendingRole) return;

    setRoleUpdating(true);
    try {
      const res = await adminUpdateUserRole(uid, pendingRole);
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, role: res.role } } : prev));
      toast.success(`Đã cập nhật vai trò thành ${pendingRole === "admin" ? "Admin" : "User"}.`);
      setRoleConfirmOpen(false);
      setPendingRole(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật vai trò."));
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleSubscriptionChange = async () => {
    if (!data || !uid || !pendingPlanCode) return;
    setSubConfirmOpen(false);
    setSubUpdating(true);
    try {
      const res = await adminUpdateUserSubscription(uid, {
        planCode: pendingPlanCode,
      });
      setData(res);
      toast.success(pendingPlanCode === "PLUS" ? "Đã nâng lên gói Plus." : "Đã hạ về gói Free.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể thay đổi gói dịch vụ."));
    } finally {
      setSubUpdating(false);
      setPendingPlanCode(null);
    }
  };

  const openSubConfirm = (planCode: "PLUS" | "FREE") => {
    setPendingPlanCode(planCode);
    setSubConfirmOpen(true);
  };

  const handleClassification = async (payload: {
    category: "real" | "test" | "internal";
    reason: AdminOperationalClassificationReason;
    note?: string;
  }) => {
    if (!uid) return;
    const targetUid = uid;
    const commandKey = JSON.stringify({
      uid: targetUid,
      category: payload.category,
      reason: payload.reason,
      note: payload.note?.trim() || null,
    });
    const currentRequest = classificationRequestRef.current;
    const requestId = currentRequest?.commandKey === commandKey ? currentRequest.requestId : crypto.randomUUID();
    classificationRequestRef.current = { commandKey, requestId };
    const mutation = ++classificationMutationRef.current;
    setClassificationBusy(true);
    setClassificationError(undefined);
    try {
      const result = await adminClassifyUsers({
        ...payload,
        changes: [{ userUid: targetUid, requestId }],
      });
      if (targetUid !== currentUidRef.current || mutation !== classificationMutationRef.current) return;
      const targetResult = result.results.find((item) => item.userUid === targetUid);
      const shouldReload =
        targetResult?.status === "updated" ||
        targetResult?.status === "unchanged" ||
        (targetResult?.status === "failed" && targetResult.errorCode === "idempotency_conflict");
      if (shouldReload) {
        await load();
        if (targetUid !== currentUidRef.current || mutation !== classificationMutationRef.current) return;
        classificationRequestRef.current = null;
        setClassificationOpen(false);
        return;
      }
      if (targetResult?.status === "failed" && targetResult.errorCode === "admin_audit_commit_unknown") {
        setClassificationError("Kết quả phân loại chưa rõ. Hãy thử lại cùng yêu cầu này.");
        return;
      }
      classificationRequestRef.current = null;
      setClassificationError("Không thể phân loại người dùng. Hãy kiểm tra lại và thử lại.");
    } catch {
      if (targetUid !== currentUidRef.current || mutation !== classificationMutationRef.current) return;
      setClassificationError("Không thể gửi yêu cầu phân loại. Hãy thử lại.");
    } finally {
      if (mutation === classificationMutationRef.current) setClassificationBusy(false);
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
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-app-ink-muted hover:text-app-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <div className="rounded-[var(--r-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Không tìm thấy người dùng."}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 text-red-700 underline"
            onClick={() => void load()}
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const { user, subscription, goals, paymentOrders, physicalOrders } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-app-ink-muted hover:text-app-ink transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <AdminPageHeader
        title={user.displayName || user.email}
        description={`UID: ${user.firebaseUid}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 border-app-line"
              disabled={roleUpdating}
              onClick={handleToggleRole}
            >
              {roleUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              {user.role === "admin" ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-app-line"
              disabled={classificationBusy}
              onClick={() => {
                setClassificationError(undefined);
                setClassificationOpen(true);
              }}
            >
              Phân loại dữ liệu
            </Button>
          </div>
        }
      />

      <AlertDialog open={roleConfirmOpen} onOpenChange={handleRoleDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingRole === "admin" ? "Cấp quyền Admin?" : "Gỡ quyền Admin?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole === "admin"
                ? `Xác nhận cấp quyền Admin cho ${user.email}. Người này sẽ truy cập được các trang quản trị.`
                : `Xác nhận gỡ quyền Admin của ${user.email}. Người này sẽ mất quyền truy cập quản trị.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleUpdating}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={roleUpdating}
              className={
                pendingRole === "user"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-app-accent hover:bg-app-accent-hover text-white"
              }
              onClick={(event) => {
                event.preventDefault();
                void handleRoleChange();
              }}
            >
              {roleUpdating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              {pendingRole === "admin" ? "Cấp quyền Admin" : "Gỡ quyền Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminOperationalClassificationDialog
        open={classificationOpen}
        targetType="user"
        targetLabel={user.displayName || user.email}
        initialCategory={user.operationalClassification.effectiveCategory}
        initialReason={user.operationalClassification.reason as AdminOperationalClassificationReason | undefined}
        initialNote={user.operationalClassification.note}
        pending={classificationBusy}
        error={classificationError}
        onOpenChange={(open) => {
          if (!classificationBusy) {
            setClassificationOpen(open);
            if (!open) setClassificationError(undefined);
          }
        }}
        onConfirm={handleClassification}
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
          <InfoRow label="Vai trò" value={user.role === "admin" ? "Admin" : "User"} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-xs text-app-ink-muted">Phân loại vận hành</span>
            {user.operationalClassification.effectiveCategory === "real" ? (
              <span className="text-sm text-app-ink">Dữ liệu thật</span>
            ) : (
              <AdminOperationalClassificationBadge classification={user.operationalClassification} />
            )}
          </div>
          <InfoRow label="Ngôn ngữ" value={user.locale} />
          <InfoRow
            label="Đã hoàn thành onboarding"
            value={user.onboardingCompletedAt ? formatDate(user.onboardingCompletedAt) : "Chưa"}
          />
          <InfoRow
            label="Đã đồng ý điều khoản"
            value={user.termsAcceptedAt ? formatDate(user.termsAcceptedAt) : "Chưa"}
          />
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
              <InfoRow
                label="Hết hạn"
                value={subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "—"}
              />
            </>
          ) : (
            <p className="text-sm text-app-ink-muted">Chưa có gói dịch vụ nào.</p>
          )}
          {/* Upgrade/Downgrade buttons */}
          <div className="mt-4 pt-3 border-t border-app-line">
            {subscription?.planCode === "PLUS" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5 border-app-line text-app-ink-muted hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 transition-colors duration-150"
                disabled={subUpdating}
                onClick={() => openSubConfirm("FREE")}
              >
                {subUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 rotate-180" />
                )}
                Hạ về gói Free
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full gap-1.5 bg-app-accent text-white shadow-sm hover:bg-app-accent-hover transition-colors duration-150"
                disabled={subUpdating}
                onClick={() => openSubConfirm("PLUS")}
              >
                {subUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                )}
                Nâng lên gói Plus
              </Button>
            )}
          </div>
        </div>

        {/* Subscription Confirm Dialog */}
        <AlertDialog open={subConfirmOpen} onOpenChange={setSubConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingPlanCode === "PLUS" ? "Nâng lên gói Plus?" : "Hạ về gói Free?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingPlanCode === "PLUS"
                  ? `Xác nhận nâng gói cho ${user.email} lên Plus. Người dùng sẽ có quyền truy cập đầy đủ trong 12 tuần.`
                  : `Xác nhận hạ gói của ${user.email} về Free. Gói Plus hiện tại sẽ bị hủy ngay lập tức. Hành động này không thể hoàn tác.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={subUpdating}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                disabled={subUpdating}
                className={
                  pendingPlanCode === "FREE"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-app-accent hover:bg-app-accent-hover text-white"
                }
                onClick={() => void handleSubscriptionChange()}
              >
                {subUpdating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                {pendingPlanCode === "PLUS" ? "Nâng lên Plus" : "Hạ về Free"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                    {goal.readinessScore != null && <span>Score: {goal.readinessScore}</span>}
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
