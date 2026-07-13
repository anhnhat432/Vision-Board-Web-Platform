import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { captureBackendException, flushSentry } from "./monitoring/sentry";
import { app } from "./app";
import { startTombstoneCleanupJob } from "./jobs/cleanupTombstones";
import { startFailedReceiptRetryJob } from "./jobs/failedReceiptRetryJob";
import { startPaymentOrderExpiryJob } from "./jobs/paymentOrderExpiryJob";
import { startPaymentReconciliationJob } from "./jobs/reconciliationJob";
import { startAdminAuditOutboxJob } from "./jobs/adminAuditOutboxJob";
import { initializeAdminAuditPersistence } from "./services/adminAuditOutboxService";

async function bootstrap(): Promise<void> {
  await connectMongo();
  await initializeAdminAuditPersistence();
  startFailedReceiptRetryJob();
  startPaymentOrderExpiryJob();
  startPaymentReconciliationJob();
  startAdminAuditOutboxJob();
  startTombstoneCleanupJob();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] API listening on port ${env.PORT}`);
  });
}

bootstrap().catch(async (error) => {
  captureBackendException(error);
  await flushSentry();
  // eslint-disable-next-line no-console
  console.error("[server] Failed to start backend", error);
  process.exit(1);
});
