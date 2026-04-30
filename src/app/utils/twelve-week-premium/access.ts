import type { Entitlement, EntitlementKey, PricingPlanCode } from "../storage-types";
import { PLAN_DEFINITIONS, PLAN_ENTITLEMENTS } from "./catalog";
import type { PricingPlanDefinition } from "./types";

const PLAN_RANK: Record<PricingPlanCode, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 1,
};

export function normalizePlanCode(planCode: PricingPlanCode): PricingPlanCode {
  return planCode === "PRO" ? "PLUS" : planCode;
}

export function getPlanDefinition(planCode: PricingPlanCode): PricingPlanDefinition {
  const normalizedPlanCode = normalizePlanCode(planCode);
  return PLAN_DEFINITIONS.find((plan) => plan.code === normalizedPlanCode) ?? PLAN_DEFINITIONS[0];
}

export function getPlanLabel(planCode: PricingPlanCode): string {
  return getPlanDefinition(planCode).shortLabel;
}

export function getEntitlementLabel(key: EntitlementKey): string {
  switch (key) {
    case "premium_templates":
      return "Template premium";
    case "premium_review_insights":
      return "Insight review premium";
    case "priority_reminders":
      return "Nhắc việc ưu tiên";
    case "advanced_analytics":
      return "Analytics nâng cao";
    default:
      return key;
  }
}

export function getEntitlementsForPlan(planCode: PricingPlanCode, grantedAt: string): Entitlement[] {
  const normalizedPlanCode = normalizePlanCode(planCode);
  return PLAN_ENTITLEMENTS[normalizedPlanCode].map((key) => ({
    key,
    sourcePlan: normalizedPlanCode,
    grantedAt,
  }));
}

export function planSatisfiesRequirement(currentPlan: PricingPlanCode, requiredPlan: PricingPlanCode | null): boolean {
  if (!requiredPlan) return true;
  return PLAN_RANK[normalizePlanCode(currentPlan)] >= PLAN_RANK[normalizePlanCode(requiredPlan)];
}
