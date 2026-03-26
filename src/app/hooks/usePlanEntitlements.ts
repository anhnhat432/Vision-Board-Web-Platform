import { useMemo } from "react";
import type { PricingPlanCode, EntitlementKey, UserData } from "../utils/storage";
import { getCurrentPlan, getCurrentEntitlementKeys } from "../utils/storage";
import { getPlanDefinition } from "../utils/twelve-week-premium";

const PREMIUM_STATUS_ITEMS = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
] as const;

export function usePlanEntitlements(userData: UserData) {
  return useMemo(() => {
    const currentPlanCode = getCurrentPlan(userData);
    const currentPlanDefinition = getPlanDefinition(currentPlanCode);
    const entitlementKeys = getCurrentEntitlementKeys(userData);
    const hasPremiumReviewInsights = entitlementKeys.includes("premium_review_insights");

    return {
      currentPlanCode,
      currentPlanDefinition,
      entitlementKeys,
      hasPremiumReviewInsights,
      premiumStatusItems: PREMIUM_STATUS_ITEMS,
    };
  }, [userData]);
}
