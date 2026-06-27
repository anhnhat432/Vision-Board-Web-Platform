# Twelve Week Backend Route Happy-Path Contract Spec

## 1. Context & Goal

- Feature / bug: backend route integration covered auth, validation, ownership, and conflict failures, but did not prove owner happy-path planning/execution requests still traverse auth, controllers, services, and response wrappers correctly.
- Why now: production 12-week sync and execution reliability depends on stable backend contracts for owner plan, week, task, and metric operations.
- User impact: a signed-in real-mode user can rely on backend routes to read and update their own 12-week execution data without cross-user leakage.
- Modes affected: real/full-stack primary; demo remains local-only for protected sync.

## 2. Surface Classification

- Type: Core.
- Touched domains: backend route integration tests for plan/week/task/metric execution surfaces.
- Existing invariants that must not break: Firebase-protected routes remain authenticated, owner-only access stays enforced, response payloads do not expose another user's data, and local-first frontend behavior is unchanged.

## 3. Actors & Entry Points

- Primary actor: signed-in user running the core 12-week planning/execution loop.
- Secondary actor(s): user on another account with private 12-week data.
- API / hook / store touchpoints: `GET /api/plans`, `GET /api/plans/:id`, `PATCH /api/plans/:id`, `GET /api/plans/:planId/weeks`, `PATCH /api/weeks/:weekId`, `POST /api/weeks/:weekId/review`, `POST /api/weeks/:weekId/tasks`, `PATCH /api/tasks/:taskId`, `GET /api/weeks/:weekId/metrics`, `POST /api/metrics/:metricId/logs`.

## 4. Functional Requirements

1. WHEN an authenticated owner reads plan list/details, THE system SHALL return only that owner's plan tree.
2. WHEN an authenticated owner updates plan/week/task/review/metric-log data, THE system SHALL return successful wrapped JSON responses with the updated owner-owned resource.
3. WHERE another user's plan/week/task/metric exists in the same backend, THE happy-path response SHALL NOT include private other-user labels or identifiers.
4. WHILE route-level happy paths are tested, THE system SHALL preserve the existing negative coverage for validation, ownership, unauthorized access, and HTTP 409 conflict metadata.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: no runtime change expected.
- sync ordering guarantees: no direct sync queue change; this guards the route contracts used by sync/execution surfaces.
- rollback / restore concerns: test-only change unless a route behavior regression is discovered.

## 6. Non-functional Requirements

- security / privacy: no cross-user data in owner happy-path responses.
- observability / logging: unchanged.
- performance / latency: test fixture only.

## 7. Out of Scope

- New backend endpoints.
- Changing persistence schema.
- Running staging E2E proof.
- Frontend UI changes.

## 8. Acceptance Criteria

- [x] route integration proves owner plan list/details happy paths.
- [x] route integration proves owner plan/week/task/review/metric-log update happy paths.
- [x] happy-path responses are checked for absence of other-user private fixture data.
- [x] existing conflict and validation route tests remain green.

## 9. Verification Plan

```bash
npm.cmd --prefix backend run build
node --test backend\dist\tests\routeIntegration.test.js
git diff --check
git diff --cached --check
```

## 10. Batch Evidence - 2026-06-27

- `backend/src/tests/routeIntegration.test.ts` now proves owner happy-path route contracts for:
  - `GET /api/plans`
  - `GET /api/plans/:id`
  - `PATCH /api/plans/:id`
  - `GET /api/plans/:planId/weeks`
  - `PATCH /api/weeks/:weekId`
  - `POST /api/weeks/:weekId/review`
  - `POST /api/weeks/:weekId/tasks`
  - `PATCH /api/tasks/:taskId`
  - `GET /api/weeks/:weekId/metrics`
  - `POST /api/metrics/:metricId/logs`
- The happy-path assertions check successful wrapped JSON responses and explicitly verify that private fixture data from another user does not appear in owner responses.
- Existing route-level negative coverage remains intact for unauthorized access, validation errors, ownership enforcement, and HTTP 409 conflict metadata.
- Production-core aggregate guard now includes `dist/tests/routeIntegration.test.js` through `npm run test:production-core:backend:sync`, so local PR/main proof now covers both owner happy-path route contracts and structured conflict metadata for the 12-week backend route surface.
- Verification passed:
  - `npm.cmd --prefix backend run build`
  - `node --test backend\dist\tests\routeIntegration.test.js` (8 tests passed)
