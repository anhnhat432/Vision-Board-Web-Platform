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
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import type { CassoWebhookPayload, CassoTransaction } from "../services/cassoPaymentAdapter";
import { createHash } from "node:crypto";

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const ORDER_ID_REGEX = /VB[A-Z0-9]{8}/;

function extractOrderId(description: string): string | null {
  const match = description.match(ORDER_ID_REGEX);
  return match ? match[0] : null;
}

export async function handleCassoWebhook(req: Request, res: Response): Promise<void> {
  // Step 1: Verify secret token
  const expectedSecret = process.env.CASSO_WEBHOOK_SECRET?.trim() ?? "";
  const headerToken =
    (req.headers["secure-token"] as string | undefined) ?? "";

  if (!expectedSecret || headerToken !== expectedSecret) {
    console.warn("[casso-webhook] Invalid or missing Secure-Token header.");
    res.status(401).json({ success: false, message: "Invalid webhook signature." });
    return;
  }

  // Step 2: Parse payload
  const payload: CassoWebhookPayload = req.body;
  if (payload.error !== 0 || !Array.isArray(payload.data)) {
    console.warn("[casso-webhook] Payload has error or missing data array.", { error: payload.error });
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
    const cassoTxId = String(tx.id ?? tx.tid ?? "");
    const description = tx.description ?? "";
    const amount = tx.amount ?? 0;

    // Only process incoming money (positive amount)
    if (amount <= 0) continue;

    const orderId = extractOrderId(description);
    if (!orderId) {
      console.info(`[casso-webhook] Transaction ${cassoTxId}: no orderId in description "${description}". Skipping.`);
      continue;
    }

    // Step 4: Find matching pending PaymentOrder
    const order = await PaymentOrderModel.findOne({
      orderId,
      status: "pending",
    });

    if (!order) {
      console.info(`[casso-webhook] Transaction ${cassoTxId}: no pending order for "${orderId}". Skipping.`);
      continue;
    }

    // Step 5: Check idempotency (same Casso transaction already processed)
    if (cassoTxId) {
      const duplicate = await PaymentOrderModel.findOne({ cassoTransactionId: cassoTxId });
      if (duplicate) {
        console.info(`[casso-webhook] Transaction ${cassoTxId}: already processed. Skipping.`);
        continue;
      }
    }

    // Step 6: Verify amount
    if (amount < order.amount) {
      console.warn(
        `[casso-webhook] Transaction ${cassoTxId}: amount ${amount} < order amount ${order.amount} for "${orderId}". Skipping.`,
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

      console.info(
        `[casso-webhook] Order "${orderId}" completed. Subscription ${result.eventStatus}: ${result.subscription.id}`,
      );
      processedCount++;
    } catch (error: unknown) {
      failedCount++;
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[casso-webhook] Failed to upsert subscription for order "${orderId}": ${msg}`);
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
