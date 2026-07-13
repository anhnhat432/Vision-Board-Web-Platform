# Durable Admin Sales Review Audit Outbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every successful Admin sales KPI review atomically persist a privacy-safe audit intent, materialize that intent idempotently into the existing Admin audit log, and retry safely across Mongo/worker failures.

**Architecture:** Add a dedicated Mongo-backed `AdminAuditOutbox` model and a versioned HMAC identity contract. `reviewAdminSalesOrder()` will preload response dependencies, run the optimistic `PaymentOrder` update plus outbox insert in one Mongoose transaction, and suppress the route wrapper's best-effort success audit. A leased dispatcher will upsert canonical `AuditLog` rows by `eventId`, retry with safe error codes, and run immediately plus on a periodic backend job.

**Tech Stack:** Node 20, TypeScript 5.7, Express 4, Mongoose 8, MongoDB 7 replica set, React 18, Vitest/Testing Library, Node test runner, GitHub Actions.

## Global Constraints

- Treat this as `Core` work: follow TDD, keep each task independently reviewable, and run a fresh TERRA review after every implementation task.
- Work only in `D:\Projects\Vision Board Web Platform\.codex-worktrees\admin-sales-reporting`; preserve unrelated changes and do not push.
- A successful review must not exist without a committed outbox event.
- Reporting review must never change payment status, subscription state, entitlement grants, receipts, refunds, or provider data.
- Preserve `409 sales_review_conflict` for stale optimistic updates.
- Return `503 admin_audit_unavailable` for pre-commit audit infrastructure failure and `503 admin_audit_commit_unknown` for unresolved commit results.
- The API request adds required UUID `reviewRequestId`; the response shape remains `{ item: AdminSalesReportRow }`.
- Never persist or log raw review notes, customer PII, customer `userId`/UID, bank data, provider payloads, raw exceptions, or `ADMIN_AUDIT_FINGERPRINT_SECRET` in outbox/audit/monitoring data.
- Use HMAC-SHA-256 fingerprint version `v1`; production requires a stable secret of at least 32 bytes.
- Other Admin routes retain the existing best-effort `logAdminAction()` semantics.
- Do not add a queue dependency, message broker, or new frontend UI.
- Keep completed outbox events for 30 days; pending/retrying events have no TTL.
- Integration verification must use `MONGODB_TRANSACTION_TEST_URI` against a real Mongo replica set.

## File Structure

- Create `backend/src/models/AdminAuditOutboxModel.ts`: outbox schema, enums, indexes, TTL, and typed payload.
- Create `backend/src/services/adminAuditOutboxService.ts`: HMAC identity, idempotency lookup, leased dispatch, canonical audit upsert, retry classification.
- Create `backend/src/jobs/adminAuditOutboxJob.ts`: guarded startup drain and periodic retry loop.
- Create `backend/src/tests/adminAuditOutbox.test.ts`: identity, privacy, claim, materialization, lease, and retry unit tests.
- Create `backend/src/tests/adminSalesReviewTransaction.integration.test.ts`: real replica-set commit/rollback proof.
- Modify `backend/src/models/auditLogModel.ts`: optional outbox identity fields and unique sparse `eventId` index.
- Modify `backend/src/services/auditLogService.ts`: omit backend-only fingerprint fields from list results; leave best-effort logging unchanged.
- Modify `backend/src/services/adminSalesReportService.ts`: required request id, idempotency resolution, preloads, transaction, outbox insert, error mapping.
- Modify `backend/src/controllers/adminSalesReportController.ts`: forward `reviewRequestId`; stop publishing success audit through `res.locals`.
- Modify `backend/src/routes/adminRoutes.ts`: add `logSuccess?: boolean` and disable only the sales-review wrapper success log.
- Modify `backend/src/config/env.ts`, `backend/src/config/envValidation.ts`, `backend/.env.example`, `render.yaml`: secret loading, validation, and deployment contract.
- Modify `backend/src/server.ts`: start the audit outbox job after Mongo connects.
- Modify backend tests: `envValidation.test.ts`, `auditLog.test.ts`, `adminSalesReportService.test.ts`, and `adminSalesReportRoutes.test.ts`.
- Modify `src/services/adminService.ts` and `src/services/adminService.test.ts`: split decision/request payload types and send UUID.
- Modify `src/app/components/admin/sales/AdminSalesReviewDialog.tsx`: emit decision fields only.
- Modify `src/app/pages/AdminSalesReportPage.tsx` and `.test.tsx`: generate/reuse request UUID by canonical decision.
- Modify `.github/workflows/ci.yml`: start and initialize MongoDB 7 replica set and expose transaction test URI.
- Modify `docs/PRODUCTION_ENV_CHECKLIST.md`: Render secret and transaction-capable Mongo requirements.

## Spec Coverage Map

- Requirements 1-12 (atomic mutation, unknown commit, UUID/HMAC idempotency): Tasks 1, 3, and 4.
- Requirements 13-24 (outbox shape, privacy, lease fencing, retries, TTL, monitoring): Tasks 1 and 2.
- Requirements 25-27 (sales-route audit ownership and unchanged unrelated routes): Task 3.
- Storage/index/env/deployment constraints: Tasks 1 and 5.
- Real replica-set commit/rollback evidence: Task 5.
- Cross-surface regression, privacy inspection, and fresh whole-feature review: Task 6.
- Out-of-scope billing, entitlements, receipts, refunds, demo routes, and frontend localStorage remain untouched in every task.

---

### Task 1: Lock Environment, Identity, and Persistence Contracts

**Files:**
- Create: `backend/src/models/AdminAuditOutboxModel.ts`
- Create: `backend/src/services/adminAuditOutboxService.ts`
- Create: `backend/src/tests/adminAuditOutbox.test.ts`
- Modify: `backend/src/models/auditLogModel.ts`
- Modify: `backend/src/services/auditLogService.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/config/envValidation.ts`
- Modify: `backend/src/tests/envValidation.test.ts`
- Modify: `backend/src/tests/auditLog.test.ts`
- Modify: `backend/.env.example`
- Modify: `render.yaml`

**Interfaces:**
- Consumes: existing `AuditLogEntity`, `validateBackendEnv()`, `env`, and Mongoose model conventions.
- Produces:
  - `AdminAuditOutboxModel`
  - `AdminAuditOutboxEntity`
  - `AdminAuditOutboxInsert`
  - `AdminAuditOutboxErrorCode`
  - `AdminSalesReviewAuditPayload`
  - `AdminSalesReviewAuditIdentityInput`
  - `AdminSalesReviewAuditIdentity`
  - `buildAdminSalesReviewAuditIdentity(input): AdminSalesReviewAuditIdentity`
  - `resolveAdminAuditIdempotency(identity): Promise<"missing" | "match" | "conflict">`
  - `isDuplicateAdminAuditEventIdError(error): boolean`
  - `initializeAdminAuditPersistence(): Promise<void>`

- [ ] **Step 1: Write failing env validation tests**

Add `ADMIN_AUDIT_FINGERPRINT_SECRET` to `baseProductionEnv()` and add these cases to `backend/src/tests/envValidation.test.ts`:

```ts
it("requires a strong Admin audit fingerprint secret in production", () => {
  const missing = baseProductionEnv();
  delete missing.ADMIN_AUDIT_FINGERPRINT_SECRET;
  const missingIssue = validateBackendEnv(missing, { nodeEnv: "production" })
    .find((issue) => issue.key === "ADMIN_AUDIT_FINGERPRINT_SECRET");
  assert.equal(missingIssue?.level, "error");

  const short = baseProductionEnv();
  short.ADMIN_AUDIT_FINGERPRINT_SECRET = "too-short";
  const shortIssue = validateBackendEnv(short, { nodeEnv: "production" })
    .find((issue) => issue.key === "ADMIN_AUDIT_FINGERPRINT_SECRET");
  assert.match(shortIssue?.message ?? "", /32 bytes/);
});
```

- [ ] **Step 2: Run the env test and verify RED**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/envValidation.test.js
```

Expected: FAIL because the secret is not required or length-validated.

- [ ] **Step 3: Implement secret loading and production validation**

Extend `EnvIssueCategory` with `"audit"`, require the variable only in production, and validate byte length without exposing its value:

```ts
function validateAuditFingerprintSecret(value: string): EnvValidationIssue | null {
  if (Buffer.byteLength(value, "utf8") >= 32) return null;
  return {
    level: "error",
    key: "ADMIN_AUDIT_FINGERPRINT_SECRET",
    category: "audit",
    message: "must contain at least 32 bytes.",
  };
}

if (isProduction) {
  if (!isNonEmpty(env.ADMIN_AUDIT_FINGERPRINT_SECRET)) {
    issues.push({
      level: "error",
      key: "ADMIN_AUDIT_FINGERPRINT_SECRET",
      category: "audit",
      message: "is required and must not be empty.",
    });
  } else {
    const issue = validateAuditFingerprintSecret(env.ADMIN_AUDIT_FINGERPRINT_SECRET);
    if (issue) issues.push(issue);
  }
}
```

Add to the exported runtime env:

```ts
ADMIN_AUDIT_FINGERPRINT_SECRET: getOptionalEnv("ADMIN_AUDIT_FINGERPRINT_SECRET"),
```

Document this non-secret example in `backend/.env.example` and add a `sync: false` Render variable:

```dotenv
ADMIN_AUDIT_FINGERPRINT_SECRET=replace-with-at-least-32-random-bytes
```

```yaml
- key: ADMIN_AUDIT_FINGERPRINT_SECRET
  sync: false
```

- [ ] **Step 4: Write failing identity/model privacy tests**

Create `backend/src/tests/adminAuditOutbox.test.ts` with test env set before imports and this identity test:

```ts
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-audit-outbox-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-audit-outbox-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { env } from "../config/env";

const originalAuditFingerprintSecret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;

afterEach(() => {
  env.ADMIN_AUDIT_FINGERPRINT_SECRET = originalAuditFingerprintSecret;
});

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
```

Add schema assertions for the unique/sparse `eventId` audit index, outbox dispatch index, and 30-day TTL:

```ts
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
```

- [ ] **Step 5: Run the identity/model test and verify RED**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminAuditOutbox.test.js
```

Expected: FAIL because the model and identity helper do not exist.

- [ ] **Step 6: Create the outbox model and HMAC identity helper**

Implement the model with these locked fields:

```ts
export interface AdminAuditOutboxEntity {
  eventId: string;
  reviewRequestId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
  eventType: "admin_sales_reviewed";
  actorUid: string;
  target: "payment_order_sales_reporting";
  targetId: string;
  payload: AdminSalesReviewAuditPayload;
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

export type AdminAuditOutboxInsert = Omit<AdminAuditOutboxEntity, "createdAt" | "updatedAt">;

export type AdminAuditOutboxErrorCode =
  | "mongo_unavailable"
  | "audit_validation_failed"
  | "lease_lost"
  | "unknown_safe";

export interface AdminSalesReviewAuditPayload {
  previousStatus: "pending" | "included" | "excluded";
  newStatus: "included" | "excluded";
  exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
  noteProvided: boolean;
  reviewedAt: string;
}

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

const adminSalesReviewAuditPayloadSchema = new Schema<AdminSalesReviewAuditPayload>(
  {
    previousStatus: { type: String, required: true, enum: ["pending", "included", "excluded"] },
    newStatus: { type: String, required: true, enum: ["included", "excluded"] },
    exclusionReason: {
      type: String,
      required: false,
      enum: ["internal_team", "test", "duplicate", "other"],
    },
    noteProvided: { type: Boolean, required: true },
    reviewedAt: { type: String, required: true },
  },
  { _id: false, strict: "throw" },
);

const adminAuditOutboxSchema = new Schema<AdminAuditOutboxEntity>(
  {
    eventId: { type: String, required: true, trim: true },
    reviewRequestId: { type: String, required: true, trim: true },
    commandFingerprint: { type: String, required: true, match: /^[0-9a-f]{64}$/ },
    commandFingerprintVersion: { type: String, required: true, enum: ["v1"] },
    eventType: { type: String, required: true, enum: ["admin_sales_reviewed"] },
    actorUid: { type: String, required: true, trim: true },
    target: { type: String, required: true, enum: ["payment_order_sales_reporting"] },
    targetId: { type: String, required: true, trim: true },
    payload: { type: adminSalesReviewAuditPayloadSchema, required: true },
    occurredAt: { type: Date, required: true },
    status: { type: String, required: true, enum: ["pending", "processing", "completed"] },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    availableAt: { type: Date, required: true },
    leaseToken: { type: String, required: false, default: null },
    lockedUntil: { type: Date, required: false, default: null },
    lastErrorCode: {
      type: String,
      required: false,
      enum: ["mongo_unavailable", "audit_validation_failed", "lease_lost", "unknown_safe"],
      default: null,
    },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true, versionKey: false, strict: "throw" },
);

adminAuditOutboxSchema.index({ eventId: 1 }, { unique: true });
adminAuditOutboxSchema.index({ status: 1, availableAt: 1, lockedUntil: 1 });
adminAuditOutboxSchema.index({ completedAt: 1 }, { expireAfterSeconds: 2_592_000 });
```

Read `env.ADMIN_AUDIT_FINGERPRINT_SECRET` inside every `buildAdminSalesReviewAuditIdentity()` call; do not copy it into a module-scope constant. This preserves the import-time runtime env contract while giving tests a safe seam by temporarily mutating and restoring the exported `env` property. Use `crypto.createHmac("sha256", secret)` over this exact canonical object; property order is part of version `v1`:

```ts
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
```

Before HMAC creation, require `secret` and `Buffer.byteLength(secret, "utf8") >= 32`; otherwise throw `new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable")`. Return only the identity fields above; never return `canonicalCommand` or `normalizedNote`.

- [ ] **Step 7: Extend canonical AuditLog identity without changing best-effort logging**

Add optional fields and index:

```ts
eventId?: string | null;
commandFingerprint?: string | null;
commandFingerprintVersion?: "v1" | null;

eventId: { type: String, required: false, trim: true },
commandFingerprint: { type: String, required: false, trim: true },
commandFingerprintVersion: { type: String, required: false, enum: ["v1"] },

auditLogSchema.index({ eventId: 1 }, { unique: true, sparse: true });
```

Do not set `default: null` on these three schema paths. They must remain absent on historical and unrelated best-effort rows so the sparse unique index does not index repeated `null` values.

Keep `logAdminAction()` unchanged. In `listAuditLogs()`, explicitly exclude fingerprint fields:

```ts
AuditLogModel.find(filter)
  .select("-commandFingerprint -commandFingerprintVersion")
  .sort({ timestamp: -1 })
  .skip(skip)
  .limit(limit)
  .lean<AuditLogEntity[]>();
```

- [ ] **Step 8: Implement idempotency lookup and tests**

`resolveAdminAuditIdempotency()` must check both outbox and canonical AuditLog by `eventId`, and compare actor, target, target id, fingerprint, and version on every row found:

```ts
export async function resolveAdminAuditIdempotency(
  identity: AdminSalesReviewAuditIdentity,
): Promise<"missing" | "match" | "conflict"> {
  try {
    const [outbox, audit] = await Promise.all([
      AdminAuditOutboxModel.findOne({ eventId: identity.eventId })
        .select("actorUid target targetId commandFingerprint commandFingerprintVersion")
        .lean(),
      AuditLogModel.findOne({ eventId: identity.eventId })
        .select("actorUid target targetId commandFingerprint commandFingerprintVersion")
        .lean(),
    ]);
    const matches = (existing: {
      actorUid: string;
      target: string;
      targetId?: string | null;
      commandFingerprint?: string | null;
      commandFingerprintVersion?: string | null;
    }) =>
      existing.actorUid === identity.actorUid &&
      existing.target === identity.target &&
      existing.targetId === identity.targetId &&
      existing.commandFingerprint === identity.commandFingerprint &&
      existing.commandFingerprintVersion === identity.commandFingerprintVersion;
    if (!outbox && !audit) return "missing";
    if ((outbox && !matches(outbox)) || (audit && !matches(audit))) return "conflict";
    return "match";
  } catch {
    throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
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
```

Test outbox-only match, post-TTL AuditLog-only match, both-present match, both-present disagreement returning `conflict`, and a note-only fingerprint conflict.

- [ ] **Step 9: Run focused tests and verify GREEN**

Run:

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/envValidation.test.js backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/auditLog.test.js
```

Expected: all tests pass; persisted fixtures contain neither raw note nor fingerprint secret.

- [ ] **Step 10: Commit Task 1**

```powershell
git add backend/src/models/AdminAuditOutboxModel.ts backend/src/models/auditLogModel.ts backend/src/services/adminAuditOutboxService.ts backend/src/services/auditLogService.ts backend/src/config/env.ts backend/src/config/envValidation.ts backend/src/tests/adminAuditOutbox.test.ts backend/src/tests/envValidation.test.ts backend/src/tests/auditLog.test.ts backend/.env.example render.yaml
git commit -m "feat(admin): define durable audit outbox contracts"
```

---

### Task 2: Build the Leased Audit Dispatcher and Retry Job

**Files:**
- Modify: `backend/src/services/adminAuditOutboxService.ts`
- Create: `backend/src/jobs/adminAuditOutboxJob.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/tests/adminAuditOutbox.test.ts`

**Interfaces:**
- Consumes: `AdminAuditOutboxModel`, `AuditLogModel`, `initializeAdminAuditPersistence()`, safe payload and identity types from Task 1.
- Produces:
  - `dispatchAdminAuditOutboxEvent(eventId?: string): Promise<AdminAuditDispatchResult>`
  - `dispatchAdminAuditOutboxBatch(limit?: number): Promise<AdminAuditDispatchSummary>`
  - `startAdminAuditOutboxJob(): void`
  - `stopAdminAuditOutboxJob(): void`

- [ ] **Step 1: Write failing dispatcher tests**

Lock the result contracts before the tests:

```ts
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
```

Add focused tests for:

```ts
it("claims, upserts one canonical AuditLog, and completes with lease CAS", async () => {
  const claimed = createOutboxFixture({ status: "processing", leaseToken: "lease-1", attempts: 1 });
  let capturedAuditUpdate: AuditLogUpsert | undefined;
  let capturedCompletionFilter: Record<string, unknown> | undefined;
  mockClaimThenComplete(claimed, (filter) => { capturedCompletionFilter = filter; });
  (AuditLogModel as unknown as MockableAuditLogModel).updateOne = async (_filter, update) => {
    capturedAuditUpdate = update;
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: "audit-1" } as never;
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
```

Define the test helpers at the top of the file and restore both original model methods in `afterEach()`:

```ts
const originalOutboxFindOneAndUpdate = AdminAuditOutboxModel.findOneAndUpdate;
const originalAuditUpdateOne = AuditLogModel.updateOne;
const originalAuditFindOne = AuditLogModel.findOne;

afterEach(() => {
  (AdminAuditOutboxModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalOutboxFindOneAndUpdate;
  (AuditLogModel as unknown as { updateOne: unknown }).updateOne = originalAuditUpdateOne;
  (AuditLogModel as unknown as { findOne: unknown }).findOne = originalAuditFindOne;
});

function leanResult<T>(value: T) {
  return { async lean() { return value; } };
}

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

function createOutboxFixture(overrides: Partial<AdminAuditOutboxEntity> = {}): AdminAuditOutboxEntity {
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
    payload: { previousStatus: "pending", newStatus: "excluded", exclusionReason: "test", noteProvided: true, reviewedAt: occurredAt.toISOString() },
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
    action: "reviewAdminSalesOrder",
    target: event.target,
    targetId: event.targetId,
    payload: event.payload,
    ip: null,
    userAgent: null,
    timestamp: event.occurredAt,
    success: true,
  };
}

function mockClaimThenComplete(event: AdminAuditOutboxEntity, capture: (filter: Record<string, unknown>) => void): void {
  let call = 0;
  (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (filter, _update) => {
    call += 1;
    if (call === 1) return leanResult(event);
    capture(filter);
    return leanResult({ ...event, status: "completed", completedAt: new Date() });
  };
}

function mockClaimThenRetry(event: AdminAuditOutboxEntity, capture: (update: OutboxUpdate) => void): void {
  let call = 0;
  (AdminAuditOutboxModel as unknown as MockableOutboxModel).findOneAndUpdate = (_filter, update) => {
    call += 1;
    if (call === 1) return leanResult(event);
    capture(update);
    return leanResult({ ...event, status: "pending" });
  };
}
```

Use these exact additional cases in the same file:

| Test name | Mock condition | Required assertion |
| --- | --- | --- |
| `reclaims an expired processing lease` | claim query returns a processing event whose `lockedUntil < now` | new lease token differs and `attempts` increments |
| `does not complete through a stale lease token` | completion CAS returns `null` | result is `{ status: "lease_lost", eventId }` |
| `accepts the canonical row after a duplicate-key upsert race` | upsert throws `11000`, subsequent AuditLog lookup exactly matches | completion CAS runs once and result is `completed` |
| `rejects a mismatched canonical row after a duplicate-key race` | upsert throws `11000`, subsequent row has another fingerprint | retry stores `audit_validation_failed`; outbox is not completed |
| `accepts a normally matched existing canonical row only after verification` | upsert returns `matchedCount: 1`, subsequent row exactly matches | completion CAS runs once and result is `completed` |
| `rejects a mismatched normally matched canonical row` | upsert returns `matchedCount: 1`, subsequent row has another payload or fingerprint | retry stores `audit_validation_failed`; outbox is not completed |
| `caps retry availability at one hour` | event attempts are `20` | `availableAt - now === 3_600_000` |
| `keeps pending events outside TTL eligibility` | inspect pending fixture and schema indexes | `completedAt` is absent and the only TTL key is `completedAt` |

- [ ] **Step 2: Run dispatcher tests and verify RED**

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminAuditOutbox.test.js
```

Expected: FAIL because dispatch functions do not exist.

- [ ] **Step 3: Implement atomic claim and fencing**

Use one `findOneAndUpdate()` claim with a random UUID lease token:

```ts
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
```

Every complete/retry update must filter `{ eventId, status: "processing", leaseToken }`.

`dispatchAdminAuditOutboxBatch()` repeatedly claims one event until the bounded limit or `not_available`, then returns exact counters:

```ts
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
```

- [ ] **Step 4: Implement canonical idempotent AuditLog materialization**

Use `$setOnInsert` so a crash after audit creation is safe:

```ts
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
      action: "reviewAdminSalesOrder",
      target: event.target,
      targetId: event.targetId,
      payload: event.payload,
      ip: null,
      userAgent: null,
      timestamp: event.occurredAt,
      success: true,
    },
  },
  { upsert: true, runValidators: true },
);
}
```

Import `isDeepStrictEqual` from `node:util` and wrap the upsert in `materializeAdminAuditEvent(event)`. Whether the upsert inserted, matched an existing row normally, or lost a concurrent expired-lease insert race with duplicate key `11000`, always reload the canonical row and treat materialization as success only when actor, target, target id, fingerprint/version, action, success flag, timestamp, and safe payload all match:

```ts
function canonicalAuditMatches(event: AdminAuditOutboxEntity, audit: AuditLogEntity): boolean {
  return audit.eventId === event.eventId &&
    audit.actorUid === event.actorUid &&
    audit.target === event.target &&
    audit.targetId === event.targetId &&
    audit.commandFingerprint === event.commandFingerprint &&
    audit.commandFingerprintVersion === event.commandFingerprintVersion &&
    audit.action === "reviewAdminSalesOrder" &&
    audit.actorEmail == null &&
    audit.ip == null &&
    audit.userAgent == null &&
    audit.success === true &&
    audit.timestamp.getTime() === event.occurredAt.getTime() &&
    isDeepStrictEqual(audit.payload, event.payload);
}

class AdminAuditCanonicalMismatchError extends Error {
  override name = "AdminAuditCanonicalMismatchError";
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
```

This covers a normal matched-existing retry, a worker stopping after audit creation but before outbox completion, and a stale/new worker race without duplicating or accepting a mismatched canonical row. Do not call `logAdminAction()` from the dispatcher.

After materialization, complete only with the current lease token:

```ts
const completed = await AdminAuditOutboxModel.findOneAndUpdate(
  { eventId: event.eventId, status: "processing", leaseToken },
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
```

- [ ] **Step 5: Implement safe retry and monitoring**

Map errors to the fixed enum only and cap backoff at one hour:

```ts
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
```

The retry CAS sets `status: "pending"`, `availableAt`, `lastErrorCode`, `leaseToken: null`, and `lockedUntil: null`; it never stores the original error. If that CAS matches no row, return `lease_lost`. For attempt 3 and later, capture a synthetic safe error rather than the original exception:

```ts
const retried = await AdminAuditOutboxModel.findOneAndUpdate(
  { eventId: event.eventId, status: "processing", leaseToken },
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
```

- [ ] **Step 6: Add startup and periodic job**

Mirror the reconciliation job's guarded runner:

```ts
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
```

In `server.ts`, await index readiness after `connectMongo()` and before any job starts or `app.listen()` is called:

```ts
await connectMongo();
await initializeAdminAuditPersistence();
startFailedReceiptRetryJob();
startPaymentOrderExpiryJob();
startPaymentReconciliationJob();
startAdminAuditOutboxJob();
startTombstoneCleanupJob();
```

Do not catch index initialization locally. Let the existing `bootstrap().catch(...)` report startup failure and exit before accepting requests; this prevents first-request races before unique indexes exist.

- [ ] **Step 7: Run focused tests and verify GREEN**

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminAuditOutbox.test.js
```

Expected: all dispatcher, lease, idempotency, retry, and privacy tests pass.

- [ ] **Step 8: Commit Task 2**

```powershell
git add backend/src/services/adminAuditOutboxService.ts backend/src/jobs/adminAuditOutboxJob.ts backend/src/server.ts backend/src/tests/adminAuditOutbox.test.ts
git commit -m "feat(admin): dispatch durable audit events"
```

---

### Task 3: Make Sales Review and Audit Intent Transactional

**Files:**
- Modify: `backend/src/services/adminSalesReportService.ts`
- Modify: `backend/src/controllers/adminSalesReportController.ts`
- Modify: `backend/src/routes/adminRoutes.ts`
- Modify: `backend/src/tests/adminSalesReportService.test.ts`
- Modify: `backend/src/tests/adminSalesReportRoutes.test.ts`
- Modify: `backend/src/tests/auditLog.test.ts`

**Interfaces:**
- Consumes: identity/idempotency/outbox model and dispatcher trigger from Tasks 1-2.
- Produces:
  - `reviewAdminSalesOrder(input, dependencies?): Promise<{ item: AdminSalesReportRow }>`
  - `ReviewAdminSalesOrderDependencies` with `triggerAuditDispatch(eventId: string): void`
  - required normalized UUID `reviewRequestId`
  - unchanged HTTP response shape `{ item: AdminSalesReportRow }`

- [ ] **Step 1: Write failing service transaction tests**

In `backend/src/tests/adminSalesReportService.test.ts`, place these defaults after Node built-in imports and before project imports:

```ts
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-sales-report-service-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-sales-report-service-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";
```

In both `backend/src/tests/adminSalesReportRoutes.test.ts` and `backend/src/tests/auditLog.test.ts`, keep their existing runtime defaults and add this line before project imports:

```ts
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";
```

Extend the service-test session mock with `withTransaction()` and assert:

```ts
const originalStartSession = mongoose.startSession;

function createSessionMock(): ClientSession {
  return {
    async withTransaction(callback: () => Promise<void>) {
      await callback();
    },
    async endSession() {},
  } as unknown as ClientSession;
}

afterEach(() => {
  (mongoose as unknown as { startSession: unknown }).startSession = originalStartSession;
});

it("commits review and outbox in the same session", async () => {
  const session = createSessionMock();
  (mongoose as unknown as { startSession(): Promise<ClientSession> }).startSession = async () => session;
  await reviewAdminSalesOrder({
    orderId: "VBREVIEW01",
    reviewerUid: "admin_uid",
    reviewRequestId: "11111111-1111-4111-8111-111111111111",
    kpiStatus: "excluded",
    exclusionReason: "test",
    reviewNote: "private note",
  }, { triggerAuditDispatch() {} });
  assert.equal(capturedPaymentOptions.session, session);
  assert.equal(capturedOutboxOptions.session, session);
  assert.equal(capturedOutbox.payload.noteProvided, true);
  assert.equal(JSON.stringify(capturedOutbox).includes("private note"), false);
});
```

Use these exact additional service cases:

| Test name | Mock condition | Required assertion |
| --- | --- | --- |
| `rolls back when the outbox insert fails` | outbox create throws inside `withTransaction` | session abort path runs, PaymentOrder result remains old, error code is `admin_audit_unavailable` |
| `keeps stale review conflict semantics` | optimistic update returns `null` | error is `409 sales_review_conflict`, outbox create count is `0` |
| `does not adopt a newer baseline during a driver transaction retry` | `withTransaction` invokes the callback twice and the second frozen read no longer matches | error is `409 sales_review_conflict`; newer review remains untouched |
| `returns a matching idempotent replay without mutation` | resolver returns `match` | PaymentOrder update/outbox create counts are `0`, current safe row is returned |
| `rejects a reused request id for another target or decision` | resolver returns `conflict` | error is `409 sales_review_idempotency_conflict`, mutation count is `0` |
| `treats a note-only change as idempotency conflict` | same event id, fingerprint differs only by normalized note | error is `409 sales_review_idempotency_conflict` |
| `fails closed when the HMAC secret is absent or short` | temporarily set imported `env.ADMIN_AUDIT_FINGERPRINT_SECRET` to `""` and `"too-short"`, restoring it in `finally` | error is `503 admin_audit_unavailable`, session is never opened |
| `replays a concurrent duplicate after the frozen optimistic check loses` | request A commits; request B has the same request id/command and frozen baseline, then its in-transaction read/update misses and the race resolver returns `match` | request B returns the current safe row; only one mutation, outbox row, and canonical audit exist |
| `rejects a concurrent request-id reuse for another command` | request A commits; request B has the same request id but a different command and its race resolver returns `conflict` | request B returns `409 sales_review_idempotency_conflict` |
| `preserves stale conflict for an unrelated concurrent update` | frozen read/update misses and the race resolver still returns `missing` | error remains `409 sales_review_conflict` |
| `fails closed when transactions are unsupported` | `startSession` or `withTransaction` throws topology error | error is `503 admin_audit_unavailable`, no response item is returned |
| `reports an unknown final commit result` | `withTransaction` throws with `UnknownTransactionCommitResult` label | error is `503 admin_audit_commit_unknown` |
| `resolves the unknown commit retry with the same request id` | next call's resolver returns `match` | no second mutation/outbox insert and current safe row is returned |
| `performs no required query after confirmed commit` | User/Refund mocks succeed before transaction then throw if called again | response succeeds and each dependency query count is exactly `1` |

- [ ] **Step 2: Run service tests and verify RED**

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportService.test.js
```

Expected: FAIL because review input lacks request id and no transaction/outbox session exists.

- [ ] **Step 3: Extend normalized review input**

Import `mongoose` plus `ClientSession`, add `reviewRequestId: unknown` to `ReviewAdminSalesOrderInput`, and validate a canonical UUID. Retain normalized note only inside the mutation service:

```ts
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const rawReviewRequestId = typeof input.reviewRequestId === "string"
  ? input.reviewRequestId.trim()
  : "";
if (!UUID_PATTERN.test(rawReviewRequestId)) {
  throw new ApiError(400, "A valid review request id is required.", undefined, "invalid_sales_review_request_id");
}
const reviewRequestId = rawReviewRequestId.toLowerCase();
```

Generate `reviewedAt`, `eventId`, and HMAC fingerprint once before transaction retries.

Change the exported declaration to `reviewAdminSalesOrder(input: ReviewAdminSalesOrderInput, dependencies: ReviewAdminSalesOrderDependencies = defaultReviewDependencies): Promise<{ item: AdminSalesReportRow }>` and remove `AdminSalesReviewAudit` from its return contract.

- [ ] **Step 4: Add pre-commit response dependency loading and idempotency resolution**

Add these exact local contracts and helpers beside the existing review service. `RawSalesRow` and `serializeSalesRow()` already exist in the same file; do not export them:

```ts
const REVIEW_ORDER_SELECTION =
  "_id orderId userId status purpose amount currency provider completedAt cassoTransactionId " +
  "metadata.payos.payer manualCompletedAt reporting updatedAt";

interface RawReviewOrder extends RawSalesRow {
  _id: unknown;
  userId: string;
  status: "completed";
  purpose: "plus_subscription";
  updatedAt: Date;
  metadata?: { payos?: { payer?: RawSalesPayer | null } | null } | null;
}

interface AdminSalesReviewResponseContext {
  user: { email?: string; displayName?: string } | null;
  refund: { resolvedAt?: Date | null } | null;
}

interface PreloadedAdminSalesReviewResponse {
  order: RawReviewOrder;
  context: AdminSalesReviewResponseContext;
}

const qualifyingReviewFilter = (orderId: string) => ({
  orderId,
  status: "completed",
  purpose: "plus_subscription",
  currency: "VND",
  provider: { $in: [...REAL_PROVIDERS] },
});

async function loadAdminSalesReviewResponse(orderId: string): Promise<PreloadedAdminSalesReviewResponse> {
  const order = await PaymentOrderModel.findOne(qualifyingReviewFilter(orderId))
    .select(REVIEW_ORDER_SELECTION)
    .lean<RawReviewOrder | null>();
  if (!order) {
    throw new ApiError(404, "Qualifying sales order not found.", undefined, "sales_order_not_found");
  }
  const [user, refund] = await Promise.all([
    UserModel.findOne({ firebaseUid: order.userId }).select("email displayName").lean(),
    RefundRequestModel.findOne({ orderId: order.orderId, status: "completed" })
      .select("resolvedAt")
      .sort({ resolvedAt: -1 })
      .lean(),
  ]);
  return { order, context: { user, refund } };
}

function serializeAdminSalesReviewResponse(
  order: RawReviewOrder,
  context: AdminSalesReviewResponseContext,
): AdminSalesReportRow {
  return serializeSalesRow({
    ...order,
    user: context.user,
    refund: context.refund,
    isRefunded: Boolean(context.refund),
    payer: order.metadata?.payos?.payer ?? null,
  });
}
```

Build the identity before any write, then resolve it before opening the transaction:

```ts
const identity = buildAdminSalesReviewAuditIdentity({
  reviewRequestId: normalized.reviewRequestId,
  actorUid: normalized.reviewerUid,
  targetId: normalized.orderId,
  newStatus: normalized.kpiStatus,
  exclusionReason: normalized.exclusionReason,
  reviewNote: normalized.reviewNote,
});
const idempotency = await resolveAdminAuditIdempotency(identity);
if (idempotency === "conflict") {
  throw new ApiError(409, "Review request id was already used for another command.", undefined, "sales_review_idempotency_conflict");
}
const preloaded = await loadAdminSalesReviewResponse(normalized.orderId);
if (idempotency === "match") {
  return { item: serializeAdminSalesReviewResponse(preloaded.order, preloaded.context) };
}
```

For the service-level absent/short-secret case, import `env`, mutate the exported runtime property rather than `process.env`, and restore it even when the assertion fails:

```ts
it("fails closed when the HMAC secret is absent or short", async () => {
  const originalSecret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
  const originalStartSessionForSecretTest = mongoose.startSession;
  let startSessionCount = 0;
  (mongoose as unknown as { startSession(): Promise<ClientSession> }).startSession = async () => {
    startSessionCount += 1;
    return createSessionMock();
  };
  const input = {
    orderId: "VBREVIEW01",
    reviewerUid: "admin_uid",
    reviewRequestId: "11111111-1111-4111-8111-111111111111",
    kpiStatus: "included" as const,
  };
  try {
    for (const invalidSecret of ["", "too-short"]) {
      env.ADMIN_AUDIT_FINGERPRINT_SECRET = invalidSecret;
      await assert.rejects(
        () => reviewAdminSalesOrder(input, { triggerAuditDispatch() {} }),
        (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_unavailable",
      );
      assert.equal(startSessionCount, 0);
    }
  } finally {
    env.ADMIN_AUDIT_FINGERPRINT_SECRET = originalSecret;
    (mongoose as unknown as { startSession: unknown }).startSession = originalStartSessionForSecretTest;
  }
});
```

Run the existing manual-completion note validation against `preloaded.order`. No required User/Refund query may occur after commit.

- [ ] **Step 5: Replace the mutation with one Mongoose transaction**

Add the transaction helpers with locked signatures:

```ts
interface ReviewAdminSalesOrderDependencies {
  triggerAuditDispatch(eventId: string): void;
}

const defaultReviewDependencies: ReviewAdminSalesOrderDependencies = {
  triggerAuditDispatch(eventId) {
    void dispatchAdminAuditOutboxEvent(eventId).catch(() => {
      backendMonitoring.captureBackendException(new Error("Admin audit outbox immediate dispatch failed."), {
        tags: { feature: "admin_audit_outbox", stage: "immediate_dispatch" },
        extra: { eventId },
      });
    });
  },
};

function buildReviewStateFilter(order: RawReviewOrder): Record<string, unknown> {
  return order.reporting?.kpiStatus
    ? { "reporting.kpiStatus": order.reporting.kpiStatus }
    : { $or: [{ reporting: { $exists: false } }, { "reporting.kpiStatus": { $exists: false } }] };
}

function hasMongoErrorLabel(error: unknown, label: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { hasErrorLabel?: (value: string) => boolean; errorLabels?: unknown };
  return candidate.hasErrorLabel?.(label) === true ||
    (Array.isArray(candidate.errorLabels) && candidate.errorLabels.includes(label));
}

function buildAdminSalesReviewOutboxEvent(
  order: RawReviewOrder,
  identity: AdminSalesReviewAuditIdentity,
  reviewedAt: Date,
  decision: ReturnType<typeof normalizeReviewInput>,
): AdminAuditOutboxInsert {
  return {
    ...identity,
    eventType: "admin_sales_reviewed",
    occurredAt: reviewedAt,
    payload: {
      previousStatus: order.reporting?.kpiStatus ?? "pending",
      newStatus: decision.kpiStatus,
      ...(decision.exclusionReason ? { exclusionReason: decision.exclusionReason } : {}),
      noteProvided: Boolean(decision.reviewNote),
      reviewedAt: reviewedAt.toISOString(),
    },
    status: "pending",
    attempts: 0,
    availableAt: reviewedAt,
    leaseToken: null,
    lockedUntil: null,
    lastErrorCode: null,
  };
}
```

Add one race resolver used after a frozen optimistic conflict or duplicate-key event-id race. It rechecks the durable outbox/canonical identity before deciding whether the caller lost an idempotent race or a genuinely unrelated optimistic update:

```ts
async function resolveAdminSalesReviewRace(
  identity: AdminSalesReviewAuditIdentity,
  orderId: string,
): Promise<{ item: AdminSalesReportRow } | null> {
  const raced = await resolveAdminAuditIdempotency(identity);
  if (raced === "match") {
    const current = await loadAdminSalesReviewResponse(orderId);
    return { item: serializeAdminSalesReviewResponse(current.order, current.context) };
  }
  if (raced === "conflict") {
    throw new ApiError(
      409,
      "Review request id was already used for another command.",
      undefined,
      "sales_review_idempotency_conflict",
    );
  }
  return null;
}
```

Place `buildAdminSalesReviewOutboxEvent()` at module scope with the explicit `decision` argument shown above; it must not close over request objects or raw route bodies. Generate the update once with the single `reviewedAt` value before `withTransaction()`:

```ts
const reviewedAt = new Date();
const setFields: Record<string, unknown> = {
  "reporting.kpiStatus": normalized.kpiStatus,
  "reporting.reviewedBy": normalized.reviewerUid,
  "reporting.reviewedAt": reviewedAt,
  "reporting.reviewNote": normalized.reviewNote ?? null,
};
if (normalized.kpiStatus === "excluded") {
  setFields["reporting.exclusionReason"] = normalized.exclusionReason;
}
const update = normalized.kpiStatus === "included"
  ? { $set: setFields, $unset: { "reporting.exclusionReason": "" } }
  : { $set: setFields };
```

Freeze the optimistic baseline from `preloaded.order` before calling `withTransaction()`. Driver-level callback retries must reuse this exact filter rather than adopting a newer review state:

```ts
const frozenOptimisticFilter = {
  ...qualifyingReviewFilter(normalized.orderId),
  _id: preloaded.order._id,
  updatedAt: preloaded.order.updatedAt,
  ...buildReviewStateFilter(preloaded.order),
};
```

Use `session.withTransaction()` and pass the same session to the frozen in-transaction qualifying read, optimistic update, and outbox create. Session acquisition is inside the mapped `try` so connection/topology failures also become `admin_audit_unavailable`:

```ts
let session: ClientSession | undefined;
let committedOrder: RawReviewOrder | null = null;
try {
  session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const existing = await PaymentOrderModel.findOne(frozenOptimisticFilter, null, { session })
      .select(REVIEW_ORDER_SELECTION)
      .lean<RawReviewOrder | null>();
    if (!existing) {
      throw new ApiError(409, "This sales review changed elsewhere. Reload and retry.", undefined, "sales_review_conflict");
    }

    const updated = await PaymentOrderModel.findOneAndUpdate(
      frozenOptimisticFilter,
      update,
      { new: true, runValidators: true, session },
    ).lean<RawReviewOrder | null>();
    if (!updated) throw new ApiError(409, "This sales review changed elsewhere. Reload and retry.", undefined, "sales_review_conflict");

    await AdminAuditOutboxModel.create([
      buildAdminSalesReviewOutboxEvent(existing, identity, reviewedAt, normalized),
    ], { session });
    committedOrder = updated;
  }, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary",
  });
} catch (error) {
  if (error instanceof ApiError && error.errorCode === "sales_review_conflict") {
    const replay = await resolveAdminSalesReviewRace(identity, normalized.orderId);
    if (replay) return replay;
    throw error;
  }
  if (error instanceof ApiError) throw error;
  if (hasMongoErrorLabel(error, "UnknownTransactionCommitResult")) {
    throw new ApiError(503, "Sales review commit result is unknown. Retry the same action.", undefined, "admin_audit_commit_unknown");
  }
  if (isDuplicateAdminAuditEventIdError(error)) {
    const replay = await resolveAdminSalesReviewRace(identity, normalized.orderId);
    if (replay) return replay;
  }
  throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
} finally {
  if (session) {
    try {
      await session.endSession();
    } catch {
      backendMonitoring.captureBackendException(new Error("Admin sales review session cleanup failed."), {
        tags: { feature: "admin_audit_outbox", stage: "session_cleanup" },
        extra: { eventId: identity.eventId },
      });
    }
  }
}

if (!committedOrder) {
  throw new ApiError(503, "Admin audit storage is unavailable. Retry later.", undefined, "admin_audit_unavailable");
}
try {
  dependencies.triggerAuditDispatch(identity.eventId);
} catch {
  backendMonitoring.captureBackendException(new Error("Admin audit outbox immediate dispatch scheduling failed."), {
    tags: { feature: "admin_audit_outbox", stage: "dispatch_schedule" },
    extra: { eventId: identity.eventId },
  });
}
return { item: serializeAdminSalesReviewResponse(committedOrder, preloaded.context) };
```

Set the function default as `dependencies: ReviewAdminSalesOrderDependencies = defaultReviewDependencies`. Tests pass `{ triggerAuditDispatch() {} }`. The HMAC identity and `reviewedAt` are created once outside `withTransaction()` so driver-level retries reuse them.

- [ ] **Step 6: Write failing route/audit ownership tests**

Update route bodies to include UUID. Extend the route-test mocks with `mongoose.startSession`, `AdminAuditOutboxModel.create`, and `AdminAuditOutboxModel.findOneAndUpdate`; return `null` from the immediate dispatch claim. Assert successful PATCH creates one outbox event and zero direct `AuditLogModel.create()` calls. Assert validation/auth/transaction failures still use one safe failed-attempt audit, and restore every mocked model/session method in `afterEach()`.

- [ ] **Step 7: Disable only this route's wrapper success audit**

Add the defaulted option:

```ts
interface AuditedAdminActionOptions {
  action: string;
  target: string;
  getTargetId?: (req: Request) => string | null | undefined;
  getAuditPayload?: (req: Request, res: Response) => unknown;
  validators?: RequestHandler[];
  handler: AdminHandler;
  logSuccess?: boolean;
}

if (options.logSuccess !== false) {
  await logAdminAction({
    req,
    action: options.action,
    target: options.target,
    targetId,
    payload: options.getAuditPayload?.(req, res) ?? req.body,
    success: true,
  });
}
```

Configure the sales-review route exactly as follows, pass `reviewRequestId` from the controller, and remove `res.locals.adminSalesReviewAudit` success ownership:

```ts
adminRoutes.patch(
  "/admin/reports/sales/:orderId/review",
  auditedAdminAction({
    action: "reviewAdminSalesOrder",
    target: "payment_order_sales_reporting",
    getTargetId: (req) => req.params.orderId?.trim().toUpperCase(),
    getAuditPayload: (req) => getSalesReviewAuditFallbackPayload(req.body),
    validators: [validateOrderIdParam, validateOptionalJsonObjectBody],
    handler: reviewAdminSalesOrderController,
    logSuccess: false,
  }),
);
```

The controller includes `reviewRequestId: req.body?.reviewRequestId` in the service input and responds directly with `successResponse({ item: result.item })`.

- [ ] **Step 8: Run focused backend tests and verify GREEN**

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/adminAuditOutbox.test.js
```

Expected: transaction, error mapping, idempotency, privacy, and no-duplicate-success-audit cases all pass.

- [ ] **Step 9: Commit Task 3**

```powershell
git add backend/src/services/adminSalesReportService.ts backend/src/controllers/adminSalesReportController.ts backend/src/routes/adminRoutes.ts backend/src/tests/adminSalesReportService.test.ts backend/src/tests/adminSalesReportRoutes.test.ts backend/src/tests/auditLog.test.ts backend/src/tests/adminAuditOutbox.test.ts
git commit -m "fix(admin): make sales review audit durable"
```

---

### Task 4: Add Frontend Request Idempotency and Retry Reuse

**Files:**
- Modify: `src/services/adminService.ts`
- Modify: `src/services/adminService.test.ts`
- Modify: `src/app/components/admin/sales/AdminSalesReviewDialog.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.tsx`
- Modify: `src/app/pages/AdminSalesReportPage.test.tsx`

**Interfaces:**
- Consumes: backend-required UUID request contract from Task 3.
- Produces:
  - `AdminSalesReviewDecisionPayload`
  - `AdminReviewSalesOrderPayload extends AdminSalesReviewDecisionPayload`
  - one stable UUID per unchanged retryable command.

- [ ] **Step 1: Write failing API and page retry tests**

Update `src/services/adminService.test.ts` to expect the UUID in the PATCH body. Add a page test that fails once, clicks confirm again without changing fields, and asserts both calls reuse the same UUID:

```ts
const firstPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[0][1];
const secondPayload = adminServiceMock.adminReviewSalesOrder.mock.calls[1][1];
expect(firstPayload.reviewRequestId).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);
expect(secondPayload.reviewRequestId).toBe(firstPayload.reviewRequestId);
```

Add another test that changes the note after failure and expects a new UUID.

- [ ] **Step 2: Run frontend tests and verify RED**

```powershell
npm.cmd run test:ui -- src/services/adminService.test.ts src/app/pages/AdminSalesReportPage.test.tsx
```

Expected: FAIL because the payload has no `reviewRequestId` and retry state is not retained.

- [ ] **Step 3: Split decision and request payload types**

```ts
export interface AdminSalesReviewDecisionPayload {
  kpiStatus: "included" | "excluded";
  exclusionReason?: AdminSalesExclusionReason;
  reviewNote?: string;
}

export interface AdminReviewSalesOrderPayload extends AdminSalesReviewDecisionPayload {
  reviewRequestId: string;
}
```

Keep the dialog responsible only for the decision payload; keep API transport responsible for the required request id.

- [ ] **Step 4: Generate and reuse UUID by canonical command**

In the page, canonicalize the same normalized decision fields as the backend and retain `{ commandKey, reviewRequestId }` in a ref:

```ts
const reviewRequestRef = useRef<{ commandKey: string; reviewRequestId: string } | null>(null);

function buildReviewCommandKey(orderId: string, decision: AdminSalesReviewDecisionPayload): string {
  return JSON.stringify({
    orderId,
    kpiStatus: decision.kpiStatus,
    exclusionReason: decision.kpiStatus === "excluded" ? decision.exclusionReason ?? null : null,
    reviewNote: decision.reviewNote?.trim().slice(0, 500) || null,
  });
}

const handleReview = async (decision: AdminSalesReviewDecisionPayload) => {
  if (!reviewItem) return;
  const commandKey = buildReviewCommandKey(reviewItem.orderId, decision);
  const current = reviewRequestRef.current;
  const reviewRequestId = current?.commandKey === commandKey
    ? current.reviewRequestId
    : crypto.randomUUID();
  reviewRequestRef.current = { commandKey, reviewRequestId };
  try {
    setReviewBusy(true);
    setReviewError(null);
    await adminReviewSalesOrder(reviewItem.orderId, { ...decision, reviewRequestId });
    reviewRequestRef.current = null;
    await loadReport(activeParams);
    setReviewItem(null);
    toast.success("Đã cập nhật trạng thái KPI.");
  } catch (error) {
    setReviewError(getErrorMessage(error, "Không thể lưu duyệt KPI. Thử lại."));
  } finally {
    setReviewBusy(false);
  }
};
```

Replace the current row/open callbacks so a different action cannot inherit an old UUID:

```tsx
onReview={(item) => {
  reviewRequestRef.current = null;
  setReviewError(null);
  setReviewItem(item);
}}

onOpenChange={(open) => {
  if (!open && !reviewBusy) {
    reviewRequestRef.current = null;
    setReviewItem(null);
  }
}}
```

Preserve the ref only after an error while the dialog stays open and the canonical command is unchanged.

- [ ] **Step 5: Run frontend tests and verify GREEN**

```powershell
npm.cmd run test:ui -- src/services/adminService.test.ts src/app/pages/AdminSalesReportPage.test.tsx
npm.cmd run typecheck
```

Expected: API body, same-command retry, changed-command UUID, dialog validation, and report reload tests pass.

- [ ] **Step 6: Commit Task 4**

```powershell
git add src/services/adminService.ts src/services/adminService.test.ts src/app/components/admin/sales/AdminSalesReviewDialog.tsx src/app/pages/AdminSalesReportPage.tsx src/app/pages/AdminSalesReportPage.test.tsx
git commit -m "feat(admin): make sales review retries idempotent"
```

---

### Task 5: Prove Transactions on a Real Replica Set and Document Deployment

**Files:**
- Create: `backend/src/tests/adminSalesReviewTransaction.integration.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/PRODUCTION_ENV_CHECKLIST.md`

**Interfaces:**
- Consumes: completed transactional service and `MONGODB_TRANSACTION_TEST_URI`.
- Produces: CI evidence that MongoDB commits or rolls back the review/outbox pair atomically.

- [ ] **Step 1: Write the opt-in replica-set integration test**

Place the environment defaults before project imports, use a unique order/request prefix, and skip only when the transaction URI is absent:

```ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import mongoose from "mongoose";

const transactionUri = process.env.MONGODB_TRANSACTION_TEST_URI;
process.env.MONGODB_URI ??= transactionUri ?? "mongodb://127.0.0.1:27017/admin-sales-review-transaction-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-sales-review-transaction-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { AuditLogModel } from "../models/auditLogModel";
import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { initializeAdminAuditPersistence } from "../services/adminAuditOutboxService";
import { reviewAdminSalesOrder } from "../services/adminSalesReportService";
import { ApiError } from "../utils/apiError";

it("atomically commits or rolls back the sales review and outbox", { skip: !transactionUri }, async () => {
  const appName = "admin-sales-review-transaction-test";
  await mongoose.connect(transactionUri!, { appName });
  const suffix = Date.now().toString(36).slice(-8).toUpperCase();
  const orderId = `VB${suffix}`;
  const userId = `audit_tx_${suffix}`;
  const commitRequestId = randomUUID();
  const rollbackRequestId = randomUUID();
  const noDispatch = { triggerAuditDispatch() {} };

  try {
    await initializeAdminAuditPersistence();
    const [outboxIndexes, auditIndexes] = await Promise.all([
      AdminAuditOutboxModel.collection.indexes(),
      AuditLogModel.collection.indexes(),
    ]);
    assert.ok(outboxIndexes.some((index) => index.key.eventId === 1 && index.unique === true));
    assert.ok(outboxIndexes.some((index) =>
      index.key.completedAt === 1 && index.expireAfterSeconds === 2_592_000,
    ));
    assert.ok(auditIndexes.some((index) =>
      index.key.eventId === 1 && index.unique === true && index.sparse === true,
    ));

    await UserModel.create({ firebaseUid: userId, email: `${userId}@example.test`, displayName: "Audit transaction fixture", role: "user" });
    await PaymentOrderModel.create({
      orderId,
      userId,
      planCode: "PLUS",
      billingCycle: "twelve_week",
      amount: 99000,
      currency: "VND",
      status: "completed",
      provider: "payos",
      purpose: "plus_subscription",
      bankAccount: "payos",
      bankName: "payos",
      accountName: "PayOS",
      description: orderId,
      qrDataUrl: "https://example.test/qr",
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    await reviewAdminSalesOrder({
      orderId,
      reviewerUid: "admin_uid",
      reviewRequestId: commitRequestId,
      kpiStatus: "included",
    }, noDispatch);
    assert.equal(await PaymentOrderModel.countDocuments({ orderId, "reporting.kpiStatus": "included" }), 1);
    assert.equal(await AdminAuditOutboxModel.countDocuments({ targetId: orderId }), 1);

    const adminDb = mongoose.connection.db!.admin();
    await adminDb.command({
      configureFailPoint: "failCommand",
      mode: { times: 1 },
      data: { failCommands: ["insert"], appName, errorCode: 121 },
    });
    await assert.rejects(
      reviewAdminSalesOrder({
        orderId,
        reviewerUid: "admin_uid",
        reviewRequestId: rollbackRequestId,
        kpiStatus: "excluded",
        exclusionReason: "test",
      }, noDispatch),
      (error: unknown) => error instanceof ApiError &&
        error.statusCode === 503 &&
        error.errorCode === "admin_audit_unavailable",
    );
    const unchanged = await PaymentOrderModel.findOne({ orderId }).lean();
    assert.equal(unchanged?.reporting?.kpiStatus, "included");
    assert.equal(await AdminAuditOutboxModel.countDocuments({ targetId: orderId }), 1);
  } finally {
    await mongoose.connection.db?.admin().command({ configureFailPoint: "failCommand", mode: "off" }).catch(() => undefined);
    await Promise.all([
      AdminAuditOutboxModel.deleteMany({ targetId: orderId }),
      AuditLogModel.deleteMany({ targetId: orderId }),
      PaymentOrderModel.deleteMany({ orderId }),
      RefundRequestModel.deleteMany({ orderId }),
      UserModel.deleteMany({ firebaseUid: userId }),
    ]);
    await mongoose.disconnect();
  }
});
```

Import `randomUUID` from `node:crypto` and all five models/services used by the test. The failpoint is scoped to the integration connection's `appName`, so parallel backend tests cannot consume it. Error code `121` (`DocumentValidationFailure`) is intentionally non-transient so Mongoose does not retry the failed outbox insert into a later success. Do not drop a shared database; the `finally` block deletes only this generated fixture.

- [ ] **Step 2: Run without URI and verify the skip is explicit**

```powershell
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReviewTransaction.integration.test.js
```

Expected locally without URI: one explicit skipped test, zero failures.

- [ ] **Step 3: Add MongoDB 7 replica-set startup to backend CI**

Before backend tests, start and initialize a dedicated container:

```yaml
- name: Start MongoDB replica set
  run: |
    docker run -d --name vision-board-mongo-rs -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all --setParameter enableTestCommands=1
    ready=0
    for i in {1..30}; do
      if docker exec vision-board-mongo-rs mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'; then ready=1; break; fi
      sleep 1
    done
    test "$ready" -eq 1
    docker exec vision-board-mongo-rs mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
    primary=0
    for i in {1..30}; do
      if docker exec vision-board-mongo-rs mongosh --quiet --eval 'if (!db.hello().isWritablePrimary) quit(1)'; then primary=1; break; fi
      sleep 1
    done
    test "$primary" -eq 1
```

Replace the existing plain `MONGODB_URI` seed and append these exact values to `$GITHUB_ENV` in the existing `Seed backend test env` step:

```bash
echo "MONGODB_URI=mongodb://127.0.0.1:27017/vision-board-ci?replicaSet=rs0&directConnection=true" >> "$GITHUB_ENV"
echo "MONGODB_TRANSACTION_TEST_URI=mongodb://127.0.0.1:27017/vision-board-ci-transactions?replicaSet=rs0&directConnection=true" >> "$GITHUB_ENV"
echo "ADMIN_AUDIT_FINGERPRINT_SECRET=vision-board-ci-admin-audit-fingerprint-secret-32-bytes-minimum" >> "$GITHUB_ENV"
```

Add this final backend-job step; it is CI fixture cleanup, not application rollback:

```yaml
- name: Stop MongoDB replica set
  if: always()
  run: docker rm -f vision-board-mongo-rs || true
```

- [ ] **Step 4: Document production operations**

Update the production checklist with:

- Render must set `ADMIN_AUDIT_FINGERPRINT_SECRET` as a stable secret of at least 32 random bytes.
- Mongo must be Atlas/replica-set topology with transactions enabled.
- Rotation requires an approved previous-secret overlap implementation; do not rotate this secret independently in the initial version.
- Release smoke: review one staging order, confirm one outbox row and one canonical audit row, and inspect both for forbidden data.

- [ ] **Step 5: Run CI-equivalent backend verification**

With a local/container replica-set URI configured:

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/envValidation.test.js backend/dist/tests/adminSalesReviewTransaction.integration.test.js
```

Expected: all focused tests pass and the integration test is not skipped.

- [ ] **Step 6: Commit Task 5**

```powershell
git add backend/src/tests/adminSalesReviewTransaction.integration.test.ts .github/workflows/ci.yml docs/PRODUCTION_ENV_CHECKLIST.md
git commit -m "test(admin): verify durable audit transactions"
```

---

### Task 6: Whole-Feature Verification and Review Closure

**Files:**
- Verify only; edit production/test files only when a failure is caused by this feature.
- Restore only approved generated artifacts if tests recreate them:
  - `src/test/ux-ui-upgrade/_scan-report.txt`
  - `src/app/components/layout/__snapshots__/PrimaryActionCard.test.tsx.snap`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: verified feature range ready for final whole-branch review.

- [ ] **Step 1: Run focused backend and frontend tests**

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/adminSalesReportModel.test.js backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/envValidation.test.js backend/dist/tests/adminSalesReviewTransaction.integration.test.js
npm.cmd run test:ui -- src/services/adminService.test.ts src/app/pages/AdminSalesReportPage.test.tsx src/app/routes.admin-sales.test.tsx src/app/components/admin/AdminSidebar.test.tsx
```

Expected: zero failures; integration test must run when `MONGODB_TRANSACTION_TEST_URI` is configured.

- [ ] **Step 2: Run broad static/build verification**

```powershell
npm.cmd --prefix backend run check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run broader test suites where environment permits**

```powershell
npm.cmd --prefix backend run test:run
npm.cmd run test:run
```

Expected: zero feature-related failures. If backend full tests are blocked by Firebase/env, report the exact missing variable. Keep the existing Windows `public/icon.svg` hash baseline and flaky gallery date fixture out of this feature scope.

- [ ] **Step 4: Inspect privacy and scope diffs**

```powershell
git diff --check f2770c5d..HEAD
git diff --name-only f2770c5d..HEAD
rg -n "reviewNote|customerEmail|firebaseUid|bankAccount|provider payload|ADMIN_AUDIT_FINGERPRINT_SECRET" backend/src/models/AdminAuditOutboxModel.ts backend/src/services/adminAuditOutboxService.ts backend/src/services/adminSalesReportService.ts backend/src/models/auditLogModel.ts
```

Confirm only allowlisted payload facts are persisted and the secret is referenced only as env/key material, never logged or serialized.

- [ ] **Step 5: Run fresh TERRA whole-feature review**

Review the precise feature range `f2770c5d..HEAD` for Critical/Important findings, specifically atomicity, unknown commit handling, HTTP idempotency, lease fencing, privacy, route duplicate audits, frontend retry reuse, CI replica-set realism, and unrelated billing invariants.

- [ ] **Step 6: Close review findings and re-verify**

For each accepted finding, use a fresh implementer/reviewer TERRA pair, run the smallest failing/passing test cycle, commit only scoped fixes, and repeat Step 1 plus affected broad checks. Do not claim completion while any Critical/Important finding remains.

## Plan Completion Gate

- Every task has its own red/green evidence, scoped commit, and fresh review.
- Backend transaction integration runs against a real replica set in CI.
- Frontend retries reuse the UUID only for the unchanged command.
- Successful review creates one durable outbox event and eventually one canonical audit row.
- No direct success audit is emitted by the route wrapper.
- No raw note, customer PII, bank/provider data, raw error, or fingerprint secret is persisted/logged.
- Worktree is clean, feature range is `f2770c5d..HEAD`, and no push occurs without user instruction.
