import { ArrowLeft, ArrowUpCircle, Loader2, Shield } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import {
  type AdminOperationalClassificationSummary,
  type AdminUserDetail,
  type AdminOperationalClassificationReason,
  adminClassifyUsers,
  adminGetUserDetail,
  adminUpdateUserRole,
  adminUpdateUserSubscription,
} from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminOperationalClassificationBadge } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from "../components/admin/statusMappings";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
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
  const [roleError, setRoleError] = useState<string | null>(null);
  const [subUpdating, setSubUpdating] = useState(false);
  const [subConfirmOpen, setSubConfirmOpen] = useState(false);
  const [pendingPlanCode, setPendingPlanCode] = useState<"PLUS" | "FREE" | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
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
    setRoleError(null);
    setPendingRole(data.user.role === "admin" ? "user" : "admin");
    setRoleConfirmOpen(true);
  };

  const handleRoleDialogChange = (open: boolean) => {
    if (roleUpdating) return;
    setRoleConfirmOpen(open);
    if (!open) {
      setPendingRole(null);
      setRoleError(null);
    }
  };

  const handleRoleChange = async () => {
    if (!data || !uid || !pendingRole) return;

    setRoleError(null);
    setRoleUpdating(true);
    try {
      const res = await adminUpdateUserRole(uid, pendingRole);
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, role: res.role } } : prev));
      toast.success(`Đã cập nhật vai trò thành ${pendingRole === "admin" ? "Admin" : "User"}.`);
      setRoleConfirmOpen(false);
      setPendingRole(null);
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật vai trò.");
      setRoleError(message);
      toast.error(message);
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleSubscriptionChange = async () => {
    if (!data || !uid || !pendingPlanCode) return;
    setSubConfirmOpen(false);
    setSubscriptionError(null);
    setSubUpdating(true);
    try {
      const res = await adminUpdateUserSubscription(uid, {
        planCode: pendingPlanCode,
      });
      setData(res);
      toast.success(pendingPlanCode === "PLUS" ? "Đã nâng lên gói Plus." : "Đã hạ về gói Free.");
    } catch (err) {
      const message = getErrorMessage(err, "Không thể thay đổi gói dịch vụ.");
      setSubscriptionError(message);
      toast.error(message);
    } finally {
      setSubUpdating(false);
      setPendingPlanCode(null);
    }
  };

  const openSubConfirm = (planCode: "PLUS" | "FREE") => {
    setSubscriptionError(null);
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
      <div className="flex items-center justify-center gap-2 py-20" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-app-ink-soft motion-reduce:animate-none" aria-hidden="true" />
        <span className="sr-only">Đang tải thông tin người dùng</span>
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
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại danh sách
        </Link>
        <AdminFeedbackBanner
          tone="error"
          summary={error || "Không tìm thấy người dùng."}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          }
        />
      </div>
    );
  }

  const { user, subscription, goals, paymentOrders, physicalOrders } = data;
  const operationalClassification: AdminOperationalClassificationSummary = user.operationalClassification ?? {
    effectiveCategory: "real",
    source: "default",
  };

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-app-ink-muted transition-colors hover:text-app-ink motion-reduce:transition-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
              {roleUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Shield className="h-3 w-3" aria-hidden="true" />
              )}
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

      {subscriptionError ? (
        <AdminFeedbackBanner
          tone="error"
          summary={subscriptionError}
          onDismiss={() => setSubscriptionError(null)}
        />
      ) : null}

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
          {roleError ? <AdminFeedbackBanner tone="error" summary={roleError} /> : null}
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
              {roleUpdating ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              {pendingRole === "admin" ? "Cấp quyền Admin" : "Gỡ quyền Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminOperationalClassificationDialog
        open={classificationOpen}
        targetType="user"
        targetLabel={user.displayName || user.email}
        initialCategory={operationalClassification.effectiveCategory}
        initialReason={operationalClassification.reason as AdminOperationalClassificationReason | undefined}
        initialNote={operationalClassification.note}
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
        <AdminDataPanel title="Thông tin cá nhân" contentClassName="space-y-1 p-5">
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Tên hiển thị" value={user.displayName} />
          <InfoRow label="Vai trò" value={user.role === "admin" ? "Admin" : "User"} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-xs text-app-ink-muted">Phân loại vận hành</span>
            <AdminOperationalClassificationBadge classification={operationalClassification} />
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
        </AdminDataPanel>

        <AdminDataPanel title="Gói dịch vụ" contentClassName="space-y-1 p-5">
          {subscription ? (
            <>
              <InfoRow label="Gói" value={subscription.planCode} />
              <InfoRow
                label="Trạng thái"
                value={<AdminStatusBadge tone="neutral">{subscription.status}</AdminStatusBadge>}
              />
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
          <div className="mt-4 pt-3 border-t border-app-line">
            {subscription?.planCode === "PLUS" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5 border-app-line text-app-ink-muted transition-colors duration-150 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 motion-reduce:transition-none dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                disabled={subUpdating}
                onClick={() => openSubConfirm("FREE")}
              >
                {subUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                )}
                Hạ về gói Free
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full gap-1.5 bg-app-accent text-white shadow-sm transition-colors duration-150 hover:bg-app-accent-hover motion-reduce:transition-none"
                disabled={subUpdating}
                onClick={() => openSubConfirm("PLUS")}
              >
                {subUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Nâng lên gói Plus
              </Button>
            )}
          </div>
        </AdminDataPanel>

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
                {subUpdating ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : null}
                {pendingPlanCode === "PLUS" ? "Nâng lên Plus" : "Hạ về Free"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AdminDataPanel title={`Mục tiêu (${goals.length})`} contentClassName="space-y-3 p-5">
          {goals.length === 0 ? (
            <p className="text-sm text-app-ink-muted">Chưa có mục tiêu nào.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {goals.map((goal) => (
                <div key={goal.id} className="rounded-[var(--r-control)] border border-app-line p-3">
                  <p className="text-sm font-medium text-app-ink truncate">{goal.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-app-ink-muted">
                    <AdminStatusBadge tone="neutral">{goal.category}</AdminStatusBadge>
                    <AdminStatusBadge
                      tone={goal.status === "completed" ? "completed" : goal.status === "active" ? "pending" : "neutral"}
                    >
                      {goal.status === "completed"
                        ? "Hoàn thành"
                        : goal.status === "active"
                          ? "Đang thực hiện"
                          : goal.status}
                    </AdminStatusBadge>
                    {goal.readinessScore != null && <span>Score: {goal.readinessScore}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminDataPanel>
      </div>

      <AdminDataPanel title={`Lịch sử thanh toán (${paymentOrders.length})`}>
        {paymentOrders.length === 0 ? (
          <p className="p-5 text-sm text-app-ink-muted">Chưa có thanh toán nào.</p>
        ) : (
          <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
            <TableCaption className="sr-only">Lịch sử thanh toán</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Mã đơn</TableHead>
                <TableHead scope="col">Gói</TableHead>
                <TableHead scope="col" className="text-right">Số tiền</TableHead>
                <TableHead scope="col">Trạng thái</TableHead>
                <TableHead scope="col">Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {paymentOrders.map((po) => (
                  <TableRow key={po.orderId}>
                    <TableCell className="font-mono text-xs text-app-ink">{po.orderId}</TableCell>
                    <TableCell>{po.planCode}</TableCell>
                    <TableCell className="text-right tabular-nums text-app-ink">
                      {formatVnd(po.amount)}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        tone={PAYMENT_STATUS_TONES[po.status as keyof typeof PAYMENT_STATUS_TONES] ?? "neutral"}
                      >
                        {PAYMENT_STATUS_LABELS[po.status as keyof typeof PAYMENT_STATUS_LABELS] ?? po.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-xs text-app-ink-muted">{formatDate(po.createdAt)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </AdminDataPanel>

      {physicalOrders.length > 0 ? (
        <AdminDataPanel title={`Đơn hàng vật lý (${physicalOrders.length})`}>
          <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
            <TableCaption className="sr-only">Đơn hàng vật lý</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Mã đơn</TableHead>
                <TableHead scope="col">Người nhận</TableHead>
                <TableHead scope="col" className="text-right">Tổng tiền</TableHead>
                <TableHead scope="col">Trạng thái</TableHead>
                <TableHead scope="col">Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {physicalOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs text-app-ink">{o.id}</TableCell>
                    <TableCell>{o.fullName}</TableCell>
                    <TableCell className="text-right tabular-nums text-app-ink">
                      {formatVnd(o.totalVnd)}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        tone={ORDER_STATUS_TONES[o.status as keyof typeof ORDER_STATUS_TONES] ?? "neutral"}
                      >
                        {ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-xs text-app-ink-muted">{formatDate(o.createdAt)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </AdminDataPanel>
      ) : null}
    </div>
  );
}
