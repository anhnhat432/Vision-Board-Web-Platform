import { apiClient, toAppError } from "@/lib/api/apiClient";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Crown,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { BillingTrustSignals } from "../../app/components/BillingTrustSignals";
import { UpgradePaywallDialog } from "../../app/components/UpgradePaywallDialog";
import {
  canRequestRefund,
  getEmailVerificationRequiredMessage,
  rememberEmailVerificationReturnPath,
} from "../../app/utils/email-verification-guard";
import { logBillingUiError, toastBillingNetworkError } from "../../app/utils/billing-ui-monitoring";
import { PageHero } from "../../app/components/layout/PageHero";
import { PrimaryActionCard } from "../../app/components/layout/PrimaryActionCard";
import { SectionBlock } from "../../app/components/layout/SectionBlock";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../app/components/ui/alert-dialog";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../app/components/ui/dialog";
import { Input } from "../../app/components/ui/input";
import { Textarea } from "../../app/components/ui/textarea";
import { usePlanEntitlements } from "../../app/hooks/usePlanEntitlements";
import { useSyncedUserData } from "../../app/hooks/useSyncedUserData";
import { isRealMode, isPaidCheckoutDisabled, shouldShowBillingDebugUi } from "../../app/utils/app-mode";
import { formatBillingExpiryDate, getBillingExpiryInfo } from "../../app/utils/billing-expiry";
import { getSubscriptionGraceState } from "../../app/utils/billing-grace-period";
import { getBillingProviderModeLabel, getBillingReadinessLabel } from "../../app/utils/billing-contract";
import { trackPaywallCtaClicked } from "../../app/utils/monetization-analytics";
import {
  getBillingProviderStatus,
  getLastEntitlementSyncSnapshot,
  getLastRestoreAccessSnapshot,
  openBillingCustomerPortal,
  restorePlanAccess,
  resolveAppReturnPath,
  syncEntitlementsWithProvider,
} from "../../app/utils/production";
import { getUserData } from "../../app/utils/storage";
import type { PricingPlanCode } from "../../app/utils/storage-types";
import {
  getEntitlementLabel,
  getPlanLabel,
  PLAN_DEFINITIONS,
  type PremiumFeatureContext,
} from "../../app/utils/twelve-week-premium";

type CheckoutReturnStatus = "idle" | "pending" | "confirmed" | "failed";
type PaymentOrderStatus = "pending" | "completed" | "expired" | "failed";
type RefundRequestStatus = "pending" | "completed" | "rejected";

interface PaymentHistoryRefundRequest {
  status: RefundRequestStatus;
  createdAt: string | null;
  resolvedAt: string | null;
}

interface PaymentHistoryOrder {
  orderId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  createdAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  invoiceUrl?: string | null;
  receiptSentAt?: string | null;
  refundRequest?: PaymentHistoryRefundRequest | null;
}

interface RefundRequestResponse {
  request: PaymentHistoryRefundRequest & {
    id: string;
    orderId: string;
    contactEmail: string;
  };
}

interface RefundFormState {
  orderId: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
}

interface ResendReceiptResponse {
  orderId: string;
  receiptSentAt: string | null;
}

interface PaymentHistoryResponse {
  orders: PaymentHistoryOrder[];
}

const BILLING_SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ?? "";
const DEFAULT_REFUND_WINDOW_DAYS = 7;
const REFUND_WINDOW_DAYS = Number.parseInt(
  import.meta.env.VITE_REFUND_WINDOW_DAYS?.trim() || String(DEFAULT_REFUND_WINDOW_DAYS),
  10,
);

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: "Đang chờ",
  completed: "Đã thanh toán",
  expired: "Đã hết hạn",
  failed: "Lỗi",
};

const PAYMENT_STATUS_CLASS_NAMES: Record<PaymentOrderStatus, string> = {
  pending: "border-app-line bg-app-warm-soft text-app-warm",
  completed: "border-app-accent-soft bg-app-accent-soft text-app-accent",
  expired: "border-app-line bg-app-bg text-app-ink-muted",
  failed: "border-app-line bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]",
};

function getPaymentStatusLabel(status: PaymentOrderStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? "Không rõ";
}

function getPaymentStatusClassName(status: PaymentOrderStatus): string {
  return PAYMENT_STATUS_CLASS_NAMES[status] ?? "border-slate-200 bg-slate-50 text-slate-600";
}

function getBillingCycleLabel(billingCycle: string): string {
  return billingCycle === "twelve_week" ? "Chu kỳ 12 tuần" : billingCycle;
}

function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

function formatPaymentDate(iso: string | null): string {
  if (!iso) return "Chưa có";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getRefundWindowDays(): number {
  return Number.isFinite(REFUND_WINDOW_DAYS) && REFUND_WINDOW_DAYS > 0
    ? REFUND_WINDOW_DAYS
    : DEFAULT_REFUND_WINDOW_DAYS;
}

function isOrderRefundEligible(order: PaymentHistoryOrder): boolean {
  if (order.status !== "completed" || !order.completedAt) return false;
  const paidAt = new Date(order.completedAt);
  if (!Number.isFinite(paidAt.valueOf())) return false;
  const elapsedMs = Date.now() - paidAt.getTime();
  if (elapsedMs < 0) return true;
  return elapsedMs <= getRefundWindowDays() * 24 * 60 * 60 * 1000;
}

function getRefundStatusLabel(status: RefundRequestStatus): string {
  if (status === "completed") return "Đã hoàn tiền";
  if (status === "rejected") return "Đã từ chối";
  return "Đang chờ xử lý";
}

function getPaymentHistoryErrorMessage(error: unknown): string {
  const appError = toAppError(error) as ReturnType<typeof toAppError> & {
    rateLimited?: boolean;
    retryAfterMs?: number;
    errorCode?: string;
  };
  const isRateLimited =
    appError.status === 429 ||
    appError.rateLimited === true ||
    appError.errorCode === "rate_limited" ||
    /too many requests|rate limit/i.test(appError.message);

  if (isRateLimited) {
    const retryAfterSeconds =
      typeof appError.retryAfterMs === "number" && Number.isFinite(appError.retryAfterMs)
        ? Math.max(1, Math.ceil(appError.retryAfterMs / 1000))
        : null;
    if (retryAfterSeconds) {
      return `Bạn vừa kiểm tra lịch sử thanh toán quá nhanh. Hãy đợi khoảng ${retryAfterSeconds} giây rồi thử lại.`;
    }
    return "Bạn vừa kiểm tra lịch sử thanh toán quá nhanh. Hãy đợi một chút rồi thử lại.";
  }

  return appError.message || "Không thể tải lịch sử thanh toán.";
}

export function BillingPlan() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authContext = useOptionalAuthContext();
  const { userData: syncedUserData, reloadUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const { currentPlanCode, currentPlanDefinition, entitlementKeys, premiumStatusItems } = usePlanEntitlements(userData);
  const realMode = isRealMode();
  const billingReturnUrl = useMemo(
    () => resolveAppReturnPath(searchParams.get("returnTo") ?? "/12-week-system?tab=settings"),
    [searchParams],
  );

  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("plan");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [showStopUsingConfirm, setShowStopUsingConfirm] = useState(false);
  const [checkoutReturnStatus, setCheckoutReturnStatus] = useState<CheckoutReturnStatus>("idle");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryOrder[]>([]);
  const [isLoadingPaymentHistory, setIsLoadingPaymentHistory] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);
  const [resendingReceiptOrderId, setResendingReceiptOrderId] = useState<string | null>(null);
  const [refundDialogOrder, setRefundDialogOrder] = useState<PaymentHistoryOrder | null>(null);
  const [refundForm, setRefundForm] = useState<RefundFormState>({
    orderId: "",
    contactEmail: "",
    reason: "",
    refundAccount: "",
  });
  const [refundFormError, setRefundFormError] = useState<string | null>(null);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Handle checkout return URL
  const returnStatus = searchParams.get("status");
  const isCheckoutReturn = returnStatus === "success" && realMode;
  const signedInUserId = authContext?.user?.uid ?? null;
  const canLoadPaymentHistory = realMode && signedInUserId !== null;

  const loadPaymentHistory = useCallback(async () => {
    if (!canLoadPaymentHistory) return;
    setIsLoadingPaymentHistory(true);
    setPaymentHistoryError(null);

    try {
      const response = await apiClient.get<PaymentHistoryResponse>("/billing/payment-history");
      setPaymentHistory(response.orders);
    } catch (error: unknown) {
      if (toastBillingNetworkError(error, { surface: "BillingPlan", action: "load_payment_history" })) {
        setPaymentHistoryError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, { surface: "BillingPlan", action: "load_payment_history" });
        setPaymentHistoryError(getPaymentHistoryErrorMessage(error));
      }
    } finally {
      setIsLoadingPaymentHistory(false);
    }
  }, [canLoadPaymentHistory]);

  useEffect(() => {
    if (!canLoadPaymentHistory) return;
    void loadPaymentHistory();
  }, [canLoadPaymentHistory, loadPaymentHistory]);

  const pollServerEntitlement = useCallback(async () => {
    if (!isCheckoutReturn) return;
    setCheckoutReturnStatus("pending");

    // Clear the URL params so refreshing doesn't re-trigger
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("status");
    newParams.delete("context");
    setSearchParams(newParams, { replace: true });

    try {
      const result = await syncEntitlementsWithProvider();
      reloadUserData();
      if (result.ok && result.planCode !== "FREE") {
        setCheckoutReturnStatus("confirmed");
        toast.success(`Đã xác nhận gói ${result.planCode} trên tài khoản.`);
      } else {
        setCheckoutReturnStatus("pending");
        toast.info("Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận.");
      }
    } catch (error: unknown) {
      setCheckoutReturnStatus("failed");
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "poll_server_entitlement" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "poll_server_entitlement" });
        toast.error("Không thể kiểm tra quyền trên tài khoản. Vui lòng thử lại.");
      }
    }
  }, [isCheckoutReturn, searchParams, setSearchParams, reloadUserData]);

  useEffect(() => {
    if (isCheckoutReturn && checkoutReturnStatus === "idle") {
      pollServerEntitlement();
    }
  }, [isCheckoutReturn, checkoutReturnStatus, pollServerEntitlement]);

  const billingStatus = useMemo(() => getBillingProviderStatus(), []);
  const paidCheckoutDisabled = isPaidCheckoutDisabled();
  const profileEmail = authContext?.user?.email?.trim() ?? "";
  const emailNeedsVerification = authContext?.user ? !canRequestRefund(authContext.user) : false;
  const subscription = userData.subscription;
  const expiryInfo = useMemo(() => getBillingExpiryInfo(subscription), [subscription]);
  const graceState = useMemo(() => getSubscriptionGraceState(userData), [userData]);

  const lastEntitlementSync = useMemo(() => getLastEntitlementSyncSnapshot(), []);
  const lastRestoreAccess = useMemo(() => getLastRestoreAccessSnapshot(), []);
  const latestRefundEligibleOrder = useMemo(
    () => paymentHistory.find((order) => isOrderRefundEligible(order) && !order.refundRequest) ?? null,
    [paymentHistory],
  );

  const handleOpenUpgrade = (context: PremiumFeatureContext = "plan") => {
    if (paidCheckoutDisabled) {
      toast.info(
        "Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu cần nâng cấp thủ công.",
      );
      return;
    }
    trackPaywallCtaClicked({
      goalId: undefined,
      context,
      source: "settings",
      currentPlan: currentPlanCode,
      recommendedPlan: "PLUS",
      targetPlan: "PLUS",
      placement: "billing_plan_page",
    });

    setUpgradeContext(context);
    setIsUpgradeDialogOpen(true);
  };

  const handleSyncEntitlements = async () => {
    setIsSyncing(true);
    try {
      const result = await syncEntitlementsWithProvider();
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      reloadUserData();
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "sync_entitlements" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "sync_entitlements" });
        toast.error("Không thể kiểm tra quyền trên tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreAccess = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePlanAccess();
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      reloadUserData();
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "restore_access" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "restore_access" });
        toast.error("Không thể khôi phục quyền lúc này. Vui lòng thử lại.");
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const result = await openBillingCustomerPortal();
      if (result.ok && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else if (result.ok) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "open_customer_portal" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "open_customer_portal" });
        toast.error("Không thể mở trang quản lý thanh toán. Vui lòng thử lại.");
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleCheckoutComplete = (planCode: PricingPlanCode) => {
    reloadUserData();
    if (planCode !== "FREE") {
      toast.success(`Đã cập nhật ${getPlanLabel(planCode)} trên tài khoản của bạn.`);
      navigate(billingReturnUrl);
    }
  };

  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const currentPlanName = currentPlanDefinition?.name ?? getPlanLabel(currentPlanCode);
  const providerLabel = billingStatus.providerLabel || getBillingProviderModeLabel(billingStatus.mode);
  const isPaidPlan = currentPlanCode !== "FREE";
  const renewalLabel =
    isPaidPlan && subscription?.renewsAt
      ? `Gia hạn ngày ${formatDate(subscription.renewsAt)}`
      : isPaidPlan
        ? "Gia hạn ngày Đang chuẩn bị"
        : null;
  const cancelEffectiveDate =
    subscription?.renewsAt && formatDate(subscription.renewsAt) !== "—"
      ? formatDate(subscription.renewsAt)
      : "ngày kết thúc chu kỳ hiện tại";

  const isInRenewalPriority = graceState.inGracePeriod;
  const isExpired = expiryInfo.isExpired && !graceState.active;
  const shouldShowExpiryNotice =
    realMode && subscription?.planCode === "PLUS" && (isInRenewalPriority || expiryInfo.isExpiringSoon || isExpired);

  const handleConfirmStopUsing = () => {
    setShowStopUsingConfirm(false);
    toast.info(
      "Plus hiện không tự động gia hạn. Bạn có thể tiếp tục dùng đến hết chu kỳ hoặc gửi yêu cầu hoàn tiền nếu còn đủ điều kiện.",
    );
  };

  const openRefundDialog = (order: PaymentHistoryOrder, reason = "") => {
    if (emailNeedsVerification) {
      rememberEmailVerificationReturnPath("/billing/plan");
      toast.error(getEmailVerificationRequiredMessage("refund"));
      return;
    }

    setRefundDialogOrder(order);
    setRefundForm({
      orderId: order.orderId,
      contactEmail: profileEmail,
      reason,
      refundAccount: "",
    });
    setRefundFormError(null);
  };

  const handleRequestUnusedCycleRefund = () => {
    if (!latestRefundEligibleOrder) {
      toast.info(`Không có đơn đã thanh toán còn trong thời hạn hoàn tiền ${getRefundWindowDays()} ngày.`);
      return;
    }

    openRefundDialog(
      latestRefundEligibleOrder,
      "Tôi không muốn tiếp tục sử dụng Plus và muốn yêu cầu hoàn tiền cho phần chu kỳ chưa dùng.",
    );
  };

  const canSubmitRefundRequest =
    refundForm.orderId.trim().length > 0 &&
    refundForm.contactEmail.trim().length > 0 &&
    refundForm.reason.trim().length > 0 &&
    refundForm.refundAccount.trim().length > 0 &&
    !isSubmittingRefund;

  const handleSubmitRefundRequest = async () => {
    if (!refundDialogOrder || !canSubmitRefundRequest) return;
    if (emailNeedsVerification) {
      const message = getEmailVerificationRequiredMessage("refund");
      setRefundFormError(message);
      toast.error(message);
      return;
    }

    setIsSubmittingRefund(true);
    setRefundFormError(null);
    try {
      const response = await apiClient.post<RefundRequestResponse>(
        `/billing/orders/${encodeURIComponent(refundDialogOrder.orderId)}/refund-request`,
        {
          contactEmail: refundForm.contactEmail.trim(),
          reason: refundForm.reason.trim(),
          refundAccount: refundForm.refundAccount.trim(),
        },
      );
      const refundRequest: PaymentHistoryRefundRequest = {
        status: response.request.status,
        createdAt: response.request.createdAt,
        resolvedAt: response.request.resolvedAt,
      };
      setPaymentHistory((orders) =>
        orders.map((order) =>
          order.orderId === refundDialogOrder.orderId
            ? {
                ...order,
                refundRequest,
              }
            : order,
        ),
      );
      toast.success("Đã gửi yêu cầu hoàn tiền — sẽ xử lý trong 3-7 ngày làm việc.");
      setRefundDialogOrder(null);
    } catch (error: unknown) {
      if (
        toastBillingNetworkError(error, {
          surface: "BillingPlan",
          action: "submit_refund_request",
          orderId: refundDialogOrder.orderId,
          amount: refundDialogOrder.amount,
          status: refundDialogOrder.status,
        })
      ) {
        setRefundFormError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, {
          surface: "BillingPlan",
          action: "submit_refund_request",
          orderId: refundDialogOrder.orderId,
          amount: refundDialogOrder.amount,
          status: refundDialogOrder.status,
        });
        const message = toAppError(error).message || "Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại sau.";
        setRefundFormError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleRenewPlan = () => {
    if (paidCheckoutDisabled) {
      toast.info(
        "Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu cần gia hạn thủ công.",
      );
      return;
    }
    trackPaywallCtaClicked({
      goalId: undefined,
      context: "plan",
      source: "settings",
      currentPlan: currentPlanCode,
      recommendedPlan: "PLUS",
      targetPlan: "PLUS",
      placement: "billing_plan_renew",
    });
    navigate("/billing/confirm");
  };

  const handleCopySupportMessage = async () => {
    const latestOrderId = paymentHistory[0]?.orderId ?? "chưa có mã đơn";
    const message = [
      "Tôi cần hỗ trợ thanh toán Dear Our Future.",
      `Mã đơn gần nhất: ${latestOrderId}`,
      `Gói hiện tại: ${currentPlanCode}`,
      "Tôi sẽ gửi kèm mã giao dịch hoặc hóa đơn từ đơn vị thanh toán nếu có.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Đã sao chép nội dung hỗ trợ.");
    } catch {
      toast.info("Không thể sao chép tự động. Bạn có thể gửi mã đơn và ảnh chuyển khoản cho hỗ trợ.");
    }
  };

  const handleResendReceipt = async (orderId: string) => {
    setResendingReceiptOrderId(orderId);
    try {
      const response = await apiClient.post<ResendReceiptResponse>(
        `/billing/orders/${encodeURIComponent(orderId)}/resend-receipt`,
      );
      setPaymentHistory((orders) =>
        orders.map((order) =>
          order.orderId === orderId
            ? { ...order, receiptSentAt: response.receiptSentAt ?? new Date().toISOString() }
            : order,
        ),
      );
      toast.success("Đã gửi lại biên nhận thanh toán.");
    } catch (error: unknown) {
      const order = paymentHistory.find((item) => item.orderId === orderId);
      if (
        !toastBillingNetworkError(error, {
          surface: "BillingPlan",
          action: "resend_receipt",
          orderId,
          amount: order?.amount,
          status: order?.status,
        })
      ) {
        logBillingUiError(error, {
          surface: "BillingPlan",
          action: "resend_receipt",
          orderId,
          amount: order?.amount,
          status: order?.status,
        });
        toast.error(toAppError(error).message || "Chưa gửi lại được biên nhận. Vui lòng thử lại sau.");
      }
    } finally {
      setResendingReceiptOrderId(null);
    }
  };

  return (
    <div className="stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <Dialog open={refundDialogOrder !== null} onOpenChange={(open) => !open && setRefundDialogOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yêu cầu hoàn tiền</DialogTitle>
            <DialogDescription>
              Yêu cầu sẽ được gửi tới support để admin duyệt thủ công và chuyển khoản hoàn lại trong 3-7 ngày làm việc.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="refund-order-id" className="text-sm font-medium text-app-ink">
                Mã đơn hàng
              </label>
              <Input id="refund-order-id" value={refundForm.orderId} readOnly className="bg-app-bg" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-contact-email" className="text-sm font-medium text-app-ink">
                Email liên hệ
              </label>
              <Input
                id="refund-contact-email"
                type="email"
                value={refundForm.contactEmail}
                onChange={(event) => setRefundForm((current) => ({ ...current, contactEmail: event.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-reason" className="text-sm font-medium text-app-ink">
                Lý do hoàn tiền
              </label>
              <Textarea
                id="refund-reason"
                value={refundForm.reason}
                onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Cho chúng tôi biết lý do bạn muốn hoàn tiền."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-account" className="text-sm font-medium text-app-ink">
                Số tài khoản ngân hàng nhận tiền hoàn
              </label>
              <Input
                id="refund-account"
                value={refundForm.refundAccount}
                onChange={(event) => setRefundForm((current) => ({ ...current, refundAccount: event.target.value }))}
                placeholder="Ngân hàng - Số TK - Chủ TK"
              />
              <p className="text-xs leading-5 text-app-ink-muted">
                Đây là thông tin PII, chỉ dùng để support chuyển khoản hoàn tiền thủ công.
              </p>
            </div>
            {refundFormError ? (
              <div className="rounded-lg border border-app-line bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-fg)]">
                {refundFormError}
              </div>
            ) : null}
            {emailNeedsVerification ? (
              <div className="rounded-lg border border-app-line bg-app-warm-soft p-3 text-sm text-app-warm">
                Bạn cần xác minh email tài khoản trước khi yêu cầu hoàn tiền.
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefundDialogOrder(null)}
              disabled={isSubmittingRefund}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={handleSubmitRefundRequest}
              disabled={!canSubmitRefundRequest || emailNeedsVerification}
            >
              {isSubmittingRefund ? "Đang gửi…" : "Gửi yêu cầu hoàn tiền"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={currentPlanCode}
        source="settings"
        checkoutMode="checkout"
        returnUrl={billingReturnUrl}
        onCheckoutComplete={handleCheckoutComplete}
      />

      <PageHero
        className="page-enter"
        eyebrow="GÓI & THANH TOÁN"
        title="Chọn gói phù hợp với bạn"
        description="Nâng cấp, kiểm tra quyền nâng cao và quản lý thanh toán cho tài khoản. Quyền Plus chỉ mở sau khi hệ thống xác nhận giao dịch."
      />

      {paidCheckoutDisabled && (
        <div
          data-testid="paid-checkout-disabled-banner"
          className="rounded-card border border-app-warm-border bg-app-warm-soft p-4"
        >
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-app-warm" />
            <div className="flex-1">
              <p className="font-medium text-app-ink">Thanh toán đang tạm khóa.</p>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu
                cần nâng cấp thủ công: {" "}
                {BILLING_SUPPORT_EMAIL ? (
                  <a
                    href={`mailto:${BILLING_SUPPORT_EMAIL}`}
                    className="font-medium text-app-ink underline-offset-4 hover:underline"
                  >
                    {BILLING_SUPPORT_EMAIL}
                  </a>
                ) : (
                  "đội hỗ trợ"
                )}
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Checkout return status */}
      {checkoutReturnStatus === "pending" && (
        <div className="rounded-card border border-app-line bg-app-warm-soft p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-app-warm" />
            <div>
              <p className="font-medium text-app-ink">Đang chờ xác nhận thanh toán</p>
              <p className="text-sm text-app-ink-soft">
                Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận.
              </p>
            </div>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "confirmed" && (
        <div className="rounded-card border border-app-accent-soft bg-app-accent-soft p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-app-accent" />
            <div>
              <p className="font-medium text-app-ink">Thanh toán đã xác nhận</p>
              <p className="text-sm text-app-ink-soft">Quyền Plus đã được kích hoạt trên tài khoản của bạn.</p>
            </div>
            <Button asChild size="sm" className="ml-auto bg-app-accent text-white hover:bg-[#284f45]">
              <Link to="/12-week-system">Bắt đầu kế hoạch 12 tuần</Link>
            </Button>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "failed" && (
        <div className="rounded-card border border-app-line bg-[color:var(--color-danger-bg)] p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[color:var(--color-danger-fg)]" />
            <div>
              <p className="font-medium text-[color:var(--color-danger-fg)]">Không thể kiểm tra thanh toán</p>
              <p className="text-sm text-app-ink-soft">Vui lòng nhấn "Kiểm tra quyền" bên dưới hoặc thử lại sau.</p>
            </div>
            <Button variant="outline" size="sm" onClick={pollServerEntitlement} className="ml-auto">
              Thử lại
            </Button>
          </div>
        </div>
      )}

      {shouldShowExpiryNotice && (
        <div
          className={`rounded-card p-4 ${isExpired ? "border-app-line bg-[color:var(--color-danger-bg)]" : "border-app-line bg-app-warm-soft"}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 h-5 w-5 ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-warm"}`}
            />
            <div className="flex-1">
              <p className={`font-medium ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-ink"}`}>
                {isInRenewalPriority
                  ? `Đang trong giai đoạn ưu tiên gia hạn — còn ${graceState.daysRemaining} ngày`
                  : isExpired
                    ? "Gói Plus đã hết hạn"
                    : `Gói Plus còn ${expiryInfo.daysLeft ?? 0} ngày`}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-ink-soft"}`}
              >
                {isInRenewalPriority
                  ? "Quyền Plus vẫn được giữ trong thời gian này. Gia hạn ngay để không bị tạm dừng."
                  : isExpired
                    ? "Quyền Plus đã được thu hồi. Gia hạn để mở lại mẫu nâng cao, góc nhìn review và thống kê."
                    : `Chu kỳ hiện tại hết hạn ngày ${formatBillingExpiryDate(expiryInfo.expiresAt)}. Gia hạn sớm để không bị gián đoạn quyền Plus.`}
              </p>
            </div>
            <Button
              onClick={handleRenewPlan}
              disabled={paidCheckoutDisabled}
              className="ml-auto bg-app-accent text-white hover:bg-[#284f45]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {paidCheckoutDisabled
                ? "Tạm khóa thanh toán"
                : isInRenewalPriority
                  ? "Gia hạn ngay"
                  : "Gia hạn Plus"}
            </Button>
          </div>
        </div>
      )}

      <BillingTrustSignals supportEmail={BILLING_SUPPORT_EMAIL} />

      {/* Current plan */}
      <SectionBlock title="Khu vực gói đang dùng" headerVisuallyHidden>
        <PrimaryActionCard
          title="Gói hiện tại"
          titleAs="h2"
          titleClassName="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          eyebrow="Tài khoản"
          icon={<Crown className="h-4 w-4" />}
          description={
            currentPlanCode === "FREE"
              ? "Bạn đang dùng gói miễn phí."
              : `Bạn đang dùng ${currentPlanName} trên tài khoản này và có thể tiếp tục trên thiết bị khác sau khi đăng nhập.`
          }
          action={
            isInRenewalPriority && realMode ? (
              <Button className="w-full sm:w-auto" onClick={handleRenewPlan} disabled={paidCheckoutDisabled}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Gia hạn ngay"}
              </Button>
            ) : currentPlanCode === "FREE" ? (
              <Button
                className="w-full bg-app-accent text-white hover:bg-[#284f45] sm:w-auto"
                onClick={() => handleOpenUpgrade("plan")}
                disabled={paidCheckoutDisabled}
                data-testid="billing-plan-upgrade-cta"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Nâng cấp Plus"}
              </Button>
            ) : realMode || billingStatus.manageBillingReady ? (
              <Button
                variant="outline"
                onClick={handleOpenPortal}
                disabled={isOpeningPortal || !billingStatus.manageBillingReady}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {billingStatus.manageBillingReady ? (isOpeningPortal ? "Đang mở…" : "Quản lý gói") : "Đang chuẩn bị"}
              </Button>
            ) : null
          }
          actionClassName="pt-1"
          contentClassName="stack-stack"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={
                currentPlanCode !== "FREE"
                  ? "border-app-accent-soft bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-bg text-app-ink-muted"
              }
            >
              {currentPlanName}
            </Badge>
            {currentPlanDefinition && (
              <span className="text-sm text-app-ink-muted">{currentPlanDefinition.priceLabel}</span>
            )}
            {isInRenewalPriority ? (
              <Badge variant="outline" className="border-app-line bg-app-warm-soft text-app-warm">
                Còn {graceState.daysRemaining} ngày để gia hạn ưu tiên
              </Badge>
            ) : isExpired ? (
              <Badge
                variant="outline"
                className="border-app-line bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]"
              >
                Đã hết hạn
              </Badge>
            ) : null}
          </div>

          {isPaidPlan && (
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Gia hạn</p>
                <p className="font-medium text-app-ink">{renewalLabel}</p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Đơn vị thanh toán</p>
                <p className="flex items-center gap-2 font-medium text-app-ink">
                  <CreditCard className="h-4 w-4 text-app-ink-muted" />
                  Thanh toán qua {providerLabel}
                </p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Trạng thái</p>
                <p className="font-medium text-app-ink">
                  {isInRenewalPriority
                    ? "Đang chờ gia hạn ưu tiên"
                    : subscription?.status === "active"
                      ? "Đang hoạt động"
                      : subscription?.status === "trialing"
                        ? "Đang trong thời gian ưu đãi"
                        : subscription?.status === "canceled"
                          ? "Đã hủy"
                          : subscription
                            ? "Không hoạt động"
                            : "Đang chuẩn bị"}
                </p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Chu kỳ</p>
                <p className="font-medium text-app-ink">
                  {subscription?.billingCycle === "monthly"
                    ? "Tháng"
                    : subscription?.billingCycle === "quarterly"
                      ? "Quý"
                      : subscription
                        ? "Trọn chu kỳ"
                        : "Đang chuẩn bị"}
                </p>
              </div>
            </div>
          )}

          {currentPlanCode !== "FREE" && (
            <div className="grid gap-3 pt-2 sm:flex sm:flex-wrap">
              {realMode && (
                <Button
                  onClick={handleRenewPlan}
                  disabled={paidCheckoutDisabled}
                  className="bg-app-accent text-white hover:bg-[#284f45]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {paidCheckoutDisabled
                    ? "Tạm khóa thanh toán"
                    : isInRenewalPriority
                      ? "Gia hạn ngay"
                      : "Gia hạn Plus"}
                </Button>
              )}
              {realMode && (
                <Button
                  variant="outline"
                  className="border-app-line text-app-ink hover:bg-app-bg"
                  onClick={() => setShowStopUsingConfirm(true)}
                >
                  Tôi không muốn dùng nữa
                </Button>
              )}
              {realMode && (
                <Button
                  variant="outline"
                  className="border-app-line text-app-warm hover:bg-app-warm-soft"
                  onClick={handleRequestUnusedCycleRefund}
                >
                  Yêu cầu hoàn tiền cho chu kỳ chưa dùng
                </Button>
              )}
            </div>
          )}
        </PrimaryActionCard>
        <AlertDialog open={showStopUsingConfirm} onOpenChange={setShowStopUsingConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ghi nhận bạn không muốn dùng nữa?</AlertDialogTitle>
              <AlertDialogDescription>
                Plus hiện không tự động gia hạn, nên không có auto-renewal cần hủy. Quyền Plus vẫn hoạt động đến{" "}
                {cancelEffectiveDate}. Nếu muốn hoàn tiền cho phần chu kỳ chưa dùng và đơn còn đủ điều kiện, hãy gửi yêu
                cầu hoàn tiền riêng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Tiếp tục dùng Plus</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStopUsing}>Tôi đã hiểu</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionBlock>

      {/* Payment history */}
      {realMode && (
        <SectionBlock title="Khu vực lịch sử thanh toán" headerVisuallyHidden>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-sky-600" />
                Lịch sử thanh toán
              </CardTitle>
              <CardDescription>
                Các giao dịch gần đây của tài khoản này qua đơn vị thanh toán đang cấu hình.
              </CardDescription>
            </CardHeader>
            <CardContent className="stack-stack">
              {isLoadingPaymentHistory && (
                <div className="flex items-center gap-3 rounded-lg border border-app-line bg-app-bg p-4 text-sm text-app-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải lịch sử thanh toán...
                </div>
              )}

              {!isLoadingPaymentHistory && paymentHistoryError && (
                <div className="flex flex-col gap-3 rounded-lg border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[color:var(--color-danger-fg)]">{paymentHistoryError}</p>
                  <Button variant="outline" size="sm" onClick={loadPaymentHistory}>
                    Thử lại
                  </Button>
                </div>
              )}

              {!isLoadingPaymentHistory && !paymentHistoryError && paymentHistory.length === 0 && (
                <div className="rounded-lg border border-app-line bg-app-bg p-4">
                  <p className="text-sm font-medium text-app-ink">Chưa có giao dịch nào.</p>
                  <p className="mt-1 text-sm text-app-ink-muted">
                    Khi đơn vị thanh toán gửi lịch sử thanh toán, giao dịch và hóa đơn sẽ xuất hiện tại đây.
                  </p>
                </div>
              )}

              {!isLoadingPaymentHistory && !paymentHistoryError && paymentHistory.length > 0 && (
                <div className="divide-y divide-app-line overflow-hidden rounded-lg border border-app-line bg-app-surface">
                  {paymentHistory.map((order) => (
                    <div key={order.orderId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-app-ink">{order.orderId}</p>
                          <Badge variant="outline" className={getPaymentStatusClassName(order.status)}>
                            {getPaymentStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-app-ink-muted">
                          {getBillingCycleLabel(order.billingCycle)} · {formatPaymentDate(order.createdAt)}
                        </p>
                        {order.status === "completed" && (
                          <div className="mt-1 space-y-1 text-xs">
                            <p className="text-app-accent">Xác nhận lúc {formatPaymentDate(order.completedAt)}</p>
                            {order.receiptSentAt ? (
                              <p className="text-app-accent">
                                ✓ Biên nhận đã gửi ngày {formatPaymentDate(order.receiptSentAt)}
                              </p>
                            ) : (
                              <p className="text-app-warm">Biên nhận chưa ghi nhận đã gửi.</p>
                            )}
                            {order.refundRequest ? (
                              <p className="text-app-warm">
                                Hoàn tiền: {getRefundStatusLabel(order.refundRequest.status)}
                                {order.refundRequest.createdAt
                                  ? ` — gửi lúc ${formatPaymentDate(order.refundRequest.createdAt)}`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <p className="font-semibold text-app-ink">
                          {formatPaymentAmount(order.amount, order.currency)}
                        </p>
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (paidCheckoutDisabled) return;
                              navigate(`/billing/checkout/${encodeURIComponent(order.orderId)}`);
                            }}
                            disabled={paidCheckoutDisabled}
                            className="border-app-line hover:bg-app-bg"
                          >
                            {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Tiếp tục thanh toán"}
                          </Button>
                        )}
                        {order.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendReceipt(order.orderId)}
                            disabled={resendingReceiptOrderId === order.orderId}
                            className="border-app-line hover:bg-app-bg"
                          >
                            {resendingReceiptOrderId === order.orderId ? "Đang gửi..." : "Gửi lại biên nhận"}
                          </Button>
                        )}
                        {order.status === "completed" && !order.refundRequest && isOrderRefundEligible(order) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-app-line text-app-warm hover:bg-app-warm-soft"
                            onClick={() => openRefundDialog(order)}
                            disabled={emailNeedsVerification}
                            title={
                              emailNeedsVerification ? "Bạn cần xác minh email trước khi yêu cầu hoàn tiền." : undefined
                            }
                          >
                            Yêu cầu hoàn tiền
                          </Button>
                        )}
                        {order.invoiceUrl ? (
                          <Button variant="outline" size="sm" asChild className="border-app-line hover:bg-app-bg">
                            <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                              Xem hóa đơn
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </SectionBlock>
      )}

      {/* Billing support */}
      {realMode && (
        <SectionBlock title="Khu vực hỗ trợ thanh toán" headerVisuallyHidden>
          <div className="rounded-card border border-app-line bg-app-surface p-6 md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-app-accent" />
              <h2 className="text-lg font-semibold text-app-ink">Hỗ trợ thanh toán</h2>
            </div>
            <p className="mb-6 text-sm text-app-ink-muted">
              Nếu đơn vị thanh toán đã xác nhận nhưng Plus chưa mở sau vài phút, gửi mã đơn để kiểm tra thủ công.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                <p className="text-sm text-app-ink-muted">Email hỗ trợ</p>
                <p className="mt-1 font-medium text-app-ink">{BILLING_SUPPORT_EMAIL || "Chưa cấu hình email hỗ trợ"}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-app-line text-app-ink hover:bg-app-bg"
                  onClick={handleCopySupportMessage}
                >
                  Sao chép nội dung hỗ trợ
                </Button>
                {BILLING_SUPPORT_EMAIL ? (
                  <Button asChild className="bg-app-accent text-white hover:bg-[#284f45]">
                    <a
                      href={`mailto:${BILLING_SUPPORT_EMAIL}?subject=${encodeURIComponent(
                        "Hỗ trợ thanh toán Dear Our Future",
                      )}`}
                    >
                      Liên hệ hỗ trợ
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" className="border-app-line text-app-ink-muted hover:bg-app-bg" disabled>
                    Chưa cấu hình email
                  </Button>
                )}
              </div>
              <p className="border-t border-app-line pt-3 text-xs leading-5 text-app-ink-muted">
                Khi tiếp tục thanh toán, bạn đồng ý với{" "}
                <Link
                  to="/terms"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Điều khoản
                </Link>
                ,{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Chính sách bảo mật
                </Link>{" "}
                và{" "}
                <Link
                  to="/refund-policy"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Chính sách hoàn tiền
                </Link>
                . Xem thêm{" "}
                <Link
                  to="/billing/faq"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  câu hỏi thanh toán
                </Link>
                .
              </p>
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Entitlements */}
      <SectionBlock title="Khu vực quyền truy cập" headerVisuallyHidden>
        <div className="rounded-card border border-app-line bg-app-surface p-6 md:p-8">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-app-accent" />
            <h2 className="text-lg font-semibold text-app-ink">Quyền truy cập</h2>
          </div>
          <p className="mb-6 text-sm text-app-ink-muted">
            {realMode
              ? "Quyền nâng cao được quản lý qua tài khoản của bạn."
              : "Các quyền Plus đang mở trên trình duyệt này."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {premiumStatusItems.map((key) => {
              const isActive = entitlementKeys.includes(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-4 ${
                    isActive ? "border-app-accent-soft bg-app-accent-soft" : "border-app-line bg-app-bg"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive ? "bg-app-accent text-white" : "bg-app-line text-app-ink-muted"
                    }`}
                  >
                    {isActive ? <Check className="h-4 w-4" /> : <span className="text-app-ink-muted">—</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-app-accent" : "text-app-ink-soft"}`}>
                      {getEntitlementLabel(key)}
                    </p>
                    <p className="text-xs text-app-ink-muted">
                      {isActive ? (realMode ? "Đang hoạt động" : "Đang mở") : realMode ? "Chưa kích hoạt" : "Chưa mở"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionBlock>

      {/* Actions */}
      <SectionBlock title="Khu vực thao tác gói" headerVisuallyHidden>
        <div className="rounded-card border border-app-line bg-app-surface p-6 md:p-8">
          <h2 className="mb-2 text-lg font-semibold text-app-ink">Thao tác</h2>
          <p className="mb-6 text-sm text-app-ink-muted">
            Kiểm tra quyền nâng cao, khôi phục giao dịch đã mua hoặc quay lại trang chính.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleSyncEntitlements}
              disabled={isSyncing}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Đang kiểm tra…" : "Kiểm tra quyền nâng cao"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestoreAccess}
              disabled={isRestoring}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              {isRestoring ? "Đang khôi phục…" : "Khôi phục quyền đã mua"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              Quay lại Trang chính
            </Button>
          </div>

          {(lastEntitlementSync || lastRestoreAccess) && (
            <div className="mt-6 stack-tight text-xs text-app-ink-muted">
              {lastEntitlementSync && (
                <p>
                  Kiểm tra quyền gần nhất: {formatDate(lastEntitlementSync.at)} — {lastEntitlementSync.message}
                </p>
              )}
              {lastRestoreAccess && (
                <p>
                  Khôi phục gần nhất: {formatDate(lastRestoreAccess.at)} — {lastRestoreAccess.message}
                </p>
              )}
            </div>
          )}
        </div>
      </SectionBlock>

      {/* Billing provider info (debug only) */}
      {shouldShowBillingDebugUi() && (
        <div className="rounded-card border border-app-line bg-app-surface p-6 md:p-8">
          <h2 className="mb-2 text-sm font-semibold text-app-ink">Thông tin nhà cung cấp thanh toán</h2>
          <div className="grid gap-2 text-xs text-app-ink-muted sm:grid-cols-2">
            <div>
              <span className="text-app-ink-muted">Nhà cung cấp: </span>
              {getBillingProviderModeLabel(billingStatus.mode)}
              {billingStatus.providerLabel && ` (${billingStatus.providerLabel})`}
            </div>
            <div>
              <span className="text-app-ink-muted">Thanh toán: </span>
              {getBillingReadinessLabel(billingStatus.checkoutReady)}
            </div>
            <div>
              <span className="text-app-ink-muted">Khôi phục: </span>
              {getBillingReadinessLabel(billingStatus.restoreReady)}
            </div>
            <div>
              <span className="text-app-ink-muted">Đồng bộ quyền: </span>
              {getBillingReadinessLabel(billingStatus.entitlementSyncReady)}
            </div>
          </div>
        </div>
      )}

      {/* Compare plans */}
      <SectionBlock title="Khu vực so sánh gói" headerVisuallyHidden>
        <div className="rounded-card border border-app-line bg-app-surface p-6 md:p-8">
          <h2 className="mb-2 text-lg font-semibold text-app-ink">So sánh các gói</h2>
          <p className="mb-6 text-sm text-app-ink-muted">Chọn gói phù hợp với nhu cầu của bạn.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {PLAN_DEFINITIONS.map((plan) => {
              const isPlus = plan.code === "PLUS";
              const isCurrent = plan.code === currentPlanCode;
              const isRecommended = isPlus && currentPlanCode === "FREE";
              return (
                <div
                  key={plan.code}
                  className={`relative rounded-card border p-6 ${
                    isCurrent
                      ? "border-app-accent bg-app-accent-soft"
                      : isRecommended
                        ? "border-app-accent ring-1 ring-app-accent/30 bg-app-surface"
                        : "border-app-line bg-app-surface"
                  }`}
                >
                  <div className="mb-4">
                    <span className="mb-2 inline-block rounded-full bg-app-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider text-app-ink-muted">
                      {plan.shortLabel}
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-app-ink">{plan.name}</h3>
                    <p className="mt-1 text-3xl font-medium text-app-ink">{plan.priceLabel}</p>
                    <p className="mt-2 text-sm text-app-ink-soft">{plan.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-app-ink-soft">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {isRecommended && (
                    <Button
                      className="mt-6 w-full bg-app-accent text-white hover:bg-[#284f45]"
                      onClick={() => handleOpenUpgrade("plan")}
                      disabled={paidCheckoutDisabled}
                    >
                      {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Nâng cấp Plus"}
                    </Button>
                  )}
                  {isCurrent && !isPlus && (
                    <Button
                      className="mt-6 w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                      variant="outline"
                    >
                      Gói hiện tại
                    </Button>
                  )}
                  {isCurrent && isPlus && (
                    <Button
                      className="mt-6 w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                      variant="outline"
                    >
                      Đang dùng
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
