import { apiClient } from "@/lib/api/apiClient";
import { isRealMode } from "../app-mode";
import { getCurrentEntitlementKeys, getCurrentPlan, getUserData, saveUserData } from "../storage";
import type { BillingActionSnapshot, BillingAccessContractPayload } from "../billing-contract";
import type {
  BillingCycle,
  BillingProviderMode,
  Entitlement,
  EntitlementKey,
  PricingPlanCode,
  Subscription,
} from "../storage-types";
import { getEntitlementsForPlan, normalizePlanCode } from "../twelve-week-premium";
import {
  BILLING_API_BASE,
  BILLING_CHECKOUT_ENDPOINT,
  BILLING_ENTITLEMENT_SYNC_ENDPOINT,
  BILLING_PROVIDER_LABEL,
  BILLING_PROVIDER_MODE,
  BILLING_RESTORE_ENDPOINT,
  ENTITLEMENT_KEYS,
} from "./env";

export function persistBillingActionSnapshot(storageKey: string, snapshot: BillingActionSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

export function readBillingActionSnapshot(storageKey: string): BillingActionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as BillingActionSnapshot;
  } catch {
    return null;
  }
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isEntitlementKey(value: unknown): value is EntitlementKey {
  return typeof value === "string" && ENTITLEMENT_KEYS.includes(value as EntitlementKey);
}

export function getPlanRank(planCode: PricingPlanCode): number {
  switch (normalizePlanCode(planCode)) {
    case "PLUS":
      return 1;
    default:
      return 0;
  }
}

export function getProviderLabel(mode: BillingProviderMode): string {
  if (BILLING_PROVIDER_LABEL) return BILLING_PROVIDER_LABEL;

  switch (mode) {
    case "api_contract":
      return "Nhà cung cấp thanh toán";
    case "mock_provider":
      return "Nhà cung cấp giả lập";
    default:
      return "Trên thiết bị này";
  }
}

export function getDefaultBillingCycle(_planCode: Exclude<PricingPlanCode, "FREE">): BillingCycle {
  return "season-pass";
}

export function normalizeRemoteEntitlements(
  entitlements: BillingAccessContractPayload["entitlements"],
  planCode: PricingPlanCode,
  grantedAt: string,
): Entitlement[] {
  if (Array.isArray(entitlements) && entitlements.every((item) => isEntitlementKey(item))) {
    return Array.from(new Set(entitlements)).map((key) => ({
      key,
      sourcePlan: planCode,
      grantedAt,
    }));
  }

  if (Array.isArray(entitlements)) {
    const normalized = entitlements.filter((item): item is Entitlement => {
      return (
        Boolean(item) && typeof item === "object" && isEntitlementKey(item.key) && typeof item.grantedAt === "string"
      );
    });

    if (normalized.length > 0) {
      return normalized.map((item) => ({
        key: item.key,
        sourcePlan: planCode,
        grantedAt: item.grantedAt || grantedAt,
      }));
    }
  }

  return getEntitlementsForPlan(planCode, grantedAt);
}

export function applyBillingAccessPayload(
  payload: BillingAccessContractPayload,
  providerMode: BillingProviderMode,
): { planCode: PricingPlanCode; entitlementKeys: EntitlementKey[] } {
  const data = getUserData();
  const syncedAt = new Date().toISOString();
  const resolvedPlanCode = normalizePlanCode(
    payload.planCode ?? payload.subscription?.planCode ?? getCurrentPlan(data),
  );

  if (resolvedPlanCode === "FREE" || payload.subscription === null) {
    data.subscription = null;
    data.entitlements = [];
    saveUserData(data);
    return { planCode: "FREE", entitlementKeys: [] };
  }

  const previousSubscription = data.subscription ?? null;
  const subscription: Subscription = {
    planCode: resolvedPlanCode,
    status: payload.subscription?.status ?? "active",
    billingCycle:
      payload.subscription?.billingCycle ??
      previousSubscription?.billingCycle ??
      getDefaultBillingCycle(resolvedPlanCode as Exclude<PricingPlanCode, "FREE">),
    startedAt: payload.subscription?.startedAt ?? previousSubscription?.startedAt ?? syncedAt,
    renewsAt: payload.subscription?.renewsAt ?? previousSubscription?.renewsAt ?? null,
    canceledAt: payload.subscription?.canceledAt ?? null,
    isLocalTestMode: providerMode === "local_test",
    providerMode,
    externalCustomerId: payload.subscription?.externalCustomerId ?? previousSubscription?.externalCustomerId ?? null,
    externalSubscriptionId:
      payload.subscription?.externalSubscriptionId ?? previousSubscription?.externalSubscriptionId ?? null,
    lastSyncedAt: syncedAt,
  };

  data.subscription = subscription;
  data.entitlements = normalizeRemoteEntitlements(payload.entitlements, resolvedPlanCode, syncedAt);
  saveUserData(data);

  return {
    planCode: getCurrentPlan(data),
    entitlementKeys: getCurrentEntitlementKeys(data),
  };
}

export async function postBillingContract(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<BillingAccessContractPayload> {
  const payload = await apiClient.post<unknown, Record<string, unknown>>(endpoint, body);
  return payload && typeof payload === "object" ? (payload as BillingAccessContractPayload) : {};
}

export function buildReturnUrl(): string {
  if (typeof window === "undefined") return "/12-week-system?tab=settings";
  return `${window.location.pathname}${window.location.search}`;
}

export function buildBillingContractBody(goalId?: string): Record<string, unknown> {
  const data = getUserData();

  return {
    userId: data.userId,
    goalId,
    currentPlan: getCurrentPlan(data),
    entitlementKeys: getCurrentEntitlementKeys(data),
    returnUrl: buildReturnUrl(),
  };
}

export function buildBillingActionSnapshot(
  providerMode: BillingProviderMode,
  status: BillingActionSnapshot["status"],
  planCode: PricingPlanCode,
  entitlementKeys: EntitlementKey[],
  message: string,
): BillingActionSnapshot {
  return {
    at: new Date().toISOString(),
    status,
    providerMode,
    planCode,
    entitlementCount: entitlementKeys.length,
    message,
  };
}

export function getBillingProviderMode(): BillingProviderMode {
  if (BILLING_PROVIDER_MODE === "api_contract") return "api_contract";
  if (isRealMode()) return "api_contract";
  if (BILLING_PROVIDER_MODE === "local_test") return "local_test";
  if (BILLING_PROVIDER_MODE === "mock_provider") return "mock_provider";

  const hasApiContract =
    Boolean(BILLING_API_BASE) ||
    Boolean(BILLING_CHECKOUT_ENDPOINT) ||
    Boolean(BILLING_RESTORE_ENDPOINT) ||
    Boolean(BILLING_ENTITLEMENT_SYNC_ENDPOINT);

  return hasApiContract ? "api_contract" : "mock_provider";
}
