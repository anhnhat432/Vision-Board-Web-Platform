# Admin UI System - Phase 2 Design

**Date:** 2026-07-14
**Status:** Approved in conversation
**Surface classification:** Shell
**Modes affected:** `real` and `demo`, preserving existing route gates

## 1. Context

Phase 1 established the Editorial Operations shell and shared primitives, then migrated Dashboard and Users as reference pages. Phase 2 applies that approved contract to the Admin business and operations surfaces:

- Orders
- Payments
- Sales Report
- Subscriptions
- Refunds
- Discounts

These pages already contain production-sensitive mutations. Phase 2 changes presentation and interaction clarity only; page-owned data flow and mutation contracts remain unchanged.

## 2. Goals

- Make the six Phase 2 pages feel like one coherent operational workspace.
- Use tables for dense comparable records and cards for high-context operational records.
- Standardize page hierarchy, filters, data surfaces, pagination, loading, empty, error, and mutation feedback.
- Keep desktop operations efficient while maintaining important mobile actions at approximately 390px.
- Preserve every existing API request, URL filter, classification, retry, request-ID, reconciliation, refund, and discount rule.

## 3. Non-Goals

- No backend, API, model, auth, billing authority, entitlement, storage, or sync changes.
- No route additions, removals, or renames.
- No generic commerce workspace or universal data table.
- No rewrite of business dialogs, validation, or mutation commands.
- No new analytics or unsupported KPI claims.
- No new dependency.

## 4. Chosen Approach

Use vertical page migration in this order:

1. Orders
2. Payments
3. Sales Report
4. Subscriptions
5. Refunds
6. Discounts
7. Cross-page Phase 2 verification

Each page reaches a tested checkpoint before the next page begins. Shared additions stay presentational and small.

## 5. Shared Phase 2 Addition

### `AdminPagination`

Add one shared pagination component with these responsibilities:

- display current page and total pages;
- provide labelled Previous and Next actions;
- disable actions at boundaries or while a page-owned request is busy;
- allow page-specific copy when needed;
- own layout and accessibility only;
- receive callbacks from the page without owning URL state or fetching.

Proposed interface:

```ts
interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
}
```

No other shared abstraction is required in Phase 2. Pages compose the Phase 1 `AdminToolbar`, `AdminDataPanel`, `AdminFeedbackBanner`, `AdminStatusBadge`, and `AdminEmptyState` components directly.

## 6. Shared Interaction Contract

- Desktop page search remains registered through `useAdminSearch` where search already exists.
- Mobile search renders inside `AdminToolbar` because desktop topbar search is hidden below `md`.
- Filter groups expose labels, selected state, and semantic controls.
- Changing filters preserves current page-owned behavior, including reset to page 1 and debounce rules.
- Important export or mutation errors use persistent `AdminFeedbackBanner` feedback.
- Toasts remain suitable for brief successful confirmation but are not the only feedback for partial failure or retryable errors.
- Initial load may replace content with skeletons or rows.
- Refresh keeps already rendered data visible when safe and disables only relevant actions.
- Tables use captions, scoped headers, horizontal overflow containers, right-aligned numeric values, and monospace identifiers.
- Card/list pages stack metadata and actions on mobile without shell-caused horizontal overflow.
- Existing destructive actions continue to use in-app dialogs.
- New or modified transitions include reduced-motion handling.

## 7. Orders

Orders remains a card/list workspace because each record contains customer identity, order configuration, notes, classification, status transitions, edit actions, and selection controls.

### Layout

```text
PageHeader
AdminToolbar
Status summary / quick filters
Conditional selection bar
Feedback
Order card list
AdminPagination
Dialogs
```

### Requirements

- Keep the current topbar search registration and server-side filter payloads.
- Render a mobile search field inside the toolbar.
- Group operational scope, status, frame, and date filters inside a labelled toolbar.
- Keep status counts as quick filters with an explicit selected state.
- Hide the selection bar when no order is selected and no page-owned retry/action state requires it.
- Keep each order card readable at narrow widths by stacking metadata and actions.
- Use persistent feedback for export errors and page-load errors.
- Preserve edit, status transition, bulk update, direct classification, inherited-classification explanation, pending count, pagination rebasing, and active-view reload semantics.

## 8. Payments

Payments uses a dense table because order ID, email, amount, provider state, classification, timestamps, and actions are comparable across rows.

### Layout

```text
PageHeader
AdminToolbar
Feedback
AdminDataPanel table
AdminPagination
Manual completion / evidence / classification dialogs
```

### Requirements

- Keep search debounce, operational scope, status filters, pagination rebasing, and pending sidebar count behavior.
- Provide mobile search inside the toolbar.
- Use a caption and scoped table headers.
- Keep amount aligned right and order/transaction identifiers monospace.
- Preserve manual completion note, safe PayOS evidence allowlist, evidence reopening, webhook-only evidence restrictions, direct/inherited classification behavior, and non-optimistic reload rules.
- Export errors and page-load errors use persistent feedback without clearing safe stale data.

## 9. Sales Report

Sales Report retains its KPI grid and revenue chart. Phase 2 aligns its filters, tabs, report list, export feedback, and error states with the shared system.

### Layout

```text
PageHeader
AdminToolbar-compatible report filters
Export/load feedback
KPI grid
Revenue chart
Review-state tabs
AdminDataPanel report list
AdminPagination
Review / evidence dialogs
```

### Requirements

- Preserve real-mode-only routing.
- Preserve URL range/provider/tab state, custom-date validation, request generation, latest-response-wins behavior, page reset rules, and timeout retry.
- Keep all six existing KPI definitions and avoid active-user/DAU claims.
- Preserve effective operational classification, legacy review-source labels, manual inclusion validation, excluded-order restrictions, review request-ID reuse/change behavior, PayOS reconciliation, evidence handling, and server-backed export.
- Display export and load failures through persistent feedback.
- Do not show a stale report after the active filter request fails where current page semantics intentionally hide it.

## 10. Subscriptions

Subscriptions uses a table for plan, status, dates, classification, and account identity.

### Requirements

- Use a labelled toolbar for operational scope, status, and plan filters.
- Keep real users as the default scope.
- Preserve inherited exclusion labels and server pagination.
- Add a caption, scoped headers, right-sized date/status cells, and shared pagination.
- Use shared loading, empty, and retryable error states.
- Do not introduce subscription mutation actions in Phase 2.

## 11. Refunds

Refunds remains a card/list workspace because reason, recipient account, notes, status, and resolve actions require context.

### Requirements

- Use `AdminDataPanel` as the outer list surface while preserving per-refund cards.
- Stack metadata and actions on mobile.
- Keep recipient-account information visually prominent without decorative gradients.
- Preserve pending sidebar count, complete/reject dialog, admin note validation, busy state, and server reload behavior.
- Use persistent load/action feedback where the current page has only transient or unstructured errors.
- Keep destructive and money-related confirmation inside the existing in-app dialog.

## 12. Discounts

Discounts uses a table for code, type, value, active period, usage, and status.

### Requirements

- Keep registered desktop search and add mobile toolbar search.
- Group type and active-state filters in `AdminToolbar`.
- Use a caption, scoped headers, semantic status, and shared pagination if the current response supports more than one page.
- Preserve the three-step create/edit wizard, validation, optimistic boundaries, usage dialog, delete confirmation, and all current service payloads.
- Keep error and empty states distinct.
- Avoid redesigning the form wizard beyond shared spacing, headings, and feedback required for visual integration.

## 13. Data And Behavioral Invariants

- Every service call remains in its current page or existing service module.
- No shared component initiates a request or owns server state.
- Existing `useAdminSearch` handlers and debounce timing remain unchanged.
- Existing filter and pagination reset/rebase behavior remains unchanged.
- Existing request IDs and retry payloads remain unchanged.
- Existing direct versus inherited operational-classification rules remain unchanged.
- Existing manual payment, sales review, refund, order transition, and discount validation rules remain unchanged.
- Remote failures must not destroy already rendered data unless the page deliberately hides stale results for active-filter correctness, as Sales Report currently does.

## 14. Accessibility And Responsive Requirements

- Toolbars and filter groups have accessible names.
- Tables have captions and `scope="col"` headers.
- Pagination actions have explicit Vietnamese accessible labels.
- Status and classification never rely on color alone.
- Focus order follows visual order.
- Mobile layouts retain primary actions and avoid shell-caused horizontal overflow.
- Dense tables use contained horizontal scrolling rather than shrinking text below existing readable sizes.
- Cards stack actions and metadata at narrow widths.
- Reduced-motion preferences disable new or modified non-essential transitions.

## 15. EARS Acceptance Criteria

- WHEN an admin opens any Phase 2 page, THE system SHALL use the Phase 1 page hierarchy and shared theme-aligned surfaces.
- WHEN a Phase 2 page supports search, THE system SHALL provide registered desktop search and a usable mobile search control.
- WHEN filters change, THE system SHALL preserve the page's existing server payload, debounce, page reset, and URL behavior.
- WHEN a paginated page is at its first or final page, THE system SHALL disable the corresponding pagination action.
- WHEN a safe refresh fails after data is rendered, THE system SHALL retain that data unless the page's existing active-filter correctness rule requires hiding it.
- WHEN an important export or mutation fails, THE system SHALL show persistent retryable feedback without changing the mutation contract.
- WHEN Orders or Refunds render at a narrow width, THE system SHALL stack high-context metadata and actions without page-level horizontal overflow.
- WHEN Payments, Sales Report, Subscriptions, or Discounts render tabular data, THE system SHALL expose a caption and scoped headers.
- WHILE an Admin dialog or request is pending, THE system SHALL preserve existing dismissal, validation, and duplicate-submission protections.
- WHERE operational classification is inherited, THE system SHALL preserve the existing source explanation and SHALL NOT offer misleading direct-real actions.

## 16. Verification

### Focused tests

- New `AdminPagination` component tests.
- Existing Orders page tests, including filtered reload, pagination rebase, classification, status transition, and bulk update.
- Existing Payments page and dialog tests, including debounce, PayOS evidence, manual completion, classification, and pending counts.
- Existing Sales Report tests, including filters, latest-response wins, review request IDs, reconciliation, evidence, export, and errors.
- Existing Subscriptions tests for default real scope and inherited exclusions.
- Existing Refund dialog tests.
- Discounts tests for list, wizard, usage, and delete behavior; add focused UI tests where current coverage is missing.

### Gates

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Run the focused Phase 2 UI set before the broad gates.

### Manual QA

- Verify each Phase 2 route at approximately 1440px, 1024px, and 390px in light and dark themes.
- Verify keyboard navigation, focus, filters, pagination, loading, empty, error, retry, and mutation feedback.
- If no authenticated Firebase admin session is available, record the blocker and do not claim visual QA passed.

## 17. Risks And Mitigations

- **Risk:** Six pages create an overly broad implementation batch. **Mitigation:** complete and review vertical page checkpoints in the approved order.
- **Risk:** A shared component absorbs business logic. **Mitigation:** add only `AdminPagination`; all data and mutations stay page-owned.
- **Risk:** Visual changes regress money-sensitive dialogs. **Mitigation:** preserve dialog components and rerun existing dialog/request-ID tests.
- **Risk:** Dense tables become unusable on mobile. **Mitigation:** use contained horizontal scrolling and retain mobile search/actions.
- **Risk:** Existing stale-data rules differ between pages. **Mitigation:** preserve each page's current correctness semantics and test them explicitly.
