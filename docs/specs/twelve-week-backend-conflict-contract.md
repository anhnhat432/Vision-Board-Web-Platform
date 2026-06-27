# Twelve Week Backend Conflict Contract Spec

## 1. Context & Goal

- Feature / bug: plan, week review, and task update controllers translate `ConflictError` into a structured HTTP `409` response, but route-level tests only covered validation and ownership paths.
- Why now: real-mode 12-week sync depends on the backend returning conflict metadata that the frontend can surface without destroying local progress.
- User impact: when another device has newer 12-week data, the app can show a clear sync conflict state instead of a generic failure.
- Modes affected: real-mode backend sync. Demo mode does not call protected sync paths.

## 2. Surface Classification

- Type: Core
- Touched domains: backend planning route contract, sync conflict metadata, route integration proof.
- Existing invariants that must not break: local-first frontend saves remain local before backend sync; protected backend routes require Firebase auth; cross-user data must not leak.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user editing 12-week data on more than one device.
- Secondary actor(s): auto-sync/outbox drain, conflict resolver UI.
- Route(s): `PATCH /api/plans/:id`, `POST /api/weeks/:weekId/review`, `PATCH /api/tasks/:taskId`.
- API / hook / store touchpoints: `planController`, `weekController`, `taskController`, `ConflictError`, frontend sync error handling.

## 4. Functional Requirements

1. WHEN a plan update hits a backend revision conflict, THE system SHALL return HTTP 409 with `success: false`, `conflict: true`, `currentRevision`, and ISO `serverUpdatedAt`.
2. WHEN a weekly review submission hits a backend revision conflict, THE system SHALL return the same structured conflict response.
3. WHEN a task update hits a backend revision conflict, THE system SHALL return the same structured conflict response.
4. WHERE the conflict response is returned, THE system SHALL not include another user's private entity content in the error body.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: no runtime contract change; this batch tests the existing contract.
- sync ordering guarantees: route conflicts remain explicit so the frontend can preserve local pending work and surface conflict state.
- rollback / restore concerns: test-only rollback.

## 6. Non-functional Requirements

- accessibility: frontend conflict UI remains out of scope, but the backend must provide enough metadata for visible user-facing state.
- observability / logging: no raw private payloads should be required in conflict responses.
- security / privacy: cross-user data stays excluded from error bodies.

## 7. Out of Scope

- Changing repository conflict detection.
- Running LWW staging tests.
- Changing frontend conflict UI.

## 8. Acceptance Criteria

- [x] route integration tests cover plan update `ConflictError` -> HTTP 409 contract.
- [x] route integration tests cover weekly review `ConflictError` -> HTTP 409 contract.
- [x] route integration tests cover task update `ConflictError` -> HTTP 409 contract.
- [x] each conflict response includes `conflict`, `currentRevision`, and `serverUpdatedAt`.

## 9. Verification Plan

```bash
npm.cmd --prefix backend run build
node --test backend\\dist\\tests\\routeIntegration.test.js
git diff --check
```

## 10. Batch Evidence - 2026-06-27

- `backend/src/tests/routeIntegration.test.ts` now forces `ConflictError` through plan, week review, and task route handlers and asserts the structured HTTP 409 conflict response.
- Production-core aggregate guard now includes `dist/tests/routeIntegration.test.js` through `npm run test:production-core:backend:sync`, so local PR/main proof now fails if the backend stops returning structured 12-week conflict metadata.
- Verification passed:
  - `npm.cmd --prefix backend run build`
  - `node --test backend\\dist\\tests\\routeIntegration.test.js`
  - `git diff --check`

## 11. Open Questions / Follow-ups

- Repository-level revision mismatch detection remains covered by lower-level sync/import tests; staging LWW proof is still required before launch.
