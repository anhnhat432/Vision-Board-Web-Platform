import { retryFailedReceipts } from "../services/paymentReceiptDeliveryService";

const FAILED_RECEIPT_RETRY_INTERVAL_MS = 60 * 60 * 1000;
let retryTimer: NodeJS.Timeout | null = null;

export function startFailedReceiptRetryJob(): void {
  if (retryTimer) return;

  retryTimer = setInterval(() => {
    retryFailedReceipts()
      .then((result) => {
        if (result.attempted > 0) {
          console.info("[receipt-retry] Processed failed receipt queue.", result);
        }
      })
      .catch((error) => {
        console.error("[receipt-retry] Failed to process failed receipt queue.", error);
      });
  }, FAILED_RECEIPT_RETRY_INTERVAL_MS);

  retryTimer.unref?.();
}

export function stopFailedReceiptRetryJob(): void {
  if (!retryTimer) return;
  clearInterval(retryTimer);
  retryTimer = null;
}
