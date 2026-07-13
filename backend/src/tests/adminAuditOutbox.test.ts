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
import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import {
  buildAdminSalesReviewAuditIdentity,
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

const originalAuditFingerprintSecret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
const originalOutboxFindOne = (AdminAuditOutboxModel as unknown as MockableModel).findOne;
const originalAuditFindOne = (AuditLogModel as unknown as MockableModel).findOne;

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

function identityRow(identity: ReturnType<typeof buildAdminSalesReviewAuditIdentity>): IdentityRow {
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

afterEach(() => {
  env.ADMIN_AUDIT_FINGERPRINT_SECRET = originalAuditFingerprintSecret;
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = originalOutboxFindOne;
  (AuditLogModel as unknown as MockableModel).findOne = originalAuditFindOne;
});

describe("Admin audit outbox identity", () => {
  it("builds deterministic versioned HMAC identity without persisting the raw note", () => {
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
});
