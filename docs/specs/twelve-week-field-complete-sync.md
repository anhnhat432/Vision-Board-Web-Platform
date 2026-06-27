# Twelve Week Field-Complete Sync Spec

## 1. Context & Goal

- Feature / bug: 12-week cloud sync needs maintained proof for field-complete round-trip restore of supported setup metadata, lead metric handling, and tombstones.
- Why now: real-mode users need cross-device continuity that preserves the full 12-week execution model, not only the supported subset.
- User impact: a signed-in user can create or update a 12-week plan on one device and recover the same plan state on another device without silent field loss.
- Modes affected: real primary; demo remains local-only for protected sync.

## 2. Surface Classification

- Type: Core
- Touched domains: 12-week import payload, backend import/pull contracts, pulled workspace apply, mutation queue, tombstone handling, tests.
- Existing invariants that must not break: local save first; protected sync never required for local execution; demo mode must not call protected backend sync; no localStorage key or shape changes without migration.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user using 12-week setup/execution across devices.
- Secondary actor(s): offline user, returning user on fresh browser, conflict resolver.
- Route(s): `/12-week-setup`, `/12-week-system`, `/settings`.
- API / hook / store touchpoints: `buildTwelveWeekImportPayload`, `applyPulledWorkspaceToUserData`, `pullTwelveWeekWorkspace`, mutation queue, backend import/pull repositories.

## 4. Current Evidence

- `src/features/plan12week/persistence/twelveWeekImportPayload.ts` sends rich setup metadata such as `lagMetric`, `milestones`, `successEvidence`, `reviewDay`, `week12Outcome`, `timezone`, `weekStartsOn`, preferences, and lead metrics.
- `backend/src/services/twelve-week-import/types.ts` now persists supported plan setup metadata; lead metric logs remain outside the local import payload because the local execution shape stores daily check-ins/reviews instead.
- `src/features/plan12week/persistence/pulledWorkspaceApply.ts` rebuilds local systems from pulled goals/plans/weeks/tasks/check-ins/reviews and applies supported plan metadata before deriving local scoreboard state.
- Pull tombstone application now handles goals/plans/weeks/tasks/daily check-ins/weekly reviews. Lead metric tombstones are explicitly unsupported locally because the current local shape has no per-metric entity; local lead indicators remain derived from pulled metrics/tasks.

## 5. Functional Requirements

1. WHEN a 12-week plan is imported or synced, THE system SHALL preserve setup metadata needed to reconstruct the local plan without fallback loss.
2. WHEN lead metric history exists on the backend, THE system SHALL either apply it to a compatible local shape or flag it as unsupported before auto-apply so progress/history is not silently dropped.
3. WHERE backend pull returns tombstones, THE system SHALL apply tombstones for every synced entity type or explicitly document unsupported entity types with tests.
4. WHILE backend sync is unavailable, THE system SHALL keep local execution usable and queue retryable mutations without clearing local progress.
5. WHERE real/demo mode differs, THE system SHALL keep protected pull/import/mutation paths real-mode/auth-only.
6. WHEN a delta pull returns updated goal, plan, week, or lead metric entities, THE system SHALL merge those supported metadata changes into the existing local 12-week system without clearing local task/check-in/review execution records.
7. WHEN a pulled cloud entity matches an unresolved pending local mutation, THE system SHALL create a conflict record and classify the winner with LWW/tombstone rules before auto-apply, even when the cloud timestamp is older, so `skipEntities` can protect local-winning work.

## 6. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none expected. If `TwelveWeekSystem`, `Goal`, mutation queue, or link-store shapes change, add migration and focused tests.
- migration or normalization needed: only if a persisted local shape changes.
- backend models or API contracts touched: likely Plan, Week, LeadMetric, pull response mappers, import repository, mutation handlers.
- sync ordering guarantees: local write first; backend pull must not overwrite newer local pending mutations without conflict/LWW handling.
- rollback / restore concerns: keep export/backup flows available before destructive cloud overwrite or delete.

## 7. Non-functional Requirements

- performance / latency: full pull should remain bounded for one account workspace; large workspaces need pagination/cursor behavior.
- accessibility: any new sync warning/conflict copy must be readable text, not color-only.
- observability / logging: log unsupported or skipped entity fields during validation/import/pull where useful.
- security / privacy: no billing, analytics, or cross-user data in 12-week workspace pull/apply.

## 8. Out of Scope

- Making backend the source of truth for all non-12-week product surfaces.
- Replacing localStorage.
- Changing the 12-week UX model or adding collaboration.

## 9. Acceptance Criteria

- [x] plan setup metadata round-trips through import/pull/apply without default fallback for supported fields.
- [x] lead metric history/log data round-trips or is explicitly excluded with user-safe behavior and tests.
- [x] tombstones for all synced entity types are applied or documented as unsupported with tests.
- [x] pending local mutations still win or conflict safely when pulled cloud data is older.
- [x] local-winning pending mutations are represented as conflicts before auto-apply so cloud apply can skip those entities.
- [x] demo/signed-out modes do not call protected pull/import/mutation endpoints.
- [x] delta pull applies supported goal, plan, week, and lead metric updates without dropping existing local execution records.

## 10. Verification Plan

```bash
npm run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/syncContract.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts
npm run test:run -- src/features/plan12week/persistence/twelveWeekImportPayload.test.ts
npm --prefix backend run test:run -- dist/tests/syncPullRoutes.test.js dist/tests/twelveWeekImportPlanPayload.test.js
npm run typecheck
npm --prefix backend run typecheck
```

Optional staging:

```bash
npm run test:e2e:lww
```

## 11. Batch Evidence - 2026-06-25

- Plan metadata import/pull/apply is covered by `backend/src/tests/twelveWeekImportPlanPayload.test.ts`, `backend/src/tests/syncPullRoutes.test.ts`, and `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`.
- Week tombstones are applied to local `weeklyPlans`, `taskInstances`, and `weeklyReviews` in `src/features/plan12week/persistence/pulledWorkspaceApply.ts`.
- Lead metric tombstones are documented unsupported for local deletion and covered by `pulledWorkspaceApply.test.ts`; local derived `leadIndicators`, tasks, and check-ins are preserved instead of being deleted incorrectly.
- Lead metric logs are now explicitly excluded from local apply because `TwelveWeekSystem` has no per-metric log entity. `createPulledWorkspaceMergeReport` flags `leadMetricLogs` as unsupported and blocks silent auto-apply when cloud-only metric logs are present.
- Pending local mutation safety is covered by `useTwelveWeekManualCloudSync.test.ts` and `pulledWorkspaceMergeReport.test.ts`: cloud-newer conflicts do not overwrite local data, local-non-conflicting/pending paths apply safely, and unresolved conflict mutations stay blocked until the user chooses a resolution.
- Demo and signed-out guards are covered by `syncContract.test.ts`, `useAutoCloudSync.test.ts`, `useTwelveWeekManualCloudSync.test.ts`, `mutationQueueSender.test.ts`, and `usePlanSetupSync.test.ts`; protected pull/import/mutation dependencies are not called outside real authenticated sync.
- Verification passed:
  - `npm run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/twelveWeekImportPayload.test.ts src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts`
  - `npm run test:sync -- src/features/plan12week/persistence/roundTripSync.test.ts`
  - `npm run test:sync -- src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts src/features/plan12week/persistence/syncContract.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/usePlanSetupSync.test.tsx`
  - `npm --prefix backend run test:run -- dist/tests/syncPullRoutes.test.js dist/tests/twelveWeekImportPlanPayload.test.js`
  - `npm run typecheck`
  - `npm --prefix backend run typecheck`
  - `npm --prefix backend run build`
  - `npm run build`
- Full `npm run lint` now passes in the current tree.

## 12. Batch Evidence Refresh - 2026-06-25

- Frontend import/apply/merge/round-trip evidence refreshed:
  - `pulledWorkspaceApply.test.ts` verifies supported pull/apply behavior and tombstone handling.
  - `twelveWeekImportPayload.test.ts` verifies rich import payload serialization.
  - `pulledWorkspaceMergeReport.test.ts` verifies conflicts, missing client ids, cloud-only changes, pending delete mutations, tombstones, and unsupported lead metric logs are reported instead of silently applied.
  - `roundTripSync.test.ts` verifies import -> backend echo -> pull -> apply preserves supported tasks, daily check-ins, weekly reviews, plan metadata, lead indicator data via metrics, user isolation, and non-sync field isolation.
- Protected sync guards refreshed:
  - `useTwelveWeekManualCloudSync.test.ts`, `useAutoCloudSync.test.ts`, `syncContract.test.ts`, `mutationQueueSender.test.ts`, and `usePlanSetupSync.test.tsx` verify conflict-safe manual sync, demo/signed-out/auth-unready guards, mutation sending contracts, and setup-sync local-first behavior.
- Backend pull/import evidence refreshed:
  - `syncPullRoutes.test.ts` verifies auth requirement, empty workspace, field-rich pull payload, incremental pulls, daily check-in/review deltas, tombstones, same-client-id user isolation, invalid cursors, and exclusion of analytics/billing/entitlement/mock checkout fields.
  - `twelveWeekImportPlanPayload.test.ts` verifies supported setup metadata preservation and older `weekStartsOn` normalization.
- Verification passed:
  - `npm.cmd run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/twelveWeekImportPayload.test.ts src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts src/features/plan12week/persistence/roundTripSync.test.ts` (55 tests passed)
  - `npm.cmd run test:sync -- src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts src/features/plan12week/persistence/syncContract.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/usePlanSetupSync.test.tsx` (80 tests passed)
  - `npm.cmd --prefix backend run typecheck`
  - `npm.cmd --prefix backend run build`
  - `node --test backend\\dist\\tests\\syncPullRoutes.test.js backend\\dist\\tests\\twelveWeekImportPlanPayload.test.js` with dummy local Firebase env (12 tests passed)
  - `npm.cmd --prefix backend run test:run -- dist/tests/syncPullRoutes.test.js dist/tests/twelveWeekImportPlanPayload.test.js` (12 tests passed)
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`

## 13. Open Questions / Follow-ups

- Decide whether lead metric logs should eventually map into a new local metric-log entity shape with migration, or remain merge-report-only cloud evidence.
- Confirm whether lead metric tombstones should become actionable later by adding a local metric entity shape and migration.
- Confirm staging credentials for LWW E2E before claiming production cross-device readiness.

## 14. Batch Evidence - 2026-06-26

- Delta pull apply now merges supported `goals`, `plans`, `weeks`, and `leadMetrics` before task/check-in/review deltas, while respecting `skipEntities` for local-winning conflicts.
- `pulledWorkspaceApply.test.ts` covers incremental goal/plan/week/lead metric deltas and verifies existing task instances, daily check-ins, weekly reviews, and local-only event log survive the merge.
- `pulledWorkspaceMergeReport.test.ts` now covers older-cloud/local-winning pending mutation conflicts.
- `useTwelveWeekManualCloudSync.test.ts` now verifies delta pull auto-resolves a local-winning pending task mutation and does not overwrite the local task state.
- Full pull apply now also respects `skipEntities`: local-winning week, task, daily check-in, weekly review, and lead metric records are restored after cloud snapshot rebuild instead of being silently overwritten during cursor fallback or full-sync auto-resolve.

## 14.1. Production-Core Guard Tightening - 2026-06-27

- `test:production-core:sync` now includes the field-complete local proof set:
  - `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`
  - `src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts`
  - `src/features/plan12week/persistence/roundTripSync.test.ts`
  - `src/features/plan12week/persistence/twelveWeekImportPayload.test.ts`
  - `src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts`
  - `src/features/plan12week/hooks/usePlanSetupSync.test.tsx`
- This makes the aggregate launch guard fail if supported 12-week import/pull/apply metadata round-trip, tombstone handling, conflict reporting, manual-sync local-first resolution, or setup-sync backend/local goal id wiring regresses.
- Focused verification passed:
  - `npm.cmd run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts src/features/plan12week/persistence/roundTripSync.test.ts src/features/plan12week/persistence/twelveWeekImportPayload.test.ts` (59 tests passed)
  - `npm.cmd run test:sync -- src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts src/features/plan12week/hooks/usePlanSetupSync.test.tsx` (27 tests passed)
  - `npm.cmd run test:production-core:sync` (152 tests passed)
