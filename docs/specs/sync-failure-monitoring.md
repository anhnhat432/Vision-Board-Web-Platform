# Sync Failure Monitoring Spec

## 1. Context & Goal

- Feature / bug: sync trust UI already shows local-safe error states, but frontend monitoring did not capture production auto-sync failures with safe metadata.
- Why now: production launch needs operator visibility into failed 12-week sync without relying on console output.
- User impact: users keep local-safe behavior while operators can triage full-sync and drain-only failures faster.
- Modes affected: real primary; demo and signed-out behavior remain unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: auto cloud sync, mutation drain, frontend monitoring, production-core sync tests.
- Existing invariants that must not break: local-first save stays intact; demo/signed-out paths do not call protected sync; monitoring context contains no UID, email, or mutation payload.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user using 12-week execution with cloud sync enabled.
- Secondary actor(s): launch operator reviewing frontend monitoring.
- Route(s): app shell via `AutoCloudSyncProvider`.
- API / hook / store touchpoints: `useAutoCloudSync`, `sendPending12WeekMutations`, `useTwelveWeekManualCloudSync`, `captureFrontendException`.

## 4. Functional Requirements

1. WHEN auto drain-only sync ends in `partial` or `error`, THE system SHALL capture a frontend monitoring event with safe sync metadata.
2. WHEN auto full sync ends in `drain_failed` or `error`, THE system SHALL capture a frontend monitoring event with safe sync metadata.
3. WHERE monitoring context is attached, THE system SHALL include only safe fields such as sync phase, status, failed/pending counts, skip reason, and readiness booleans.
4. WHILE monitoring is disabled or unconfigured, THE system SHALL keep existing sync behavior and warning logs without throwing.
5. WHERE monitoring is captured, THE system SHALL NOT include raw owner UID, email, mutation payload, or pulled workspace data.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: local write first remains unchanged; monitoring must not block sync result handling.
- rollback / restore concerns: removing monitoring only reduces observability, not sync behavior.

## 6. Non-functional Requirements

- performance / latency: capture runs only after a failed sync result is already produced.
- accessibility: no UI copy changes.
- observability / logging: distinguish `drain_only` vs `full_sync`.
- security / privacy: no PII or raw synced content in monitoring context.

## 7. Out of Scope

- Conflict-resolution analytics.
- Backend Sentry ingestion changes.
- New sync UI.

## 8. Acceptance Criteria

- [x] drain-only `partial`/`error` result triggers frontend monitoring.
- [x] full-sync `drain_failed`/`error` result triggers frontend monitoring.
- [x] monitoring context excludes raw UID/email/payload data.
- [x] production-core sync verification includes the regression tests.

## 9. Verification Plan

```bash
npm.cmd run test:sync -- src/features/plan12week/hooks/useAutoCloudSync.test.ts
npm.cmd run test:production-core:sync
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 10. Open Questions / Follow-ups

- Decide later whether conflict/unsafe outcomes should emit lower-severity monitoring breadcrumbs instead of exceptions.
