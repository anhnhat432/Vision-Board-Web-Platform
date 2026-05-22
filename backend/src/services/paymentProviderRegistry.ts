/**
 * Payment Provider Registry
 *
 * Resolves the active PaymentProviderAdapter based on env configuration.
 *
 * Rules:
 * - If no provider env is configured, returns the mock adapter for demo/local.
 * - Casso remains available for legacy VietQR bank transfer checkout/webhooks.
 * - PayOS is the production payment-link adapter behind the paid-checkout kill-switch.
 * - Providers without an implementation return placeholders and fail closed.
 * - App does not crash if provider env is missing.
 *
 * Env vars:
 *   BILLING_PROVIDER - "mock" | "casso" | "payos" | "momo" | "vnpay" (default: "mock")
 *   Provider-specific keys are checked by each adapter.
 */

import type { PaymentProviderAdapter } from "./paymentProviderAdapter";
import { PaymentProviderNotConfiguredError } from "./paymentProviderAdapter";
import { createCassoPaymentAdapter } from "./cassoPaymentAdapter";
import { createMockPaymentAdapter } from "./mockPaymentAdapter";
import { createPayosPaymentAdapter } from "./payosPaymentAdapter";

export type SupportedProviderId =
  | "mock"
  | "casso"
  | "payos"
  | "momo"
  | "vnpay";

function getProviderIdFromEnv(): SupportedProviderId {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "mock") return "mock";
  if (raw === "casso") return "casso";
  if (raw === "payos") return "payos";
  if (raw === "momo") return "momo";
  if (raw === "vnpay") return "vnpay";

  console.warn(
    `[billing] Unknown BILLING_PROVIDER="${raw}". Falling back to mock.`,
  );
  return "mock";
}

function createPlaceholderAdapter(
  providerId: Exclude<SupportedProviderId, "mock" | "casso" | "payos">,
): PaymentProviderAdapter {
  const err = () => new PaymentProviderNotConfiguredError(providerId);
  return {
    providerId,
    isConfigured: false,
    createCheckoutSession: () => Promise.reject(err()),
    verifyWebhookSignature: () => ({
      valid: false,
      reason: `${providerId} not configured`,
    }),
    parseWebhookEvent: () => {
      throw err();
    },
    mapSubscriptionStatus: () => null,
    createCustomerPortalSession: () => Promise.resolve(null),
  };
}

const adapterCache = new Map<SupportedProviderId, PaymentProviderAdapter>();

export function getPaymentProviderAdapter(): PaymentProviderAdapter {
  const providerId = getProviderIdFromEnv();

  const cached = adapterCache.get(providerId);
  if (cached) return cached;

  let adapter: PaymentProviderAdapter;

  switch (providerId) {
    case "mock":
      adapter = createMockPaymentAdapter();
      break;

    case "casso":
      adapter = createCassoPaymentAdapter();
      break;

    case "payos":
      adapter = createPayosPaymentAdapter();
      break;

    case "momo":
    case "vnpay":
      adapter = createPlaceholderAdapter(providerId);
      break;

    default:
      adapter = createMockPaymentAdapter();
  }

  adapterCache.set(providerId, adapter);
  return adapter;
}

export function isPaymentProviderReady(): boolean {
  const adapter = getPaymentProviderAdapter();
  return adapter.isConfigured && adapter.providerId !== "mock";
}

export function getActiveProviderId(): SupportedProviderId {
  return getProviderIdFromEnv();
}

export function _setAdapterForTesting(providerId: SupportedProviderId, adapter: PaymentProviderAdapter): void {
  adapterCache.set(providerId, adapter);
}

export function _resetAdapterCacheForTesting(): void {
  adapterCache.clear();
}
