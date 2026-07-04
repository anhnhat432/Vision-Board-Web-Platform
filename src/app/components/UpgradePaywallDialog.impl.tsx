import { CheckCircle2, CreditCard, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { sendVerificationEmail } from "@/lib/auth/firebase";
import { apiClient } from "@/lib/api/apiClient";
import * as appMode from "../utils/app-mode";
import { formatVndAmount, getPlusPriceLabel, PLUS_MONTHLY_PRICE_VND } from "../utils/billing-pricing";
import { logBillingUiError, toastBillingNetworkError } from "../utils/billing-ui-monitoring";
import { canUpgradeToPlus, rememberEmailVerificationReturnPath } from "../utils/email-verification-guard";
import { trackPaywallCtaClicked, trackPaywallViewed } from "../utils/monetization-analytics";
import { getBillingProviderStatus } from "../utils/production";
import { BILLING_SUPPORT_EMAIL } from "../utils/production/env";
import type { PricingPlanCode } from "../utils/storage-types";
import { getPaywallCopy, getPlanLabel, PLAN_DEFINITIONS } from "../utils/twelve-week-premium";
import { BillingPlusIllustration } from "./illustrations/BillingPlusIllustration";
import { BillingTrustSignals } from "./BillingTrustSignals";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { FeaturedCard } from "./ui/featured-card";
import {
  buildBillingPlanUpgradePath,
  getCurrentUpgradeOriginPath,
  type UpgradePaywallDialogProps,
} from "./UpgradePaywallDialog.utils";

interface SaleEventInfo {
  name: string;
  discountPercent?: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  discountAmount?: number;
  finalAmount?: number;
}

function getNumberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getPaidCheckoutDisabledSafe(): boolean {
  try {
    return appMode.isPaidCheckoutDisabled();
  } catch {
    return false;
  }
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
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const authContext = useOptionalAuthContext();
  const user = authContext?.user ?? null;
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const paywallCopy = useMemo(() => getPaywallCopy(context), [context]);
  const billingProviderStatus = useMemo(() => getBillingProviderStatus(), []);
  const billingDebugUi = appMode.shouldShowBillingDebugUi();
  const paidCheckoutDisabled = getPaidCheckoutDisabledSafe();
  const providerLabel = paidCheckoutDisabled
    ? "cổng thanh toán mới"
    : billingProviderStatus.providerLabel || "nhà cung cấp thanh toán";
  const upgradeFeatureLabel = paywallCopy.bullets[0] ?? paywallCopy.title;
  const blockedFeatureLabel = title ?? upgradeFeatureLabel;
  const [saleEvent, setSaleEvent] = useState<SaleEventInfo | null>(null);

  const baseAmount = PLUS_MONTHLY_PRICE_VND;
  const saleFinalAmount = saleEvent?.finalAmount ?? (saleEvent?.discountPercent
    ? Math.round(baseAmount * (100 - saleEvent.discountPercent) / 100)
    : saleEvent?.discountValue
      ? Math.max(baseAmount - saleEvent.discountValue, 1000)
      : undefined);
  const displayAmount = saleFinalAmount ?? baseAmount;
  const hasActiveSale = saleEvent !== null && saleFinalAmount !== undefined && saleFinalAmount < baseAmount;
  const plusPriceAmountLabel = formatVndAmount(displayAmount);
  const plusPriceLabel = hasActiveSale
    ? `${formatVndAmount(saleFinalAmount)} / ${PLUS_MONTHLY_PRICE_VND > 0 ? "tháng" : ""}`
    : getPlusPriceLabel();
  const receiptEmailLabel = BILLING_SUPPORT_EMAIL ? `email ${BILLING_SUPPORT_EMAIL}` : "email tài khoản của bạn";
  const emailVerificationRequired = Boolean(user) && !canUpgradeToPlus(user);

  // Fetch active sale event when dialog opens so the price reflects what
  // the user will actually pay (backend auto-applies it at checkout).
  const fetchSaleEvent = useCallback(() => {
    const params = new URLSearchParams({
      purpose: "plus_subscription",
      amount: String(PLUS_MONTHLY_PRICE_VND),
    });
    apiClient.get<{ active: boolean } & Record<string, unknown>>(`/billing/active-sale-event?${params.toString()}`)
      .then((data) => {
        if (data?.active) {
          const discountType = data.discountType === "percentage" || data.discountType === "fixed" ? data.discountType : undefined;
          setSaleEvent({
            name: typeof data.name === "string" && data.name.trim() ? data.name : "Đang giảm giá",
            discountPercent: discountType === "percentage" ? getNumberField(data.discountValue) : undefined,
            discountValue: discountType === "fixed" ? getNumberField(data.discountValue) : undefined,
            discountType,
            discountAmount: getNumberField(data.discountAmount),
            finalAmount: getNumberField(data.finalAmount),
          });
        } else {
          setSaleEvent(null);
        }
      })
      .catch(() => { /* sale event is optional */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchSaleEvent();
  }, [open, fetchSaleEvent]);

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
    if (paidCheckoutDisabled) {
      toast.info(
        "Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ support để mở Plus thủ công.",
      );
      return;
    }
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
      <DialogContent
        className="!flex !max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] !overflow-hidden rounded-card border border-app-line bg-app-surface !p-0 shadow-app-md sm:!max-w-4xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogTitleRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-card">
          <div className="shrink-0 border-b border-app-line bg-app-surface px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">
                  <LockKeyhole className="h-3.5 w-3.5 text-app-accent" />
                  Plus cho hệ 12 tuần
                </div>
                <DialogHeader className="mt-4 text-left">
                  <DialogTitle
                    ref={dialogTitleRef}
                    tabIndex={-1}
                    className="font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink focus:outline-none"
                  >
                    {title ?? paywallCopy.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-xl text-sm leading-7 text-app-ink-soft">
                    {description ?? paywallCopy.description}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex items-center gap-6">
                <BillingPlusIllustration className="hidden h-20 w-20 text-app-accent sm:block" />
                <div className="rounded-card border border-app-line bg-app-bg px-4 py-4 text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-app-ink-muted">Gói hiện tại</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-app-ink">{getPlanLabel(currentPlan)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain bg-app-bg px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-card border border-app-line bg-app-surface p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">
                  Tính năng đang bị giới hạn
                </p>
                <h3 className="mt-2 text-xl font-medium text-app-ink">{blockedFeatureLabel}</h3>
                <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                  Gói Miễn phí vẫn giúp bạn chạy một chu kỳ 12 tuần cơ bản. Plus mở thêm lớp nâng cao để setup nhanh
                  hơn, giữ nhịp tốt hơn và review rõ hơn.
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">Plus mở khóa</p>
                <div className="mt-4 space-y-3">
                  {paywallCopy.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 rounded-lg border border-app-line bg-app-bg px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                      <p className="text-sm leading-7 text-app-ink-soft">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {billingDebugUi && (
                <div className="rounded-card border border-app-line bg-app-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">
                    Trạng thái thanh toán
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">Chế độ</p>
                      <p className="mt-2 text-sm font-medium text-app-ink">
                        {billingProviderStatus.mode === "api_contract"
                          ? "Máy chủ thanh toán"
                          : billingProviderStatus.mode === "mock_provider"
                            ? "Nhà cung cấp nội bộ"
                            : "Trên thiết bị này"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">Thanh toán</p>
                      <p className="mt-2 text-sm font-medium text-app-ink">
                        {billingProviderStatus.checkoutReady ? "Sẵn sàng" : "Dự phòng trên thiết bị"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">Khôi phục</p>
                      <p className="mt-2 text-sm font-medium text-app-ink">
                        {billingProviderStatus.restoreReady ? "Sẵn sàng" : "Dự phòng trên thiết bị"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <fieldset className="min-w-0 space-y-4">
              <legend className="sr-only">Chọn gói nâng cấp</legend>
              {paidCheckoutDisabled ? (
                <div
                  role="status"
                  data-testid="paid-checkout-disabled-banner"
                  className="rounded-card border border-app-warm-border bg-app-warm-soft px-4 py-4 text-app-warm-strong"
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <LockKeyhole className="h-4 w-4 text-app-warm" />
                    Thanh toán đang tạm khóa.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                    Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Quyền hiện có không bị ảnh
                    hưởng. Nếu bạn muốn nâng cấp ngay, liên hệ{" "}
                    {BILLING_SUPPORT_EMAIL ? (
                      <a
                        href={`mailto:${BILLING_SUPPORT_EMAIL}`}
                        className="font-medium text-app-ink underline-offset-4 hover:underline"
                      >
                        {BILLING_SUPPORT_EMAIL}
                      </a>
                    ) : (
                      "đội hỗ trợ"
                    )}{" "}
                    để mở Plus thủ công.
                  </p>
                </div>
              ) : null}
              {emailVerificationRequired ? (
                <div className="rounded-card border border-app-warm-border bg-app-warm-soft px-4 py-4 text-app-warm-strong">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <LockKeyhole className="h-4 w-4 text-app-warm" />
                    Vui lòng xác thực email trước khi thanh toán.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-app-ink-soft">
                    Email là cách chúng tôi gửi biên nhận và liên hệ khi cần hỗ trợ hoàn tiền.
                    {user?.email ? ` Địa chỉ đang chờ xác thực: ${user.email}.` : ""}
                  </p>
                  <Button
                    className="mt-3 border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerification}
                    disabled={sendingVerification}
                  >
                    {sendingVerification ? "Đang gửi..." : "Gửi email xác thực"}
                  </Button>
                </div>
              ) : null}
              {PLAN_DEFINITIONS.filter((plan) => plan.code !== "FREE").map((plan) => {
                const isRecommended = plan.code === (recommendedPlan ?? paywallCopy.recommendedPlan);
                const isCurrent = plan.code === currentPlan;

                return isRecommended ? (
                  <FeaturedCard key={plan.code} className="overflow-hidden p-5 sm:p-6">
                    {isRecommended && (
                      <span className="absolute right-4 top-4 rounded-full bg-app-accent px-3 py-1 text-xs font-medium text-white">
                        Phổ biến
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3 pr-20">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-serif text-lg font-medium text-app-ink">{plan.name}</p>
                          {isCurrent && (
                            <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                              Gói hiện tại
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">{plan.description}</p>
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                          Nâng cấp {plan.name} để mở khoá {upgradeFeatureLabel.toLowerCase()}. Quyền Plus được kích hoạt
                          sau khi hệ thống xác nhận giao dịch.
                        </p>
                      </div>
                      <div className="rounded-lg border border-app-line bg-app-surface p-3 text-app-accent">
                        <Crown className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-card border border-app-line bg-app-surface px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-app-ink-muted">Giá gói</p>
                      {hasActiveSale ? (
                        <>
                          <div className="mt-2 flex items-baseline gap-3">
                            <span className="font-serif text-4xl font-medium text-app-ink">{formatVndAmount(displayAmount)}</span>
                            <span className="text-lg text-app-ink-muted line-through">{formatVndAmount(baseAmount)}</span>
                          </div>
                          {saleEvent?.name && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-app-accent">
                              <Sparkles className="h-3.5 w-3.5" />
                              {saleEvent.name}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 font-serif text-4xl font-medium text-app-ink">{plusPriceLabel}</p>
                      )}
                      <p className="mt-2 flex items-center gap-2 text-sm font-medium text-app-ink-soft">
                        <CreditCard className="h-4 w-4 text-app-accent" />
                        Thanh toán qua {providerLabel}
                      </p>
                    </div>

                    <BillingTrustSignals compact className="mt-4" supportEmail={BILLING_SUPPORT_EMAIL} />

                    <div className="mt-4 space-y-2">
                      {plan.highlights.map((feature) => (
                        <div
                          key={feature}
                          className="flex gap-3 rounded-lg border border-app-line bg-app-surface px-4 py-3"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                          <p className="text-sm leading-7 text-app-ink-soft">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`mt-5 w-full ${
                        isCurrent
                          ? "border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                          : "border-transparent bg-app-accent text-white hover:bg-app-accent/90"
                      }`}
                      disabled={isUpgrading || emailVerificationRequired || paidCheckoutDisabled}
                      variant="outline"
                      onClick={() => handleUpgrade(plan.code as Exclude<PricingPlanCode, "FREE">)}
                      data-testid={`paywall-upgrade-cta-${plan.code.toLowerCase()}`}
                    >
                      {isCurrent ? "Đang dùng" : paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Tiếp tục thanh toán"}
                    </Button>
                  </FeaturedCard>
                ) : (
                  <div
                    key={plan.code}
                    className="overflow-hidden rounded-card-lg border border-app-line bg-app-surface p-5 shadow-[var(--shadow-1)] sm:p-6"
                  >
                    {isRecommended && (
                      <span className="absolute right-4 top-4 rounded-full bg-app-accent px-3 py-1 text-xs font-medium text-white">
                        Phổ biến
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3 pr-20">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-serif text-lg font-medium text-app-ink">{plan.name}</p>
                          {isCurrent && (
                            <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                              Gói hiện tại
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">{plan.description}</p>
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                          Nâng cấp {plan.name} để mở khoá {upgradeFeatureLabel.toLowerCase()}. Quyền Plus được kích hoạt
                          sau khi hệ thống xác nhận giao dịch.
                        </p>
                      </div>
                      <div className="rounded-lg border border-app-line bg-app-surface p-3 text-app-accent">
                        <Crown className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-card border border-app-line bg-app-surface px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-app-ink-muted">Giá gói</p>
                      {hasActiveSale ? (
                        <>
                          <div className="mt-2 flex items-baseline gap-3">
                            <span className="font-serif text-4xl font-medium text-app-ink">{formatVndAmount(displayAmount)}</span>
                            <span className="text-lg text-app-ink-muted line-through">{formatVndAmount(baseAmount)}</span>
                          </div>
                          {saleEvent?.name && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-app-accent">
                              <Sparkles className="h-3.5 w-3.5" />
                              {saleEvent.name}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 font-serif text-4xl font-medium text-app-ink">{plusPriceLabel}</p>
                      )}
                      <p className="mt-2 flex items-center gap-2 text-sm font-medium text-app-ink-soft">
                        <CreditCard className="h-4 w-4 text-app-accent" />
                        Thanh toán qua {providerLabel}
                      </p>
                    </div>

                    <BillingTrustSignals compact className="mt-4" supportEmail={BILLING_SUPPORT_EMAIL} />

                    <div className="mt-4 space-y-2">
                      {plan.highlights.map((feature) => (
                        <div
                          key={feature}
                          className="flex gap-3 rounded-lg border border-app-line bg-app-surface px-4 py-3"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                          <p className="text-sm leading-7 text-app-ink-soft">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`mt-5 w-full ${
                        isCurrent
                          ? "border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                          : "border-transparent bg-app-accent text-white hover:bg-app-accent/90"
                      }`}
                      disabled={isUpgrading || emailVerificationRequired || paidCheckoutDisabled}
                      variant="outline"
                      onClick={() => handleUpgrade(plan.code as Exclude<PricingPlanCode, "FREE">)}
                      data-testid={`paywall-upgrade-cta-${plan.code.toLowerCase()}`}
                    >
                      {isCurrent ? "Đang dùng" : paidCheckoutDisabled ? "Tạm khóa thanh toán" : "Tiếp tục thanh toán"}
                    </Button>
                  </div>
                );
              })}
            </fieldset>
          </div>

          <DialogFooter className="flex shrink-0 flex-col gap-3 border-t border-app-line bg-app-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
            <p className="text-sm leading-7 text-app-ink-soft">
              Bạn sẽ thanh toán {plusPriceAmountLabel} qua nhà cung cấp thanh toán. Sau khi hệ thống xác nhận giao dịch,
              quyền Plus sẽ kích hoạt và biên nhận gửi về {receiptEmailLabel}. Xem thêm{" "}
              <Link to="/billing/faq" className="font-medium text-app-accent underline-offset-4 hover:underline">
                câu hỏi thanh toán
              </Link>
              .
            </p>
            <Button
              className="w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg sm:w-auto"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Để sau
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
