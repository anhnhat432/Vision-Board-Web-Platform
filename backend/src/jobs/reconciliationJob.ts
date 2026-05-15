import { reconcilePendingCassoPaymentOrders, type PaymentOrderReconciliationRunSummary } from "../services/billingReconciliation";
import * as backendMonitoring from "../monitoring/sentry";

const RECONCILIATION_INTERVAL_MS = 3 * 60 * 1000;

let reconciliationTimer: NodeJS.Timeout | null = null;
let running = false;
let lastRun: PaymentOrderReconciliationRunSummary | null = null;

export function getLastPaymentReconciliationRun(): PaymentOrderReconciliationRunSummary | null {
  return lastRun;
}

export async function runPaymentReconciliationOnce(): Promise<PaymentOrderReconciliationRunSummary | null> {
  if (running) return lastRun;
  running = true;
  try {
    lastRun = await reconcilePendingCassoPaymentOrders();
    return lastRun;
  } catch (error) {
    backendMonitoring.captureBackendException(error, {
      tags: {
        event: "casso_reconciliation_job_failed",
        provider: "casso",
      },
    });
    console.error("[casso-reconciliation] job failed", error instanceof Error ? error.message : "unknown_error");
    return lastRun;
  } finally {
    running = false;
  }
}

export function startPaymentReconciliationJob(): void {
  if (reconciliationTimer) return;

  void runPaymentReconciliationOnce();
  reconciliationTimer = setInterval(() => {
    void runPaymentReconciliationOnce();
  }, RECONCILIATION_INTERVAL_MS);

  reconciliationTimer.unref?.();
}

export function stopPaymentReconciliationJob(): void {
  if (!reconciliationTimer) return;
  clearInterval(reconciliationTimer);
  reconciliationTimer = null;
}
