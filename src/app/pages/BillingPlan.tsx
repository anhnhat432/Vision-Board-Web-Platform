import { CreditCard, Crown, Loader2, RefreshCw, Shield, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { isDemoMode, isRealMode, shouldShowBillingDebugUi } from "../utils/app-mode";
import { getBillingProviderModeLabel, getBillingReadinessLabel } from "../utils/billing-contract";
import { trackExperimentExposure, trackPaywallCtaClicked } from "../utils/monetization-analytics";
import {
  cancelSubscriptionOnServer,
  getBillingProviderStatus,
  getLastEntitlementSyncSnapshot,
  getLastRestoreAccessSnapshot,
  openBillingCustomerPortal,
  restorePlanAccess,
  syncEntitlementsWithProvider,
} from "../utils/production";
import { getOrAssignExperimentVariant, getUserData, markExperimentExposed, startTrialLocally } from "../utils/storage";
import type { PricingPlanCode } from "../utils/storage-types";
import {
  getEntitlementLabel,
  getPlanLabel,
  PLAN_DEFINITIONS,
  type PremiumFeatureContext,
} from "../utils/twelve-week-premium";

type CheckoutReturnStatus = "idle" | "pending" | "confirmed" | "failed";

export function BillingPlan() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData: syncedUserData, reloadUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const { currentPlanCode, currentPlanDefinition, entitlementKeys, premiumStatusItems } = usePlanEntitlements(userData);

  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("plan");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [checkoutReturnStatus, setCheckoutReturnStatus] = useState<CheckoutReturnStatus>("idle");

  // Handle checkout return URL
  const returnStatus = searchParams.get("status");
  const isCheckoutReturn = returnStatus === "success" && isRealMode();

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
    } catch {
      setCheckoutReturnStatus("failed");
      toast.error("Không thể kiểm tra quyền trên tài khoản. Vui lòng thử lại.");
    }
  }, [isCheckoutReturn, searchParams, setSearchParams, reloadUserData]);

  useEffect(() => {
    if (isCheckoutReturn && checkoutReturnStatus === "idle") {
      pollServerEntitlement();
    }
  }, [isCheckoutReturn, checkoutReturnStatus, pollServerEntitlement]);

  const trialCtaExperiment = useMemo(
    () => getOrAssignExperimentVariant("paywall_trial_cta", ["control", "variant_a"]),
    [],
  );

  useEffect(() => {
    markExperimentExposed("paywall_trial_cta");
    trackExperimentExposure({
      experimentId: "paywall_trial_cta",
      variantId: trialCtaExperiment,
      context: "billing_plan",
    });
  }, [trialCtaExperiment]);

  const demoMode = isDemoMode();
  const billingStatus = useMemo(() => getBillingProviderStatus(), []);
  const subscription = userData.subscription;

  const lastEntitlementSync = useMemo(() => getLastEntitlementSyncSnapshot(), []);
  const lastRestoreAccess = useMemo(() => getLastRestoreAccessSnapshot(), []);

  const handleOpenUpgrade = (context: PremiumFeatureContext = "plan") => {
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
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleCheckoutComplete = (planCode: PricingPlanCode) => {
    reloadUserData();
    if (planCode !== "FREE") {
      toast.success(
        demoMode
          ? `Đã mở ${getPlanLabel(planCode)} trên trình duyệt này.`
          : `Đã cập nhật ${getPlanLabel(planCode)} trên tài khoản của bạn.`,
      );
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

  const isExpired = subscription?.renewsAt && new Date(subscription.renewsAt) < new Date();

  const isTrialing = subscription?.status === "trialing" && !isExpired;

  const trialDaysLeft = useMemo(() => {
    if (!isTrialing || !subscription?.renewsAt) return null;
    const ms = new Date(subscription.renewsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [isTrialing, subscription?.renewsAt]);

  const handleStartTrial = () => {
    setIsStartingTrial(true);
    try {
      const granted = startTrialLocally("PLUS", 7);
      if (granted !== "FREE") {
        toast.success("Đã kích hoạt Plus dùng thử 7 ngày.");
        reloadUserData();
      } else {
        toast.info("Bạn đã có gói này rồi.");
      }
    } finally {
      setIsStartingTrial(false);
    }
  };

  const realMode = isRealMode();

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const result = await cancelSubscriptionOnServer();
      if (result.ok) {
        toast.success(result.message);
        reloadUserData();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsCanceling(false);
      setShowCancelConfirm(false);
    }
  };

  return (
    <div className="flow-shell space-y-5 pb-12">
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={currentPlanCode}
        source="settings"
        onCheckoutComplete={handleCheckoutComplete}
      />

      {/* Hero */}
      <Card className="hero-surface flow-surface overflow-hidden">
        <CardContent className="relative p-5 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
              <CreditCard className="h-4 w-4" />
              {demoMode ? "Plus dùng thử" : "Premium"}
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-bold tracking-normal sm:text-3xl lg:text-4xl">
              {demoMode ? "Quản lý quyền Plus" : "Quản lý gói của bạn"}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-8 text-white/82">
              {demoMode
                ? "Bạn có thể xem trước quyền Plus mà không thanh toán. Khi mở thanh toán thật, giao dịch sẽ được xác nhận qua trang checkout."
                : "Nâng cấp, kiểm tra quyền premium và quản lý thanh toán cho tài khoản của bạn."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checkout return status */}
      {checkoutReturnStatus === "pending" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Đang chờ xác nhận thanh toán</p>
              <p className="text-sm text-amber-700">
                Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận. Vui lòng đợi hoặc nhấn "Kiểm tra
                quyền" bên dưới.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {checkoutReturnStatus === "confirmed" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">Thanh toán đã xác nhận</p>
              <p className="text-sm text-emerald-700">
                Quyền Plus đã được kích hoạt trên tài khoản của bạn.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {checkoutReturnStatus === "failed" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Không thể kiểm tra thanh toán</p>
              <p className="text-sm text-red-700">Vui lòng nhấn "Kiểm tra quyền" bên dưới hoặc thử lại sau.</p>
            </div>
            <Button variant="outline" size="sm" onClick={pollServerEntitlement}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current plan */}
      <Card className="flow-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-violet-600" />
            Gói hiện tại
          </CardTitle>
          <CardDescription>
            {currentPlanCode === "FREE"
              ? demoMode
                ? "Bạn đang dùng gói miễn phí trên trình duyệt này."
                : "Bạn đang dùng gói miễn phí."
              : demoMode
                ? `Bạn đang dùng ${currentPlanDefinition?.name ?? currentPlanCode} trên trình duyệt này.`
                : `Bạn đang dùng ${currentPlanDefinition?.name ?? currentPlanCode} trên tài khoản này.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={
                currentPlanCode !== "FREE"
                  ? "border-violet-300 bg-violet-50 px-4 py-2 text-violet-800"
                  : "border-slate-200 bg-slate-50 px-4 py-2 text-slate-700"
              }
            >
              {currentPlanDefinition?.name ?? currentPlanCode}
            </Badge>
            {currentPlanDefinition && (
              <span className="text-sm text-slate-500">{currentPlanDefinition.priceLabel}</span>
            )}
            {isExpired && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                Đã hết hạn
              </Badge>
            )}
          </div>

          {subscription && (
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="flow-muted p-4">
                <p className="text-slate-500">Trạng thái</p>
                <p className="font-medium text-slate-900">
                  {subscription.status === "active"
                    ? demoMode
                      ? "Đang mở"
                      : "Đang hoạt động"
                    : subscription.status === "trialing"
                      ? demoMode
                        ? "Dùng thử"
                        : "Đang dùng thử"
                      : subscription.status === "canceled"
                        ? "Đã hủy"
                        : "Không hoạt động"}
                </p>
              </div>
              <div className="flow-muted p-4">
                <p className="text-slate-500">Bắt đầu</p>
                <p className="font-medium text-slate-900">{formatDate(subscription.startedAt)}</p>
              </div>
              <div className="flow-muted p-4">
                <p className="text-slate-500">{demoMode ? "Hiệu lực đến" : "Gia hạn / hết hạn"}</p>
                <p className="font-medium text-slate-900">{formatDate(subscription.renewsAt)}</p>
              </div>
              <div className="flow-muted p-4">
                <p className="text-slate-500">Chu kỳ</p>
                <p className="font-medium text-slate-900">
                  {subscription.billingCycle === "monthly"
                    ? demoMode
                      ? "Tháng"
                      : "Tháng"
                    : subscription.billingCycle === "quarterly"
                      ? demoMode
                        ? "Quý"
                        : "Quý"
                      : demoMode
                        ? "Trọn chu kỳ"
                        : "Trọn chu kỳ"}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 pt-2 sm:flex sm:flex-wrap">
            {currentPlanCode === "FREE" ? (
              <>
                <Button className="w-full sm:w-auto" onClick={() => handleOpenUpgrade("plan")}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {demoMode ? "Mở Plus" : "Nâng cấp Plus"}
                </Button>
                {demoMode && !isTrialing && (
                  <div className="flex w-full flex-col items-start gap-1 sm:w-auto">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleStartTrial}
                      disabled={isStartingTrial}
                    >
                      {isStartingTrial
                        ? "Đang kích hoạt…"
                        : trialCtaExperiment === "variant_a"
                          ? "Bắt đầu Plus dùng thử 7 ngày"
                          : "Dùng thử Plus 7 ngày"}
                    </Button>
                    <p className="text-xs text-slate-500">
                      Không cần thẻ trong bản dùng thử. Quyền Plus sẽ mở trên trình duyệt này.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {isTrialing && trialDaysLeft !== null && (
                  <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">Plus dùng thử:</span> còn{" "}
                    {trialDaysLeft} ngày
                    {demoMode ? " dùng thử." : " dùng thử."}
                    <Button
                      size="sm"
                      className="mt-3 w-full sm:ml-3 sm:mt-0 sm:w-auto"
                      onClick={() => handleOpenUpgrade("plan")}
                    >
                      {demoMode ? "Mở Plus" : "Nâng cấp Plus"}
                    </Button>
                  </div>
                )}
                {(billingStatus.manageBillingReady || realMode) && (
                  <Button variant="outline" onClick={handleOpenPortal} disabled={isOpeningPortal}>
                    {isOpeningPortal ? "Đang mở…" : "Quản lý thanh toán"}
                  </Button>
                )}
                {realMode && !showCancelConfirm && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Hủy gói
                  </Button>
                )}
                {showCancelConfirm && (
                  <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-900">Bạn có chắc muốn hủy gói Plus?</p>
                    <p className="mt-1 text-xs text-red-700">
                      Bạn vẫn giữ quyền truy cập cho đến hết chu kỳ hiện tại. Sau đó gói sẽ chuyển về Free.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleCancelSubscription} disabled={isCanceling}>
                        {isCanceling ? "Đang hủy…" : "Xác nhận hủy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={isCanceling}
                      >
                        Giữ gói
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entitlements */}
      <Card className="flow-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Quyền truy cập
          </CardTitle>
          <CardDescription>
            {realMode
              ? "Quyền premium được quản lý qua tài khoản của bạn."
              : "Các quyền Plus đang mở trên trình duyệt này."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {premiumStatusItems.map((key) => {
              const isActive = entitlementKeys.includes(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-4 ${
                    isActive ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isActive ? "✓" : "—"}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-emerald-900" : "text-slate-600"}`}>
                      {getEntitlementLabel(key)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive
                        ? realMode
                          ? "Đang hoạt động"
                          : "Đang mở"
                        : realMode
                          ? "Chưa kích hoạt"
                          : "Chưa mở"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="flow-panel">
        <CardHeader>
          <CardTitle>Thao tác</CardTitle>
          <CardDescription>
            {demoMode
              ? "Kiểm tra quyền Plus, khôi phục quyền đã mở hoặc quay lại trang chính."
              : "Kiểm tra quyền premium, khôi phục giao dịch đã mua hoặc quay lại trang chính."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleSyncEntitlements} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Đang kiểm tra…" : demoMode ? "Kiểm tra quyền Plus" : "Kiểm tra quyền premium"}
            </Button>
            <Button variant="outline" onClick={handleRestoreAccess} disabled={isRestoring}>
              {isRestoring ? "Đang khôi phục…" : demoMode ? "Khôi phục quyền Plus" : "Khôi phục quyền đã mua"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Quay lại bảng điều khiển
            </Button>
          </div>

          {(lastEntitlementSync || lastRestoreAccess) && (
            <div className="space-y-2 text-xs text-slate-500">
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
        </CardContent>
      </Card>

      {/* Billing provider info (debug/demo) */}
      {demoMode && shouldShowBillingDebugUi() && (
        <Card className="flow-panel">
          <CardHeader>
            <CardTitle className="text-sm">Thông tin billing provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div>
                <span className="text-slate-400">Provider: </span>
                {getBillingProviderModeLabel(billingStatus.mode)}
                {billingStatus.providerLabel && ` (${billingStatus.providerLabel})`}
              </div>
              <div>
                <span className="text-slate-400">Thanh toán: </span>
                {getBillingReadinessLabel(billingStatus.checkoutReady)}
              </div>
              <div>
                <span className="text-slate-400">Khôi phục: </span>
                {getBillingReadinessLabel(billingStatus.restoreReady)}
              </div>
              <div>
                <span className="text-slate-400">Đồng bộ quyền: </span>
                {getBillingReadinessLabel(billingStatus.entitlementSyncReady)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compare plans */}
      <Card className="flow-panel">
        <CardHeader>
          <CardTitle>So sánh các gói</CardTitle>
          <CardDescription>
            {demoMode ? "So sánh Free với Plus." : "So sánh Free với Plus."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLAN_DEFINITIONS.map((plan) => (
              <div
                key={plan.code}
                className={`rounded-lg border p-5 ${
                  plan.code === currentPlanCode
                    ? "border-violet-300 bg-violet-50/50"
                    : "border-slate-100 bg-slate-50/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  {plan.code === currentPlanCode && (
                    <Badge variant="outline" className="border-violet-300 text-violet-700">
                      Hiện tại
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900">{plan.priceLabel}</p>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {plan.code !== "FREE" && currentPlanCode === "FREE" && (
                  <Button className="mt-4 w-full" onClick={() => handleOpenUpgrade("plan")}>
                    {demoMode ? "Mở Plus" : "Nâng cấp Plus"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
