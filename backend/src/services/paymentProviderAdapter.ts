/**
 * Payment Provider Adapter — Provider-Agnostic Interface
 *
 * This module defines the adapter contract that any payment provider
 * (Casso, PayOS, MoMo, VNPay, etc.) must implement to integrate
 * with the billing domain.
 *
 * Design principles:
 * - No provider-specific code in this file.
 * - No external API calls — adapters make the calls.
 * - No secrets in source code.
 * - App must not crash if provider is not configured.
 * - Entitlement is never granted by client-only checkout success.
 *   Entitlement requires a verified webhook/event from the provider.
 */

import type {
  BillingCycle,
  BillingPlanCode,
  BillingSubscriptionStatus,
} from "./billingService";

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CreateCheckoutSessionInput {
  /** Firebase UID of the authenticated user. */
  userId: string;
  /** Plan the user wants to purchase. */
  planCode: BillingPlanCode;
  /** Billing cycle preference. */
  billingCycle: BillingCycle;
  /** URL to redirect after successful checkout. */
  successUrl: string;
  /** URL to redirect after canceled checkout. */
  cancelUrl: string;
  /** Optional locale/language hint for the checkout page. */
  locale?: string;
  /** Optional customer email hint (pre-fill). */
  customerEmail?: string;
  /** Email address where the post-payment receipt should be sent. */
  receiptEmail?: string;
  /** Optional recipient name for the post-payment receipt. */
  receiptName?: string;
  /** Override checkout amount in VND. Defaults to PLUS_PRICE_VND for subscription checkout. */
  amount?: number;
  /** Payment purpose. Default "plus_subscription" if not provided. */
  purpose?: "plus_subscription" | "physical_order";
  /** Physical order ID when purpose is "physical_order". Server-authoritative, not from client. */
  physicalOrderId?: string;
  /** Discount metadata applied to this checkout (server-authoritative). */
  discount?: {
    source?: "coupon" | "sale_event" | "env_fallback";
    couponCode?: string;
    discountId?: string;
    discountName?: string;
    discountPercent?: number;
    discountType?: "percentage" | "fixed";
    discountAmount?: number;
    originalAmount: number;
    finalAmount?: number;
  };
}

export interface CheckoutSessionResult {
  /** Provider-specific session/order ID. */
  sessionId: string;
  /** URL the frontend should redirect to for checkout. */
  checkoutUrl: string;
  /** When this session expires (provider-dependent). */
  expiresAt?: string;
}

// ─── Webhook Verification ────────────────────────────────────────────────────

export interface WebhookVerificationInput {
  /** Raw request body (Buffer or string). */
  rawBody: Buffer | string;
  /** Request headers (for signature verification). */
  headers: Record<string, string | string[] | undefined>;
}

export interface WebhookVerificationResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Reason for failure, if invalid. */
  reason?: string;
}

// ─── Webhook Event Parsing ───────────────────────────────────────────────────

/**
 * Normalized webhook event from any provider.
 * The adapter transforms provider-specific payloads into this shape.
 */
export interface NormalizedProviderEvent {
  /** Provider name (e.g. "casso", "payos", "momo"). */
  provider: string;
  /** Provider's unique event ID for idempotency. */
  providerEventId: string;
  /** Normalized event type. */
  eventType: NormalizedEventType;
  /** Provider's raw event type string (for logging). */
  rawEventType: string;
  /** SHA-256 hash of the raw payload (for idempotency). */
  payloadHash: string;
  /** User ID extracted from the event (metadata or customer lookup). */
  userId: string;
  /** Provider's customer ID. */
  providerCustomerId?: string;
  /** Provider's subscription/order ID. */
  providerSubscriptionId?: string;
  /** Plan code resolved from the event. */
  planCode: BillingPlanCode;
  /** Subscription status mapped to our domain. */
  status: BillingSubscriptionStatus;
  /** Billing cycle if available. */
  billingCycle?: BillingCycle;
  /** Current period start. */
  currentPeriodStart?: Date;
  /** Current period end. */
  currentPeriodEnd?: Date;
  /** Whether subscription cancels at period end. */
  cancelAtPeriodEnd?: boolean;
  /** When the subscription was canceled. */
  canceledAt?: Date | null;
}

export type NormalizedEventType =
  | "checkout_completed"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_canceled"
  | "subscription_expired"
  | "payment_succeeded"
  | "payment_failed"
  | "unknown";

// ─── Customer Portal ─────────────────────────────────────────────────────────

export interface CreatePortalSessionInput {
  userId: string;
  providerCustomerId: string;
  returnUrl: string;
}

export interface PortalSessionResult {
  portalUrl: string;
}

// ─── Status Mapping ──────────────────────────────────────────────────────────

/**
 * Maps a provider-specific subscription status string to our domain status.
 * Pure function — no side effects.
 */
export type ProviderStatusMapper = (
  providerStatus: string,
) => BillingSubscriptionStatus | null;

// ─── Adapter Interface ───────────────────────────────────────────────────────

/**
 * The core adapter contract. Each payment provider implements this.
 *
 * Not all providers support every method. Optional methods return
 * a "not supported" result or throw a descriptive error.
 */
export interface PaymentProviderAdapter {
  /** Provider identifier (e.g. "casso", "payos", "momo", "mock"). */
  readonly providerId: string;

  /** Whether this adapter is fully configured and ready to use. */
  readonly isConfigured: boolean;

  /**
   * Create a checkout session/payment link.
   * Returns a URL the frontend redirects to.
   */
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResult>;

  /**
   * Verify the webhook signature from the provider.
   * Should be called BEFORE parsing the event.
   */
  verifyWebhookSignature(
    input: WebhookVerificationInput,
  ): WebhookVerificationResult;

  /**
   * Parse a verified webhook payload into a normalized event.
   * Only call this AFTER verifyWebhookSignature returns valid=true.
   */
  parseWebhookEvent(rawBody: Buffer | string): NormalizedProviderEvent;

  /**
   * Map a provider-specific status string to our domain status.
   * Pure function for unit testing.
   */
  mapSubscriptionStatus: ProviderStatusMapper;

  /**
   * Create a customer portal session (self-service billing management).
   * Not all providers support this. Returns null if unsupported.
   */
  createCustomerPortalSession?(
    input: CreatePortalSessionInput,
  ): Promise<PortalSessionResult | null>;
}

// ─── Adapter Errors ──────────────────────────────────────────────────────────

export class PaymentProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED" as const;
  constructor(providerId: string) {
    super(
      `Payment provider "${providerId}" is not configured. ` +
        "Check environment variables.",
    );
    this.name = "PaymentProviderNotConfiguredError";
  }
}

export class PaymentProviderError extends Error {
  readonly code = "PROVIDER_ERROR" as const;
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${providerId}] ${message}`);
    this.name = "PaymentProviderError";
  }
}
