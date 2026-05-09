import type { BillingAccessContractPayload, BillingProvider, CheckoutFlowInput } from "../billing-contract";
import { type MonetizationSource, trackCheckoutCompleted } from "../monetization-analytics";
import { getCurrentEntitlementKeys, getCurrentPlan, getUserData, saveUserData } from "../storage";
import type { BillingCycle, Entitlement, PricingPlanCode } from "../storage-types";
import { getEntitlementsForPlan, normalizePlanCode } from "../twelve-week-premium";
import {
  applyBillingAccessPayload,
  buildReturnUrl,
  getDefaultBillingCycle,
  getPlanRank,
  getProviderLabel,
} from "./billingCore";
import { MOCK_BILLING_ACCOUNT_KEY, MOCK_BILLING_SESSION_PREFIX } from "./env";

export interface MockBillingProviderAccount {
  customerId: string;
  subscriptionId: string;
  planCode: Exclude<PricingPlanCode, "FREE">;
  status: "active";
  billingCycle: BillingCycle;
  startedAt: string;
  renewsAt: string | null;
  entitlements: Entitlement[];
  updatedAt: string;
}

export interface MockBillingCheckoutSession {
  id: string;
  planCode: Exclude<PricingPlanCode, "FREE">;
  context: CheckoutFlowInput["context"];
  goalId?: string;
  source?: MonetizationSource;
  recommendedPlan?: PricingPlanCode;
  createdAt: string;
  returnUrl: string;
}

export interface MockCheckoutCompletionResult {
  ok: boolean;
  planCode: PricingPlanCode;
  returnUrl: string;
  message: string;
}

function readMockBillingAccount(): MockBillingProviderAccount | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(MOCK_BILLING_ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MockBillingProviderAccount;
  } catch {
    return null;
  }
}

function writeMockBillingAccount(account: MockBillingProviderAccount | null): void {
  if (typeof window === "undefined") return;

  if (!account) {
    localStorage.removeItem(MOCK_BILLING_ACCOUNT_KEY);
    saveUserData(getUserData());
    return;
  }

  localStorage.setItem(MOCK_BILLING_ACCOUNT_KEY, JSON.stringify(account));
  saveUserData(getUserData());
}

function getMockSessionKey(sessionId: string): string {
  return `${MOCK_BILLING_SESSION_PREFIX}${sessionId}`;
}

function writeMockCheckoutSession(session: MockBillingCheckoutSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getMockSessionKey(session.id), JSON.stringify(session));
}

export function getMockCheckoutSession(sessionId: string): MockBillingCheckoutSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getMockSessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as MockBillingCheckoutSession;
  } catch {
    return null;
  }
}

export function cancelMockCheckoutSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getMockSessionKey(sessionId));
}

export function getMockBillingAccount(): MockBillingProviderAccount | null {
  return readMockBillingAccount();
}

function buildMockBillingPayload(account: MockBillingProviderAccount): BillingAccessContractPayload {
  return {
    planCode: account.planCode,
    subscription: {
      planCode: account.planCode,
      status: "active",
      billingCycle: account.billingCycle,
      startedAt: account.startedAt,
      renewsAt: account.renewsAt,
      canceledAt: null,
      externalCustomerId: account.customerId,
      externalSubscriptionId: account.subscriptionId,
    },
    entitlements: account.entitlements,
    message: `Gói ${account.planCode} đang mở trên trình duyệt này.`,
  };
}

function createMockCheckoutUrl(sessionId: string): string {
  return `/billing/mock-checkout?session=${encodeURIComponent(sessionId)}`;
}

export const mockBillingProvider: BillingProvider = {
  getStatus: () => ({
    mode: "mock_provider",
    providerLabel: getProviderLabel("mock_provider"),
    checkoutReady: true,
    restoreReady: true,
    entitlementSyncReady: true,
    manageBillingReady: false,
  }),
  startCheckout: async (input) => {
    const currentPlan = getCurrentPlan();
    const existingAccount = readMockBillingAccount();

    if (existingAccount && getPlanRank(existingAccount.planCode) >= getPlanRank(input.planCode)) {
      const { planCode } = applyBillingAccessPayload(buildMockBillingPayload(existingAccount), "mock_provider");
      return {
        ok: true,
        status: "already_active",
        providerMode: "mock_provider",
        planCode,
        message: `Gói ${planCode} đã sẵn sàng trên trình duyệt này.`,
      };
    }

    if (getPlanRank(currentPlan) >= getPlanRank(input.planCode)) {
      return {
        ok: true,
        status: "already_active",
        providerMode: "mock_provider",
        planCode: currentPlan,
        message: `Gói ${currentPlan} đã mở trên thiết bị này.`,
      };
    }

    const sessionId = `mock_checkout_${Date.now()}`;
    const normalizedPlanCode = normalizePlanCode(input.planCode) as Exclude<PricingPlanCode, "FREE">;
    const session: MockBillingCheckoutSession = {
      id: sessionId,
      planCode: normalizedPlanCode,
      context: input.context,
      goalId: input.goalId,
      source: input.source,
      recommendedPlan: input.recommendedPlan ? normalizePlanCode(input.recommendedPlan) : input.recommendedPlan,
      createdAt: new Date().toISOString(),
      returnUrl: input.returnUrl ?? buildReturnUrl(),
    };
    writeMockCheckoutSession(session);

    return {
      ok: true,
      status: "redirect_required",
      providerMode: "mock_provider",
      planCode: currentPlan,
      checkoutUrl: createMockCheckoutUrl(sessionId),
      message: "Đã mở trang thanh toán dùng thử. Màn này không thu tiền thật và hoàn tất ngay trên web.",
    };
  },
  syncEntitlements: async (_goalId?: string) => {
    const account = readMockBillingAccount();

    if (!account) {
      return {
        ok: true,
        status: getCurrentPlan() === "FREE" ? "already_current" : "not_configured",
        providerMode: "mock_provider",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message:
          getCurrentPlan() === "FREE"
            ? "Chưa có quyền Plus nào cần khôi phục và web đang ở gói Free."
            : "Chưa có quyền Plus nào để đồng bộ. Web giữ nguyên trạng thái hiện tại.",
      };
    }

    const currentPlan = getCurrentPlan();
    const currentEntitlementKeys = getCurrentEntitlementKeys();
    const { planCode, entitlementKeys } = applyBillingAccessPayload(buildMockBillingPayload(account), "mock_provider");
    const isSamePlan = planCode === currentPlan;
    const isSameEntitlements =
      entitlementKeys.length === currentEntitlementKeys.length &&
      entitlementKeys.every((key) => currentEntitlementKeys.includes(key));

    return {
      ok: true,
      status: isSamePlan && isSameEntitlements ? "already_current" : "synced",
      providerMode: "mock_provider",
      planCode,
      entitlementKeys,
      message:
        isSamePlan && isSameEntitlements
          ? "Quyền hiện tại đã được cập nhật."
          : `Đã cập nhật gói ${planCode} và quyền trên trình duyệt này.`,
    };
  },
  restoreAccess: async (_goalId?: string) => {
    const account = readMockBillingAccount();

    if (!account) {
      return {
        ok: false,
        status: "not_configured",
        providerMode: "mock_provider",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Chưa có quyền Plus nào để khôi phục.",
      };
    }

    const currentPlan = getCurrentPlan();
    const { planCode, entitlementKeys } = applyBillingAccessPayload(buildMockBillingPayload(account), "mock_provider");

    return {
      ok: true,
      status: planCode === currentPlan ? "already_active" : "restored",
      providerMode: "mock_provider",
      planCode,
      entitlementKeys,
      message:
        planCode === currentPlan
          ? `Gói ${planCode} vẫn đang mở trên trình duyệt này.`
          : `Đã khôi phục quyền ${planCode} trên trình duyệt này.`,
    };
  },
  openCustomerPortal: async () => ({
    ok: false,
    status: "local_only",
    providerMode: "mock_provider",
    providerLabel: getProviderLabel("mock_provider"),
    message: "Bản dùng thử chưa có cổng quản lý thanh toán.",
  }),
};

export function resolveAppReturnPath(returnUrl?: string): string {
  if (!returnUrl) return "/12-week-system?tab=settings";

  if (typeof window === "undefined") {
    return returnUrl.startsWith("/") ? returnUrl : `/${returnUrl}`;
  }

  try {
    const url = new URL(returnUrl, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return returnUrl.startsWith("/") ? returnUrl : `/${returnUrl}`;
  }
}

export function completeMockCheckoutSession(sessionId: string): MockCheckoutCompletionResult {
  const session = getMockCheckoutSession(sessionId);

  if (!session) {
    return {
      ok: false,
      planCode: getCurrentPlan(),
      returnUrl: "/12-week-system?tab=settings",
      message: "Phiên thanh toán dùng thử không còn hợp lệ.",
    };
  }

  const now = new Date().toISOString();
  const currentPlan = getCurrentPlan();
  const normalizedPlanCode = normalizePlanCode(session.planCode) as Exclude<PricingPlanCode, "FREE">;
  const account: MockBillingProviderAccount = {
    customerId: "mock_customer_01",
    subscriptionId: `mock_subscription_${normalizedPlanCode.toLowerCase()}`,
    planCode: normalizedPlanCode,
    status: "active",
    billingCycle: getDefaultBillingCycle(normalizedPlanCode),
    startedAt: now,
    renewsAt: null,
    entitlements: getEntitlementsForPlan(normalizedPlanCode, now),
    updatedAt: now,
  };

  writeMockBillingAccount(account);
  cancelMockCheckoutSession(sessionId);
  applyBillingAccessPayload(buildMockBillingPayload(account), "mock_provider");
  trackCheckoutCompleted({
    goalId: session.goalId,
    context: session.context,
    source: session.source ?? "paywall_dialog",
    currentPlan,
    recommendedPlan: session.recommendedPlan ?? normalizedPlanCode,
    planCode: normalizedPlanCode,
    resultPlan: account.planCode,
    mode: "mock_provider",
  });

  return {
    ok: true,
    planCode: account.planCode,
    returnUrl: resolveAppReturnPath(session.returnUrl),
    message: `Đã mở gói ${account.planCode} trên trình duyệt này.`,
  };
}
