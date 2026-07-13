# Task 10 Report - Payment and Physical-Order Classification UI

## RED/GREEN

- RED: `AdminOperationalClassification.test.tsx` failed before inherited-category restriction was implemented.
- RED: `AdminOrdersPage.test.tsx` first exposed the old zero-argument orders loader; the corrected server-loader test then exposed the missing scope/pagination controls.
- GREEN: `AdminOrdersPage.test.tsx` passes 4/4, covering real default loading, server frame options, scope/pagination, complete server filter payloads before page 2, inherited classification copy, and reload after direct classification.
- RED: `AdminOrderDetailPage.test.tsx` failed because detail did not render classification source/action.
- GREEN: `AdminOrderDetailPage.test.tsx` passes 1/1, covering inherited classification guidance and reload after a successful direct classification.
- Regression GREEN: historical payment fixtures without the new optional-at-runtime classification field are normalized to `real/default`; `AdminPaymentsPage.dialog.test.tsx` passes 5/5.

## Implementation

- Payments default to the real operational scope, paginate on the server, retain stable classification request IDs for uncertain outcomes, and show source labels/badges.
- Orders now use the paginated admin API for filters, counts, frame options, and page data. CSV export is server-authenticated and includes all active filters without silently limiting output to the visible page.
- Status/edit/bulk updates reload the server page rather than mutating page-local rows.
- Orders list and detail provide direct physical-order classification with conflict reloads, uncertain-outcome retry IDs, stale-response guards, and inherited user classification protection.

## Privacy, Accessibility, Security

- The classification dialog retains its short-note limit and secret-data warning.
- Inherited user classifications disable the misleading direct real action and direct admins to Users instead of implying record overrides supersede user policy.
- The order filter controls have explicit accessible labels; pagination controls are buttons with disabled boundaries.
- Exports use the authenticated service response and revoke Blob object URLs after download.

## Verification

- `npm.cmd run typecheck` - passed (exit 0).
- Task 10 UI files pass: primitive 6/6, Payments 3/3, payment dialogs 5/5, Orders 4/4, and Order detail 1/1 (19 tests, 0 failures).
- The payment dialog suite logs existing no-provider warnings from `useAdminPendingCounts` and the Payment classification test logs existing React `act(...)` warnings; neither fails the suites.
- `git diff --check` and `git diff --check ddf94b66..HEAD` are run immediately before commit.

## Review Follow-up

- RED: a legacy detail response without `operationalClassification` crashed while reading `source`; the new detail fallback test failed with that exact dereference before the response-boundary normalizer was added.
- RED: an in-flight physical-order classification completed after the list query changed and reloaded the old query. The deferred mutation test observed a final `{ q: "" }` request instead of the active `{ q: "scope-change" }` view.
- GREEN: Payments debounce, page clamp, and stale-view tests pass against the in-progress review fix that was already present before these tests were written; they are regression evidence, not a witnessed RED cycle.
- GREEN: Orders list fallback/page clamp and detail fallback pass. Orders classification now captures the view key and skips stale completion, conflict reload, dialog, error, and busy-state updates.
- Typecheck follow-up: mutation result errors are handled by the thrown-error path, and legacy sales reasons are mapped to the dialog's standard-reason domain before display.

## Review Verification

- `npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx` - passed, 5 files and 26 tests.
- `npm.cmd run typecheck` - passed (exit 0).
- `git diff --check` and `git diff --check ddf94b66..HEAD` - passed (exit 0).
- Non-failing test warnings remain: payment dialogs render outside `AdminPendingCountsProvider`; payment page tests log React `act(...)` warnings.
