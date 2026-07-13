# Admin UI System - Phase 1 Design

**Date:** 2026-07-14
**Status:** Approved in conversation
**Surface classification:** Shell
**Modes affected:** `real` and `demo`

## 1. Context

The Admin area has grown to twelve navigation destinations and several detail routes. Shared shell components already exist, but the experience still feels uneven because navigation, page chrome, filters, tables, feedback, and data states are not applied consistently across pages.

This design establishes the long-term Admin visual system and implements its first vertical slice. Phase 1 upgrades the shared shell for every Admin route, then fully migrates Dashboard and Users as reference pages for later phases.

This spec supersedes the standalone execution of:

- `docs/superpowers/specs/2026-07-14-admin-users-ux-clarity-design.md`
- `docs/superpowers/plans/2026-07-14-admin-users-ux-clarity.md`

The approved Users requirements are retained in this spec and must be included in the new Phase 1 implementation plan.

## 2. Goals

- Make every Admin route feel like part of one coherent operational product.
- Optimize for desktop operations while keeping important actions usable on mobile.
- Support both light and dark application themes through existing `app-*` tokens.
- Establish reusable page, toolbar, data, feedback, and state patterns without creating a generic business-logic framework.
- Use Dashboard and Users as the reference implementations for subsequent Admin migrations.
- Preserve all existing Admin APIs, route behavior, auth checks, billing authority, classification semantics, and data mutations.

## 3. Non-Goals

- No backend, model, API contract, auth, billing, entitlement, or storage changes.
- No route additions, removals, or renames.
- No new dependency.
- No redesign of every Admin page body in Phase 1.
- No collapsible desktop sidebar in Phase 1.
- No global Admin search spanning multiple resources.
- No universal `DataTable` abstraction that owns filtering, pagination, or mutations.

## 4. Design Direction

The selected direction is **Editorial Operations**:

- neutral application backgrounds and restrained surfaces;
- clear typography and information hierarchy;
- subtle borders with minimal shadow and gradient usage;
- one application accent for navigation and primary actions;
- semantic colors reserved for operational state and risk;
- medium information density suitable for long sessions;
- low-motion transitions that respect `prefers-reduced-motion`.

The Admin area remains visually aligned with the rest of the product. It must use existing application tokens instead of introducing an Admin-only color theme.

## 5. Information Architecture

The sidebar keeps all current destinations but groups them for faster scanning.

### Overview

- `/admin/dashboard` - Tổng quan

### Customers

- `/admin/users` - Người dùng
- `/admin/subscriptions` - Subscription
- `/admin/email-history` - Email

### Business

- `/admin/reports/sales` - Báo cáo kinh doanh, real mode only
- `/admin/payments` - Thanh toán
- `/admin/refunds` - Hoàn tiền
- `/admin/discounts` - Giảm giá

### Operations

- `/admin/orders` - Đơn hàng
- `/admin/catalog` - Catalog

### System

- `/admin/settings` - Cài đặt
- `/admin/audit-logs` - Audit Logs

Group labels are orientation aids, not interactive controls. Existing active-route behavior and pending-count badges remain available. The real-mode Sales Report boundary must remain unchanged.

## 6. Shared Shell

### `AdminLayout`

- Preserve all current auth, configuration, role, retry, logout, and redirect behavior.
- Render a fixed desktop sidebar of approximately 256px and a sticky topbar.
- Use a wide content region suitable for data tables while retaining safe page padding.
- Apply one consistent page background, foreground, spacing rhythm, and entry animation to every Admin route.
- Keep the mobile sidebar inside the existing `Sheet` behavior.

### `AdminSidebar`

- Render the five approved navigation groups.
- Keep a clear active state using background, icon color, and a non-color-only indicator.
- Keep pending badges for Orders, Payments, and Refunds.
- Keep account identity and logout reachable without competing with navigation.
- Do not add collapse/expand state in Phase 1.

### `AdminTopbar`

- Show mobile menu access, Admin breadcrumb, and current page label.
- Render page search only when the current page registers a real search handler.
- Remove the disabled search placeholder when no page supports search.
- Keep layout height stable whether search is present or absent.
- Reserve the right side for contextual controls without duplicating `AdminPageHeader` actions.

## 7. Shared Presentation Components

Phase 1 may update existing components or add focused presentational wrappers with these responsibilities.

### `AdminPageHeader`

- Page title, concise description, optional metadata, and page-level actions.
- Responsive stacking with one visually dominant primary action at most.

### `AdminToolbar`

- Layout wrapper for search, filters, result count, selection controls, and secondary actions.
- Own presentation and responsive wrapping only.
- Pages continue to own query state, URL state, pagination, and mutations.

### `AdminDataPanel`

- Consistent surface for a table or list.
- Optional heading/summary slot and footer/pagination slot.
- Does not prescribe row types or fetch behavior.

### `AdminFeedbackBanner`

- Persistent in-page feedback for important mutations and partial failures.
- Supports success, warning, and error semantics, a labelled dismiss action, and optional expandable details.
- Toasts remain suitable for brief non-critical confirmation, but must not be the only feedback for a multi-record or partially failed operation.

### `AdminStatusBadge`

- Keep explicit text labels and semantic tones.
- Neutral: default or inactive.
- Informational: processing or informational state.
- Warning: pending or attention required.
- Success: completed or explicitly confirmed.
- Danger: failed, rejected, cancelled, or destructive risk.
- Never rely on color alone.

### Data-state components

- Loading skeletons should resemble the final content shape and avoid layout jumps.
- Empty states explain why no data is visible and offer a next action when one exists.
- Error states retain existing filters and visible stale data where safe, explain the failure, and provide retry.

These components must stay small and composable. A page should remain understandable without reading a large shared configuration object.

## 8. Reference Page Migration

### 8.1 Dashboard

Dashboard becomes the reference for page hierarchy and operational overview.

- Use the standard `PageHeader -> content sections` rhythm.
- Keep existing API calls and metrics unchanged.
- Present KPI cards with restrained semantic accents rather than unrelated decorative colors.
- Group recent activity and operational previews into consistent data panels.
- Apply shared loading, empty, and error states.
- Keep refresh behavior and pending-count updates unchanged.
- Avoid claiming unsupported active-user or DAU metrics.

### 8.2 Users

Users becomes the reference for search, filters, tables, bulk actions, and mutation feedback.

- Show operational classification in a dedicated `Trạng thái dữ liệu` column.
- `{ effectiveCategory: "real", source: "user" }` renders `Dữ liệu thật · Đã xác nhận` with confirmed semantics.
- Default, legacy, or missing real classification renders `Dữ liệu thật · Mặc định` with neutral semantics and must not look explicitly confirmed.
- `test` renders `Test`; `internal` renders `Nội bộ`.
- Hide the bulk-action panel when no users are selected and no retry target is pending.
- Preserve retry targets and existing request-ID, idempotency, URL filter, and navigation behavior.
- Show updated, unchanged, and failed counts separately after bulk classification.
- Keep raw failed UIDs in expandable details rather than the primary live message.
- Provide a labelled dismiss action for result feedback.
- Rename `CSV` to `Xuất CSV`.
- Give search an accessible name and `type="search"`.
- Expose role filters as one labelled group with `aria-pressed` on each option.
- Add a table caption, `scope="col"` headers, and practical checkbox hit targets.

## 9. Responsive Behavior

- Desktop is the primary operating surface.
- At `lg` and above, the sidebar stays fixed and the main content uses the available width.
- Below `lg`, navigation moves into a `Sheet` opened from the topbar.
- Toolbars wrap controls in a predictable order: search, filters, result metadata, actions.
- Important actions remain reachable on mobile without horizontal page overflow.
- Simple tables may use an overflow container.
- Pages with high-context rows or many actions will receive card/stacked mobile treatments in their later migration phase rather than being forced into a Phase 1 universal pattern.

## 10. Interaction and Accessibility

- Every interactive element has a visible focus state and a usable accessible name.
- Sidebar group labels and active destinations use semantic navigation markup.
- Breadcrumbs use a labelled `nav` landmark.
- Table relationships use captions and scoped headers.
- Filter state is exposed through labels, selected values, or `aria-pressed` as appropriate.
- Color-coded states always include text or an icon with equivalent meaning.
- Irreversible Admin actions continue to use the in-app `AlertDialog`; no `window.confirm` is introduced.
- Loading and mutation feedback use appropriate live-region semantics without placing unbounded identifiers in the live message.
- Motion is limited to subtle color, opacity, and short positional transitions and must respect reduced-motion preferences.

## 11. Data and Behavioral Invariants

- Existing service functions remain the source of Admin data and mutations.
- No fetch call is moved into a shared visual component.
- Existing pagination, filter, request, retry, and mutation semantics remain page-owned.
- Remote refresh failures must not clear already rendered data when retaining it is safe.
- Real/demo route registration and copy boundaries remain unchanged.
- Classification presentation changes must not alter classification persistence, audit records, cascades, entitlement, provider state, or sales-review inclusion.

## 12. Phase Boundaries

### Phase 1 - Shell, Dashboard, and Users

- Implement this spec.
- Establish the shared visual contract and reference pages.

### Phase 2 - Business and operations

- Migrate Orders, Payments, Sales Report, Subscriptions, Refunds, and Discounts using the approved Phase 1 patterns.
- Page-specific behavior requires its own focused design/spec review before implementation if migration changes saved state or mutation flow.

### Phase 3 - System and detail surfaces

- Migrate Catalog, Email History, Settings, Audit Logs, Admin User Detail, and Admin Order Detail.

### Phase 4 - Cross-Admin hardening

- Complete responsive, light/dark, accessibility, consistency, and regression QA across all Admin routes.
- Resolve only findings inside the approved Admin UI scope.

## 13. EARS Acceptance Criteria

- WHEN an authenticated admin opens any `/admin/*` route, THE system SHALL render the same grouped navigation shell and theme-aligned page frame.
- WHEN the current route has no registered search handler, THE system SHALL omit the topbar search control instead of rendering a disabled placeholder.
- WHEN the viewport is below the desktop breakpoint, THE system SHALL make navigation available through the topbar Sheet trigger and SHALL keep important page actions reachable.
- WHEN light or dark application theme is active, THE Admin shell and shared components SHALL remain readable without Admin-specific theme overrides.
- WHEN an Admin page loads, fails, or has no data, THE system SHALL use the corresponding shared state pattern without changing the page's data contract.
- WHEN an important multi-record mutation completes partially or fully, THE system SHALL present persistent in-page counts and SHALL keep verbose failure details outside the primary live message.
- WHEN an admin views any Users row, THE system SHALL show an explicit operational data state in a dedicated column.
- WHEN a Users row receives default-real fallback classification, THE system SHALL label it as default and SHALL NOT present it as explicitly confirmed.
- WHEN no Users rows are selected and no retry is pending, THE system SHALL hide the bulk-action panel.
- WHILE keyboard or assistive-technology users operate navigation, search, filters, tables, selection, and feedback, THE system SHALL expose appropriate landmarks, labels, state, focus, and table relationships.
- WHERE a real-mode-only Admin destination is unavailable in demo mode, THE navigation SHALL preserve the existing mode boundary.

## 14. Verification

### Focused tests

- Sidebar grouping, ordering, active state, pending badges, and real/demo Sales Report visibility.
- Topbar behavior with and without a registered search handler.
- Shared feedback and status presentation.
- Dashboard loading, success, empty, error, and refresh behavior.
- Users classification column, explicit/default labels, accessible search and filters, selection-panel visibility, result summary, failure details, dismissal, retry, and request-ID behavior.

### Static and build gates

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Run the smallest relevant Admin test set first. Broaden to the frontend test suite if shared shell changes expose regressions outside focused coverage.

### Manual QA

- Routes: Dashboard and Users, plus a shell check on every other Admin destination.
- Widths: approximately 1440px, 1024px, and 390px.
- Themes: light and dark.
- Inputs: mouse and keyboard.
- States: loading, populated, empty, error, search, filters, selection, mutation success, partial failure, and retry.

## 15. Risks and Mitigations

- **Risk:** A large generic component hides page-specific behavior. **Mitigation:** Shared components remain presentational; pages own data and mutations.

- **Risk:** Grouping navigation breaks tests or real/demo visibility. **Mitigation:** Preserve route values and add focused navigation tests.

- **Risk:** Theme changes look correct in only one mode. **Mitigation:** Use existing semantic tokens and manually verify both themes at all target widths.

- **Risk:** Updating shared shell changes every Admin route at once. **Mitigation:** Keep route/data contracts unchanged, run shell checks across every route, and fully migrate only Dashboard and Users in Phase 1.

- **Risk:** The old Users implementation plan is executed independently. **Mitigation:** Mark the old documents as superseded and generate a new integrated Phase 1 plan after this spec is reviewed.

## 16. Follow-up Sequence

After Phase 1 passes verification, create focused specs/plans for Phases 2 and 3 using this visual contract. Phase 4 is a cross-route hardening and verification pass, not an opportunity to expand Admin business scope.
