
import { getCurrentEntitlementKeys, getCurrentPlan } from "../storage";
import type {
  BillingActionSnapshot,
  CheckoutFlowInput,
  CheckoutFlowResult,
  EntitlementSyncResult,
  RestoreAccessResult,
} from "../billing-contract";
import {
  trackCheckoutCompleted,
  trackCheckoutStarted,
  trackUpgradeRestored,
  type MonetizationSource,
} from "../monetization-analytics";
import type { PricingPlanCode } from "../storage-types";
import { normalizePlanCode } from "../twelve-week-premium";
import { getBillingProvider, getBillingProviderStatus } from "./billingProvider";
import {
  buildBillingActionSnapshot,
  persistBillingActionSnapshot,
  readBillingActionSnapshot,
} from "./billingCore";
import { LAST_ENTITLEMENT_SYNC_KEY, LAST_RESTORE_ACCESS_KEY } from "./env";

export type LocalCheckoutResult = CheckoutFlowResult;

export function getLastEntitlementSyncSnapshot(): BillingActionSnapshot | null {
  return readBillingActionSnapshot(LAST_ENTITLEMENT_SYNC_KEY);
}

export function getLastRestoreAccessSnapshot(): BillingActionSnapshot | null {
  return readBillingActionSnapshot(LAST_RESTORE_ACCESS_KEY);
}

export async function startCheckoutFlow(input: CheckoutFlowInput): Promise<CheckoutFlowResult> {
  const currentPlan = getCurrentPlan();
  const source = input.source ?? ("paywall_dialog" as MonetizationSource);
  const normalizedPlanCode = normalizePlanCode(input.planCode) as Exclude<PricingPlanCode, "FREE">;
  const normalizedRecommendedPlan = input.recommendedPlan
    ? normalizePlanCode(input.recommendedPlan)
    : input.recommendedPlan;

  trackCheckoutStarted({
    goalId: input.goalId,
    context: input.context,
    source,
    currentPlan,
    recommendedPlan: normalizedRecommendedPlan,
    planCode: normalizedPlanCode,
  });

  const provider = getBillingProvider();
  const result = await provider.startCheckout({
    ...input,
    planCode: normalizedPlanCode,
    recommendedPlan: normalizedRecommendedPlan,
  });

  if (result.status !== "redirect_required") {
    trackCheckoutCompleted({
      goalId: input.goalId,
      context: input.context,
      source,
      currentPlan,
      recommendedPlan: normalizedRecommendedPlan,
      planCode: normalizedPlanCode,
      resultPlan: result.planCode,
      mode: result.providerMode,
    });
  }

  return result;
}

export async function startLocalCheckout(input: CheckoutFlowInput): Promise<LocalCheckoutResult> {
  return startCheckoutFlow(input);
}

export async function syncEntitlementsWithProvider(goalId?: string): Promise<EntitlementSyncResult> {
  const status = getBillingProviderStatus();
  const provider = getBillingProvider();

  try {
    const result = await provider.syncEntitlements(goalId);
    const snapshot = buildBillingActionSnapshot(
      result.providerMode,
      result.status === "offline"
        ? "offline"
        : result.status === "error"
          ? "error"
          : result.status === "local_only"
            ? "local_only"
            : result.status === "not_configured"
              ? "not_configured"
              : "success",
      result.planCode,
      result.entitlementKeys,
      result.message,
    );
    persistBillingActionSnapshot(LAST_ENTITLEMENT_SYNC_KEY, snapshot);
    return result;
  } catch {
    const planCode = getCurrentPlan();
    const entitlementKeys = getCurrentEntitlementKeys();
    const message = "Không thể đồng bộ quyền với provider lúc này.";
    persistBillingActionSnapshot(
      LAST_ENTITLEMENT_SYNC_KEY,
      buildBillingActionSnapshot(status.mode, "error", planCode, entitlementKeys, message),
    );
    return {
      ok: false,
      status: "error",
      providerMode: status.mode,
      planCode,
      entitlementKeys,
      message,
    };
  }
}

export async function restorePlanAccess(goalId?: string): Promise<RestoreAccessResult> {
  const status = getBillingProviderStatus();
  const provider = getBillingProvider();

  try {
    const result = await provider.restoreAccess(goalId);
    trackUpgradeRestored({
      goalId,
      source: goalId ? "12_week_system" : "billing_plan",
      status: result.status,
      providerMode: result.providerMode,
      planCode: result.planCode,
      entitlementCount: result.entitlementKeys.length,
    });
    const snapshot = buildBillingActionSnapshot(
      result.providerMode,
      result.status === "offline"
        ? "offline"
        : result.status === "error"
          ? "error"
          : result.status === "local_only"
            ? "local_only"
            : result.status === "not_configured"
              ? "not_configured"
              : "success",
      result.planCode,
      result.entitlementKeys,
      result.message,
    );
    persistBillingActionSnapshot(LAST_RESTORE_ACCESS_KEY, snapshot);
    return result;
  } catch {
    const planCode = getCurrentPlan();
    const entitlementKeys = getCurrentEntitlementKeys();
    const message = "Không thể khôi phục quyền từ provider lúc này.";
    persistBillingActionSnapshot(
      LAST_RESTORE_ACCESS_KEY,
      buildBillingActionSnapshot(status.mode, "error", planCode, entitlementKeys, message),
    );
    return {
      ok: false,
      status: "error",
      providerMode: status.mode,
      planCode,
      entitlementKeys,
      message,
    };
  }
}
