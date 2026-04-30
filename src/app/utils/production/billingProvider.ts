
import { getCurrentEntitlementKeys, getCurrentPlan, restorePlanAccessLocally, upgradePlanLocally } from "../storage";
import type { BillingProvider, BillingProviderStatus, CustomerPortalResult } from "../billing-contract";
import {
  BILLING_CHECKOUT_ENDPOINT,
  BILLING_ENTITLEMENT_SYNC_ENDPOINT,
  BILLING_PORTAL_ENDPOINT,
  BILLING_RESTORE_ENDPOINT,
} from "./env";
import {
  applyBillingAccessPayload,
  buildBillingContractBody,
  getBillingProviderMode,
  getPlanRank,
  getProviderLabel,
  isOffline,
  postBillingContract,
} from "./billingCore";
import { mockBillingProvider } from "./mockBillingProvider";

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


const apiContractBillingProvider: BillingProvider = {
  getStatus: getBillingProviderStatus,
  startCheckout: async (input) => {
    if (!BILLING_CHECKOUT_ENDPOINT || isOffline()) {
      const fallbackResult = await localBillingProvider.startCheckout(input);
      return {
        ...fallbackResult,
        message: `${fallbackResult.message} Checkout provider chưa sẵn sàng nên web dùng local checkout fallback.`,
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

export function getBillingProvider(): BillingProvider {
  switch (getBillingProviderMode()) {
    case "mock_provider":
      return mockBillingProvider;
    case "api_contract":
      return apiContractBillingProvider;
    default:
      return localBillingProvider;
  }
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
