# Admin Sidebar Section Hierarchy Design

**Date:** 2026-07-14
**Status:** Approved in conversation - option 2
**Surface classification:** Shell

## Context

The Admin sidebar group labels are currently small uppercase text on the same background as the navigation. In the rendered sidebar, `Tổng quan`, `Khách hàng`, `Kinh doanh`, `Vận hành`, and `Hệ thống` are difficult to distinguish from secondary copy and do not create strong scan boundaries.

## Selected Direction

Render each group label as a restrained Editorial Operations marker:

- a very light `app-bg-subtle` tint;
- a thin `app-line` border and small control radius;
- a short `app-accent` vertical marker;
- stronger `app-ink-soft` uppercase typography;
- slightly more space below the marker before navigation items.

The marker must remain quieter than the active navigation item. It uses existing application tokens and works in light and dark themes without mode-specific palette classes.

## Invariants

- Keep group names, ordering, routes, icons, badges, active states, pending counts, and real/demo Sales Report visibility unchanged.
- Keep the existing semantic `<section aria-labelledby>` and `<h2>` relationships.
- Do not add a dependency or new shared component.
- Respect the existing reduced-motion behavior; this change adds no animation.

## Acceptance Criteria

- WHEN the sidebar renders, THE system SHALL give every navigation group heading a neutral tinted marker with an accent cue.
- WHEN a route is active, THE active navigation row SHALL remain visually stronger than the group marker.
- WHEN light or dark theme is active, THE marker SHALL use semantic `app-*` tokens.
- WHILE navigation is used, THE system SHALL preserve every route, badge, active-state, and accessibility relationship.

## Verification

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/components/admin/AdminSidebar.tsx src/app/components/admin/AdminSidebar.test.tsx
```

Authenticated visual comparison is not claimed unless a reusable Admin session is available.
