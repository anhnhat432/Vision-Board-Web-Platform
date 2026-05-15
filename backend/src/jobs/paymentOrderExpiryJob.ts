import { PaymentOrderModel } from "../models/PaymentOrderModel";

const PAYMENT_ORDER_EXPIRY_INTERVAL_MS = 5 * 60 * 1000;
let expiryTimer: NodeJS.Timeout | null = null;

export async function expirePendingPaymentOrders(): Promise<number> {
  const result = await PaymentOrderModel.updateMany(
    {
      status: "pending",
      expiresAt: { $lte: new Date() },
    },
    { $set: { status: "expired" } },
  );

  return result.modifiedCount ?? 0;
}

export function startPaymentOrderExpiryJob(): void {
  if (expiryTimer) return;

  expiryTimer = setInterval(() => {
    expirePendingPaymentOrders()
      .then((expiredCount) => {
        if (expiredCount > 0) {
          console.info("[payment-order-expiry] Expired pending payment orders.", { expiredCount });
        }
      })
      .catch((error) => {
        console.error("[payment-order-expiry] Failed to expire pending payment orders.", error);
      });
  }, PAYMENT_ORDER_EXPIRY_INTERVAL_MS);

  expiryTimer.unref?.();
}

export function stopPaymentOrderExpiryJob(): void {
  if (!expiryTimer) return;
  clearInterval(expiryTimer);
  expiryTimer = null;
}
