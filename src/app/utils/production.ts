import {
  getCurrentEntitlementKeys,
  getCurrentPlan,
  getInAppReminders,
  getUserData,
  restorePlanAccessLocally,
  saveUserData,
  upgradePlanLocally,
} from "./storage";
import {
  trackCheckoutCompleted,
  trackCheckoutStarted,
  type MonetizationSource,
} from "./monetization-analytics";
import type {
  BillingActionSnapshot,
  BillingAccessContractPayload,
  BillingProvider,
  BillingProviderStatus,
  CheckoutFlowInput,
  CheckoutFlowResult,
  CustomerPortalResult,
  EntitlementSyncResult,
  RestoreAccessResult,
} from "./billing-contract";
import { getEntitlementsForPlan, normalizePlanCode } from "./twelve-week-premium";
import type {
  BillingCycle,
  BillingProviderMode,
  Entitlement,
  EntitlementKey,
  PricingPlanCode,
  Subscription,
} from "./storage-types";

const LAST_OUTBOX_SYNC_KEY = "visionboard_last_outbox_sync";
const LAST_BROWSER_NOTIFICATION_KEY = "visionboard_last_browser_notification";
const LAST_ENTITLEMENT_SYNC_KEY = "visionboard_last_entitlement_sync";
const LAST_RESTORE_ACCESS_KEY = "visionboard_last_restore_access";
const MOCK_BILLING_ACCOUNT_KEY = "visionboard_mock_billing_account";
const MOCK_BILLING_SESSION_PREFIX = "visionboard_mock_billing_session_";

const OUTBOX_SYNC_ENDPOINT = import.meta.env.VITE_OUTBOX_SYNC_ENDPOINT?.trim() || "";
const BILLING_PROVIDER_MODE = import.meta.env.VITE_BILLING_PROVIDER_MODE?.trim() || "";
const BILLING_PROVIDER_LABEL = import.meta.env.VITE_BILLING_PROVIDER_LABEL?.trim() || "";
const BILLING_API_BASE = (import.meta.env.VITE_BILLING_API_BASE?.trim() || "").replace(/\/$/, "");
const BILLING_CHECKOUT_ENDPOINT =
  import.meta.env.VITE_BILLING_CHECKOUT_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/checkout` : "");
const BILLING_PORTAL_ENDPOINT =
  import.meta.env.VITE_BILLING_PORTAL_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/portal` : "");
const BILLING_RESTORE_ENDPOINT =
  import.meta.env.VITE_BILLING_RESTORE_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/restore` : "");
const BILLING_ENTITLEMENT_SYNC_ENDPOINT =
  import.meta.env.VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT?.trim() || (BILLING_API_BASE ? `${BILLING_API_BASE}/entitlements` : "");

const ENTITLEMENT_KEYS: EntitlementKey[] = [
  "premium_templates",
  "premium_review_insights",
  "priority_reminders",
  "advanced_analytics",
];

export type BrowserNotificationStatus = NotificationPermission | "unsupported";

export interface OutboxSyncSnapshot {
  at: string;
  status: "idle" | "success" | "partial" | "offline" | "not_configured" | "error";
  syncedCount: number;
  pendingCount: number;
  message: string;
}

export type LocalCheckoutResult = CheckoutFlowResult;

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

function readLastNotificationMap(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(LAST_BROWSER_NOTIFICATION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLastNotificationMap(value: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_BROWSER_NOTIFICATION_KEY, JSON.stringify(value));
}

function persistSyncSnapshot(snapshot: OutboxSyncSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_OUTBOX_SYNC_KEY, JSON.stringify(snapshot));
}

function persistBillingActionSnapshot(storageKey: string, snapshot: BillingActionSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function readBillingActionSnapshot(storageKey: string): BillingActionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as BillingActionSnapshot;
  } catch {
    return null;
  }
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isEntitlementKey(value: unknown): value is EntitlementKey {
  return typeof value === "string" && ENTITLEMENT_KEYS.includes(value as EntitlementKey);
}

function getPlanRank(planCode: PricingPlanCode): number {
  switch (normalizePlanCode(planCode)) {
    case "PLUS":
      return 1;
    default:
      return 0;
  }
}

function getProviderLabel(mode: BillingProviderMode): string {
  if (BILLING_PROVIDER_LABEL) return BILLING_PROVIDER_LABEL;

  switch (mode) {
    case "api_contract":
      return "Billing provider";
    case "mock_provider":
      return "Mock provider";
    default:
      return "Local test";
  }
}

function getDefaultBillingCycle(_planCode: Exclude<PricingPlanCode, "FREE">): BillingCycle {
  return "season-pass";
}

function normalizeRemoteEntitlements(
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
      return Boolean(item) && typeof item === "object" && isEntitlementKey(item.key) && typeof item.grantedAt === "string";
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

function applyBillingAccessPayload(
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

async function parseContractResponse(response: Response): Promise<BillingAccessContractPayload> {
  const text = await response.text();
  if (!text) return {};
  return JSON.parse(text) as BillingAccessContractPayload;
}

async function postBillingContract(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<BillingAccessContractPayload> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return parseContractResponse(response);
}

function buildReturnUrl(): string {
  if (typeof window === "undefined") return "/12-week-system?tab=settings";
  return `${window.location.pathname}${window.location.search}`;
}

function buildBillingContractBody(goalId?: string): Record<string, unknown> {
  const data = getUserData();

  return {
    userId: data.userId,
    goalId,
    currentPlan: getCurrentPlan(data),
    entitlementKeys: getCurrentEntitlementKeys(data),
    returnUrl: buildReturnUrl(),
  };
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
    return;
  }

  localStorage.setItem(MOCK_BILLING_ACCOUNT_KEY, JSON.stringify(account));
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
    message: `Mock provider xác nhận gói ${account.planCode} đang hoạt động.`,
  };
}

function createMockCheckoutUrl(sessionId: string): string {
  return `/billing/mock-checkout?session=${encodeURIComponent(sessionId)}`;
}

function buildBillingActionSnapshot(
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

function getBillingProviderMode(): BillingProviderMode {
  if (BILLING_PROVIDER_MODE === "local_test") return "local_test";
  if (BILLING_PROVIDER_MODE === "mock_provider") return "mock_provider";
  if (BILLING_PROVIDER_MODE === "api_contract") return "api_contract";

  const hasApiContract =
    Boolean(BILLING_API_BASE) ||
    Boolean(BILLING_CHECKOUT_ENDPOINT) ||
    Boolean(BILLING_RESTORE_ENDPOINT) ||
    Boolean(BILLING_ENTITLEMENT_SYNC_ENDPOINT);

  return hasApiContract ? "api_contract" : "mock_provider";
}

const localBillingProvider: BillingProvider = {
  getStatus: () => ({
    mode: "local_test",
    providerLabel: getProviderLabel("local_test"),
    checkoutReady: false,
    restoreReady: false,
    entitlementSyncReady: false,
    manageBillingReady: false,
  }),
  startCheckout: async (input) => {
    const currentPlan = getCurrentPlan();

    if (getPlanRank(currentPlan) >= getPlanRank(input.planCode)) {
      return {
        ok: true,
        status: "already_active",
        providerMode: "local_test",
        planCode: currentPlan,
        message: `Gói ${currentPlan} đã đang hoạt động trên thiết bị này.`,
      };
    }

    const upgradedPlan = upgradePlanLocally(input.planCode);

    return {
      ok: true,
      status: "upgraded",
      providerMode: "local_test",
      planCode: upgradedPlan,
      message: `Đã mở gói ${upgradedPlan} trên thiết bị này.`,
    };
  },
  syncEntitlements: async (_goalId?: string) => {
    const planCode = restorePlanAccessLocally();
    const entitlementKeys = getCurrentEntitlementKeys();

    return {
      ok: true,
      status: "local_only",
      providerMode: "local_test",
      planCode,
      entitlementKeys,
      message:
        planCode === "FREE"
          ? "Thiết bị này hiện vẫn đang ở gói Free, nên chưa có gì để đồng bộ."
          : `Quyền ${planCode} hiện đang được giữ local trên thiết bị này.`,
    };
  },
  restoreAccess: async (_goalId?: string) => {
    const planCode = restorePlanAccessLocally();
    const entitlementKeys = getCurrentEntitlementKeys();

    return {
      ok: true,
      status: planCode === "FREE" ? "local_only" : "restored",
      providerMode: "local_test",
      planCode,
      entitlementKeys,
      message:
        planCode === "FREE"
          ? "Thiết bị này hiện đang ở gói Free."
          : `Đã khôi phục quyền ${planCode} từ dữ liệu local trên thiết bị này.`,
    };
  },
  openCustomerPortal: async () => ({
    ok: false,
    status: "local_only",
    providerMode: "local_test",
    providerLabel: getProviderLabel("local_test"),
    message: "Bản local test chưa có cổng quản lý thanh toán riêng.",
  }),
};

const mockBillingProvider: BillingProvider = {
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
        message: `Mock provider xác nhận gói ${planCode} đã sẵn sàng cho tài khoản này.`,
      };
    }

    if (getPlanRank(currentPlan) >= getPlanRank(input.planCode)) {
      return {
        ok: true,
        status: "already_active",
        providerMode: "mock_provider",
        planCode: currentPlan,
        message: `Gói ${currentPlan} đã đang hoạt động trên thiết bị này.`,
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
      returnUrl: buildReturnUrl(),
    };
    writeMockCheckoutSession(session);

    return {
      ok: true,
      status: "redirect_required",
      providerMode: "mock_provider",
      planCode: currentPlan,
      checkoutUrl: createMockCheckoutUrl(sessionId),
      message: "Đã tạo mock checkout session. Bạn có thể hoàn tất flow thanh toán giả lập ngay trong app.",
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
            ? "Mock provider hiện chưa có giao dịch nào và app đang khớp ở gói Free."
            : "Mock provider chưa có giao dịch nào để đồng bộ. App giữ nguyên trạng thái hiện tại.",
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
          ? "Quyền hiện tại đã khớp với mock provider."
          : `Đã đồng bộ gói ${planCode} và quyền premium từ mock provider.`,
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
        message: "Mock provider chưa có giao dịch nào để khôi phục.",
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
          ? `Mock provider xác nhận gói ${planCode} vẫn đang hoạt động.`
          : `Đã khôi phục quyền ${planCode} từ mock provider.`,
    };
  },
  openCustomerPortal: async () => ({
    ok: false,
    status: "local_only",
    providerMode: "mock_provider",
    providerLabel: getProviderLabel("mock_provider"),
    message: "Mock provider chưa có cổng quản lý thanh toán riêng.",
  }),
};

const apiContractBillingProvider: BillingProvider = {
  getStatus: getBillingProviderStatus,
  startCheckout: async (input) => {
    if (!BILLING_CHECKOUT_ENDPOINT || isOffline()) {
      const fallbackResult = await localBillingProvider.startCheckout(input);
      return {
        ...fallbackResult,
        message: `${fallbackResult.message} Checkout provider chưa sẵn sàng nên app dùng local checkout fallback.`,
      };
    }

    const response = await postBillingContract(BILLING_CHECKOUT_ENDPOINT, {
      ...buildBillingContractBody(input.goalId),
      planCode: input.planCode,
      context: input.context,
      source: input.source,
      recommendedPlan: input.recommendedPlan,
    });

    if (response.checkoutUrl) {
      return {
        ok: true,
        status: "redirect_required",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        checkoutUrl: response.checkoutUrl,
        message: response.message ?? "Đã tạo checkout session từ provider.",
      };
    }

    const currentPlan = getCurrentPlan();
    const { planCode } = applyBillingAccessPayload(response, "api_contract");

    return {
      ok: true,
      status: getPlanRank(planCode) > getPlanRank(currentPlan) ? "upgraded" : "already_active",
      providerMode: "api_contract",
      planCode,
      message: response.message ?? `Đã đồng bộ gói ${planCode} từ provider.`,
    };
  },
  syncEntitlements: async (goalId) => {
    if (!BILLING_ENTITLEMENT_SYNC_ENDPOINT) {
      return localBillingProvider.syncEntitlements(goalId);
    }

    if (isOffline()) {
      return {
        ok: false,
        status: "offline",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Thiết bị đang offline nên chưa thể đồng bộ quyền từ provider.",
      };
    }

    const currentPlan = getCurrentPlan();
    const currentEntitlementKeys = getCurrentEntitlementKeys();
    const response = await postBillingContract(BILLING_ENTITLEMENT_SYNC_ENDPOINT, buildBillingContractBody(goalId));
    const { planCode, entitlementKeys } = applyBillingAccessPayload(response, "api_contract");

    const isSamePlan = planCode === currentPlan;
    const isSameEntitlements =
      entitlementKeys.length === currentEntitlementKeys.length &&
      entitlementKeys.every((key) => currentEntitlementKeys.includes(key));

    return {
      ok: true,
      status: isSamePlan && isSameEntitlements ? "already_current" : "synced",
      providerMode: "api_contract",
      planCode,
      entitlementKeys,
      message:
        response.message ??
        (isSamePlan && isSameEntitlements
          ? "Quyền hiện tại đã khớp với provider."
          : `Đã đồng bộ gói ${planCode} và quyền premium từ provider.`),
    };
  },
  restoreAccess: async (goalId) => {
    if (!BILLING_RESTORE_ENDPOINT) {
      return localBillingProvider.restoreAccess(goalId);
    }

    if (isOffline()) {
      return {
        ok: false,
        status: "offline",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Thiết bị đang offline nên chưa thể khôi phục giao dịch từ provider.",
      };
    }

    const currentPlan = getCurrentPlan();
    const response = await postBillingContract(BILLING_RESTORE_ENDPOINT, buildBillingContractBody(goalId));
    const { planCode, entitlementKeys } = applyBillingAccessPayload(response, "api_contract");

    return {
      ok: true,
      status: planCode === currentPlan ? "already_active" : "restored",
      providerMode: "api_contract",
      planCode,
      entitlementKeys,
      message:
        response.message ??
        (planCode === currentPlan
          ? `Provider xác nhận gói ${planCode} vẫn đang hoạt động.`
          : `Đã khôi phục quyền ${planCode} từ provider.`),
    };
  },
};

function getBillingProvider(): BillingProvider {
  switch (getBillingProviderMode()) {
    case "mock_provider":
      return mockBillingProvider;
    case "api_contract":
      return apiContractBillingProvider;
    default:
      return localBillingProvider;
  }
}

export function getLastOutboxSyncSnapshot(): OutboxSyncSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(LAST_OUTBOX_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OutboxSyncSnapshot;
  } catch {
    return null;
  }
}

export function getLastEntitlementSyncSnapshot(): BillingActionSnapshot | null {
  return readBillingActionSnapshot(LAST_ENTITLEMENT_SYNC_KEY);
}

export function getLastRestoreAccessSnapshot(): BillingActionSnapshot | null {
  return readBillingActionSnapshot(LAST_RESTORE_ACCESS_KEY);
}

export function getBillingProviderStatus(): BillingProviderStatus {
  const mode = getBillingProviderMode();

  if (mode === "mock_provider") {
    return {
      mode,
      providerLabel: getProviderLabel(mode),
      checkoutReady: true,
      restoreReady: true,
      entitlementSyncReady: true,
      manageBillingReady: false,
    };
  }

  if (mode === "api_contract") {
    return {
      mode,
      providerLabel: getProviderLabel(mode),
      checkoutReady: Boolean(BILLING_CHECKOUT_ENDPOINT),
      manageBillingReady: Boolean(BILLING_PORTAL_ENDPOINT),
      restoreReady: Boolean(BILLING_RESTORE_ENDPOINT),
      entitlementSyncReady: Boolean(BILLING_ENTITLEMENT_SYNC_ENDPOINT),
    };
  }

  return {
    mode,
    providerLabel: getProviderLabel(mode),
    checkoutReady: false,
    restoreReady: false,
    entitlementSyncReady: false,
    manageBillingReady: false,
  };
}

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.requestPermission();
}

export function sendTestBrowserNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (window.Notification.permission !== "granted") return false;

  new window.Notification("Nhắc việc từ Vision Board", {
    body: "Browser notification đã sẵn sàng. Từ giờ app có thể nhắc việc ngay cả khi bạn không mở đúng tab 12 tuần.",
    tag: "vision-board-test-notification",
  });

  return true;
}

export function maybeShowBrowserReminderNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (window.Notification.permission !== "granted") return false;

  const data = getUserData();
  if (!data.appPreferences.enableBrowserNotifications) return false;

  const reminder = getInAppReminders()[0];
  if (!reminder) return false;

  const todayKey = new Date().toDateString();
  const history = readLastNotificationMap();
  if (history[reminder.id] === todayKey) return false;

  new window.Notification(reminder.title, {
    body: reminder.description,
    tag: reminder.id,
  });

  history[reminder.id] = todayKey;
  writeLastNotificationMap(history);
  return true;
}

export async function syncPendingOutbox(): Promise<OutboxSyncSnapshot> {
  const data = getUserData();
  const pendingItems = data.syncOutbox.filter((item) => item.status === "pending");
  const baseSnapshot = {
    at: new Date().toISOString(),
    syncedCount: 0,
    pendingCount: pendingItems.length,
  };

  if (pendingItems.length === 0) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "idle",
      message: "Không có mục nào cần đồng bộ.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  if (isOffline()) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "offline",
      message: "Thiết bị đang offline. Outbox sẽ được thử lại khi có mạng.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  if (!OUTBOX_SYNC_ENDPOINT) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "not_configured",
      message: "Chưa cấu hình VITE_OUTBOX_SYNC_ENDPOINT nên app giữ outbox ở local.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  let syncedCount = 0;

  for (const item of pendingItems) {
    try {
      const response = await fetch(OUTBOX_SYNC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const itemIndex = data.syncOutbox.findIndex((entry) => entry.id === item.id);
      if (itemIndex !== -1) {
        data.syncOutbox[itemIndex] = {
          ...data.syncOutbox[itemIndex],
          status: "archived",
        };
      }

      syncedCount += 1;
    } catch {
      // Keep item pending for later retry.
    }
  }

  saveUserData(data);

  const remainingPendingCount = data.syncOutbox.filter((item) => item.status === "pending").length;
  const snapshot: OutboxSyncSnapshot = {
    at: new Date().toISOString(),
    syncedCount,
    pendingCount: remainingPendingCount,
    status:
      syncedCount === 0
        ? "error"
        : remainingPendingCount === 0
          ? "success"
          : "partial",
    message:
      syncedCount === 0
        ? "Không thể gửi outbox tới endpoint đã cấu hình."
        : remainingPendingCount === 0
          ? "Đã đồng bộ toàn bộ outbox đang chờ."
          : "Đã đồng bộ một phần. Một số mục vẫn đang chờ thử lại.",
  };
  persistSyncSnapshot(snapshot);
  return snapshot;
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

export async function openBillingCustomerPortal(goalId?: string): Promise<CustomerPortalResult> {
  const status = getBillingProviderStatus();
  const provider = getBillingProvider();

  if (provider.openCustomerPortal) {
    try {
      return await provider.openCustomerPortal(goalId);
    } catch {
      return {
        ok: false,
        status: "error",
        providerMode: status.mode,
        providerLabel: status.providerLabel,
        message: "Không thể mở cổng quản lý thanh toán lúc này.",
      };
    }
  }

  if (status.mode !== "api_contract" || !BILLING_PORTAL_ENDPOINT) {
    return {
      ok: false,
      status: status.mode === "api_contract" ? "not_configured" : "local_only",
      providerMode: status.mode,
      providerLabel: status.providerLabel,
      message:
        status.mode === "api_contract"
          ? "Chưa cấu hình endpoint cho cổng quản lý thanh toán."
          : "Provider hiện tại chưa có cổng quản lý thanh toán riêng.",
    };
  }

  if (isOffline()) {
    return {
      ok: false,
      status: "offline",
      providerMode: status.mode,
      providerLabel: status.providerLabel,
      message: "Thiết bị đang offline nên chưa thể mở cổng quản lý thanh toán.",
    };
  }

  try {
    const response = await postBillingContract(BILLING_PORTAL_ENDPOINT, buildBillingContractBody(goalId));

    if (response.portalUrl) {
      return {
        ok: true,
        status: "opened",
        providerMode: status.mode,
        providerLabel: response.providerLabel || status.providerLabel,
        url: response.portalUrl,
        message: response.message ?? "Đã tạo liên kết tới cổng quản lý thanh toán.",
      };
    }

    return {
      ok: false,
      status: "error",
      providerMode: status.mode,
      providerLabel: response.providerLabel || status.providerLabel,
      message: response.message ?? "Provider không trả về liên kết quản lý thanh toán.",
    };
  } catch {
    return {
      ok: false,
      status: "error",
      providerMode: status.mode,
      providerLabel: status.providerLabel,
      message: "Không thể mở cổng quản lý thanh toán lúc này.",
    };
  }
}

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
      message: "Mock checkout session không còn hợp lệ.",
    };
  }

  const now = new Date().toISOString();
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

  return {
    ok: true,
    planCode: account.planCode,
    returnUrl: resolveAppReturnPath(session.returnUrl),
    message: `Đã xác nhận mock checkout và mở gói ${account.planCode}.`,
  };
}
