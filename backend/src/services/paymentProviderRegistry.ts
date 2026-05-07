/**
 * Payment Provider Registry
 *
 * Resolves the active PaymentProviderAdapter based on env configuration.
 *
 * Rules:
 * - If no provider env is configured, returns the mock adapter (safe for demo/local).
 * - Real provider adapters are placeholders — they throw PaymentProviderNotConfiguredError
 *   until their env vars are set and the adapter implementation is added.
 * - App does NOT crash if provider env is missing.
 *
 * Env vars:
 *   BILLING_PROVIDER       – "mock" | "stripe" | "payos" | "momo" | "vnpay" (default: "mock")
 *   BILLING_PROVIDER_*     – provider-specific keys (checked by each adapter)
 */

import type { PaymentProviderAdapter } from "./paymentProviderAdapter";
import { PaymentProviderNotConfiguredError } from "./paymentProviderAdapter";
import { createCassoPaymentAdapter } from "./cassoPaymentAdapter";
import { createMockPaymentAdapter } from "./mockPaymentAdapter";
import { createStripePaymentAdapter } from "./stripePaymentAdapter";

export type SupportedProviderId =
  | "mock"
  | "stripe"
  | "casso"
  | "payos"
  | "momo"
  | "vnpay";

function getProviderIdFromEnv(): SupportedProviderId {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "mock") return "mock";
  if (raw === "stripe") return "stripe";
  if (raw === "casso") return "casso";
  if (raw === "payos") return "payos";
  if (raw === "momo") return "momo";
  if (raw === "vnpay") return "vnpay";
  // Unknown provider — fall back to mock with a warning.
  console.warn(
    `[billing] Unknown BILLING_PROVIDER="${raw}". Falling back to mock.`,
  );
  return "mock";
}

/**
 * Placeholder adapter for providers that are not yet implemented.
 * All methods throw PaymentProviderNotConfiguredError.
 */
function createPlaceholderAdapter(
  providerId: SupportedProviderId,
): PaymentProviderAdapter {
  const err = () => new PaymentProviderNotConfiguredError(providerId);
  return {
    providerId,
    isConfigured: false,
    createCheckoutSession: () => Promise.reject(err()),
    verifyWebhookSignature: () => ({ valid: false, reason: `${providerId} not configured` }),
    parseWebhookEvent: () => { throw err(); },
    mapSubscriptionStatus: () => null,
    createCustomerPortalSession: () => Promise.resolve(null),
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────

const adapterCache = new Map<SupportedProviderId, PaymentProviderAdapter>();

/**
 * Get the active payment provider adapter.
 *
 * - Returns mock adapter for dev/test/demo.
 * - Returns placeholder for unconfigured real providers.
 * - Caches the adapter instance.
 */
export function getPaymentProviderAdapter(): PaymentProviderAdapter {
  const providerId = getProviderIdFromEnv();

  const cached = adapterCache.get(providerId);
  if (cached) return cached;

  let adapter: PaymentProviderAdapter;

  switch (providerId) {
    case "mock":
      adapter = createMockPaymentAdapter();
      break;

    case "stripe":
      adapter = createStripePaymentAdapter();
      break;

    case "casso":
      adapter = createCassoPaymentAdapter();
      break;

    case "payos":
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

/**
 * Check if the active provider is configured and ready for real payments.
 * Returns false for mock and placeholder adapters.
 */
export function isPaymentProviderReady(): boolean {
  const adapter = getPaymentProviderAdapter();
  return adapter.isConfigured && adapter.providerId !== "mock";
}

/**
 * Get the active provider ID from env.
 */
export function getActiveProviderId(): SupportedProviderId {
  return getProviderIdFromEnv();
}

/**
 * Reset the adapter cache (for testing only).
 */
export function _resetAdapterCacheForTesting(): void {
  adapterCache.clear();
}
