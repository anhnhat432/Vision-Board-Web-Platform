/**
 * Mock Payment Provider Adapter
 *
 * Used for dev/test/demo. Does not call any external API.
 * Simulates checkout sessions, webhook events, and status mapping.
 *
 * Entitlement is NOT granted by createCheckoutSession alone.
 * The caller must process a webhook event (simulated or real)
 * through BillingService.upsertSubscriptionFromProviderEvent
 * before entitlements are active.
 */

import { createHash } from "node:crypto";
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  CreatePortalSessionInput,
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  PortalSessionResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from "./paymentProviderAdapter";
import type { BillingSubscriptionStatus } from "./billingService";

let mockSessionCounter = 0;

export function createMockPaymentAdapter(): PaymentProviderAdapter {
  return {
    providerId: "mock",
    isConfigured: true,

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ): Promise<CheckoutSessionResult> {
      mockSessionCounter++;
      const sessionId = `mock_session_${mockSessionCounter}_${Date.now()}`;
      return {
        sessionId,
        checkoutUrl: `${input.successUrl}?session_id=${sessionId}&provider=mock`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    },

    verifyWebhookSignature(
      _input: WebhookVerificationInput,
    ): WebhookVerificationResult {
      // Mock always accepts — no real signature to verify.
      return { valid: true };
    },

    parseWebhookEvent(rawBody: Buffer | string): NormalizedProviderEvent {
      const body =
        typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      const parsed = JSON.parse(body);
      const hash = createHash("sha256").update(body).digest("hex");

      return {
        provider: "mock",
        providerEventId:
          parsed.eventId ?? `mock_event_${Date.now()}`,
        eventType: parsed.eventType ?? "checkout_completed",
        rawEventType: parsed.rawEventType ?? "mock.checkout.completed",
        payloadHash: hash,
        userId: parsed.userId ?? "",
        providerCustomerId: parsed.customerId,
        providerSubscriptionId: parsed.subscriptionId,
        planCode: parsed.planCode ?? "PLUS",
        status: parsed.status ?? "active",
        billingCycle: parsed.billingCycle,
        currentPeriodStart: parsed.currentPeriodStart
          ? new Date(parsed.currentPeriodStart)
          : undefined,
        currentPeriodEnd: parsed.currentPeriodEnd
          ? new Date(parsed.currentPeriodEnd)
          : undefined,
        cancelAtPeriodEnd: parsed.cancelAtPeriodEnd,
        canceledAt: parsed.canceledAt ? new Date(parsed.canceledAt) : null,
      };
    },

    mapSubscriptionStatus(
      providerStatus: string,
    ): BillingSubscriptionStatus | null {
      const mapping: Record<string, BillingSubscriptionStatus> = {
        active: "active",
        trialing: "trialing",
        past_due: "past_due",
        canceled: "canceled",
        incomplete: "incomplete",
        unpaid: "unpaid",
      };
      return mapping[providerStatus] ?? null;
    },

    async createCustomerPortalSession(
      input: CreatePortalSessionInput,
    ): Promise<PortalSessionResult | null> {
      // Mock portal — just redirect back.
      return { portalUrl: `${input.returnUrl}?portal=mock` };
    },
  };
}

/**
 * Create a simulated webhook body for testing.
 * This is NOT a real webhook — it's for dev/test only.
 */
export function createMockWebhookBody(overrides: {
  userId: string;
  planCode?: "FREE" | "PLUS";
  status?: BillingSubscriptionStatus;
  eventType?: string;
  eventId?: string;
  subscriptionId?: string;
}): string {
  return JSON.stringify({
    eventId: overrides.eventId ?? `mock_evt_${Date.now()}`,
    eventType: overrides.eventType ?? "checkout_completed",
    rawEventType: "mock.checkout.completed",
    userId: overrides.userId,
    planCode: overrides.planCode ?? "PLUS",
    status: overrides.status ?? "active",
    subscriptionId:
      overrides.subscriptionId ?? `mock_sub_${Date.now()}`,
    billingCycle: "monthly",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });
}

/**
 * Create a mock adapter that requires a specific signature header.
 * Used for testing webhook signature rejection.
 *
 * Required header: X-Mock-Signature: valid-mock-signature
 */
export const MOCK_VALID_SIGNATURE = "valid-mock-signature";

export function createMockPaymentAdapterWithSignature(): PaymentProviderAdapter {
  const base = createMockPaymentAdapter();
  return {
    ...base,
    verifyWebhookSignature(
      input: WebhookVerificationInput,
    ): WebhookVerificationResult {
      const sig = input.headers["x-mock-signature"];
      if (sig === MOCK_VALID_SIGNATURE) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: "Invalid or missing X-Mock-Signature header.",
      };
    },
  };
}

