# Admin UI System - Phase 4 Hardening Design

**Date:** 2026-07-14
**Status:** Approved by the continuous four-phase Admin goal and the Phase 1 visual contract
**Surface classification:** Mixed: Shell hardening with one mutation-feedback presentation change
**Modes affected:** `real` and `demo`

## 1. Context

Phases 1-3 migrated every Admin route onto the approved **Editorial Operations** shell and presentation patterns. Phase 4 is the final cross-route hardening pass. It must improve consistency, accessibility, theme behavior, motion behavior, and regression protection without changing Admin business behavior.

Authenticated visual QA remains unavailable in the isolated worktree because there is no reusable Firebase admin session, browser storage state, or admin credential. Phase 4 therefore uses source-backed audit findings and automated tests for issues that can be proven locally, while retaining the responsive/light-dark visual walk-through as an explicit manual blocker rather than claiming it passed.

## 2. Audit Evidence

The source audit across production `Admin*.tsx` pages and Admin components found:

- `31` `animate-spin` or `animate-pulse` occurrences without `motion-reduce:animate-none`;
- `13` explicit transitions without `motion-reduce:transition-none`;
- `19` animated `Loader2` icons without `aria-hidden="true"` even when visible text already names the operation;
- `7` table header cells without `scope="col"` in the discount-usage dialog and the Sales Report fallback table;
- destructive actions in Orders and Refunds that use `text-rose-200` in light mode, plus warning/error copy that bypasses the existing `app-status-*` theme tokens;
- Dashboard reminder-run transport failures communicated only through a toast even though this is a multi-record Admin operation.

Existing responsive shell, mobile Sheet navigation, toolbar wrapping, labelled tables, retained stale data, pagination, route gating, and page-specific mutation semantics already have focused automated coverage from Phases 1-3.

## 3. Approaches Considered

### A. Authenticated visual-first sweep

Run every protected route at desktop, tablet, and mobile widths in both themes, then fix screenshot findings. This gives the strongest visual evidence but cannot run without an authenticated Admin browser session.

### B. Contract-first source hardening with focused behavior tests - selected

Add a small static Admin hardening contract for reduced motion, decorative loaders, and table scopes; fix the proven violations; add focused behavior coverage for persistent Dashboard reminder errors and Admin loading live regions. This is deterministic, remains inside the approved UI scope, and prevents the same regressions from returning.

### C. Broad component and table refactor

Migrate every remaining native table and page-local visual style into new shared abstractions. This would increase churn without improving business outcomes and conflicts with the approved rule against a universal Admin table framework.

## 4. Goals

- Make all Admin loading and transition motion respect reduced-motion preferences.
- Keep decorative loading icons out of the accessibility tree when adjacent text already communicates state.
- Complete table relationships for every Admin data table and fallback table.
- Use existing semantic application tokens for risk, warning, and error presentation in both light and dark themes.
- Keep important multi-record Dashboard reminder failures persistently visible and retryable in-page.
- Add focused regression contracts for cross-route hardening rules.
- Finish Phase 4 with broad verification and an honest manual-QA status.

## 5. Non-Goals

- No backend, model, API, auth, billing, entitlement, classification, localStorage, sync, or route changes.
- No new dependency.
- No new Admin destination, metric, workflow, or mutation.
- No universal table, page, dialog, or form abstraction.
- No screenshot or manual-visual pass claim without a real authenticated Admin session.
- No speculative redesign of pages that already satisfy the Editorial Operations contract.

## 6. Architecture

### 6.1 Cross-Admin hardening contract

Create one test-only contract that enumerates production Admin page/component source files and reports exact file/line findings when:

- an `animate-spin` or `animate-pulse` class lacks `motion-reduce:animate-none`;
- an explicit transition class lacks `motion-reduce:transition-none`;
- an animated `Loader2` lacks `aria-hidden="true"`;
- an Admin table header lacks `scope="col"`.

The contract must stay narrow. It does not parse business behavior, enforce formatting, or replace component tests.

### 6.2 Motion and accessibility fixes

Add reduced-motion classes only to existing animations/transitions. Add `aria-hidden="true"` only to icons whose adjacent visible copy already names the loading action. Admin auth/profile loading cards expose `role="status"` and `aria-live="polite"`; error and access-denied cards retain their current headings and actions.

### 6.3 Theme-safe semantic presentation

Replace light-mode-incompatible destructive text/background utilities with `app-status-error` tokens. Replace warning and error text in Admin dialogs with `app-status-warning` / `app-status-error` token combinations. Do not change button labels, confirmation flow, disabled states, or mutation handlers.

### 6.4 Persistent Dashboard reminder feedback

Keep the current request payload `{ daysAhead: 7 }`, toast success/info behavior, overview refresh, and result counts. Add page-owned `reminderError` state:

- clear it before a new reminder run;
- set it on transport failure;
- render `AdminFeedbackBanner` near the reminder workspace with a retry action;
- keep the existing reminder result visible when a later run fails;
- do not duplicate the same failure through a toast.

## 7. Responsive and Theme Contract

- Preserve the fixed desktop sidebar, mobile Sheet, sticky topbar, and current breakpoints.
- Preserve contained horizontal overflow for dense tables and charts.
- Preserve wrapping page actions and filter toolbars; do not introduce fixed page widths wider than the viewport.
- Use existing `app-*` semantic tokens so the same markup works in light and dark themes.
- Manual verification at approximately 1440px, 1024px, and 390px remains required when an authenticated session becomes available.

## 8. Behavioral Invariants

- Existing service functions, request parameters, request IDs, optimistic updates, rollback, dialog confirmations, and page-owned filters remain unchanged.
- Remote refresh failures continue to retain stale data where existing pages already do so.
- The Sales Report remains real-mode-only.
- Operational classification authority and presentation meaning remain unchanged.
- Reduced-motion changes alter presentation only; loading state and disabled behavior remain identical.

## 9. EARS Acceptance Criteria

- WHEN an Admin production source uses a spinner, pulse skeleton, or explicit transition, THE system SHALL provide the approved reduced-motion fallback.
- WHEN an animated loader appears beside visible loading copy, THE system SHALL hide the loader icon from assistive technology while preserving the visible copy.
- WHEN Admin auth or profile state is loading, THE system SHALL expose a polite status region with the current loading heading.
- WHEN an Admin data table or fallback table renders column headers, THE system SHALL expose a caption and `scope="col"` relationships.
- WHEN a destructive or warning Admin surface renders in light or dark theme, THE system SHALL use semantic application tokens rather than a palette value that is legible in only one theme.
- WHEN sending expiring-subscription reminders fails, THE system SHALL keep the failure visible in-page and SHALL provide a retry action without changing the reminder request contract.
- WHILE Phase 4 hardening runs, THE system SHALL preserve all Admin routes, APIs, auth checks, billing authority, classification semantics, and mutation payloads.
- WHERE authenticated manual QA is unavailable, THE execution record SHALL state the exact blocker and SHALL NOT claim responsive or visual verification passed.

## 10. Testing Strategy

### Focused RED/GREEN tests

- Cross-Admin source contract initially fails on the audited motion, loader, transition, and table-scope findings, then passes after the focused presentation fixes.
- `AdminLayout` tests cover loading status semantics without changing redirects or role gates.
- `AdminDashboardPage` tests cover persistent reminder failure, retry, retained result data, and the unchanged `{ daysAhead: 7 }` request.
- Existing Orders, Payments, Refunds, Subscriptions, Users, Discounts, Sales Report, and detail-page tests remain the behavioral regression authority.

### Final gates

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd run test:ui -- src/app/routes.test.tsx
```

Run the focused Admin hardening set first. Run broad gates once after production code is stable. Do not run autofix, formatting, snapshot updates, push, PR, or merge.

## 11. Risks and Mitigations

- **Risk:** A static contract becomes a generic style linter. **Mitigation:** Limit it to the four exact cross-Admin rules proven by the audit and report file/line evidence.
- **Risk:** Theme fixes accidentally change destructive behavior. **Mitigation:** Edit classes only; keep labels, handlers, dialogs, payloads, and disabled state unchanged.
- **Risk:** Persistent reminder feedback duplicates toasts. **Mitigation:** Keep success/info toasts, but use the in-page banner as the sole transport-error feedback.
- **Risk:** Automated gates are mistaken for visual QA. **Mitigation:** Keep the authenticated-session blocker in the execution record and final handoff.

## 12. Completion Criteria

Phase 4 is complete when the focused hardening tests and all final automated gates pass, scope checks show no business-contract or backend changes, the execution record documents the exact commits and evidence, and manual visual QA is either completed with an authenticated session or explicitly recorded as blocked.
