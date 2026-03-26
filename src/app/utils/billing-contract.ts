import type { MonetizationSource } from "./monetization-analytics";
import type {
  BillingProviderMode,
  Entitlement,
  EntitlementKey,
  PricingPlanCode,
  Subscription,
} from "./storage-types";
import type { PremiumFeatureContext } from "./twelve-week-premium";

export interface BillingProviderStatus {
  mode: BillingProviderMode;
  providerLabel: string;
  checkoutReady: boolean;
  restoreReady: boolean;
  entitlementSyncReady: boolean;
  manageBillingReady: boolean;
}

export interface CheckoutFlowInput {
  planCode: Exclude<PricingPlanCode, "FREE">;
  context: PremiumFeatureContext;
  goalId?: string;
  source?: MonetizationSource;
  recommendedPlan?: PricingPlanCode;
}

export interface CheckoutFlowResult {
  ok: boolean;
  status: "upgraded" | "already_active" | "redirect_required";
  providerMode: BillingProviderMode;
  planCode: PricingPlanCode;
  message: string;
  checkoutUrl?: string;
}

export interface BillingActionSnapshot {
  at: string;
  status: "success" | "local_only" | "not_configured" | "offline" | "error";
  providerMode: BillingProviderMode;
  planCode: PricingPlanCode;
  entitlementCount: number;
  message: string;
}

export interface EntitlementSyncResult {
  ok: boolean;
  status: "synced" | "already_current" | "local_only" | "not_configured" | "offline" | "error";
  providerMode: BillingProviderMode;
  planCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
  message: string;
}

export interface RestoreAccessResult {
  ok: boolean;
  status: "restored" | "already_active" | "local_only" | "not_configured" | "offline" | "error";
  providerMode: BillingProviderMode;
  planCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
  message: string;
}

export interface CustomerPortalResult {
  ok: boolean;
  status: "opened" | "local_only" | "not_configured" | "offline" | "error";
  providerMode: BillingProviderMode;
  providerLabel: string;
  url?: string;
  message: string;
}

export interface BillingAccessContractPayload {
  subscription?: Partial<Subscription> | null;
  entitlements?: Entitlement[] | EntitlementKey[];
  planCode?: PricingPlanCode;
  message?: string;
  checkoutUrl?: string;
  portalUrl?: string;
  providerLabel?: string;
}

export interface BillingProvider {
  getStatus: () => BillingProviderStatus;
  startCheckout: (input: CheckoutFlowInput) => Promise<CheckoutFlowResult>;
  syncEntitlements: (goalId?: string) => Promise<EntitlementSyncResult>;
  restoreAccess: (goalId?: string) => Promise<RestoreAccessResult>;
  openCustomerPortal?: (goalId?: string) => Promise<CustomerPortalResult>;
}

export function getBillingProviderModeLabel(mode: BillingProviderMode): string {
  switch (mode) {
    case "api_contract":
      return "API contract";
    case "mock_provider":
      return "Mock provider";
    default:
      return "Local test";
  }
}

export function getBillingReadinessLabel(isReady: boolean, fallbackLabel = "Chưa cấu hình"): string {
  return isReady ? "Sẵn sàng" : fallbackLabel;
}

export function getBillingActionStatusLabel(status: BillingActionSnapshot["status"]): string {
  switch (status) {
    case "success":
      return "Thành công";
    case "local_only":
      return "Local only";
    case "offline":
      return "Đang offline";
    case "not_configured":
      return "Chưa cấu hình";
    default:
      return "Có lỗi";
  }
}
