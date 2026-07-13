import * as backendMonitoring from "../monitoring/sentry";
import { dispatchAdminAuditOutboxBatch } from "../services/adminAuditOutboxService";

const ADMIN_AUDIT_RETRY_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runAdminAuditOutboxOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await dispatchAdminAuditOutboxBatch(25);
  } catch {
    backendMonitoring.captureBackendException(new Error("Admin audit outbox batch claim failed."), {
      tags: { feature: "admin_audit_outbox", stage: "batch_claim" },
    });
    console.error("[admin-audit-outbox] batch claim failed", "mongo_unavailable");
  } finally {
    running = false;
  }
}

export function startAdminAuditOutboxJob(): void {
  if (timer) return;
  void runAdminAuditOutboxOnce();
  timer = setInterval(() => void runAdminAuditOutboxOnce(), ADMIN_AUDIT_RETRY_INTERVAL_MS);
  timer.unref?.();
}

export function stopAdminAuditOutboxJob(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
