# MVP 2 Data Mutation Queue Design

Last reviewed: 2026-04-30

Scope: design only. This document does not add source code, backend APIs, billing, or real-time sync. The goal is to define the first durable data mutation queue needed for MVP 2 account/cloud sync while preserving the MVP 1 local-first guarantee.

## 1. Problem Statement

MVP 1 treats `visionboard_user_data` as the practical source of truth. Most user actions save to localStorage first, and backend sync is optional, best-effort, and conditional on real mode, Firebase auth, backend profile readiness, and network availability.

Current execution sync has three important limits:

- `usePlanExecutionSync()` serializes backend calls with an in-memory promise queue, but pending work is lost on refresh or tab close.
- Backend writes can fail after local save, and only some flows retry manually through snapshot sync.
- The existing `UserData.syncOutbox` is event/analytics oriented, not a durable CRUD replay log for 12-week data mutations.

MVP 2 needs a durable, per-account data mutation queue so task toggles, daily check-ins, weekly reviews, and plan snapshot updates can be retried safely without blocking local UX or losing local work.

Design principle: local save always wins for responsiveness. Queue drain is best-effort until a backend sync contract exists, and failed remote writes must never erase local progress.

## 2. Why The Current Analytics Outbox Is Not Enough

Current `SyncOutboxItem` in `storage-types.ts` is shaped for event delivery:

```ts
interface SyncOutboxItem {
  id: string;
  type: string;
  createdAt: string;
  goalId?: string;
  payloadSummary: string;
  status: "pending" | "sent" | "failed" | "archived";
  retryCount?: number;
  retryAt?: string;
  failedAt?: string;
}
```

`production/outboxSync.ts` posts each item to `VITE_OUTBOX_SYNC_ENDPOINT` and marks it sent/failed. That is useful for local event summaries, but insufficient for data sync because it lacks:

- entity references needed for replay, such as local task id, week number, check-in date, or review week;
- full mutation payloads or patch semantics;
- auth UID ownership and account-scoped isolation;
- idempotency keys for safe retries;
- per-mutation dependency ordering;
- conflict and validation states;
- durable mapping to backend ids after success;
- collapse/dedupe behavior for superseded writes;
- a clear separation between external analytics delivery and private account data sync.

The data mutation queue should be a separate storage concern. Do not reuse `syncOutbox` for backend CRUD writes.

## 3. Queue V1 Scope

Queue v1 should cover only the core 12-week execution surfaces that MVP 2 cloud sync must preserve.

Included mutation kinds:

- `twelve_week_task_toggle`
  - A user marks one 12-week task complete or incomplete.
  - Payload includes goal id, task id, week number, desired completion state, completedAt, title, scheduledDate, and lead indicator name.
- `daily_checkin_upsert`
  - A user saves or edits the daily check-in for one local date.
  - Payload includes goal id, local date, inferred week number, and the full local `UniversalDailyCheckIn` snapshot.
- `weekly_review_upsert`
  - A user saves or edits the weekly review for one week.
  - Payload includes goal id, week number, and the full local `UniversalWeeklyReview` snapshot.
- `plan_snapshot_update`
  - A user creates or updates the active 12-week plan snapshot after setup, reentry, schedule reset, or manual plan changes.
  - Payload includes goal id and the minimum plan snapshot needed to align plan/week/task/check-in/review state.

Excluded from queue v1:

- billing and mock entitlement changes;
- vision board media and asset upload;
- achievements;
- reflections outside weekly review import/sync;
- admin order data;
- real-time cross-device subscription updates.

## 4. Proposed Storage Shape

Use a sidecar localStorage store instead of adding queue records directly to `UserData` in v1. This avoids a broad `UserData` schema migration while still allowing per-account scoping.

Proposed key namespace:

```text
visionboard_data_mutation_queue
visionboard_data_mutation_queue:anonymous
visionboard_data_mutation_queue:auth:<encodedFirebaseUid>
```

The active key should follow the same owner model as auth-scoped user data:

- signed-in account: `visionboard_data_mutation_queue:auth:<encodedFirebaseUid>`;
- anonymous/default: `visionboard_data_mutation_queue:anonymous`;
- legacy/default fallback: `visionboard_data_mutation_queue`, read-only fallback during migration.

Proposed store:

```ts
type DataMutationQueueVersion = 1;

type DataMutationKind =
  | "twelve_week_task_toggle"
  | "daily_checkin_upsert"
  | "weekly_review_upsert"
  | "plan_snapshot_update";

type DataMutationStatus =
  | "pending"
  | "in_flight"
  | "retry_scheduled"
  | "blocked_auth"
  | "blocked_config"
  | "blocked_conflict"
  | "failed_validation"
  | "failed_terminal"
  | "applied"
  | "archived";

interface DataMutationQueueStore {
  version: DataMutationQueueVersion;
  ownerUid: string | null;
  deviceId: string;
  updatedAt: string;
  lastDrainStartedAt?: string;
  lastDrainFinishedAt?: string;
  items: DataMutationItem[];
}
```

Base item:

```ts
interface DataMutationItem {
  id: string;
  idempotencyKey: string;
  collapseKey: string;
  kind: DataMutationKind;
  status: DataMutationStatus;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  lastAttemptAt?: string;
  attemptCount: number;
  maxAttempts: number;
  ownerUid: string | null;
  goalId: string;
  planId?: string | null;
  localRevision?: number;
  dependsOn?: string[];
  supersedes?: string[];
  error?: {
    code: string;
    message: string;
    httpStatus?: number;
    lastSeenAt: string;
    retryable: boolean;
  };
  payload:
    | TaskToggleMutationPayload
    | DailyCheckInMutationPayload
    | WeeklyReviewMutationPayload
    | PlanSnapshotMutationPayload;
}
```

Payloads:

```ts
interface TaskToggleMutationPayload {
  taskId: string;
  weekNumber: number;
  completed: boolean;
  completedAt?: string;
  scheduledDate: string;
  title: string;
  leadIndicatorName: string;
}

interface DailyCheckInMutationPayload {
  date: string;
  weekNumber: number;
  checkIn: UniversalDailyCheckIn;
}

interface WeeklyReviewMutationPayload {
  weekNumber: number;
  review: UniversalWeeklyReview;
}

interface PlanSnapshotMutationPayload {
  reason: "setup" | "reentry" | "reset" | "manual_update" | "snapshot_retry";
  system: Pick<
    TwelveWeekSystem,
    | "vision12Week"
    | "lagMetric"
    | "leadIndicators"
    | "milestones"
    | "successEvidence"
    | "reviewDay"
    | "week12Outcome"
    | "startDate"
    | "endDate"
    | "timezone"
    | "weekStartsOn"
    | "status"
    | "currentWeek"
    | "totalWeeks"
    | "weeklyPlans"
    | "taskInstances"
    | "dailyCheckIns"
    | "weeklyReviews"
  >;
}
```

Retention policy:

- Keep pending/retry/blocked items until resolved by sync, manual retry, or user archive.
- Keep applied items only as a short audit window, for example last 50 items or 7 days.
- Never delete failed items automatically if that is the only evidence of an unsynced local write.

## 5. Per-Auth-User Scoping

Queue records must be isolated by Firebase UID.

Rules:

- Signed-in queue keys must include encoded Firebase UID.
- Queue drain must only read the active account key.
- Queue drain must verify item `ownerUid` matches the active Firebase UID before sending.
- Switching accounts must persist the previous account queue and load the next account queue.
- `deleteAllUserData()` should clear the active/default queue and all known queue prefixes if the user chooses full local data deletion.
- Backend link stores and data mutation queue must not share global mutable state across accounts.

The queue should not rely on local `UserData.userId` for ownership. Backend identity remains Firebase UID.

## 6. Anonymous Mode Behavior

Anonymous mode remains local-first and must not call protected backend sync paths.

V1 behavior:

- Do not drain anonymous queue items to backend.
- Prefer not to enqueue anonymous data mutations by default. The local `visionboard_user_data` snapshot is already the canonical anonymous source of truth.
- If an implementation needs anonymous queue records for diagnostics, store them under `visionboard_data_mutation_queue:anonymous` and mark them `blocked_auth`.
- Do not replay anonymous queue items automatically after login.
- After explicit local-to-account import confirmation, generate auth-scoped import/snapshot mutations from the anonymous snapshot. Do not blindly replay old anonymous queue records.
- Untouched seeded demo data must not generate account import mutations.

This avoids stale signed-out actions being silently pushed into an account.

## 7. Mutation ID And Idempotency Key

Each mutation needs two identifiers:

- `id`: local queue item id used by the frontend.
- `idempotencyKey`: stable key sent to the backend for retry safety.

Recommended local id format:

```text
dmq_<unixMs>_<randomBase36>
```

Recommended idempotency key format:

```text
<firebaseUid>:<deviceId>:<mutationId>
```

Recommended collapse key format:

```text
task:<goalId>:<taskId>
daily-checkin:<goalId>:<yyyy-mm-dd>
weekly-review:<goalId>:<weekNumber>
plan-snapshot:<goalId>
```

Rules:

- Retries of the same queue item must reuse the same idempotency key.
- Collapsing pending items should produce one final pending item with a new idempotency key and a `supersedes` list.
- Once an item is `in_flight`, do not mutate its payload in place. If the user changes the same entity again, create a new pending item with the same collapse key and a later timestamp.
- Backend v1 should eventually store or recognize `clientMutationId`/idempotency key to prevent duplicate task creation, duplicate metric logs, and duplicate plan imports.

## 8. Retry Policy

Queue drain should run only when all conditions are true:

- app is not in demo mode;
- Firebase is configured;
- user is signed in;
- backend profile is ready;
- browser is online;
- queue has pending items whose `nextRetryAt` has passed.

Retryable errors:

- network failure;
- timeout;
- HTTP 408;
- HTTP 429;
- HTTP 500, 502, 503, 504;
- backend temporarily missing plan details after a fresh setup, if rehydration can repair links.

Non-retryable or blocked errors:

- HTTP 400 validation error: mark `failed_validation`;
- HTTP 401: mark `blocked_auth` and wait for auth refresh/sign-in;
- HTTP 403: mark `failed_terminal` unless ownership state can be proven stale and safely rehydrated;
- HTTP 404 for linked remote ids: attempt one rehydrate/link repair, then retry once; if still missing, mark `blocked_conflict` or `failed_terminal`;
- HTTP 409 conflict: mark `blocked_conflict` and require user choice.

Local data must not roll back because a mutation failed remotely. The user should see queued/failed sync state, not data loss.

## 9. Backoff Policy

Recommended v1 backoff with jitter:

| Attempt | Base delay |
| --- | --- |
| 1 | immediate |
| 2 | 30 seconds |
| 3 | 2 minutes |
| 4 | 10 minutes |
| 5 | 1 hour |
| 6 | 4 hours |
| 7+ | 24 hours max |

Rules:

- Add 10-25% jitter to avoid many clients retrying at once.
- Cap automatic retries at 7 attempts for validation-like repeated failures, but allow manual retry.
- Network/offline failures can remain retryable indefinitely if local data is still present.
- Reset `attemptCount` only after the item is successfully applied or manually requeued from a terminal state.
- Do not drain multiple items for the same collapse key concurrently.

## 10. Collapse And Dedupe Rules

### Multiple Toggles For The Same Task

Collapse pending task toggles by `task:<goalId>:<taskId>`.

Example:

1. user marks task done;
2. user quickly marks task todo;
3. user marks task done again before sync drains.

Queue should keep only the final pending state, with `completed: true`. Earlier unsent items become `superseded`/removed from pending. If an earlier item is already `in_flight`, keep it and enqueue a later pending item so server eventually reaches the latest local state.

Task toggle semantics:

- Direct user toggle may downgrade backend `done` to `todo`.
- Passive snapshot sync should not downgrade backend `done` unless the mutation was an explicit user action.

### Multiple Daily Check-Ins For The Same Day

Collapse by `daily-checkin:<goalId>:<yyyy-mm-dd>`.

Rules:

- Keep the latest full `UniversalDailyCheckIn` payload for that local date.
- Date matching must use local calendar date normalization, not raw ISO timestamp equality.
- If the backend already has a same-date log, prefer upsert/update over append.
- If backend cannot store rich check-in fields yet, sync the supported subset and keep local detail fields intact.

### Weekly Review Overwrite

Collapse by `weekly-review:<goalId>:<weekNumber>`.

Rules:

- Keep the latest full `UniversalWeeklyReview`.
- Backend v1 currently stores a subset through `Week.review`; unsupported local fields must remain locally canonical.
- If backend has a conflicting review with meaningful divergent fields, mark `blocked_conflict` instead of silently overwriting.

### Plan Snapshot Update

Collapse by `plan-snapshot:<goalId>`.

Rules:

- Keep the latest plan/system snapshot.
- Run plan snapshot mutations before dependent task/check-in/review mutations when creating a new remote plan.
- If the plan snapshot update is superseded before it drains, send only the latest snapshot.
- Avoid sending full snapshot on every tiny action once granular mutations are supported.

## 11. Error States

Queue item states:

- `pending`: ready to drain.
- `in_flight`: currently being sent; should be reset to `pending` on app startup if stale.
- `retry_scheduled`: retryable error with future `nextRetryAt`.
- `blocked_auth`: user/token/profile not ready.
- `blocked_config`: backend or Firebase not configured.
- `blocked_conflict`: remote data differs and needs user choice.
- `failed_validation`: payload is invalid for current API contract.
- `failed_terminal`: repeated non-retryable failure.
- `applied`: backend confirmed success.
- `archived`: user dismissed a failed/applied item from local UI.

Startup recovery:

- Any `in_flight` item older than 2 minutes should become `pending` or `retry_scheduled`.
- Any item whose owner does not match the active auth UID must not be drained.
- Invalid queue JSON should be backed up under a recovery key before resetting to an empty queue.

## 12. UI States To Display

UI should expose sync state without blocking the core execution loop.

Recommended account/workspace states:

- `Local only`: demo mode, Firebase disabled, or signed-out.
- `Saved on this device`: local save succeeded, no cloud attempt.
- `Queued for sync`: user is signed in but mutations are pending.
- `Syncing`: drain is in progress.
- `Synced`: no pending/failed items, last sync succeeded.
- `Offline`: browser offline; local work is safe and will retry.
- `Needs review`: conflict or account migration decision required.
- `Sync failed`: non-retryable or repeated failure; local data is still safe.

Recommended UI placement:

- 12-week header: compact status badge plus pending count.
- Settings tab: detailed queue status, last successful sync time, failed count, manual retry, export backup.
- Local-to-account migration prompt: do not drain queue until user explicitly imports.

Copy rule:

- Always say local data is saved first.
- Do not claim cloud sync is complete until backend confirms success.
- Do not show raw technical payloads to users.

## 13. Migration Compatibility

Storage compatibility rules:

- Do not change `USER_DATA_STORAGE_KEY`.
- Do not change `CURRENT_STORAGE_VERSION` solely to add queue sidecar storage.
- Keep `UserData.syncOutbox` as analytics/event outbox for now.
- Add a new sidecar queue key and include it in future cleanup helpers.
- Read legacy/default queue key only as fallback; write to scoped keys.
- Queue store must include `version` so v2 can migrate shape later.
- Queue parser must tolerate missing/invalid fields and preserve a backup before destructive reset.

Account migration compatibility:

- Do not auto-import anonymous data on login.
- Do not replay anonymous queue records into account queue automatically.
- After explicit import confirmation, generate account-scoped mutations from the archived anonymous snapshot and keep the anonymous backup until import succeeds.
- If import is skipped, keep both anonymous data and any anonymous queue state untouched.

Backend compatibility:

- V1 queue can initially drain through current CRUD endpoints where safe.
- A later bulk sync endpoint can consume the same logical mutation kinds.
- Backend must eventually support idempotency keys before cloud sync is publicly promised.

## 14. Test Plan

Unit tests:

- Queue key resolution returns anonymous key when signed out and auth-scoped key when signed in.
- User A and user B queues are isolated in the same browser.
- Invalid queue JSON is backed up and does not crash app startup.
- Enqueue task toggle creates expected mutation shape.
- Multiple pending toggles for same task collapse to latest state.
- Multiple daily check-ins for same date collapse to latest payload.
- Multiple weekly reviews for same week collapse to latest payload.
- In-flight item is not mutated by collapse; later item is queued.
- Retryable errors update `attemptCount`, `lastAttemptAt`, and `nextRetryAt`.
- 400 becomes `failed_validation`.
- 401 becomes `blocked_auth`.
- 409 becomes `blocked_conflict`.
- Offline drain does not call protected APIs.

Integration tests:

- Task toggle saves local data first, then enqueues mutation.
- Daily check-in saves local detail fields even when backend sync fails.
- Weekly review remains visible locally after network failure.
- Refresh after failed sync keeps pending queue items.
- Login with anonymous data does not auto-drain anonymous queue.
- Explicit import generates auth-scoped mutations only after confirmation.
- Demo mode never drains protected backend sync.

E2E/smoke tests:

- Signed-in user completes task offline, refreshes, reconnects, and queue drains once.
- Two rapid task toggles produce final remote state only.
- Daily check-in edited twice syncs final version.
- Backend conflict blocks queue and shows "needs review" UI.
- Export backup remains available when queue has failed items.

## 15. Rollout Plan

Phase 0: finalize contract.

- Approve mutation kinds, storage key namespace, status enum, and queue UI states.
- Decide whether v1 drains through current CRUD endpoints or waits for a bulk sync API.

Phase 1: add queue storage utilities only.

- Add sidecar queue parser, key resolver, enqueue, collapse, and cleanup helpers.
- Add tests for scoping, migration compatibility, and collapse rules.
- Do not wire production drain yet.

Phase 2: instrument local-first actions.

- On task toggle, daily check-in, weekly review, and plan snapshot update, save local data first and enqueue mutation second.
- Keep existing best-effort sync path until queue drain is verified.

Phase 3: add drain runner behind strict guards.

- Drain only in real mode with Firebase configured, signed-in user, backend profile ready, and online browser.
- Start with one mutation at a time per account.
- Persist status snapshots for UI.

Phase 4: add UI status.

- Show compact status in 12-week system.
- Add detailed queue controls to Settings: pending count, failed count, retry, export backup.

Phase 5: add backend idempotency support.

- Add client mutation id/idempotency handling to current endpoints or a new sync endpoint.
- Add conflict response shape before enabling broad cloud sync claims.

Phase 6: beta real-mode rollout.

- Enable for internal accounts first.
- Monitor duplicate tasks, duplicate metric logs, failed queue counts, conflict blocks, and stale link maps.
- Keep local-first rollback path and export backup.

## 16. Non-Goals

This design does not include:

- real-time sync or websockets;
- multi-user collaboration;
- background service-worker sync as a hard dependency;
- production billing, payment, or entitlement sync;
- analytics event delivery;
- full vision-board media upload;
- field-level conflict merge UI;
- complete backend bulk import API implementation;
- promise that MVP 2 cloud sync is complete before idempotency and conflict handling are implemented.

The queue is a reliability layer for local-first account sync. It should make failed backend writes recoverable, but it must never make backend availability a requirement for the core 12-week execution flow.
