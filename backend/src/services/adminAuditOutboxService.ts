import { createHmac, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { env } from "../config/env";
import * as backendMonitoring from "../monitoring/sentry";
import {
  AdminAuditOutboxModel,
  type AdminAuditOutboxErrorCode,
  type AdminAuditOutboxEntity,
  type AdminAuditOutboxInsert,
  type AdminOperationalClassificationAuditPayload,
  type AdminOperationalClassificationAuditTarget,
} from "../models/AdminAuditOutboxModel";
import { AuditLogModel, type AuditLogEntity } from "../models/auditLogModel";
import type { OperationalCategory, OperationalClassificationReason } from "../models/OperationalClassification";
import { ApiError } from "../utils/apiError";

export interface AdminSalesReviewAuditIdentityInput {
  reviewRequestId: string;
  actorUid: string;
  targetId: string;
  newStatus: "included" | "excluded";
  exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
  reviewNote?: string;
}

export interface AdminAuditIdentity {
  eventId: string;
  actorUid: string;
  target: "payment_order_sales_reporting" | AdminOperationalClassificationAuditTarget;
  targetId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
}

export interface AdminSalesReviewAuditIdentity extends AdminAuditIdentity {
  reviewRequestId: string;
  target: "payment_order_sales_reporting";
}

export interface AdminOperationalClassificationAuditIdentityInput {
  requestId: string;
  actorUid: string;
  target: AdminOperationalClassificationAuditTarget;
  targetId: string;
  newCategory: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
}

export interface AdminOperationalClassificationAuditIdentity extends AdminAuditIdentity {
  requestId: string;
  target: AdminOperationalClassificationAuditTarget;
}

export type AdminAuditDispatchStatus = "not_available" | "completed" | "retry_scheduled" | "lease_lost";

export interface AdminAuditDispatchResult {
  status: AdminAuditDispatchStatus;
  eventId: string | null;
}

export interface AdminAuditDispatchSummary {
  claimed: number;
  completed: number;
  retryScheduled: number;
  leaseLost: number;
}

type AdminAuditIdentityRow = Pick<
  AdminAuditOutboxEntity,
  "actorUid" | "target" | "targetId" | "commandFingerprint" | "commandFingerprintVersion"
>;

function createUnavailableError(): ApiError {
  return new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
}

export function requireAdminAuditFingerprintSecret(): string {
  const secret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw createUnavailableError();
  return secret;
}

export function buildAdminSalesReviewAuditIdentity(
  input: AdminSalesReviewAuditIdentityInput,
): AdminSalesReviewAuditIdentity {
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
  const commandFingerprint = createHmac("sha256", requireAdminAuditFingerprintSecret()).update(canonicalCommand).digest("hex");

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

export function buildAdminOperationalClassificationAuditIdentity(
  input: AdminOperationalClassificationAuditIdentityInput,
): AdminOperationalClassificationAuditIdentity {
  const canonicalCommand = JSON.stringify({
    version: "v1",
    requestId: input.requestId,
    actorUid: input.actorUid,
    target: input.target,
    targetId: input.targetId,
    newCategory: input.newCategory,
    reason: input.reason,
    note: input.note?.trim().slice(0, 200) || null,
  });
  return {
    eventId: `admin_operational_classification_changed:${input.requestId}`,
    actorUid: input.actorUid,
    target: input.target,
    targetId: input.targetId,
    requestId: input.requestId,
    commandFingerprint: createHmac("sha256", requireAdminAuditFingerprintSecret()).update(canonicalCommand).digest("hex"),
    commandFingerprintVersion: "v1",
  };
}

export function buildAdminOperationalClassificationAuditEvent(input: {
  identity: AdminOperationalClassificationAuditIdentity;
  requestId: string;
  previousCategory: OperationalCategory;
  newCategory: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changedAt: Date;
}): AdminAuditOutboxInsert {
  const note = input.note?.trim().slice(0, 200) || undefined;
  const payload: AdminOperationalClassificationAuditPayload = {
    previousCategory: input.previousCategory,
    newCategory: input.newCategory,
    reason: input.reason,
    ...(note ? { note } : {}),
    changedAt: input.changedAt.toISOString(),
  };
  return {
    ...input.identity,
    requestId: input.requestId,
    eventType: "admin_operational_classification_changed",
    payload,
    occurredAt: input.changedAt,
    status: "pending",
    attempts: 0,
    availableAt: input.changedAt,
  };
}

export async function resolveAdminAuditIdempotency(
  identity: AdminAuditIdentity,
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

function getAuditAction(event: AdminAuditOutboxEntity): string {
  return event.eventType === "admin_sales_reviewed"
    ? "reviewAdminSalesOrder"
    : "changeAdminOperationalClassification";
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

class AdminAuditCanonicalMismatchError extends Error {
  override name = "AdminAuditCanonicalMismatchError";
}

function canonicalAuditMatches(event: AdminAuditOutboxEntity, audit: AuditLogEntity): boolean {
  return audit.eventId === event.eventId &&
    audit.actorUid === event.actorUid &&
    audit.target === event.target &&
    audit.targetId === event.targetId &&
    audit.commandFingerprint === event.commandFingerprint &&
    audit.commandFingerprintVersion === event.commandFingerprintVersion &&
    audit.action === getAuditAction(event) &&
    audit.actorEmail == null &&
    audit.ip == null &&
    audit.userAgent == null &&
    audit.success === true &&
    audit.timestamp.getTime() === event.occurredAt.getTime() &&
    isDeepStrictEqual(audit.payload, event.payload);
}

async function upsertCanonicalAudit(event: AdminAuditOutboxEntity): Promise<void> {
  await AuditLogModel.updateOne(
    { eventId: event.eventId },
    {
      $setOnInsert: {
        eventId: event.eventId,
        commandFingerprint: event.commandFingerprint,
        commandFingerprintVersion: event.commandFingerprintVersion,
        actorUid: event.actorUid,
        actorEmail: null,
        action: getAuditAction(event),
        target: event.target,
        targetId: event.targetId,
        payload: event.payload as unknown as Record<string, unknown>,
        ip: null,
        userAgent: null,
        timestamp: event.occurredAt,
        success: true,
      },
    },
    { upsert: true, runValidators: true },
  );
}

async function materializeAdminAuditEvent(event: AdminAuditOutboxEntity): Promise<void> {
  try {
    await upsertCanonicalAudit(event);
  } catch (error) {
    if (!isDuplicateAdminAuditEventIdError(error)) throw error;
  }

  const existing = await AuditLogModel.findOne({ eventId: event.eventId }).lean<AuditLogEntity | null>();
  if (!existing || !canonicalAuditMatches(event, existing)) {
    throw new AdminAuditCanonicalMismatchError("Canonical Admin audit identity mismatch.");
  }
}

function classifyAdminAuditOutboxError(error: unknown): AdminAuditOutboxErrorCode {
  const name = error instanceof Error ? error.name : "";
  if (name === "ValidationError" || name === "AdminAuditCanonicalMismatchError") {
    return "audit_validation_failed";
  }
  if (name === "MongoNetworkError" || name === "MongoServerSelectionError" || name === "MongoTopologyClosedError") {
    return "mongo_unavailable";
  }
  return "unknown_safe";
}

function retryAvailableAt(attempts: number, now: Date): Date {
  const delayMs = Math.min(60 * 60 * 1000, 1000 * (2 ** Math.min(Math.max(attempts, 1), 12)));
  return new Date(now.getTime() + delayMs);
}

export async function dispatchAdminAuditOutboxEvent(eventId?: string): Promise<AdminAuditDispatchResult> {
  const now = new Date();
  const leaseToken = randomUUID();
  const event = await AdminAuditOutboxModel.findOneAndUpdate(
    {
      ...(eventId ? { eventId } : {}),
      $or: [
        { status: "pending", availableAt: { $lte: now } },
        { status: "processing", lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        leaseToken,
        lockedUntil: new Date(now.getTime() + 120_000),
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { availableAt: 1, createdAt: 1 } },
  ).lean<AdminAuditOutboxEntity | null>();
  if (!event) return { status: "not_available", eventId: null };
  const claimedLeaseToken = event.leaseToken ?? leaseToken;

  try {
    await materializeAdminAuditEvent(event);
    const completed = await AdminAuditOutboxModel.findOneAndUpdate(
      { eventId: event.eventId, status: "processing", leaseToken: claimedLeaseToken },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          leaseToken: null,
          lockedUntil: null,
          lastErrorCode: null,
        },
      },
      { new: true },
    ).lean<AdminAuditOutboxEntity | null>();
    if (!completed) return { status: "lease_lost", eventId: event.eventId };
    return { status: "completed", eventId: event.eventId };
  } catch (error) {
    const errorCode = classifyAdminAuditOutboxError(error);
    const retried = await AdminAuditOutboxModel.findOneAndUpdate(
      { eventId: event.eventId, status: "processing", leaseToken: claimedLeaseToken },
      {
        $set: {
          status: "pending",
          availableAt: retryAvailableAt(event.attempts, now),
          lastErrorCode: errorCode,
          leaseToken: null,
          lockedUntil: null,
        },
      },
      { new: true },
    ).lean<AdminAuditOutboxEntity | null>();
    if (!retried) return { status: "lease_lost", eventId: event.eventId };

    if (event.attempts >= 3) {
      backendMonitoring.captureBackendException(new Error(`Admin audit outbox dispatch failed: ${errorCode}`), {
        tags: { feature: "admin_audit_outbox", errorCode },
        extra: { eventId: event.eventId, targetId: event.targetId, attempts: event.attempts },
      });
    }
    return { status: "retry_scheduled", eventId: event.eventId };
  }
}

export async function dispatchAdminAuditOutboxBatch(limit = 25): Promise<AdminAuditDispatchSummary> {
  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const summary: AdminAuditDispatchSummary = { claimed: 0, completed: 0, retryScheduled: 0, leaseLost: 0 };
  for (let index = 0; index < boundedLimit; index += 1) {
    const result = await dispatchAdminAuditOutboxEvent();
    if (result.status === "not_available") break;
    summary.claimed += 1;
    if (result.status === "completed") summary.completed += 1;
    if (result.status === "retry_scheduled") summary.retryScheduled += 1;
    if (result.status === "lease_lost") summary.leaseLost += 1;
  }
  return summary;
}
