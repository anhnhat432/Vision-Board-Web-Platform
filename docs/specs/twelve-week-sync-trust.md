# Twelve Week Sync Trust Spec

## 1. Context & Goal

- Feature / bug: 12-week execution must remain local-first while making cloud sync state visible and trustworthy.
- Why now: real-mode users expect cross-device continuity without losing local progress.
- User impact: users know whether work is saved locally, syncing, synced, offline, or blocked by conflict.
- Modes affected: real primary; demo must not call protected sync paths.

## 2. Surface Classification

- Type: Core
- Touched domains: localStorage, outbox, cloud sync, conflict handling, settings sync state, 12-week plan/task/review data.
- Existing invariants that must not break: local save succeeds without backend; remote failure never destroys local progress; persisted shapes require migration if changed.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user working through 12-week loop.
- Secondary actor(s): offline user, demo user, conflict resolver.
- Route(s): /12-week-system, /settings, dashboard/today/review surfaces.
- API / hook / store touchpoints: AutoCloudSyncProvider, useSyncedUserData, storage-twelve-week, syncService, conflict dialogs.

## 4. Functional Requirements

1. WHEN user changes 12-week data, THE system SHALL save locally before attempting remote sync.
2. WHILE backend or network is unavailable, THE system SHALL keep local data usable and show offline/error sync state.
3. WHEN protected sync lacks Firebase auth readiness, THE system SHALL not call protected backend endpoints.
4. WHERE local and cloud versions conflict, THE system SHALL preserve both enough context to let user choose or safely auto-resolve by documented LWW/tombstone rules.
5. WHEN sync succeeds, THE system SHALL surface a visible synced/last synced signal for signed-in real-mode users.
6. WHEN the optional LWW staging proof runs, THE workflow and E2E harness SHALL require explicit overwrite opt-in and a dedicated `LWW_E2E_EMAIL` marker before mutating any shared cloud workspace.
7. WHERE the workflow target is for deployed launch proof, THE workflow SHALL reject `localhost` and `127.0.0.1` so local-only URLs cannot satisfy staging evidence.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: UserData, Goal, TwelveWeekSystem, outbox; no shape change without migration.
- migration or normalization needed: required for any stored shape change.
- backend models or API contracts touched: Goal, Plan, Week, Task, LeadMetric, DailyCheckIn, WeekReview sync metadata.
- sync ordering guarantees: local write first, remote best-effort per call, conflict handling never deletes local progress silently.
- rollback / restore concerns: export/backup should remain available before destructive restore/delete operations.

## 6. Non-functional Requirements

- performance / latency: sync must not block primary 12-week interaction.
- accessibility: sync status text must be readable and not color-only.
- observability / logging: track drain_failed, conflict, unsafe, and backend errors.
- security / privacy: protected sync requires signed-in Firebase user.

## 7. Out of Scope

- Replacing localStorage with server-only source of truth.
- Building collaboration/multi-user editing.
- Changing 12-week product model.

## 8. Acceptance Criteria

- [x] local 12-week changes survive backend failure.
- [x] signed-in user sees sync status and last result somewhere reachable.
- [x] demo mode does not call protected sync endpoints.
- [x] conflict/error states are surfaced, not swallowed.
- [x] schema/index tests cover sync metadata where backend models change.
- [x] optional LWW staging proof requires explicit overwrite opt-in and rejects non-`+lww` style credentials before mutating cloud data.
- [x] optional LWW staging proof rejects localhost and loopback targets before browser startup.

## 9. Verification Plan

```bash
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run test:sync -- src/app/components/root-layout/SyncStatusPill.test.tsx src/features/plan12week/persistence/mutationQueueOffline.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts src/features/plan12week/persistence/syncContract.test.ts
npm run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx src/app/components/twelve-week/TwelveWeekLocalStatusSection.test.tsx
npm run test:e2e:lww
npm run test:ops
npm run typecheck
npm run test:run
npm run build
npm --prefix backend run typecheck
npm --prefix backend run build
```

Focused evidence:

- Local-first write safety: `src/features/plan12week/pages/twelve-week-write-safety.test.tsx`.
- Demo/offline protected sync guards: `src/features/plan12week/persistence/mutationQueueOffline.test.ts`, `src/features/plan12week/persistence/mutationQueueSender.test.ts`, and `src/features/plan12week/hooks/useAutoCloudSync.test.ts`.
- Visible sync status and last result: `src/app/pages/SettingsPage.account-export.test.tsx` and `src/app/components/root-layout/SyncStatusPill.test.tsx`.
- Deployed fast smoke proof for visible sync trust: `scripts/smoke-production-quick.mjs` opens `/settings#account-sync`, triggers the manual account-sync check, and requires a user-visible production-safe state before billing smoke continues.
- Deployed smoke proof for visible sync trust: `scripts/smoke-production-e2e.mjs` navigates to `/settings#account-sync` after successful 12-week sync and verifies last-synced, zero-pending, local-safe sync copy, and no email-verification blocker on success path.
- Conflict/error surfacing: `src/app/components/twelve-week/TwelveWeekLocalStatusSection.test.tsx`.
- Backend sync metadata/index coverage: `backend/src/tests/syncSchemaModels.test.ts`.

Optional staging:

```bash
npm run test:e2e:lww
```

## 10. Batch Evidence - 2026-06-25

- Local-first write safety verified by `src/features/plan12week/pages/twelve-week-write-safety.test.tsx`: task changes, daily check-ins, weekly reviews, linked reflections, lag metrics, scoreboard updates, and outbox events remain local when async queue/backend sync fails.
- Visible sync trust verified by `src/app/components/root-layout/SyncStatusPill.test.tsx` and `src/app/pages/SettingsPage.account-export.test.tsx`: signed-in users see synced/syncing/offline/error/email-unverified states, pending counts, last sync/result details, and local-data-safe copy.
- Deployed quick smoke now verifies a reachable visible sync-trust surface via `scripts/smoke-production-quick.mjs`: after opening Settings and pressing the account-sync check button, the deployed app must show either a synced account state or an email-verification blocker, and both paths must keep local-data-safe copy visible.
- Deployed production smoke now verifies same trust surface end-to-end via `scripts/smoke-production-e2e.mjs`: after 12-week writes drain successfully, `/settings#account-sync` must show account last-synced evidence, zero pending account changes, local-safe synced copy, and no email-unverified blocker.
- Demo/offline/auth guards verified by `src/features/plan12week/persistence/mutationQueueOffline.test.ts`, `src/features/plan12week/persistence/mutationQueueSender.test.ts`, `src/features/plan12week/hooks/useAutoCloudSync.test.ts`, and `src/features/plan12week/persistence/syncContract.test.ts`: demo mode, signed-out state, missing auth readiness, and offline queues do not call protected backend sync paths.
- Conflict/error surfacing verified by `src/app/components/twelve-week/TwelveWeekLocalStatusSection.test.tsx`: conflict details render visibly, conflict actions use safe counts only, and cloud overwrite requires explicit confirmation.
- Backend sync metadata/index coverage verified by `backend/src/tests/syncSchemaModels.test.ts`: optional client ids and sync metadata stay compatible with legacy records, partial indexes support client-id lookup/delta pull, and discount uniqueness remains one schema source.
- Verification passed:
  - `npm.cmd run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx` (5 tests passed)
  - `npm.cmd run test:sync -- src/app/components/root-layout/SyncStatusPill.test.tsx src/features/plan12week/persistence/mutationQueueOffline.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts src/features/plan12week/persistence/syncContract.test.ts` (73 tests passed)
  - `npm.cmd run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx src/app/components/twelve-week/TwelveWeekLocalStatusSection.test.tsx` (26 tests passed)
  - `npm.cmd --prefix backend run typecheck`
  - `npm.cmd --prefix backend run build`
  - `node --test backend\\dist\\tests\\syncSchemaModels.test.js` with dummy local Firebase env (3 tests passed)
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`

## 11. Open Questions / Follow-ups

- LWW E2E harness readiness was tightened in `e2e/sync-lww.spec.ts`: missing env still skips safely, the test no longer depends on an undefined `waitFor`, task toggles target the Today shell, mutation queue idle scans all `visionboard_data_mutation_queue*` localStorage keys, and destructive tombstone setup uses the in-app cloud-workspace `AlertDialog` flow instead of `window.confirm`.
- Field-complete sync coverage was refreshed against code/tests in `docs/specs/twelve-week-field-complete-sync.md`; keep that spec as the field-gap ledger.
- LWW E2E requires staging credentials and cannot run locally without them.

## 11.1. Batch Evidence - 2026-06-26

- `.github/workflows/lww-e2e-staging.yml` and `e2e/sync-lww.spec.ts` now require both `LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE` and a dedicated `LWW_E2E_EMAIL` marker such as `+lww` before any overwrite-capable staging sync proof runs.
- `.github/workflows/lww-e2e-staging.yml` now rejects `localhost` and `127.0.0.1` targets before Playwright starts, so local-only runs cannot satisfy staging evidence.
- `scripts/github-workflow-guards.test.mjs` now keeps the LWW overwrite opt-in and email-marker rules aligned with operator docs.
- Full-pull conflict apply now respects `skipEntities` for local-winning week, task, daily check-in, weekly review, and lead metric records, so cursor fallback/full snapshot recovery uses the same local-first overwrite protection as delta pull.
- Production-core aggregate guard now includes backend sync schema/index proof through `npm run test:production-core:backend:sync`, so local PR/main proof covers both sync pull contracts and sync metadata/index compatibility from this spec.
- Production-core aggregate guard now also includes the frontend field-complete pull/apply/merge/manual-sync proof set through `npm run test:production-core:sync`, so local PR/main proof covers both backend sync contracts and frontend local-first recovery behavior from this spec family.
- Verification passed:
  - `npm.cmd run test:e2e:lww` (3 tests skipped by safety guard)
  - `npm.cmd run test:ops` (15 tests passed)
