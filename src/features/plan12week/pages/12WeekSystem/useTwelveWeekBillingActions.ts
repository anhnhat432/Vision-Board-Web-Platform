import type { RefObject } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { trackPaywallCtaClicked } from "@/app/utils/monetization-analytics";
import { openBillingCustomerPortal, restorePlanAccess, syncEntitlementsWithProvider } from "@/app/utils/production";
import { trackAppEvent } from "@/app/utils/storage";
import type { PricingPlanCode } from "@/app/utils/storage-types";
import type { PremiumFeatureContext } from "@/app/utils/twelve-week-premium";

interface UseTwelveWeekBillingActionsOptions {
  activeGoalId: string | null;
  activeGoalIdRef: RefObject<string | null>;
  activeTab: string;
  activePlanCode: PricingPlanCode;
  refreshSnapshotMeta: () => void;
}

export function useTwelveWeekBillingActions({
  activeGoalId,
  activeGoalIdRef,
  activeTab,
  activePlanCode,
  refreshSnapshotMeta,
}: UseTwelveWeekBillingActionsOptions) {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("review");
  const [upgradeRecommendedPlan, setUpgradeRecommendedPlan] = useState<Exclude<PricingPlanCode, "FREE">>("PLUS");
  const [isSyncingEntitlements, setIsSyncingEntitlements] = useState(false);
  const [isRestoringPlanAccess, setIsRestoringPlanAccess] = useState(false);

  const handleOpenUpgradeDialog = (
    context: PremiumFeatureContext,
    recommendedPlan: Exclude<PricingPlanCode, "FREE"> = "PLUS",
  ) => {
    if (!activeGoalId) return;

    trackPaywallCtaClicked({
      goalId: activeGoalId,
      context,
      source: activeTab === "settings" ? "settings" : context === "review" ? "review_teaser" : "12_week_system",
      currentPlan: activePlanCode,
      recommendedPlan,
      targetPlan: recommendedPlan,
      placement:
        activeTab === "settings"
          ? "settings_plan_card"
          : context === "review"
            ? "weekly_review_teaser"
            : "inline_upgrade",
    });
    setUpgradeContext(context);
    setUpgradeRecommendedPlan(recommendedPlan);
    setIsUpgradeDialogOpen(true);
  };

  const handleCheckoutComplete = () => {
    refreshSnapshotMeta();
  };

  const handleRestorePlanAccess = async () => {
    if (!activeGoalId) return;
    const actionGoalId = activeGoalId;
    setIsRestoringPlanAccess(true);

    try {
      const result = await restorePlanAccess(actionGoalId);

      if (result.ok && result.planCode !== "FREE") {
        toast.success(result.message);
      } else if (result.ok) {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }

      if (activeGoalIdRef.current === actionGoalId) {
        refreshSnapshotMeta();
      }
    } finally {
      setIsRestoringPlanAccess(false);
    }
  };

  const handleSyncEntitlements = async () => {
    if (!activeGoalId) return;
    const actionGoalId = activeGoalId;
    setIsSyncingEntitlements(true);

    try {
      const result = await syncEntitlementsWithProvider(actionGoalId);

      if (result.ok) {
        trackAppEvent("billing_access_synced", actionGoalId, {
          plan: result.planCode,
          providerMode: result.providerMode,
          entitlementCount: String(result.entitlementKeys.length),
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      if (activeGoalIdRef.current === actionGoalId) {
        refreshSnapshotMeta();
      }
    } finally {
      setIsSyncingEntitlements(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!activeGoalId) return;
    const result = await openBillingCustomerPortal(activeGoalId);

    if (result.ok && result.url && typeof window !== "undefined") {
      const isSameOriginTarget = result.url.startsWith("/") || result.url.startsWith(window.location.origin);

      if (isSameOriginTarget) {
        window.location.assign(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }

      toast.success(result.message);
      return;
    }

    if (result.ok) {
      toast.success(result.message);
    } else if (result.status === "local_only" || result.status === "not_configured") {
      toast.info(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return {
    isUpgradeDialogOpen,
    setIsUpgradeDialogOpen,
    upgradeContext,
    upgradeRecommendedPlan,
    isSyncingEntitlements,
    isRestoringPlanAccess,
    handleOpenUpgradeDialog,
    handleCheckoutComplete,
    handleRestorePlanAccess,
    handleSyncEntitlements,
    handleOpenBillingPortal,
  };
}
