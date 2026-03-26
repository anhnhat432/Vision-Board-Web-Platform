import { useCallback, useState } from "react";
import type { PricingPlanCode } from "../utils/storage";
import { trackPaywallCtaClicked, type MonetizationSource } from "../utils/monetization-analytics";
import type { PremiumFeatureContext } from "../utils/twelve-week-premium";

interface UseUpgradeDialogOptions {
  source: MonetizationSource;
  placement: string;
  currentPlanCode: PricingPlanCode;
  goalId?: string;
}

export function useUpgradeDialog({ source, placement, currentPlanCode, goalId }: UseUpgradeDialogOptions) {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("plan");
  const [recommendedPlan, setRecommendedPlan] = useState<Exclude<PricingPlanCode, "FREE">>("PLUS");

  const openUpgradeDialog = useCallback(
    (context: PremiumFeatureContext, planCode: Exclude<PricingPlanCode, "FREE"> = "PLUS") => {
      trackPaywallCtaClicked({
        goalId,
        context,
        source,
        currentPlan: currentPlanCode,
        recommendedPlan: planCode,
        targetPlan: planCode,
        placement,
      });
      setUpgradeContext(context);
      setRecommendedPlan(planCode);
      setIsUpgradeDialogOpen(true);
    },
    [goalId, source, currentPlanCode, placement],
  );

  return {
    isUpgradeDialogOpen,
    setIsUpgradeDialogOpen,
    upgradeContext,
    recommendedPlan,
    openUpgradeDialog,
  };
}
