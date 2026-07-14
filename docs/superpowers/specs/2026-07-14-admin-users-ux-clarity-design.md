# Admin Users UX Clarity Design

> **Superseded as a standalone design:** The approved requirements are integrated into `docs/superpowers/specs/2026-07-14-admin-ui-system-phase-1-design.md`. Keep this file as historical detail; do not plan it separately.

## Problem

The Admin Users page now persists and reports operational classification correctly, but the interface still makes the state hard to understand:

- classification is nested under the user identity instead of being a scannable table field;
- default-real accounts render no visible state, which looks like missing data;
- the bulk-action panel remains visible with zero selected users;
- result feedback is visually detached from the action and can print an unbounded UID list;
- search, role filters, checkboxes, and table headers need stronger accessibility semantics.

## Approaches Considered

### 1. Keep classification under the user identity

This is the smallest code change, but it preserves the main ambiguity and makes comparison across rows difficult.

### 2. Add a dedicated classification column

This makes every row explicit and scannable without changing backend data. It also preserves the distinction between an explicit real confirmation and the default real fallback.

### 3. Use row colours for classification

This is visually strong but creates excessive table noise and relies too heavily on colour for meaning.

## Chosen Design

Use a dedicated `Trạng thái dữ liệu` column and keep each state text-labelled:

- `{ effectiveCategory: "real", source: "user" }` -> `Dữ liệu thật · Đã xác nhận`, confirmed tone;
- default or missing real classification -> `Dữ liệu thật · Mặc định`, neutral tone;
- test classification -> `Test`, pending tone;
- internal classification -> `Nội bộ`, expired tone.

The default-real state is visible but must not look confirmed.

## Bulk Action Behaviour

- Hide the bulk-action panel when no users are selected and no retry is pending.
- Show the panel after at least one user is selected.
- Keep retry targets selected so the retry action remains reachable.
- After a successful request with no retry targets, hide the action panel and show a separate result alert.
- The result alert shows `updated`, `unchanged`, and `failed` counts.
- When failures exist, place raw UIDs inside a native expandable details section instead of the primary message line.
- Provide a labelled dismiss action for the result alert.

## Filter And Table Clarity

- Rename `CSV` to `Xuất CSV`.
- Give the search input an accessible name.
- Expose the role filters as one labelled group and mark the active button with `aria-pressed`.
- Add a visually hidden table caption and `scope="col"` to column headers.
- Expand checkbox hit targets without changing selection behaviour.
- Update empty and loading rows for the additional classification column.

## Scope Boundaries

- Frontend-only change.
- Do not change classification APIs, persistence, audit semantics, idempotency, request IDs, retry rules, URL filter behaviour, or backend models.
- Do not add dependencies.
- Do not redesign unrelated Admin pages.

## Acceptance Criteria

- WHEN an admin views any user row, THE system SHALL show an explicit operational data state in a dedicated column.
- WHEN a real classification comes from the default fallback, THE system SHALL label it as default and SHALL NOT present it as confirmed.
- WHEN no users are selected and no retry is pending, THE system SHALL hide the bulk-action panel.
- WHEN a bulk classification completes, THE system SHALL show separate updated, unchanged, and failed counts in an accessible result alert.
- WHEN failures exist, THE system SHALL keep raw UID details available without placing an unbounded list in the main result sentence.
- WHEN keyboard or assistive-technology users operate search, filters, table selection, or feedback, THE system SHALL expose labels, pressed states, table relationships, and live status semantics.

## Verification

- Component tests cover explicit-real and default-real labels and tones.
- Page tests cover the dedicated column, hidden/visible selection panel, dismissible result alert, failure details, accessible search, and role-filter pressed state.
- Existing retry, request-ID, navigation, filtering, dialog, and classification tests remain green.
- Run focused tests, typecheck, targeted Biome lint, and production build.
