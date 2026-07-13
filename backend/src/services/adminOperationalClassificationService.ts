import mongoose, { type ClientSession } from "mongoose";

import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import {
  isOperationalClassificationReasonAllowed,
  type AdminOperationalClassificationSummary,
  type OperationalCategory,
  type OperationalClassification,
  type OperationalClassificationReason,
} from "../models/OperationalClassification";
import { UserModel, type UserDocument } from "../models/UserModel";
import {
  buildAdminOperationalClassificationAuditEvent,
  buildAdminOperationalClassificationAuditIdentity,
  isDuplicateAdminAuditEventIdError,
  resolveAdminAuditIdempotency,
  type AdminOperationalClassificationAuditIdentity,
} from "./adminAuditOutboxService";
import { ApiError } from "../utils/apiError";

const OPERATIONAL_REASONS: readonly OperationalClassificationReason[] = [
  "confirmed_real",
  "test_account",
  "internal_team",
  "automated_qa",
  "other",
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ClassifyAdminUserInput {
  actorUid: string;
  userUid: string;
  requestId: string;
  category: unknown;
  reason: unknown;
  note?: unknown;
}

export interface ClassifyAdminUserResult {
  status: "updated" | "unchanged";
  classification: AdminOperationalClassificationSummary;
}

export type AdminClassificationSafeErrorCode =
  | "user_not_found"
  | "admin_audit_unavailable"
  | "admin_audit_commit_unknown"
  | "admin_classification_request_conflict"
  | "invalid_classification_target"
  | "unknown_safe";

export interface BulkClassifyAdminUsersInput {
  actorUid: string;
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changes: Array<{ userUid: string; requestId: string }>;
}

interface ValidatedClassificationCommand {
  actorUid: string;
  userUid: string;
  requestId: string;
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changedAt: Date;
}

export function validateOperationalClassificationInput(input: {
  category: unknown;
  reason: unknown;
  note?: unknown;
}): { category: OperationalCategory; reason: OperationalClassificationReason; note?: string } {
  if (input.category !== "real" && input.category !== "test" && input.category !== "internal") {
    throw new ApiError(400, "Classification category is invalid.", undefined, "invalid_operational_category");
  }
  if (typeof input.reason !== "string" || !OPERATIONAL_REASONS.includes(input.reason as OperationalClassificationReason)) {
    throw new ApiError(400, "Classification reason is invalid.", undefined, "invalid_operational_reason");
  }
  if (input.note != null && typeof input.note !== "string") {
    throw new ApiError(400, "Classification note must be a string.", undefined, "invalid_operational_note");
  }

  const category = input.category;
  const reason = input.reason as OperationalClassificationReason;
  const note = typeof input.note === "string" ? input.note.trim() || undefined : undefined;

  if (!isOperationalClassificationReasonAllowed(category, reason)) {
    throw new ApiError(
      400,
      "Classification reason does not match category.",
      undefined,
      "classification_reason_mismatch",
    );
  }
  if (reason === "other" && !note) {
    throw new ApiError(400, "Classification note is required.", undefined, "classification_note_required");
  }
  if (note && note.length > 200) {
    throw new ApiError(400, "Classification note is too long.", undefined, "classification_note_too_long");
  }

  return { category, reason, note };
}

function validateClassificationCommand(input: ClassifyAdminUserInput): ValidatedClassificationCommand {
  const actorUid = input.actorUid.trim();
  const userUid = input.userUid.trim();
  const requestId = input.requestId.trim().toLowerCase();
  if (!actorUid || !userUid || userUid.length > 128) {
    throw new ApiError(400, "Classification target is invalid.", undefined, "invalid_classification_target");
  }
  if (!UUID_PATTERN.test(requestId)) {
    throw new ApiError(
      400,
      "A valid classification request id is required.",
      undefined,
      "invalid_classification_request_id",
    );
  }
  const classification = validateOperationalClassificationInput(input);
  return { actorUid, userUid, requestId, ...classification, changedAt: new Date() };
}

function buildStoredClassification(command: ValidatedClassificationCommand): OperationalClassification {
  return {
    category: command.category,
    reason: command.reason,
    ...(command.note ? { note: command.note } : {}),
    classifiedBy: command.actorUid,
    classifiedAt: command.changedAt,
  };
}

function sameStoredClassification(
  current: OperationalClassification | null | undefined,
  next: OperationalClassification,
): boolean {
  return current?.category === next.category &&
    current.reason === next.reason &&
    (current.note ?? undefined) === (next.note ?? undefined);
}

function hasUnknownCommitResultLabel(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "hasErrorLabel" in error &&
    typeof (error as { hasErrorLabel?: unknown }).hasErrorLabel === "function" &&
    (error as { hasErrorLabel(label: string): boolean }).hasErrorLabel("UnknownTransactionCommitResult"),
  );
}

async function withClassificationTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      result = await work(session);
    });
    if (result === undefined) {
      throw new ApiError(503, "Classification commit result is unavailable.", undefined, "admin_audit_commit_unknown");
    }
    return result;
  } catch (error) {
    if (hasUnknownCommitResultLabel(error)) {
      throw new ApiError(
        503,
        "Classification commit result is unknown. Retry with the same request id.",
        undefined,
        "admin_audit_commit_unknown",
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function readCurrentUserClassification(
  userUid: string,
  status: "unchanged",
): Promise<ClassifyAdminUserResult> {
  const user = await UserModel.findOne({ firebaseUid: userUid }).lean<UserDocument | null>();
  if (!user) throw new ApiError(404, "User not found.", undefined, "user_not_found");
  return {
    status,
    classification: resolveEffectiveOperationalClassification({ userClassification: user.operationalClassification }),
  };
}

async function resolveClassificationRace(
  identity: AdminOperationalClassificationAuditIdentity,
  userUid: string,
): Promise<ClassifyAdminUserResult | null> {
  const raced = await resolveAdminAuditIdempotency(identity);
  if (raced === "match") return readCurrentUserClassification(userUid, "unchanged");
  if (raced === "conflict") {
    throw new ApiError(
      409,
      "Classification request conflicts with an earlier command.",
      undefined,
      "admin_classification_request_conflict",
    );
  }
  return null;
}

export async function classifyAdminUser(input: ClassifyAdminUserInput): Promise<ClassifyAdminUserResult> {
  const command = validateClassificationCommand(input);
  const identity = buildAdminOperationalClassificationAuditIdentity({
    requestId: command.requestId,
    actorUid: command.actorUid,
    target: "user_operational_classification",
    targetId: command.userUid,
    newCategory: command.category,
    reason: command.reason,
    note: command.note,
  });
  const replay = await resolveClassificationRace(identity, command.userUid);
  if (replay) return replay;

  try {
    return await withClassificationTransaction(async (session) => {
      const user = await UserModel.findOne({ firebaseUid: command.userUid }).session(session);
      if (!user) throw new ApiError(404, "User not found.", undefined, "user_not_found");

      const previous = user.operationalClassification ?? null;
      const next = buildStoredClassification(command);
      const status = sameStoredClassification(previous, next) ? "unchanged" : "updated";
      if (status === "updated") {
        user.operationalClassification = next;
        await user.save({ session, validateModifiedOnly: true });
      }
      await AdminAuditOutboxModel.create([
        buildAdminOperationalClassificationAuditEvent({
          identity,
          requestId: command.requestId,
          previousCategory: previous?.category ?? "real",
          newCategory: command.category,
          reason: command.reason,
          note: command.note,
          changedAt: command.changedAt,
        }),
      ], { session });
      return {
        status,
        classification: resolveEffectiveOperationalClassification({
          userClassification: status === "updated" ? next : previous,
        }),
      };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isDuplicateAdminAuditEventIdError(error)) {
      const raced = await resolveClassificationRace(identity, command.userUid);
      if (raced) return raced;
    }
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
  }
}

export function toSafeClassificationErrorCode(error: unknown): AdminClassificationSafeErrorCode {
  const code = error instanceof ApiError ? error.errorCode : undefined;
  switch (code) {
    case "user_not_found":
    case "admin_audit_unavailable":
    case "admin_audit_commit_unknown":
    case "admin_classification_request_conflict":
    case "invalid_classification_target":
      return code;
    default:
      return "unknown_safe";
  }
}

export async function bulkClassifyAdminUsers(input: BulkClassifyAdminUsersInput): Promise<{
  category: OperationalCategory;
  results: Array<
    | { userUid: string; status: "updated" | "unchanged" }
    | { userUid: string; status: "failed"; errorCode: AdminClassificationSafeErrorCode }
  >;
}> {
  const results: Array<
    | { userUid: string; status: "updated" | "unchanged" }
    | { userUid: string; status: "failed"; errorCode: AdminClassificationSafeErrorCode }
  > = [];
  for (const change of input.changes) {
    try {
      const result = await classifyAdminUser({
        actorUid: input.actorUid,
        userUid: change.userUid,
        requestId: change.requestId,
        category: input.category,
        reason: input.reason,
        note: input.note,
      });
      results.push({ userUid: change.userUid, status: result.status });
    } catch (error) {
      results.push({ userUid: change.userUid, status: "failed", errorCode: toSafeClassificationErrorCode(error) });
    }
  }
  return { category: input.category, results };
}

export function resolveEffectiveOperationalClassification(input: {
  userClassification?: OperationalClassification | null;
  recordClassification?: OperationalClassification | null;
  legacySalesReason?: "test" | "internal_team" | null;
}): AdminOperationalClassificationSummary {
  const user = input.userClassification;
  if (user && user.category !== "real") return serializeClassification(user, "user");

  const record = input.recordClassification;
  if (record) return serializeClassification(record, "record");

  if (input.legacySalesReason === "test") {
    return { effectiveCategory: "test", source: "legacy_sales_review", reason: "legacy_sales_test" };
  }
  if (input.legacySalesReason === "internal_team") {
    return { effectiveCategory: "internal", source: "legacy_sales_review", reason: "legacy_sales_internal" };
  }
  if (user) return serializeClassification(user, "user");

  return { effectiveCategory: "real", source: "default" };
}

function serializeClassification(
  classification: OperationalClassification,
  source: "user" | "record",
): AdminOperationalClassificationSummary {
  return {
    effectiveCategory: classification.category,
    source,
    reason: classification.reason,
    note: classification.note,
    classifiedAt: classification.classifiedAt.toISOString(),
  };
}
