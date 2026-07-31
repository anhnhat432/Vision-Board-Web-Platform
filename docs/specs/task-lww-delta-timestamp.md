# Task LWW Delta Timestamp Hotfix

## Classification

- Surface: `Core` backend sync contract.
- Scope: `task_completed_changed` only; no public API shape or frontend storage change.

## Requirements

1. WHEN task mutations arrive out of order, THE backend SHALL select the winner by validated `clientTimestamp`, with `mutationId` as the equal-time tie-break.
2. WHEN a task mutation is processed, THE backend SHALL store server processing time in `syncUpdatedAt` so every write after a pull cursor remains visible to delta pull even when the client clock lags.
3. THE backend SHALL store the client LWW timestamp separately from `syncUpdatedAt`.
4. WHERE an existing task has no separate client LWW timestamp, THE first post-migration mutation SHALL be accepted and establish that timestamp because the old `syncUpdatedAt` may contain either server time or client time.

## Verification

- Regression test: a lagging client timestamp still produces a server-time task `syncUpdatedAt`.
- Migration test: a task with a legacy mutation id and server-time `syncUpdatedAt` accepts its first post-migration client mutation.
- Existing out-of-order and equal-time LWW tests remain green.
- Backend typecheck and build pass.
