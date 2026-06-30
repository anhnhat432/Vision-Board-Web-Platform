# Settings page UI upgrade

## 1. Context & Goal

- Feature / bug: `/settings` now owns account, experience, sync, data, and destructive actions after cycle settings were separated from the 12-week system.
- Why now: The page needs stronger hierarchy so users can quickly understand account state, sync safety, and where each setting belongs.
- User impact: Less scanning fatigue, clearer trust around local-first data, and safer destructive actions.
- Modes affected: both `real` and `demo`.

## 2. Surface Classification

- Type: `Mixed`
- Shell scope: layout, visual hierarchy, section framing, quick navigation, responsive polish, microcopy clarity.
- Core contract to preserve:
  - No localStorage keys or stored data shapes change.
  - No backend API contracts change.
  - No sync ordering or best-effort semantics change.
  - Account export, cloud delete, account delete, local clear, import, and retry-sync handlers keep the same behavior.
  - Destructive actions keep in-app confirmation dialogs.

## 3. Functional Requirements

1. WHEN user opens `/settings`, THE system SHALL show a concise account/sync summary before dense controls.
2. WHEN user scans settings, THE system SHALL group controls into account, experience, data/sync, safety, and app info sections.
3. WHILE offline, syncing, email-unverified, or pending sync exists, THE system SHALL keep local-first safety copy visible.
4. WHERE actions are destructive, THE system SHALL keep them visually separated from routine settings and guarded by existing dialogs.
5. WHERE the user needs cycle-specific settings, THE system SHALL link to `/12-week-system?tab=settings` without moving cycle controls back into `/settings`.

## 4. Non-functional Requirements

- Mobile-first: single column, tap targets remain comfortable, no horizontal overflow.
- Product UI: restrained surface hierarchy using existing semantic tokens.
- Accessibility: labelled controls, visible focus states inherited from existing components, semantic sections.
- Performance: no new route dependency or media asset required.

## 5. Acceptance Criteria

- [x] `/settings` has a stronger hero/summary and section navigation.
- [x] Account, experience, data/sync, safety, and app info are visually distinct.
- [x] Existing account export/delete and local data actions remain reachable.
- [x] Existing tests for account lifecycle and sync status still pass.
- [x] Targeted typecheck/lint/test pass.
- [x] Second visual pass removes over-designed clutter: no stacked status-card block, no timeline ledger, no mobile `content-visibility` blank space, and a calmer danger zone.
- [x] Third visual pass makes Settings quieter again: no hero image, no decorative data map, no app-wide reminder overlay on `/settings`, and a single-column settings rhythm.

## 6. Verification Plan

```bash
npm run typecheck
npm run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx
npx biome lint src/app/pages/SettingsPage.tsx src/app/pages/SettingsPage.account-export.test.tsx
```

Add visual smoke with a local dev/preview server if the route renders cleanly in tests.

Visual smoke completed with local dev server and a temporary Playwright script on desktop/mobile. The temporary script and screenshots were removed after the run.

Second visual smoke completed after simplification on desktop/mobile. The route rendered without horizontal overflow, hero image assets loaded, and mobile no longer showed blank deferred sections.

Third visual smoke completed after the calmer redesign on desktop/mobile. The route rendered without horizontal overflow, without visible reminder overlay, without open guide dialogs, and without console errors.
