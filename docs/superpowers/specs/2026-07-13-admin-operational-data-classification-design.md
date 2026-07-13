# Admin Operational Data Classification Design

## 1. Context & Goal

- Feature: add a durable Admin classification system that separates real customer activity from test and internal activity across users, Plus subscriptions, payment orders, physical print orders, and the Admin operational overview.
- Why now: historical testing created fake users, test Plus subscriptions, test payments, and test print orders. The current Admin overview counts raw collections, so its user, Plus, revenue, payment, and print-order figures are not reliable operational metrics.
- User impact: an Admin can classify a user once and automatically exclude all linked activity from operational KPIs, while preserving every historical record for support and audit.
- Modes affected: protected production Admin surfaces. The classification contract is server-side and remains valid regardless of frontend app mode; no customer-facing demo behavior changes.

## 2. Surface Classification

- Type: `Mixed` with a `Core` reporting and audit contract.
- Touched domains: `User`, `BillingSubscription`, `PaymentOrder`, physical `Order`, Admin overview aggregation, Admin list APIs, Admin audit outbox, Admin user/payment/order/subscription pages, and the existing sales KPI report.
- Existing invariants that must not break:
  - Classification never deletes a user or historical transaction.
  - Classification never changes payment provider state, `PaymentOrder.status`, subscription status, entitlement authority, refund state, or print-order fulfillment state.
  - Checkout, webhook, and entitlement synchronization remain server-authoritative.
  - Existing sales-review decisions remain stored and auditable.
  - Missing classification metadata is backward-compatible and means `real`.
  - Admin-only metadata never enters customer workspace sync or localStorage.

## 3. Actors & Entry Points

- Primary actor: authenticated user with Admin role.
- Secondary actor: operator or auditor reviewing historical test/internal data and classification changes.
- Existing frontend routes affected:
  - `/admin`
  - `/admin/users`
  - `/admin/users/:uid`
  - `/admin/subscriptions`
  - `/admin/payments`
  - `/admin/orders`
  - `/admin/reports/sales`
  - `/admin/audit-logs`
- Proposed Admin API touchpoints:
  - extend `GET /api/admin/overview`;
  - extend existing user, subscription, payment, and order list endpoints with operational filters and serialized classification;
  - add one bounded bulk user-classification mutation;
  - add single-record payment and physical-order classification mutations.

## 4. Functional Requirements

### 4.1 Canonical classification and precedence

1. EACH persisted operational classification SHALL use one category: `real`, `test`, or `internal`.
2. WHERE classification metadata is absent, THE system SHALL normalize the record to `real` without requiring a destructive migration.
3. A user's application role and operational category SHALL remain independent; an `admin` role SHALL NOT silently classify historical data without an explicit Admin decision.
4. WHEN a user is classified as `test` or `internal`, THE system SHALL exclude that user and all linked subscriptions, payment orders, and physical orders from operational KPI calculations.
5. WHEN that user is restored to `real`, THE system SHALL make linked records eligible for operational KPI calculations again unless a record-level exclusion still applies.
6. A `BillingSubscription` SHALL derive its effective classification only from its linked user; this feature SHALL NOT add an independent subscription override.
7. A `PaymentOrder` or physical `Order` MAY have a direct classification so an orphaned record or an isolated test transaction can be excluded without classifying an otherwise real user.
8. FOR payment orders and physical orders, THE effective classification precedence SHALL be:
   1. linked user category `test` or `internal`;
   2. direct record category `test` or `internal`;
   3. legacy sales-review exclusion reason `test` or `internal_team` when no direct payment classification exists;
   4. otherwise `real`.
9. A persisted direct `real` classification SHALL suppress the legacy sales-review fallback and clear the direct record exclusion, but SHALL NOT override a linked user classified as `test` or `internal`.
10. THE Admin API SHALL serialize both the effective category and its source: `default`, `user`, `record`, or `legacy_sales_review`.

### 4.2 Operational overview calculations

11. WHEN `GET /api/admin/overview` calculates total users, THE system SHALL count only effectively `real` users.
12. THE existing Admin-role count SHALL remain an informational raw count and SHALL NOT be presented as part of the real-customer total.
13. WHEN active Plus subscriptions are counted, THE system SHALL count only active, non-expired subscriptions whose linked user is effectively `real`.
14. WHEN pending/completed payment counts and VND revenue are calculated, THE system SHALL include only effectively `real` payment orders while preserving the current status, currency, purpose, and date semantics.
15. WHEN physical orders are counted, THE system SHALL include only effectively `real` physical orders.
16. Recent-user and recent-payment lists on the overview SHALL default to effectively `real` records.
17. THE overview response SHALL include excluded user counts grouped by `test` and `internal` so the UI can state how much data was removed and link to the filtered user list.
18. WHEN a classification mutation succeeds, reloading the overview SHALL reflect the new calculations without a separate counter rebuild or denormalized summary migration.

### 4.3 Admin list, filter, and mutation experience

19. THE Users page SHALL default to `real` users and SHALL offer `Khách thật`, `Test`, `Nội bộ`, and `Tất cả` filters.
20. THE Subscription, Payment, and physical Order pages SHALL default to effectively `real` rows and SHALL offer `Dữ liệu thật`, `Test & nội bộ`, and `Tất cả` filters.
21. EACH excluded row SHALL show a `Test` or `Nội bộ` badge and SHALL identify whether the classification comes from the user, the record itself, or a legacy sales-review decision.
22. WHEN an Admin changes a user classification, THE UI SHALL use an in-app confirmation dialog that explains the cascade to linked Plus, payment, and print-order reporting.
23. THE classification dialog SHALL require a bounded reason and SHALL accept an optional bounded operational note; selecting reason `other` SHALL require a non-empty note.
24. THE Users page SHALL allow an Admin to select explicit users and submit a bounded bulk classification operation. The initial implementation SHALL limit a request to 100 user UIDs and SHALL NOT implement an unbounded "select every matching user" operation.
25. WHEN a bulk operation has mixed outcomes, THE UI SHALL show the number of successful and failed items and SHALL identify each failed user without reverting successful items.
26. THE Payment and physical Order pages SHALL allow direct classification for records that must be excluded independently, including records whose linked user no longer exists.
27. WHEN a classification mutation fails, THE UI SHALL retain the previous displayed classification, show a retryable error, and SHALL NOT optimistically alter overview totals.
28. NON-Admin users SHALL be denied access to every classification field, filter, and mutation endpoint.

### 4.4 Interaction with the formal sales KPI report

29. THE operational overview and formal sales KPI report SHALL remain distinct calculations.
30. THE operational overview MAY count an effectively real completed payment even while its formal sales review is `pending`, because the overview represents operations rather than submitted KPI evidence.
31. A formal sales KPI transaction SHALL be counted only when it satisfies the existing qualifying-sale contract, its stored review status is `included`, and its effective operational classification is `real`.
32. WHEN a user or payment becomes effectively `test` or `internal`, THE sales report SHALL exclude it from transaction, paid-user, gross-revenue, and net-revenue totals without rewriting the stored sales-review decision.
33. WHEN that classification is restored to `real`, THE previous stored sales-review decision SHALL become effective again. A previously included transaction SHALL not require a second review solely because the user classification was temporarily changed.
34. EXISTING payment orders whose sales-review status is `excluded` with reason `test` or `internal_team` SHALL be interpreted as operationally excluded when no direct operational classification exists.
35. THE sales-report UI SHALL show classification-derived exclusions in the excluded view and SHALL distinguish the effective classification from the stored KPI review decision.

### 4.5 Mutation durability and audit

36. EACH classification mutation SHALL require a client-generated request id and SHALL be idempotent for the same actor, target, category, reason, and normalized note.
37. EACH successful classification mutation SHALL atomically persist the target change and one durable Admin audit outbox event in the same MongoDB transaction.
38. WHERE the durable audit intent cannot be committed, THE system SHALL fail closed for that target and SHALL leave its previous classification unchanged.
39. THE existing Admin audit outbox SHALL be generalized as a discriminated event union while preserving current `admin_sales_reviewed` behavior and idempotency.
40. A classification audit event SHALL record the actor UID, target type, target id, previous category, new category, reason, bounded note, request id, and occurrence time. It SHALL NOT include customer email, display name, provider payload, bank details, entitlement data, or secrets.
41. THE existing `ADMIN_AUDIT_FINGERPRINT_SECRET` SHALL protect the classification command fingerprint; this feature SHALL NOT introduce another audit secret.
42. EACH item in a bulk user operation SHALL have an independent transaction and audit event so one invalid or unavailable user does not roll back successful classifications for other users.
43. WHEN the same request id is replayed with a different canonical command, THE system SHALL reject it as an idempotency conflict and SHALL NOT mutate the target.

## 5. Data, Storage, and API Constraints

### 5.1 Persisted classification

Add the same optional subdocument to `User`, `PaymentOrder`, and physical `Order`:

```ts
type OperationalCategory = "real" | "test" | "internal";

type OperationalClassificationReason =
  | "confirmed_real"
  | "test_account"
  | "internal_team"
  | "automated_qa"
  | "other";

interface OperationalClassification {
  category: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  classifiedBy: string;
  classifiedAt: Date;
}
```

- `operationalClassification` is optional for backward compatibility; missing means `real` from source `default`.
- Category/reason combinations are constrained: `real` requires `confirmed_real`; `test` accepts `test_account`, `automated_qa`, or `other`; `internal` accepts `internal_team` or `other`.
- `note` is trimmed and limited to 200 characters. The UI SHALL warn operators not to enter secrets, bank details, or unnecessary customer data.
- `classifiedBy` stores Admin Firebase UID only.
- `BillingSubscription` receives no new classification field.
- No localStorage keys or customer workspace schemas change.

### 5.2 Serialized effective classification

Admin list/detail responses SHALL expose an allowlisted summary:

```ts
interface AdminOperationalClassificationSummary {
  effectiveCategory: "real" | "test" | "internal";
  source: "default" | "user" | "record" | "legacy_sales_review";
  reason?: OperationalClassificationReason | "legacy_sales_test" | "legacy_sales_internal";
  note?: string;
  classifiedAt?: string;
}
```

- Linked user classification details are used only for Admin serialization and aggregation.
- API responses SHALL NOT expose another user's Firebase UID through `classifiedBy`; actor identity remains available through protected audit logs.

### 5.3 Filters and mutation contracts

- List query values are bounded enums; invalid values return `400`.
- User list filter: `operationalCategory=real|test|internal|all`, default `real`.
- Other Admin lists: `operationalScope=real|excluded|all`, default `real`.
- Bulk user mutation input contains `userUids`, `category`, `reason`, optional `note`, and one request id per target or one batch id from which stable per-target ids are derived.
- Single payment/order mutation input contains `category`, `reason`, optional `note`, and `requestId`.
- Bulk responses return a bounded result per requested UID with `updated`, `unchanged`, or `failed` status and a safe error code.

### 5.4 Indexes and query strategy

- Suggested indexes:
  - `User`: `{ "operationalClassification.category": 1, createdAt: -1 }`;
  - `PaymentOrder`: `{ "operationalClassification.category": 1, status: 1, completedAt: -1 }`;
  - physical `Order`: `{ "operationalClassification.category": 1, createdAt: -1 }`.
- User totals use a direct missing-or-`real` predicate.
- Subscription, payment, and physical-order effective classification SHOULD use bounded aggregation pipelines with indexed joins to `User` rather than loading all excluded user ids into application memory.
- Summary calculations and list filters SHALL share one canonical effective-classification builder per entity to prevent dashboard/list drift.
- Pagination applies to list rows only; overview summaries cover the full dataset.

### 5.5 Migration and rollback

- No automatic classification by email, display name, provider, subscription source, or date is allowed.
- Existing records remain effectively `real` until an Admin classifies them, except legacy sales-review exclusions described in requirement 33.
- The first cleanup is an Admin workflow: filter/search known test accounts, classify explicit selections, then inspect orphan payments/orders under `Tất cả` and classify them individually.
- No destructive database backfill is required. Legacy payment exclusions are normalized at query time until a direct classification is written.
- Rollback may remove the new filters and mutations while leaving optional classification metadata harmless. Rollback SHALL NOT delete classification or audit history.

## 6. Architecture and Components

### Backend

- Add a focused operational-classification module responsible for:
  - validating category, reason, note, request id, and batch bounds;
  - producing canonical effective-classification filters and aggregation stages;
  - resolving user, record, and legacy-sales precedence;
  - serializing privacy-safe Admin classification summaries;
  - applying idempotent classification mutations.
- Keep `getAdminOverview` as the overview orchestrator but replace raw collection counts with the canonical operational filters.
- Extend user, subscription, payment, and physical-order list services to accept the shared filter contract.
- Generalize `AdminAuditOutboxModel` and its dispatcher with discriminated event/payload handling for sales review and operational classification events.
- Use one MongoDB transaction per changed target to commit classification plus audit intent.
- Preserve existing route-wrapper failed-attempt auditing; successful classification audit ownership belongs to the transactional service to prevent duplicate success logs.

### Frontend

- Add reusable Admin components:
  - `AdminOperationalClassificationBadge`;
  - `AdminOperationalScopeFilter`;
  - `AdminOperationalClassificationDialog`.
- Extend typed contracts in `adminService` and the existing order service without adding ad hoc fetch calls.
- Integrate explicit-selection bulk classification into the Users page.
- Integrate inherited badges and filters into Subscription, Payment, and physical Order pages.
- Add direct classification actions to Payment and physical Order rows/details.
- Extend overview cards with real-only values and a compact excluded-user disclosure linking to `/admin/users?operationalCategory=test` or the combined excluded filter.
- Refresh the affected list and overview data only after a confirmed successful mutation.

## 7. Non-functional Requirements

- Performance:
  - overview aggregation SHALL avoid N+1 user lookups;
  - list endpoints remain paginated and bounded;
  - bulk classification is limited to 100 explicit users per request;
  - indexes support classification and existing status/date filters.
- Accessibility:
  - classification filters have visible labels;
  - badges include text and do not rely on color alone;
  - dialogs are keyboard accessible and return focus correctly;
  - bulk results are announced through an accessible status region.
- Observability:
  - capture safe errors for overview aggregation, classification mutation, audit commit, and bulk partial failure;
  - never log classification notes, customer PII, provider payloads, or the audit fingerprint secret;
  - use bounded safe error codes in API responses and outbox retry state.
- Security/privacy:
  - every endpoint uses existing Admin authorization;
  - mutation inputs are schema-validated and length-bounded;
  - audit and API payloads use explicit allowlists;
  - classification is reporting metadata, not evidence of legal identity, payment ownership, or account fraud.
- Consistency:
  - operational overview, list filtering, and formal sales-report effective exclusion use the same backend classification module;
  - frontend code never recalculates classification precedence independently.

## 8. Error and Empty States

- No real records after cleanup: show zero-valued KPI cards and explain that test/internal data is excluded, rather than falling back to raw totals.
- No rows for a filter: retain the filter and show an explanatory empty state with access to `Tất cả`.
- Linked user missing: derive classification from the record or legacy payment review; otherwise treat it as `real` and allow direct Admin classification.
- Classification target missing: return a safe `404`, leave all other bulk targets unaffected, and show the failed target in the bulk result.
- Audit storage unavailable: return `503 admin_audit_unavailable`, leave that target unchanged, and offer retry.
- Idempotency conflict: return `409 admin_classification_request_conflict` and refresh the current server classification.
- Unknown transaction commit result: return a bounded retryable error and require retry with the same request id.
- Overview aggregation failure: do not display stale raw numbers as if they were filtered KPIs; show a retryable overview error.

## 9. Out of Scope

- Deleting fake users, payments, subscriptions, or print orders.
- Revoking Plus, changing entitlement state, refunding payments, or canceling print fulfillment.
- Automatically guessing test accounts from email patterns, provider metadata, subscription source, amount, or creation date.
- Customer-facing classification controls or customer-visible labels.
- DAU, WAU, MAU, or active-user analytics without a separate durable metric definition.
- A general-purpose analytics warehouse or arbitrary KPI builder.
- Expanding durable audit semantics to unrelated Admin mutations in the same implementation.

## 10. Acceptance Criteria

- [ ] Missing classification metadata remains backward-compatible and is treated as `real`.
- [ ] Marking one user `test` removes that user and all linked Plus, payment, revenue, and physical-order activity from the operational overview.
- [ ] Marking one user `internal` applies the same exclusion while retaining a distinct label and count.
- [ ] Restoring the user to `real` makes linked records eligible again without changing billing, entitlement, payment, refund, or fulfillment state.
- [ ] A direct payment or physical-order classification can exclude an orphan or isolated test record.
- [ ] User classification takes precedence over direct record classification.
- [ ] Users, subscriptions, payments, and physical orders default to real-only views and support the approved filters.
- [ ] Excluded rows show their effective category and classification source.
- [ ] The overview discloses excluded user counts and links to the filtered user list.
- [ ] Operational payment totals may include real completed payments pending formal sales review.
- [ ] Formal sales KPI totals require both stored `included` review status and effective `real` classification.
- [ ] Existing sales exclusions with reason `test` or `internal_team` are honored without a destructive migration.
- [ ] Temporary user classification does not erase the stored sales-review decision.
- [ ] Bulk classification accepts no more than 100 explicit users and reports per-user success/failure.
- [ ] Every successful target change atomically creates one durable, idempotent Admin audit intent.
- [ ] Failed audit persistence leaves the target classification unchanged.
- [ ] Only Admin users can view or mutate classification metadata.
- [ ] No classification action changes customer-facing access or provider state.
- [ ] Desktop and mobile Admin layouts remain usable and accessible.
- [ ] Overview, list filters, and sales-report exclusion share the same backend classification logic.

## 11. Verification Plan

Backend focused tests:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminOperationalClassification*.test.js
node --test backend/dist/tests/adminOverview*.test.js backend/dist/tests/adminSalesReport*.test.js
node --test backend/dist/tests/adminAuditOutbox.test.js backend/dist/tests/auditLog.test.js
```

Frontend focused tests:

```bash
npm.cmd run typecheck
npm.cmd run test:ui -- src/app/pages/AdminDashboardPage.test.tsx
npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx
npm.cmd run test:ui -- src/app/pages/AdminSubscriptionsPage.test.tsx
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.test.tsx
npm.cmd run test:ui -- src/app/pages/AdminOrdersPage.test.tsx
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
```

Broader verification:

```bash
npm.cmd --prefix backend run check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Manual/browser verification:

- Sign in as Admin and record the current raw test-contaminated overview values.
- Classify one known test user and confirm all linked operational values decrease by the expected amounts/counts.
- Verify the user's Plus access, payment status, PayOS evidence, and physical-order status remain unchanged.
- Restore the user to `real` and confirm overview values and the prior formal sales-review decision return.
- Classify an orphan payment or physical order directly.
- Exercise `real`, excluded, and all filters on desktop and mobile widths.
- Submit a mixed-result bulk operation and verify successful items persist while failures remain unchanged.
- Inspect Admin audit logs and MongoDB outbox/canonical audit rows for idempotency and forbidden PII/secrets.

## 12. Resolved Decisions and Follow-ups

- Approved source of truth: user classification cascades to linked activity.
- Approved visibility: test/internal data is hidden by default across overview and Admin lists but remains retrievable.
- Approved preservation rule: classification changes reporting only and never deletes or revokes operational records.
- Approved exception: payment and physical-order records can be classified directly when user-level classification is insufficient.
- No open product questions block implementation planning.
- A future feature may add period-close snapshots only if immutable historical reporting becomes necessary.
