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
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import type { CassoWebhookPayload, CassoTransaction } from "../services/cassoPaymentAdapter";
import { sendBillingPaymentConfirmedEmail } from "../services/emailNotificationService";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const ORDER_ID_REGEX = /VB[A-Z0-9]{8}/i;

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

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectDeep);
  if (!isRecord(value)) return value;

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((sorted, key) => {
      sorted[key] = sortObjectDeep(value[key]);
      return sorted;
    }, {});
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

function getRawWebhookPayload(req: Request): unknown {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody || rawBody.length === 0) return req.body;

  try {
    return JSON.parse(rawBody.toString("utf-8")) as unknown;
  } catch {
    return req.body;
  }
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

  const sortedPayload = JSON.stringify(sortObjectDeep(getRawWebhookPayload(req)));
  const signedPayload = cassoSignature.timestamp ? `${cassoSignature.timestamp}.${sortedPayload}` : sortedPayload;
  return getCassoSignatureSecrets().some((secret) => {
    const expectedSignature = createHmac("sha512", secret).update(signedPayload).digest("hex");
    return safeEqual(cassoSignature.signature, expectedSignature);
  });
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
      console.info(`[casso-webhook] Transaction ${cassoTxId}: no orderId in description "${description}". Skipping.`);
      continue;
    }

    // Step 4: Check idempotency (same Casso transaction already processed)
    if (cassoTxId) {
      const duplicate = await PaymentOrderModel.findOne({ cassoTransactionId: cassoTxId });
      if (duplicate) {
        console.info(`[casso-webhook] Transaction ${cassoTxId}: already processed. Skipping.`);
        continue;
      }
    }

    // Step 5: Find matching pending PaymentOrder
    const order = await PaymentOrderModel.findOne({
      orderId,
      status: "pending",
    });

    if (!order) {
      const context = {
        transactionId: cassoTxId,
        accountId: orderId,
        amount,
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
        transactionId: cassoTxId,
        accountId: orderId,
        amount,
        expectedAmount: order.amount,
        userId: order.userId,
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

    // Step 8: Upsert subscription via BillingService before marking the order
    // completed. If this fails, Casso should retry and the order remains pending.
    const now = new Date();
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(tx))
      .digest("hex");

    try {
      const result = await billingService.upsertSubscriptionFromProviderEvent({
        provider: "casso",
        providerEventId: `casso_${cassoTxId || orderId}`,
        eventType: "checkout_completed",
        payloadHash,
        userId: order.userId,
        planCode: "PLUS",
        status: "active",
        billingCycle: "twelve_week",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + TWELVE_WEEKS_MS),
        providerSubscriptionId: orderId,
      });

      order.status = "completed";
      order.completedAt = now;
      order.cassoTransactionId = cassoTxId || undefined;
      await order.save();

      try {
        const account = await UserModel.findOne({ firebaseUid: order.userId })
          .select("email displayName")
          .lean();
        const emailResult = await sendBillingPaymentConfirmedEmail({
          to: account?.email,
          displayName: account?.displayName,
          orderId,
          amount: order.amount,
          currency: order.currency,
          currentPeriodEnd: new Date(now.getTime() + TWELVE_WEEKS_MS),
        });
        if (emailResult.status === "failed") {
          console.warn(`[casso-webhook] Payment email failed for order "${orderId}": ${emailResult.reason ?? "unknown"}`);
        }
      } catch (emailError) {
        console.warn(`[casso-webhook] Payment email skipped for order "${orderId}":`, emailError);
      }

      console.info({
        event: "casso_webhook_success",
        transactionId: cassoTxId,
        accountId: orderId,
        amount,
        planCode: "PLUS",
        userId: order.userId,
        subscriptionId: result.subscription.id,
        eventStatus: result.eventStatus,
      });
      processedCount++;
    } catch (error: unknown) {
      failedCount++;
      const msg = error instanceof Error ? error.message : "Unknown error";
      const context = {
        transactionId: cassoTxId,
        accountId: orderId,
        amount,
        planCode: "PLUS",
        userId: order.userId,
      };
      console.error("[casso-webhook] Failed to upsert subscription for order.", { ...context, error: msg });
      backendMonitoring.captureBackendException(error, {
        tags: {
          event: "casso_webhook_subscription_upsert_failed",
          provider: "casso",
        },
        extra: context,
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
}
