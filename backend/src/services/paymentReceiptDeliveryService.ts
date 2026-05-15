import * as backendMonitoring from "../monitoring/sentry";
import { FailedReceiptQueueModel } from "../models/FailedReceiptQueueModel";
import { PaymentOrderModel, type PaymentOrderDocument } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import * as receiptEmailService from "./receiptEmailService";

const MAX_RECEIPT_RETRY_COUNT = 5;
const RECEIPT_RETRY_LIMIT = 20;
const RECEIPT_RETRY_STALE_MS = 60 * 60 * 1000;

function isConfiguredEmailAddress(value: string | null | undefined): value is string {
  return Boolean(value && value.includes("@") && value.trim().length <= 254);
}

function truncateError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value || "receipt_send_failed");
  return message.slice(0, 500);
}

function getPlanName(order: { planCode: string; billingCycle?: string }): string {
  if (order.planCode === "PLUS") {
    if (order.billingCycle === "yearly") return "Plus yearly";
    if (order.billingCycle === "monthly") return "Plus monthly";
    return "Plus 12 tuần";
  }

  return order.planCode;
}

async function resolveReceiptRecipient(order: PaymentOrderDocument): Promise<{ email: string | null; name?: string | null }> {
  if (isConfiguredEmailAddress(order.receiptEmail)) {
    return { email: order.receiptEmail.trim().toLowerCase(), name: order.receiptName };
  }

  if (order.userId.startsWith("public:")) return { email: null, name: order.receiptName };

  const account = await UserModel.findOne({ firebaseUid: order.userId }).select("email displayName").lean();
  return {
    email: isConfiguredEmailAddress(account?.email) ? account.email.trim().toLowerCase() : null,
    name: order.receiptName || account?.displayName,
  };
}

async function markReceiptFailure(orderId: string, error: unknown): Promise<void> {
  const lastError = truncateError(error);
  try {
    await PaymentOrderModel.updateOne({ orderId }, { $set: { receiptLastError: lastError } });
    await FailedReceiptQueueModel.updateOne(
      { orderId },
      {
        $set: { lastTriedAt: new Date(), lastError },
        $inc: { retryCount: 1 },
        $setOnInsert: { orderId },
      },
      { upsert: true },
    );
  } catch (queueError) {
    console.error("[receipt] Failed to persist failed receipt queue entry.", {
      orderId,
      error: truncateError(queueError),
    });
  }
}

export async function enqueueFailedReceipt(orderId: string, error: unknown): Promise<void> {
  await markReceiptFailure(orderId, error);
}

export async function deliverReceiptForOrder(orderId: string): Promise<{ sent: boolean; reason?: string }> {
  const order = await PaymentOrderModel.findOne({ orderId });
  if (!order) return { sent: false, reason: "order_not_found" };
  if (order.status !== "completed" || !order.completedAt) return { sent: false, reason: "order_not_completed" };

  const recipient = await resolveReceiptRecipient(order);
  if (!isConfiguredEmailAddress(recipient.email)) {
    await markReceiptFailure(order.orderId, "missing_receipt_recipient");
    return { sent: false, reason: "missing_receipt_recipient" };
  }

  try {
    const result = await receiptEmailService.sendPaymentReceipt({
      orderId: order.orderId,
      userEmail: recipient.email,
      userName: recipient.name,
      amount: order.amount,
      currency: order.currency,
      planName: getPlanName(order),
      paidAt: order.completedAt,
      paymentRef: order.cassoTransactionId,
    });

    if (result.status !== "sent") {
      const reason = result.reason ?? result.status;
      order.receiptLastError = reason;
      await order.save();
      if (result.status === "failed") {
        await markReceiptFailure(order.orderId, reason);
      }
      return { sent: false, reason };
    }

    order.receiptEmail = recipient.email;
    order.receiptName = recipient.name || order.receiptName;
    order.receiptSentAt = new Date();
    order.receiptLastError = undefined;
    await order.save();
    try {
      await FailedReceiptQueueModel.deleteOne({ orderId: order.orderId });
    } catch (queueCleanupError) {
      console.error("[receipt] Failed to clean failed receipt queue entry after send.", {
        orderId: order.orderId,
        error: truncateError(queueCleanupError),
      });
    }
    return { sent: true };
  } catch (error) {
    await markReceiptFailure(order.orderId, error);
    backendMonitoring.captureBackendException(error, {
      tags: {
        event: "payment_receipt_send_failed",
        provider: "casso",
      },
      extra: {
        orderId: order.orderId,
        userId: order.userId,
      },
    });
    return { sent: false, reason: truncateError(error) };
  }
}

export async function retryFailedReceipts(): Promise<{ attempted: number; sent: number; failed: number }> {
  const staleBefore = new Date(Date.now() - RECEIPT_RETRY_STALE_MS);
  const entries = await FailedReceiptQueueModel.find({
    retryCount: { $lt: MAX_RECEIPT_RETRY_COUNT },
    $or: [{ lastTriedAt: { $exists: false } }, { lastTriedAt: { $lte: staleBefore } }],
  })
    .sort({ lastTriedAt: 1, createdAt: 1 })
    .limit(RECEIPT_RETRY_LIMIT);

  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    const result = await deliverReceiptForOrder(entry.orderId);
    if (result.sent) sent++;
    else failed++;
  }

  return { attempted: entries.length, sent, failed };
}
