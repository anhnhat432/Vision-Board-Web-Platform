# Admin Sales Reporting Design

## 1. Context & Goal

- Feature: add a durable Admin sales-reporting surface for verified paid transactions, distinct paid users, revenue, refunds, reconciliation evidence, and KPI review.
- Why now: the project has successful PayOS transactions, but the PayOS dashboard does not identify the corresponding application user. Operators currently have to match the `VB...` order id manually across PayOS and Vision Board.
- User impact: an Admin can review each real sale, exclude internal or test transactions, calculate reportable KPI totals, and export a privacy-safe evidence file without changing billing state.
- Modes affected: protected `real`-mode Admin routes only. Demo/mock billing is out of the reportable KPI path.

## 2. Surface Classification

- Type: `Mixed` with a `Core` reporting contract.
- Touched domains: `PaymentOrder`, refunds, PayOS payer reconciliation, Admin API authorization and audit logging, Admin routing/sidebar, reporting UI, and CSV export.
- Existing invariants that must not break:
  - Reporting review never changes `PaymentOrder.status`, subscription state, entitlement grants, receipt state, or provider data.
  - Checkout and webhook handling remain server-authoritative.
  - PayOS evidence never exposes a complete payer account number or raw provider payload.
  - Mock/demo payments, free grants, and Admin-created subscription access are not counted as real sales.
  - A paying-user KPI counts distinct application `userId` values, not transaction count or payer-account guesses.

## 3. Actors & Entry Points

- Primary actor: authenticated user with Admin role.
- Secondary actors: reviewer/auditor reading an exported evidence file; support operator reconciling PayOS evidence.
- Frontend route: `/admin/reports/sales`.
- Sidebar entry: `Báo cáo kinh doanh`.
- API touchpoints:
  - `GET /api/admin/reports/sales`
  - `PATCH /api/admin/reports/sales/:orderId/review`
  - `GET /api/admin/reports/sales/export`
  - Existing `POST /api/admin/billing/payment-orders/:orderId/reconcile-payer-source`
- Data sources: `PaymentOrder`, `User`, completed `RefundRequest`, and existing safe `metadata.payos.payer` evidence.

## 4. Functional Requirements

### 4.1 Report scope and calculations

1. WHEN an Admin opens the sales report, THE system SHALL default to the last 30 days and SHALL allow 7-day, 30-day, and custom date ranges.
2. WHEN the report is calculated, THE system SHALL consider only `PaymentOrder` records whose `status` is `completed`, `purpose` is `plus_subscription`, currency is `VND`, and provider is a real configured provider such as `payos` or `casso`.
3. WHERE a qualifying order has no persisted reporting review, THE system SHALL present it as `pending` without requiring a destructive database migration.
4. WHEN an order is marked `included`, THE system SHALL include it in successful-transaction and gross-revenue KPI calculations.
5. WHEN multiple included orders belong to the same `userId`, THE system SHALL count one unique paid user while retaining every transaction in the transaction total.
6. WHEN a completed refund exists for an included order, THE system SHALL retain the original sale in gross revenue, add its amount to refunded revenue, subtract it from net revenue, and visibly label the order `Đã hoàn tiền`.
7. WHEN an order is marked `excluded`, THE system SHALL exclude it from transaction, paid-user, gross-revenue, and net-revenue KPI totals.
8. WHERE an order is completed manually, THE system SHALL keep it pending by default and SHALL require a non-empty review note before it can be included.
9. WHERE PayOS payer evidence is `internal`, `external`, or `unknown`, THE system SHALL treat that classification as review evidence only and SHALL NOT automatically assert payer identity or automatically include a sale.
10. WHEN the selected filters change, THE system SHALL recalculate summary cards, chart buckets, tab counts, table rows, and export scope from the same server-side filter contract.

### 4.2 KPI review

11. WHEN an Admin reviews a pending transaction, THE system SHALL allow `included` or `excluded` as the persisted KPI status.
12. WHEN an Admin excludes a transaction, THE system SHALL require one reason from `internal_team`, `test`, `duplicate`, or `other`; completed refunds SHALL remain a system-derived state rather than a manual exclusion reason.
13. WHERE the exclusion reason is `other`, THE system SHALL require a non-empty review note.
14. WHEN a review is saved, THE system SHALL persist the reviewer UID, review timestamp, optional note, and selected reason.
15. WHEN a review is changed later, THE system SHALL preserve the action in the existing Admin audit log with the order id, previous status, new status, reason, reviewer UID, and timestamp, while excluding raw PII and provider payloads.
16. WHEN an Admin confirms a review change, THE UI SHALL use the in-app `AlertDialog` component.
17. WHEN a reporting review request fails, THE system SHALL leave the previous review state and all billing state unchanged and SHALL show a retryable error.

### 4.3 Reporting UI

18. WHEN an Admin visits `/admin/reports/sales`, THE UI SHALL display cards for successful transactions, unique paid users, gross revenue, refunded amount, net revenue, and pending reviews.
19. WHEN report data is available, THE UI SHALL display a revenue-by-day chart based on server-provided date buckets.
20. WHEN an Admin changes the report tab, THE UI SHALL show `Được tính KPI`, `Chờ duyệt`, or `Đã loại` rows while retaining the selected date/provider filters.
21. EACH report row SHALL show a masked user label, `VB...` order id, provider, amount, completion time, payer-evidence classification, refund state, KPI status, and available safe PayOS reference data.
22. WHERE a completed PayOS order lacks historical payer evidence, THE UI SHALL offer the existing `Đối chiếu PayOS` action.
23. WHERE reconciled PayOS evidence exists, THE UI SHALL offer `Xem chứng cứ` using the existing safe evidence dialog pattern.
24. WHEN the viewport is narrow, THE UI SHALL use a readable card/list presentation rather than forcing the full desktop table off-screen.

### 4.4 Privacy-safe export

25. WHEN an Admin requests an export, THE backend SHALL export all matching rows for the active filters rather than only the current page.
26. THE export SHALL include report generation time, selected date range, summary KPI values, masked customer label/email, order id, amount, provider, completion time, safe provider transaction reference, payer classification, refund state, review status, and exclusion reason.
27. THE export SHALL NOT include complete email addresses, Firebase UIDs, complete bank-account numbers, QR data, checkout URLs, webhook bodies, account hashes, secrets, or unrelated customer data.
28. WHEN export generation fails, THE UI SHALL show a clear retryable error and SHALL NOT download a partial or malformed file.

## 5. Data, Storage, and Sync Constraints

- localStorage keys/shapes touched: none.
- Backend model change: add an optional top-level `reporting` subdocument to `PaymentOrder`:

```ts
reporting?: {
  kpiStatus: "pending" | "included" | "excluded";
  exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}
```

- Migration/normalization: no bulk migration. Missing `reporting.kpiStatus` is normalized to `pending` in report serialization and filters.
- Refund calculation: a completed `RefundRequest` joined by `orderId` overrides net-revenue calculation but does not erase the stored review history.
- Suggested indexes:
  - `{ status: 1, purpose: 1, provider: 1, completedAt: -1 }`
  - `{ "reporting.kpiStatus": 1, completedAt: -1 }`
- API filters: `from`, `to`, `provider`, `kpiStatus`, `page`, and bounded `limit`.
- Pagination applies to table rows only; summary, chart, and tab counts cover the complete filtered range.
- Sync ordering: reporting writes are independent Admin operations and never participate in frontend local-first workspace sync.
- Rollback: removing the route and API leaves optional reporting metadata harmless; no entitlement or payment rollback is required.

## 6. Architecture and Components

### Backend

- Add a focused reporting service responsible for:
  - validating date/provider/status filters;
  - building one canonical qualifying-sales filter;
  - joining users and completed refunds;
  - calculating KPI summaries and daily revenue buckets;
  - serializing privacy-safe report rows;
  - producing the export dataset.
- Keep controller methods thin and reuse `requireAdmin` plus audited Admin action patterns.
- Reuse the existing safe payer evidence allowlist; never return arbitrary `metadata.payos` fields.
- Review updates use an atomic `findOneAndUpdate` constrained by order id and qualifying payment fields.

### Frontend

- Add `AdminSalesReportPage` as a route-level page.
- Add typed report/query/review/export contracts to `adminService`.
- Reuse Admin layout tokens, stat cards, status badges, `AlertDialog`, payer evidence dialog patterns, and error/loading utilities.
- Keep filter state in the page URL query string where practical so a filtered report can be refreshed or shared between Admin sessions.
- Use a small dedicated revenue chart component; do not introduce a new chart dependency unless the current stack cannot render the approved chart accessibly.

## 7. Non-functional Requirements

- Performance:
  - one report load should use bounded queries/aggregations and avoid N+1 user/refund lookups;
  - default date range is 30 days;
  - export may enforce a documented maximum range or row count if production volume requires it.
- Accessibility:
  - filters have labels;
  - tabs and dialogs are keyboard accessible;
  - chart information also appears as text/table values;
  - status is never conveyed by color alone.
- Observability:
  - capture safe server errors for report loading, review updates, reconciliation, and export;
  - audit every review-state change;
  - do not log raw customer or bank data.
- Security/privacy:
  - all endpoints require Admin authorization;
  - export is generated from an explicit allowlist;
  - complete payer accounts and raw PayOS data never leave the protected provider integration;
  - `external` payer classification is not represented as KYC or legal identity proof.

## 8. Error and Empty States

- No qualifying payments: show zero-valued cards and an explanatory empty state.
- No rows for the active tab: retain summary cards and explain that the current review filter has no results.
- Backend unavailable/timeout: stop loading, show a retry action, and preserve selected filters.
- Reconciliation unavailable: retain the row and existing report status; show a retryable row-level error.
- Export unavailable: keep the page usable and show an export-specific error.
- Invalid date range: reject client-side when possible and validate again server-side.

## 9. Out of Scope

- Active-user, DAU, WAU, or MAU reporting until a durable server analytics or verified GA4 source exists.
- Changing checkout, webhook, subscription, entitlement, receipt, refund-resolution, or customer-portal behavior.
- Uploading customer chat screenshots or bank-transfer screenshots into the application.
- Treating payer bank information as verified customer identity.
- Building a general-purpose BI platform, arbitrary report builder, or non-billing analytics warehouse.
- Exposing unmasked customer data in report exports.

## 10. Acceptance Criteria

- [ ] Admin sidebar exposes `Báo cáo kinh doanh` and the protected route rejects non-Admins.
- [ ] Default 30-day report returns correct summary, daily buckets, tab counts, and paginated rows from one canonical filter.
- [ ] Only completed real-provider `plus_subscription` orders are eligible for review and sales calculations.
- [ ] Existing qualifying orders without reporting metadata appear as pending.
- [ ] Included orders calculate transaction count, distinct paid users, and gross revenue correctly.
- [ ] Completed refunds contribute to refunded amount and reduce net revenue without deleting review history.
- [ ] Excluded orders do not affect reportable transaction, user, or revenue totals.
- [ ] Manual completions require a review note before inclusion.
- [ ] Review changes require confirmation, persist reviewer metadata, and create safe audit logs.
- [ ] Review actions never change payment, subscription, entitlement, or receipt state.
- [ ] PayOS reconciliation and evidence reuse the current masked evidence contract.
- [ ] CSV export covers the entire filtered dataset and contains only allowlisted, masked fields.
- [ ] Loading, empty, invalid-filter, timeout, review-error, reconciliation-error, and export-error states are visible and retryable.
- [ ] Desktop and mobile layouts remain usable and accessible.
- [ ] Demo/mock payments do not appear in reportable production KPI totals.

## 11. Verification Plan

Backend focused tests:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node --test backend/dist/tests/adminSalesReport*.test.js
```

Frontend focused tests:

```bash
npm.cmd run typecheck
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
```

Broader verification:

```bash
npm.cmd --prefix backend run test:run
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Manual/browser verification:

- Sign in as Admin and open `/admin/reports/sales` on desktop and mobile widths.
- Verify a PayOS `VB...` order maps to the masked application user.
- Review one pending transaction as included and one as excluded.
- Verify summary and tab counts update without changing Plus access.
- Export a filtered CSV and inspect it for complete emails, UIDs, bank accounts, QR/checkout data, and webhook payload leakage.

## 12. Follow-ups

- Add active-user reporting only after the project has a verified durable analytics source and a separately approved metric definition.
- Consider scheduled report snapshots only if operational reporting later needs immutable period-close records.
