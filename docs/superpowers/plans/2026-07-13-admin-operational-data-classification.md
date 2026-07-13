# Admin Operational Data Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Admin-managed `real` / `test` / `internal` classification system that removes historical test activity from operational KPIs and Admin lists without deleting records or changing billing, payment, entitlement, refund, or fulfillment state.

**Architecture:** Persist one optional classification subdocument on users, payment orders, and physical orders; subscriptions inherit from users. A shared backend resolver owns precedence and Mongo query stages, classification mutations commit with durable Admin audit intents, and every Admin surface consumes server-computed effective classification rather than recreating the rules in React.

**Tech Stack:** Node.js 20, TypeScript, Express, Mongoose/MongoDB transactions, React 18, Vite, React Router, Radix AlertDialog, Vitest/Testing Library, Node `node:test`, Biome.

## Global Constraints

- Missing `operationalClassification` means `real`; no destructive backfill is required.
- Categories are exactly `real`, `test`, and `internal`.
- Category/reason pairs are fixed: `real` + `confirmed_real`; `test` + `test_account|automated_qa|other`; `internal` + `internal_team|other`.
- Notes are trimmed to 200 characters; `other` requires a non-empty note.
- User classification overrides record classification; a direct record `real` value suppresses legacy sales fallback but cannot override a test/internal user.
- `BillingSubscription` receives no classification field and always derives effective classification from its linked user.
- Classification changes reporting only. Never change user role, payment status, provider payload, subscription status, entitlement, refund, or physical-order fulfillment.
- All read/write endpoints require Admin authorization. Successful classification writes own their durable audit event and must not emit a duplicate route-wrapper success log.
- Failed route-wrapper audit entries must use a classification-specific allowlist (`category`, `reason`, target count/id, safe error outcome) and must never copy `note`, user email/name, bank data, or provider payloads from `req.body`.
- Reuse `ADMIN_AUDIT_FINGERPRINT_SECRET`; do not add or expose another secret.
- Bulk user changes contain at most 100 explicit targets and return per-target results.
- Paginated payment/order APIs must apply search, status, date, frame, and operational filters on the server before pagination; page-local filtering must not replace the existing whole-result behavior.
- Do not add a dependency. Do not change localStorage or customer workspace schemas.
- Keep `docs/superpowers/specs/2026-07-13-admin-operational-data-classification-design.md` as the contract source.

## Spec Coverage Map

| Requirement | Implemented and verified in |
| --- | --- |
| 1 | Task 1 category type/schema; Tasks 3-4 request validation |
| 2 | Task 1 default resolver; Task 5 query builders; Tasks 5-7 backward-compatibility tests |
| 3 | Task 1 separate field; Task 5 raw Admin-role count and explicit classification tests |
| 4 | Tasks 5-7 user-precedence aggregations and overview/list/sales tests |
| 5 | Tasks 4-7 direct-record fallback/restoration tests; Tasks 9-11 UI reload tests |
| 6 | Tasks 1 and 5 subscription inheritance; Task 11 has no subscription mutation |
| 7 | Tasks 1 and 4 persisted payment/order overrides and orphan tests |
| 8 | Tasks 1 and 5 shared precedence resolver/projection; Tasks 6-7 integration tests |
| 9 | Tasks 1, 4, 5, and 7 direct-`real` suppression tests |
| 10 | Tasks 1 and 5 privacy-safe summary; Tasks 6-8 typed serialization |
| 11 | Task 5 real-only user count |
| 12 | Task 5 raw informational `adminUsers` regression test; Task 11 presentation |
| 13 | Task 5 effective active/non-expired Plus aggregation |
| 14 | Task 5 effective payment counts/revenue with preserved status/currency/purpose/date filters |
| 15 | Tasks 5-6 effective physical-order count/list |
| 16 | Task 5 real-only recent users/payments |
| 17 | Task 5 excluded-user grouping; Task 11 separate Test/Internal links |
| 18 | Tasks 3-5 live query recalculation; Task 12 manual proof |
| 19 | Tasks 5, 8, and 9 four-state user filter with real default |
| 20 | Tasks 5-6, 8, 10, and 11 three-state scope filters with real default |
| 21 | Tasks 6-8 and 10-11 effective badge/source rendering |
| 22 | Tasks 8-9 cascade confirmation AlertDialog |
| 23 | Tasks 1, 3, and 8 bounded reason/note validation and warning copy |
| 24 | Tasks 3 and 9 explicit selection capped at 100 |
| 25 | Tasks 3 and 9 independent results and accessible partial-failure output |
| 26 | Tasks 4, 6, 8, and 10 orphan-safe direct payment/order actions |
| 27 | Tasks 8-10 no-optimism and stable retry request ids |
| 28 | Tasks 3-6 route authorization/privacy tests |
| 29 | Tasks 5 and 7 separate operational and formal KPI pipelines |
| 30 | Task 5 operational completed-payment tests independent of stored review status |
| 31 | Task 7 qualifying + stored-included + effective-real tests |
| 32 | Task 7 transaction/user/revenue/refund summary tests |
| 33 | Task 7 restoration test without stored review rewrite |
| 34 | Tasks 1, 5-7 legacy test/internal fallback tests |
| 35 | Tasks 7, 8, and 11 excluded-view stored-vs-effective presentation |
| 36 | Tasks 2-4 HMAC identity/idempotency tests and Tasks 9-10 stable client ids |
| 37 | Tasks 2-4 same-session target/outbox tests |
| 38 | Tasks 3-4 audit-outage rollback tests |
| 39 | Task 2 discriminated outbox compatibility tests |
| 40 | Task 2 allowlisted classification event and forbidden-field tests |
| 41 | Task 2 shared `requireAdminAuditFingerprintSecret()` extraction and secret tests |
| 42 | Tasks 3 and 9 one transaction/result per bulk target |
| 43 | Tasks 2-4 fingerprint conflict tests |

---

### Task 1: Persisted Classification Contract and Pure Precedence Resolver

**Files:**
- Create: `backend/src/models/OperationalClassification.ts`
- Create: `backend/src/services/adminOperationalClassificationService.ts`
- Modify: `backend/src/models/UserModel.ts:1-72`
- Modify: `backend/src/models/PaymentOrderModel.ts:24-100,102-305`
- Modify: `backend/src/models/OrderModel.ts:60-173`
- Test: `backend/src/tests/adminOperationalClassificationModel.test.ts`
- Test: `backend/src/tests/adminOperationalClassificationService.test.ts`

**Interfaces:**
- Consumes: existing `PaymentOrderReporting.exclusionReason` values `test|internal_team`.
- Produces:
  - `OperationalCategory`, `OperationalClassificationReason`, `OperationalClassification`, `OperationalClassificationSource`.
  - `operationalClassificationSchema`.
  - `validateOperationalClassificationInput(input)`.
  - `resolveEffectiveOperationalClassification(input): AdminOperationalClassificationSummary`.

- [ ] **Step 1: Write failing schema and resolver tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import {
  resolveEffectiveOperationalClassification,
  validateOperationalClassificationInput,
} from "../services/adminOperationalClassificationService";

describe("operational classification contract", () => {
  it("keeps legacy documents valid and registers classification indexes", () => {
    assert.equal(new UserModel({ firebaseUid: "u1", email: "u1@example.test", displayName: "U1" }).validateSync(), undefined);
    assert.equal(UserModel.schema.indexes().some(([fields]) => fields["operationalClassification.category"] === 1), true);
    assert.equal(PaymentOrderModel.schema.indexes().some(([fields]) => fields["operationalClassification.category"] === 1), true);
    assert.equal(OrderModel.schema.indexes().some(([fields]) => fields["operationalClassification.category"] === 1), true);
  });

  it("applies user, record, legacy, then default precedence", () => {
    assert.equal(resolveEffectiveOperationalClassification({}).effectiveCategory, "real");
    assert.equal(resolveEffectiveOperationalClassification({ legacySalesReason: "test" }).source, "legacy_sales_review");
    assert.equal(resolveEffectiveOperationalClassification({ recordClassification: { category: "internal", reason: "internal_team", classifiedBy: "a", classifiedAt: new Date() } }).effectiveCategory, "internal");
    assert.equal(resolveEffectiveOperationalClassification({ userClassification: { category: "test", reason: "test_account", classifiedBy: "a", classifiedAt: new Date() }, recordClassification: { category: "real", reason: "confirmed_real", classifiedBy: "a", classifiedAt: new Date() } }).effectiveCategory, "test");
    assert.equal(resolveEffectiveOperationalClassification({ userClassification: { category: "real", reason: "confirmed_real", classifiedBy: "a", classifiedAt: new Date() } }).source, "user");
  });

  it("rejects invalid category/reason pairs and long notes", () => {
    assert.throws(() => validateOperationalClassificationInput({ category: "real", reason: "test_account" }), /classification_reason_mismatch/);
    assert.throws(() => validateOperationalClassificationInput({ category: "test", reason: "other", note: "" }), /classification_note_required/);
    assert.throws(() => validateOperationalClassificationInput({ category: "internal", reason: "internal_team", note: "x".repeat(201) }), /classification_note_too_long/);
    const invalidDocument = new UserModel({
      firebaseUid: "u2",
      email: "u2@example.test",
      displayName: "U2",
      operationalClassification: {
        category: "real",
        reason: "test_account",
        classifiedBy: "admin_uid",
        classifiedAt: new Date(),
      },
    });
    assert.match(invalidDocument.validateSync()?.message ?? "", /classification reason/i);
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm the new modules are missing**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationModel.test.js backend/dist/tests/adminOperationalClassificationService.test.js`

Expected: FAIL because `OperationalClassification.ts` and `adminOperationalClassificationService.ts` do not exist.

- [ ] **Step 3: Add the shared schema and exact domain types**

```ts
// backend/src/models/OperationalClassification.ts
import { Schema } from "mongoose";

export type OperationalCategory = "real" | "test" | "internal";
export type OperationalClassificationReason =
  | "confirmed_real"
  | "test_account"
  | "internal_team"
  | "automated_qa"
  | "other";
export type OperationalClassificationSource = "default" | "user" | "record" | "legacy_sales_review";

export interface OperationalClassification {
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  classifiedBy: string;
  classifiedAt: Date;
}

export interface AdminOperationalClassificationSummary {
  effectiveCategory: OperationalCategory;
  source: OperationalClassificationSource;
  reason?: OperationalClassificationReason | "legacy_sales_test" | "legacy_sales_internal";
  note?: string;
  classifiedAt?: string;
}

export const OPERATIONAL_REASONS_BY_CATEGORY: Record<OperationalCategory, readonly OperationalClassificationReason[]> = {
  real: ["confirmed_real"],
  test: ["test_account", "automated_qa", "other"],
  internal: ["internal_team", "other"],
};

export function isOperationalClassificationReasonAllowed(
  category: OperationalCategory,
  reason: OperationalClassificationReason,
): boolean {
  return OPERATIONAL_REASONS_BY_CATEGORY[category].includes(reason);
}

export const operationalClassificationSchema = new Schema<OperationalClassification>({
  category: { type: String, required: true, enum: ["real", "test", "internal"] },
  reason: { type: String, required: true, enum: ["confirmed_real", "test_account", "internal_team", "automated_qa", "other"] },
  note: { type: String, required: false, trim: true, maxlength: 200 },
  classifiedBy: { type: String, required: true, trim: true, maxlength: 128 },
  classifiedAt: { type: Date, required: true },
}, { _id: false, strict: "throw" });

operationalClassificationSchema.path("reason").validate(function validateCategoryReason(reason) {
  return isOperationalClassificationReasonAllowed(this.category, reason);
}, "Operational classification reason does not match category.");
```

Add `operationalClassification: { type: operationalClassificationSchema, required: false, default: undefined }` to all three models. Extend `UserDocument` and `PaymentOrderEntity`; keep the customer-facing repository `OrderEntity` unchanged and introduce its Admin-only extension in Task 6. Add the three exact compound indexes from the spec.

- [ ] **Step 4: Implement validation and precedence without database access**

```ts
export function validateOperationalClassificationInput(input: {
  category: unknown;
  reason: unknown;
  note?: unknown;
}): { category: OperationalCategory; reason: OperationalClassificationReason; note?: string } {
  if (input.category !== "real" && input.category !== "test" && input.category !== "internal") {
    throw new ApiError(400, "Classification category is invalid.", undefined, "invalid_operational_category");
  }
  if (typeof input.reason !== "string" || !["confirmed_real", "test_account", "internal_team", "automated_qa", "other"].includes(input.reason)) {
    throw new ApiError(400, "Classification reason is invalid.", undefined, "invalid_operational_reason");
  }
  if (input.note != null && typeof input.note !== "string") {
    throw new ApiError(400, "Classification note must be a string.", undefined, "invalid_operational_note");
  }
  const category = input.category;
  const reason = input.reason as OperationalClassificationReason;
  const note = typeof input.note === "string" ? input.note.trim() || undefined : undefined;
  if (!isOperationalClassificationReasonAllowed(category, reason)) {
    throw new ApiError(400, "Classification reason does not match category.", undefined, "classification_reason_mismatch");
  }
  if (reason === "other" && !note) throw new ApiError(400, "Classification note is required.", undefined, "classification_note_required");
  if (note && note.length > 200) throw new ApiError(400, "Classification note is too long.", undefined, "classification_note_too_long");
  return { category, reason, note };
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
  if (input.legacySalesReason === "test") return { effectiveCategory: "test", source: "legacy_sales_review", reason: "legacy_sales_test" };
  if (input.legacySalesReason === "internal_team") return { effectiveCategory: "internal", source: "legacy_sales_review", reason: "legacy_sales_internal" };
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
```

- [ ] **Step 5: Run typecheck, build, and the two focused tests**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationModel.test.js backend/dist/tests/adminOperationalClassificationService.test.js`

Expected: PASS with all classification model and precedence tests green.

- [ ] **Step 6: Commit the contract**

```bash
git add backend/src/models/OperationalClassification.ts backend/src/models/UserModel.ts backend/src/models/PaymentOrderModel.ts backend/src/models/OrderModel.ts backend/src/services/adminOperationalClassificationService.ts backend/src/tests/adminOperationalClassificationModel.test.ts backend/src/tests/adminOperationalClassificationService.test.ts
git commit -m "feat(admin): add operational classification contract"
```

### Task 2: Generalize the Durable Admin Audit Outbox

**Files:**
- Modify: `backend/src/models/AdminAuditOutboxModel.ts:3-88`
- Modify: `backend/src/services/adminAuditOutboxService.ts:17-180`
- Modify: `backend/src/tests/adminAuditOutbox.test.ts`
- Modify: `backend/src/tests/auditLog.test.ts`

**Interfaces:**
- Consumes: Task 1 `OperationalCategory` and `OperationalClassificationReason`.
- Produces:
  - shared `AdminAuditIdentity` accepted by `resolveAdminAuditIdempotency(identity)`.
  - `AdminOperationalClassificationAuditIdentityInput` and `AdminOperationalClassificationAuditIdentity`.
  - `AdminOperationalClassificationAuditPayload`.
  - `buildAdminOperationalClassificationAuditIdentity(input)`.
  - `buildAdminOperationalClassificationAuditEvent(input)`.
  - Event-to-action mapping for `admin_sales_reviewed` and `admin_operational_classification_changed`.

- [ ] **Step 1: Add failing compatibility and classification-event tests**

```ts
it("builds a stable classification event without changing sales review identity", () => {
  const sales = buildAdminSalesReviewAuditIdentity(salesInput);
  const classificationInput = {
    requestId: "11111111-1111-4111-8111-111111111111",
    actorUid: "admin_uid",
    target: "user_operational_classification" as const,
    targetId: "user_test",
    newCategory: "test" as const,
    reason: "test_account" as const,
    note: "Seeded checkout tests",
  };
  const classification = buildAdminOperationalClassificationAuditIdentity(classificationInput);
  assert.equal(sales.eventId, `admin_sales_reviewed:${salesInput.reviewRequestId}`);
  assert.equal(classification.eventId, "admin_operational_classification_changed:11111111-1111-4111-8111-111111111111");
  assert.notEqual(classification.commandFingerprint, buildAdminOperationalClassificationAuditIdentity({ ...classificationInput, newCategory: "internal", reason: "internal_team" }).commandFingerprint);
});

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
```

Update `identityRow()` to accept `AdminAuditIdentity`, and update `createCanonicalAuditFixture()` to derive `action` through the same event-type mapping used by production code. Add a forbidden-field assertion covering `email`, `displayName`, `bankAccount`, `providerPayload`, `entitlement`, and `ADMIN_AUDIT_FINGERPRINT_SECRET`.

- [ ] **Step 2: Run the audit tests and verify the new event type fails**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/auditLog.test.js`

Expected: FAIL because the outbox schema and dispatcher accept only `admin_sales_reviewed`.

- [ ] **Step 3: Convert the model to a discriminated event union with legacy compatibility**

```ts
export interface AdminOperationalClassificationAuditPayload {
  previousCategory: OperationalCategory;
  newCategory: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changedAt: string;
}

export type AdminOperationalClassificationAuditTarget =
  | "user_operational_classification"
  | "payment_order_operational_classification"
  | "physical_order_operational_classification";

export interface AdminAuditIdentity {
  eventId: string;
  actorUid: string;
  target: "payment_order_sales_reporting" | AdminOperationalClassificationAuditTarget;
  targetId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
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

interface AdminAuditOutboxCommon {
  eventId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
  actorUid: string;
  targetId: string;
  occurredAt: Date;
  status: "pending" | "processing" | "completed";
  attempts: number;
  availableAt: Date;
  leaseToken?: string | null;
  lockedUntil?: Date | null;
  lastErrorCode?: AdminAuditOutboxErrorCode | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminAuditOutboxEntity = AdminAuditOutboxCommon & (
  | {
      eventType: "admin_sales_reviewed";
      reviewRequestId: string;
      target: "payment_order_sales_reporting";
      payload: AdminSalesReviewAuditPayload;
    }
  | {
      eventType: "admin_operational_classification_changed";
      requestId: string;
      target: "user_operational_classification" | "payment_order_operational_classification" | "physical_order_operational_classification";
      payload: AdminOperationalClassificationAuditPayload;
    }
);
```

Keep `reviewRequestId` conditionally required for existing sales rows and add conditionally required `requestId` for classification rows. Update the schema enums for all four targets and both event types. Select an exact-key payload validator by `eventType`: sales accepts only `previousStatus,newStatus,exclusionReason,noteProvided,reviewedAt`; classification accepts only `previousCategory,newCategory,reason,note,changedAt`, enforces category/reason enums and a trimmed note of at most 200 characters. Reject unknown keys and forbidden customer/provider fields before insert.

Implement the new identity/event builders with the same HMAC canonicalization used by sales reviews:

```ts
export function requireAdminAuditFingerprintSecret(): string {
  const secret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
  }
  return secret;
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
  return {
    ...input.identity,
    requestId: input.requestId,
    eventType: "admin_operational_classification_changed",
    payload: {
      previousCategory: input.previousCategory,
      newCategory: input.newCategory,
      reason: input.reason,
      note: input.note,
      changedAt: input.changedAt.toISOString(),
    },
    occurredAt: input.changedAt,
    status: "pending",
    attempts: 0,
    availableAt: input.changedAt,
  };
}
```

Refactor `buildAdminSalesReviewAuditIdentity()` to call `requireAdminAuditFingerprintSecret()` and make `AdminSalesReviewAuditIdentity extends AdminAuditIdentity`; do not change its canonical JSON fields, `eventId`, or fingerprint output.

- [ ] **Step 4: Generalize identity matching and canonical audit materialization**

```ts
function getAuditAction(event: AdminAuditOutboxEntity): string {
  return event.eventType === "admin_sales_reviewed"
    ? "reviewAdminSalesOrder"
    : "changeAdminOperationalClassification";
}

function canonicalAuditMatches(event: AdminAuditOutboxEntity, audit: AuditLogEntity): boolean {
  return audit.eventId === event.eventId
    && audit.actorUid === event.actorUid
    && audit.target === event.target
    && audit.targetId === event.targetId
    && audit.commandFingerprint === event.commandFingerprint
    && audit.commandFingerprintVersion === event.commandFingerprintVersion
    && audit.action === getAuditAction(event)
    && audit.actorEmail == null
    && audit.ip == null
    && audit.userAgent == null
    && audit.success === true
    && audit.timestamp.getTime() === event.occurredAt.getTime()
    && isDeepStrictEqual(audit.payload, event.payload);
}
```

Change `upsertCanonicalAudit()` from hardcoded `action: "reviewAdminSalesOrder"` to `action: getAuditAction(event)` while preserving null actor email/IP/user-agent and the exact event timestamp/payload. Make `resolveAdminAuditIdempotency(identity: AdminAuditIdentity)` consume the common identity shape so both event types reuse the same conflict handling.

- [ ] **Step 5: Run audit compatibility tests**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/adminSalesReportService.test.js`

Expected: PASS; existing sales-review audit tests remain unchanged and classification events materialize exactly once.

- [ ] **Step 6: Commit the generalized outbox**

```bash
git add backend/src/models/AdminAuditOutboxModel.ts backend/src/services/adminAuditOutboxService.ts backend/src/tests/adminAuditOutbox.test.ts backend/src/tests/auditLog.test.ts
git commit -m "feat(admin): generalize durable audit outbox"
```

### Task 3: Transactional User Classification and Bounded Bulk API

**Files:**
- Modify: `backend/src/services/adminOperationalClassificationService.ts`
- Create: `backend/src/controllers/adminOperationalClassificationController.ts`
- Modify: `backend/src/routes/adminRoutes.ts:166-299`
- Modify: `backend/src/middleware/requestValidation.ts`
- Test: `backend/src/tests/adminOperationalClassificationService.test.ts`
- Create: `backend/src/tests/adminOperationalClassificationRoutes.test.ts`

**Interfaces:**
- Consumes: Task 2 audit identity/event builders.
- Produces:
  - `classifyAdminUser(input)`.
  - `bulkClassifyAdminUsers(input)`.
  - `PATCH /api/admin/users/operational-classification`.

- [ ] **Step 1: Write failing transaction, idempotency, partial-result, and authorization tests**

```ts
it("commits user classification and one audit intent in the same session", async () => {
  const result = await classifyAdminUser({
    actorUid: "admin_uid",
    userUid: "test_uid",
    requestId: "11111111-1111-4111-8111-111111111111",
    category: "test",
    reason: "test_account",
    note: "Historical checkout tests",
  });
  assert.equal(result.classification.effectiveCategory, "test");
  assert.equal(capturedUserUpdate?.session, capturedOutboxInsert?.session);
});

it("returns independent bulk outcomes", async () => {
  const result = await bulkClassifyAdminUsers({
    actorUid: "admin_uid",
    category: "internal",
    reason: "internal_team",
    changes: [
      { userUid: "exists", requestId: "11111111-1111-4111-8111-111111111111" },
      { userUid: "missing", requestId: "22222222-2222-4222-8222-222222222222" },
    ],
  });
  assert.deepEqual(result.results.map((item) => item.status), ["updated", "failed"]);
});
```

Route tests must assert `401/403` for non-Admins, `400` for 101 users or invalid reason pairs, `409` for conflicting request reuse, and `503` leaves the user unchanged when audit persistence fails.
Add an unknown-commit test that returns `admin_audit_commit_unknown`; retrying it must reuse the same request id and resolve through the outbox/audit identity rather than applying another change.
Add a same-state test: an exact category/reason/note match returns `unchanged` and persists only the idempotency/audit intent; changing reason or normalized note with the same category returns `updated`.

- [ ] **Step 2: Run the focused tests and verify missing command functions/routes**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationService.test.js backend/dist/tests/adminOperationalClassificationRoutes.test.js`

Expected: FAIL because transactional command functions and the route do not exist.

- [ ] **Step 3: Implement one fail-closed transaction per user**

```ts
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

interface ValidatedClassificationCommand {
  actorUid: string;
  userUid: string;
  requestId: string;
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changedAt: Date;
}

function validateClassificationCommand(input: ClassifyAdminUserInput): ValidatedClassificationCommand {
  const actorUid = input.actorUid.trim();
  const userUid = input.userUid.trim();
  const requestId = input.requestId.trim().toLowerCase();
  if (!actorUid || !userUid || userUid.length > 128) {
    throw new ApiError(400, "Classification target is invalid.", undefined, "invalid_classification_target");
  }
  if (!UUID_PATTERN.test(requestId)) {
    throw new ApiError(400, "A valid classification request id is required.", undefined, "invalid_classification_request_id");
  }
  const classification = validateOperationalClassificationInput(input);
  return { actorUid, userUid, requestId, ...classification, changedAt: new Date() };
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
  const replay = await resolveAdminAuditIdempotency(identity);
  if (replay === "conflict") throw new ApiError(409, "Classification request conflicts with an earlier command.", undefined, "admin_classification_request_conflict");
  if (replay === "match") return readCurrentUserClassification(command.userUid, "unchanged");

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
      await AdminAuditOutboxModel.create([buildAdminOperationalClassificationAuditEvent({
        identity,
        requestId: command.requestId,
        previousCategory: previous?.category ?? "real",
        newCategory: command.category,
        reason: command.reason,
        note: command.note,
        changedAt: command.changedAt,
      })], { session });
      return {
        status,
        classification: resolveEffectiveOperationalClassification({ userClassification: status === "updated" ? next : previous }),
      };
    });
  } catch (error) {
    if (!isDuplicateAdminAuditEventIdError(error)) throw error;
    const raced = await resolveAdminAuditIdempotency(identity);
    if (raced === "match") return readCurrentUserClassification(command.userUid, "unchanged");
    if (raced === "conflict") {
      throw new ApiError(409, "Classification request conflicts with an earlier command.", undefined, "admin_classification_request_conflict");
    }
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
  }
}
```

Define `ClassifyAdminUserInput`, `ClassifyAdminUserResult`, `buildStoredClassification`, and the transaction wrapper in this task. The wrapper must mirror the existing sales-review transaction policy:

```ts
async function withClassificationTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => { result = await work(session); });
    if (result === undefined) throw new ApiError(503, "Classification commit result is unavailable.", undefined, "admin_audit_commit_unknown");
    return result;
  } catch (error) {
    if (hasUnknownCommitResultLabel(error)) {
      throw new ApiError(503, "Classification commit result is unknown. Retry with the same request id.", undefined, "admin_audit_commit_unknown");
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function buildStoredClassification(command: ValidatedClassificationCommand): OperationalClassification {
  return {
    category: command.category,
    reason: command.reason,
    note: command.note,
    classifiedBy: command.actorUid,
    classifiedAt: command.changedAt,
  };
}

function sameStoredClassification(
  current: OperationalClassification | null,
  next: OperationalClassification,
): boolean {
  return current?.category === next.category
    && current.reason === next.reason
    && (current.note ?? undefined) === (next.note ?? undefined);
}

function hasUnknownCommitResultLabel(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === "object"
      && "hasErrorLabel" in error
      && typeof (error as { hasErrorLabel?: unknown }).hasErrorLabel === "function"
      && (error as { hasErrorLabel(label: string): boolean }).hasErrorLabel("UnknownTransactionCommitResult"),
  );
}
```

Define the bounded bulk contract and keep one transaction per loop iteration:

```ts
type AdminClassificationSafeErrorCode =
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

export async function bulkClassifyAdminUsers(input: BulkClassifyAdminUsersInput) {
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
```

`toSafeClassificationErrorCode` allowlists only the union above and maps everything else to `unknown_safe`. Monitoring for mutation/audit/bulk-partial failures may include target type, safe error code, and failed count only; it must omit target ids, UID arrays, notes, request bodies, customer PII, and raw error messages.

- [ ] **Step 4: Add body validation and the Admin route before `/admin/users/:uid`**

```ts
export interface AdminBulkClassifyUsersBody {
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changes: Array<{ userUid: string; requestId: string }>;
}

export function getOperationalClassificationFailureAuditPayload(req: Request): Record<string, unknown> {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
  const changes = Array.isArray(body.changes) ? body.changes : [];
  return {
    category: typeof body.category === "string" ? body.category : null,
    reason: typeof body.reason === "string" ? body.reason : null,
    targetCount: changes.length,
    noteProvided: typeof body.note === "string" && body.note.trim().length > 0,
  };
}

adminRoutes.patch(
  "/admin/users/operational-classification",
  auditedAdminAction({
    action: "changeAdminOperationalClassification",
    target: "user_operational_classification",
    getAuditPayload: getOperationalClassificationFailureAuditPayload,
    validators: [validateAdminBulkOperationalClassificationBody],
    handler: bulkClassifyAdminUsersController,
    logSuccess: false,
  }),
);
```

`validateAdminBulkOperationalClassificationBody` must require a JSON object, validate the category/reason/note through Task 1, require 1-100 unique explicit `{ userUid, requestId }` entries, bound each UID to 128 characters, normalize UUID request ids to lowercase, and replace `req.body` with the normalized allowlisted shape. The controller reads `req.user.uid`, calls `bulkClassifyAdminUsers`, and returns `{ category, results }` with safe per-target codes only.

- [ ] **Step 5: Run service, route, and Admin authorization tests**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationService.test.js backend/dist/tests/adminOperationalClassificationRoutes.test.js backend/dist/tests/requireAdmin.test.js`

Expected: PASS; replay is idempotent, conflict is `409`, audit outage is fail-closed, and mixed bulk outcomes persist independently.

- [ ] **Step 6: Commit user classification**

```bash
git add backend/src/services/adminOperationalClassificationService.ts backend/src/controllers/adminOperationalClassificationController.ts backend/src/routes/adminRoutes.ts backend/src/middleware/requestValidation.ts backend/src/tests/adminOperationalClassificationService.test.ts backend/src/tests/adminOperationalClassificationRoutes.test.ts
git commit -m "feat(admin): classify users with durable audit"
```

### Task 4: Direct Payment and Physical-Order Classification APIs

**Files:**
- Modify: `backend/src/services/adminOperationalClassificationService.ts`
- Modify: `backend/src/controllers/adminOperationalClassificationController.ts`
- Modify: `backend/src/routes/adminRoutes.ts:235-275`
- Modify: `backend/src/routes/orderRoutes.ts:37-62`
- Modify: `backend/src/middleware/requestValidation.ts`
- Test: `backend/src/tests/adminOperationalClassificationService.test.ts`
- Modify: `backend/src/tests/adminOperationalClassificationRoutes.test.ts`
- Modify: `backend/src/tests/orderRoutes.test.ts`

**Interfaces:**
- Consumes: Task 3 command validation and transaction helper.
- Produces:
  - `classifyAdminPaymentOrder(input: ClassifyAdminRecordInput): Promise<ClassifyAdminRecordResult>`.
  - `classifyAdminPhysicalOrder(input: ClassifyAdminRecordInput): Promise<ClassifyAdminRecordResult>`.
  - `PATCH /api/admin/billing/payment-orders/:orderId/operational-classification`.
  - `PATCH /api/admin/orders/:id/operational-classification`.

- [ ] **Step 1: Add failing direct-record tests**

```ts
it("classifies an orphan payment without changing payment state", async () => {
  const before = { status: payment.status, amount: payment.amount, provider: payment.provider };
  const result = await classifyAdminPaymentOrder({
    actorUid: "admin_uid",
    orderId: "VBTEST0001",
    requestId: "11111111-1111-4111-8111-111111111111",
    category: "test",
    reason: "test_account",
  });
  assert.deepEqual({ status: payment.status, amount: payment.amount, provider: payment.provider }, before);
  assert.equal(result.classification.source, "record");
});

it("classifies a physical order without changing fulfillment", async () => {
  const status = physicalOrder.status;
  await classifyAdminPhysicalOrder({ actorUid: "admin_uid", orderId: physicalOrder.id, requestId: "22222222-2222-4222-8222-222222222222", category: "internal", reason: "internal_team" });
  assert.equal(physicalOrder.status, status);
});

it("returns inherited user classification after a direct real write", async () => {
  const result = await classifyAdminPaymentOrder({
    actorUid: "admin_uid",
    orderId: "VBTEST0001",
    requestId: "33333333-3333-4333-8333-333333333333",
    category: "real",
    reason: "confirmed_real",
  });
  assert.equal(result.classification.effectiveCategory, "test");
  assert.equal(result.classification.source, "user");
});

it("lets direct real suppress legacy sales exclusion without rewriting the stored review", async () => {
  payment.reporting = { kpiStatus: "included", exclusionReason: "test" };
  const storedReviewBefore = structuredClone(payment.reporting);
  const result = await classifyAdminPaymentOrder({
    actorUid: "admin_uid",
    orderId: "VBTEST0001",
    requestId: "44444444-4444-4444-8444-444444444444",
    category: "real",
    reason: "confirmed_real",
  });
  assert.deepEqual(payment.reporting, storedReviewBefore);
  assert.equal(result.classification.effectiveCategory, "real");
  assert.equal(result.classification.source, "record");
});
```

- [ ] **Step 2: Run focused tests and verify missing endpoints**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationService.test.js backend/dist/tests/adminOperationalClassificationRoutes.test.js backend/dist/tests/orderRoutes.test.js`

Expected: FAIL because payment/order target adapters and routes do not exist.

- [ ] **Step 3: Reuse one generic target mutation with target-specific lookups**

```ts
export interface ClassifyAdminRecordInput {
  actorUid: string;
  orderId: string;
  requestId: string;
  category: unknown;
  reason: unknown;
  note?: unknown;
}

export interface ClassifyAdminRecordResult {
  status: "updated" | "unchanged";
  classification: AdminOperationalClassificationSummary;
}

type ClassificationTarget =
  | { type: "payment_order"; id: string; auditTarget: "payment_order_operational_classification" }
  | { type: "physical_order"; id: string; auditTarget: "physical_order_operational_classification" };

async function findClassificationTarget(target: ClassificationTarget, session: ClientSession) {
  if (target.type === "payment_order") return PaymentOrderModel.findOne({ orderId: target.id }).session(session);
  return OrderModel.findById(target.id).session(session);
}

export function classifyAdminPaymentOrder(input: ClassifyAdminRecordInput): Promise<ClassifyAdminRecordResult> {
  return classifyAdminRecordTarget(
    { type: "payment_order", id: input.orderId.trim().toUpperCase(), auditTarget: "payment_order_operational_classification" },
    input,
  );
}

export function classifyAdminPhysicalOrder(input: ClassifyAdminRecordInput): Promise<ClassifyAdminRecordResult> {
  return classifyAdminRecordTarget(
    { type: "physical_order", id: input.orderId.trim(), auditTarget: "physical_order_operational_classification" },
    input,
  );
}
```

Implement `classifyAdminRecordTarget(target, input)` as the single generic mutation behind both exported wrappers. It must reuse `withClassificationTransaction`, `sameStoredClassification`, the duplicate-event race recovery from Task 3, and the Task 2 builders. Inside the same session: load the target; load the linked user by `firebaseUid === target.userId`; compare only stored category/reason/normalized note for `updated|unchanged`; update only `operationalClassification`; insert one flattened classification outbox event; and build the response with `resolveEffectiveOperationalClassification({ userClassification, recordClassification, legacySalesReason })`. The audit event's previous/new categories describe the direct persisted target field; the response separately exposes the inherited effective category. On duplicate `eventId`, resolve the shared identity and return the current target only for `match`; return `409` for `conflict`. Preserve all payment, subscription, refund, stored `reporting.kpiStatus`, stored `reporting.exclusionReason`, and fulfillment fields byte-for-byte in tests. A direct `real` write on a test/internal user must still return source `user` and remain excluded; on a real/orphan user it must return source `record`, suppress the legacy sales fallback, and leave the stored sales-review decision untouched.

- [ ] **Step 4: Register the two routes with transactional success-audit ownership**

```ts
adminRoutes.patch(
  "/admin/billing/payment-orders/:orderId/operational-classification",
  auditedAdminAction({
    action: "changeAdminOperationalClassification",
    target: "payment_order_operational_classification",
    getTargetId: (req) => req.params.orderId?.trim().toUpperCase(),
    getAuditPayload: getOperationalClassificationFailureAuditPayload,
    validators: [validateOrderIdParam, validateAdminOperationalClassificationBody],
    handler: classifyAdminPaymentOrderController,
    logSuccess: false,
  }),
);

orderRoutes.patch(
  "/admin/orders/:id/operational-classification",
  auditedAdminAction({
    action: "changeAdminOperationalClassification",
    target: "physical_order_operational_classification",
    getTargetId: (req) => req.params.id,
    getAuditPayload: getOperationalClassificationFailureAuditPayload,
    validators: [validateObjectIdParam("id", "orderId"), validateAdminOperationalClassificationBody],
    handler: classifyAdminPhysicalOrderController,
    logSuccess: false,
  }),
);
```

`validateAdminOperationalClassificationBody` uses Task 1 validation, requires one lowercase UUID `requestId`, and replaces `req.body` with only `{ category, reason, note?, requestId }`. Export `getOperationalClassificationFailureAuditPayload` from `adminRoutes.ts` for `orderRoutes.ts`; it must expose only category/reason/note-presence metadata, never the note itself.

- [ ] **Step 5: Run direct classification and route suites**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationService.test.js backend/dist/tests/adminOperationalClassificationRoutes.test.js backend/dist/tests/orderRoutes.test.js backend/dist/tests/auditLog.test.js`

Expected: PASS; both endpoints are Admin-only, audited once, idempotent, and state-preserving.

- [ ] **Step 6: Commit direct record classification**

```bash
git add backend/src/services/adminOperationalClassificationService.ts backend/src/controllers/adminOperationalClassificationController.ts backend/src/routes/adminRoutes.ts backend/src/routes/orderRoutes.ts backend/src/middleware/requestValidation.ts backend/src/tests/adminOperationalClassificationService.test.ts backend/src/tests/adminOperationalClassificationRoutes.test.ts backend/src/tests/orderRoutes.test.ts
git commit -m "feat(admin): classify payment and print records"
```

### Task 5: Canonical Mongo Query Stages and Real-Only Overview

**Files:**
- Create: `backend/src/services/adminOperationalClassificationQuery.ts`
- Modify: `backend/src/controllers/adminController.ts:144-393,709-819,1132-1191`
- Test: `backend/src/tests/adminOperationalClassificationQuery.test.ts`
- Create: `backend/src/tests/adminOverviewOperationalClassification.test.ts`
- Modify: `backend/src/tests/adminController.test.ts`

**Interfaces:**
- Consumes: Task 1 resolver and persisted fields.
- Produces:
  - `parseOperationalCategoryQuery(value)` and `parseOperationalScopeQuery(value)`.
  - `buildUserOperationalCategoryFilter(category)`.
  - `buildEffectiveOperationalClassificationStages(options)`.
  - `buildOperationalScopeMatch(scope)`.
  - `asOptionalStage(stage)` and `serializeProjectedOperationalClassification(row)`.
  - real-only Admin overview and filtered user/subscription endpoints.

- [ ] **Step 1: Write failing query-builder and overview tests**

```ts
it("normalizes missing user classification to real", () => {
  assert.deepEqual(buildUserOperationalCategoryFilter("real"), {
    $or: [
      { operationalClassification: { $exists: false } },
      { operationalClassification: null },
      { "operationalClassification.category": "real" },
    ],
  });
});

it("filters linked subscriptions by effective user category", async () => {
  const response = await getOverviewFixture({
    users: [realUser, testUser],
    subscriptions: [realSubscription, testSubscription, orphanSubscription],
  });
  assert.equal(response.summary.activePlusSubscriptions, 1);
  assert.deepEqual(response.summary.excludedUsers, { test: 1, internal: 0 });
});

it("rejects invalid operational filters instead of silently widening results", () => {
  assert.throws(() => parseOperationalCategoryQuery("typo"), /invalid_operational_category/);
  assert.throws(() => parseOperationalScopeQuery("typo"), /invalid_operational_scope/);
});

it("lets a direct real record suppress a legacy exclusion", async () => {
  const [row] = await runClassificationPipeline({ recordCategory: "real", legacySalesReason: "test" });
  assert.equal(row.__effectiveOperationalCategory, "real");
  assert.equal(row.__effectiveOperationalSource, "record");
});
```

Cover all overview cards, recent users/payments, subscription expiry, revenue total/30-day, and the rule that `adminUsers` remains a separate raw informational count. Do not automatically subtract `role === "admin"` from `totalUsers`: requirement 3 requires an explicit `internal` classification rather than role-based guessing; the UI must not add or present `adminUsers` as an extra customer total.

- [ ] **Step 2: Run focused tests and verify raw counts still fail**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationQuery.test.js backend/dist/tests/adminOverviewOperationalClassification.test.js backend/dist/tests/adminController.test.js`

Expected: FAIL because `getAdminOverview`, users, and subscriptions still use raw queries.

- [ ] **Step 3: Implement reusable lookup/projection stages**

```ts
export type OperationalScope = "real" | "excluded" | "all";

export function parseOperationalCategoryQuery(value: unknown): OperationalCategory | "all" {
  if (value == null || value === "") return "real";
  if (value === "real" || value === "test" || value === "internal" || value === "all") return value;
  throw new ApiError(400, "Operational category is invalid.", undefined, "invalid_operational_category");
}

export function parseOperationalScopeQuery(value: unknown): OperationalScope {
  if (value == null || value === "") return "real";
  if (value === "real" || value === "excluded" || value === "all") return value;
  throw new ApiError(400, "Operational scope is invalid.", undefined, "invalid_operational_scope");
}

export function buildUserOperationalCategoryFilter(category: OperationalCategory | "all"): FilterQuery<UserDocument> {
  if (category === "all") return {};
  if (category === "real") {
    return { $or: [
      { operationalClassification: { $exists: false } },
      { operationalClassification: null },
      { "operationalClassification.category": "real" },
    ] };
  }
  return { "operationalClassification.category": category };
}

function buildEffectiveClassificationProjection(options: {
  recordClassificationField?: string;
  legacySalesReasonField?: string;
}): Record<string, unknown> {
  const userClassification = "$__operationalUser.operationalClassification";
  const userCategory = { $ifNull: ["$__operationalUser.operationalClassification.category", "real"] };
  const hasUserClassification = { $ne: [{ $ifNull: [userClassification, null] }, null] };
  const userExcluded = { $in: [userCategory, ["test", "internal"]] };
  const record = options.recordClassificationField ? `$${options.recordClassificationField}` : null;
  const recordCategory = options.recordClassificationField ? `$${options.recordClassificationField}.category` : null;
  const recordReason = options.recordClassificationField ? `$${options.recordClassificationField}.reason` : null;
  const recordNote = options.recordClassificationField ? `$${options.recordClassificationField}.note` : null;
  const recordClassifiedAt = options.recordClassificationField ? `$${options.recordClassificationField}.classifiedAt` : null;
  const hasRecord = record ? { $ne: [{ $ifNull: [record, null] }, null] } : false;
  const legacyReason = options.legacySalesReasonField ? `$${options.legacySalesReasonField}` : null;
  const hasLegacyTest = legacyReason ? { $eq: [legacyReason, "test"] } : false;
  const hasLegacyInternal = legacyReason ? { $eq: [legacyReason, "internal_team"] } : false;

  return {
    __effectiveOperationalCategory: {
      $cond: [userExcluded, userCategory, {
        $cond: [hasRecord, { $ifNull: [recordCategory, "real"] }, {
          $cond: [hasLegacyTest, "test", { $cond: [hasLegacyInternal, "internal", "real"] }],
        }],
      }],
    },
    __effectiveOperationalSource: {
      $cond: [userExcluded, "user", {
        $cond: [hasRecord, "record", {
          $cond: [
            { $or: [hasLegacyTest, hasLegacyInternal] },
            "legacy_sales_review",
            { $cond: [hasUserClassification, "user", "default"] },
          ],
        }],
      }],
    },
    __effectiveOperationalReason: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.reason", {
        $cond: [hasRecord, recordReason, {
          $cond: [
            hasLegacyTest,
            "legacy_sales_test",
            { $cond: [hasLegacyInternal, "legacy_sales_internal", { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.reason", null] }] },
          ],
        }],
      }],
    },
    __effectiveOperationalNote: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.note", {
        $cond: [hasRecord, recordNote, {
          $cond: [{ $or: [hasLegacyTest, hasLegacyInternal] }, null, { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.note", null] }],
        }],
      }],
    },
    __effectiveOperationalClassifiedAt: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.classifiedAt", {
        $cond: [hasRecord, recordClassifiedAt, {
          $cond: [{ $or: [hasLegacyTest, hasLegacyInternal] }, null, { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.classifiedAt", null] }],
        }],
      }],
    },
  };
}

export function buildEffectiveOperationalClassificationStages(options: {
  userIdField: string;
  recordClassificationField?: string;
  legacySalesReasonField?: string;
  requireLinkedUser?: boolean;
}): PipelineStage[] {
  return [
    { $lookup: { from: UserModel.collection.name, localField: options.userIdField, foreignField: "firebaseUid", as: "__operationalUsers" } },
    { $set: { __operationalUser: { $first: "$__operationalUsers" } } },
    ...asOptionalStage(options.requireLinkedUser ? { $match: { "__operationalUser._id": { $exists: true } } } : null),
    { $set: buildEffectiveClassificationProjection(options) },
    { $unset: ["__operationalUsers", "__operationalUser"] },
  ];
}

export function asOptionalStage<T extends PipelineStage>(stage: T | null): T[] {
  return stage ? [stage] : [];
}

export function buildOperationalScopeMatch(scope: OperationalScope): PipelineStage.Match | null {
  if (scope === "all") return null;
  return { $match: { __effectiveOperationalCategory: scope === "real" ? "real" : { $in: ["test", "internal"] } } };
}

export function serializeProjectedOperationalClassification(row: Record<string, unknown>): AdminOperationalClassificationSummary {
  return {
    effectiveCategory: row.__effectiveOperationalCategory as OperationalCategory,
    source: row.__effectiveOperationalSource as OperationalClassificationSource,
    ...(typeof row.__effectiveOperationalReason === "string" ? { reason: row.__effectiveOperationalReason as AdminOperationalClassificationSummary["reason"] } : {}),
    ...(typeof row.__effectiveOperationalNote === "string" ? { note: row.__effectiveOperationalNote } : {}),
    ...(row.__effectiveOperationalClassifiedAt instanceof Date ? { classifiedAt: row.__effectiveOperationalClassifiedAt.toISOString() } : {}),
  };
}
```

The projection must encode the exact Task 1 precedence, including direct `real` suppressing legacy fallback.

- [ ] **Step 4: Replace overview raw counts with shared aggregation helpers**

```ts
const [totalUsers, excludedUsers, activePlusSubscriptions, expiringSoonSubscriptions] = await Promise.all([
  UserModel.countDocuments(buildUserOperationalCategoryFilter("real")),
  UserModel.aggregate([
    { $match: { "operationalClassification.category": { $in: ["test", "internal"] } } },
    { $group: { _id: "$operationalClassification.category", count: { $sum: 1 } } },
  ]),
  countEffectiveSubscriptions({
    planCode: "PLUS",
    status: "active",
    $or: [{ currentPeriodEnd: { $exists: false } }, { currentPeriodEnd: null }, { currentPeriodEnd: { $gte: now } }],
  }),
  countEffectiveSubscriptions({ planCode: "PLUS", status: "active", currentPeriodEnd: { $gte: now, $lte: expiringWindowEnd } }),
]);
```

Define `countEffectiveSubscriptions(baseMatch)` as `BillingSubscriptionModel.aggregate([{ $match: baseMatch }, ...buildEffectiveOperationalClassificationStages({ userIdField: "userId", requireLinkedUser: true }), { $match: { __effectiveOperationalCategory: "real" } }, { $count: "total" }])`. An orphan subscription has no effective user and is therefore excluded from user/Plus KPIs and subscription lists; payment/order pipelines keep `requireLinkedUser` false so their documented orphan fallback still works. Use the same effective stages for pending/completed payments, VND revenue total/30-day, physical-order count, and recent payments; use `buildUserOperationalCategoryFilter("real")` for recent users. Preserve every existing payment status, currency, purpose, and date predicate. Never fall back to raw totals if aggregation fails; pass the error to the existing error middleware and capture only a safe monitoring code such as `admin_overview_operational_aggregation_failed`.

- [ ] **Step 5: Add user and subscription filters plus serialized summaries**

```ts
const operationalCategory = parseOperationalCategoryQuery(req.query.operationalCategory);
const userClauses: FilterQuery<UserDocument>[] = [
  buildUserOperationalCategoryFilter(operationalCategory),
  ...(role === "all" ? [] : [{ role }]),
  ...(query ? [{ $or: [
    { firebaseUid: searchRegex },
    { email: searchRegex },
    { displayName: searchRegex },
  ] }] : []),
];
const nonEmptyUserClauses = userClauses.filter((clause) => Object.keys(clause).length > 0);
const filter = nonEmptyUserClauses.length > 0 ? { $and: nonEmptyUserClauses } : {};

const operationalScope = parseOperationalScopeQuery(req.query.operationalScope);
const subscriptionPipeline = [
  { $match: subscriptionFilter },
  ...buildEffectiveOperationalClassificationStages({ userIdField: "userId", requireLinkedUser: true }),
  ...asOptionalStage(buildOperationalScopeMatch(operationalScope)),
  { $facet: { metadata: [{ $count: "total" }], items: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }] } },
];
```

Return `operationalClassification` on users/subscriptions and default both endpoints to real-only. Remove the internal `__effectiveOperational*` fields from every serialized row.
Extend `getAdminUserDetail` as well: serialize the user's classification and subscription inheritance, then resolve each payment/physical-order summary independently with its linked user classification plus that record's direct classification and payment legacy reason. Do not stamp the user summary onto every child row because that would hide direct/legacy exclusions on a real user.

- [ ] **Step 6: Run backend overview, query, and controller tests**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminOperationalClassificationQuery.test.js backend/dist/tests/adminOverviewOperationalClassification.test.js backend/dist/tests/adminController.test.js`

Expected: PASS with correct real-only totals, excluded-user disclosure, recent lists, and user/subscription filters.

- [ ] **Step 7: Commit canonical queries and overview**

```bash
git add backend/src/services/adminOperationalClassificationQuery.ts backend/src/controllers/adminController.ts backend/src/tests/adminOperationalClassificationQuery.test.ts backend/src/tests/adminOverviewOperationalClassification.test.ts backend/src/tests/adminController.test.ts
git commit -m "feat(admin): filter overview and account lists"
```

### Task 6: Paginated Payment and Physical-Order Operational Lists

**Files:**
- Modify: `backend/src/controllers/adminController.ts:207-430`
- Modify: `backend/src/controllers/orderController.ts:62-84`
- Modify: `backend/src/services/orderService.ts:324-362`
- Modify: `backend/src/repositories/mongo/MongoOrderRepository.ts:54-226`
- Modify: `backend/src/routes/orderRoutes.ts:37-62`
- Modify: `backend/src/controllers/accountController.ts:221-250`
- Modify: `backend/src/tests/adminController.test.ts`
- Modify: `backend/src/tests/orderRoutes.test.ts`
- Modify: `backend/src/tests/accountRoutes.test.ts`
- Create: `backend/src/tests/adminOperationalOrderList.test.ts`

**Interfaces:**
- Consumes: Task 5 query stages and `OperationalScope` parser.
- Produces:
  - payment list `operationalScope`, `page`, and effective classification fields;
  - paginated physical-order Admin response whose search/status/frame/date filters run before pagination;
  - physical-order `statusCounts`, `frameOptions`, and bounded full-filter CSV export;
  - customer order responses that do not expose Admin classification metadata.

- [ ] **Step 1: Write failing list, precedence, pagination, and privacy tests**

```ts
it("defaults payment list to real and paginates after effective filtering", async () => {
  const result = await listAdminPaymentFixture({ page: 2, limit: 2, operationalScope: undefined });
  assert.equal(result.operationalScope, "real");
  assert.equal(result.page, 2);
  assert.equal(result.items.every((item) => item.operationalClassification.effectiveCategory === "real"), true);
});

it("returns inherited, record, and legacy sources in the excluded list", async () => {
  const result = await listAdminPaymentFixture({ operationalScope: "excluded" });
  assert.deepEqual(result.items.map((item) => item.operationalClassification.source).sort(), ["legacy_sales_review", "record", "user"]);
});

it("does not serialize Admin classification on customer order endpoints", async () => {
  const response = await getCustomerOrderFixture(testPhysicalOrder);
  assert.equal("operationalClassification" in response, false);
});

it("does not expose Admin classification in customer account export", async () => {
  const exported = await getAccountExportFixture({
    userClassification: testClassification,
    paymentClassification: testClassification,
    physicalOrderClassification: testClassification,
  });
  assert.equal(JSON.stringify(exported).includes("operationalClassification"), false);
  assert.equal(JSON.stringify(exported).includes("classifiedBy"), false);
});

it("filters physical orders before pagination and preserves whole-scope metadata", async () => {
  const result = await listAdminOrderFixture({
    q: "customer@example.com",
    status: "pending",
    frame: "Khung gỗ sáng",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-31",
    operationalScope: "real",
    page: 2,
    limit: 2,
  });
  assert.equal(result.items.every((item) => item.email === "customer@example.com"), true);
  assert.equal(result.total, 5);
  assert.equal(result.statusCounts.pending, 7);
  assert.ok(result.frameOptions.includes("Khung gỗ sáng"));
});

it("rejects an oversized physical-order export instead of returning a partial CSV", async () => {
  await assert.rejects(
    () => exportAdminOrderFixture({ operationalScope: "real", matchingRows: 5001 }),
    (error: unknown) => error instanceof ApiError && error.errorCode === "admin_order_export_too_large",
  );
});
```

- [ ] **Step 2: Run the list suites and verify raw/unbounded behavior fails**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminController.test.js backend/dist/tests/adminOperationalOrderList.test.js backend/dist/tests/orderRoutes.test.js`

Expected: FAIL because payment list has no page/scope and physical Admin list is raw/unbounded.

- [ ] **Step 3: Convert payment listing to one filtered aggregation contract**

```ts
const page = parsePaymentOrderPage(req.query.page);
const limit = parsePaymentOrderLimit(req.query.limit);
const operationalScope = parseOperationalScopeQuery(req.query.operationalScope);
const pipeline = [
  { $match: await buildPaymentOrderFilter(status, query) },
  ...buildEffectiveOperationalClassificationStages({
    userIdField: "userId",
    recordClassificationField: "operationalClassification",
    legacySalesReasonField: "reporting.exclusionReason",
  }),
  ...asOptionalStage(buildOperationalScopeMatch(operationalScope)),
  { $facet: {
    metadata: [{ $count: "total" }],
    items: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
  } },
];
```

`parsePaymentOrderPage` defaults to `1`; `parsePaymentOrderLimit` remains bounded to `1..100`; invalid `page`, `limit`, or `operationalScope` values return `400` rather than silently widening results. Return `page`, `limit`, `total`, `totalPages`, and the effective summary from aggregation fields; do not run frontend precedence logic.

- [ ] **Step 4: Add a separate Admin physical-order mapper and paginated repository query**

```ts
// backend/src/repositories/mongo/MongoOrderRepository.ts
// OrderEntity is the existing exported customer-safe interface declared above in this module.
export interface AdminOrderEntity extends OrderEntity {
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminOrderListInput {
  q: string;
  status: OrderStatus | "all";
  frame: string | "all";
  dateFrom?: Date;
  dateToExclusive?: Date;
  operationalScope: OperationalScope;
  page: number;
  limit: number;
}

export interface AdminOrderListResult {
  items: AdminOrderEntity[];
  total: number;
  statusCounts: Record<OrderStatus | "all", number>;
  frameOptions: string[];
}

async getAdminOrders(input: AdminOrderListInput): Promise<AdminOrderListResult> {
  const rowFilterStages = buildAdminOrderRowFilterStages(input);
  const scopePipeline = [
    ...buildEffectiveOperationalClassificationStages({ userIdField: "userId", recordClassificationField: "operationalClassification" }),
    ...asOptionalStage(buildOperationalScopeMatch(input.operationalScope)),
  ];
  const pipeline = [
    ...scopePipeline,
    { $facet: {
      metadata: [...rowFilterStages, { $count: "total" }],
      items: [
        ...rowFilterStages,
        { $sort: { createdAt: -1 } },
        { $skip: (input.page - 1) * input.limit },
        { $limit: input.limit },
      ],
      statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
      frameOptions: [
        { $unwind: "$lines" },
        { $match: { "lines.type": "frame" } },
        { $group: { _id: "$lines.label" } },
        { $sort: { _id: 1 } },
      ],
    } },
  ];
  return mapAdminOrderFacet(await OrderModel.aggregate(pipeline));
}
```

When `backend/src/services/orderService.ts` needs the base customer-safe type, import it only from its owner: `import type { OrderEntity } from "../repositories/mongo/MongoOrderRepository";`. Do not redeclare `OrderEntity` in a controller or service. Keep `AdminOrderEntity`, `AdminOrderListInput`, `AdminOrderListResult`, `mapAdminOrder()`, and the aggregate repository methods beside the existing `OrderEntity`/`mapOrder()` in `MongoOrderRepository.ts`; the service imports those Admin types from the same module.

`buildAdminOrderRowFilterStages` must preserve the current whole-dataset behavior: bounded case-insensitive `q` matches ObjectId text/email/fullName/phone; `status` matches one enum or all; `frame` matches the frame line label or legacy `kitType`; `dateFrom` is inclusive; `dateToExclusive` is the next calendar day. Parse strict `YYYY-MM-DD` boundaries with the product timezone offset `+07:00` so Render's host timezone cannot shift an operator-selected day. Bound all query values in `orderController.ts`; invalid status/date/scope/page/limit returns `400`.

Keep `mapOrder()` for customer methods free of classification and add a separate `mapAdminOrder()`. Update `adminGetOrders` controller to return `{ page, limit, total, totalPages, operationalScope, query, status, frame, dateFrom, dateTo, statusCounts, frameOptions, items }`; `statusCounts` and `frameOptions` cover the full selected operational scope, while `total/items` apply all row filters. `adminGetOrder` includes one effective summary resolved from user + record.

Harden customer export privacy explicitly: change the account-export profile, physical-order, and payment-order queries to `.select("-__v -operationalClassification")`, and add sentinel tests proving `operationalClassification`, `classifiedBy`, notes, and Admin-only sources never enter the account-export JSON. Keep payment status/history serializers allowlisted as they are.

Preserve the existing all-filter physical-order CSV behavior with a bounded server export:

```ts
const MAX_ADMIN_ORDER_EXPORT_ROWS = 5_000;

orderRoutes.get(
  "/admin/orders/export",
  asyncHandler(requireAdmin),
  asyncHandler(adminExportOrders),
);

async function getAdminOrdersForExport(input: Omit<AdminOrderListInput, "page" | "limit">): Promise<AdminOrderEntity[]> {
  const rows = await OrderModel.aggregate([
    ...buildEffectiveOperationalClassificationStages({ userIdField: "userId", recordClassificationField: "operationalClassification" }),
    ...asOptionalStage(buildOperationalScopeMatch(input.operationalScope)),
    ...buildAdminOrderRowFilterStages(input),
    { $sort: { createdAt: -1 } },
    { $limit: MAX_ADMIN_ORDER_EXPORT_ROWS + 1 },
  ]);
  if (rows.length > MAX_ADMIN_ORDER_EXPORT_ROWS) {
    throw new ApiError(413, "Order export is too large. Narrow the filters.", undefined, "admin_order_export_too_large");
  }
  return rows.map(mapAdminOrder);
}
```

Register `/admin/orders/export` before `/admin/orders/:id`. `adminExportOrders` reuses the exact list filter parser and repository stages, returns UTF-8 CSV with the existing columns, and never returns a partial file. Route tests assert non-Admins receive `403` and invalid queries receive JSON errors without download headers.

- [ ] **Step 5: Run list, route, and privacy tests**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminController.test.js backend/dist/tests/adminOperationalOrderList.test.js backend/dist/tests/orderRoutes.test.js backend/dist/tests/accountRoutes.test.js`

Expected: PASS; both Admin lists default to real, support excluded/all, paginate after all server filters, preserve physical-order counts/options/export, and customer order payloads omit Admin metadata.

- [ ] **Step 6: Commit filtered operational lists**

```bash
git add backend/src/controllers/adminController.ts backend/src/controllers/orderController.ts backend/src/controllers/accountController.ts backend/src/services/orderService.ts backend/src/repositories/mongo/MongoOrderRepository.ts backend/src/routes/orderRoutes.ts backend/src/tests/adminController.test.ts backend/src/tests/orderRoutes.test.ts backend/src/tests/accountRoutes.test.ts backend/src/tests/adminOperationalOrderList.test.ts
git commit -m "feat(admin): filter payment and print order lists"
```

### Task 7: Effective Classification in the Formal Sales KPI Report

**Files:**
- Modify: `backend/src/services/adminSalesReportService.ts:31-55,200-207,319-497`
- Modify: `backend/src/tests/adminSalesReportService.test.ts`
- Modify: `backend/src/tests/adminSalesReportRoutes.test.ts`
- Modify: `backend/src/tests/adminSalesReviewTransaction.integration.test.ts`

**Interfaces:**
- Consumes: Task 5 effective-classification aggregation stages.
- Produces:
  - `effectiveKpiStatus` per report row;
  - `operationalClassification` per report row;
  - effective tab/summary calculations without rewriting stored `reporting.kpiStatus`.

- [ ] **Step 1: Write failing effective-status and restoration tests**

```ts
type SalesFacetFixture = {
  summary: Array<{ successfulTransactions: number; uniquePaidUsers: number; grossRevenueVnd: number; refundedAmountVnd: number; netRevenueVnd: number }>;
  tabCounts: Array<{ _id: "pending" | "included" | "excluded"; count: number }>;
  dailyBuckets: unknown[];
  rowCount: Array<{ count: number }>;
  rows: Array<Record<string, unknown>>;
};

function installSalesFacetFixture(facet: SalesFacetFixture): void {
  (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<SalesFacetFixture[]> }).aggregate = async () => [facet];
}

it("excludes a stored included sale when its user is test", async () => {
  installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "included", userCategory: "test" }));
  const report = await getAdminSalesReport(reportInput);
  assert.equal(report.summary.successfulTransactions, 0);
  assert.equal(report.tabCounts.excluded, 1);
  assert.equal(report.items[0]?.reporting.kpiStatus, "included");
  assert.equal(report.items[0]?.effectiveKpiStatus, "excluded");
  assert.equal(report.items[0]?.operationalClassification.source, "user");
});

it("restores the stored review decision when classification becomes real", async () => {
  installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "included", userCategory: "real" }));
  const report = await getAdminSalesReport(reportInput);
  assert.equal(report.summary.successfulTransactions, 1);
  assert.equal(report.items[0]?.effectiveKpiStatus, "included");
});
```

Add `buildSalesFacetFixture()` beside `createReviewOrder()` in the existing test file. It must return the exact `SalesFacetFixture` shape above and independently parameterize `storedStatus`, `userCategory`, `recordCategory`, `legacyExclusionReason`, and refund state; it must never become a production dependency or add a second argument to `getAdminSalesReport`. Also test direct `real` suppressing legacy `test`, a real pending payment remaining pending, and refunds reducing net revenue only for effectively included sales. Separately assert the generated Mongo pipeline contains the Task 5 effective-classification stages before `__effectiveKpiStatus`, so the fixture does not substitute for testing the production precedence logic.

- [ ] **Step 2: Run sales suites and confirm stored review alone still drives totals**

Run: `npm.cmd --prefix backend run build && node --test backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/adminSalesReviewTransaction.integration.test.js`

Expected: FAIL because the report pipeline has no user/record effective classification.

- [ ] **Step 3: Add effective classification before KPI grouping/filtering**

```ts
const pipeline: PipelineStage[] = [
  { $match: buildQualifyingSalesFilter(filters) },
  ...buildEffectiveOperationalClassificationStages({
    userIdField: "userId",
    recordClassificationField: "operationalClassification",
    legacySalesReasonField: "reporting.exclusionReason",
  }),
  { $set: {
    __storedKpiStatus: { $ifNull: ["$reporting.kpiStatus", "pending"] },
    __effectiveKpiStatus: {
      $cond: [
        { $ne: ["$__effectiveOperationalCategory", "real"] },
        "excluded",
        { $ifNull: ["$reporting.kpiStatus", "pending"] },
      ],
    },
  } },
];
```

Apply requested `kpiStatus`, tab counts, unique paid users, revenue, refunds, daily buckets, and export rows to `__effectiveKpiStatus`. Preserve stored review fields separately.

- [ ] **Step 4: Extend the privacy-safe row/export contract**

```ts
interface AdminSalesReportRow {
  // existing safe fields
  effectiveKpiStatus: "pending" | "included" | "excluded";
  operationalClassification: AdminOperationalClassificationSummary;
  reporting: {
    kpiStatus: "pending" | "included" | "excluded";
    exclusionReason: PaymentReportingExclusionReason | null;
    reviewedAt: string | null;
  };
}
```

CSV may include effective category/source but must remain masked and must not add UIDs, raw notes, bank details, or provider payloads.

- [ ] **Step 5: Run sales, audit, and transaction regression suites**

Run: `npm.cmd --prefix backend run typecheck && npm.cmd --prefix backend run build && node --test backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/adminSalesReviewTransaction.integration.test.js backend/dist/tests/adminAuditOutbox.test.js`

Expected: PASS; classification changes effective KPI membership while stored review and durable review audit behavior remain unchanged.

- [ ] **Step 6: Commit sales integration**

```bash
git add backend/src/services/adminSalesReportService.ts backend/src/tests/adminSalesReportService.test.ts backend/src/tests/adminSalesReportRoutes.test.ts backend/src/tests/adminSalesReviewTransaction.integration.test.ts
git commit -m "feat(admin): apply classification to sales KPIs"
```

### Task 8: Typed Frontend Contracts and Reusable Classification Components

**Files:**
- Modify: `src/services/adminService.ts:1-345,463-620`
- Modify: `src/services/orderService.ts:41-146`
- Create: `src/app/components/admin/AdminOperationalClassificationBadge.tsx`
- Create: `src/app/components/admin/AdminOperationalScopeFilter.tsx`
- Create: `src/app/components/admin/AdminOperationalClassificationDialog.tsx`
- Create: `src/app/components/admin/AdminOperationalClassification.test.tsx`
- Modify: `src/services/adminService.test.ts`
- Create: `src/services/orderService.test.ts`

**Interfaces:**
- Consumes: backend API contracts from Tasks 3-7.
- Produces:
  - shared frontend classification types;
  - `adminClassifyUsers` and `adminClassifyPaymentOrder` in `adminService`;
  - paginated `adminGetOrders`, bounded `adminExportOrders`, and `adminClassifyPhysicalOrder` in `orderService`;
  - scope/category query params on list functions;
  - three reusable accessible components plus one source-label helper.

- [ ] **Step 1: Write failing service and component contract tests**

```ts
it("sends real-only list filters and bounded classification payloads", async () => {
  await adminListUsers({ operationalCategory: "real", page: 1, limit: 30 });
  expect(mockGet).toHaveBeenCalledWith("/admin/users?operationalCategory=real&page=1&limit=30");

  await adminClassifyUsers({
    category: "test",
    reason: "test_account",
    changes: [{ userUid: "u1", requestId: "11111111-1111-4111-8111-111111111111" }],
  });
  expect(mockPatch).toHaveBeenCalledWith("/admin/users/operational-classification", expect.any(Object));
});

it("serializes all physical-order filters once for list and export", async () => {
  const params = { q: "abc", status: "pending" as const, frame: "Khung gỗ", dateFrom: "2026-07-01", dateTo: "2026-07-31", operationalScope: "excluded" as const, page: 2, limit: 30 };
  await adminGetOrders(params);
  expect(mockGet).toHaveBeenCalledWith("/admin/orders?q=abc&status=pending&frame=Khung+g%E1%BB%97&dateFrom=2026-07-01&dateTo=2026-07-31&operationalScope=excluded&page=2&limit=30");
  await adminExportOrders(params);
  expect(mockGetFile).toHaveBeenCalledWith("/admin/orders/export?q=abc&status=pending&frame=Khung+g%E1%BB%97&dateFrom=2026-07-01&dateTo=2026-07-31&operationalScope=excluded");
});

it("requires a note for other and announces validation accessibly", async () => {
  const dialogProps: React.ComponentProps<typeof AdminOperationalClassificationDialog> = {
    open: true,
    targetType: "payment_order",
    targetLabel: "VBTEST0001",
    initialCategory: "test",
    pending: false,
    onOpenChange: () => undefined,
    onConfirm: async () => undefined,
  };
  render(<AdminOperationalClassificationDialog {...dialogProps} initialReason="other" initialNote="" />);
  await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Nhập ghi chú");
});
```

- [ ] **Step 2: Run service/component tests and verify missing types/functions**

Run: `npm.cmd run test:run -- src/services/adminService.test.ts src/services/orderService.test.ts && npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx`

Expected: FAIL because the shared types, API methods, and components do not exist.

- [ ] **Step 3: Add one typed frontend contract used by every page**

```ts
export type AdminOperationalCategory = "real" | "test" | "internal";
export type AdminOperationalScope = "real" | "excluded" | "all";
export type AdminOperationalClassificationReason = "confirmed_real" | "test_account" | "internal_team" | "automated_qa" | "other";

export interface AdminOperationalClassificationSummary {
  effectiveCategory: AdminOperationalCategory;
  source: "default" | "user" | "record" | "legacy_sales_review";
  reason?: AdminOperationalClassificationReason | "legacy_sales_test" | "legacy_sales_internal";
  note?: string;
  classifiedAt?: string;
}

export interface AdminClassificationMutationPayload {
  requestId: string;
  category: AdminOperationalCategory;
  reason: AdminOperationalClassificationReason;
  note?: string;
}

export interface AdminOrderListParams {
  q?: string;
  status?: ApiOrderStatus | "all";
  frame?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  operationalScope?: AdminOperationalScope;
  page?: number;
  limit?: number;
}

export interface AdminApiOrder extends ApiOrder {
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminOrderListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  operationalScope: AdminOperationalScope;
  query: string;
  status: ApiOrderStatus | "all";
  frame: string | "all";
  dateFrom: string | null;
  dateTo: string | null;
  statusCounts: Record<ApiOrderStatus | "all", number>;
  frameOptions: string[];
  items: AdminApiOrder[];
}
```

Extend overview, user, subscription, payment, sales-row, and Admin-only `ApiOrder` response types. Keep customer order API functions typed to the existing customer-safe shape; do not make Admin classification required on customer responses. Update list functions to serialize `operationalCategory`, `operationalScope`, `q`, status/frame/date, `page`, and `limit` exactly once through `URLSearchParams`. Add `adminExportOrders(params)` via existing `getFile`, omitting page/limit while retaining the same filters.

- [ ] **Step 4: Implement accessible shared components**

```tsx
export interface AdminOperationalScopeFilterProps {
  value: AdminOperationalScope;
  onChange(value: AdminOperationalScope): void;
}

export function AdminOperationalClassificationBadge({ classification }: { classification: AdminOperationalClassificationSummary }) {
  if (classification.effectiveCategory === "real") return null;
  const label = classification.effectiveCategory === "test" ? "Test" : "Nội bộ";
  return <AdminStatusBadge tone={classification.effectiveCategory === "test" ? "pending" : "expired"}>{label}</AdminStatusBadge>;
}

export function getAdminOperationalClassificationSourceLabel(
  source: AdminOperationalClassificationSummary["source"],
): string {
  if (source === "user") return "Theo phân loại tài khoản";
  if (source === "record") return "Đánh dấu trực tiếp";
  if (source === "legacy_sales_review") return "Theo duyệt KPI cũ";
  return "Mặc định dữ liệu thật";
}

export function AdminOperationalScopeFilter({ value, onChange }: AdminOperationalScopeFilterProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as AdminOperationalScope)}>
      <SelectTrigger aria-label="Phạm vi dữ liệu"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="real">Dữ liệu thật</SelectItem>
        <SelectItem value="excluded">Test & nội bộ</SelectItem>
        <SelectItem value="all">Tất cả</SelectItem>
      </SelectContent>
    </Select>
  );
}

export interface AdminOperationalClassificationDialogProps {
  open: boolean;
  targetType: "user" | "payment_order" | "physical_order";
  targetLabel: string;
  initialCategory: AdminOperationalCategory;
  initialReason?: AdminOperationalClassificationReason;
  initialNote?: string;
  pending: boolean;
  error?: string;
  onOpenChange(open: boolean): void;
  onConfirm(payload: Omit<AdminClassificationMutationPayload, "requestId">): Promise<void> | void;
}
```

`AdminOperationalClassificationDialog` accepts exactly `AdminOperationalClassificationDialogProps`. The dialog owns draft category/reason/note state initialized from the `initial*` props whenever it opens; the caller owns the stable request id and adds it to the payload before calling the API. The dialog uses the existing in-app `AlertDialog`, resets fields on close, enforces allowed category/reason combinations, caps note input at 200, and disables submit while pending. For user targets it explicitly explains the cascade to Plus/payment/print reporting. All target variants show: `Không nhập mật khẩu, secret, thông tin ngân hàng hoặc dữ liệu khách hàng không cần thiết vào ghi chú.`

- [ ] **Step 5: Run frontend contract and component tests**

Run: `npm.cmd run typecheck && npm.cmd run test:run -- src/services/adminService.test.ts src/services/orderService.test.ts && npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx`

Expected: PASS; no page contains its own classification precedence implementation.

- [ ] **Step 6: Commit frontend primitives**

```bash
git add src/services/adminService.ts src/services/adminService.test.ts src/services/orderService.ts src/services/orderService.test.ts src/app/components/admin/AdminOperationalClassificationBadge.tsx src/app/components/admin/AdminOperationalScopeFilter.tsx src/app/components/admin/AdminOperationalClassificationDialog.tsx src/app/components/admin/AdminOperationalClassification.test.tsx
git commit -m "feat(admin): add classification UI primitives"
```

### Task 9: User List Bulk Cleanup and User Detail Classification

**Files:**
- Modify: `src/app/pages/AdminUsersPage.tsx:55-240`
- Modify: `src/app/pages/AdminUserDetailPage.tsx:35-307`
- Create: `src/app/pages/AdminUsersPage.test.tsx`
- Modify: `src/app/pages/AdminUserDetailPage.dialog.test.tsx`

**Interfaces:**
- Consumes: Task 8 `adminClassifyUsers`, badge/filter/dialog components.
- Produces: explicit-selection bulk cleanup workflow and single-user detail classification.

- [ ] **Step 1: Write failing real-default, selection, partial-result, and no-optimism tests**

```tsx
it("loads real users by default and can inspect excluded users", async () => {
  render(<AdminUsersPage />);
  await waitFor(() => expect(adminListUsers).toHaveBeenCalledWith(expect.objectContaining({ operationalCategory: "real" })));
  await user.click(screen.getByLabelText("Phân loại vận hành"));
  await user.click(screen.getByRole("option", { name: "Test" }));
  await waitFor(() => expect(adminListUsers).toHaveBeenLastCalledWith(expect.objectContaining({ operationalCategory: "test", page: 1 })));
});

it("classifies explicit selections and announces partial failures", async () => {
  mockAdminClassifyUsers.mockResolvedValue({ results: [{ userUid: "u1", status: "updated" }, { userUid: "u2", status: "failed", errorCode: "user_not_found" }] });
  render(<AdminUsersPage />);
  await selectUsers(["u1", "u2"]);
  await confirmClassification("test", "test_account");
  expect(screen.getByRole("status")).toHaveTextContent("1 thành công, 1 thất bại");
});

it("retries only unknown-commit targets with their original request ids", async () => {
  mockAdminClassifyUsers
    .mockResolvedValueOnce({ results: [{ userUid: "u1", status: "updated" }, { userUid: "u2", status: "failed", errorCode: "admin_audit_commit_unknown" }] })
    .mockResolvedValueOnce({ results: [{ userUid: "u2", status: "updated" }] });
  render(<AdminUsersPage />);
  await selectUsers(["u1", "u2"]);
  await confirmClassification("test", "test_account");
  const firstU2 = mockAdminClassifyUsers.mock.calls[0][0].changes.find((item) => item.userUid === "u2");
  await user.click(screen.getByRole("button", { name: "Thử lại mục chưa rõ kết quả" }));
  expect(mockAdminClassifyUsers.mock.calls[1][0].changes).toEqual([firstU2]);
});
```

User-detail test must confirm the displayed badge changes only after the API resolves and the detail is reloaded.

- [ ] **Step 2: Run user UI tests and verify controls are absent**

Run: `npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx`

Expected: FAIL because category filter, checkboxes, bulk dialog, and detail classification action do not exist.

- [ ] **Step 3: Add real-default category filtering and explicit selection**

```tsx
const [operationalCategory, setOperationalCategory] = useState<AdminOperationalCategory | "all">("real");
const [selectedUids, setSelectedUids] = useState<Set<string>>(() => new Set());
const [pendingChanges, setPendingChanges] = useState<Array<{ userUid: string; requestId: string }> | null>(null);

const toggleUser = (uid: string) => {
  setSelectedUids((current) => {
    const next = new Set(current);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });
};
```

Initialize `operationalCategory` from `useSearchParams()` so dashboard links open the requested `test` or `internal` view. Accept only `real|test|internal|all`; replace invalid URL values with `real`. Keep the category in the URL, reset page to `1` when it changes, clear selection when query/category/page changes, disable bulk action at zero selections, and stop selection at 100 with an accessible message.

- [ ] **Step 4: Submit stable per-target request ids and handle partial outcomes**

```tsx
const changes = pendingChanges ?? [...selectedUids].map((userUid) => ({ userUid, requestId: crypto.randomUUID() }));
setPendingChanges(changes);
const result = await adminClassifyUsers({ category, reason, note: note.trim() || undefined, changes });
const failed = result.results.filter((item) => item.status === "failed");
const retryableUids = new Set(
  failed
    .filter((item) => item.errorCode === "admin_audit_commit_unknown")
    .map((item) => item.userUid),
);
const retryableChanges = changes.filter((item) => retryableUids.has(item.userUid));
setBulkResult({ succeeded: result.results.length - failed.length, failed });
await loadUsers();
setSelectedUids(new Set(retryableChanges.map((item) => item.userUid)));
setPendingChanges(retryableChanges.length > 0 ? retryableChanges : null);
```

Use `aria-live="polite"` for the result. Keep failed identifiers visible without exposing new PII. Retain only `admin_audit_commit_unknown` targets in `pendingChanges` so retry reuses the same per-target request ids; clear definitive success, validation, not-found, and conflict targets. If the whole HTTP request fails before a per-target response, retain the full `changes` array for retry rather than generating new ids.

- [ ] **Step 5: Add the same dialog to the user detail page**

Call `adminClassifyUsers` with one change, keep that request id across `admin_audit_commit_unknown`/transport retry, reload `adminGetUserDetail` after confirmed success or idempotency conflict, and retain existing role/subscription AlertDialogs unchanged.

- [ ] **Step 6: Run user-page tests and typecheck**

Run: `npm.cmd run typecheck && npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx`

Expected: PASS with real default, four category filters, <=100 selection, partial results, cascade confirmation, and no optimistic mutation.

- [ ] **Step 7: Commit user cleanup UI**

```bash
git add src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx src/app/pages/AdminUserDetailPage.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx
git commit -m "feat(admin): add user data cleanup workflow"
```

### Task 10: Payment and Physical-Order Classification UI

**Files:**
- Modify: `src/app/pages/AdminPaymentsPage.tsx:78-469`
- Create: `src/app/pages/AdminPaymentsPage.test.tsx`
- Modify: `src/app/pages/AdminPaymentsPage.dialog.test.tsx`
- Modify: `src/app/pages/AdminOrdersPage.tsx:85-752`
- Modify: `src/app/pages/AdminOrderDetailPage.tsx:57-220`
- Create: `src/app/pages/AdminOrdersPage.test.tsx`
- Create: `src/app/pages/AdminOrderDetailPage.test.tsx`

**Interfaces:**
- Consumes: Task 8 list params, mutation APIs, badges, scope filter, dialog.
- Produces: real/excluded/all payment and print-order views with direct classification actions.

- [ ] **Step 1: Write failing filter, badge, direct-action, and pagination tests**

```tsx
it("loads real payments by default and reloads after direct classification", async () => {
  render(<AdminPaymentsPage />);
  await waitFor(() => expect(adminListPaymentOrders).toHaveBeenCalledWith(expect.objectContaining({ operationalScope: "real", page: 1 })));
  await openPaymentClassification("VBTEST0001");
  await confirmClassification("test", "test_account");
  expect(adminClassifyPaymentOrder).toHaveBeenCalledWith("VBTEST0001", expect.objectContaining({ category: "test" }));
  await waitFor(() => expect(adminListPaymentOrders).toHaveBeenCalledTimes(2));
});

it("shows inherited classification source and does not offer a fake real override", async () => {
  render(<AdminOrdersPage />);
  expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Chuyển về dữ liệu thật" })).toBeDisabled();
});

it("sends every physical-order filter to the server before changing pages", async () => {
  render(<AdminOrdersPage />);
  await setOrderFilters({ query: "abc", status: "pending", frame: "Khung gỗ", dateFrom: "2026-07-01", dateTo: "2026-07-31", scope: "excluded" });
  await user.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(adminGetOrders).toHaveBeenLastCalledWith(expect.objectContaining({
    q: "abc",
    status: "pending",
    frame: "Khung gỗ",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-31",
    operationalScope: "excluded",
    page: 2,
  }));
});
```

- [ ] **Step 2: Run payment/order UI tests and verify missing controls**

Run: `npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx`

Expected: FAIL because the pages do not pass operational scope, show classification, paginate server results, or mutate direct classification.

- [ ] **Step 3: Add payment scope, pagination, badges, and direct dialog**

```tsx
const [operationalScope, setOperationalScope] = useState<AdminOperationalScope>("real");
const [page, setPage] = useState(1);
const [classificationRequestId, setClassificationRequestId] = useState<string | null>(null);

const loadPayments = useCallback(async () => {
  const result = await adminListPaymentOrders({ q: query, status, operationalScope, page, limit: 30 });
  setItems(result.items);
  setTotalPages(result.totalPages);
}, [query, status, operationalScope, page]);
```

Render `getAdminOperationalClassificationSourceLabel()` next to the badge. Reset page to `1` when query/status/scope changes and clear stale rows only after the new request starts. The sidebar pending call explicitly uses `operationalScope: "real"`. Allocate `classificationRequestId` when the dialog opens, reuse it after `admin_audit_commit_unknown` or an unknown transport outcome, and clear it after a definitive response. After a successful mutation, close the dialog and reload; on ordinary failure retain the row and overview-independent totals; on `admin_classification_request_conflict`, reload the current server row before showing the conflict message.

- [ ] **Step 4: Replace local all-order loading with the paginated Admin API**

```tsx
const result = await adminGetOrders({
  q: query,
  status: statusFilter,
  frame: frameFilter,
  dateFrom: dateFrom || undefined,
  dateTo: dateTo || undefined,
  operationalScope,
  page,
  limit: 30,
});
setOrders(result.items);
setTotalPages(result.totalPages);
setCounts(result.statusCounts);
setFrameOptions(result.frameOptions);
```

Remove `filteredOrders` and page-local `counts`; query/status/frame/date/scope changes reload page `1`, while selection is limited to the visible page and clears on filter/page changes. Fulfillment/edit/bulk-status success reloads the server page so totals and status counts remain accurate.

Keep the existing full-filter CSV behavior through `adminExportOrders({ q, status, frame, dateFrom, dateTo, operationalScope })`; download the returned authenticated file/filename, show the server's bounded-export error, and never silently export only the visible page. Payment CSV may continue exporting the currently visible payment page because that is its existing bounded behavior.

- [ ] **Step 5: Add direct classification to order detail**

Use the same dialog and `adminClassifyPhysicalOrder`. Reload `adminGetOrder` after success. If source is `user`, explain that the user must be restored from the Users page and disable only the misleading direct `real` action; do not imply a record override can supersede the user.

- [ ] **Step 6: Run payment/order page suites and typecheck**

Run: `npm.cmd run typecheck && npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx`

Expected: PASS; real-only default, source badges, server pagination, state preservation, and no optimistic changes are covered.

- [ ] **Step 7: Commit payment/order UI**

```bash
git add src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminOrdersPage.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminOrderDetailPage.tsx src/app/pages/AdminOrderDetailPage.test.tsx
git commit -m "feat(admin): manage test payments and print orders"
```

### Task 11: Subscription, Dashboard, and Sales Report Presentation

**Files:**
- Modify: `src/app/pages/AdminSubscriptionsPage.tsx:34-179`
- Create: `src/app/pages/AdminSubscriptionsPage.test.tsx`
- Modify: `src/app/pages/AdminDashboardPage.tsx:265-519`
- Create: `src/app/pages/AdminDashboardPage.test.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.tsx:52-252`
- Modify: `src/app/components/admin/sales/AdminSalesReportList.tsx`
- Modify: `src/app/components/admin/sales/AdminSalesKpiGrid.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.test.tsx`

**Interfaces:**
- Consumes: Task 8 contracts/components and Task 7 effective sales row.
- Produces: inherited subscription filters, real-only operational dashboard disclosure, and clear stored-vs-effective sales presentation.

- [ ] **Step 1: Write failing subscription, dashboard, and sales tests**

```tsx
it("defaults subscriptions to real users and labels inherited exclusions", async () => {
  render(<AdminSubscriptionsPage />);
  await waitFor(() => expect(adminListSubscriptions).toHaveBeenCalledWith(expect.objectContaining({ operationalScope: "real" })));
  await user.selectOptions(screen.getByLabelText("Phạm vi dữ liệu"), "excluded");
  expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
});

it("shows filtered KPIs and links to each excluded user category", async () => {
  render(<AdminDashboardPage />);
  expect(await screen.findByText("20")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /15 tài khoản test/i })).toHaveAttribute("href", "/admin/users?operationalCategory=test");
  expect(screen.getByRole("link", { name: /2 tài khoản nội bộ/i })).toHaveAttribute("href", "/admin/users?operationalCategory=internal");
});

it("shows stored included review as effectively excluded by classification", async () => {
  render(<AdminSalesReportPage />);
  expect(await screen.findByText("Đã duyệt: Được tính KPI")).toBeInTheDocument();
  expect(screen.getByText("Hiệu lực: Đã loại theo tài khoản")).toBeInTheDocument();
});

it("labels legacy sales-review classification separately from direct record classification", async () => {
  render(<AdminSalesReportPage />);
  expect(await screen.findByText("Theo duyệt KPI cũ")).toBeInTheDocument();
  expect(screen.queryByText("Đánh dấu trực tiếp")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the three page suites and verify presentation gaps**

Run: `npm.cmd run test:ui -- src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminSalesReportPage.test.tsx`

Expected: FAIL because subscriptions are unfiltered, dashboard has no excluded disclosure, and sales rows expose only stored review status.

- [ ] **Step 3: Add inherited subscription scope and badges**

```tsx
const [operationalScope, setOperationalScope] = useState<AdminOperationalScope>("real");
const result = await adminListSubscriptions({ status, planCode, operationalScope, page, limit: 30 });
```

Reset page to `1` on status/plan/scope changes. Render classification badge and `getAdminOperationalClassificationSourceLabel()`, but do not add a subscription-level mutation action.

- [ ] **Step 4: Render overview disclosure without recomputing numbers**

```tsx
<div className="flex flex-wrap gap-3 text-sm">
  {summary.excludedUsers.test > 0 ? (
    <Link to="/admin/users?operationalCategory=test" className="font-medium text-app-accent hover:underline">
      {summary.excludedUsers.test} tài khoản test
    </Link>
  ) : null}
  {summary.excludedUsers.internal > 0 ? (
    <Link to="/admin/users?operationalCategory=internal" className="font-medium text-app-accent hover:underline">
      {summary.excludedUsers.internal} tài khoản nội bộ
    </Link>
  ) : null}
</div>
```

Use only server summary values. Keep a retryable error if overview aggregation fails; do not display raw fallback totals.
Update the existing parallel call to `adminGetOrders({ operationalScope: "real", page: 1, limit: 12 })` and consume `ordersResult.items` for recent physical-order rendering.

- [ ] **Step 5: Distinguish sales review decision from effective KPI state**

```tsx
<AdminOperationalClassificationBadge classification={row.operationalClassification} />
<p>{getAdminOperationalClassificationSourceLabel(row.operationalClassification.source)}</p>
<p>Đã duyệt: {SALES_STATUS_LABELS[row.reporting.kpiStatus]}</p>
{row.effectiveKpiStatus !== row.reporting.kpiStatus ? (
  <p>Hiệu lực: Đã loại theo phân loại vận hành</p>
) : null}
```

Show the source line for every classification-derived exclusion, including `legacy_sales_review` even when stored/effective statuses are both `excluded`. Tabs/cards use backend `effectiveKpiStatus` counts. Review dialog continues editing stored `reporting.kpiStatus` only and never writes operational classification.

- [ ] **Step 6: Run Admin presentation suites and typecheck**

Run: `npm.cmd run typecheck && npm.cmd run test:ui -- src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminSalesReportPage.test.tsx`

Expected: PASS with inherited subscription filtering, excluded-user disclosure, and explicit stored/effective sales states.

- [ ] **Step 7: Commit remaining Admin presentation**

```bash
git add src/app/pages/AdminSubscriptionsPage.tsx src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminDashboardPage.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminSalesReportPage.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/components/admin/sales/AdminSalesReportList.tsx src/app/components/admin/sales/AdminSalesKpiGrid.tsx
git commit -m "feat(admin): present real operational metrics"
```

### Task 12: Documentation, Full Verification, and Manual Cleanup Proof

**Files:**
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md`
- Modify: `guidelines/PRODUCTION_ROADMAP.md`
- Modify if implementation discoveries require clarification: `docs/superpowers/specs/2026-07-13-admin-operational-data-classification-design.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: code-backed status, clean verification evidence, and an operator-ready first cleanup workflow.

- [ ] **Step 1: Update code-backed documentation**

Add a concise current-state entry that names:

```md
- Admin operational metrics now exclude records classified as `test` or `internal`.
- User classification cascades to Plus subscriptions, payments, and physical orders without changing entitlement or provider state.
- Admin lists default to real data and retain `Test & nội bộ` / `Tất cả` filters for audit.
- Formal sales KPI still requires an `included` review in addition to effective `real` classification.
```

Mark only the implemented roadmap item complete; do not claim active-user/DAU metrics.

- [ ] **Step 2: Run focused backend verification**

Run:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminOperationalClassificationModel.test.js backend/dist/tests/adminOperationalClassificationService.test.js backend/dist/tests/adminOperationalClassificationRoutes.test.js backend/dist/tests/adminOperationalClassificationQuery.test.js backend/dist/tests/adminOverviewOperationalClassification.test.js backend/dist/tests/adminOperationalOrderList.test.js backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/orderRoutes.test.js backend/dist/tests/accountRoutes.test.js
```

Expected: PASS with zero failures.

- [ ] **Step 3: Run focused frontend verification**

Run:

```bash
npm.cmd run typecheck
npm.cmd run test:run -- src/services/adminService.test.ts src/services/orderService.test.ts
npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminSalesReportPage.test.tsx
```

Expected: PASS with zero failures.

- [ ] **Step 4: Run broad project verification**

Run:

```bash
npm.cmd --prefix backend run test:run
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Expected: all commands exit `0`. If the pre-existing `src/app/brand-preservation.test.ts` hash failure still exists on the execution base, report it separately with the exact expected/received hash and do not modify brand assets in this feature.

- [ ] **Step 5: Perform manual Admin verification in a real-mode local/staging environment**

Verify this exact sequence:

1. Record current overview values and choose one known historical test user.
2. Mark that user `test`; confirm user, active Plus, payment/revenue, and physical-order metrics decrease by the linked amounts/counts.
3. Confirm the user's subscription status, entitlement, payment status, PayOS evidence, refund state, and physical-order status are unchanged.
4. Open Users, Subscriptions, Payments, Orders, and Sales Report; confirm default real-only lists and excluded/all filters.
5. Restore the user to `real`; confirm the prior sales-review decision becomes effective again.
6. Classify one orphan payment or order directly and confirm only that record is removed.
7. Repeat one request id and confirm idempotent success; reuse it with a different command and confirm `409`.
8. Inspect Admin audit logs and outbox rows for one canonical event per target and absence of customer email, bank details, provider payloads, and secrets.
9. Check desktop and mobile widths, keyboard navigation, focus return, and `aria-live` bulk results.

- [ ] **Step 6: Review the complete diff against the acceptance checklist**

Run: `git diff origin/main...HEAD --check && git diff --stat origin/main...HEAD`

Expected: no whitespace errors; only operational classification, Admin reporting/list/UI/tests, and aligned docs are changed.

- [ ] **Step 7: Commit verification-aligned documentation**

```bash
git add guidelines/CURRENT_PROJECT_STATUS.md guidelines/PRODUCTION_ROADMAP.md docs/superpowers/specs/2026-07-13-admin-operational-data-classification-design.md
git commit -m "docs(admin): document operational KPI cleanup"
```

If the spec needed no implementation clarification, omit it from `git add`. If docs already match after prior tasks, skip the empty commit and record verification results in the final handoff instead.
