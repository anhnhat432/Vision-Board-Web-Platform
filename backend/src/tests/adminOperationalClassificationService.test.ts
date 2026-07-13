process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-operational-classification-service-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-operational-classification-service-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import mongoose, { type ClientSession } from "mongoose";

import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { AuditLogModel } from "../models/auditLogModel";
import { UserModel } from "../models/UserModel";
import { ApiError } from "../utils/apiError";
import {
  bulkClassifyAdminUsers,
  classifyAdminUser,
  resolveEffectiveOperationalClassification,
  validateOperationalClassificationInput,
} from "../services/adminOperationalClassificationService";

function hasErrorCode(errorCode: string) {
  return (error: unknown): boolean => error instanceof ApiError && error.errorCode === errorCode;
}

describe("operational classification resolver", () => {
  it("applies non-real user, record, legacy, real user, then default precedence", () => {
    const classifiedAt = new Date("2026-07-13T00:00:00.000Z");

    assert.equal(resolveEffectiveOperationalClassification({}).effectiveCategory, "real");
    assert.equal(
      resolveEffectiveOperationalClassification({ legacySalesReason: "test" }).source,
      "legacy_sales_review",
    );
    assert.deepEqual(
      resolveEffectiveOperationalClassification({
        userClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
        legacySalesReason: "test",
      }),
      {
        effectiveCategory: "test",
        source: "legacy_sales_review",
        reason: "legacy_sales_test",
      },
    );
    assert.deepEqual(
      resolveEffectiveOperationalClassification({
        recordClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
        legacySalesReason: "test",
      }),
      {
        effectiveCategory: "real",
        source: "record",
        reason: "confirmed_real",
        classifiedAt: classifiedAt.toISOString(),
        note: undefined,
      },
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        recordClassification: {
          category: "internal",
          reason: "internal_team",
          classifiedBy: "a",
          classifiedAt,
        },
      }).effectiveCategory,
      "internal",
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        userClassification: {
          category: "test",
          reason: "test_account",
          classifiedBy: "a",
          classifiedAt,
        },
        recordClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
      }).effectiveCategory,
      "test",
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        userClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
      }).source,
      "user",
    );
  });

  it("rejects invalid category and reason pairs with bounded notes", () => {
    assert.throws(
      () => validateOperationalClassificationInput({ category: "unknown", reason: "confirmed_real" }),
      hasErrorCode("invalid_operational_category"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "real", reason: "unknown" }),
      hasErrorCode("invalid_operational_reason"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "real", reason: "test_account" }),
      hasErrorCode("classification_reason_mismatch"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "test", reason: "other", note: "" }),
      hasErrorCode("classification_note_required"),
    );
    assert.throws(
      () =>
        validateOperationalClassificationInput({
          category: "internal",
          reason: "internal_team",
          note: "x".repeat(201),
        }),
      hasErrorCode("classification_note_too_long"),
    );
  });

  it("normalizes an allowed bounded note", () => {
    assert.deepEqual(
      validateOperationalClassificationInput({
        category: "test",
        reason: "other",
        note: "  scripted regression  ",
      }),
      { category: "test", reason: "other", note: "scripted regression" },
    );
  });
});

type MockableModel = { findOne: unknown; create: unknown };

const originalUserFindOne = (UserModel as unknown as MockableModel).findOne;
const originalOutboxFindOne = (AdminAuditOutboxModel as unknown as MockableModel).findOne;
const originalOutboxCreate = (AdminAuditOutboxModel as unknown as MockableModel).create;
const originalAuditFindOne = (AuditLogModel as unknown as MockableModel).findOne;
const originalStartSession = mongoose.startSession;

type TransactionSessionDouble = ClientSession & {
  stage(write: () => void): void;
  stageCompetingOutbox(event: Record<string, unknown>): void;
};

function classificationFixture() {
  const users = new Map<string, {
    firebaseUid: string;
    operationalClassification?: {
      category: "real" | "test" | "internal";
      reason: "confirmed_real" | "test_account" | "internal_team" | "automated_qa" | "other";
      note?: string;
      classifiedBy: string;
      classifiedAt: Date;
    };
  }>([
    ["exists", { firebaseUid: "exists" }],
    ["same", {
      firebaseUid: "same",
      operationalClassification: {
        category: "test",
        reason: "test_account",
        note: "historical checkout tests",
        classifiedBy: "earlier_admin",
        classifiedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    }],
  ]);
  const outboxEvents = new Map<string, Record<string, unknown>>();
  let saves = 0;
  let creates = 0;
  let loadedSession: ClientSession | undefined;
  let savedSession: ClientSession | undefined;
  let outboxSession: ClientSession | undefined;
  let duplicateAfterPersist = false;

  function createSession(options?: { unknownCommit?: boolean }): ClientSession {
    let stagedWrites: Array<() => void> = [];
    let competingOutbox: Record<string, unknown> | undefined;
    let committed = false;
    const session = {
      stage(write: () => void) {
        stagedWrites.push(write);
      },
      stageCompetingOutbox(event: Record<string, unknown>) {
        competingOutbox = structuredClone(event);
      },
      async withTransaction(callback: () => Promise<void>) {
        stagedWrites = [];
        competingOutbox = undefined;
        committed = false;
        try {
          await callback();
          for (const write of stagedWrites) write();
          committed = true;
          if (options?.unknownCommit) {
            throw { hasErrorLabel: (label: string) => label === "UnknownTransactionCommitResult" };
          }
        } catch (error) {
          const raceEvent = competingOutbox as Record<string, unknown> | undefined;
          if (!committed && raceEvent) {
            outboxEvents.set(raceEvent.eventId as string, raceEvent);
          }
          stagedWrites = [];
          throw error;
        }
      },
      async endSession() {},
    } as unknown as TransactionSessionDouble;
    return session;
  }

  function requireTransactionSession(session: ClientSession | undefined): TransactionSessionDouble {
    if (!session || !("stage" in session) || !("stageCompetingOutbox" in session)) {
      throw new Error("Expected a transaction session.");
    }
    return session as TransactionSessionDouble;
  }

  (UserModel as unknown as MockableModel).findOne = (query: { firebaseUid?: string }) => {
    const stored = query.firebaseUid ? users.get(query.firebaseUid) : undefined;
    const lean = async () => stored ? structuredClone(stored) : null;
    if (!stored) return { session: () => null, lean };
    const document = {
      ...structuredClone(stored),
      async save(options?: { session?: ClientSession }) {
        savedSession = options?.session;
        const classification = structuredClone(this.operationalClassification);
        requireTransactionSession(options?.session).stage(() => {
          saves += 1;
          users.set(stored.firebaseUid, {
            firebaseUid: stored.firebaseUid,
            operationalClassification: classification,
          });
        });
      },
    };
    return {
      session(session: ClientSession) {
        loadedSession = session;
        return document;
      },
      lean,
    };
  };
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = (query: { eventId?: string }) => {
    const event = query.eventId ? outboxEvents.get(query.eventId) : undefined;
    const chain = {
      select() { return chain; },
      async lean() { return event ?? null; },
    };
    return chain;
  };
  (AuditLogModel as unknown as MockableModel).findOne = () => {
    const chain = {
      select() { return chain; },
      async lean() { return null; },
    };
    return chain;
  };
  (AdminAuditOutboxModel as unknown as MockableModel).create = async (
    events: Array<Record<string, unknown>>,
    options?: { session?: ClientSession },
  ) => {
    outboxSession = options?.session;
    const event = structuredClone(events[0]);
    const session = requireTransactionSession(options?.session);
    if (duplicateAfterPersist) {
      session.stageCompetingOutbox(event);
      throw { code: 11000, keyPattern: { eventId: 1 } };
    }
    session.stage(() => {
      creates += 1;
      outboxEvents.set(event.eventId as string, event);
    });
    return events;
  };

  return {
    users,
    outboxEvents,
    createSession,
    get saves() { return saves; },
    get creates() { return creates; },
    get loadedSession() { return loadedSession; },
    get savedSession() { return savedSession; },
    get outboxSession() { return outboxSession; },
    setDuplicateAfterPersist() { duplicateAfterPersist = true; },
  };
}

afterEach(() => {
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = originalOutboxFindOne;
  (AdminAuditOutboxModel as unknown as MockableModel).create = originalOutboxCreate;
  (AuditLogModel as unknown as MockableModel).findOne = originalAuditFindOne;
  (mongoose as unknown as { startSession: unknown }).startSession = originalStartSession;
});

describe("transactional admin user classification", () => {
  it("commits a changed user and one durable audit intent in the same transaction", async () => {
    const fixture = classificationFixture();
    let capturedSession: ClientSession | undefined;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => {
      capturedSession = fixture.createSession();
      return capturedSession;
    };

    const result = await classifyAdminUser({
      actorUid: " admin_uid ", userUid: " exists ",
      requestId: "11111111-1111-4111-8111-111111111111",
      category: "test", reason: "test_account", note: " historical checkout tests ",
    });

    assert.equal(result.status, "updated");
    assert.equal(result.classification.effectiveCategory, "test");
    assert.equal(fixture.users.get("exists")?.operationalClassification?.classifiedBy, "admin_uid");
    assert.equal(fixture.outboxEvents.size, 1);
    assert.ok(capturedSession);
    assert.equal(fixture.loadedSession, capturedSession);
    assert.equal(fixture.savedSession, capturedSession);
    assert.equal(fixture.outboxSession, capturedSession);
  });

  it("persists an idempotency intent without saving an exact same classification", async () => {
    const fixture = classificationFixture();
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession();

    const result = await classifyAdminUser({
      actorUid: "admin_uid", userUid: "same",
      requestId: "22222222-2222-4222-8222-222222222222",
      category: "test", reason: "test_account", note: "  historical checkout tests  ",
    });

    assert.equal(result.status, "unchanged");
    assert.equal(fixture.saves, 0);
    assert.equal(fixture.creates, 1);
  });

  it("replays a request without a second mutation and rejects conflicting reuse", async () => {
    const fixture = classificationFixture();
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession();
    const requestId = "33333333-3333-4333-8333-333333333333";
    const input = { actorUid: "admin_uid", userUid: "exists", requestId, category: "internal" as const, reason: "internal_team" as const };

    assert.equal((await classifyAdminUser(input)).status, "updated");
    assert.equal((await classifyAdminUser(input)).status, "unchanged");
    assert.equal(fixture.saves, 1);
    await assert.rejects(
      classifyAdminUser({ ...input, category: "test", reason: "test_account" }),
      hasErrorCode("admin_classification_request_conflict"),
    );
  });

  it("resolves a duplicate-event race from the durable identity without a second mutation", async () => {
    const fixture = classificationFixture();
    fixture.setDuplicateAfterPersist();
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession();
    const input = {
      actorUid: "admin_uid", userUid: "exists", requestId: "77777777-7777-4777-8777-777777777777",
      category: "test" as const, reason: "test_account" as const,
    };

    assert.equal((await classifyAdminUser(input)).status, "unchanged");
    assert.equal(fixture.outboxEvents.size, 1);
    assert.equal(fixture.users.get("exists")?.operationalClassification, undefined);
    assert.equal(fixture.saves, 0);
    assert.equal((await classifyAdminUser(input)).status, "unchanged");
    assert.equal(fixture.saves, 0);
  });

  it("updates when the same category has a different reason or normalized note", async () => {
    const fixture = classificationFixture();
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession();

    assert.equal((await classifyAdminUser({
      actorUid: "admin_uid", userUid: "same", requestId: "88888888-8888-4888-8888-888888888888",
      category: "test", reason: "other", note: "new reason",
    })).status, "updated");
    assert.equal((await classifyAdminUser({
      actorUid: "admin_uid", userUid: "same", requestId: "99999999-9999-4999-8999-999999999999",
      category: "test", reason: "other", note: "  changed note  ",
    })).status, "updated");
    assert.equal(fixture.saves, 2);
    assert.equal(fixture.users.get("same")?.operationalClassification?.note, "changed note");
  });

  it("reports an unknown commit and a retry resolves through the persisted audit identity", async () => {
    const fixture = classificationFixture();
    let unknownOnce = true;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession({ unknownCommit: unknownOnce });
    const input = {
      actorUid: "admin_uid", userUid: "exists", requestId: "44444444-4444-4444-8444-444444444444",
      category: "test" as const, reason: "test_account" as const,
    };

    await assert.rejects(classifyAdminUser(input), hasErrorCode("admin_audit_commit_unknown"));
    unknownOnce = false;
    assert.equal((await classifyAdminUser(input)).status, "unchanged");
    assert.equal(fixture.saves, 1);
  });

  it("isolates bulk targets and returns only safe per-target outcomes", async () => {
    const fixture = classificationFixture();
    (mongoose as unknown as { startSession: unknown }).startSession = async () => fixture.createSession();

    const result = await bulkClassifyAdminUsers({
      actorUid: "admin_uid", category: "internal", reason: "internal_team",
      changes: [
        { userUid: "exists", requestId: "55555555-5555-4555-8555-555555555555" },
        { userUid: "missing", requestId: "66666666-6666-4666-8666-666666666666" },
      ],
    });

    assert.deepEqual(result.results.map((item: { status: string }) => item.status), ["updated", "failed"]);
    assert.deepEqual(result.results[1], { userUid: "missing", status: "failed", errorCode: "user_not_found" });
    assert.equal(fixture.users.get("exists")?.operationalClassification?.category, "internal");
  });

  it("rejects invalid whole bulk commands before starting a transaction", async () => {
    const fixture = classificationFixture();
    let transactionStarts = 0;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => {
      transactionStarts += 1;
      return fixture.createSession();
    };
    const validChange = { userUid: "exists", requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
    const cases: Array<{ input: unknown; errorCode: string }> = [
      {
        input: {
          actorUid: "admin_uid", category: "test", reason: "test_account",
          changes: Array.from({ length: 101 }, () => validChange),
        },
        errorCode: "invalid_classification_targets",
      },
      {
        input: {
          actorUid: "admin_uid", category: "test", reason: "test_account",
          changes: [validChange, { userUid: " exists ", requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
        },
        errorCode: "invalid_classification_target",
      },
      {
        input: {
          actorUid: "admin_uid", category: "test", reason: "test_account",
          changes: [validChange, { userUid: "same", requestId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }],
        },
        errorCode: "invalid_classification_target",
      },
      {
        input: {
          actorUid: "admin_uid", category: "real", reason: "test_account", changes: [validChange],
        },
        errorCode: "classification_reason_mismatch",
      },
    ];

    for (const testCase of cases) {
      await assert.rejects(
        bulkClassifyAdminUsers(testCase.input as never),
        hasErrorCode(testCase.errorCode),
      );
    }
    assert.equal(transactionStarts, 0);
  });
});
