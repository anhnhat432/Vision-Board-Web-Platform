import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-audit-outbox-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-audit-outbox-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { env } from "../config/env";
import { AuditLogModel } from "../models/auditLogModel";
import { type AuditLogEntity } from "../models/auditLogModel";
import {
  AdminAuditOutboxModel,
  type AdminAuditOutboxEntity,
} from "../models/AdminAuditOutboxModel";
import {
  buildAdminOperationalClassificationAuditEvent,
  buildAdminOperationalClassificationAuditIdentity,
  buildAdminSalesReviewAuditIdentity,
  dispatchAdminAuditOutboxEvent,
  isDuplicateAdminAuditEventIdError,
  resolveAdminAuditIdempotency,
} from "../services/adminAuditOutboxService";
import { ApiError } from "../utils/apiError";

type IdentityRow = {
  actorUid: string;
  target: string;
  targetId?: string | null;
  commandFingerprint?: string | null;
  commandFingerprintVersion?: string | null;
};

type MockableModel = {
  findOne: unknown;
};

type LeanResult<T> = { lean(): Promise<T> };
type OutboxFilter = Record<string, unknown>;
type OutboxUpdate = Record<string, unknown> & {
  $set?: Record<string, unknown>;
  $inc?: Record<string, number>;
};
type OutboxFindOneAndUpdate = (
  filter: OutboxFilter,
  update: OutboxUpdate,
  options?: Record<string, unknown>,
) => LeanResult<AdminAuditOutboxEntity | null>;
type MockableOutboxModel = { findOneAndUpdate: OutboxFindOneAndUpdate };

interface AuditLogUpsert {
  $setOnInsert: {
    timestamp: Date;
    actorEmail: null;
    [key: string]: unknown;
  };
}

type MockableAuditLogModel = {
  updateOne(filter: Record<string, unknown>, update: AuditLogUpsert): Promise<unknown>;
  findOne(filter: Record<string, unknown>): LeanResult<AuditLogEntity | null>;
};

const originalAuditFingerprintSecret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
const auditFingerprintFixtureSecret = "test-admin-audit-fingerprint-secret-at-least-32-bytes";
const originalOutboxFindOne = (AdminAuditOutboxModel as unknown as MockableModel).findOne;
const originalAuditFindOne = (AuditLogModel as unknown as MockableModel).findOne;
const originalOutboxFindOneAndUpdate = AdminAuditOutboxModel.findOneAndUpdate;
const originalAuditUpdateOne = AuditLogModel.updateOne;

function createLeanResult(value: IdentityRow | null) {
  return {
    select() {
      return this;
    },
    async lean() {
      return value;
    },
  };
}

function identityRow(identity: {
  actorUid: string;
  target: string;
  targetId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
}): IdentityRow {
  return {
    actorUid: identity.actorUid,
    target: identity.target,
    targetId: identity.targetId,
    commandFingerprint: identity.commandFingerprint,
    commandFingerprintVersion: identity.commandFingerprintVersion,
  };
}

function mockIdempotencyRows(outbox: IdentityRow | null, audit: IdentityRow | null): void {
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = () => createLeanResult(outbox);
  (AuditLogModel as unknown as MockableModel).findOne = () => createLeanResult(audit);
}

function leanResult<T>(value: T): LeanResult<T> {
  return { async lean() { return value; } };
}

type AdminSalesReviewOutboxEntity = Extract<AdminAuditOutboxEntity, { eventType: "admin_sales_reviewed" }>;

function createOutboxFixture(overrides: Partial<AdminSalesReviewOutboxEntity> = {}): AdminSalesReviewOutboxEntity {
  const occurredAt = new Date("2026-07-13T02:00:00.000Z");
  return {
    eventId: "admin_sales_reviewed:req-1",
    reviewRequestId: "11111111-1111-4111-8111-111111111111",
    commandFingerprint: "a".repeat(64),
    commandFingerprintVersion: "v1",
    eventType: "admin_sales_reviewed",
    actorUid: "admin_uid",
    target: "payment_order_sales_reporting",
    targetId: "VBREVIEW01",
    payload: {
      previousStatus: "pending",
      newStatus: "excluded",
      exclusionReason: "test",
      noteProvided: true,
      reviewedAt: occurredAt.toISOString(),
    },
    occurredAt,
    status: "pending",
    attempts: 0,
    availableAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function createCanonicalAuditFixture(event: AdminAuditOutboxEntity): AuditLogEntity {
  return {
    eventId: event.eventId,
    commandFingerprint: event.commandFingerprint,
    commandFingerprintVersion: event.commandFingerprintVersion,
    actorUid: event.actorUid,
    actorEmail: null,
    action: event.eventType === "admin_sales_reviewed"
      ? "reviewAdminSalesOrder"
      : "changeAdminOperationalClassification",
    target: event.target,
    targetId: event.targetId,
    payload: event.payload as unknown as Record<string, unknown>,
    ip: null,
    userAgent: null,
    timestamp: event.occurredAt,
    success: true,
  };
}

function createClassificationOutboxFixture(): AdminAuditOutboxEntity {
  const changedAt = new Date("2026-07-13T03:00:00.000Z");
  const requestId = "11111111-1111-4111-8111-111111111111";
  const identity = buildAdminOperationalClassificationAuditIdentity({
    requestId,
    actorUid: "admin_uid",
    target: "user_operational_classification",
    targetId: "user_test",
    newCategory: "test",
    reason: "test_account",
    note: "Seeded checkout tests",
  });
  return {
    ...buildAdminOperationalClassificationAuditEvent({
      identity,
      requestId,
      previousCategory: "real",
      newCategory: "test",
      reason: "test_account",
      note: "Seeded checkout tests",
      changedAt,
    }),
    createdAt: changedAt,
    updatedAt: changedAt,
  };
}

function mockClaimThenComplete(
  event: AdminAuditOutboxEntity,
  capture: (filter: Record<string, unknown>) => void,
): void {
  let call = 0;
  (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (filter) => {
    call += 1;
    if (call === 1) return leanResult(event);
    capture(filter);
    return leanResult({ ...event, status: "completed", completedAt: new Date() });
  };
}

function mockClaimThenRetry(
  event: AdminAuditOutboxEntity,
  capture: (update: OutboxUpdate) => void,
): void {
  let call = 0;
  (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (_filter, update) => {
    call += 1;
    if (call === 1) return leanResult(event);
    capture(update);
    return leanResult({ ...event, status: "pending" });
  };
}

afterEach(() => {
  env.ADMIN_AUDIT_FINGERPRINT_SECRET = originalAuditFingerprintSecret;
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = originalOutboxFindOne;
  (AuditLogModel as unknown as MockableModel).findOne = originalAuditFindOne;
  (AdminAuditOutboxModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalOutboxFindOneAndUpdate;
  (AuditLogModel as unknown as { updateOne: unknown }).updateOne = originalAuditUpdateOne;
});

describe("Admin audit outbox identity", () => {
  it("builds a stable classification event without changing sales review identity", () => {
    const salesInput = {
      reviewRequestId: "22222222-2222-4222-8222-222222222222",
      actorUid: "admin_uid",
      targetId: "VBREVIEW01",
      newStatus: "included" as const,
    };
    const classificationInput = {
      requestId: "11111111-1111-4111-8111-111111111111",
      actorUid: "admin_uid",
      target: "user_operational_classification" as const,
      targetId: "user_test",
      newCategory: "test" as const,
      reason: "test_account" as const,
      note: "Seeded checkout tests",
    };

    const sales = buildAdminSalesReviewAuditIdentity(salesInput);
    const classification = buildAdminOperationalClassificationAuditIdentity(classificationInput);

    assert.equal(sales.eventId, `admin_sales_reviewed:${salesInput.reviewRequestId}`);
    assert.equal(
      classification.eventId,
      "admin_operational_classification_changed:11111111-1111-4111-8111-111111111111",
    );
    assert.notEqual(
      classification.commandFingerprint,
      buildAdminOperationalClassificationAuditIdentity({
        ...classificationInput,
        newCategory: "internal",
        reason: "internal_team",
      }).commandFingerprint,
    );
  });

  it("rejects classification event fields that do not match its HMAC identity", () => {
    const changedAt = new Date("2026-07-13T03:00:00.000Z");
    const input = {
      requestId: "55555555-5555-4555-8555-555555555555",
      actorUid: "admin_uid",
      target: "user_operational_classification" as const,
      targetId: "user_test",
      newCategory: "test" as const,
      reason: "test_account" as const,
      note: "Seeded checkout tests",
    };
    const identity = buildAdminOperationalClassificationAuditIdentity(input);
    const baseEvent = {
      identity,
      requestId: input.requestId,
      previousCategory: "real" as const,
      newCategory: input.newCategory,
      reason: input.reason,
      note: input.note,
      changedAt,
    };

    for (const mismatch of [
      { requestId: "66666666-6666-4666-8666-666666666666" },
      { newCategory: "internal" as const },
      { reason: "automated_qa" as const },
      { note: "Different private note" },
    ]) {
      assert.throws(
        () => buildAdminOperationalClassificationAuditEvent({ ...baseEvent, ...mismatch }),
        (error: unknown) => error instanceof ApiError &&
          error.errorCode === "admin_audit_unavailable" &&
          !error.message.includes("Different private note"),
      );
    }
  });

  it("builds deterministic versioned HMAC identity without persisting the raw note", () => {
    env.ADMIN_AUDIT_FINGERPRINT_SECRET = auditFingerprintFixtureSecret;
    const input = {
      reviewRequestId: "11111111-1111-4111-8111-111111111111",
      actorUid: "admin_uid",
      targetId: "VBREVIEW01",
      newStatus: "excluded" as const,
      exclusionReason: "test" as const,
      reviewNote: "private customer note",
    };
    const first = buildAdminSalesReviewAuditIdentity(input);
    const second = buildAdminSalesReviewAuditIdentity(input);
    const changed = buildAdminSalesReviewAuditIdentity({ ...input, reviewNote: "different private note" });

    assert.equal(first.eventId, "admin_sales_reviewed:11111111-1111-4111-8111-111111111111");
    assert.equal(first.commandFingerprintVersion, "v1");
    assert.equal(first.commandFingerprint, second.commandFingerprint);
    assert.equal(first.commandFingerprint, "164fb1729a14c31a61f9b790e433dde9c9345d3e340ced11047b67183b2e9f06");
    assert.notEqual(first.commandFingerprint, changed.commandFingerprint);
    assert.equal(JSON.stringify(first).includes("private customer note"), false);
    assert.equal(JSON.stringify(first).includes(process.env.ADMIN_AUDIT_FINGERPRINT_SECRET!), false);
  });

  it("fails closed when the runtime HMAC secret is absent or short", () => {
    const input = {
      reviewRequestId: "11111111-1111-4111-8111-111111111111",
      actorUid: "admin_uid",
      targetId: "VBREVIEW01",
      newStatus: "included" as const,
    };

    for (const invalidSecret of ["", "too-short"]) {
      env.ADMIN_AUDIT_FINGERPRINT_SECRET = invalidSecret;
      assert.throws(
        () => buildAdminSalesReviewAuditIdentity(input),
        (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_unavailable",
      );
    }
  });

  it("defines unique event, dispatch, and retention indexes without indexing historical audit rows", () => {
    const outboxIndexes = AdminAuditOutboxModel.schema.indexes();
    assert.ok(outboxIndexes.some(([keys, options]) => keys.eventId === 1 && options.unique === true));
    assert.ok(outboxIndexes.some(([keys]) =>
      keys.status === 1 && keys.availableAt === 1 && keys.lockedUntil === 1,
    ));
    assert.ok(outboxIndexes.some(([keys, options]) =>
      keys.completedAt === 1 && options.expireAfterSeconds === 2_592_000,
    ));
    assert.ok(AuditLogModel.schema.indexes().some(([keys, options]) =>
      keys.eventId === 1 && options.unique === true && options.sparse === true,
    ));
  });

  it("rejects forbidden and unknown classification audit payload fields", async () => {
    const event = createClassificationOutboxFixture();
    for (const forbiddenField of [
      "email",
      "displayName",
      "bankAccount",
      "providerPayload",
      "entitlement",
      "ADMIN_AUDIT_FINGERPRINT_SECRET",
    ]) {
      const document = new AdminAuditOutboxModel({
        ...event,
        payload: { ...event.payload, [forbiddenField]: "private-value" },
      });
      await assert.rejects(document.validate());
    }
    const sales = new AdminAuditOutboxModel({
      ...createOutboxFixture(),
      payload: { ...createOutboxFixture().payload, email: "customer@example.com" },
    });
    await assert.rejects(sales.validate());
  });

  it("rejects classification category/reason mismatches and blank other notes", async () => {
    const event = createClassificationOutboxFixture();
    const mismatch = new AdminAuditOutboxModel({
      ...event,
      payload: { ...event.payload, newCategory: "internal", reason: "test_account" },
    });
    const blankOther = new AdminAuditOutboxModel({
      ...event,
      payload: { ...event.payload, reason: "other", note: "   " },
    });

    await assert.rejects(mismatch.validate());
    await assert.rejects(blankOther.validate());
  });

  it("rejects event-type target and request-id mismatches", async () => {
    const classification = createClassificationOutboxFixture();
    const salesWithClassificationTarget = new AdminAuditOutboxModel({
      ...createOutboxFixture(),
      target: "user_operational_classification",
    });
    const classificationWithSalesRequestId = new AdminAuditOutboxModel({
      ...classification,
      reviewRequestId: "44444444-4444-4444-8444-444444444444",
    });

    await assert.rejects(salesWithClassificationTarget.validate());
    await assert.rejects(classificationWithSalesRequestId.validate());
  });

  it("rejects classification event ids that do not match their request ids", async () => {
    const event = createClassificationOutboxFixture();
    const document = new AdminAuditOutboxModel({
      ...event,
      eventId: "admin_operational_classification_changed:other-request",
    });

    await assert.rejects(document.validate());
  });
});

describe("resolveAdminAuditIdempotency", () => {
  const input = {
    reviewRequestId: "11111111-1111-4111-8111-111111111111",
    actorUid: "admin_uid",
    targetId: "VBREVIEW01",
    newStatus: "included" as const,
  };

  it("matches an outbox-only event", async () => {
    const identity = buildAdminSalesReviewAuditIdentity(input);
    mockIdempotencyRows(identityRow(identity), null);
    assert.equal(await resolveAdminAuditIdempotency(identity), "match");
  });

  it("matches a canonical AuditLog-only event after outbox TTL", async () => {
    const identity = buildAdminSalesReviewAuditIdentity(input);
    mockIdempotencyRows(null, identityRow(identity));
    assert.equal(await resolveAdminAuditIdempotency(identity), "match");
  });

  it("matches when the outbox and canonical AuditLog agree", async () => {
    const identity = buildAdminSalesReviewAuditIdentity(input);
    const row = identityRow(identity);
    mockIdempotencyRows(row, row);
    assert.equal(await resolveAdminAuditIdempotency(identity), "match");
  });

  it("reports a conflict when persisted outbox and AuditLog rows disagree", async () => {
    const identity = buildAdminSalesReviewAuditIdentity(input);
    mockIdempotencyRows(identityRow(identity), { ...identityRow(identity), actorUid: "other_admin" });
    assert.equal(await resolveAdminAuditIdempotency(identity), "conflict");
  });

  it("reports a conflict when only the private review note changes", async () => {
    const original = buildAdminSalesReviewAuditIdentity({ ...input, reviewNote: "private customer note" });
    const changed = buildAdminSalesReviewAuditIdentity({ ...input, reviewNote: "different private note" });
    mockIdempotencyRows(identityRow(original), null);
    assert.equal(await resolveAdminAuditIdempotency(changed), "conflict");
  });

  it("recognizes duplicate eventId key errors only", () => {
    assert.equal(isDuplicateAdminAuditEventIdError({ code: 11000, keyPattern: { eventId: 1 } }), true);
    assert.equal(isDuplicateAdminAuditEventIdError({ code: 11000, keyPattern: { actorUid: 1 } }), false);
  });

  it("uses the common identity conflict contract for classification events", async () => {
    const identity = buildAdminOperationalClassificationAuditIdentity({
      requestId: "33333333-3333-4333-8333-333333333333",
      actorUid: "admin_uid",
      target: "physical_order_operational_classification",
      targetId: "physical_order_test",
      newCategory: "internal",
      reason: "internal_team",
    });
    mockIdempotencyRows(identityRow(identity), null);
    assert.equal(await resolveAdminAuditIdempotency(identity), "match");
    mockIdempotencyRows({ ...identityRow(identity), targetId: "other" }, null);
    assert.equal(await resolveAdminAuditIdempotency(identity), "conflict");
  });
});

describe("admin audit outbox dispatcher", () => {
  it("materializes the classification action from its discriminated event type", async () => {
    const event = createClassificationOutboxFixture();
    let capturedAuditUpdate: AuditLogUpsert | undefined;
    mockClaimThenComplete(event, () => {});
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async (_filter, update) => {
      capturedAuditUpdate = update;
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: "audit-classification" };
    };
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult(createCanonicalAuditFixture(event));

    await dispatchAdminAuditOutboxEvent(event.eventId);

    assert.equal(capturedAuditUpdate?.$setOnInsert.action, "changeAdminOperationalClassification");
    assert.deepEqual(capturedAuditUpdate?.$setOnInsert.payload, event.payload);
  });

  it("claims, upserts one canonical AuditLog, and completes with lease CAS", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-1", attempts: 1 });
    let capturedAuditUpdate: AuditLogUpsert | undefined;
    let capturedCompletionFilter: Record<string, unknown> | undefined;
    mockClaimThenComplete(claimed, (filter) => { capturedCompletionFilter = filter; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async (_filter, update) => {
      capturedAuditUpdate = update;
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: "audit-1" };
    };
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult(createCanonicalAuditFixture(claimed));

    const result = await dispatchAdminAuditOutboxEvent("admin_sales_reviewed:req-1");

    assert.deepEqual(result, { status: "completed", eventId: "admin_sales_reviewed:req-1" });
    assert.equal(capturedAuditUpdate?.$setOnInsert.timestamp.toISOString(), claimed.occurredAt.toISOString());
    assert.equal(capturedAuditUpdate?.$setOnInsert.actorEmail, null);
    assert.equal(capturedCompletionFilter?.leaseToken, "lease-1");
  });

  it("retries with only an allowlisted error code and never raw error text", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-2", attempts: 2 });
    let capturedRetryUpdate: OutboxUpdate | undefined;
    mockClaimThenRetry(claimed, (update) => { capturedRetryUpdate = update; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => {
      throw new Error("customer@example.com private note");
    };

    const result = await dispatchAdminAuditOutboxEvent(claimed.eventId);

    assert.equal(result.status, "retry_scheduled");
    assert.equal(capturedRetryUpdate?.$set?.lastErrorCode, "unknown_safe");
    assert.equal(JSON.stringify(capturedRetryUpdate).includes("customer@example.com"), false);
  });

  it("reclaims an expired processing lease", async () => {
    const expired = createOutboxFixture({
      status: "processing",
      leaseToken: "expired-lease",
      lockedUntil: new Date("2000-01-01T00:00:00.000Z"),
      attempts: 4,
    });
    let claimUpdate: OutboxUpdate | undefined;
    (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (_filter, update) => {
      claimUpdate = update;
      return leanResult(null);
    };

    await dispatchAdminAuditOutboxEvent(expired.eventId);

    assert.notEqual(claimUpdate?.$set?.leaseToken, "expired-lease");
    assert.equal(claimUpdate?.$inc?.attempts, 1);
  });

  it("does not complete through a stale lease token", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-stale", attempts: 1 });
    (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (() => {
      let call = 0;
      return () => {
        call += 1;
        return leanResult(call === 1 ? claimed : null);
      };
    })();
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => ({});
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult(createCanonicalAuditFixture(claimed));

    assert.deepEqual(
      await dispatchAdminAuditOutboxEvent(claimed.eventId),
      { status: "lease_lost", eventId: claimed.eventId },
    );
  });

  it("accepts the canonical row after a duplicate-key upsert race", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-race", attempts: 1 });
    let completionCalls = 0;
    mockClaimThenComplete(claimed, () => { completionCalls += 1; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => {
      throw { code: 11000, keyPattern: { eventId: 1 } };
    };
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult(createCanonicalAuditFixture(claimed));

    assert.deepEqual(
      await dispatchAdminAuditOutboxEvent(claimed.eventId),
      { status: "completed", eventId: claimed.eventId },
    );
    assert.equal(completionCalls, 1);
  });

  it("rejects a mismatched canonical row after a duplicate-key race", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-race-mismatch", attempts: 1 });
    let retryUpdate: OutboxUpdate | undefined;
    mockClaimThenRetry(claimed, (update) => { retryUpdate = update; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => {
      throw { code: 11000, keyPattern: { eventId: 1 } };
    };
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult({
      ...createCanonicalAuditFixture(claimed),
      commandFingerprint: "b".repeat(64),
    });

    assert.equal((await dispatchAdminAuditOutboxEvent(claimed.eventId)).status, "retry_scheduled");
    assert.equal(retryUpdate?.$set?.lastErrorCode, "audit_validation_failed");
  });

  it("accepts a normally matched existing canonical row only after verification", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-existing", attempts: 1 });
    let completionCalls = 0;
    mockClaimThenComplete(claimed, () => { completionCalls += 1; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => ({ matchedCount: 1 });
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult(createCanonicalAuditFixture(claimed));

    assert.deepEqual(
      await dispatchAdminAuditOutboxEvent(claimed.eventId),
      { status: "completed", eventId: claimed.eventId },
    );
    assert.equal(completionCalls, 1);
  });

  it("rejects a mismatched normally matched canonical row", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-existing-mismatch", attempts: 1 });
    let retryUpdate: OutboxUpdate | undefined;
    mockClaimThenRetry(claimed, (update) => { retryUpdate = update; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => ({ matchedCount: 1 });
    (AuditLogModel as unknown as MockableAuditLogModel).findOne = () => leanResult({
      ...createCanonicalAuditFixture(claimed),
      payload: { ...claimed.payload, noteProvided: false },
    });

    assert.equal((await dispatchAdminAuditOutboxEvent(claimed.eventId)).status, "retry_scheduled");
    assert.equal(retryUpdate?.$set?.lastErrorCode, "audit_validation_failed");
  });

  it("caps retry availability at one hour", async () => {
    const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-backoff", attempts: 20 });
    let retryUpdate: OutboxUpdate | undefined;
    mockClaimThenRetry(claimed, (update) => { retryUpdate = update; });
    (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async () => {
      throw new Error("unavailable");
    };
    const beforeDispatch = Date.now();

    await dispatchAdminAuditOutboxEvent(claimed.eventId);

    const availableAt = retryUpdate?.$set?.availableAt as Date;
    assert.ok(availableAt instanceof Date);
    assert.equal(availableAt.getTime() - beforeDispatch, 3_600_000);
  });

  it("keeps pending events outside TTL eligibility", () => {
    const pending = createOutboxFixture();
    const ttlIndexes = AdminAuditOutboxModel.schema.indexes().filter(([, options]) =>
      typeof options.expireAfterSeconds === "number",
    );

    assert.equal("completedAt" in pending, false);
    assert.deepEqual(ttlIndexes.map(([keys]) => keys), [{ completedAt: 1 }]);
  });
});
