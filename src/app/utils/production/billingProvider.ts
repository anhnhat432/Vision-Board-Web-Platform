import { apiClient } from "@/lib/api/apiClient";
import type {
  BillingProvider,
  BillingProviderStatus,
  CustomerPortalResult,
  RestoreAccessResult,
} from "../billing-contract";
import {
  canUpgradeToPlus,
  getEmailVerificationRequiredMessage,
  rememberEmailVerificationReturnPath,
} from "../email-verification-guard";
import { getCurrentEntitlementKeys, getCurrentPlan, getUserData, restorePlanAccessLocally, upgradePlanLocally } from "../storage";
import type { EntitlementKey, PricingPlanCode, SubscriptionStatus } from "../storage-types";
import {
  applyBillingAccessPayload,
  buildBillingContractBody,
  getBillingProviderMode,
  getPlanRank,
  getProviderLabel,
  isEntitlementKey,
  isOffline,
  postBillingContract,
} from "./billingCore";
import {
  BILLING_CHECKOUT_ENDPOINT,
  BILLING_ENTITLEMENT_SYNC_ENDPOINT,
  BILLING_PORTAL_ENDPOINT,
  BILLING_RESTORE_ENDPOINT,
} from "./env";
import { mockBillingProvider } from "./mockBillingProvider";

interface CurrentEntitlementSnapshot {
  planCode: string;
  status: string;
  entitlements: string[];
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

function applyCurrentEntitlementSnapshot(snapshot: CurrentEntitlementSnapshot): {
  planCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
} {
  const remotePlanCode = snapshot.planCode as PricingPlanCode;
  const remoteStatus = normalizeServerSubscriptionStatus(snapshot.status);
  const remoteEntitlementKeys = snapshot.entitlements.filter((key): key is EntitlementKey =>
    isEntitlementKey(key),
  );

  return applyBillingAccessPayload(
    {
      planCode: remotePlanCode,
      subscription:
        snapshot.planCode === "FREE" || snapshot.status === "none"
          ? null
          : {
              planCode: remotePlanCode,
              status: remoteStatus,
              renewsAt: snapshot.currentPeriodEnd,
              cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
            },
      entitlements: remoteEntitlementKeys,
    },
    "api_contract",
  );
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
          : `Quyền ${planCode} hiện đang được giữ trên thiết bị này.`,
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
          : `Đã khôi phục quyền ${planCode} từ dữ liệu trên thiết bị này.`,
    };
  },
  openCustomerPortal: async () => ({
    ok: false,
    status: "local_only",
    providerMode: "local_test",
    providerLabel: getProviderLabel("local_test"),
    message: "Chế độ chỉ lưu trên thiết bị chưa có cổng quản lý thanh toán riêng.",
  }),
};

const apiContractBillingProvider: BillingProvider = {
  getStatus: getBillingProviderStatus,
  startCheckout: async (input) => {
    if (!canUpgradeToPlus()) {
      rememberEmailVerificationReturnPath("/billing/plan");
      return {
        ok: false,
        status: "not_configured",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        message: getEmailVerificationRequiredMessage("upgrade"),
      };
    }

    if (isOffline()) {
      return {
        ok: false,
        status: "offline",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        message: "Thiết bị đang mất mạng nên chưa thể mở trang thanh toán.",
      };
    }

    // Prefer backend checkout-session endpoint via apiClient (real mode)
    const apiBaseConfigured = Boolean(
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
    );

    if (apiBaseConfigured) {
      try {
        const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
        const result = await apiClient.post<{
          checkoutSessionId: string;
          checkoutUrl: string;
          provider: string;
          expiresAt?: string;
          currentEntitlement: {
            planCode: string;
            status: string;
            entitlements: string[];
          };
        }>("/billing/checkout-session", {
          planCode: input.planCode,
          returnUrl: `${currentUrl}/billing/plan?status=success&context=${encodeURIComponent(input.context ?? "plan")}`,
          cancelUrl: `${currentUrl}/billing/plan?status=cancel`,
          billingCycle: "twelve_week",
        });

        // CRITICAL: Do NOT unlock entitlement from checkout response.
        // The currentEntitlement in the response proves the backend
        // did not grant entitlement at checkout creation time.
        const checkoutUrl =
          result.provider === "casso"
            ? `/billing/checkout/${encodeURIComponent(result.checkoutSessionId)}`
            : result.checkoutUrl;

        return {
          ok: true,
          status: "redirect_required",
          providerMode: "api_contract",
          planCode: getCurrentPlan(),
          checkoutUrl,
          message: `Đã tạo phiên thanh toán từ nhà cung cấp (${result.provider}). Đang chuyển hướng đến trang thanh toán.`,
        };
      } catch (error: unknown) {
        const msg =
          error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : "Lỗi không xác định";

        // Only fall back to legacy endpoint on network errors.
        // Server errors (4xx/5xx) mean the backend received and rejected the
        // request — creating a second session via the legacy endpoint would
        // risk a duplicate PaymentOrder.
        const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
        const isServerError =
          errObj !== null &&
          typeof errObj.status === "number" &&
          errObj.status >= 400;

        if (isServerError) {
          return {
            ok: false,
            status: "error",
            providerMode: "api_contract",
            planCode: getCurrentPlan(),
            message: msg,
          };
        }

        console.warn("[billing] Backend checkout-session failed, trying legacy flow:", msg);
      }
    }

    // Legacy flow: use BILLING_CHECKOUT_ENDPOINT
    if (!BILLING_CHECKOUT_ENDPOINT) {
      return {
        ok: false,
        status: "not_configured",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        message: "Thanh toán chưa sẵn sàng. Vui lòng thử lại sau.",
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
        message: response.message ?? "Đã tạo phiên thanh toán.",
      };
    }

    // CRITICAL: A checkout-creation response without a `checkoutUrl` is not
    // a payment confirmation. Never grant entitlement here — that must wait
    // for a backend-verified entitlement sync (webhook or signed-in
    // /billing/entitlement). Surface a clear error instead so user retries.
    return {
      ok: false,
      status: "error",
      providerMode: "api_contract",
      planCode: getCurrentPlan(),
      message:
        response.message ?? "Không tạo được phiên thanh toán từ đơn vị thanh toán. Vui lòng thử lại sau ít phút.",
    };
  },
  syncEntitlements: async (goalId) => {
    const apiBaseConfigured = Boolean(
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
    );

    if (apiBaseConfigured) {
      if (isOffline()) {
        return {
          ok: false,
          status: "offline",
          providerMode: "api_contract",
          planCode: getCurrentPlan(),
          entitlementKeys: getCurrentEntitlementKeys(),
          message: "Thiết bị đang mất mạng nên chưa thể đồng bộ quyền từ tài khoản.",
        };
      }

      try {
        const response = await apiClient.get<CurrentEntitlementSnapshot>("/billing/entitlement");
        const currentPlan = getCurrentPlan();
        const currentEntitlementKeys = getCurrentEntitlementKeys();
        const currentCancelAtPeriodEnd = Boolean(getUserData().subscription?.cancelAtPeriodEnd);
        const { planCode, entitlementKeys } = applyCurrentEntitlementSnapshot(response);

        const isSamePlan = planCode === currentPlan;
        const isSameEntitlements =
          entitlementKeys.length === currentEntitlementKeys.length &&
          entitlementKeys.every((key) => currentEntitlementKeys.includes(key));
        const isSameCancelState = currentCancelAtPeriodEnd === Boolean(response.cancelAtPeriodEnd);

        return {
          ok: true,
          status: isSamePlan && isSameEntitlements && isSameCancelState ? "already_current" : "synced",
          providerMode: "api_contract",
          planCode,
          entitlementKeys,
          message:
            isSamePlan && isSameEntitlements
              ? "Quyền hiện tại đã khớp với tài khoản."
              : `Đã đồng bộ gói ${planCode} và quyền Plus từ tài khoản.`,
        };
      } catch (error: unknown) {
        const msg =
          error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : "Không thể đồng bộ quyền từ tài khoản.";
        if (!BILLING_ENTITLEMENT_SYNC_ENDPOINT) {
          return {
            ok: false,
            status: "error",
            providerMode: "api_contract",
            planCode: getCurrentPlan(),
            entitlementKeys: getCurrentEntitlementKeys(),
            message: msg,
          };
        }
      }
    }

    if (!BILLING_ENTITLEMENT_SYNC_ENDPOINT) {
      return {
        ok: false,
        status: "not_configured",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Chưa cấu hình điểm kết nối đồng bộ quyền nâng cao.",
      };
    }

    if (isOffline()) {
      return {
        ok: false,
        status: "offline",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Thiết bị đang mất mạng nên chưa thể đồng bộ quyền từ đơn vị thanh toán.",
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
          ? "Quyền hiện tại đã khớp với đơn vị thanh toán."
          : `Đã đồng bộ gói ${planCode} và quyền nâng cao từ đơn vị thanh toán.`),
    };
  },
  restoreAccess: async (goalId) => {
    const apiBaseConfigured = Boolean(
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
    );

    if (apiBaseConfigured && !BILLING_RESTORE_ENDPOINT) {
      const beforePlan = getCurrentPlan();
      const result = await apiContractBillingProvider.syncEntitlements(goalId);
      const restoreStatus: RestoreAccessResult["status"] = result.ok
        ? result.planCode === beforePlan
          ? "already_active"
          : "restored"
        : result.status === "offline"
          ? "offline"
          : result.status === "not_configured"
            ? "not_configured"
            : result.status === "local_only"
              ? "local_only"
              : "error";
      return {
        ok: result.ok,
        status: restoreStatus,
        providerMode: "api_contract",
        planCode: result.planCode,
        entitlementKeys: result.entitlementKeys,
        message: result.message,
      };
    }

    if (!BILLING_RESTORE_ENDPOINT) {
      return {
        ok: false,
        status: "not_configured",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Chưa cấu hình điểm kết nối khôi phục quyền nâng cao.",
      };
    }

    if (isOffline()) {
      return {
        ok: false,
        status: "offline",
        providerMode: "api_contract",
        planCode: getCurrentPlan(),
        entitlementKeys: getCurrentEntitlementKeys(),
        message: "Thiết bị đang mất mạng nên chưa thể khôi phục giao dịch từ đơn vị thanh toán.",
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
          ? `Đơn vị thanh toán xác nhận gói ${planCode} vẫn đang hoạt động.`
          : `Đã khôi phục quyền ${planCode} từ đơn vị thanh toán.`),
    };
  },
};

function normalizeServerSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "canceled":
      return status;
    default:
      return "inactive";
  }
}

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
  const apiBaseConfigured = Boolean(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
  );

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
      checkoutReady: apiBaseConfigured || Boolean(BILLING_CHECKOUT_ENDPOINT),
      manageBillingReady: apiBaseConfigured || Boolean(BILLING_PORTAL_ENDPOINT),
      restoreReady: apiBaseConfigured || Boolean(BILLING_RESTORE_ENDPOINT),
      entitlementSyncReady: apiBaseConfigured || Boolean(BILLING_ENTITLEMENT_SYNC_ENDPOINT),
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

  if (isOffline()) {
    return {
      ok: false,
      status: "offline",
      providerMode: status.mode,
      providerLabel: status.providerLabel,
      message: "Thiết bị đang mất mạng nên chưa thể mở cổng quản lý thanh toán.",
    };
  }

  // Prefer backend customer-portal endpoint in real mode
  const apiBaseConfigured = Boolean(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
  );

  if (apiBaseConfigured && status.mode === "api_contract") {
    try {
      const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/billing/plan` : "";
      const result = await apiClient.post<{
        supported: boolean;
        portalUrl?: string;
        provider?: string;
        message: string;
        supportEmail?: string;
      }>("/billing/customer-portal", { returnUrl });

      if (result.supported && result.portalUrl) {
        return {
          ok: true,
          status: "opened",
          providerMode: status.mode,
          providerLabel: result.provider || status.providerLabel,
          url: result.portalUrl,
          message: result.message,
        };
      }

      return {
        ok: false,
        status: "not_configured",
        providerMode: status.mode,
        providerLabel: result.provider || status.providerLabel,
        message: result.message,
      };
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Lỗi không xác định";
      console.warn("[billing] Backend customer-portal failed:", msg);
      // Fall through to legacy/provider flow
    }
  }

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
          ? "Chưa cấu hình cổng quản lý thanh toán."
          : "Đơn vị thanh toán hiện tại chưa có cổng quản lý riêng.",
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
      message: response.message ?? "Đơn vị thanh toán không trả về liên kết quản lý.",
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

// ─── Subscription Cancel ─────────────────────────────────────────────────────

export interface CancelSubscriptionResult {
  ok: boolean;
  status: "pending_cancel" | "already_canceled" | "already_pending_cancel" | "error" | "offline" | "local_only";
  message: string;
  currentEntitlement?: CurrentEntitlementSnapshot;
}

/**
 * Cancel the authenticated user's subscription at period end.
 * Entitlements are NOT immediately removed — they stay until the period ends.
 * Only works in real mode with backend configured.
 */
export async function cancelSubscriptionOnServer(): Promise<CancelSubscriptionResult> {
  if (isOffline()) {
    return {
      ok: false,
      status: "offline",
      message: "Thiết bị đang mất mạng. Vui lòng thử lại khi có kết nối.",
    };
  }

  const apiBaseConfigured = Boolean(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) || "",
  );

  if (!apiBaseConfigured) {
    return {
      ok: false,
      status: "local_only",
      message: "Chỉ có thể hủy gói khi hệ thống thanh toán thật đã sẵn sàng.",
    };
  }

  try {
    const result = await apiClient.post<{
      status: "pending_cancel" | "already_canceled" | "already_pending_cancel";
      message: string;
      currentEntitlement: CurrentEntitlementSnapshot;
    }>("/billing/subscription/cancel", {});

    applyCurrentEntitlementSnapshot(result.currentEntitlement);

    return {
      ok: true,
      status: result.status,
      message: result.message,
      currentEntitlement: result.currentEntitlement,
    };
  } catch (error: unknown) {
    const msg =
      error && typeof error === "object" && "message" in error
        ? (error as { message: string }).message
        : "Không thể hủy gói lúc này.";
    return {
      ok: false,
      status: "error",
      message: msg,
    };
  }
}
