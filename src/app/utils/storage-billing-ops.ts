import { getSubscriptionGraceState } from "./billing-grace-period";
import { getEntitlementsForPlan, normalizePlanCode } from "./twelve-week-premium";
import type { BillingCycle, EntitlementKey, PricingPlanCode, UserData } from "./storage-types";

export const SUBSCRIPTION_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

interface LocalPlanOptions {
  startedAt?: string;
  billingCycle?: BillingCycle;
}

type PersistCallback = () => void;

export function getPlanRank(planCode: PricingPlanCode): number {
  switch (normalizePlanCode(planCode)) {
    case "PLUS":
      return 1;
    default:
      return 0;
  }
}

export function getCurrentPlanFromData(userData: UserData, persistOnExpiry?: PersistCallback): PricingPlanCode {
  const sub = userData.subscription;
  if (sub?.status === "active" || sub?.status === "trialing") {
    const graceState = getSubscriptionGraceState(userData);
    if (!graceState.active) {
      sub.status = "canceled";
      userData.entitlements = [];
      persistOnExpiry?.();
      return "FREE";
    }
    return normalizePlanCode(sub.planCode);
  }

  if (sub) {
    if ((userData.entitlements ?? []).length > 0) {
      userData.entitlements = [];
      persistOnExpiry?.();
    }
    return "FREE";
  }

  const highestEntitledPlan = (userData.entitlements ?? []).reduce<PricingPlanCode>(
    (currentHighest, entitlement) =>
      getPlanRank(entitlement.sourcePlan) > getPlanRank(currentHighest) ? entitlement.sourcePlan : currentHighest,
    "FREE",
  );

  return normalizePlanCode(highestEntitledPlan);
}

export function hasEntitlementInData(
  key: EntitlementKey,
  userData: UserData,
  persistOnExpiry?: PersistCallback,
): boolean {
  if (getCurrentPlanFromData(userData, persistOnExpiry) === "FREE") return false;
  return (userData.entitlements ?? []).some((entitlement) => entitlement.key === key);
}

export function getCurrentEntitlementKeysFromData(userData: UserData): EntitlementKey[] {
  if (getCurrentPlanFromData(userData) === "FREE") return [];
  return Array.from(new Set((userData.entitlements ?? []).map((entitlement) => entitlement.key)));
}

export function upgradePlanLocallyInData(
  userData: UserData,
  planCode: Exclude<PricingPlanCode, "FREE">,
  options?: LocalPlanOptions,
  persistOnExpiry?: PersistCallback,
): PricingPlanCode {
  const startedAt = options?.startedAt ?? new Date().toISOString();
  const currentPlan = getCurrentPlanFromData(userData, persistOnExpiry);
  const normalizedPlanCode = normalizePlanCode(planCode) as Exclude<PricingPlanCode, "FREE">;

  if (getPlanRank(currentPlan) >= getPlanRank(normalizedPlanCode)) {
    return currentPlan;
  }

  userData.subscription = {
    planCode: normalizedPlanCode,
    status: "active",
    billingCycle: options?.billingCycle ?? "season-pass",
    startedAt,
    renewsAt: null,
    canceledAt: null,
    isLocalTestMode: true,
  };
  userData.entitlements = getEntitlementsForPlan(normalizedPlanCode, startedAt);

  return normalizedPlanCode;
}

export function startTrialLocallyInData(
  userData: UserData,
  planCode: Exclude<PricingPlanCode, "FREE"> = "PLUS",
  trialDays = 7,
  persistOnExpiry?: PersistCallback,
): PricingPlanCode {
  const currentPlan = getCurrentPlanFromData(userData, persistOnExpiry);

  if (getPlanRank(currentPlan) >= getPlanRank(planCode)) {
    return currentPlan;
  }

  const startedAt = new Date().toISOString();
  const renewsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

  userData.subscription = {
    planCode,
    status: "trialing",
    billingCycle: "season-pass",
    startedAt,
    renewsAt,
    canceledAt: null,
    isLocalTestMode: true,
  };
  userData.entitlements = getEntitlementsForPlan(planCode, startedAt);

  return planCode;
}

export function restorePlanAccessLocallyInData(userData: UserData, persistOnExpiry?: PersistCallback): PricingPlanCode {
  const currentPlan = getCurrentPlanFromData(userData, persistOnExpiry);

  if (currentPlan === "FREE") {
    userData.subscription = null;
    userData.entitlements = [];
    return currentPlan;
  }

  const startedAt = userData.subscription?.startedAt ?? new Date().toISOString();
  userData.subscription = {
    planCode: currentPlan,
    status: "active",
    billingCycle: userData.subscription?.billingCycle ?? "season-pass",
    startedAt,
    renewsAt: userData.subscription?.renewsAt ?? null,
    canceledAt: null,
    isLocalTestMode: userData.subscription?.isLocalTestMode ?? true,
  };
  userData.entitlements = getEntitlementsForPlan(currentPlan, startedAt);

  return currentPlan;
}

export function resetBillingAccessInData(userData: UserData): boolean {
  const hadBillingAccess = Boolean(userData.subscription) || (userData.entitlements ?? []).length > 0;

  userData.subscription = null;
  userData.entitlements = [];

  return hadBillingAccess;
}
