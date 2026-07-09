# Task Upsert Sync Contract Hardening

## 1. Context & Goal

- Feature / bug: Backend currently registers `task_upsert` and returns `accepted` even though the handler does not persist task data.
- Why now: Production users rely on sync status to know whether their 12-week execution data is safe on the server.
- User impact: A client that sends `task_upsert` could treat a non-persisted task mutation as successfully synced and drop or archive local queue work.
- Modes affected: `real` backend sync. Demo mode must remain local-only.

## 2. Surface Classification

- Type: `Core`
- Touched domains: backend sync mutation API, mutation queue contract.
- Existing invariants that must not break:
  - Local-first saves remain the primary in-session UX path.
  - Existing applied mutations (`task_completed_changed`, check-ins, reviews, metrics, plan snapshots) continue to work.
  - Unsupported or non-persisted remote mutations must not be reported as successful.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user syncing 12-week data.
- Secondary actor(s): backend sync worker / frontend mutation queue sender.
- Route(s): `POST /api/sync/12-week/mutations`
- API / hook / store touchpoints:
  - `backend/src/services/sync-mutations/handlers/TaskUpsertHandler.ts`
  - `backend/src/services/syncMutationService.ts`
  - `backend/src/tests/syncMutationRoutes.test.ts`
  - `src/features/plan12week/persistence/mutationQueueSender.ts`

## 4. Functional Requirements

1. WHEN backend receives a `task_upsert` mutation before full task persistence exists, THE system SHALL return a failed mutation result, not `accepted` or `applied`.
2. WHEN a batch contains only a non-persisted `task_upsert`, THE system SHALL not include that mutation in the response `accepted` array.
3. WHEN backend rejects a non-persisted `task_upsert`, THE system SHALL keep a machine-readable `syncErrorCode` so the client can surface or retain the failure safely.
4. WHERE existing persisted mutation types are sent, THE system SHALL preserve current applied / duplicate / validation behavior.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: sync mutation response for `task_upsert`.
- sync ordering guarantees: no new ordering semantics.
- rollback / restore concerns: revert handler behavior if a full task upsert repository implementation lands later.

## 6. Non-functional Requirements

- performance / latency: no additional database work.
- accessibility: no UI surface in this slice.
- observability / logging: response should identify the unsupported/non-persisted mutation.
- security / privacy: no raw task content should be added to mutation logs beyond existing log behavior.

## 7. Out of Scope

- Implementing full task create/update sync.
- Changing frontend localStorage schemas.
- Changing billing, auth, entitlement, or provider assumptions.
- Opening paid checkout or changing deployment env.

## 8. Acceptance Criteria

- [x] `task_upsert` no longer returns `accepted`.
- [x] `task_upsert` no longer appears in `accepted[]`.
- [x] Existing `task_completed_changed` route test still passes.
- [x] Backend typecheck and build pass.

## 9. Verification Plan

Commands to run:

```bash
npm --prefix backend run test -- syncMutationRoutes.test.ts
npm --prefix backend run typecheck
npm --prefix backend run build
```

Broaden if the change touches shared frontend or API client behavior.

## 10. Open Questions / Follow-ups

- Should `task_upsert` be removed from `SYNC_MUTATION_TYPES` entirely once all clients are confirmed not to send it?
- When full task upsert is implemented, add repository persistence tests before returning `applied`.
