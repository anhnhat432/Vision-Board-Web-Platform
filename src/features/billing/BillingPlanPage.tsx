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
  TicketPercent,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { apiClient, toAppError } from "@/lib/api/apiClient";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { ScreenGuide } from "../../app/components/ScreenGuide";
import { SCREEN_GUIDES } from "../../app/components/screen-guides";
import { UpgradePaywallDialog } from "../../app/components/UpgradePaywallDialog";
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
import { isPaidCheckoutDisabled, isRealMode, shouldShowBillingDebugUi } from "../../app/utils/app-mode";
import { getBillingProviderModeLabel, getBillingReadinessLabel } from "../../app/utils/billing-contract";
import { formatBillingExpiryDate, getBillingExpiryInfo } from "../../app/utils/billing-expiry";
import { getSubscriptionGraceState } from "../../app/utils/billing-grace-period";
import { logBillingUiError, toastBillingNetworkError } from "../../app/utils/billing-ui-monitoring";
import {
  canRequestRefund,
  getEmailVerificationRequiredMessage,
  rememberEmailVerificationReturnPath,
} from "../../app/utils/email-verification-guard";
import { trackPaywallCtaClicked } from "../../app/utils/monetization-analytics";
import {
  getBillingProviderStatus,
  getLastEntitlementSyncSnapshot,
  getLastRestoreAccessSnapshot,
  cancelSubscriptionOnServer,
  openBillingCustomerPortal,
  resolveAppReturnPath,
  restorePlanAccess,
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
import {
  BILLING_SUPPORT_EMAIL,
  formatPaymentAmount,
  formatPaymentDate,
  getBillingCycleLabel,
  getPaymentStatusClassName,
  getPaymentStatusLabel,
  getRefundStatusLabel,
  getRefundWindowDays,
  isOrderRefundEligible,
} from "./helpers";
import type {
  PaymentHistoryOrder,
  PaymentHistoryRefundRequest,
  RefundFormState,
  RefundRequestResponse,
  ResendReceiptResponse,
} from "./types";
import { useCheckoutReturn } from "./useCheckoutReturn";
import { usePaymentHistory } from "./usePaymentHistory";
import { useCouponValidation, type DiscountInfo } from "./useCouponValidation";
import { PLUS_MONTHLY_PRICE_VND, formatVndAmount } from "@/app/utils/billing-pricing";

interface SaleEventInfo {
  name: string;
  discountPercent?: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  discountAmount?: number;
  finalAmount?: number;
  endsAt?: string | null;
}

function getNumberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getPlusSaleFallbackFinalAmount(saleEvent: SaleEventInfo): number {
  const discountAmount = saleEvent.discountAmount ?? (saleEvent.discountPercent
    ? Math.round(PLUS_MONTHLY_PRICE_VND * saleEvent.discountPercent / 100)
    : saleEvent.discountValue ?? 0);
  return Math.max(PLUS_MONTHLY_PRICE_VND - discountAmount, 1000);
}

function getSaleBadgeLabel(saleEvent: SaleEventInfo): string | null {
  if (saleEvent.discountPercent) return `-${saleEvent.discountPercent}%`;
  if (saleEvent.discountValue) return `-${formatVndAmount(saleEvent.discountValue)}`;
  if (saleEvent.discountAmount) return `-${formatVndAmount(saleEvent.discountAmount)}`;
  return null;
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
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [cancelSubscriptionMessage, setCancelSubscriptionMessage] = useState<string | null>(null);
  const [showStopUsingConfirm, setShowStopUsingConfirm] = useState(false);
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

  // Coupon validation
  const {
    status: couponStatus,
    discount: couponDiscount,
    error: couponError,
    validate: validateCoupon,
    reset: resetCoupon,
  } = useCouponValidation({ planCode: "PLUS", purpose: "plus_subscription", originalAmount: PLUS_MONTHLY_PRICE_VND });
  const [couponCode, setCouponCode] = useState(sessionStorage.getItem("billing:couponCode") ?? "");

  const handleCouponChange = useCallback((discount: DiscountInfo | null) => {
    try {
      if (discount?.discountCode) {
        sessionStorage.setItem("billing:couponCode", discount.discountCode);
      } else {
        sessionStorage.removeItem("billing:couponCode");
      }
    } catch { /* non-critical */ }
  }, []);

  // Sync coupon validation state with sessionStorage
  useEffect(() => {
    if (couponStatus === "valid" && couponDiscount) {
      handleCouponChange(couponDiscount);
    } else if (couponStatus === "invalid" || couponStatus === "idle") {
      handleCouponChange(null);
    }
  }, [couponStatus, couponDiscount, handleCouponChange]);

  const returnStatus = searchParams.get("status");
  const isCheckoutReturn = returnStatus === "success" && realMode;
  const signedInUserId = authContext?.user?.uid ?? null;
  const authLoading = authContext?.authLoading ?? false;
  const emailNeedsVerification = authContext?.user ? !canRequestRefund(authContext.user) : false;
  const canLoadPaymentHistory = realMode && signedInUserId !== null && !emailNeedsVerification;

  const { paymentHistory, setPaymentHistory, isLoadingPaymentHistory, paymentHistoryError, loadPaymentHistory } =
    usePaymentHistory(canLoadPaymentHistory);
  const paymentHistoryState = !canLoadPaymentHistory
    ? signedInUserId === null
      ? "signed-out"
      : "email-unverified"
    : isLoadingPaymentHistory
      ? "loading"
      : paymentHistoryError
        ? "error"
        : paymentHistory.length === 0
          ? "empty"
          : "ready";

  const { checkoutReturnStatus, retry: retryCheckoutEntitlement } = useCheckoutReturn({
    isCheckoutReturn,
    searchParams,
    setSearchParams,
    reloadUserData,
  });

  const billingStatus = useMemo(() => getBillingProviderStatus(), []);
  const paidCheckoutDisabled = isPaidCheckoutDisabled();
  const profileEmail = authContext?.user?.email?.trim() ?? "";
  const subscription = userData.subscription;
  const expiryInfo = useMemo(() => getBillingExpiryInfo(subscription), [subscription]);
  const graceState = useMemo(() => getSubscriptionGraceState(userData), [userData]);

  const [saleEvent, setSaleEvent] = useState<SaleEventInfo | null>(null);
  const canLoadSaleEvent = !realMode || (!authLoading && signedInUserId !== null);

  useEffect(() => {
    if (!canLoadSaleEvent) {
      setSaleEvent(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      purpose: "plus_subscription",
      amount: String(PLUS_MONTHLY_PRICE_VND),
    });

    apiClient.get<{ active: boolean } & Record<string, unknown>>(`/billing/active-sale-event?${params.toString()}`).then((data) => {
      if (cancelled) return;
      if (data?.active) {
        const discountType = data.discountType === "percentage" || data.discountType === "fixed" ? data.discountType : undefined;
        setSaleEvent({
          name: typeof data.name === "string" && data.name.trim() ? data.name : "Đang giảm giá",
          discountPercent: discountType === "percentage" ? getNumberField(data.discountValue) : undefined,
          discountValue: discountType === "fixed" ? getNumberField(data.discountValue) : undefined,
          discountType,
          discountAmount: getNumberField(data.discountAmount),
          finalAmount: getNumberField(data.finalAmount),
          endsAt: typeof data.endsAt === "string" ? data.endsAt : null,
        });
      } else {
        setSaleEvent(null);
      }
    }).catch(() => { /* sale event is optional */ });
    return () => { cancelled = true; };
  }, [canLoadSaleEvent]);

  const lastEntitlementSync = useMemo(() => getLastEntitlementSyncSnapshot(), []);
  const lastRestoreAccess = useMemo(() => getLastRestoreAccessSnapshot(), []);
  const latestRefundEligibleOrder = useMemo(
    () => paymentHistory.find((order) => isOrderRefundEligible(order) && !order.refundRequest) ?? null,
    [paymentHistory],
  );

  const handleOpenUpgrade = (context: PremiumFeatureContext = "plan") => {
    if (paidCheckoutDisabled) {
      toast.info(
        "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ support để mở Plus thủ công.",
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
  const isPendingCancellation = Boolean(subscription?.cancelAtPeriodEnd && subscription?.status !== "canceled");
  const scheduleLabel = isPendingCancellation ? "Kết thúc" : "Gia hạn";
  const renewalLabel =
    isPaidPlan && subscription?.renewsAt
      ? `${isPendingCancellation ? "Kết thúc" : "Gia hạn"} ngày ${formatDate(subscription.renewsAt)}`
      : isPaidPlan
        ? `${isPendingCancellation ? "Kết thúc" : "Gia hạn"} ngày Đang chuẩn bị`
        : null;
  const cancelEffectiveDate =
    subscription?.renewsAt && formatDate(subscription.renewsAt) !== "—"
      ? formatDate(subscription.renewsAt)
      : "ngày kết thúc chu kỳ hiện tại";
  const persistentCancelMessage = isPendingCancellation
    ? `Plus sẽ kết thúc vào ${cancelEffectiveDate}. Bạn vẫn dùng gói đến hết chu kỳ hiện tại.`
    : null;
  const cancelBannerMessage = cancelSubscriptionMessage ?? persistentCancelMessage;

  const isInRenewalPriority = graceState.inGracePeriod;
  const isExpired = expiryInfo.isExpired && !graceState.active;
  const shouldShowExpiryNotice =
    realMode && subscription?.planCode === "PLUS" && (isInRenewalPriority || expiryInfo.isExpiringSoon || isExpired);

  const handleConfirmStopUsing = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsCancelingSubscription(true);
    try {
      const result = await cancelSubscriptionOnServer();
      if (result.ok) {
        setCancelSubscriptionMessage(result.message);
        setShowStopUsingConfirm(false);
        toast.success(result.message);
        reloadUserData();
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "cancel_subscription" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "cancel_subscription" });
        toast.error("Không thể hủy gói lúc này. Vui lòng thử lại.");
      }
    } finally {
      setIsCancelingSubscription(false);
    }
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
        "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. Nếu bạn muốn gia hạn ngay, liên hệ support để xử lý thủ công.",
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

  // Compute discount info
  const activeDiscount = couponDiscount?.valid ? couponDiscount : null;
  const effectiveSaleEvent = saleEvent;
  const saleFinalAmount = effectiveSaleEvent?.finalAmount ?? (effectiveSaleEvent ? getPlusSaleFallbackFinalAmount(effectiveSaleEvent) : undefined);
  const displayDiscountAmount = activeDiscount
    ? (activeDiscount.discountAmount ?? (activeDiscount.discountPercent ? Math.round(PLUS_MONTHLY_PRICE_VND * activeDiscount.discountPercent / 100) : activeDiscount.discountValue ?? 0))
    : undefined;
  const displayFinalAmount = activeDiscount?.finalAmount ?? (displayDiscountAmount ? Math.max(PLUS_MONTHLY_PRICE_VND - displayDiscountAmount, 1000) : undefined);
  const hasActiveDiscount = activeDiscount !== null || effectiveSaleEvent !== null;
  const couponInputId = "billing-coupon-code";
  const couponHelpId = "billing-coupon-help";
  const couponErrorId = "billing-coupon-error";
  const couponDescribedBy = couponStatus === "invalid" && couponError
    ? `${couponHelpId} ${couponErrorId}`
    : couponHelpId;

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-[18px] px-4 pb-16 pt-4 sm:px-6 lg:px-9">
      <ScreenGuide {...SCREEN_GUIDES.billingPlan} autoOpen />

      {/* ===== DIALOGS (giữ nguyên logic) ===== */}
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
              <label htmlFor="refund-order-id" className="text-sm font-medium text-app-ink">Mã đơn hàng</label>
              <Input id="refund-order-id" value={refundForm.orderId} readOnly className="bg-app-bg" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-contact-email" className="text-sm font-medium text-app-ink">Email liên hệ</label>
              <Input id="refund-contact-email" type="email" value={refundForm.contactEmail} onChange={(event) => setRefundForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-reason" className="text-sm font-medium text-app-ink">Lý do hoàn tiền</label>
              <Textarea id="refund-reason" value={refundForm.reason} onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Cho chúng tôi biết lý do bạn muốn hoàn tiền." />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-account" className="text-sm font-medium text-app-ink">Số tài khoản ngân hàng nhận tiền hoàn</label>
              <Input id="refund-account" value={refundForm.refundAccount} onChange={(event) => setRefundForm((current) => ({ ...current, refundAccount: event.target.value }))} placeholder="Ngân hàng - Số TK - Chủ TK" />
              <p className="text-xs leading-5 text-app-ink-muted">Đây là thông tin PII, chỉ dùng để support chuyển khoản hoàn tiền thủ công.</p>
            </div>
            {refundFormError ? (
              <div className="rounded-lg border border-app-status-error/20 bg-app-status-error/8 p-3 text-sm text-app-status-error">{refundFormError}</div>
            ) : null}
            {emailNeedsVerification ? (
              <div className="rounded-lg border border-app-line bg-app-warm-soft p-3 text-sm text-app-warm">Bạn cần xác minh email tài khoản trước khi yêu cầu hoàn tiền.</div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundDialogOrder(null)} disabled={isSubmittingRefund}>Huỷ</Button>
            <Button type="button" onClick={handleSubmitRefundRequest} disabled={!canSubmitRefundRequest || emailNeedsVerification}>
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

      {/* ===== HERO ===== */}
      <section className="relative grid items-center gap-7 overflow-hidden rounded-[22px] border border-app-line bg-white px-8 py-8 sm:px-[34px] sm:py-[34px] lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-[13px] flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-app-accent" />
            Gói &amp; thanh toán
          </div>
          <h1 className="font-serif text-[clamp(26px,3vw,38px)] font-extrabold leading-[1.03] tracking-[-0.02em] text-app-ink mb-[13px]">
            Chọn gói phù hợp với bạn
          </h1>
          <p className="max-w-[50ch] text-[14.5px] leading-[1.55] text-app-ink-soft">
            Nâng cấp, kiểm tra quyền nâng cao và quản lý thanh toán cho tài khoản. Quyền Plus chỉ mở sau khi hệ thống xác nhận giao dịch.
          </p>
        </div>
        <div className="relative flex min-h-[180px] items-center justify-center self-stretch rounded-[18px] border border-[rgba(12,94,58,0.12)] bg-gradient-to-br from-app-accent-subtle to-[#F4ECDD]">
          <span className="absolute h-[120px] w-[120px] animate-[dof-ring_3s_ease-out_infinite] rounded-full border-2 border-app-accent/30" />
          <span className="relative flex h-24 w-24 items-center justify-center text-app-accent">
            <Shield className="h-24 w-24" strokeWidth={1.4} aria-hidden="true" />
          </span>
        </div>
      </section>

      {/* ===== TRUST ===== */}
      <section className="rounded-[18px] border border-app-line bg-white px-[26px] py-6">
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <div>
            <div className="mb-[5px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-app-accent">Tin cậy khi thanh toán</div>
            <h2 className="font-serif text-[18px] font-bold tracking-[-0.01em] text-app-ink">Chuyển khoản rõ ràng, hỗ trợ sau thanh toán.</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-app-accent/20 bg-app-accent-subtle py-[5px] pl-[5px] pr-[6px]">
            <span className="rounded-full bg-app-accent px-[6px] py-[3px] font-mono text-[10px] font-bold text-white">VN</span>
            <span className="pr-[6px] text-xs font-semibold text-app-accent">Bank</span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-[13px] border border-app-line bg-[#FAF8F3] p-[15px_17px]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-app-accent-subtle text-app-accent">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[13px] leading-[1.45] text-app-ink-soft">Thanh toán tự động được xác nhận qua nhà cung cấp thanh toán.</span>
          </div>
          <div className="flex items-start gap-3 rounded-[13px] border border-app-line bg-[#FAF8F3] p-[15px_17px]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-app-accent-subtle text-app-accent">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[13px] leading-[1.45] text-app-ink-soft">Biên nhận điện tử gửi qua email trong 1–2 phút.</span>
          </div>
          <div className="flex items-start gap-3 rounded-[13px] border border-app-line bg-[#FAF8F3] p-[15px_17px]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-app-accent-subtle text-app-accent">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[13px] leading-[1.45] text-app-ink-soft">Hoàn tiền linh hoạt theo{" "}<strong className="font-semibold text-app-ink">chính sách hoàn tiền</strong>.</span>
          </div>
          <div className="flex items-start gap-3 rounded-[13px] border border-app-line bg-[#FAF8F3] p-[15px_17px]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-app-accent-subtle text-app-accent">
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[13px] leading-[1.45] text-app-ink-soft">
              Liên hệ hỗ trợ:{" "}
              <strong className="font-semibold text-app-ink">
                {BILLING_SUPPORT_EMAIL ? (
                  <a href={`mailto:${BILLING_SUPPORT_EMAIL}`} className="hover:underline">{BILLING_SUPPORT_EMAIL}</a>
                ) : "support@dearourfuture.com"}
              </strong>{" "}— phản hồi trong 24h.
            </span>
          </div>
        </div>
      </section>

      {/* ===== BANNERS ===== */}
      {paidCheckoutDisabled && (
        <div data-testid="paid-checkout-disabled-banner" className="rounded-card border border-app-warm-border bg-app-warm-soft p-4">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-app-warm" />
            <div className="flex-1">
              <p className="font-medium text-app-ink">Thanh toán đang tạm khóa.</p>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ{" "}
                {BILLING_SUPPORT_EMAIL ? (
                  <a href={`mailto:${BILLING_SUPPORT_EMAIL}`} className="font-medium text-app-ink underline-offset-4 hover:underline">{BILLING_SUPPORT_EMAIL}</a>
                ) : ("đội hỗ trợ")}{" "}để mở Plus thủ công.
              </p>
            </div>
          </div>
        </div>
      )}

      {checkoutReturnStatus === "pending" && (
        <div className="rounded-card border border-app-line bg-app-warm-soft p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-app-warm" />
            <div><p className="font-medium text-app-ink">Đang chờ xác nhận thanh toán</p><p className="text-sm text-app-ink-soft">Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận.</p></div>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "confirmed" && (
        <div className="rounded-card border border-app-accent-soft bg-app-accent-soft p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-app-accent" />
            <div><p className="font-medium text-app-ink">Thanh toán đã xác nhận</p><p className="text-sm text-app-ink-soft">Quyền Plus đã được kích hoạt trên tài khoản của bạn.</p></div>
            <Button asChild size="sm" className="ml-auto bg-app-accent text-white hover:bg-app-accent"><Link to="/12-week-system">Bắt đầu kế hoạch 12 tuần</Link></Button>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "failed" && (
        <div className="rounded-card border border-app-status-error/20 bg-app-status-error/8 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-app-status-error" />
            <div><p className="font-medium text-app-status-error">Không thể kiểm tra thanh toán</p><p className="text-sm text-app-ink-soft">Vui lòng nhấn "Kiểm tra quyền" bên dưới hoặc thử lại sau.</p></div>
            <Button variant="outline" size="sm" onClick={retryCheckoutEntitlement} className="ml-auto">Thử lại</Button>
          </div>
        </div>
      )}

      {shouldShowExpiryNotice && (
        <div className={`rounded-card p-4 ${isExpired ? "border-app-status-error/20 bg-app-status-error/8" : "border-app-line bg-app-warm-soft"}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 ${isExpired ? "text-app-status-error" : "text-app-warm"}`} />
            <div className="flex-1">
              <p className={`font-medium ${isExpired ? "text-app-status-error" : "text-app-ink"}`}>
                {isInRenewalPriority ? `Đang trong giai đoạn ưu tiên gia hạn — còn ${graceState.daysRemaining} ngày` : isExpired ? "Gói Plus đã hết hạn" : `Gói Plus còn ${expiryInfo.daysLeft ?? 0} ngày`}
              </p>
              <p className={`mt-1 text-sm leading-6 ${isExpired ? "text-app-status-error" : "text-app-ink-soft"}`}>
                {isInRenewalPriority ? "Quyền Plus vẫn được giữ trong thời gian này. Gia hạn ngay để không bị tạm dừng." : isExpired ? "Quyền Plus đã được thu hồi. Gia hạn để mở lại mẫu nâng cao, góc nhìn review và thống kê." : `Chu kỳ hiện tại hết hạn ngày ${formatBillingExpiryDate(expiryInfo.expiresAt)}. Gia hạn sớm để không bị gián đoạn quyền Plus.`}
              </p>
            </div>
            <Button onClick={handleRenewPlan} disabled={paidCheckoutDisabled} className="ml-auto bg-app-accent text-white hover:bg-app-accent">
              <RefreshCw className="mr-2 h-4 w-4" />
              {paidCheckoutDisabled ? "Tạm khóa thanh toán" : isInRenewalPriority ? "Gia hạn ngay" : "Gia hạn Plus"}
            </Button>
          </div>
        </div>
      )}

      {/* ===== CURRENT PLAN ===== */}
      <section className="relative overflow-hidden rounded-[18px] border border-app-line bg-white px-[28px] py-[26px]">
        <div className="mb-[11px] flex items-center gap-[7px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-app-accent">
          <Crown className="h-3.5 w-3.5" />
          Tài khoản
        </div>
        <h2 className="mb-[5px] font-serif text-xl font-bold tracking-[-0.01em] text-app-ink">Gói hiện tại</h2>
        <p className="mb-4 text-[13.5px] text-app-ink-soft">
          {currentPlanCode === "FREE" ? "Bạn đang dùng gói miễn phí." : `Bạn đang dùng ${currentPlanName} trên tài khoản này và có thể tiếp tục trên thiết bị khác sau khi đăng nhập.`}
        </p>
        <div className="mb-5 flex items-center gap-[11px]">
          <span className={`inline-flex rounded-full border px-[13px] py-[5px] text-[11.5px] font-semibold ${
            currentPlanCode !== "FREE" ? "border-app-accent-soft bg-app-accent-soft text-app-accent" : "border-app-line bg-app-bg text-app-ink-soft"
          }`}>{currentPlanName}</span>
          <span className="font-mono text-sm font-semibold text-app-ink">
            {currentPlanCode !== "FREE" ? (currentPlanDefinition?.priceLabel ?? getPlanLabel(currentPlanCode)) : "0đ"}
          </span>
          {isInRenewalPriority ? (
            <span className="rounded-full border border-app-line bg-app-warm-soft px-3 py-1 text-xs font-semibold text-app-warm">Còn {graceState.daysRemaining} ngày để gia hạn ưu tiên</span>
          ) : isExpired ? (
            <span className="rounded-full border border-app-status-error/20 bg-app-status-error/8 px-3 py-1 text-xs font-semibold text-app-status-error">Đã hết hạn</span>
          ) : null}
        </div>

        {isInRenewalPriority && realMode ? (
          <Button onClick={handleRenewPlan} disabled={paidCheckoutDisabled} className="bg-app-accent text-white hover:bg-app-accent shadow-[0_12px_26px_-14px_rgba(12,94,58,0.8)]">
            <RefreshCw className="mr-2 h-4 w-4" />
            {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Gia hạn ngay"}
          </Button>
        ) : currentPlanCode === "FREE" ? (
          <Button
            onClick={() => handleOpenUpgrade("plan")}
            disabled={paidCheckoutDisabled}
            data-testid="billing-plan-upgrade-cta"
            className="inline-flex items-center gap-[9px] rounded-[11px] bg-app-accent px-[22px] py-3 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(12,94,58,0.8)] hover:bg-app-accent-hover"
          >
            <Sparkles className="h-[15px] w-[15px]" />
            {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Nâng cấp Plus"}
          </Button>
        ) : realMode || billingStatus.manageBillingReady ? (
          <Button
            variant="outline"
            onClick={handleOpenPortal}
            disabled={isOpeningPortal || !billingStatus.manageBillingReady}
            data-testid="billing-plan-manage-cta"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {billingStatus.manageBillingReady ? (isOpeningPortal ? "Đang mở…" : "Quản lý gói") : "Đang chuẩn bị"}
          </Button>
        ) : null}

        {isPaidPlan && (
          <>
            {cancelBannerMessage ? (
              <div
                className="mt-5 rounded-card border border-app-line bg-app-warm-soft p-4 text-sm leading-6 text-app-ink"
                data-testid="billing-cancel-at-period-end-result"
              >
                <p className="font-semibold text-app-warm">
                  {isPendingCancellation ? "Plus sẽ kết thúc vào cuối chu kỳ hiện tại." : "Đã ghi nhận yêu cầu hủy cuối kỳ."}
                </p>
                <p className="mt-1">{cancelBannerMessage}</p>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-card border border-app-line bg-app-bg p-4">
                <p className="text-xs text-app-ink-muted">{scheduleLabel}</p><p className="mt-1 text-sm font-medium text-app-ink">{renewalLabel}</p>
              </div>
              <div className="rounded-card border border-app-line bg-app-bg p-4">
                <p className="text-xs text-app-ink-muted">Đơn vị thanh toán</p><p className="mt-1 flex items-center gap-2 text-sm font-medium text-app-ink"><CreditCard className="h-4 w-4 text-app-ink-muted" />Thanh toán qua {providerLabel}</p>
              </div>
              <div className="rounded-card border border-app-line bg-app-bg p-4">
                <p className="text-xs text-app-ink-muted">Trạng thái</p>
                <p className="mt-1 text-sm font-medium text-app-ink">
                  {isPendingCancellation
                    ? "Sẽ kết thúc cuối kỳ"
                    : isInRenewalPriority
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
              <div className="rounded-card border border-app-line bg-app-bg p-4">
                <p className="text-xs text-app-ink-muted">Chu kỳ</p>
                <p className="mt-1 text-sm font-medium text-app-ink">
                  {subscription?.billingCycle === "monthly" ? "Tháng" : subscription?.billingCycle === "quarterly" ? "Quý" : subscription ? "Trọn chu kỳ" : "Đang chuẩn bị"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {realMode && (
                <Button onClick={handleRenewPlan} disabled={paidCheckoutDisabled} className="bg-app-accent text-white hover:bg-app-accent">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {paidCheckoutDisabled ? "Tạm khóa thanh toán" : isInRenewalPriority ? "Gia hạn ngay" : "Gia hạn Plus"}
                </Button>
              )}
              {realMode && !isPendingCancellation && (
                <Button variant="outline" className="border-app-line text-app-ink hover:bg-app-bg" onClick={() => setShowStopUsingConfirm(true)}>Tôi không muốn dùng nữa</Button>
              )}
              {realMode && (
                <Button variant="outline" className="border-app-line text-app-warm hover:bg-app-warm-soft" onClick={handleRequestUnusedCycleRefund}>Yêu cầu hoàn tiền cho chu kỳ chưa dùng</Button>
              )}
            </div>
          </>
        )}

        <AlertDialog
          open={showStopUsingConfirm}
          onOpenChange={(open) => {
            if (!isCancelingSubscription) setShowStopUsingConfirm(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hủy Plus vào cuối chu kỳ hiện tại?</AlertDialogTitle>
              <AlertDialogDescription>
                Gói Plus sẽ được đánh dấu hủy vào cuối chu kỳ hiện tại, dự kiến{" "}
                {cancelEffectiveDate}. Bạn vẫn dùng Plus đến thời điểm đó. Hoàn
                tiền cho phần chu kỳ chưa dùng là yêu cầu riêng và vẫn đi qua
                luồng hỗ trợ/hoàn tiền.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelingSubscription}>
                Tiếp tục dùng Plus
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStopUsing}
                disabled={isCancelingSubscription}
              >
                {isCancelingSubscription ? "Đang hủy..." : "Hủy gói cuối kỳ"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* ===== PAYMENT HISTORY ===== */}
      {realMode && (
        <section
          className="rounded-[18px] border border-app-line bg-white px-[26px] py-6"
          data-payment-history-state={paymentHistoryState}
          data-testid="billing-payment-history"
        >
          <div className="mb-[7px] flex items-center gap-[9px]">
            <ReceiptText className="h-[17px] w-[17px] text-app-ink-soft" aria-hidden="true" />
            <h2 className="font-serif text-[17px] font-bold tracking-[-0.01em] text-app-ink">Lịch sử thanh toán</h2>
          </div>
          <p className="mb-4 text-[13px] text-[#8C887C]">Các giao dịch gần đây của tài khoản này qua đơn vị thanh toán đang cấu hình.</p>

          {!canLoadPaymentHistory && (
            <div className="flex flex-col gap-3 rounded-[13px] border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center sm:justify-between">
              {signedInUserId === null ? (
                <>
                  <p className="text-sm text-app-ink-muted">Đăng nhập để xem lịch sử thanh toán gắn với tài khoản này.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/login">Đăng nhập</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-app-ink-muted">
                  Xác thực email để xem lịch sử thanh toán và biên nhận gắn với tài khoản này.
                </p>
              )}
            </div>
          )}
          {canLoadPaymentHistory && isLoadingPaymentHistory && (
            <div className="flex items-center gap-3 rounded-[13px] border border-app-line bg-app-bg p-4 text-sm text-app-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />Đang tải lịch sử thanh toán...
            </div>
          )}
          {canLoadPaymentHistory && !isLoadingPaymentHistory && paymentHistoryError && (
            <div className="flex flex-col gap-3 rounded-[13px] border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-app-status-error">{paymentHistoryError}</p>
              <Button variant="outline" size="sm" onClick={loadPaymentHistory}>Thử lại</Button>
            </div>
          )}
          {canLoadPaymentHistory && !isLoadingPaymentHistory && !paymentHistoryError && paymentHistory.length === 0 && (
            <div className="rounded-[13px] border border-app-line bg-[#FAF8F3] px-5 py-[18px]">
              <p className="mb-1 text-[13.5px] font-bold text-app-ink">Chưa có giao dịch nào.</p>
              <p className="text-[12.5px] leading-[1.5] text-[#8C887C]">Khi đơn vị thanh toán gửi lịch sử thanh toán, giao dịch và hóa đơn sẽ xuất hiện tại đây.</p>
            </div>
          )}
          {canLoadPaymentHistory && !isLoadingPaymentHistory && !paymentHistoryError && paymentHistory.length > 0 && (
            <div className="divide-y divide-app-line overflow-hidden rounded-lg border border-app-line bg-app-surface">
              {paymentHistory.map((order) => (
                <div key={order.orderId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-app-ink">{order.orderId}</p>
                      <Badge variant="outline" className={getPaymentStatusClassName(order.status)}>{getPaymentStatusLabel(order.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-app-ink-muted">{getBillingCycleLabel(order.billingCycle)} · {formatPaymentDate(order.createdAt)}</p>
                    {order.status === "completed" && (
                      <div className="mt-1 space-y-1 text-xs">
                        <p className="text-app-accent">Xác nhận lúc {formatPaymentDate(order.completedAt)}</p>
                        {order.receiptSentAt ? <p className="text-app-accent">✓ Biên nhận đã gửi ngày {formatPaymentDate(order.receiptSentAt)}</p> : <p className="text-app-warm">Biên nhận chưa ghi nhận đã gửi.</p>}
                        {order.refundRequest ? <p className="text-app-warm">Hoàn tiền: {getRefundStatusLabel(order.refundRequest.status)}{order.refundRequest.createdAt ? ` — gửi lúc ${formatPaymentDate(order.refundRequest.createdAt)}` : ""}</p> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <p className="font-semibold text-app-ink">{formatPaymentAmount(order.amount, order.currency)}</p>
                    {order.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => { if (paidCheckoutDisabled) return; navigate(`/billing/checkout/${encodeURIComponent(order.orderId)}`); }} disabled={paidCheckoutDisabled} className="border-app-line hover:bg-app-bg">
                        {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Tiếp tục thanh toán"}
                      </Button>
                    )}
                    {order.status === "completed" && (
                      <Button variant="outline" size="sm" onClick={() => handleResendReceipt(order.orderId)} disabled={resendingReceiptOrderId === order.orderId} className="border-app-line hover:bg-app-bg">
                        {resendingReceiptOrderId === order.orderId ? "Đang gửi..." : "Gửi lại biên nhận"}
                      </Button>
                    )}
                    {order.status === "completed" && !order.refundRequest && isOrderRefundEligible(order) && (
                      <Button variant="outline" size="sm" className="border-app-line text-app-warm hover:bg-app-warm-soft" onClick={() => openRefundDialog(order)} disabled={emailNeedsVerification} title={emailNeedsVerification ? "Bạn cần xác minh email trước khi yêu cầu hoàn tiền." : undefined}>
                        Yêu cầu hoàn tiền
                      </Button>
                    )}
                    {order.invoiceUrl ? (
                      <Button variant="outline" size="sm" asChild className="border-app-line hover:bg-app-bg"><a href={order.invoiceUrl} target="_blank" rel="noreferrer">Xem hóa đơn</a></Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== PAYMENT SUPPORT ===== */}
      {realMode && (
        <section className="rounded-[18px] border border-app-line bg-white px-[26px] py-6">
          <div className="mb-[7px] flex items-center gap-[9px]">
            <LifeBuoy className="h-[17px] w-[17px] text-app-accent" aria-hidden="true" />
            <h2 className="font-serif text-[17px] font-bold tracking-[-0.01em] text-app-ink">Hỗ trợ thanh toán</h2>
          </div>
          <p className="mb-4 text-[13px] text-[#8C887C]">Nếu đơn vị thanh toán đã xác nhận nhưng Plus chưa mở sau vài phút, gửi mã đơn để kiểm tra thủ công.</p>
          <div className="flex items-center gap-[14px] rounded-[13px] border border-app-line bg-[#FAF8F3] px-[18px] py-[15px]">
            <div className="min-w-0 flex-1">
              <div className="mb-[3px] text-[11px] font-semibold text-[#8C887C]">Email hỗ trợ</div>
              <div className="text-[13.5px] font-semibold text-app-ink">
                {BILLING_SUPPORT_EMAIL ? (
                  <a href={`mailto:${BILLING_SUPPORT_EMAIL}`} className="hover:underline">{BILLING_SUPPORT_EMAIL}</a>
                ) : "Chưa cấu hình email hỗ trợ"}
              </div>
            </div>
            <Button variant="outline" onClick={handleCopySupportMessage} className="shrink-0 rounded-[11px] border-app-line px-4 py-[10px] text-[12.5px] font-semibold text-app-ink-soft hover:bg-[#FAF8F3]">Sao chép nội dung hỗ trợ</Button>
            {BILLING_SUPPORT_EMAIL ? (
              <Button asChild className="shrink-0 rounded-[11px] bg-app-accent px-[18px] py-[10px] text-[12.5px] font-bold text-white hover:bg-app-accent-hover">
                <a href={`mailto:${BILLING_SUPPORT_EMAIL}?subject=${encodeURIComponent("Hỗ trợ thanh toán Dear Our Future")}`}>Liên hệ hỗ trợ</a>
              </Button>
            ) : (
              <Button variant="outline" disabled className="shrink-0 rounded-[11px] border-app-line px-[18px] py-[10px] text-[12.5px] font-bold text-app-ink-muted">Chưa cấu hình email</Button>
            )}
          </div>
          <p className="mt-[13px] text-[11.5px] leading-[1.55] text-[#8C887C]">
            Khi tiếp tục thanh toán, bạn đồng ý với{" "}
            <Link to="/terms" className="font-semibold text-app-ink hover:text-app-accent hover:underline">Điều khoản</Link>,{" "}
            <Link to="/privacy" className="font-semibold text-app-ink hover:text-app-accent hover:underline">Chính sách bảo mật</Link>{" "}
            và{" "}
            <Link to="/refund-policy" className="font-semibold text-app-ink hover:text-app-accent hover:underline">Chính sách hoàn tiền</Link>. Xem thêm{" "}
            <Link to="/billing/faq" className="font-semibold text-app-ink hover:text-app-accent hover:underline">câu hỏi thanh toán</Link>.
          </p>
        </section>
      )}

      {/* ===== PERMISSIONS / ENTITLEMENTS ===== */}
      <section className="rounded-[18px] border border-app-line bg-white px-[26px] py-6">
        <div className="mb-[7px] flex items-center gap-[9px]">
          <Shield className="h-[17px] w-[17px] text-app-accent" aria-hidden="true" />
          <h2 className="font-serif text-[17px] font-bold tracking-[-0.01em] text-app-ink">Quyền truy cập</h2>
        </div>
        <p className="mb-4 text-[13px] text-[#8C887C]">{realMode ? "Quyền nâng cao được quản lý qua tài khoản của bạn." : "Các quyền Plus đang mở trên trình duyệt này."}</p>
        <div className="grid gap-[13px] sm:grid-cols-2">
          {premiumStatusItems.map((key) => {
            const isActive = entitlementKeys.includes(key);
            return (
              <div key={key} className={`flex items-center gap-3 rounded-[13px] border p-[14px_17px] ${isActive ? "border-app-accent-soft bg-app-accent-soft" : "border-app-line bg-[#FAF8F3]"}`}>
                <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-base ${isActive ? "bg-app-accent text-white" : "bg-[#ECEAE2] text-[#B0AB9E]"}`}>
                  {isActive ? <Check className="h-4 w-4" /> : "—"}
                </span>
                <div>
                  <div className={`text-[13px] font-semibold ${isActive ? "text-app-accent" : "text-app-ink"}`}>{getEntitlementLabel(key)}</div>
                  <div className="mt-[1px] text-[11.5px] text-[#A8A296]">{isActive ? (realMode ? "Đang hoạt động" : "Đang mở") : "Chưa kích hoạt"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== ACTIONS ===== */}
      <section className="rounded-[18px] border border-app-line bg-white px-[26px] py-6">
        <h2 className="mb-[6px] font-serif text-[17px] font-bold tracking-[-0.01em] text-app-ink">Thao tác</h2>
        <p className="mb-4 text-[13px] text-[#8C887C]">Kiểm tra quyền nâng cao, khôi phục giao dịch đã mua hoặc quay lại trang chính.</p>
        <div className="flex flex-wrap gap-[11px]">
          <Button variant="outline" onClick={handleSyncEntitlements} disabled={isSyncing} className="inline-flex items-center gap-[9px] rounded-[11px] border-app-line px-[18px] py-[11px] text-[13px] font-semibold text-app-ink-soft hover:bg-[#FAF8F3]">
            <RefreshCw className={`h-[15px] w-[15px] ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Đang kiểm tra…" : "Kiểm tra quyền nâng cao"}
          </Button>
          <Button variant="outline" onClick={handleRestoreAccess} disabled={isRestoring} className="inline-flex items-center gap-[9px] rounded-[11px] border-app-line px-[18px] py-[11px] text-[13px] font-semibold text-app-ink-soft hover:bg-[#FAF8F3]">
            {isRestoring ? "Đang khôi phục…" : "Khôi phục quyền đã mua"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="inline-flex items-center gap-[9px] rounded-[11px] border-app-line px-[18px] py-[11px] text-[13px] font-semibold text-app-ink-soft hover:bg-[#FAF8F3]">
            Quay lại Trang chính
          </Button>
        </div>
        {(lastEntitlementSync || lastRestoreAccess) && (
          <div className="mt-4 space-y-1 text-xs text-[#8C887C]">
            {lastEntitlementSync && (
              <p>Kiểm tra quyền gần nhất: <span className="font-mono">{formatDate(lastEntitlementSync.at)}</span> — {lastEntitlementSync.message}</p>
            )}
            {lastRestoreAccess && (
              <p>Khôi phục gần nhất: <span className="font-mono">{formatDate(lastRestoreAccess.at)}</span> — {lastRestoreAccess.message}</p>
            )}
          </div>
        )}
      </section>

      {/* ===== DISCOUNT ===== */}
      {!paidCheckoutDisabled && currentPlanCode === "FREE" && (
        <section className="rounded-[18px] border border-app-line bg-white px-[26px] py-6">
          <div className="mb-4 flex items-center gap-[9px]">
            <TicketPercent className="h-4 w-4 text-app-accent" />
            <span className="text-[15px] font-bold text-app-ink">Mã giảm giá / Ưu đãi</span>
          </div>

          {/* Active discount banner */}
          {hasActiveDiscount && (
            <div className="mb-[14px] flex items-start gap-[10px] rounded-[13px] border border-app-accent/20 bg-app-accent-subtle px-4 py-[13px]">
              <Check className="mt-[2px] h-4 w-4 shrink-0 text-app-accent" strokeWidth={2.4} />
              <div>
                {activeDiscount ? (
                  <>
                    <div className="text-[13.5px] font-bold text-app-ink">{activeDiscount.discountName ?? "Mã giảm giá"}</div>
                    <div className="mt-[2px] text-xs text-[#5C7A5C]">
                      Giảm {activeDiscount.discountPercent ? `${activeDiscount.discountPercent}%` : activeDiscount.discountValue ? formatVndAmount(activeDiscount.discountValue) : formatVndAmount(displayDiscountAmount ?? 0)} — còn{" "}
                      <span className="font-mono font-semibold">{formatVndAmount(displayFinalAmount ?? PLUS_MONTHLY_PRICE_VND)}</span>
                    </div>
                  </>
                ) : effectiveSaleEvent ? (
                  <>
                    <div className="text-[13.5px] font-bold text-app-ink">{effectiveSaleEvent.name}</div>
                    <div className="mt-[2px] text-xs text-[#5C7A5C]">
                      {effectiveSaleEvent.discountPercent ? `Giảm ${effectiveSaleEvent.discountPercent}%` : effectiveSaleEvent.discountValue ? `Giảm ${formatVndAmount(effectiveSaleEvent.discountValue)}` : ""} — còn{" "}
                      <span className="font-mono font-semibold">{formatVndAmount(saleFinalAmount ?? PLUS_MONTHLY_PRICE_VND)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Coupon input */}
          <p id={couponHelpId} className="sr-only">
            Nhập mã giảm giá nếu bạn có ưu đãi.
          </p>
          <div className="mb-3 flex gap-[11px]">
            <label htmlFor={couponInputId} className="sr-only">
              Nhập mã giảm giá
            </label>
            <input
              id={couponInputId}
              name="couponCode"
              type="text"
              placeholder="NHẬP MÃ GIẢM GIÁ"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              aria-invalid={couponStatus === "invalid"}
              aria-describedby={couponDescribedBy}
              className="h-11 flex-1 rounded-[11px] border border-app-line bg-white px-[14px] font-mono text-base tracking-[0.04em] text-app-ink outline-none transition-[border-color,box-shadow] focus:border-app-accent focus:shadow-[0_0_0_3px_rgba(12,94,58,0.1)] aria-invalid:border-app-status-error aria-invalid:shadow-[0_0_0_3px_rgba(220,38,38,0.1)] sm:text-[12.5px]"
            />
            {couponStatus === "valid" || activeDiscount ? (
              <button type="button" onClick={() => { setCouponCode(""); resetCoupon(); handleCouponChange(null); }} className="shrink-0 rounded-[11px] bg-[#5C7A5C] px-[22px] text-[13px] font-bold text-white">
                Xóa
              </button>
            ) : (
              <button type="button" onClick={() => { if (couponCode.trim()) { validateCoupon(couponCode.trim()); } }} disabled={couponStatus === "loading" || !couponCode.trim()} className="shrink-0 rounded-[11px] bg-[#5C7A5C] px-[22px] text-[13px] font-bold text-white disabled:opacity-50">
                {couponStatus === "loading" ? "Đang kiểm tra…" : "Áp dụng"}
              </button>
            )}
          </div>
          {couponStatus === "invalid" && couponError && (
            <p id={couponErrorId} className="mb-3 text-xs text-app-status-error" aria-live="polite">
              {couponError}
            </p>
          )}

          {/* Final price display */}
          {(activeDiscount || effectiveSaleEvent) && (
            <div className="flex items-baseline gap-[10px]">
              <span className="font-mono text-[13px] text-[#A8A296] line-through">{formatVndAmount(PLUS_MONTHLY_PRICE_VND)}</span>
              <span className="font-mono text-base font-bold text-app-ink">{formatVndAmount(displayFinalAmount ?? saleFinalAmount ?? PLUS_MONTHLY_PRICE_VND)}</span>
            </div>
          )}
        </section>
      )}

      {/* ===== PLAN COMPARISON ===== */}
      <section className="rounded-[18px] border border-app-line bg-white px-[28px] py-[26px]">
        <h2 className="mb-[5px] font-serif text-[18px] font-bold tracking-[-0.01em] text-app-ink">So sánh các gói</h2>
        <p className="mb-5 text-[13px] text-[#8C887C]">Chọn gói phù hợp với nhu cầu của bạn.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_DEFINITIONS.map((plan) => {
            const isPlus = plan.code === "PLUS";
            const isCurrent = plan.code === currentPlanCode;
            const isRecommended = isPlus && currentPlanCode === "FREE";
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  isRecommended
                    ? "border-[1.5px] border-app-accent bg-white shadow-[0_16px_40px_-28px_rgba(12,94,58,0.4)]"
                    : isCurrent
                      ? "border-[1.5px] border-app-accent/40 bg-app-accent-soft/60"
                      : "border border-app-line/10 bg-[#FAF8F3]"
                }`}
              >
                {isRecommended && (
                  <span className="absolute right-[18px] top-4 rounded-full bg-app-accent px-[11px] py-1 text-[10px] font-bold tracking-[0.04em] text-white">Phổ biến</span>
                )}
                {/* Label */}
                <div className={`mb-[11px] text-[10px] font-bold uppercase tracking-[0.1em] ${isRecommended ? "text-app-accent" : "text-[#8C887C]"}`}>
                  {plan.shortLabel}
                </div>
                {/* Name */}
                <div className="font-serif text-[22px] font-extrabold tracking-[-0.01em] text-app-ink">{plan.name}</div>
                {/* Price */}
                {isPlus && saleEvent ? (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-[9px]">
                      <span className="font-mono text-[13px] text-[#A8A296] line-through">{plan.priceLabel}</span>
                      <span className="font-serif text-[30px] font-extrabold leading-none text-app-ink">{formatVndAmount(saleEvent.finalAmount ?? getPlusSaleFallbackFinalAmount(saleEvent))}</span>
                      {getSaleBadgeLabel(saleEvent) ? (
                        <span className="rounded-full bg-app-accent-subtle px-2 py-[2px] text-[11px] font-bold text-app-accent">{getSaleBadgeLabel(saleEvent)}</span>
                      ) : null}
                    </div>
                    <div className="text-[11.5px] font-semibold text-app-accent">Đang áp dụng: {saleEvent.name}</div>
                  </div>
                ) : isPlus ? (
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-[9px]">
                    <span className="font-mono text-[13px] text-[#A8A296] line-through">{plan.priceLabel}</span>
                    <span className="text-[11px] text-[#8C887C]">/ tháng</span>
                    <span className="font-serif text-[30px] font-extrabold leading-none text-app-ink">{plan.priceLabel}</span>
                  </div>
                ) : (
                  <div className="my-[6px]">
                    <span className="font-serif text-[30px] font-extrabold leading-none text-app-ink">0đ</span>
                  </div>
                )}
                {/* Description */}
                <p className="mt-2 mb-[18px] text-[12.5px] leading-[1.55] text-app-ink-soft">{plan.description}</p>
                {/* Highlights */}
                <div className="mb-[22px] flex flex-col gap-[10px]">
                  {plan.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-[9px] text-[12.5px] text-app-ink-soft">
                      <Check className="h-3.5 w-3.5 shrink-0 text-app-accent" strokeWidth={2.4} aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                {/* Action button */}
                <div className="mt-auto">
                  {isRecommended && (
                    <Button
                      className="flex w-full items-center justify-center gap-[9px] rounded-[11px] bg-app-accent py-[14px] text-[14px] font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,94,58,0.85)] hover:bg-app-accent-hover"
                      onClick={() => handleOpenUpgrade("plan")}
                      disabled={paidCheckoutDisabled}
                    >
                      <Sparkles className="h-4 w-4" />
                      {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Nâng cấp Plus"}
                    </Button>
                  )}
                  {isCurrent && !isPlus && (
                    <button type="button" disabled className="w-full rounded-[11px] border border-app-line bg-white py-[13px] text-[13px] font-semibold text-[#8C887C] cursor-default">Gói hiện tại</button>
                  )}
                  {isCurrent && isPlus && (
                    <button type="button" disabled className="w-full rounded-[11px] border border-app-line bg-white py-[13px] text-[13px] font-semibold text-app-ink cursor-default">Đang dùng</button>
                  )}
                  {!isCurrent && !isRecommended && (
                    <Button className="w-full" onClick={() => handleOpenUpgrade("plan")} disabled={paidCheckoutDisabled}>
                      {paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Nâng cấp"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-[6px] flex flex-wrap items-center justify-end gap-[14px] border-t border-app-line pt-[18px]">
        <span className="font-mono text-xs text-[#A8A296]">
          v1.0 ·{" "}
          {BILLING_SUPPORT_EMAIL ? (
            <a href={`mailto:${BILLING_SUPPORT_EMAIL}`} className="hover:text-app-accent hover:underline">{BILLING_SUPPORT_EMAIL}</a>
          ) : "support@dearourfuture.com"}{" "}
          ·{" "}
          <Link to="/settings" className="font-semibold text-app-ink-soft hover:text-app-accent hover:underline">Cài đặt</Link>
        </span>
      </footer>

      {/* ===== DEBUG INFO ===== */}
      {shouldShowBillingDebugUi() && (
        <div className="rounded-card-lg border border-app-line bg-app-surface p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-app-ink">Thông tin nhà cung cấp thanh toán</h2>
          <div className="grid gap-2 text-xs text-app-ink-muted sm:grid-cols-2">
            <div><span className="text-app-ink-muted">Nhà cung cấp: </span>{getBillingProviderModeLabel(billingStatus.mode)}{billingStatus.providerLabel && ` (${billingStatus.providerLabel})`}</div>
            <div><span className="text-app-ink-muted">Thanh toán: </span>{getBillingReadinessLabel(billingStatus.checkoutReady)}</div>
            <div><span className="text-app-ink-muted">Khôi phục: </span>{getBillingReadinessLabel(billingStatus.restoreReady)}</div>
            <div><span className="text-app-ink-muted">Đồng bộ quyền: </span>{getBillingReadinessLabel(billingStatus.entitlementSyncReady)}</div>
          </div>
        </div>
      )}
    </main>
  );
}
