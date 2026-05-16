import { CreditCard, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { sendVerificationEmail } from "@/lib/auth/firebase";
import { shouldShowBillingDebugUi } from "../utils/app-mode";
import { logBillingUiError, toastBillingNetworkError } from "../utils/billing-ui-monitoring";
import { formatVndAmount, getPlusPriceLabel, PLUS_MONTHLY_PRICE_VND } from "../utils/billing-pricing";
import { canUpgradeToPlus, rememberEmailVerificationReturnPath } from "../utils/email-verification-guard";
import { type MonetizationSource, trackPaywallCtaClicked, trackPaywallViewed } from "../utils/monetization-analytics";
import { getBillingProviderStatus } from "../utils/production";
import { BILLING_SUPPORT_EMAIL } from "../utils/production/env";
import type { PricingPlanCode } from "../utils/storage-types";
import {
  getPaywallCopy,
  getPlanLabel,
  PLAN_DEFINITIONS,
  type PremiumFeatureContext,
} from "../utils/twelve-week-premium";
import { BillingTrustSignals } from "./BillingTrustSignals";
import { BillingPlusIllustration } from "./illustrations";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

const DEFAULT_BILLING_RETURN_PATH = "/12-week-system?tab=settings";

export function getCurrentUpgradeOriginPath(): string {
  if (typeof window === "undefined") return DEFAULT_BILLING_RETURN_PATH;
  return `${window.location.pathname || "/"}${window.location.search}`;
}

export function buildBillingPlanUpgradePath(originPath: string): string {
  const safeOriginPath = originPath.trim() || DEFAULT_BILLING_RETURN_PATH;
  return `/billing/plan?returnTo=${encodeURIComponent(safeOriginPath)}`;
}

interface UpgradePaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: PremiumFeatureContext;
  currentPlan: PricingPlanCode;
  goalId?: string;
  title?: string;
  description?: string;
  recommendedPlan?: PricingPlanCode;
  source?: MonetizationSource;
  onCheckoutComplete?: (planCode: PricingPlanCode) => void;
  checkoutMode?: "billing_plan" | "checkout";
  returnUrl?: string;
}

export function UpgradePaywallDialog({
  open,
  onOpenChange,
  context,
  currentPlan,
  goalId,
  title,
  description,
  recommendedPlan,
  source = "paywall_dialog",
}: UpgradePaywallDialogProps) {
  const navigate = useNavigate();
  const authContext = useOptionalAuthContext();
  const user = authContext?.user ?? null;
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const paywallCopy = useMemo(() => getPaywallCopy(context), [context]);
  const billingProviderStatus = useMemo(() => getBillingProviderStatus(), []);
  const billingDebugUi = shouldShowBillingDebugUi();
  const providerLabel = billingProviderStatus.providerLabel || "Casso + VietQR";
  const upgradeFeatureLabel = paywallCopy.bullets[0] ?? paywallCopy.title;
  const blockedFeatureLabel = title ?? upgradeFeatureLabel;
  const plusPriceAmountLabel = formatVndAmount(PLUS_MONTHLY_PRICE_VND);
  const plusPriceLabel = getPlusPriceLabel();
  const receiptEmailLabel = BILLING_SUPPORT_EMAIL ? `email ${BILLING_SUPPORT_EMAIL}` : "email tài khoản của bạn";
  const emailVerificationRequired = Boolean(user) && !canUpgradeToPlus(user);

  useEffect(() => {
    if (!open) return;

    trackPaywallViewed({
      goalId,
      context,
      source,
      currentPlan,
      recommendedPlan: recommendedPlan ?? paywallCopy.recommendedPlan,
    });
  }, [context, currentPlan, goalId, open, paywallCopy.recommendedPlan, recommendedPlan, source]);

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await sendVerificationEmail();
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "UpgradePaywallDialog", action: "send_verification_email" })) {
        logBillingUiError(error, { surface: "UpgradePaywallDialog", action: "send_verification_email" });
      }
    } finally {
      setSendingVerification(false);
    }
  };

  const handleUpgrade = async (planCode: Exclude<PricingPlanCode, "FREE">) => {
    if (emailVerificationRequired) {
      rememberEmailVerificationReturnPath(buildBillingPlanUpgradePath(getCurrentUpgradeOriginPath()));
      return;
    }
    setIsUpgrading(true);

    try {
      trackPaywallCtaClicked({
        goalId,
        context,
        source,
        currentPlan,
        recommendedPlan: recommendedPlan ?? paywallCopy.recommendedPlan,
        targetPlan: planCode,
        placement: "paywall_dialog_plan_card",
      });

      navigate("/billing/confirm");
      onOpenChange(false);
    } catch (error: unknown) {
      if (!toastBillingNetworkError(error, { surface: "UpgradePaywallDialog", action: "start_checkout" })) {
        logBillingUiError(error, { surface: "UpgradePaywallDialog", action: "start_checkout" });
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-0 bg-card p-0 shadow-[var(--shadow-4)] sm:!max-w-4xl">
        <div className="max-h-[calc(100vh-1rem)] overflow-hidden rounded-[var(--r-card)] sm:rounded-[var(--r-card)]">
          <div className="border-b border-white/15 gradient-brand px-5 py-6 text-primary-foreground sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/18 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/82">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Plus cho hệ 12 tuần
                </div>
                <DialogHeader className="mt-4 text-left">
                  <DialogTitle className="text-3xl font-bold leading-tight text-white">
                    {title ?? paywallCopy.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-xl text-sm leading-7 text-white/82">
                    {description ?? paywallCopy.description}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="rounded-[var(--r-card)] border border-white/18 bg-white/12 px-4 py-4 text-left sm:text-right">
                <BillingPlusIllustration className="mb-2 ml-auto hidden w-20 text-white opacity-80 sm:block" />
                <p className="text-xs uppercase tracking-[0.16em] text-white/64">Gói hiện tại</p>
                <p className="mt-2 text-2xl font-bold text-white">{getPlanLabel(currentPlan)}</p>
              </div>
            </div>
          </div>

          <div className="grid max-h-[calc(100vh-14rem)] gap-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-[var(--r-card)] border border-white/70 bg-white/82 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Tính năng đang bị giới hạn
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{blockedFeatureLabel}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Gói Miễn phí vẫn giúp bạn chạy một chu kỳ 12 tuần cơ bản. Plus mở thêm lớp nâng cao để setup nhanh hơn,
                  giữ nhịp tốt hơn và review rõ hơn.
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Plus mở khóa
                </p>
                <div className="mt-4 space-y-3">
                  {paywallCopy.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 rounded-[var(--r-tile)] border border-slate-100 bg-white px-4 py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <p className="text-sm leading-7 text-slate-700">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {billingDebugUi && (
                <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50/88 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Trạng thái thanh toán
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Chế độ</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingProviderStatus.mode === "api_contract"
                          ? "Máy chủ thanh toán"
                          : billingProviderStatus.mode === "mock_provider"
                            ? "Nhà cung cấp nội bộ"
                            : "Trên thiết bị này"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Thanh toán</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingProviderStatus.checkoutReady ? "Sẵn sàng" : "Dự phòng trên thiết bị"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Khôi phục</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingProviderStatus.restoreReady ? "Sẵn sàng" : "Dự phòng trên thiết bị"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <fieldset className="min-w-0 space-y-4">
              <legend className="sr-only">Chọn gói nâng cấp</legend>
              {emailVerificationRequired ? (
                <div className="rounded-[var(--r-card)] border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <LockKeyhole className="h-4 w-4" />
                    Vui lòng xác thực email trước khi thanh toán.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Email là cách chúng tôi gửi biên nhận và liên hệ khi cần hỗ trợ hoàn tiền.
                    {user?.email ? ` Địa chỉ đang chờ xác thực: ${user.email}.` : ""}
                  </p>
                  <Button className="mt-3" variant="outline" size="sm" onClick={handleSendVerification} disabled={sendingVerification}>
                    {sendingVerification ? "Đang gửi..." : "Gửi email xác thực"}
                  </Button>
                </div>
              ) : null}
              {PLAN_DEFINITIONS.filter((plan) => plan.code !== "FREE").map((plan) => {
                const isRecommended = plan.code === (recommendedPlan ?? paywallCopy.recommendedPlan);
                const isCurrent = plan.code === currentPlan;

                return (
                  <div
                    key={plan.code}
                    className={`rounded-[var(--r-card)] border p-5 shadow-sm ${
                      isRecommended ? "border-violet-300 gradient-violet" : "border-white/70 bg-white/88"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xl font-semibold text-slate-950">{plan.name}</p>
                          {isRecommended && (
                            <Badge className="bg-violet-600 text-white hover:bg-violet-600">Khuyên dùng</Badge>
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                              Gói hiện tại
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{plan.description}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Nâng cấp {plan.name} để mở khoá {upgradeFeatureLabel.toLowerCase()}. Quyền Plus được kích hoạt
                          sau khi Casso xác nhận chuyển khoản ngân hàng.
                        </p>
                      </div>
                      <div className="rounded-[var(--r-card)] border border-slate-200 bg-white/90 p-3 text-slate-900">
                        <Crown className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-[var(--r-card)] border border-white/70 bg-white/90 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Giá gói
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{plusPriceLabel}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                        Thanh toán qua {providerLabel}
                      </p>
                    </div>

                    <BillingTrustSignals compact className="mt-4" supportEmail={BILLING_SUPPORT_EMAIL} />

                    <div className="mt-4 space-y-2">
                      {plan.highlights.map((feature) => (
                        <div
                          key={feature}
                          className="flex gap-3 rounded-[var(--r-tile)] border border-slate-100 bg-white/92 px-4 py-3"
                        >
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                          <p className="text-sm leading-7 text-slate-700">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`mt-5 w-full ${!isCurrent ? "gradient-brand text-white" : ""}`}
                      disabled={isUpgrading || emailVerificationRequired}
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => handleUpgrade(plan.code as Exclude<PricingPlanCode, "FREE">)}
                    >
                      {isCurrent ? "Đang dùng" : "Tiếp tục thanh toán"}
                    </Button>
                  </div>
                );
              })}
            </fieldset>
          </div>

          <DialogFooter className="flex flex-col gap-3 border-t border-white/70 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
            <p className="text-sm leading-7 text-slate-500">
              Bạn sẽ chuyển khoản {plusPriceAmountLabel} đến tài khoản ngân hàng. Sau khi chúng tôi nhận được tiền
              (thường trong 1-2 phút), quyền Plus sẽ kích hoạt và biên nhận gửi về {receiptEmailLabel}. Xem thêm{" "}
              <Link to="/billing/faq" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                câu hỏi thanh toán
              </Link>
              .
            </p>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
              Để sau
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
