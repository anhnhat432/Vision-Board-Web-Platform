import { createHash } from "node:crypto";
import type { Request, Response } from "express";

import * as backendMonitoring from "../monitoring/sentry";
import { PaymentOrderModel, type PaymentOrderDocument } from "../models/PaymentOrderModel";
import { billingService } from "../services/billingServiceInstance";
import { deliverReceiptForOrder } from "../services/paymentReceiptDeliveryService";
import {
  createPayosProviderEventId,
  extractPayosOrderIdFromDescription,
  isPayosConfigured,
  isSuccessfulPayosWebhook,
  parsePayosWebhookPayload,
  verifyPayosWebhookPayload,
  type PayosWebhookData,
  type PayosWebhookPayload,
} from "../services/payosPaymentAdapter";

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

type PayosOrderLookup = {
  provider: "payos";
  $or: Array<Record<string, unknown>>;
};

function getPayosChecksumKey(): string {
  return process.env.PAYOS_CHECKSUM_KEY?.trim() ?? "";
}

function getRawWebhookBody(req: Request): Buffer | string {
  return (req as Request & { rawBody?: Buffer }).rawBody ?? (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
}

function getWebhookPayloadHash(rawBody: Buffer | string): string {
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
  return createHash("sha256").update(body).digest("hex");
}

function capturePayosWebhookFailure(event: string, message: string, extra: Record<string, unknown> = {}): void {
  backendMonitoring.captureBackendException(new Error(message), {
    tags: {
      event,
      provider: "payos",
      feature: "billing",
    },
    extra: {
      event,
      provider: "payos",
      ...extra,
    },
  });
}

function buildPayosOrderLookup(data: PayosWebhookData): PayosOrderLookup | null {
  const extractedOrderId = extractPayosOrderIdFromDescription(data.description);
  const candidates: Array<Record<string, unknown>> = [];

  if (extractedOrderId) candidates.push({ orderId: extractedOrderId });
  if (Number.isFinite(data.orderCode)) candidates.push({ "metadata.payos.orderCode": data.orderCode });
  if (typeof data.paymentLinkId === "string" && data.paymentLinkId.trim()) {
    candidates.push({ "metadata.payos.paymentLinkId": data.paymentLinkId.trim() });
  }

  if (candidates.length === 0) return null;
  return { provider: "payos", $or: candidates };
}

function getPayosMetadata(order: PaymentOrderDocument): Record<string, unknown> {
  const metadata = order.metadata;
  return metadata && typeof metadata === "object" ? metadata : {};
}

function getPayosNestedMetadata(order: PaymentOrderDocument): Record<string, unknown> {
  const metadata = getPayosMetadata(order);
  const payos = metadata.payos;
  return payos && typeof payos === "object" ? (payos as Record<string, unknown>) : {};
}

function hasProviderIdentifierMismatch(order: PaymentOrderDocument, data: PayosWebhookData): boolean {
  const payos = getPayosNestedMetadata(order);
  const storedOrderCode = payos.orderCode;
  const storedPaymentLinkId = payos.paymentLinkId;

  if (typeof storedOrderCode === "number" && storedOrderCode !== data.orderCode) return true;
  if (
    typeof storedPaymentLinkId === "string" &&
    data.paymentLinkId &&
    storedPaymentLinkId.trim() !== data.paymentLinkId.trim()
  ) {
    return true;
  }

  return false;
}

/**
 * Atomically transition a pending PayOS order to completed.
 *
 * Returns the updated document if this caller won the race, or `null` if
 * a concurrent webhook already moved the order out of `pending`. Grant of
 * entitlements happens after the claim — billingService dedups by
 * providerEventId, so a brief completed-without-entitlement window is
 * resolved by the reconciliation job rather than by re-running the grant
 * inside this handler.
 */
async function claimPayosOrderAsCompleted(
  order: PaymentOrderDocument,
  data: PayosWebhookData,
  now: Date,
): Promise<PaymentOrderDocument | null> {
  return PaymentOrderModel.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    {
      $set: {
        status: "completed",
        completedAt: now,
        "metadata.payos.orderCode": data.orderCode,
        "metadata.payos.paymentLinkId": data.paymentLinkId,
        "metadata.payos.webhookReference": data.reference,
        "metadata.payos.webhookCode": data.code,
        "metadata.payos.webhookDescription": data.desc,
        "metadata.payos.transactionDateTime": data.transactionDateTime,
      },
    },
    { new: true },
  );
}

function respondIgnored(res: Response, message: string, extra: Record<string, unknown> = {}): void {
  res.status(200).json({
    success: true,
    status: "ignored",
    message,
    ...extra,
  });
}

export async function getPayosWebhookHealth(_req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    success: true,
    data: {
      provider: "payos",
      configured: isPayosConfigured(),
      status: isPayosConfigured() ? "ready" : "not_configured",
      mode: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    },
  });
}

export async function handlePayosWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = getRawWebhookBody(req);
  const checksumKey = getPayosChecksumKey();
  const verification = verifyPayosWebhookPayload(rawBody, checksumKey);

  if (!verification.valid) {
    console.warn("[payos-webhook] Invalid PayOS webhook signature.", {
      reason: verification.reason,
      hasChecksumKey: Boolean(checksumKey),
    });
    capturePayosWebhookFailure("payos_webhook_signature_mismatch", "Invalid PayOS webhook signature.", {
      reason: verification.reason,
      hasChecksumKey: Boolean(checksumKey),
    });
    res.status(401).json({ success: false, message: "Invalid webhook signature." });
    return;
  }

  let payload: PayosWebhookPayload;
  try {
    payload = parsePayosWebhookPayload(rawBody);
  } catch (error) {
    capturePayosWebhookFailure("payos_webhook_invalid_payload", "PayOS webhook payload could not be parsed.");
    res.status(400).json({ success: false, message: "Invalid PayOS webhook payload." });
    return;
  }

  const data = payload.data;
  const payloadHash = getWebhookPayloadHash(rawBody);
  const eventId = createPayosProviderEventId(data, payloadHash);
  const lookup = buildPayosOrderLookup(data);

  if (!lookup) {
    console.warn("[payos-webhook] PayOS webhook has no usable order identifier.", {
      eventId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
    });
    capturePayosWebhookFailure("payos_webhook_missing_order_identifier", "PayOS webhook has no usable order identifier.", {
      eventId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
    });
    respondIgnored(res, "Webhook acknowledged but ignored — missing order identifier.", { eventId });
    return;
  }

  const order = await PaymentOrderModel.findOne(lookup);

  if (!order) {
    console.warn("[payos-webhook] No PayOS payment order matched webhook.", {
      eventId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
    });
    capturePayosWebhookFailure("payos_webhook_unknown_order", "No PayOS payment order matched webhook.", {
      eventId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
    });
    respondIgnored(res, "Webhook acknowledged but ignored — order not found.", { eventId });
    return;
  }

  if (order.status === "completed") {
    console.info({
      event: "payos_webhook_replay_ignored",
      message: "webhook replay ignored",
      eventId,
      orderId: order.orderId,
      reason: "order_already_completed",
    });
    res.status(200).json({ success: true, status: "duplicate", eventId, orderId: order.orderId });
    return;
  }

  if (order.status !== "pending") {
    respondIgnored(res, "Webhook acknowledged but ignored — order is not pending.", {
      eventId,
      orderId: order.orderId,
      orderStatus: order.status,
    });
    return;
  }

  if (hasProviderIdentifierMismatch(order, data)) {
    capturePayosWebhookFailure("payos_webhook_identifier_mismatch", "PayOS webhook identifiers do not match local order metadata.", {
      eventId,
      orderId: order.orderId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
    });
    respondIgnored(res, "Webhook acknowledged but ignored — provider identifiers do not match.", {
      eventId,
      orderId: order.orderId,
    });
    return;
  }

  if (data.amount !== order.amount) {
    console.warn("[payos-webhook] PayOS amount mismatch.", {
      eventId,
      orderId: order.orderId,
      expectedAmount: order.amount,
      receivedAmount: data.amount,
    });
    capturePayosWebhookFailure("payos_webhook_amount_mismatch", "PayOS webhook amount does not match local order.", {
      eventId,
      orderId: order.orderId,
      expectedAmount: order.amount,
      receivedAmount: data.amount,
    });
    respondIgnored(res, "Webhook acknowledged but ignored — amount mismatch.", { eventId, orderId: order.orderId });
    return;
  }

  if (data.currency && data.currency.toUpperCase() !== "VND") {
    capturePayosWebhookFailure("payos_webhook_currency_mismatch", "PayOS webhook currency is not VND.", {
      eventId,
      orderId: order.orderId,
      currency: data.currency,
    });
    respondIgnored(res, "Webhook acknowledged but ignored — currency mismatch.", { eventId, orderId: order.orderId });
    return;
  }

  if (order.expiresAt && new Date() > order.expiresAt) {
    order.status = "expired";
    await order.save();
    respondIgnored(res, "Webhook acknowledged but ignored — order expired.", { eventId, orderId: order.orderId });
    return;
  }

  if (!isSuccessfulPayosWebhook(payload)) {
    respondIgnored(res, "Webhook acknowledged but ignored — payment is not successful.", {
      eventId,
      orderId: order.orderId,
      payosCode: payload.code,
      payosDataCode: data.code,
    });
    return;
  }

  const now = new Date();

  const claimedOrder = await claimPayosOrderAsCompleted(order, data, now);
  if (!claimedOrder) {
    console.info({
      event: "payos_webhook_replay_ignored",
      message: "concurrent webhook already completed order",
      eventId,
      orderId: order.orderId,
      reason: "claim_lost_race",
    });
    res.status(200).json({ success: true, status: "duplicate", eventId, orderId: order.orderId });
    return;
  }

  try {
    const result = await billingService.upsertSubscriptionFromProviderEvent({
      provider: "payos",
      providerEventId: eventId,
      eventType: "checkout_completed",
      payloadHash,
      userId: claimedOrder.userId,
      planCode: "PLUS",
      status: "active",
      billingCycle: "twelve_week",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + TWELVE_WEEKS_MS),
      providerSubscriptionId: claimedOrder.orderId,
    });

    const receiptResult = await deliverReceiptForOrder(claimedOrder.orderId);
    if (!receiptResult.sent) {
      console.warn(
        `[payos-webhook] Payment receipt email queued for retry for order "${claimedOrder.orderId}": ${receiptResult.reason ?? "unknown"}`,
      );
    }

    console.info({
      event: "payos_webhook_success",
      eventId,
      orderId: claimedOrder.orderId,
      amount: data.amount,
      planCode: "PLUS",
      userId: claimedOrder.userId,
      subscriptionId: result.subscription.id,
      eventStatus: result.eventStatus,
    });

    res.status(200).json({
      success: true,
      status: result.eventStatus,
      eventId,
      orderId: claimedOrder.orderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[payos-webhook] Failed to upsert subscription for order.", {
      eventId,
      orderId: claimedOrder.orderId,
      amount: data.amount,
      error: message,
    });
    backendMonitoring.captureBillingCriticalException(error, {
      event: "payos_webhook_subscription_upsert_failed",
      orderId: claimedOrder.orderId,
      amount: data.amount,
      status: claimedOrder.status,
    });
    res.status(500).json({ success: false, message: "Webhook processing failed. Will be retried." });
  }
}
