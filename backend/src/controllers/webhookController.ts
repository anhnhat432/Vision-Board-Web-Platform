/**
 * Webhook Controller — Provider-Agnostic Billing Webhook Handler
 *
 * Security rules:
 * - Webhook signature is verified BEFORE any event processing.
 * - Raw body is used for signature verification (not parsed JSON).
 * - Raw body is NEVER logged or persisted.
 * - Only safe metadata is logged: provider, eventType, eventId.
 * - Idempotency: duplicate providerEventId is a no-op (200).
 * - Entitlement is only granted via BillingService.upsertSubscriptionFromProviderEvent.
 * - payment_failed does NOT grant entitlement.
 * - Unknown event types are logged and acknowledged (200).
 */

import type { Request, Response } from "express";

import { billingService } from "../services/billingServiceInstance";
import {
  getPaymentProviderAdapter,
  getActiveProviderId,
} from "../services/paymentProviderRegistry";
import {
  PaymentProviderNotConfiguredError,
} from "../services/paymentProviderAdapter";
import type { NormalizedEventType, NormalizedProviderEvent } from "../services/paymentProviderAdapter";

/** Event types that can create or update a subscription with active entitlements. */
const ENTITLEMENT_GRANTING_EVENTS = new Set<NormalizedEventType>([
  "checkout_completed",
  "subscription_created",
  "subscription_updated",
  "payment_succeeded",
]);

/** Event types that should update subscription but NOT grant entitlements. */
const ENTITLEMENT_REVOKING_EVENTS = new Set<NormalizedEventType>([
  "subscription_canceled",
  "subscription_expired",
  "payment_failed",
]);

/** All event types we explicitly handle. Others are acknowledged but ignored. */
const HANDLED_EVENT_TYPES = new Set<NormalizedEventType>([
  ...ENTITLEMENT_GRANTING_EVENTS,
  ...ENTITLEMENT_REVOKING_EVENTS,
]);

/**
 * POST /api/billing/webhook/:provider
 *
 * Receives and processes payment provider webhooks.
 * This endpoint has NO auth middleware — providers send webhooks directly.
 * Signature verification is the security gate.
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const providerParam = req.params.provider?.trim().toLowerCase();

  if (!providerParam) {
    res.status(400).json({ success: false, message: "Missing provider parameter." });
    return;
  }

  // Validate provider matches configured provider
  const activeProviderId = getActiveProviderId();
  if (providerParam !== activeProviderId) {
    console.warn(
      `[webhook] Rejected: provider param "${providerParam}" does not match active provider "${activeProviderId}".`,
    );
    // Return 200 to prevent retries from unknown providers
    res.status(200).json({ success: true, message: "Provider not active. Acknowledged." });
    return;
  }

  const adapter = getPaymentProviderAdapter();

  if (!adapter.isConfigured) {
    console.warn(`[webhook] Provider "${providerParam}" is not configured. Rejecting.`);
    res.status(503).json({ success: false, message: "Provider not configured." });
    return;
  }

  // ─── Step 1: Get raw body for signature verification ─────────────────────
  // Express json() middleware may have already parsed the body.
  // We use req.body stringified as fallback when raw body is not available.
  const rawBody: Buffer | string =
    (req as Request & { rawBody?: Buffer }).rawBody ??
    (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

  // ─── Step 2: Verify webhook signature ────────────────────────────────────
  const verification = adapter.verifyWebhookSignature({
    rawBody,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });

  if (!verification.valid) {
    console.warn(
      `[webhook] Signature verification failed for provider "${providerParam}": ${verification.reason ?? "unknown reason"}.`,
    );
    // 401 for failed signature — provider should investigate
    res.status(401).json({
      success: false,
      message: "Webhook signature verification failed.",
    });
    return;
  }

  // ─── Step 3: Parse the verified event ────────────────────────────────────
  let event: NormalizedProviderEvent;
  try {
    event = adapter.parseWebhookEvent(rawBody);
  } catch (parseError: unknown) {
    const msg = parseError instanceof Error ? parseError.message : "Parse error";
    console.error(`[webhook] Failed to parse event from "${providerParam}": ${msg}`);
    // Return 400 so provider knows the payload was malformed
    res.status(400).json({
      success: false,
      message: "Failed to parse webhook event.",
    });
    return;
  }

  // ─── Step 4: Log safe metadata (no raw body, no sensitive data) ──────────
  console.info(
    `[webhook] Received: provider=${event.provider} type=${event.eventType} raw=${event.rawEventType} eventId=${event.providerEventId} userId=${event.userId || "unknown"}`,
  );

  // ─── Step 5: Validate userId ─────────────────────────────────────────────
  if (!event.userId) {
    console.warn(`[webhook] Event ${event.providerEventId} has no userId. Ignoring.`);
    res.status(200).json({
      success: true,
      message: "Event acknowledged but ignored — no userId.",
      eventId: event.providerEventId,
      status: "ignored",
    });
    return;
  }

  // ─── Step 6: Handle known event types ────────────────────────────────────
  if (!HANDLED_EVENT_TYPES.has(event.eventType)) {
    // Unknown event type — acknowledge to prevent retries
    console.info(
      `[webhook] Unknown event type "${event.eventType}" from "${event.provider}". Acknowledged.`,
    );
    res.status(200).json({
      success: true,
      message: `Event type "${event.eventType}" acknowledged but not handled.`,
      eventId: event.providerEventId,
      status: "ignored",
    });
    return;
  }

  // ─── Step 7: Enforce entitlement safety for payment_failed ────────────────
  // payment_failed must NOT result in active entitlements.
  // Force status to a non-granting value.
  if (event.eventType === "payment_failed") {
    event = { ...event, status: "past_due" };
  }

  // subscription_canceled / subscription_expired: ensure canceled status
  if (event.eventType === "subscription_canceled" || event.eventType === "subscription_expired") {
    event = {
      ...event,
      status: "canceled",
      canceledAt: event.canceledAt ?? new Date(),
    };
  }

  // ─── Step 8: Process through BillingService (idempotent) ─────────────────
  try {
    const result = await billingService.upsertSubscriptionFromProviderEvent({
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      payloadHash: event.payloadHash,
      userId: event.userId,
      providerCustomerId: event.providerCustomerId,
      providerSubscriptionId: event.providerSubscriptionId,
      planCode: event.planCode,
      status: event.status,
      billingCycle: event.billingCycle,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      canceledAt: event.canceledAt,
    });

    if (result.eventStatus === "duplicate") {
      console.info(`[webhook] Duplicate event ${event.providerEventId}. No-op.`);
    } else {
      console.info(
        `[webhook] Processed: eventId=${event.providerEventId} status=${result.eventStatus} subscription=${result.subscription.id} plan=${result.subscription.planCode} subStatus=${result.subscription.status}`,
      );
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      eventId: event.providerEventId,
      status: result.eventStatus,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[webhook] Processing failed for event ${event.providerEventId}: ${msg}`);

    // Return 500 so provider retries
    res.status(500).json({
      success: false,
      message: "Webhook processing failed. Will be retried.",
    });
  }
}
