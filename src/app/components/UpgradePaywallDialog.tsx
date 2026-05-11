import { CreditCard, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isDemoMode, shouldShowBillingDebugUi } from "../utils/app-mode";
import { type MonetizationSource, trackPaywallCtaClicked, trackPaywallViewed } from "../utils/monetization-analytics";
import { getBillingProviderStatus, startCheckoutFlow } from "../utils/production";
import type { PricingPlanCode } from "../utils/storage-types";
import {
  getPaywallCopy,
  getPlanLabel,
  PLAN_DEFINITIONS,
  type PremiumFeatureContext,
} from "../utils/twelve-week-premium";
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

type UpgradeCheckoutMode = "billing_plan" | "checkout";

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
  checkoutMode?: UpgradeCheckoutMode;
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
  onCheckoutComplete,
  checkoutMode = "billing_plan",
  returnUrl,
}: UpgradePaywallDialogProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [originPath, setOriginPath] = useState(() => getCurrentUpgradeOriginPath());
  const paywallCopy = useMemo(() => getPaywallCopy(context), [context]);
  const billingProviderStatus = useMemo(() => getBillingProviderStatus(), []);
  const billingDebugUi = shouldShowBillingDebugUi();
  const demoMode = isDemoMode();
  const providerLabel = billingProviderStatus.providerLabel || "đơn vị thanh toán";
  const upgradeFeatureLabel = paywallCopy.bullets[0] ?? paywallCopy.title;

  useEffect(() => {
    if (!open) return;

    setOriginPath(getCurrentUpgradeOriginPath());
    trackPaywallViewed({
      goalId,
      context,
      source,
      currentPlan,
      recommendedPlan: recommendedPlan ?? paywallCopy.recommendedPlan,
    });
  }, [context, currentPlan, goalId, open, paywallCopy.recommendedPlan, recommendedPlan, source]);

  const handleUpgrade = async (planCode: Exclude<PricingPlanCode, "FREE">) => {
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

      if (checkoutMode === "billing_plan") {
        if (typeof window !== "undefined") {
          window.location.assign(buildBillingPlanUpgradePath(originPath));
        }
        onOpenChange(false);
        return;
      }

      const result = await startCheckoutFlow({
        planCode,
        context,
        goalId,
        source,
        recommendedPlan: recommendedPlan ?? paywallCopy.recommendedPlan,
        returnUrl: returnUrl ?? DEFAULT_BILLING_RETURN_PATH,
      });

      if (!result.ok) {
        toast.error(result.message);
      } else if (result.status === "redirect_required") {
        if (result.checkoutUrl && typeof window !== "undefined") {
          const isSameOriginCheckout =
            result.checkoutUrl.startsWith("/") || result.checkoutUrl.startsWith(window.location.origin);

          if (isSameOriginCheckout) {
            window.location.assign(result.checkoutUrl);
          } else {
            window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
          }
        }

        toast.success(result.message, {
          description: "Tiếp tục thanh toán để hoàn tất nâng cấp.",
        });
      } else if (result.status === "already_active") {
        toast.info(result.message);
      } else {
        toast.success(result.message, {
          description: "Quyền đã được cập nhật trên tài khoản của bạn.",
        });
      }

      if (result.ok && result.status !== "redirect_required") {
        onCheckoutComplete?.(result.planCode);
      }

      onOpenChange(false);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-0 gradient-shell p-0 shadow-2xl sm:!max-w-4xl">
        <div className="max-h-[calc(100vh-1rem)] overflow-hidden rounded-[var(--r-card)] sm:rounded-[var(--r-card)]">
          {/* Demo banner - only show in demo mode */}
          {demoMode && (
            <div className="border-b border-amber-400 bg-amber-50 px-5 py-3 sm:px-7">
              <div className="flex items-center justify-center gap-2 text-amber-900">
                <span className="font-semibold">Bản dùng thử</span>
                <span className="text-amber-700">Không cần thanh toán thật. Quyền chỉ mở trên trình duyệt này.</span>
              </div>
            </div>
          )}
          <div className="border-b border-white/70 gradient-dark-indigo px-5 py-6 text-white sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  {demoMode ? "Dùng thử Plus" : "Plus cho hệ 12 tuần"}
                </div>
                <DialogHeader className="mt-4 text-left">
                  <DialogTitle className="text-3xl font-bold leading-tight text-white">
                    {title ?? paywallCopy.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-xl text-sm leading-7 text-white/74">
                    {description ?? paywallCopy.description}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="rounded-[var(--r-card)] border border-white/12 bg-white/10 px-4 py-4 text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Gói hiện tại</p>
                <p className="mt-2 text-2xl font-bold text-white">{getPlanLabel(currentPlan)}</p>
              </div>
            </div>
          </div>

          <div className="grid max-h-[calc(100vh-14rem)] gap-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-[var(--r-card)] border border-white/70 bg-white/82 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Điều Plus giúp bạn ngay lúc này
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Chế độ</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingProviderStatus.mode === "api_contract"
                          ? "API contract"
                          : billingProviderStatus.mode === "mock_provider"
                            ? "Đơn vị nội bộ"
                            : "Cục bộ"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Thanh toán</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {billingProviderStatus.checkoutReady ? "Sẵn sàng" : "Dự phòng trên thiết bị"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Khôi phục</p>
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
                        {!demoMode && (
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            Nâng cấp {plan.name} để mở khoá {upgradeFeatureLabel.toLowerCase()} — gia hạn theo chu kỳ
                            thanh toán hàng tháng/năm theo cấu hình nhà cung cấp.
                          </p>
                        )}
                      </div>
                      <div className="rounded-[var(--r-card)] border border-slate-200 bg-white/90 p-3 text-slate-900">
                        <Crown className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-[var(--r-card)] border border-white/70 bg-white/90 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Giá gói
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{plan.priceLabel}</p>
                      {!demoMode && (
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <CreditCard className="h-4 w-4 text-slate-500" />
                          Thanh toán qua {providerLabel}
                        </p>
                      )}
                    </div>

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
                      disabled={isUpgrading}
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => handleUpgrade(plan.code as Exclude<PricingPlanCode, "FREE">)}
                    >
                      {isCurrent
                        ? demoMode
                          ? "Đang dùng trên thiết bị này"
                          : "Đang dùng"
                        : demoMode
                          ? `Mở ${plan.name}`
                          : `Nâng cấp ${plan.name}`}
                    </Button>
                  </div>
                );
              })}
            </fieldset>
          </div>

          <DialogFooter className="flex flex-col gap-3 border-t border-white/70 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
            <p className="text-sm leading-7 text-slate-500">
              {demoMode
                ? "Bản dùng thử không thu tiền thật. Gói chỉ được mở trên trình duyệt này."
                : billingProviderStatus.mode === "api_contract"
                  ? `Bạn sẽ được chuyển đến trang thanh toán ${billingProviderStatus.providerLabel || "an toàn"} khi xác nhận.`
                  : "Bạn có thể dùng gói miễn phí nếu chưa cần tính năng nâng cao lúc này."}
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
