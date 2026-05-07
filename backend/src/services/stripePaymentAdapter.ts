import { createHash } from "node:crypto";

import Stripe from "stripe";

import type {
  BillingCycle,
  BillingPlanCode,
  BillingSubscriptionStatus,
} from "./billingService";
import {
  type CheckoutSessionResult,
  type CreateCheckoutSessionInput,
  type CreatePortalSessionInput,
  type NormalizedEventType,
  type NormalizedProviderEvent,
  type PaymentProviderAdapter,
  PaymentProviderError,
  PaymentProviderNotConfiguredError,
  type PortalSessionResult,
  type WebhookVerificationInput,
  type WebhookVerificationResult,
} from "./paymentProviderAdapter";

type StripeMetadata = Record<string, string>;
type StripeClient = ReturnType<typeof Stripe>;
type CheckoutSessionCreateParams = NonNullable<
  Parameters<StripeClient["checkout"]["sessions"]["create"]>[0]
>;

interface StripeEventPayload {
  id: string;
  type: string;
  data?: {
    object?: unknown;
  };
}

interface StripePriceConfig {
  monthly?: string;
  quarterly?: string;
  yearly?: string;
  lifetime?: string;
}

interface StripePaymentAdapterConfig {
  secretKey?: string;
  webhookSecret?: string;
  priceIds?: StripePriceConfig;
}

function readConfigFromEnv(): StripePaymentAdapterConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    priceIds: {
      monthly:
        process.env.STRIPE_PRICE_PLUS_MONTHLY?.trim() ||
        process.env.STRIPE_PRICE_PLUS?.trim(),
      quarterly: process.env.STRIPE_PRICE_PLUS_QUARTERLY?.trim(),
      yearly: process.env.STRIPE_PRICE_PLUS_YEARLY?.trim(),
      lifetime: process.env.STRIPE_PRICE_PLUS_LIFETIME?.trim(),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function getUnixDate(value: unknown): Date | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return new Date(value * 1000);
}

function getStripeId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (isRecord(value)) return getString(value.id);
  return undefined;
}

function appendCheckoutSessionId(successUrl: string): string {
  const separator = successUrl.includes("?") ? "&" : "?";
  return `${successUrl}${separator}checkout_session_id={CHECKOUT_SESSION_ID}`;
}

function makeMetadata(input: CreateCheckoutSessionInput): StripeMetadata {
  return {
    userId: input.userId,
    planCode: input.planCode,
    billingCycle: input.billingCycle,
  };
}

function getPriceForCycle(
  priceIds: StripePriceConfig,
  billingCycle: BillingCycle,
): string | undefined {
  const key = billingCycle as keyof StripePriceConfig;
  return (key in priceIds ? priceIds[key] : undefined) ?? priceIds.monthly;
}

function collectMetadata(object: Record<string, unknown>): StripeMetadata {
  const metadataSources: unknown[] = [
    object.metadata,
    isRecord(object.subscription_details)
      ? object.subscription_details.metadata
      : undefined,
    isRecord(object.parent) && isRecord(object.parent.subscription_details)
      ? object.parent.subscription_details.metadata
      : undefined,
  ];

  if (isRecord(object.lines) && Array.isArray(object.lines.data)) {
    for (const line of object.lines.data) {
      if (!isRecord(line)) continue;
      metadataSources.push(line.metadata);
      if (isRecord(line.price)) metadataSources.push(line.price.metadata);
      if (isRecord(line.period)) metadataSources.push(line.period.metadata);
    }
  }

  const metadata: StripeMetadata = {};
  for (const source of metadataSources) {
    if (!isRecord(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      const stringValue = getString(value);
      if (stringValue && !metadata[key]) metadata[key] = stringValue;
    }
  }
  return metadata;
}

function resolvePlanCode(
  metadata: StripeMetadata,
  object: Record<string, unknown>,
  priceIds: StripePriceConfig,
): BillingPlanCode {
  if (metadata.planCode === "PLUS") return "PLUS";

  const configuredPriceIds = new Set(Object.values(priceIds).filter(Boolean));
  if (isRecord(object.lines) && Array.isArray(object.lines.data)) {
    for (const line of object.lines.data) {
      if (!isRecord(line) || !isRecord(line.price)) continue;
      const priceId = getString(line.price.id);
      if (priceId && configuredPriceIds.has(priceId)) return "PLUS";
    }
  }

  return "FREE";
}

function resolveBillingCycle(metadata: StripeMetadata): BillingCycle | undefined {
  switch (metadata.billingCycle) {
    case "monthly":
    case "quarterly":
    case "yearly":
    case "lifetime":
      return metadata.billingCycle;
    default:
      return undefined;
  }
}

function mapStripeEventType(rawType: string): NormalizedEventType {
  switch (rawType) {
    case "checkout.session.completed":
      return "checkout_completed";
    case "customer.subscription.created":
      return "subscription_created";
    case "customer.subscription.updated":
      return "subscription_updated";
    case "customer.subscription.deleted":
      return "subscription_canceled";
    case "invoice.payment_succeeded":
      return "payment_succeeded";
    case "invoice.payment_failed":
      return "payment_failed";
    default:
      return "unknown";
  }
}

function mapStripeStatus(providerStatus: string): BillingSubscriptionStatus | null {
  const mapping: Record<string, BillingSubscriptionStatus> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    incomplete_expired: "incomplete",
    unpaid: "unpaid",
  };
  return mapping[providerStatus] ?? null;
}

function resolveStatus(
  rawEventType: string,
  object: Record<string, unknown>,
): BillingSubscriptionStatus {
  if (rawEventType === "invoice.payment_failed") return "past_due";
  if (rawEventType === "invoice.payment_succeeded") return "active";
  if (rawEventType === "customer.subscription.deleted") return "canceled";

  const mappedStatus = getString(object.status)
    ? mapStripeStatus(String(object.status))
    : null;
  if (mappedStatus) return mappedStatus;

  if (rawEventType === "checkout.session.completed") {
    return object.payment_status === "paid" || object.mode === "subscription"
      ? "active"
      : "incomplete";
  }

  return "incomplete";
}

function resolveSubscriptionId(
  rawEventType: string,
  object: Record<string, unknown>,
): string | undefined {
  if (rawEventType.startsWith("customer.subscription.")) {
    return getStripeId(object.id);
  }

  return (
    getStripeId(object.subscription) ??
    (isRecord(object.parent) && isRecord(object.parent.subscription_details)
      ? getStripeId(object.parent.subscription_details.subscription)
      : undefined)
  );
}

function resolvePeriodStart(object: Record<string, unknown>): Date | undefined {
  const direct = getUnixDate(object.current_period_start);
  if (direct) return direct;

  if (isRecord(object.lines) && Array.isArray(object.lines.data)) {
    for (const line of object.lines.data) {
      if (isRecord(line) && isRecord(line.period)) {
        const start = getUnixDate(line.period.start);
        if (start) return start;
      }
    }
  }

  return undefined;
}

function resolvePeriodEnd(object: Record<string, unknown>): Date | undefined {
  const direct = getUnixDate(object.current_period_end);
  if (direct) return direct;

  if (isRecord(object.lines) && Array.isArray(object.lines.data)) {
    for (const line of object.lines.data) {
      if (isRecord(line) && isRecord(line.period)) {
        const end = getUnixDate(line.period.end);
        if (end) return end;
      }
    }
  }

  return undefined;
}

export function createStripePaymentAdapter(
  config: StripePaymentAdapterConfig = readConfigFromEnv(),
): PaymentProviderAdapter {
  const priceIds = config.priceIds ?? {};
  const hasAnyPrice = Object.values(priceIds).some((value) =>
    Boolean(value?.trim()),
  );
  const isConfigured = Boolean(
    config.secretKey && config.webhookSecret && hasAnyPrice,
  );
  const stripe = config.secretKey ? new Stripe(config.secretKey) : null;

  const ensureConfigured = (): StripeClient => {
    if (!isConfigured || !stripe) {
      throw new PaymentProviderNotConfiguredError("stripe");
    }
    return stripe;
  };

  return {
    providerId: "stripe",
    isConfigured,

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ): Promise<CheckoutSessionResult> {
      const client = ensureConfigured();
      const priceId = getPriceForCycle(priceIds, input.billingCycle);
      if (!priceId) throw new PaymentProviderNotConfiguredError("stripe");

      const metadata = makeMetadata(input);
      const mode = input.billingCycle === "lifetime" ? "payment" : "subscription";
      const sessionParams: CheckoutSessionCreateParams = {
        mode,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: appendCheckoutSessionId(input.successUrl),
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        customer_email: input.customerEmail,
        metadata,
      };
      if (input.locale) {
        sessionParams.locale = input.locale as CheckoutSessionCreateParams["locale"];
      }
      if (mode === "subscription") {
        sessionParams.subscription_data = { metadata };
      } else {
        sessionParams.payment_intent_data = { metadata };
      }

      const session = await client.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new PaymentProviderError(
          "stripe",
          "Stripe did not return a checkout URL.",
        );
      }

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : undefined,
      };
    },

    verifyWebhookSignature(
      input: WebhookVerificationInput,
    ): WebhookVerificationResult {
      const client = ensureConfigured();
      const signature = input.headers["stripe-signature"];
      if (typeof signature !== "string") {
        return {
          valid: false,
          reason: "Missing Stripe-Signature header.",
        };
      }

      try {
        client.webhooks.constructEvent(
          input.rawBody,
          signature,
          config.webhookSecret ?? "",
        );
        return { valid: true };
      } catch (error: unknown) {
        return {
          valid: false,
          reason: error instanceof Error ? error.message : "Invalid signature.",
        };
      }
    },

    parseWebhookEvent(rawBody: Buffer | string): NormalizedProviderEvent {
      const body =
        typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      const parsed = JSON.parse(body) as StripeEventPayload;
      const object = parsed.data?.object;
      if (!isRecord(object)) {
        throw new PaymentProviderError(
          "stripe",
          "Webhook event payload is missing data.object.",
        );
      }

      const metadata = collectMetadata(object);
      const rawEventType = parsed.type;
      const eventType = mapStripeEventType(rawEventType);
      const providerSubscriptionId = resolveSubscriptionId(rawEventType, object);
      const userId =
        metadata.userId ??
        getString(object.client_reference_id) ??
        getString(object.clientReferenceId) ??
        "";

      return {
        provider: "stripe",
        providerEventId: parsed.id,
        eventType,
        rawEventType,
        payloadHash: createHash("sha256").update(body).digest("hex"),
        userId,
        providerCustomerId: getStripeId(object.customer),
        providerSubscriptionId,
        planCode: resolvePlanCode(metadata, object, priceIds),
        status: resolveStatus(rawEventType, object),
        billingCycle: resolveBillingCycle(metadata),
        currentPeriodStart: resolvePeriodStart(object),
        currentPeriodEnd: resolvePeriodEnd(object),
        cancelAtPeriodEnd:
          typeof object.cancel_at_period_end === "boolean"
            ? object.cancel_at_period_end
            : undefined,
        canceledAt: getUnixDate(object.canceled_at) ?? null,
      };
    },

    mapSubscriptionStatus: mapStripeStatus,

    async createCustomerPortalSession(
      input: CreatePortalSessionInput,
    ): Promise<PortalSessionResult | null> {
      const client = ensureConfigured();
      if (!input.providerCustomerId) return null;

      const session = await client.billingPortal.sessions.create({
        customer: input.providerCustomerId,
        return_url: input.returnUrl,
      });

      return { portalUrl: session.url };
    },
  };
}
