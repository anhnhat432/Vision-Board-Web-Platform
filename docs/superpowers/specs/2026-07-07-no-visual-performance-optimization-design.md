# No-Visual Performance Optimization Design

## Goal

Improve perceived smoothness in this order: public landing, core 12-week app, then system reliability, without changing visible UI, copy, layout, colors, spacing, route behavior, or brand assets.

## Scope

- Public landing: avoid background work that competes with initial paint or early scroll.
- Core app: reduce idle/background listeners and work for users who cannot use a feature yet.
- System: keep the build and focused tests green after performance-only changes.

## Non-Goals

- No visual redesign.
- No copy changes.
- No animation, color, spacing, or component hierarchy changes unless required by a measured bug and approved separately.
- No storage schema, billing, entitlement, auth, or backend API contract changes.
- No dependency additions.

## Accepted Approach

1. Measure the current build and browser behavior first.
2. Make only small changes tied to observed background work.
3. Add tests before production code where behavior changes are testable.
4. Verify with focused tests, typecheck/build, and before/after route measurements.

## Acceptance Criteria

- WHEN a signed-out visitor opens the public landing route, THE system SHALL NOT warm-prefetch heavy app routes in the root shell before user intent.
- WHEN a signed-in user opens the app shell, THE system MAY warm-prefetch existing primary routes on capable connections, preserving current navigation behavior.
- WHEN there is no authenticated owner for 12-week cloud sync, THE system SHALL NOT attach reconnect listeners solely for auto-sync.
- WHEN network tracking becomes enabled after auth or owner readiness changes, THE system SHALL refresh the current browser online/offline status before relying on reconnect events.
- WHILE the app is offline or unconfigured, THE system SHALL preserve local-first behavior and existing sync guard behavior.
- WHERE performance changes are made, THE system SHALL preserve all visible markup intent and route output.

## Verification

- Focused tests for prefetch gating, network listener gating, and late-enabled network status refresh.
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Browser profiling against local preview for `/` and core app routes where possible.
