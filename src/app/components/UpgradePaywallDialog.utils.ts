import type { MonetizationSource } from "../utils/monetization-analytics";
import type { PricingPlanCode } from "../utils/storage-types";
import type { PremiumFeatureContext } from "../utils/twelve-week-premium";

const DEFAULT_BILLING_RETURN_PATH = "/12-week-system?tab=settings";

export interface UpgradePaywallDialogProps {
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

export function getCurrentUpgradeOriginPath(): string {
  if (typeof window === "undefined") return DEFAULT_BILLING_RETURN_PATH;
  return `${window.location.pathname || "/"}${window.location.search}`;
}

export function buildBillingPlanUpgradePath(originPath: string): string {
  const safeOriginPath = originPath.trim() || DEFAULT_BILLING_RETURN_PATH;
  return `/billing/plan?returnTo=${encodeURIComponent(safeOriginPath)}`;
}