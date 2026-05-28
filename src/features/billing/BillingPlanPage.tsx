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
import { useMemo, useState } from "react";
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

  const {
    paymentHistory,
    setPaymentHistory,
    isLoadingPaymentHistory,
    paymentHistoryError,
    loadPaymentHistory,
  } = usePaymentHistory(canLoadPaymentHistory);

  const { checkoutReturnStatus, retry: retryCheckoutEntitlement } = useCheckoutReturn({
    isCheckoutReturn,
    searchParams,
    setSearchParams,
    reloadUserData,
  });

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
        "Ðang hoàn t?t tích h?p h? th?ng thanh toán m?i — s?n sàng trong tu?n t?i. Quy?n hi?n có không b? ?nh hu?ng. N?u b?n mu?n nâng c?p ngay, liên h? support d? m? Plus th? công.",
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
        toast.error("Không th? ki?m tra quy?n trên tài kho?n. Vui lòng th? l?i.");
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
        toast.error("Không th? khôi ph?c quy?n lúc này. Vui lòng th? l?i.");
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
        toast.error("Không th? m? trang qu?n lý thanh toán. Vui lòng th? l?i.");
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleCheckoutComplete = (planCode: PricingPlanCode) => {
    reloadUserData();
    if (planCode !== "FREE") {
      toast.success(`Ðã c?p nh?t ${getPlanLabel(planCode)} trên tài kho?n c?a b?n.`);
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
      ? `Gia h?n ngày ${formatDate(subscription.renewsAt)}`
      : isPaidPlan
        ? "Gia h?n ngày Ðang chu?n b?"
        : null;
  const cancelEffectiveDate =
    subscription?.renewsAt && formatDate(subscription.renewsAt) !== "—"
      ? formatDate(subscription.renewsAt)
      : "ngày k?t thúc chu k? hi?n t?i";

  const isInRenewalPriority = graceState.inGracePeriod;
  const isExpired = expiryInfo.isExpired && !graceState.active;
  const shouldShowExpiryNotice =
    realMode && subscription?.planCode === "PLUS" && (isInRenewalPriority || expiryInfo.isExpiringSoon || isExpired);

  const handleConfirmStopUsing = () => {
    setShowStopUsingConfirm(false);
    toast.info(
      "Plus hi?n không t? d?ng gia h?n. B?n có th? ti?p t?c dùng d?n h?t chu k? ho?c g?i yêu c?u hoàn ti?n n?u còn d? di?u ki?n.",
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
      toast.info(`Không có don dã thanh toán còn trong th?i h?n hoàn ti?n ${getRefundWindowDays()} ngày.`);
      return;
    }

    openRefundDialog(
      latestRefundEligibleOrder,
      "Tôi không mu?n ti?p t?c s? d?ng Plus và mu?n yêu c?u hoàn ti?n cho ph?n chu k? chua dùng.",
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
      toast.success("Ðã g?i yêu c?u hoàn ti?n — s? x? lý trong 3-7 ngày làm vi?c.");
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
        setRefundFormError("M?ng có v?n d?, vui lòng th? l?i");
      } else {
        logBillingUiError(error, {
          surface: "BillingPlan",
          action: "submit_refund_request",
          orderId: refundDialogOrder.orderId,
          amount: refundDialogOrder.amount,
          status: refundDialogOrder.status,
        });
        const message = toAppError(error).message || "Không th? g?i yêu c?u hoàn ti?n. Vui lòng th? l?i sau.";
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
        "Ðang hoàn t?t tích h?p h? th?ng thanh toán m?i — s?n sàng trong tu?n t?i. Quy?n hi?n có không b? ?nh hu?ng. N?u b?n mu?n gia h?n ngay, liên h? support d? x? lý th? công.",
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
    const latestOrderId = paymentHistory[0]?.orderId ?? "chua có mã don";
    const message = [
      "Tôi c?n h? tr? thanh toán Dear Our Future.",
      `Mã don g?n nh?t: ${latestOrderId}`,
      `Gói hi?n t?i: ${currentPlanCode}`,
      "Tôi s? g?i kèm mã giao d?ch ho?c hóa don t? don v? thanh toán n?u có.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Ðã sao chép n?i dung h? tr?.");
    } catch {
      toast.info("Không th? sao chép t? d?ng. B?n có th? g?i mã don và ?nh chuy?n kho?n cho h? tr?.");
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
      toast.success("Ðã g?i l?i biên nh?n thanh toán.");
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
        toast.error(toAppError(error).message || "Chua g?i l?i du?c biên nh?n. Vui lòng th? l?i sau.");
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
            <DialogTitle>Yêu c?u hoàn ti?n</DialogTitle>
            <DialogDescription>
              Yêu c?u s? du?c g?i t?i support d? admin duy?t th? công và chuy?n kho?n hoàn l?i trong 3-7 ngày làm vi?c.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="refund-order-id" className="text-sm font-medium text-app-ink">
                Mã don hàng
              </label>
              <Input id="refund-order-id" value={refundForm.orderId} readOnly className="bg-app-bg" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-contact-email" className="text-sm font-medium text-app-ink">
                Email liên h?
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
                Lý do hoàn ti?n
              </label>
              <Textarea
                id="refund-reason"
                value={refundForm.reason}
                onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Cho chúng tôi bi?t lý do b?n mu?n hoàn ti?n."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="refund-account" className="text-sm font-medium text-app-ink">
                S? tài kho?n ngân hàng nh?n ti?n hoàn
              </label>
              <Input
                id="refund-account"
                value={refundForm.refundAccount}
                onChange={(event) => setRefundForm((current) => ({ ...current, refundAccount: event.target.value }))}
                placeholder="Ngân hàng - S? TK - Ch? TK"
              />
              <p className="text-xs leading-5 text-app-ink-muted">
                Ðây là thông tin PII, ch? dùng d? support chuy?n kho?n hoàn ti?n th? công.
              </p>
            </div>
            {refundFormError ? (
              <div className="rounded-lg border border-app-line bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-fg)]">
                {refundFormError}
              </div>
            ) : null}
            {emailNeedsVerification ? (
              <div className="rounded-lg border border-app-line bg-app-warm-soft p-3 text-sm text-app-warm">
                B?n c?n xác minh email tài kho?n tru?c khi yêu c?u hoàn ti?n.
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
              Hu?
            </Button>
            <Button
              type="button"
              onClick={handleSubmitRefundRequest}
              disabled={!canSubmitRefundRequest || emailNeedsVerification}
            >
              {isSubmittingRefund ? "Ðang g?i…" : "G?i yêu c?u hoàn ti?n"}
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
        title="Ch?n gói phù h?p v?i b?n"
        description="Nâng c?p, ki?m tra quy?n nâng cao và qu?n lý thanh toán cho tài kho?n. Quy?n Plus ch? m? sau khi h? th?ng xác nh?n giao d?ch."
      />

      {paidCheckoutDisabled && (
        <div
          data-testid="paid-checkout-disabled-banner"
          className="rounded-xl border border-app-warm-border bg-app-warm-soft p-4"
        >
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-app-warm" />
            <div className="flex-1">
              <p className="font-medium text-app-ink">Thanh toán dang t?m khóa.</p>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Ðang hoàn t?t tích h?p h? th?ng thanh toán m?i — s?n sàng trong tu?n t?i. Quy?n hi?n có không b?
                ?nh hu?ng. N?u b?n mu?n nâng c?p ngay, liên h? {" "}
                {BILLING_SUPPORT_EMAIL ? (
                  <a
                    href={`mailto:${BILLING_SUPPORT_EMAIL}`}
                    className="font-medium text-app-ink underline-offset-4 hover:underline"
                  >
                    {BILLING_SUPPORT_EMAIL}
                  </a>
                ) : (
                  "d?i h? tr?"
                )}
                {" "}d? m? Plus th? công.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Checkout return status */}
      {checkoutReturnStatus === "pending" && (
        <div className="rounded-xl border border-app-line bg-app-warm-soft p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-app-warm" />
            <div>
              <p className="font-medium text-app-ink">Ðang ch? xác nh?n thanh toán</p>
              <p className="text-sm text-app-ink-soft">
                Thanh toán dang du?c x? lý. Quy?n s? du?c c?p nh?t khi h? th?ng xác nh?n.
              </p>
            </div>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "confirmed" && (
        <div className="rounded-xl border border-app-accent-soft bg-app-accent-soft p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-app-accent" />
            <div>
              <p className="font-medium text-app-ink">Thanh toán dã xác nh?n</p>
              <p className="text-sm text-app-ink-soft">Quy?n Plus dã du?c kích ho?t trên tài kho?n c?a b?n.</p>
            </div>
            <Button asChild size="sm" className="ml-auto bg-app-accent text-white hover:bg-app-accent-hover">
              <Link to="/12-week-system">B?t d?u k? ho?ch 12 tu?n</Link>
            </Button>
          </div>
        </div>
      )}
      {checkoutReturnStatus === "failed" && (
        <div className="rounded-xl border border-app-line bg-[color:var(--color-danger-bg)] p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[color:var(--color-danger-fg)]" />
            <div>
              <p className="font-medium text-[color:var(--color-danger-fg)]">Không th? ki?m tra thanh toán</p>
              <p className="text-sm text-app-ink-soft">Vui lòng nh?n "Ki?m tra quy?n" bên du?i ho?c th? l?i sau.</p>
            </div>
            <Button variant="outline" size="sm" onClick={retryCheckoutEntitlement} className="ml-auto">
              Th? l?i
            </Button>
          </div>
        </div>
      )}

      {shouldShowExpiryNotice && (
        <div
          className={`rounded-xl p-4 ${isExpired ? "border-app-line bg-[color:var(--color-danger-bg)]" : "border-app-line bg-app-warm-soft"}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 h-5 w-5 ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-warm"}`}
            />
            <div className="flex-1">
              <p className={`font-medium ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-ink"}`}>
                {isInRenewalPriority
                  ? `Ðang trong giai do?n uu tiên gia h?n — còn ${graceState.daysRemaining} ngày`
                  : isExpired
                    ? "Gói Plus dã h?t h?n"
                    : `Gói Plus còn ${expiryInfo.daysLeft ?? 0} ngày`}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${isExpired ? "text-[color:var(--color-danger-fg)]" : "text-app-ink-soft"}`}
              >
                {isInRenewalPriority
                  ? "Quy?n Plus v?n du?c gi? trong th?i gian này. Gia h?n ngay d? không b? t?m d?ng."
                  : isExpired
                    ? "Quy?n Plus dã du?c thu h?i. Gia h?n d? m? l?i m?u nâng cao, góc nhìn review và th?ng kê."
                    : `Chu k? hi?n t?i h?t h?n ngày ${formatBillingExpiryDate(expiryInfo.expiresAt)}. Gia h?n s?m d? không b? gián do?n quy?n Plus.`}
              </p>
            </div>
            <Button
              onClick={handleRenewPlan}
              disabled={paidCheckoutDisabled}
              className="ml-auto bg-app-accent text-white hover:bg-app-accent-hover"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {paidCheckoutDisabled
                ? "T?m khóa thanh toán"
                : isInRenewalPriority
                  ? "Gia h?n ngay"
                  : "Gia h?n Plus"}
            </Button>
          </div>
        </div>
      )}

      <BillingTrustSignals supportEmail={BILLING_SUPPORT_EMAIL} />

      {/* Current plan */}
      <SectionBlock title="Khu v?c gói dang dùng" headerVisuallyHidden>
        <PrimaryActionCard
          title="Gói hi?n t?i"
          titleAs="h2"
          titleClassName="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          eyebrow="Tài kho?n"
          icon={<Crown className="h-4 w-4" />}
          description={
            currentPlanCode === "FREE"
              ? "B?n dang dùng gói mi?n phí."
              : `B?n dang dùng ${currentPlanName} trên tài kho?n này và có th? ti?p t?c trên thi?t b? khác sau khi dang nh?p.`
          }
          action={
            isInRenewalPriority && realMode ? (
              <Button className="w-full sm:w-auto" onClick={handleRenewPlan} disabled={paidCheckoutDisabled}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {paidCheckoutDisabled ? "T?m khóa thanh toán" : "Gia h?n ngay"}
              </Button>
            ) : currentPlanCode === "FREE" ? (
              <Button
                className="w-full bg-app-accent text-white hover:bg-app-accent-hover sm:w-auto"
                onClick={() => handleOpenUpgrade("plan")}
                disabled={paidCheckoutDisabled}
                data-testid="billing-plan-upgrade-cta"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {paidCheckoutDisabled ? "T?m khóa thanh toán" : "Nâng c?p Plus"}
              </Button>
            ) : realMode || billingStatus.manageBillingReady ? (
              <Button
                variant="outline"
                onClick={handleOpenPortal}
                disabled={isOpeningPortal || !billingStatus.manageBillingReady}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {billingStatus.manageBillingReady ? (isOpeningPortal ? "Ðang m?…" : "Qu?n lý gói") : "Ðang chu?n b?"}
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
                Còn {graceState.daysRemaining} ngày d? gia h?n uu tiên
              </Badge>
            ) : isExpired ? (
              <Badge
                variant="outline"
                className="border-app-line bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]"
              >
                Ðã h?t h?n
              </Badge>
            ) : null}
          </div>

          {isPaidPlan && (
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Gia h?n</p>
                <p className="font-medium text-app-ink">{renewalLabel}</p>
              </div>
              <div className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Ðon v? thanh toán</p>
                <p className="flex items-center gap-2 font-medium text-app-ink">
                  <CreditCard className="h-4 w-4 text-app-ink-muted" />
                  Thanh toán qua {providerLabel}
                </p>
              </div>
              <div className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Tr?ng thái</p>
                <p className="font-medium text-app-ink">
                  {isInRenewalPriority
                    ? "Ðang ch? gia h?n uu tiên"
                    : subscription?.status === "active"
                      ? "Ðang ho?t d?ng"
                      : subscription?.status === "trialing"
                        ? "Ðang trong th?i gian uu dãi"
                        : subscription?.status === "canceled"
                          ? "Ðã h?y"
                          : subscription
                            ? "Không ho?t d?ng"
                            : "Ðang chu?n b?"}
                </p>
              </div>
              <div className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-app-ink-muted">Chu k?</p>
                <p className="font-medium text-app-ink">
                  {subscription?.billingCycle === "monthly"
                    ? "Tháng"
                    : subscription?.billingCycle === "quarterly"
                      ? "Quý"
                      : subscription
                        ? "Tr?n chu k?"
                        : "Ðang chu?n b?"}
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
                  className="bg-app-accent text-white hover:bg-app-accent-hover"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {paidCheckoutDisabled
                    ? "T?m khóa thanh toán"
                    : isInRenewalPriority
                      ? "Gia h?n ngay"
                      : "Gia h?n Plus"}
                </Button>
              )}
              {realMode && (
                <Button
                  variant="outline"
                  className="border-app-line text-app-ink hover:bg-app-bg"
                  onClick={() => setShowStopUsingConfirm(true)}
                >
                  Tôi không mu?n dùng n?a
                </Button>
              )}
              {realMode && (
                <Button
                  variant="outline"
                  className="border-app-line text-app-warm hover:bg-app-warm-soft"
                  onClick={handleRequestUnusedCycleRefund}
                >
                  Yêu c?u hoàn ti?n cho chu k? chua dùng
                </Button>
              )}
            </div>
          )}
        </PrimaryActionCard>
        <AlertDialog open={showStopUsingConfirm} onOpenChange={setShowStopUsingConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ghi nh?n b?n không mu?n dùng n?a?</AlertDialogTitle>
              <AlertDialogDescription>
                Plus hi?n không t? d?ng gia h?n, nên không có auto-renewal c?n h?y. Quy?n Plus v?n ho?t d?ng d?n{" "}
                {cancelEffectiveDate}. N?u mu?n hoàn ti?n cho ph?n chu k? chua dùng và don còn d? di?u ki?n, hãy g?i yêu
                c?u hoàn ti?n riêng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ti?p t?c dùng Plus</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStopUsing}>Tôi dã hi?u</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionBlock>

      {/* Payment history */}
      {realMode && (
        <SectionBlock title="Khu v?c l?ch s? thanh toán" headerVisuallyHidden>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-sky-600" />
                L?ch s? thanh toán
              </CardTitle>
              <CardDescription>
                Các giao d?ch g?n dây c?a tài kho?n này qua don v? thanh toán dang c?u hình.
              </CardDescription>
            </CardHeader>
            <CardContent className="stack-stack">
              {isLoadingPaymentHistory && (
                <div className="flex items-center gap-3 rounded-xl border border-app-line bg-app-bg p-4 text-sm text-app-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ðang t?i l?ch s? thanh toán...
                </div>
              )}

              {!isLoadingPaymentHistory && paymentHistoryError && (
                <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[color:var(--color-danger-fg)]">{paymentHistoryError}</p>
                  <Button variant="outline" size="sm" onClick={loadPaymentHistory}>
                    Th? l?i
                  </Button>
                </div>
              )}

              {!isLoadingPaymentHistory && !paymentHistoryError && paymentHistory.length === 0 && (
                <div className="rounded-xl border border-app-line bg-app-bg p-4">
                  <p className="text-sm font-medium text-app-ink">Chua có giao d?ch nào.</p>
                  <p className="mt-1 text-sm text-app-ink-muted">
                    Khi don v? thanh toán g?i l?ch s? thanh toán, giao d?ch và hóa don s? xu?t hi?n t?i dây.
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
                            <p className="text-app-accent">Xác nh?n lúc {formatPaymentDate(order.completedAt)}</p>
                            {order.receiptSentAt ? (
                              <p className="text-app-accent">
                                ? Biên nh?n dã g?i ngày {formatPaymentDate(order.receiptSentAt)}
                              </p>
                            ) : (
                              <p className="text-app-warm">Biên nh?n chua ghi nh?n dã g?i.</p>
                            )}
                            {order.refundRequest ? (
                              <p className="text-app-warm">
                                Hoàn ti?n: {getRefundStatusLabel(order.refundRequest.status)}
                                {order.refundRequest.createdAt
                                  ? ` — g?i lúc ${formatPaymentDate(order.refundRequest.createdAt)}`
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
                            {paidCheckoutDisabled ? "T?m khóa thanh toán" : "Ti?p t?c thanh toán"}
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
                            {resendingReceiptOrderId === order.orderId ? "Ðang g?i..." : "G?i l?i biên nh?n"}
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
                              emailNeedsVerification ? "B?n c?n xác minh email tru?c khi yêu c?u hoàn ti?n." : undefined
                            }
                          >
                            Yêu c?u hoàn ti?n
                          </Button>
                        )}
                        {order.invoiceUrl ? (
                          <Button variant="outline" size="sm" asChild className="border-app-line hover:bg-app-bg">
                            <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                              Xem hóa don
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
        <SectionBlock title="Khu v?c h? tr? thanh toán" headerVisuallyHidden>
          <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-app-accent" />
              <h2 className="text-lg font-semibold text-app-ink">H? tr? thanh toán</h2>
            </div>
            <p className="mb-6 text-sm text-app-ink-muted">
              N?u don v? thanh toán dã xác nh?n nhung Plus chua m? sau vài phút, g?i mã don d? ki?m tra th? công.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-sm text-app-ink-muted">Email h? tr?</p>
                <p className="mt-1 font-medium text-app-ink">{BILLING_SUPPORT_EMAIL || "Chua c?u hình email h? tr?"}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-app-line text-app-ink hover:bg-app-bg"
                  onClick={handleCopySupportMessage}
                >
                  Sao chép n?i dung h? tr?
                </Button>
                {BILLING_SUPPORT_EMAIL ? (
                  <Button asChild className="bg-app-accent text-white hover:bg-app-accent-hover">
                    <a
                      href={`mailto:${BILLING_SUPPORT_EMAIL}?subject=${encodeURIComponent(
                        "H? tr? thanh toán Dear Our Future",
                      )}`}
                    >
                      Liên h? h? tr?
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" className="border-app-line text-app-ink-muted hover:bg-app-bg" disabled>
                    Chua c?u hình email
                  </Button>
                )}
              </div>
              <p className="border-t border-app-line pt-3 text-xs leading-5 text-app-ink-muted">
                Khi ti?p t?c thanh toán, b?n d?ng ý v?i{" "}
                <Link
                  to="/terms"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Ði?u kho?n
                </Link>
                ,{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Chính sách b?o m?t
                </Link>{" "}
                và{" "}
                <Link
                  to="/refund-policy"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  Chính sách hoàn ti?n
                </Link>
                . Xem thêm{" "}
                <Link
                  to="/billing/faq"
                  className="font-medium text-app-ink underline-offset-4 hover:text-app-accent hover:underline"
                >
                  câu h?i thanh toán
                </Link>
                .
              </p>
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Entitlements */}
      <SectionBlock title="Khu v?c quy?n truy c?p" headerVisuallyHidden>
        <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-app-accent" />
            <h2 className="text-lg font-semibold text-app-ink">Quy?n truy c?p</h2>
          </div>
          <p className="mb-6 text-sm text-app-ink-muted">
            {realMode
              ? "Quy?n nâng cao du?c qu?n lý qua tài kho?n c?a b?n."
              : "Các quy?n Plus dang m? trên trình duy?t này."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {premiumStatusItems.map((key) => {
              const isActive = entitlementKeys.includes(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border p-4 ${
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
                      {isActive ? (realMode ? "Ðang ho?t d?ng" : "Ðang m?") : realMode ? "Chua kích ho?t" : "Chua m?"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionBlock>

      {/* Actions */}
      <SectionBlock title="Khu v?c thao tác gói" headerVisuallyHidden>
        <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-app-ink">Thao tác</h2>
          <p className="mb-6 text-sm text-app-ink-muted">
            Ki?m tra quy?n nâng cao, khôi ph?c giao d?ch dã mua ho?c quay l?i trang chính.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleSyncEntitlements}
              disabled={isSyncing}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Ðang ki?m tra…" : "Ki?m tra quy?n nâng cao"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestoreAccess}
              disabled={isRestoring}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              {isRestoring ? "Ðang khôi ph?c…" : "Khôi ph?c quy?n dã mua"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              Quay l?i Trang chính
            </Button>
          </div>

          {(lastEntitlementSync || lastRestoreAccess) && (
            <div className="mt-6 stack-tight text-xs text-app-ink-muted">
              {lastEntitlementSync && (
                <p>
                  Ki?m tra quy?n g?n nh?t: {formatDate(lastEntitlementSync.at)} — {lastEntitlementSync.message}
                </p>
              )}
              {lastRestoreAccess && (
                <p>
                  Khôi ph?c g?n nh?t: {formatDate(lastRestoreAccess.at)} — {lastRestoreAccess.message}
                </p>
              )}
            </div>
          )}
        </div>
      </SectionBlock>

      {/* Billing provider info (debug only) */}
      {shouldShowBillingDebugUi() && (
        <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-app-ink">Thông tin nhà cung c?p thanh toán</h2>
          <div className="grid gap-2 text-xs text-app-ink-muted sm:grid-cols-2">
            <div>
              <span className="text-app-ink-muted">Nhà cung c?p: </span>
              {getBillingProviderModeLabel(billingStatus.mode)}
              {billingStatus.providerLabel && ` (${billingStatus.providerLabel})`}
            </div>
            <div>
              <span className="text-app-ink-muted">Thanh toán: </span>
              {getBillingReadinessLabel(billingStatus.checkoutReady)}
            </div>
            <div>
              <span className="text-app-ink-muted">Khôi ph?c: </span>
              {getBillingReadinessLabel(billingStatus.restoreReady)}
            </div>
            <div>
              <span className="text-app-ink-muted">Ð?ng b? quy?n: </span>
              {getBillingReadinessLabel(billingStatus.entitlementSyncReady)}
            </div>
          </div>
        </div>
      )}

      {/* Compare plans */}
      <SectionBlock title="Khu v?c so sánh gói" headerVisuallyHidden>
        <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-app-ink">So sánh các gói</h2>
          <p className="mb-6 text-sm text-app-ink-muted">Ch?n gói phù h?p v?i nhu c?u c?a b?n.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {PLAN_DEFINITIONS.map((plan) => {
              const isPlus = plan.code === "PLUS";
              const isCurrent = plan.code === currentPlanCode;
              const isRecommended = isPlus && currentPlanCode === "FREE";
              return (
                <div
                  key={plan.code}
                  className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                    isRecommended
                      ? "border-app-accent/40 bg-app-surface bg-gradient-to-br from-app-accent-soft/30 to-transparent shadow-[var(--shadow-3)]"
                      : isCurrent
                        ? "border-app-accent/40 bg-app-accent-soft/60 shadow-[var(--shadow-1)]"
                        : "border-app-line bg-app-surface shadow-[var(--shadow-1)]"
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute right-4 top-4 rounded-full bg-app-accent px-3 py-1 text-xs font-medium text-white">
                      Ph? bi?n
                    </span>
                  )}
                  <div className="mb-4 pr-20">
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
                      className="mt-6 w-full bg-app-accent text-white hover:bg-app-accent-hover"
                      onClick={() => handleOpenUpgrade("plan")}
                      disabled={paidCheckoutDisabled}
                    >
                      {paidCheckoutDisabled ? "T?m khóa thanh toán" : "Nâng c?p Plus"}
                    </Button>
                  )}
                  {isCurrent && !isPlus && (
                    <Button
                      className="mt-6 w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                      variant="outline"
                    >
                      Gói hi?n t?i
                    </Button>
                  )}
                  {isCurrent && isPlus && (
                    <Button
                      className="mt-6 w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                      variant="outline"
                    >
                      Ðang dùng
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
