/**
 * Casso-specific Webhook Controller
 *
 * Handles Casso bank transfer webhooks. Unlike generic provider webhooks,
 * Casso sends transaction data that needs to be matched against
 * PaymentOrders by description (orderId).
 *
 * Route: POST /api/billing/webhook/casso
 *
 * Security:
 * - Verifies Secure-Token header against CASSO_WEBHOOK_SECRET
 * - No Firebase auth (Casso is a server-to-server call)
 * - Idempotent by cassoTransactionId
 */

import type { Request, Response } from "express";

import { billingService } from "../services/billingServiceInstance";
import * as backendMonitoring from "../monitoring/sentry";
import { PaymentOrderModel, type PaymentOrderDocument } from "../models/PaymentOrderModel";
import { OrderModel } from "../models/OrderModel";
import type { CassoWebhookPayload, CassoTransaction } from "../services/cassoPaymentAdapter";
import { deliverReceiptForOrder } from "../services/paymentReceiptDeliveryService";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const ORDER_ID_REGEX = /VB[A-Z0-9]{8}/i;
const CASSO_PROCESSING_CLAIM_STALE_MS = 10 * 60 * 1000;
const CASSO_PROVIDER = "casso";

function captureCassoWebhookFailure(
  event: string,
  message: string,
  extra: Record<string, unknown> = {},
): void {
  backendMonitoring.captureBackendException(new Error(message), {
    tags: {
      event,
      provider: "casso",
    },
    extra: {
      event,
      provider: "casso",
      ...extra,
    },
  });
}

function extractOrderId(description: string): string | null {
  const match = description.match(ORDER_ID_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCassoSignatureHeader(value: string): { timestamp?: string; signature: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = new Map(
    trimmed.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim().toLowerCase() ?? "", rest.join("=").trim()];
    }),
  );
  const signature = parts.get("v1") || parts.get("signature");
  if (signature) {
    return { timestamp: parts.get("t") || parts.get("timestamp"), signature };
  }

  return { signature: trimmed };
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function getHeaderValue(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function getRawWebhookBody(req: Request): string {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (rawBody && rawBody.length > 0) return rawBody.toString("utf-8");
  return JSON.stringify(req.body ?? {});
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function getCassoProcessingStartedAt(order: PaymentOrderDocument): Date | null {
  const metadata = isRecord(order.metadata) ? order.metadata : {};
  const casso = isRecord(metadata.casso) ? metadata.casso : {};
  return toDate(casso.webhookProcessingStartedAt);
}

function isStaleCassoProcessingClaim(order: PaymentOrderDocument, now: Date): boolean {
  const staleBeforeMs = now.getTime() - CASSO_PROCESSING_CLAIM_STALE_MS;
  const processingStartedAt = getCassoProcessingStartedAt(order) ?? toDate(order.updatedAt);
  return Boolean(
    order.status === "pending" &&
    order.cassoTransactionId &&
    processingStartedAt &&
    processingStartedAt.getTime() < staleBeforeMs,
  );
}

async function claimCassoOrderForProcessing(
  order: PaymentOrderDocument,
  cassoTransactionId: string,
  now: Date,
): Promise<PaymentOrderDocument | null> {
  const staleBefore = new Date(now.getTime() - CASSO_PROCESSING_CLAIM_STALE_MS);
  return PaymentOrderModel.findOneAndUpdate(
    {
      _id: order._id,
      provider: CASSO_PROVIDER,
      status: "pending",
      $or: [
        { cassoTransactionId: { $exists: false } },
        { cassoTransactionId: null },
        {
          cassoTransactionId,
          "metadata.casso.webhookProcessingStartedAt": { $lt: staleBefore },
        },
        {
          cassoTransactionId,
          "metadata.casso.webhookProcessingStartedAt": { $exists: false },
          updatedAt: { $lt: staleBefore },
        },
      ],
    },
    {
      $set: {
        cassoTransactionId,
        "metadata.casso.webhookProcessingStartedAt": now,
      },
    },
    { new: true },
  );
}

async function markCassoOrderAsCompleted(
  order: PaymentOrderDocument,
  cassoTransactionId: string | undefined,
  now: Date,
): Promise<PaymentOrderDocument | null> {
  return PaymentOrderModel.findOneAndUpdate(
    { _id: order._id, provider: CASSO_PROVIDER, status: "pending" },
    {
      $set: {
        status: "completed",
        completedAt: now,
        ...(cassoTransactionId ? { cassoTransactionId } : {}),
      },
      $unset: {
        "metadata.casso.webhookProcessingStartedAt": "",
      },
    },
    { new: true },
  );
}

async function releaseCassoOrderProcessingClaim(
  order: PaymentOrderDocument,
  cassoTransactionId: string,
): Promise<void> {
  try {
    if (order.status !== "pending" || order.cassoTransactionId !== cassoTransactionId) return;

    order.cassoTransactionId = undefined;
    const metadata = isRecord(order.metadata) ? order.metadata : {};
    const casso = isRecord(metadata.casso) ? { ...metadata.casso } : {};
    delete casso.webhookProcessingStartedAt;
    order.metadata = {
      ...metadata,
      casso,
    };
    await order.save();
  } catch (error) {
    backendMonitoring.captureBillingCriticalException(error, {
      event: "casso_webhook_processing_claim_release_failed",
      orderId: order.orderId,
      status: order.status,
    });
  }
}

async function completePhysicalOrderPayment(
  paymentOrder: { orderId: string; userId: string; metadata?: { physicalOrderId?: string | null } | null },
  now: Date,
): Promise<"confirmed" | "already_confirmed" | "no_physical_order"> {
  const physicalOrderId = paymentOrder.metadata?.physicalOrderId;
  if (!physicalOrderId) return "no_physical_order";

  const physicalOrder = await OrderModel.findById(physicalOrderId);
  if (!physicalOrder) return "no_physical_order";

  if (physicalOrder.status === "confirmed" || physicalOrder.status === "printing" || physicalOrder.status === "shipping" || physicalOrder.status === "delivered") {
    return "already_confirmed";
  }

  if (physicalOrder.status === "pending") {
    await OrderModel.updateOne(
      { _id: physicalOrderId, status: "pending" },
      {
        $set: { status: "confirmed" },
        $push: { statusHistory: { status: "confirmed", changedAt: now, changedBy: `payment:${paymentOrder.orderId}` } },
      },
    );
    return "confirmed";
  }

  return "no_physical_order";
}

function logCassoWebhookReplayIgnored(transactionId: string, accountId: string, reason: string): void {
  console.info({
    event: "casso_webhook_replay_ignored",
    message: "webhook replay ignored",
    transactionId,
    accountId,
    reason,
  });
}

function getCassoSignatureSecrets(): string[] {
  return [
    process.env.CASSO_WEBHOOK_CHECKSUM_KEY,
    process.env.CASSO_CHECKSUM_KEY,
    process.env.CASSO_WEBHOOK_SECRET,
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
}

function getCassoSecureTokens(): string[] {
  return [
    process.env.CASSO_SECURE_TOKEN,
    process.env.CASSO_WEBHOOK_SECRET,
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
}

function verifyCassoWebhookSignature(req: Request, expectedSecret: string): boolean {
  const secureToken = getHeaderValue(req, "secure-token");
  if (secureToken && getCassoSecureTokens().some((token) => safeEqual(secureToken, token))) return true;

  const authorization = getHeaderValue(req, "authorization").replace(/^Bearer\s+/i, "").trim();
  if (authorization && getCassoSecureTokens().some((token) => safeEqual(authorization, token))) return true;

  const cassoSignature = parseCassoSignatureHeader(getHeaderValue(req, "x-casso-signature"));
  if (!cassoSignature) return false;

  const body = getRawWebhookBody(req);
  const payloadCandidates = new Set([body]);
  try {
    payloadCandidates.add(JSON.stringify(JSON.parse(body)));
  } catch {
    // Keep the raw body candidate for non-JSON payloads.
  }

  return getCassoSignatureSecrets().some((secret) =>
    [...payloadCandidates].some((payload) => {
      const signedPayload = cassoSignature.timestamp ? `${cassoSignature.timestamp}.${payload}` : payload;
      const expectedSignature = createHmac("sha512", secret).update(signedPayload).digest("hex");
      return safeEqual(cassoSignature.signature, expectedSignature);
    }),
  );
}

export async function getCassoWebhookHealth(_req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    success: true,
    data: {
      provider: "casso",
      status: "ok",
    },
  });
}

export async function handleCassoWebhook(req: Request, res: Response): Promise<void> {
  // Step 1: Verify secret token
  const expectedSecret = process.env.CASSO_WEBHOOK_SECRET?.trim()
    || process.env.CASSO_WEBHOOK_CHECKSUM_KEY?.trim()
    || process.env.CASSO_CHECKSUM_KEY?.trim()
    || process.env.CASSO_SECURE_TOKEN?.trim()
    || "";

  if (!expectedSecret || !verifyCassoWebhookSignature(req, expectedSecret)) {
    const context = {
      hasSecureToken: Boolean(getHeaderValue(req, "secure-token")),
      hasXCassoSignature: Boolean(getHeaderValue(req, "x-casso-signature")),
      hasAuthorization: Boolean(getHeaderValue(req, "authorization")),
      signatureSecretConfigured: getCassoSignatureSecrets().length > 0,
      secureTokenConfigured: getCassoSecureTokens().length > 0,
    };
    console.warn("[casso-webhook] Invalid or missing Casso webhook signature.", context);
    captureCassoWebhookFailure(
      "casso_webhook_signature_mismatch",
      "Invalid or missing Casso webhook signature.",
      context,
    );
    res.status(401).json({ success: false, message: "Invalid webhook signature." });
    return;
  }

  try {
  // Step 2: Parse payload
  const payload: CassoWebhookPayload = req.body;
  if (payload.error !== 0 || !Array.isArray(payload.data)) {
    const context = {
      error: payload.error,
      hasDataArray: Array.isArray(payload.data),
    };
    console.warn("[casso-webhook] Payload has error or missing data array.", context);
    captureCassoWebhookFailure(
      "casso_webhook_invalid_payload",
      "Casso webhook payload has error or missing data array.",
      context,
    );
    res.status(200).json({ success: true, message: "Acknowledged (error payload)." });
    return;
  }

  const transactions: CassoTransaction[] = payload.data;
  if (transactions.length === 0) {
    res.status(200).json({ success: true, message: "No transactions." });
    return;
  }

  let processedCount = 0;
  let failedCount = 0;

  // Step 3: Process each transaction
  for (const tx of transactions) {
    const cassoTxId = String(tx.id ?? tx.tid ?? tx.reference ?? "");
    const description = tx.description ?? "";
    const amount = tx.amount ?? 0;

    // Only process incoming money (positive amount)
    if (amount <= 0) continue;

    const orderId = extractOrderId(description);
    if (!orderId) {
      console.info({
        event: "casso_webhook_missing_order_id",
        message: "Casso transaction skipped because no orderId was found in the transfer description.",
        transactionId: cassoTxId,
        descriptionLength: description.length,
        descriptionHash: createHash("sha256").update(description).digest("hex").slice(0, 12),
      });
      continue;
    }

    const now = new Date();

    // Step 4: Check idempotency (same Casso transaction already processed)
    if (cassoTxId) {
      const duplicate = await PaymentOrderModel.findOne({ provider: CASSO_PROVIDER, cassoTransactionId: cassoTxId });
      if (duplicate?.status === "completed") {
        logCassoWebhookReplayIgnored(cassoTxId, orderId, "completed_order_exists");
        continue;
      }
      if (duplicate) {
        if (duplicate.orderId === orderId && isStaleCassoProcessingClaim(duplicate, now)) {
          console.warn("[casso-webhook] Retrying stale Casso processing claim.", {
            transactionId: cassoTxId,
            orderId,
          });
        } else {
          console.info(`[casso-webhook] Transaction ${cassoTxId}: already linked to non-completed order. Skipping.`);
          continue;
        }
      }
    }

    // Step 5: Find matching pending PaymentOrder
    const order = await PaymentOrderModel.findOne({
      provider: CASSO_PROVIDER,
      orderId,
      status: "pending",
    });

    if (!order) {
      const context = {
        orderId,
        amount,
        status: "not_found",
      };
      console.warn("[casso-webhook] No pending order matched Casso transaction.", context);
      captureCassoWebhookFailure(
        "casso_webhook_account_mismatch",
        "No pending payment order matched Casso webhook transaction.",
        context,
      );
      continue;
    }

    // Step 6: Verify amount
    if (amount < order.amount) {
      const context = {
        orderId,
        amount,
        status: "amount_mismatch",
      };
      console.warn("[casso-webhook] Casso transaction amount is below expected order amount.", context);
      captureCassoWebhookFailure(
        "casso_webhook_amount_mismatch",
        "Casso transaction amount is below expected order amount.",
        context,
      );
      continue;
    }

    // Step 7: Check expiration
    if (order.expiresAt && new Date() > order.expiresAt) {
      console.info(`[casso-webhook] Order "${orderId}" has expired. Marking as expired.`);
      order.status = "expired";
      await order.save();
      continue;
    }

    // Step 8: Claim the pending order before side effects, but do not mark it
    // completed until the entitlement/physical side effect succeeds.
    const claimedOrder = cassoTxId
      ? await claimCassoOrderForProcessing(order, cassoTxId, now)
      : order;
    if (!claimedOrder) {
      if (cassoTxId) {
        logCassoWebhookReplayIgnored(cassoTxId, orderId, "claim_lost");
      }
      continue;
    }

    const payloadHash = createHash("sha256")
      .update(JSON.stringify(tx))
      .digest("hex");

    const isPhysicalOrder = claimedOrder.purpose === "physical_order";

    try {
      if (isPhysicalOrder) {
        const physicalResult = await completePhysicalOrderPayment(claimedOrder, now);
        if (physicalResult === "no_physical_order") {
          console.warn(`[casso-webhook] Physical order payment received but no matching physical order found for "${orderId}".`);
        }
      } else {
        await billingService.upsertSubscriptionFromProviderEvent({
          provider: "casso",
          providerEventId: `casso_${cassoTxId || orderId}`,
          eventType: "checkout_completed",
          payloadHash,
          userId: claimedOrder.userId,
          planCode: "PLUS",
          status: "active",
          billingCycle: "twelve_week",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + TWELVE_WEEKS_MS),
          providerSubscriptionId: orderId,
        });
      }

      const completedOrder = await markCassoOrderAsCompleted(claimedOrder, cassoTxId || undefined, now);
      if (!completedOrder) {
        if (cassoTxId) {
          logCassoWebhookReplayIgnored(cassoTxId, orderId, "completion_lost");
        }
        continue;
      }

      const receiptResult = await deliverReceiptForOrder(orderId);
      if (!receiptResult.sent) {
        console.warn(
          `[casso-webhook] Payment receipt email queued for retry for order "${orderId}": ${receiptResult.reason ?? "unknown"}`,
        );
      }

      console.info({
        event: "casso_webhook_success",
        transactionId: cassoTxId,
        accountId: orderId,
        amount,
        purpose: completedOrder.purpose,
        planCode: isPhysicalOrder ? (completedOrder.planCode ?? null) : "PLUS",
        userId: completedOrder.userId,
        ...(isPhysicalOrder ? { physicalOrder: true } : { subscriptionId: orderId }),
      });
      processedCount++;
    } catch (error: unknown) {
      if (cassoTxId) {
        await releaseCassoOrderProcessingClaim(claimedOrder, cassoTxId);
      }

      failedCount++;
      const msg = error instanceof Error ? error.message : "Unknown error";
      const context = {
        orderId,
        amount,
        status: claimedOrder.status,
      };
      console.error("[casso-webhook] Failed to upsert subscription for order.", { ...context, error: msg });
      backendMonitoring.captureBillingCriticalException(error, {
        event: "casso_webhook_subscription_upsert_failed",
        ...context,
      });
    }
  }

  if (failedCount > 0) {
    res.status(500).json({
      success: false,
      processedCount,
      failedCount,
      message: "Webhook processing failed for one or more matching transactions.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    processedCount,
    message: processedCount > 0
      ? `Đã xử lý ${processedCount} giao dịch.`
      : "Không có giao dịch nào khớp với đơn hàng đang chờ.",
  });
  } catch (error: unknown) {
    backendMonitoring.captureBillingCriticalException(error, {
      event: "casso_webhook_unhandled_failed",
      status: "failed",
    });
    throw error;
  }
}
