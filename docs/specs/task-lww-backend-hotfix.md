# Task LWW Backend Hotfix

## 1. Context & Goal

- Bug: server processing time overwrites task mutation ordering.
- Goal: make task completion convergence deterministic across devices.
- Modes affected: `real` only; demo mode does not call protected sync.

## 2. Surface Classification

- Type: `Core`.
- Touched domains: sync mutation API, task persistence, mutation result contract.
- Invariants: stale writes do not change task state or revision; local progress remains available while sync is in flight.

## 3. Functional Requirements

1. WHEN task mutations arrive out of order, THE backend SHALL order them by validated `clientTimestamp`.
2. WHEN timestamps are equal, THE backend SHALL use `mutationId` as a deterministic tie-break.
3. WHEN a mutation loses LWW comparison, THE backend SHALL return successful `noop` without changing state or revision.

## 4. Data, Storage, and Sync Constraints

- Reuse existing `Task.lastMutationId`, `Task.syncUpdatedAt`, and `revision` fields.
- Keep mutation idempotency behavior unchanged.
- Do not change localStorage schemas or other mutation handlers.

## 5. Out of Scope

- Frontend pull reconciliation.
- Check-in, review, metric, or plan mutation ordering.

## 6. Acceptance & Verification

- [ ] newer task mutation remains authoritative when an older offline mutation arrives later
- [ ] equal timestamps converge by `mutationId`
- [ ] stale mutation returns `noop` and does not increment revision
- [ ] backend typecheck, build, and sync route suite pass
