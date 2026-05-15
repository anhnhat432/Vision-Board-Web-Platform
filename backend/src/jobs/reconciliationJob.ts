import { reconcilePendingCassoPaymentOrders, type PaymentOrderReconciliationRunSummary } from "../services/billingReconciliation";
import * as backendMonitoring from "../monitoring/sentry";

const RECONCILIATION_INTERVAL_MS = 3 * 60 * 1000;

let reconciliationTimer: NodeJS.Timeout | null = null;
let running = false;
let lastRun: PaymentOrderReconciliationRunSummary | null = null;
let consecutiveFailures = 0;

export function getLastPaymentReconciliationRun(): PaymentOrderReconciliationRunSummary | null {
  return lastRun;
}

export function getPaymentReconciliationConsecutiveFailures(): number {
  return consecutiveFailures;
}

export async function runPaymentReconciliationOnce(): Promise<PaymentOrderReconciliationRunSummary | null> {
  if (running) return lastRun;
  running = true;
  try {
    lastRun = await reconcilePendingCassoPaymentOrders();
    consecutiveFailures = lastRun.errors > 0 ? consecutiveFailures + 1 : 0;
    if (lastRun.errors > 0) {
      backendMonitoring.captureBillingCriticalException(new Error("Casso reconciliation run completed with errors."), {
        event: "casso_reconciliation_run_has_errors",
        status: `errors:${lastRun.errors};consecutive:${consecutiveFailures}`,
      });
    }
    return lastRun;
  } catch (error) {
    consecutiveFailures++;
    backendMonitoring.captureBillingCriticalException(error, {
      event: "casso_reconciliation_job_failed",
      status: `consecutive:${consecutiveFailures}`,
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
