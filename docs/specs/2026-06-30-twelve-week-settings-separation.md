# Twelve-week cycle settings separation

## 1. Context & Goal

- Feature / bug: The 12-week system settings tab mixes cycle controls with app/account/data settings.
- Why now: Users expect the tab inside the 12-week system to configure the active cycle only.
- User impact: Less cognitive load in the execution hub; account, billing, sync, and destructive data actions live under `/settings`.
- Modes affected: both `real` and `demo`.

## 2. Surface Classification

- Type: `Mixed`
- Touched domains: 12-week UI settings, app settings, destructive data controls.
- Existing invariants that must not break:
  - No localStorage keys or stored shapes change.
  - Local-first save and sync behavior remain unchanged.
  - Destructive account/data actions still use `AlertDialog`.
  - Real-mode billing remains routed through existing billing pages and helpers.

## 3. Actors & Entry Points

- Primary actor: signed-in or local-only user managing a 12-week cycle.
- Secondary actor(s): real-mode user managing account/sync/billing data.
- Route(s): `/12-week-system?tab=settings`, `/settings`, `/billing/plan`.
- API / hook / store touchpoints: existing storage/app preference helpers and sync service actions only.

## 4. Functional Requirements

1. WHEN user opens `/12-week-system?tab=settings`, THE system SHALL show only active-cycle controls: review rhythm, reminder time, load preference, status, tactic priority/type, weekly time blocks, and reset-current-cycle.
2. WHEN user needs account, billing, sync, notification, export/import, or destructive account/data controls, THE system SHALL expose those controls from `/settings` or the existing billing route instead of the 12-week cycle tab.
3. WHILE signed in real mode, THE system SHALL keep cloud-only delete and account delete behind explicit confirmation dialogs.
4. WHERE settings copy references sync or account safety, THE system SHALL preserve local-first language and not imply local progress is deleted by failed sync.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: no change.
- rollback / restore concerns: cloud-only delete keeps local data; full account/data delete remains guarded separately.

## 6. Non-functional Requirements

- performance / latency: no new route-level dependency or eager 12-week chunk loading from `/settings`.
- accessibility: keep buttons labelled, focusable, and destructive dialogs explicit.
- observability / logging: no new analytics required.
- security / privacy: no secret exposure; no destructive action through `window.confirm`.

## 7. Out of Scope

- Redesigning the full `/settings` page.
- Changing billing provider behavior.
- Changing sync conflict resolution semantics.

## 8. Acceptance Criteria

- [x] `/12-week-system?tab=settings` does not render billing, sync, app preference, quick shortcut, feedback, or account/data danger sections.
- [x] `/12-week-system?tab=settings` still allows resetting the current cycle.
- [x] `/settings` keeps account/data export, sync status, billing link, local temporary data cleanup, cloud-only delete, and account/data delete reachable.
- [x] Existing localStorage shape and backend contracts are unchanged.

## 9. Verification Plan

Commands to run:

```bash
npm run typecheck
npm run test:ui -- src/app/components/TwelveWeekSystemSections.test.tsx src/app/pages/SettingsPage.account-export.test.tsx
npm run test:flows -- src/features/plan12week/pages/12WeekSystem.destructive.test.tsx
npx biome lint src/app/components/twelve-week/TwelveWeekSettingsTab.tsx src/features/plan12week/components/WeekEditor.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx src/app/pages/SettingsPage.tsx src/app/components/TwelveWeekSystemSections.test.tsx src/app/pages/SettingsPage.account-export.test.tsx src/features/plan12week/pages/12WeekSystem.destructive.test.tsx
```

Broaden to `npm run test:run` or `npm run check` if the targeted run exposes shared failures.

## 10. Open Questions / Follow-ups

- Consider a future `/settings#notifications` anchor if notification controls continue to grow.
