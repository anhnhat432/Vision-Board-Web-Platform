# Admin UI System - Phase 3 Design

**Date:** 2026-07-14
**Status:** Approved as Phase 3 of the previously approved four-phase Editorial Operations program
**Surface classification:** Mixed
**Modes affected:** `real` and `demo`, preserving existing route and auth gates

## 1. Context

Phases 1 and 2 established the Editorial Operations shell, shared Admin presentation primitives, and migrated the main overview, customer, business, and operations list surfaces. Phase 3 applies the same contract to the remaining system and detail surfaces:

- Catalog
- Email History
- Settings
- Audit Logs
- Admin Order Detail
- Admin User Detail

Catalog and User Detail contain real mutations, so Phase 3 freezes their existing request and persistence contracts before changing presentation. The other four pages are Shell migrations with no new business behavior.

## 2. Goals

- Make system, reference, and detail pages feel native to the same Admin workspace as Phases 1 and 2.
- Improve scanning through consistent page headers, labelled panels, definition rows, accessible tables, and restrained status presentation.
- Keep important controls usable at approximately 390px without forcing desktop detail layouts onto mobile.
- Replace toast-only or transient failure presentation with persistent feedback where the active command needs recovery.
- Preserve all existing APIs, auth checks, route boundaries, request generations, idempotency keys, optimistic rollback, validation, and mutation payloads.

## 3. Non-Goals

- No backend, API, model, auth, billing authority, entitlement, storage, or sync changes.
- No route additions, removals, renames, or new cross-resource navigation.
- No new Catalog CRUD operations or item reordering.
- No automatic email sending, cron configuration, provider management, or secret editing.
- No new Audit Log filters beyond the existing action and actor UID inputs.
- No changes to role, subscription, classification, order, or catalog mutation authority.
- No universal detail-page schema, data-table framework, or dependency addition.

## 4. Approaches Considered

### A. Vertical page migration with existing primitives - selected

Migrate one page at a time using `AdminPageHeader`, `AdminToolbar`, `AdminDataPanel`, `AdminFeedbackBanner`, `AdminStatusBadge`, `AdminEmptyState`, `AdminPagination`, and the existing table primitives. Keep local `InfoRow` and domain-specific sections inside their pages.

This approach preserves page-owned data flow, limits regression scope, and keeps each mutation contract visible in the page that owns it.

### B. Add a universal Admin detail framework

Create shared definition-list, section-card, timeline, and detail-table abstractions before migrating the pages. This would reduce repeated markup but would also hide page-specific loading, mutation, and responsive behavior behind a new configuration layer.

This approach is rejected because Phase 3 has only two detail pages and their domains differ substantially.

### C. Recompose the remaining pages around a new information architecture

Combine system status, audit activity, and email history into one system console and redesign detail routes around cross-resource navigation. This could improve long-term discoverability but changes route meaning and product scope.

This approach is rejected because the approved program preserves every route and business boundary.

## 5. Shared Phase 3 Contract

No new shared component is required.

- `AdminPageHeader` owns page title, concise context, metadata, and page-level actions.
- `AdminToolbar` is used only where a page has real filters or commands that benefit from a labelled control region.
- `AdminDataPanel` provides titled sections for tables, definition rows, timelines, and operational summaries.
- `AdminFeedbackBanner` carries retryable load and mutation failures. When a modal command remains open, its feedback renders inside that modal so it is not hidden by modal `aria-hidden` behavior.
- `AdminStatusBadge` replaces icon-only, emoji-only, and dark-theme-only status treatments.
- `AdminPagination` replaces bespoke Previous/Next controls without owning requests or page state.
- Existing local helpers such as `InfoRow`, payload preview, timeline entries, and Catalog fetch helpers remain page-owned.

Tables require a caption, scoped column headers, contained horizontal overflow, right-aligned numeric values, and monospace identifiers. Initial loading may use content-shaped skeletons; refresh failures retain already rendered data when safe.

## 6. Frozen Core Contracts

### 6.1 Catalog

- Keep `adminFetch`, `buildAdminApiUrl`, `authedFetch`, and all current endpoints unchanged.
- Keep price updates optimistic and restore the previous list on failure.
- Keep active-state updates optimistic and restore the previous list on failure.
- Keep thumbnail validation at PNG/JPEG/WebP and `2MB` maximum.
- Keep thumbnail uploads as authenticated `FormData` requests without a JSON content-type header.
- Keep backend-provided labels, sort order, item IDs, prices, active state, and thumbnail URLs authoritative.

### 6.2 User Detail

- Keep role updates on `adminUpdateUserRole(uid, role)`.
- Keep manual plan updates on `adminUpdateUserSubscription(uid, { planCode })`.
- Keep classification request IDs reusable only for the same unchanged command.
- Keep latest-route-wins protection so a late mutation never reloads the previous user.
- Keep all existing confirmation dialogs and destructive copy.
- Do not infer billing-provider success from a manual subscription mutation beyond the response returned by the existing Admin API.

### 6.3 Order Detail

- Keep `adminGetOrder`, request-generation checks, route identity checks, and timeout behavior unchanged.
- Keep direct physical-order classification restrictions when user classification is authoritative.
- Keep classification request-ID reuse and unknown-commit retry behavior unchanged.

## 7. Catalog

### Layout

```text
PageHeader + refresh
Persistent load/mutation feedback
Labelled catalog-type tabs
AdminDataPanel per active type
Accessible item table
```

### Requirements

- Keep the three existing types and labels: frame, theme, and sticker.
- Present the active tab as a labelled catalog region and show its item count.
- Put each populated list in `AdminDataPanel` with an accessible table caption and scoped headers.
- Keep thumbnails compact, preserve useful `alt` text, and give upload controls item-specific accessible names.
- Give each price input an item-specific accessible name and retain blur-to-save behavior.
- Right-align price values and keep item IDs monospace.
- Show loading and upload activity with reduced-motion-safe indicators.
- Use persistent feedback for load, validation, price, active-state, and upload failures; a successful optimistic mutation needs no extra page noise.
- Preserve stale catalog rows during a failed refresh.

## 8. Email History

### Layout

```text
PageHeader + total + refresh
Persistent load feedback
AdminDataPanel
Accessible email-event table
AdminPagination
```

### Requirements

- Keep page-owned `page`, `totalPages`, and `limit: 30` behavior.
- Keep the current email-event endpoint and response contract unchanged.
- Use a named table with scoped headers for recipient, status, error, processed time, and created time.
- Keep recipient identity readable without duplicating identical email text when no display name exists.
- Use `AdminStatusBadge` with the existing status labels.
- Allow long provider errors to wrap or expose their full value without making the primary row excessively tall.
- Keep stale rows visible during refresh and on retryable failure.
- Replace bespoke pagination with `AdminPagination`.

## 9. Settings

### Layout

```text
PageHeader + refresh
Persistent load feedback
Responsive two-column system-status grid
Four AdminDataPanel sections
```

### Requirements

- Keep `adminGetOverview`, timeout behavior, and current frontend environment reads unchanged.
- Keep the page read-only; do not add controls that imply providers or secrets can be edited here.
- Present Email Provider, Payment Provider, Application, and Reminders as named panels.
- Replace emoji status strings with explicit `AdminStatusBadge` labels.
- Keep service values selectable and wrap long URLs or reasons safely on mobile.
- Preserve the factual reminder copy that sending is manual and no cron job exists.
- Show retryable load failure persistently while retaining previously loaded status data when safe.

## 10. Audit Logs

### Layout

```text
PageHeader
AdminToolbar with action and actor filters
Persistent load feedback
AdminDataPanel
Accessible audit table
AdminPagination
```

### Requirements

- Keep the existing action and actor UID request parameters and immediate filter behavior.
- Reset server requests to page 1 whenever either filter changes.
- Keep `limit: 30` and calculate total pages from the existing total response.
- Give both filters explicit accessible names and search input types.
- Keep already rendered rows visible during refresh and retryable failure.
- Use table captions and scoped headers; keep action, actor, target, and IDs monospace where useful.
- Replace success/failure icon-only cells with text-labelled `AdminStatusBadge` output.
- Give payload preview controls `aria-expanded` and an item-specific accessible name.
- Keep payload JSON escaped as text inside a contained, scrollable `pre`; never render payload HTML.
- Replace bespoke pagination with `AdminPagination`.

## 11. Admin Order Detail

### Layout

```text
Back link
PageHeader with classification, order status, source, date, and action
Customer/shipping/notes column
Line items/pricing/timeline/system column
Classification dialog
```

### Requirements

- Keep the existing two-column hierarchy at desktop and stack it in reading order on mobile.
- Use named `AdminDataPanel` sections for customer, shipping, notes, goal snapshot, line items, pricing, timeline, and system metadata.
- Keep email and phone actions reachable and allow long addresses and IDs to wrap.
- Give line items a caption, scoped headers, right-aligned quantity and price columns, and neutral type labels.
- Keep discount, total, cancelled, and delivered states explicit without relying on color alone.
- Make loading and retry states labelled and reduced-motion safe.
- Keep classification dialog behavior and authority exactly unchanged.

## 12. Admin User Detail

### Layout

```text
Back link
PageHeader with identity and admin actions
Persistent page-level mutation feedback
Identity/subscription/goals summary grid
Payment history panel
Physical-order history panel
Role, subscription, and classification dialogs
```

### Requirements

- Keep role, subscription, and classification actions in their current confirmation dialogs.
- Keep role failure feedback inside the open role dialog; keep subscription failure feedback persistent on the page because the current subscription command closes its dialog before the request.
- Keep success toasts for short confirmation.
- Always render operational classification with the existing classification badge so default, explicit real, test, and internal sources remain distinguishable.
- Use named panels for identity, subscription, goals, payment history, and physical orders.
- Use `AdminStatusBadge` for goal, payment, subscription, and order state where mappings exist; never use dark-theme-only text colors.
- Give payment and physical-order tables captions, scoped headers, right-aligned amounts, and monospace identifiers.
- Preserve empty messages and all existing response fields.
- Preserve latest-route-wins behavior and never render a late mutation result for a previously viewed user.

## 13. Responsive Behavior

- At desktop widths, Catalog, Email History, Audit Logs, and detail tables use contained horizontal overflow rather than page overflow.
- At approximately 390px, page-header actions wrap below titles, detail columns stack, definition rows allow values to wrap, and mutation actions remain reachable.
- Tab labels remain usable without shrinking below practical touch targets.
- Detail metadata groups may stack vertically when side-by-side label/value rows would truncate important values.
- Loading, empty, error, and modal feedback must not change page width.

## 14. Accessibility and Interaction

- Every table has an accessible name and scoped column headers.
- Every filter, price field, file input trigger, payload toggle, and pagination action has a stable accessible name.
- Loading regions use `role="status"` or equivalent live semantics and respect reduced motion.
- Persistent failures use alert semantics and expose a retry or dismissal action when one exists.
- Modal failures render inside the active modal when background content is `aria-hidden`.
- Status meaning always includes text.
- Back links, mail links, telephone links, and mutation buttons keep visible keyboard focus.
- Existing in-app `AlertDialog` confirmations remain; no `window.confirm` is introduced.

## 15. EARS Acceptance Criteria

- WHEN an admin opens any Phase 3 list or system route, THE system SHALL use the approved Editorial Operations page hierarchy without changing its route or API contract.
- WHEN a Catalog price or active-state request fails, THE system SHALL restore the previous item state and SHALL display persistent failure feedback.
- WHEN an invalid Catalog thumbnail is selected, THE system SHALL reject it before upload and SHALL explain the accepted types or maximum size.
- WHEN Email History or Audit Logs refresh fails after rows were loaded, THE system SHALL retain those rows and SHALL offer retry.
- WHEN an Audit Log payload is expanded, THE system SHALL expose expanded state and SHALL render escaped JSON text only.
- WHEN system configuration is unavailable, THE Settings page SHALL show persistent failure feedback and SHALL NOT imply that secrets can be edited in the browser.
- WHEN an Order Detail classification command is submitted, THE system SHALL preserve the existing authority, request-ID, conflict, and latest-route-wins behavior.
- WHEN a User Detail role, subscription, or classification command is submitted, THE system SHALL preserve the existing payload and authority and SHALL keep a recoverable failure visible.
- WHEN a legacy user or order has no operational classification field, THE system SHALL continue to normalize it to default real presentation without presenting it as explicitly confirmed.
- WHILE keyboard or assistive-technology users operate Phase 3 pages, THE system SHALL expose labelled landmarks, controls, tables, status text, modal feedback, and visible focus.

## 16. Testing Strategy

### Focused tests

- Catalog: load, tabs, named table, price request/rollback, active request/rollback, thumbnail validation, upload request, persistent feedback.
- Email History: list payload, named table, status mapping, stale rows, retry, and pagination.
- Settings: overview load, status badges, stale data, retry, and factual reminder copy.
- Audit Logs: filter payloads, page reset, named table, payload disclosure semantics, stale rows, status labels, retry, and pagination.
- Order Detail: current classification tests plus page hierarchy, named line-item table, loading/error states, and responsive-safe metadata semantics.
- User Detail: current role/classification tests plus named panels and tables, default classification presentation, role/subscription failure feedback, and route-race protection.

### Static and build gates

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd run test:ui -- src/app/routes.test.tsx
```

### Manual QA

When an authenticated Firebase admin session exists, verify all six routes at approximately 1440px, 1024px, and 390px in light and dark themes. Check tab and filter navigation, initial and refresh loading, stale-data errors, retry, optimistic rollback, file validation, payload disclosure, detail tables, back links, all dialogs, duplicate-submit prevention, and reduced motion.

If no authenticated session exists, record that blocker and do not claim manual visual QA passed.

## 17. Risks and Mitigations

- **Risk:** Presentation edits accidentally change real Catalog or user mutations. **Mitigation:** Freeze request methods, endpoints, payloads, optimistic rollback, idempotency, and route-race behavior in tests before styling.
- **Risk:** Detail-page abstraction hides domain differences. **Mitigation:** Reuse only existing presentational primitives and keep domain sections local.
- **Risk:** Modal feedback renders behind an active dialog. **Mitigation:** Render retryable feedback inside the active modal when the command remains open.
- **Risk:** Dense detail tables overflow mobile pages. **Mitigation:** Contain horizontal overflow inside named panels and stack surrounding metadata.
- **Risk:** System status UI implies editable secrets. **Mitigation:** Keep Settings explicitly read-only and preserve current safe frontend-visible values only.

## 18. Completion Boundary

Phase 3 is complete when all six routes use the approved presentation contract, focused and broad automated gates pass, scope checks show no backend or contract changes, and the execution record documents either authenticated manual QA evidence or the exact session blocker. Phase 4 remains a cross-route hardening pass and must not expand Admin business scope.
