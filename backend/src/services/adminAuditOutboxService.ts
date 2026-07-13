import { createHmac } from "node:crypto";

import { env } from "../config/env";
import {
  AdminAuditOutboxModel,
  type AdminAuditOutboxEntity,
} from "../models/AdminAuditOutboxModel";
import { AuditLogModel } from "../models/auditLogModel";
import { ApiError } from "../utils/apiError";

export interface AdminSalesReviewAuditIdentityInput {
  reviewRequestId: string;
  actorUid: string;
  targetId: string;
  newStatus: "included" | "excluded";
  exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
  reviewNote?: string;
}

export interface AdminSalesReviewAuditIdentity {
  eventId: string;
  reviewRequestId: string;
  actorUid: string;
  target: "payment_order_sales_reporting";
  targetId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
}

type AdminAuditIdentityRow = Pick<
  AdminAuditOutboxEntity,
  "actorUid" | "target" | "targetId" | "commandFingerprint" | "commandFingerprintVersion"
>;

function createUnavailableError(): ApiError {
  return new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
}

export function buildAdminSalesReviewAuditIdentity(
  input: AdminSalesReviewAuditIdentityInput,
): AdminSalesReviewAuditIdentity {
  const secret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw createUnavailableError();

  const normalizedNote = input.reviewNote?.trim().slice(0, 500) || null;
  const canonicalCommand = JSON.stringify({
    version: "v1",
    reviewRequestId: input.reviewRequestId,
    actorUid: input.actorUid,
    target: "payment_order_sales_reporting",
    targetId: input.targetId,
    newStatus: input.newStatus,
    exclusionReason: input.exclusionReason ?? null,
    reviewNote: normalizedNote,
  });
  const commandFingerprint = createHmac("sha256", secret).update(canonicalCommand).digest("hex");

  return {
    eventId: `admin_sales_reviewed:${input.reviewRequestId}`,
    reviewRequestId: input.reviewRequestId,
    actorUid: input.actorUid,
    target: "payment_order_sales_reporting",
    targetId: input.targetId,
    commandFingerprint,
    commandFingerprintVersion: "v1",
  };
}

export async function resolveAdminAuditIdempotency(
  identity: AdminSalesReviewAuditIdentity,
): Promise<"missing" | "match" | "conflict"> {
  try {
    const [outbox, audit] = await Promise.all([
      AdminAuditOutboxModel.findOne({ eventId: identity.eventId })
        .select("actorUid target targetId commandFingerprint commandFingerprintVersion")
        .lean<AdminAuditIdentityRow | null>(),
      AuditLogModel.findOne({ eventId: identity.eventId })
        .select("actorUid target targetId commandFingerprint commandFingerprintVersion")
        .lean<AdminAuditIdentityRow | null>(),
    ]);
    const matches = (existing: AdminAuditIdentityRow) =>
      existing.actorUid === identity.actorUid &&
      existing.target === identity.target &&
      existing.targetId === identity.targetId &&
      existing.commandFingerprint === identity.commandFingerprint &&
      existing.commandFingerprintVersion === identity.commandFingerprintVersion;

    if (!outbox && !audit) return "missing";
    if ((outbox && !matches(outbox)) || (audit && !matches(audit))) return "conflict";
    return "match";
  } catch {
    throw createUnavailableError();
  }
}

export function isDuplicateAdminAuditEventIdError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
  };
  return candidate.code === 11000 &&
    (candidate.keyPattern?.eventId === 1 || typeof candidate.keyValue?.eventId === "string");
}

export async function initializeAdminAuditPersistence(): Promise<void> {
  await Promise.all([
    AdminAuditOutboxModel.init(),
    AuditLogModel.init(),
  ]);
}
