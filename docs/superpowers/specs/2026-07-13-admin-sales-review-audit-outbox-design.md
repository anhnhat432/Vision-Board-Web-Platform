# Durable Admin Sales Review Audit Outbox Design

## 1. Context & Goal

- Bug: `PATCH /api/admin/reports/sales/:orderId/review` currently persists the KPI review before the route writes its success audit entry, while `logAdminAction()` deliberately swallows audit-write failures.
- Why now: a successful review can therefore change reportable KPI totals without leaving the required Admin audit trail.
- Goal: make every successful sales-review mutation inseparable from a durable, privacy-safe audit intent, then materialize that intent into the existing `AuditLog` collection with idempotent retries.
- User impact: Admin review remains responsive, while temporary audit-log failures can no longer create an unaudited KPI decision.
- Modes affected: protected `real`-mode Admin backend only. Demo billing, checkout, payment completion, entitlements, receipts, refunds, and frontend localStorage are unchanged.

## 2. Surface Classification

- Type: `Core`.
- Touched domains: sales-review mutation, `PaymentOrder`, Admin audit logging, MongoDB transactions, backend retry jobs, and operational error reporting.
- Existing invariants that must not break:
  - Reporting review never changes payment status, subscription state, entitlement grants, receipt state, refund state, or provider data.
  - A stale optimistic review still returns `409 sales_review_conflict` without overwriting the newer decision.
  - The review note may be persisted on the protected `PaymentOrder.reporting` subdocument, but raw note text must not enter the outbox or `AuditLog`.
  - Success may be reported only after both the review mutation and its audit intent are durably committed.
  - Customer receipt evidence, entitlement authority, and Admin audit evidence remain separate flows.

## 3. Actors & Entry Points

- Primary actor: authenticated Admin reviewing a qualifying real-provider Plus transaction.
- Secondary actor: operator reading the existing Admin audit-log surface.
- API entry point: `PATCH /api/admin/reports/sales/:orderId/review`.
- Frontend touchpoint: the review dialog generates one UUID `reviewRequestId` per confirmed action and reuses it for an in-place retry of that action.
- Background entry points: one immediate best-effort dispatch after commit, one startup drain, and the existing in-process job pattern for periodic retries.
- Backend touchpoints:
  - `PaymentOrderModel`
  - new `AdminAuditOutboxModel`
  - `AuditLogModel`
  - sales-report review service/controller/route
  - Admin audit service
  - backend server job startup

## 4. Functional Requirements

### 4.1 Atomic review and audit intent

1. WHEN a valid sales review is submitted, THE system SHALL open one MongoDB session and transaction before changing `PaymentOrder.reporting`.
2. WITHIN the same transaction, THE system SHALL apply the existing qualifying-order and optimistic-concurrency filters and SHALL insert exactly one durable Admin audit outbox event for the resulting review decision.
3. WHEN either the review update or outbox insert fails before a confirmed commit for an infrastructure reason, THE system SHALL abort the transaction, leave the previous review state unchanged, and return `503 admin_audit_unavailable`.
4. WHEN the optimistic-concurrency update matches no order, THE system SHALL abort without creating an outbox event and SHALL retain the existing `409 sales_review_conflict` response.
5. WHEN the transaction commits successfully, THE system MAY return success before the canonical `AuditLog` document is materialized because the audit intent is already durable.
6. WHERE MongoDB transactions are unsupported, unavailable, or exhaust their transient retry policy before commit, THE system SHALL fail closed without changing the review and SHALL return `503 admin_audit_unavailable`; WHERE the final commit result remains unknown, THE system SHALL return `503 admin_audit_commit_unknown` and SHALL require any retry to reuse the same `reviewRequestId` so the eventual outcome is resolved idempotently.
7. AFTER a successful commit, THE system SHALL perform no required response-building query whose failure could turn the committed mutation into an application-level error; any user/refund data needed for the response SHALL be loaded before the transaction or the response SHALL be derived from already available data.
8. THE frontend SHALL send a valid UUID `reviewRequestId` with every review command, SHALL generate it once per confirmed action, and SHALL reuse it while retrying the same failed or timed-out action without a page reload.
9. THE backend SHALL derive one deterministic outbox `eventId` from `reviewRequestId`, SHALL derive one opaque `commandFingerprint` from the canonical normalized command including raw review-note content, and SHALL reuse both values across driver-level transaction retries.
10. THE `commandFingerprint` SHALL use versioned HMAC-SHA-256 with a stable server-side `ADMIN_AUDIT_FINGERPRINT_SECRET` that is never stored in the outbox or `AuditLog`; the fingerprint SHALL never expose the canonical command input and SHALL be used only for idempotency comparison and operational diagnosis.
11. WHEN the same `eventId` already exists in either the outbox or canonical `AuditLog` with the same actor, target, and `commandFingerprint`, THE system SHALL treat the command as an idempotent replay, SHALL perform no new mutation or audit insert, and SHALL return the current privacy-safe sales row.
12. WHEN an existing `eventId` is reused with a different actor, target, or `commandFingerprint`, THE system SHALL return `409 sales_review_idempotency_conflict` without changing review state, including when only the raw review-note content differs.

### 4.2 Outbox materialization and retry

13. EACH outbox event SHALL have a globally unique `eventId`, command fingerprint, event type, actor UID, target type, target order id, safe payload, occurrence time, processing state, attempt count, next-attempt time, lease expiry, safe error code, and completion time.
14. THE safe sales-review payload SHALL contain only the previous KPI status, new KPI status, optional exclusion reason, `noteProvided`, and review timestamp; reviewer identity SHALL use the top-level actor UID.
15. THE outbox event SHALL NOT contain actor email, raw review-note text, customer email/name, customer application `userId`/UID, bank/account data, checkout data, provider payloads, secrets, IP address, or user-agent data; the opaque command fingerprint is permitted.
16. WHEN an outbox event is dispatched, THE worker SHALL atomically claim it with a bounded lease and unique lease token so only the current claimant may complete or reschedule it; duplicate delivery after lease expiry SHALL remain safe through `eventId` idempotency.
17. WHEN materialization succeeds, THE worker SHALL create or reuse one `AuditLog` document keyed by `eventId`, then mark the outbox event completed.
18. THE materialized `AuditLog` SHALL preserve `eventId`, `commandFingerprint`, `commandFingerprintVersion`, action `reviewAdminSalesOrder`, target `payment_order_sales_reporting`, target order id, actor UID, the exact safe payload, `success: true`, and `timestamp = occurredAt`; optional actor email, IP, and user-agent fields SHALL be `null`.
19. WHEN a worker stops after creating `AuditLog` but before marking the outbox event completed, THE next retry SHALL reuse the same `AuditLog` document and SHALL NOT create a duplicate audit entry.
20. WHEN materialization fails, THE worker SHALL retain the event, increment its attempt metadata, store an allowlisted `lastErrorCode`, release or expire the lease, and schedule a capped-backoff retry.
21. THE allowed operational error codes SHALL be bounded categories such as `mongo_unavailable`, `audit_validation_failed`, `lease_lost`, or `unknown_safe`; raw exception messages, stack traces, and reflected document values SHALL NOT be persisted or attached to Sentry/log context.
22. PENDING or retrying events SHALL NOT be automatically deleted or moved to a terminal state that prevents later recovery.
23. COMPLETED outbox events SHALL be retained for 30 days and then MAY be removed by MongoDB TTL; pending or retrying events SHALL have no TTL expiry.
24. REPEATED materialization failures SHALL be reported through existing server logging/Sentry with `eventId`, event type, target id, attempt count, and allowlisted error code only.

### 4.3 Route audit ownership

25. THE sales-review handler SHALL own its successful durable audit event and SHALL NOT also emit the current route-wrapper success audit, preventing duplicate records.
26. WHEN authentication, validation, concurrency, or transaction processing fails before a review commit, THE route MAY retain the existing best-effort failed-attempt audit because no protected state change has occurred.
27. OTHER Admin routes SHALL retain their current audit behavior; this change SHALL NOT silently redefine durability semantics for unrelated mutations.

## 5. Data, Storage, and Sync Constraints

- localStorage keys/shapes touched: none.
- `PaymentOrder.reporting` shape: unchanged.
- Review API request change: add required `reviewRequestId: string` UUID; the response shape remains unchanged.
- New backend secret: `ADMIN_AUDIT_FINGERPRINT_SECRET`, at least 32 random bytes, configured only through local/deployment env and required by real-mode production validation.
- New backend collection: `AdminAuditOutbox`.
- Minimum outbox state:

```ts
interface AdminAuditOutboxEvent {
  eventId: string;
  reviewRequestId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
  eventType: "admin_sales_reviewed";
  actorUid: string;
  target: "payment_order_sales_reporting";
  targetId: string;
  occurredAt: Date;
  payload: {
    previousStatus: "pending" | "included" | "excluded";
    newStatus: "included" | "excluded";
    exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
    noteProvided: boolean;
    reviewedAt: string;
  };
  status: "pending" | "processing" | "completed";
  attempts: number;
  availableAt: Date;
  leaseToken?: string | null;
  lockedUntil?: Date | null;
  lastErrorCode?: "mongo_unavailable" | "audit_validation_failed" | "lease_lost" | "unknown_safe" | null;
  completedAt?: Date | null;
}
```

- Required indexes:
  - unique `{ eventId: 1 }` on the outbox;
  - dispatch lookup on `{ status: 1, availableAt: 1, lockedUntil: 1 }`;
  - completed-event TTL on `completedAt` with `expireAfterSeconds: 2592000`;
  - unique sparse `{ eventId: 1 }` on `AuditLog` for idempotent materialization and compatibility with historical audit rows.
- `AuditLog.eventId`, `AuditLog.commandFingerprint`, and its version remain optional for historical and unrelated audit rows, but are required on every materialized outbox event.
- The HMAC canonical input includes `reviewRequestId`, actor UID, target order id, KPI status, normalized exclusion reason, and normalized review-note text; neither the input, raw note, nor HMAC secret is stored in outbox/AuditLog or returned by the audit-list API.
- Idempotency lookup checks both the live/completed outbox and `AuditLog.eventId`, so a legitimate retry remains a no-op after completed outbox TTL cleanup.
- Transaction boundary: qualifying-order read, optimistic review update, and outbox insert use the same Mongoose `ClientSession`.
- Sync ordering: unrelated to frontend workspace sync/outbox.
- Deployment assumption: production `MONGODB_URI` targets MongoDB Atlas or another transaction-capable replica set.
- Rollback: disabling the dispatcher leaves durable pending events available for recovery; rolling back the review mutation code must not delete outbox or canonical audit data.

## 6. Architecture and Components

### Review transaction orchestrator

- Normalizes and validates the existing review payload before opening a transaction where possible.
- Validates `reviewRequestId`, derives the deterministic `eventId` and salted command fingerprint, and checks existing outbox/AuditLog records before mutation; a duplicate-key race aborts and re-enters the same idempotency-resolution path.
- Preloads any non-mutating response dependencies before the commit boundary.
- Starts a Mongoose session, reads the qualifying order in-session, preserves the current optimistic filter, updates reporting metadata, and inserts the safe outbox event.
- Commits only when both writes succeed and always aborts/ends the session on failure.
- Returns the existing privacy-safe sales row and audit metadata contract without exposing the outbox document.

### Audit outbox dispatcher

- Claims a bounded batch of available events using an atomic lease operation.
- Completes or reschedules a claim only when its `eventId` and lease token still match, preventing a stale worker from overwriting a newer claim.
- Materializes each event into the existing `AuditLog` collection using `eventId` as the idempotency key.
- Marks success or schedules a bounded-backoff retry without blocking unrelated events.
- Stores and reports only allowlisted operational error codes, never raw exception messages or stack traces.
- Runs after backend startup, periodically using the repository's existing job style, and best-effort immediately after a review commit.
- Does not require a new Admin UI in this scope.

### Route integration

- Keeps `requireAdmin` and current request validators.
- Suppresses only the route wrapper's success audit for this endpoint because the handler now owns durable success auditing.
- Keeps safe failed-attempt logging without allowing its failure to mask the original request error.

## 7. Non-functional Requirements

- Performance:
  - transaction work is limited to one qualifying-order read, one optimistic update, and one outbox insert;
  - dispatcher batch size and claim lease are bounded;
  - immediate dispatch must not extend the API success critical path.
- Reliability:
  - no successful review exists without a committed outbox event;
  - dispatcher retries are idempotent and safe across process crashes and multiple instances;
  - a stuck lease becomes reclaimable after expiry.
- Observability:
  - record safe attempt counts and allowlisted error codes;
  - alert repeated failures through existing Sentry/logging;
  - never log raw outbox documents when payload safety is uncertain.
- Security/privacy:
  - use an explicit payload allowlist rather than the generic request body;
  - persist no raw review note or payer/customer/provider data in the outbox;
  - never log, return, or persist `ADMIN_AUDIT_FINGERPRINT_SECRET`;
  - fail production env validation when the fingerprint secret is missing or too short;
  - keep all endpoints protected by current Admin authorization.

## 8. Error and Recovery States

- Validation failure: no session write, no success event, existing client-safe `400` response.
- Invalid or conflicting `reviewRequestId`: no session write; return `400` for malformed UUID or `409 sales_review_idempotency_conflict` for conflicting reuse.
- Stale review: transaction abort, no outbox event, existing `409` response.
- Transaction/outbox failure before commit: review unchanged, `503 admin_audit_unavailable`.
- Unknown final commit result: return `503 admin_audit_commit_unknown`; the UI retains and reuses the same request id for retry resolution.
- Immediate dispatch failure: API remains successful because the event is durable; periodic retry owns recovery.
- Dispatcher crash during claim: lease expires and another worker reclaims the event.
- Dispatcher crash after `AuditLog` upsert: retry reuses `eventId` and completes without duplication.
- Long-running audit outage: pending events remain durable, backoff is capped, and operational alerts identify the affected event ids without PII.

## 9. Out of Scope

- Converting every Admin action to durable outbox semantics.
- A generic message bus, external queue, Kafka, RabbitMQ, or new managed infrastructure.
- A new Admin screen for outbox inspection or manual replay.
- Changing sales-report calculations, review UX, PayOS reconciliation, CSV export, billing, entitlements, receipts, or refunds.
- Changing general API idempotency behavior outside the sales-review endpoint.

## 10. Acceptance Criteria

- [ ] A successful sales review atomically commits both `PaymentOrder.reporting` and one safe outbox event.
- [ ] An outbox insert or transaction failure before confirmed commit leaves the previous review unchanged.
- [ ] An unknown commit result returns `503 admin_audit_commit_unknown` and resolves safely when the same request id is retried.
- [ ] A stale optimistic review creates no outbox event and still returns `409 sales_review_conflict`.
- [ ] Retrying the same `reviewRequestId` never reapplies the decision or creates a second canonical audit row.
- [ ] Reusing a request id for a different safe command returns `409 sales_review_idempotency_conflict`.
- [ ] The API may succeed while `AuditLog` materialization is temporarily unavailable because the intent is durable.
- [ ] Retry eventually creates exactly one canonical `AuditLog` row per `eventId`.
- [ ] Worker/process failure before or after `AuditLog` creation cannot duplicate or lose the event.
- [ ] Outbox and `AuditLog` never contain raw review notes, customer application `userId`/UID values, customer PII, bank data, or provider payloads.
- [ ] Persisted outbox/AuditLog records contain neither the HMAC key nor enough unhashed command input to reproduce a review note.
- [ ] The sales-review route emits no duplicate best-effort success audit.
- [ ] Existing reporting results, billing state, entitlement state, receipts, refunds, and other Admin routes remain unchanged.
- [ ] Unsupported transaction environments fail closed without applying the review.
- [ ] A replica-set integration test proves commit/rollback behavior with real MongoDB transaction semantics.
- [ ] Focused backend tests, backend typecheck, and backend build pass.

## 11. Verification Plan

Focused tests SHALL cover:

- successful transaction commit with a review update and outbox insert;
- outbox insert failure causing abort and no persisted review;
- stale optimistic conflict creating no outbox event;
- transaction unsupported/failure mapping to a safe retryable response;
- same-command HTTP retry before and after outbox TTL cleanup;
- conflicting `reviewRequestId` reuse;
- conflicting reuse where only normalized raw review-note content differs;
- HMAC fingerprint determinism with the configured secret and no secret/raw-note persistence;
- immediate materialization success;
- materialization retry with bounded safe errors;
- lease expiry and reclaim;
- crash-equivalent retry after `AuditLog` creation without duplication;
- payload allowlist excluding raw note, user/customer, bank, and provider data;
- route behavior preventing duplicate success audits.

Commands:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReportModel.test.js backend/dist/tests/adminSalesReportService.test.js backend/dist/tests/adminSalesReportRoutes.test.js backend/dist/tests/auditLog.test.js backend/dist/tests/adminAuditOutbox.test.js
```

Replica-set integration verification:

- add a focused integration test that runs only when `MONGODB_TRANSACTION_TEST_URI` is configured;
- configure CI with a MongoDB replica-set service and initialize it before this test;
- prove successful dual-write commit and forced outbox-insert rollback against real Mongoose transaction behavior;
- cover transaction-unavailable and unknown-commit-result error mapping in focused fault-injection tests;
- keep the test database isolated and delete only its generated fixture records.

Broader backend verification, when Firebase env is available:

```bash
npm.cmd --prefix backend run test:run
```

Staging verification on the transaction-capable production topology:

- submit one review and confirm the `PaymentOrder.reporting` update and outbox event share the same decision timestamp;
- confirm the committed outbox event materializes into exactly one existing Admin audit-log row;
- confirm the outbox and canonical audit documents contain none of the forbidden customer, bank, provider, or note fields.

## 12. Open Questions / Follow-ups

- A future production-operations task may add an Admin outbox-health view and manual replay action if Sentry/log visibility proves insufficient.
- A future key-rotation task may add a previous-secret overlap window; until then, deployment must keep `ADMIN_AUDIT_FINGERPRINT_SECRET` stable so historical request ids remain comparable.
- A separate Core spec is required before extending durable outbox semantics to other Admin mutations.
