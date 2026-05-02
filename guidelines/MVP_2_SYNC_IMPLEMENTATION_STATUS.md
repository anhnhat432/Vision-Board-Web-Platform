# MVP 2 Sync Implementation Status

Last reviewed: 2026-05-01

Status: implementation truth document. This document exists to prevent future prompts, agents, or release notes from implying that MVP 2 cloud sync is complete.

## 1. Executive Summary

MVP 2 sync is not complete cloud sync yet.

The repo now has a useful foundation: an auth-scoped local mutation queue, 12-week execution queue sidecars for task toggles, daily check-ins, and weekly reviews, a guarded sender utility/hook, a feature-flagged manual full sync action in 12-week Settings, a backend mutation log endpoint, a backend import validation endpoint, a backend import phase 2 endpoint that writes Goal/Plan/Week/Task/LeadMetric/DailyCheckIn/WeekReview records, local-to-account import phase 1, and a manual cloud import dry-run CTA. These pieces are scaffolding for future sync reliability.

The backend now applies three queued mutation kinds: `task_completed_changed`, `daily_check_in_upserted`, and `weekly_review_upserted`. Task completion updates an owned backend task. Daily check-ins upsert a first-class daily check-in record. Weekly reviews upsert an expanded weekly review record and keep the existing embedded `Week.review` compatibility field updated. The backend import endpoint now also upserts lead metrics, daily check-ins, and weekly reviews from explicit import payloads. The backend has a read-only full pull v1 endpoint for inspecting authenticated 12-week workspace records after import or mutation apply. The frontend now has a manual Settings flow that can drain the queue, pull the cloud workspace, create a merge report, and apply the pulled workspace into localStorage only when the report is safe. Conflict results now show a v1 safe-action panel in Settings with review details, export local backup, keep local for now, and retry sync. This is still not complete cloud sync. The backend does not yet apply queued plan snapshots or lead metric changes from the mutation queue. Pull cursors are reserved, not true delta cursors; there is no complete revision conflict flow, no mature tombstone flow, no field-level merge UI, and no complete round-trip restore test across devices. The write-capable import endpoint is explicit only and does not import every plan metadata field losslessly; it is not wired as an automatic login/import/sync path. LocalStorage is still the product source of truth for the MVP 1 demo and for most current 12-week execution behavior.

Do not publicly claim:

- cloud sync is complete;
- account import moves data to cloud;
- multi-device restore is reliable;
- all queued mutations are stored in backend domain models.
- the import endpoint performs lossless workspace restore.
- manual full sync is automatic, field-complete, or conflict-proof.

## 2. What Is Implemented

### Local Mutation Queue

Implemented in `src/features/plan12week/persistence/mutationQueue.ts`.

Current capabilities:

- Stores queue data in localStorage sidecar keys, separate from the main `UserData` schema.
- Scopes queue by anonymous owner or active auth owner:
  - `visionboard_data_mutation_queue:anonymous`
  - `visionboard_data_mutation_queue:auth:<encoded uid>`
- Keeps a device id in `visionboard_data_mutation_queue:device_id`.
- Supports these mutation kinds:
  - `task_completed_changed`
  - `daily_check_in_upserted`
  - `weekly_review_upserted`
  - `plan_snapshot_updated`
- Supports enqueue/list/mark-in-flight/mark-succeeded/mark-failed/compact/clear operations.
- Collapses duplicate pending-style mutations by collapse key:
  - latest toggle for the same task wins;
  - latest daily check-in for the same goal/date wins;
  - latest weekly review for the same goal/week wins;
  - latest plan snapshot for the same goal wins.
- Keeps terminal and retry-style statuses, including `retry_scheduled`, `blocked_auth`, `blocked_config`, `blocked_conflict`, `failed_validation`, and `applied`.

Important limitation: this queue is a sidecar. It does not change the canonical `UserData` storage schema and does not itself sync anything to cloud.

### Task Toggle Queue Sidecar

Implemented in `src/app/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`.

Current behavior:

- `handleToggleTask` still saves local-first through the existing 12-week system update path.
- After local state is updated, it enqueues `task_completed_changed` best-effort.
- Queue failure is swallowed on purpose so local task completion remains authoritative.
- The existing direct backend best-effort sync path still runs afterward through `executionSyncActions.syncTaskToggle`.
- If the direct backend sync path fails and the UI rolls local state back, a second `task_completed_changed` mutation is enqueued for the rollback state.

Important limitation: `task_completed_changed` can now be applied by the backend mutation endpoint only when the manual sender runs in real mode and the task can be resolved to an owned backend task. This is still not automatic cloud sync and it does not provide pull/restore on another device.

### Daily Check-In And Weekly Review Queue Sidecars

Implemented in `src/app/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`.

Current behavior:

- `handleSaveCheckIn` still saves local-first through the existing 12-week system update path.
- After the daily check-in is saved locally, it enqueues `daily_check_in_upserted` best-effort with the full local check-in payload and client plan/week ids.
- `handleSaveWeeklyReview` still saves the local weekly review and linked reflection first.
- After the weekly review and reflection are saved locally, it enqueues `weekly_review_upserted` best-effort with the full local weekly review payload, execution score, and client plan/week ids.
- Queue failure is swallowed on purpose so local execution data remains authoritative.
- The existing direct backend best-effort sync paths still run afterward through `executionSyncActions.syncDailyCheckIn` and `executionSyncActions.syncWeeklyReview`.

Current backend apply status:

- `daily_check_in_upserted` now upserts a first-class `DailyCheckInModel` record by authenticated user, `clientPlanId`, and local date.
- `weekly_review_upserted` now upserts an expanded `WeekReviewModel` record by authenticated user, `clientPlanId`, and week number, and also updates the compatibility `Week.review` field.

Important limitation: this does not mean daily check-ins or weekly reviews can fully restore on another device yet. Pull v1 can return these first-class records and the manual Settings safe-merge path can materialize them into localStorage, but there is still no automatic hydration path or complete round-trip restore test using them across devices.

### Mutation Sender Utility And Hook

Implemented in:

- `src/features/plan12week/persistence/mutationQueueSender.ts`
- `src/features/plan12week/hooks/useMutationQueueSync.ts`
- `src/services/syncService.ts`

Current capabilities:

- `sendPending12WeekMutations` reads pending mutations for one auth owner.
- It only proceeds when:
  - `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`;
  - app mode is real;
  - user is authenticated;
  - API base URL is configured;
  - browser is online.
- It marks mutations `in_flight`, posts a batch to `/sync/12-week/mutations`, then marks items succeeded or failed based on backend response.
- It applies retry delay for retryable request failures.
- It treats `accepted`, `applied`, `noop`, and `duplicate` as success statuses.

Current wiring status:

- The hook exists and is exported.
- `12WeekSystem` mounts `useTwelveWeekManualCloudSync` with no auto-start.
- The Settings tab exposes a manual "Đồng bộ cloud thủ công" action only when real mode, authenticated account state, configured API, `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`, and `VITE_ENABLE_12_WEEK_PULL_SYNC=true` are all satisfied.
- When clicked, the action drains pending queue mutations first. If drain is partial or failed, it stops before pulling or applying cloud data.
- If drain is safe, it calls `GET /sync/12-week/pull`, creates a pure merge report, and applies the pulled workspace to localStorage only when `safeToApply=true`.
- If the report has conflicts, missing client ids, unsupported local-only fields, or unresolved local queue items, the UI shows status and does not overwrite local data.
- Conflict/unsafe pull results render a v1 Settings panel that explains local/cloud differences, avoids showing raw notes/review text, offers review details, local backup export, keep-local-for-now, and retry sync.
- Conflict action analytics use `sync_conflict_action` counts and issue categories only; they do not send task titles, goal text, check-in notes, review text, client ids, Firebase UID, or backend ids externally.
- The sender/pull/apply flow is still not auto-running from the app UI.
- Demo mode and signed-out mode keep this action disabled and do not call protected backend endpoints.

### Backend Mutation Log Endpoint

Implemented in:

- `backend/src/routes/syncRoutes.ts`
- `backend/src/controllers/syncController.ts`
- `backend/src/services/syncMutationService.ts`
- `backend/src/models/SyncMutationLogModel.ts`
- `backend/src/repositories/mongo/MongoSyncMutationLogRepository.ts`

Current endpoint:

```text
POST /api/sync/12-week/mutations
```

Auth status:

- The route is mounted after `authMiddleware` in `backend/src/routes/index.ts`.
- The controller uses `requireAuthUser(req)` and passes `user.uid` to the service.

Validation, apply, and logging status:

- Validates body is an object.
- Validates `mutations` is a non-empty array with max 100 items.
- Validates `mutationId` is required.
- Accepts `type` or `kind`.
- Validates type is in the allowlist.
- Validates optional `clientTimestamp`.
- Requires `payload` to be an object.
- Hashes the mutation payload for diagnostics/idempotency groundwork.
- Applies `task_completed_changed` to `TaskModel`.
- Applies `daily_check_in_upserted` to `DailyCheckInModel`.
- Applies `weekly_review_upserted` to `WeekReviewModel` and the embedded `Week.review` compatibility field.
- Resolves tasks by owned backend task id or by owned `clientPlanId + clientWeekId + clientTaskId`.
- Sets task `status` to `done` or `todo`.
- Preserves `completedAt` when completing and clears `completedAt` when un-completing.
- Increments task `revision` and writes `lastMutationId` / `syncUpdatedAt`.
- Logs mutation rows to MongoDB with `applied`, `skipped`, or `failed` status.
- Accepted unsupported kinds are logged/skipped and returned as `unsupported_not_applied`.

Idempotency status:

- Unique index on `{ userId, mutationId }`.
- Unique sparse index on `{ userId, idempotencyKey }`.
- Duplicate lookup is by `userId + mutationId`.
- Same user + same mutation id + same payload is idempotent/no-op.
- Same user + same mutation id + different payload returns `409`.
- Same mutation id for a different user is isolated.

Important limitation: the service applies task completion, daily check-ins, and weekly reviews only. It does not apply plan snapshots, lead metrics, deletes, pull cursors, or full conflict resolution.

### Backend Import Validation Endpoint

Implemented in:

- `backend/src/routes/syncRoutes.ts`
- `backend/src/controllers/syncController.ts`
- `backend/src/services/twelveWeekImportValidationService.ts`

Current endpoint:

```text
POST /api/sync/12-week/import/validate
```

Auth status:

- The route is mounted after `authMiddleware` in `backend/src/routes/index.ts`.
- The controller uses `requireAuthUser(req)` before validation.

Validation status:

- Accepts the current frontend serializer's goal-level import payload.
- Also accepts a future-compatible wrapper shape with `workspace.goals`.
- Enforces a 512 KB payload limit for validation requests.
- Requires `clientGoalId` and `plan.clientPlanId`.
- Requires a non-empty `plan.weeks` array, max 12 weeks.
- Validates week numbers, duplicate week ids, and plan/week id consistency.
- Validates task `clientTaskId` and `clientWeekId` against imported weeks.
- Validates daily check-in client ids, date strings, week numbers, and warns when date-to-week mapping looks inconsistent.
- Validates weekly review client ids and required `weekNumber`.
- Validates optional top-level `idempotencyKey` shape but does not log or enforce duplicate import requests yet.
- Returns a dry-run report with `status`, `acceptedEntityCounts`, `warnings`, `errors`, and `normalizedClientIdsCount`.

Important limitation: this endpoint does not create or update `GoalModel`, `PlanModel`, `WeekModel`, `TaskModel`, or `LeadMetricModel`. A `valid` report only means the payload shape is acceptable for an import/apply implementation.

### Backend Import Phase 2 Endpoint

Implemented in:

- `backend/src/routes/syncRoutes.ts`
- `backend/src/controllers/syncController.ts`
- `backend/src/services/twelveWeekImportService.ts`
- `backend/src/services/twelveWeekImportValidationService.ts`

Current endpoint:

```text
POST /api/sync/12-week/import
```

Auth status:

- The route is mounted after `authMiddleware` in `backend/src/routes/index.ts`.
- The controller uses `requireAuthUser(req)` before importing.

Current write behavior:

- Reuses the same import validator as `POST /api/sync/12-week/import/validate`.
- Requires a top-level `importId`, `idempotencyKey`, or `requestId`.
- Uses `SyncMutationLogModel` for user-scoped import idempotency by normalized import id.
- Same user + same import id + same payload returns `duplicate`/noop.
- Same user + same import id + different payload returns `409`.
- Same client ids for a different authenticated user are isolated.
- Upserts basic records by stable client ids:
  - `GoalModel` by `userId + clientGoalId`;
  - `PlanModel` by `userId + clientPlanId`;
  - `WeekModel` by `planId + clientWeekId`, with week-number fallback for existing rows;
  - `TaskModel` by `weekId + clientTaskId`;
  - `LeadMetricModel` by authenticated user/plan/week/client metric scope, with week/client metric fallback for existing rows;
  - `DailyCheckInModel` by `userId + clientPlanId + localDate`;
  - `WeekReviewModel` by `userId + clientPlanId + weekNumber`, while keeping embedded `Week.review` compatibility data updated.

Fields currently imported:

- Goal: `title`, `category`, `description`, `deadline`, `status`, `focusArea`, `clientGoalId`, `planId`, sync metadata.
- Plan: `vision`, `smartGoalId`, `startDate`, `clientPlanId`, `clientGoalId`, sync metadata.
- Week: `weekNumber`, `focus`, `expectedOutput`, `clientWeekId`, `clientPlanId`, sync metadata.
- Task: `title`, `status`, `scheduledDate`, `completedAt`, `isCore`, `leadIndicatorName`, `clientTaskId`, `clientWeekId`, `clientPlanId`, `weekNumber`, sync metadata.
- Lead metric: `name`, `weeklyTarget`, `target`, `currentValue`, `unit`, `frequency`, `leadIndicatorId`, `type`, `priority`, `schedule`, `clientMetricId`, `clientWeekId`, `clientPlanId`, sync metadata.
- Daily check-in: `clientCheckInId`, `clientGoalId`, `clientPlanId`, `clientWeekId`, `weekNumber`, `localDate`, `didWorkToday`, `whichLeadIndicatorWorkedOn`, `amountDone`, `outputCreated`, `obstacleOrIssue`, `dailySelfRating`, `optionalNote`, `mood`, sync metadata.
- Weekly review: `clientReviewId`, `clientPlanId`, `clientWeekId`, `weekNumber`, `executionScore`, lead completion, lag progress, output, obstacle, next priority, workload decision, review completion, score dimensions, completed lead indicators, sync metadata. The embedded `Week.review` field is also updated with a compatibility summary.

Important limitations:

- This endpoint still does not import all plan setup metadata as first-class backend fields, including lag metric, milestones, success evidence, preferred days, reminders, template metadata, and reentry settings.
- Lead metric logs are not imported from this payload; current local serializer sends per-week lead metric definitions only.
- It does not delete/tombstone records missing from a later payload.
- It validates before writes and returns a partial-write error summary if an unexpected failure occurs after some upserts, but it does not wrap the full import in a Mongo transaction.
- It does not expose a status endpoint, and the pull endpoint is still full-snapshot v1 only, so another device still cannot reliably restore every local field end to end.
- It does not replace the local-to-account phase 1 UI behavior; that prompt still only performs local browser account-scope copy plus optional dry-run validation.

### Backend Pull Endpoint V1

Implemented in:

- `backend/src/routes/syncRoutes.ts`
- `backend/src/controllers/syncController.ts`
- `backend/src/services/twelveWeekPullService.ts`

Current endpoint:

```text
GET /api/sync/12-week/pull?cursor=<optional>&clientPlanId=<optional>
```

Auth status:

- The route is mounted after `authMiddleware` in `backend/src/routes/index.ts`.
- The controller uses `requireAuthUser(req)` and passes only `user.uid` into the pull service.

Current read behavior:

- Returns only records scoped to the authenticated user.
- Supports optional `clientPlanId` filtering.
- Returns full pull v1 data under `workspace` and `changes`:
  - goals;
  - plans;
  - weeks;
  - tasks;
  - lead metrics;
  - daily check-ins;
  - weekly reviews.
- Includes `serverTime`, `cursor`, `nextCursor`, `hasMore`, `cursorStatus`, `warnings`, `counts`, and `tombstones`.
- Includes revision and sync metadata when present on backend records.
- Does not return billing/mock entitlement state.
- Does not return analytics event logs or local analytics outbox data.
- Handles a supplied cursor safely by returning a full snapshot with a `cursor_reserved` warning.
- Weekly review reads include authenticated-user records and legacy records without `userId`, but explicitly exclude records with a different `userId` even if a stale `weekId` points at the authenticated user's week.

Important limitations:

- `cursor` is reserved in v1 and ignored; this is not a delta pull endpoint yet. The frontend now stores and sends cursors to prepare for backend incremental pull support.
- `hasMore` is always `false`; pagination is not implemented yet.
- Tombstones are shaped from `deletedAt` fields if present, but delete mutations are not fully implemented.
- Pull can now materialize data into frontend localStorage only through the manual Settings full sync action and only after a safe merge report.
- Pull is not a complete round-trip restore guarantee because plan setup metadata, lead metric import, revisions, tombstones, and conflict handling remain partial.

### Local-To-Account Import Phase 1

Implemented in:

- `src/app/utils/local-data-migration.ts`
- `src/app/components/RootLayout.tsx`
- `src/app/components/root-layout/LocalDataMigrationPrompt.tsx`

Current behavior:

- After login in non-demo mode, `RootLayout` checks anonymous local data with `getAnonymousLocalDataMigrationCandidate`.
- The prompt is not shown in demo mode or signed-out mode.
- The prompt is skipped per auth uid and snapshot fingerprint when the user chooses skip.
- The user can review a local data summary.
- Import calls `importAnonymousLocalDataToAccountScope`.
- After a successful local account-scope import, the prompt can show a manual "Kiểm tra sẵn sàng cloud import" dry-run action.
- The dry-run action only runs when real mode, authenticated user, configured API base URL, and `VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true` are all true.
- The dry-run action serializes local account-scope 12-week data and posts it to `POST /api/sync/12-week/import/validate`.

What import actually does today:

- Copies `visionboard_user_data:anonymous` into the active auth-scoped localStorage key and active `visionboard_user_data`.
- Creates a local backup payload under `visionboard_local_data_import_backup:*`.
- Does not delete anonymous data.
- Blocks import when the current account scope already has meaningful local work.
- The Import button itself does not call the backend import validation endpoint or a write-capable backend import endpoint.
- The separate dry-run action can call the backend validation endpoint, but it does not write cloud data.
- Does not upload data to cloud.
- Does not merge account and anonymous data.

The UI copy correctly says phase 1 is local browser copy only, not completed cloud sync.

## 3. What Is Skeleton Or Logging Only

### Backend Mutation Endpoint

`POST /api/sync/12-week/mutations` is now a narrow apply endpoint for three mutation kinds and a logging/skipping endpoint for the rest.

It does:

- apply `task_completed_changed` to an owned `TaskModel` record;
- update task status and `completedAt`;
- increment task `revision`;
- write `lastMutationId` and `syncUpdatedAt`;
- upsert `daily_check_in_upserted` into `DailyCheckInModel` by `userId + clientPlanId + localDate`;
- preserve daily check-in fields: work flag, lead indicator worked on, amount, output, obstacle, rating, note, and mood;
- upsert `weekly_review_upserted` into `WeekReviewModel` by `userId + clientPlanId + weekNumber`;
- preserve weekly review fields: lead completion, lag progress, biggest output, main obstacle, next priority, workload decision, review completion, execution score, score dimensions, and completed lead indicators;
- update embedded `Week.review` with a compatibility summary for existing hydration paths;
- enforce user ownership before task update;
- keep mutation idempotency by `userId + mutationId + payloadHash`;
- report same mutation id with a different payload as `409`;
- log unsupported allowlisted mutation kinds as skipped/not applied.

It still does not:

- update plan snapshots;
- update lead metrics from queued mutations;
- resolve general revision conflicts;
- create tombstones;
- return pull cursors;
- make the backend a full 12-week cloud source of truth.

The word `applied` currently means one of the supported mutation kinds was applied. The word `accepted` can still mean "logged/skipped for a future backend version."

### Backend Import Validation Endpoint

`POST /api/sync/12-week/import/validate` is a validation-only dry run today.

It does not:

- create backend goals;
- create backend plans;
- create backend weeks;
- create backend tasks;
- create backend lead metrics;
- import daily check-ins or weekly reviews into first-class domain records;
- reserve idempotency keys in MongoDB;
- return backend entity links;
- make account data available across devices.

The word `valid` means "accepted by the import payload contract", not "imported to cloud".

### Backend Import Phase 2 Endpoint

`POST /api/sync/12-week/import` is now write-capable for the main 12-week workspace records, but it is still limited.

It does:

- validate the payload using the same validator as the dry-run endpoint;
- require a user-scoped import id or idempotency key;
- upsert Goal, Plan, Week, Task, LeadMetric, DailyCheckIn, and WeekReview records by client IDs or stable plan/week/date scopes;
- preserve rich daily check-in fields and weekly review score/detail fields;
- preserve lead metric definition fields such as name, target/current/unit/frequency, type, priority, and schedule;
- keep embedded `Week.review` compatibility summaries in sync when importing weekly reviews;
- reject invalid imported daily dates and weekly review score/workload/mood fields before writing;
- return backend entity links and created/updated counts.

It does not:

- apply queued mutations;
- create pull cursors;
- resolve revision conflicts;
- delete or tombstone records;
- import all plan setup metadata or metric logs;
- provide full transaction-backed atomicity for the whole import;
- prove another device can restore every local field in the imported workspace.

The word `applied` means "backend 12-week workspace records were upserted", not "cloud sync is complete".

### Local-To-Account Import

Import phase 1 is local browser scope copy only.

It does not:

- call `POST /api/sync/12-week/import`;
- create backend goals/plans/weeks/tasks/metrics;
- verify another device can pull the imported workspace;
- merge account data with anonymous data;
- make cloud the source of truth.

### Pull Endpoint

`GET /api/sync/12-week/pull?cursor=<optional>&clientPlanId=<optional>` is implemented as a read-only full pull v1.

It is still a foundation endpoint, not complete sync:

- supplied cursors are reported as `cursor_reserved` and ignored;
- pull always returns a full authenticated workspace snapshot;
- only the manual Settings full sync path consumes this endpoint, after queue drain and a safe merge report;
- no conflict resolution or true delta cursor is available.

Existing automatic hydration is still based on existing CRUD/detail routes and best-effort mapping. Pull v1 is consumed only by the manual full sync action and only applies local data when the merge report is safe.

## 4. What Is Not Wired Yet

### Is The Sender Called From UI?

Yes, but only by a manual Settings action.

`12WeekSystem` now mounts `useTwelveWeekManualCloudSync` and passes `syncNow` into the Settings tab. The user must click the manual action. If the app is in demo mode, either sync feature flag is off, the user is signed out, the profile is not ready, or the API base URL is not configured, the Settings action stays disabled or the runner returns a skipped result.

This is still not automatic cloud sync. It is a manual drain + pull + safe-apply path for MVP 2 real-mode testing.

### Is Pull Hydration Wired?

Partially, behind the manual Settings action only.

Implemented frontend pieces:

- `pullTwelveWeekWorkspace()` client for `GET /sync/12-week/pull`.
- `createPulledWorkspaceMergeReport()` pure conflict/safety report.
- `applyPulledWorkspaceToUserData()` pure local materializer for safe pulled workspaces.
- `useTwelveWeekManualCloudSync()` runner/hook that drains, pulls, reports, and applies only when safe.
- `pullCursorStore.ts` auth-scoped cursor store in localStorage, keyed `visionboard_pull_cursor:auth:<encoded uid>`.

Cursor lifecycle:

- The manual sync flow now reads the stored cursor for the current authenticated user.
- If a cursor exists, it is sent to `GET /sync/12-week/pull?cursor=<value>`.
- If the backend reports `cursorStatus: "invalid"` or a `cursor_invalid` warning, the cursor is cleared and a full pull is retried exactly once.
- On successful pull+apply, `nextCursor` from the response is saved as the new cursor.
- On conflict or error, the cursor is not updated; only `lastPullAt` and `lastPullStatus` are recorded.
- Anonymous/demo mode does not use cursors.
- User A's cursor is scoped separately from user B's cursor.

Not implemented:

- no automatic pull on login;
- no background pull;
- no field-level merge UI;
- no automatic conflict resolution or automatic cloud overwrite when pull v1 reports conflicts;
- no "use cloud version" action for pull-v1 conflicts because there is not yet a backup/confirm flow strong enough to overwrite local safely;
- no complete two-device round-trip test proving field-complete restore.
- backend does not yet consume cursor values for delta responses; it returns full pull with `cursor_reserved` warning.

### Does The Queue Cover Daily Check-In?

The queue type and tests cover `daily_check_in_upserted`.

The 12-week daily check-in UI flow now enqueues `daily_check_in_upserted` after the local check-in save succeeds. The payload carries `goalId`, `clientPlanId`, `clientWeekId`, `weekNumber`, `date`, and the local first-party check-in payload. Queue failure is swallowed so local-first save remains authoritative.

The existing direct best-effort backend sync path through `usePlanExecutionSync.syncDailyCheckIn` still runs afterward. This means daily check-in currently has both direct best-effort sync and queued mutation apply. The new first-class backend record is not yet used by pull/hydration.

### Does The Queue Cover Weekly Review?

The queue type and tests cover `weekly_review_upserted`.

The weekly review submit flow now enqueues `weekly_review_upserted` after the local review and linked local reflection are saved. The payload carries `goalId`, `clientPlanId`, `clientWeekId`, `weekNumber`, `executionScore`, and the full local first-party `UniversalWeeklyReview` snapshot, including lead completion, lag progress, output, obstacle, next priority, workload decision, review completion, and score fields. Queue failure is swallowed so local-first review save remains authoritative.

The existing direct best-effort backend sync path through `usePlanExecutionSync.syncWeeklyReview` still runs afterward. This means weekly review currently has both direct best-effort sync and queued mutation apply. The new expanded backend record is not yet used by pull/hydration.

### Does The Queue Cover Plan Snapshot?

The queue type and tests cover `plan_snapshot_updated`.

No production enqueue call for `plan_snapshot_updated` was found. Setup, reset, reentry, and snapshot sync still rely on existing localStorage plus direct best-effort backend sync behavior.

## 5. Biggest Risks

### Users Or Developers May Think Cloud Sync Is Complete

Risk level: high.

The repo now contains names like "sync", "mutation queue", "mutation sender", and "import", but the implementation is not end-to-end cloud sync. Public copy, release notes, and future prompts must say "sync foundation" or "local/account-scope copy" unless domain apply plus pull are actually implemented and tested.

### Direct Best-Effort Sync And Mutation Queue Coexist

Risk level: high.

`usePlanExecutionSync` still directly creates/updates backend plans, tasks, daily check-in metric logs, and weekly review fields. The mutation queue is a second sidecar path and is not the single sync engine yet.

Current result:

- task toggles can save local, enqueue a queue item, and also call the direct backend sync path;
- daily check-ins can save local, enqueue a queue item, and also call the direct backend sync path;
- weekly reviews can save local/reflection, enqueue a queue item, and also call the direct backend sync path;
- future work must decide whether the queue replaces direct sync or wraps it.

Until then, "sync status" can be ambiguous.

### Missing Client IDs, Revisions, And Tombstones In Backend Domain Models

Risk level: high.

The sync API spec requires stable client IDs, revisions, tombstones, idempotency, and pull cursors. Current backend domain models remain mostly CRUD-oriented:

- goals/plans/weeks/tasks/metrics do not yet share a complete sync metadata contract;
- task IDs are still linked through local sidecar maps and title/date heuristics;
- deletes are not modeled as tombstones for pull;
- stale write conflict detection is not backed by revisions.

### Hydration Can Lose Field Detail

Risk level: high.

`guidelines/MVP_2_HYDRATION_FIELD_GAP_AUDIT.md` documents major round-trip gaps:

- task `completedAt`, `isCore`, `tacticId`, `rescheduledFrom`, and `leadIndicatorName`;
- rich daily check-in details;
- weekly review dimensions;
- tactic schedule and plan setup metadata;
- template and premium-support metadata.

Current hydration can restore a usable shell, but not a lossless 12-week workspace.

### Backend Mutation Log Can Be Misread As Cloud State

Risk level: medium-high.

`SyncMutationLogModel` stores payload hash, type, mutation id, and result. That is useful for idempotency and future processing, but it is not user data persistence in the product domain. A mutation log row alone cannot drive the 12-week system UI or another device restore.

## 6. Current Source Of Truth

### MVP 1

Source of truth: browser localStorage.

Primary storage:

- `visionboard_user_data`
- auth-scoped local copies when account mode is active
- 12-week data embedded under local `Goal.twelveWeekSystem`

Backend, Firebase, billing, and sync are optional layers for MVP 1 and must not block the public demo.

### MVP 2 Real Mode Today

Practical source of truth today is still the local browser cache plus existing best-effort backend records.

Current real-mode layers:

- local active/auth-scoped `UserData` remains the UI source;
- existing backend CRUD records can hold a thinner plan/task/metric/review representation;
- backend hydration can materialize or overlay remote data with conflict guards;
- mutation queue can locally record pending changes;
- manual full sync can post queued mutations, pull backend workspace, and apply the cloud snapshot only when a pure merge report says it is safe;
- backend mutation endpoint applies `task_completed_changed`, `daily_check_in_upserted`, and `weekly_review_upserted`; `plan_snapshot_updated` and legacy allowlisted kinds are still logged/skipped and not applied;
- backend import validation endpoint checks payload shape but does not write domain records;
- backend import endpoint can write Goal/Plan/Week/Task/LeadMetric/DailyCheckIn/WeekReview records when explicitly called, but it does not provide fully field-complete restore;
- backend pull endpoint can return authenticated Goal/Plan/Week/Task/LeadMetric/DailyCheckIn/WeekReview records as a full snapshot, and frontend can consume it only through manual safe merge; cursor support is reserved;
- local-to-account migration prompt can manually call the validation endpoint after local phase 1 import when the dry-run feature flag is enabled.

MVP 2 cloud source of truth is not fully established until these are implemented:

- backend domain apply for remaining queued mutations and field-complete plan snapshots;
- field-complete backend import for remaining plan setup metadata, metric logs, tombstones, and revisions;
- backend status endpoint and automatic/interactive frontend pull hydration;
- stable client IDs;
- revisions;
- tombstones;
- conflict response handling;
- field-complete hydration/round-trip tests.

## 7. Recommended Implementation Order After This Audit

1. Freeze public language.
   - Say "MVP 2 sync foundation" or "local/account-scope import phase 1".
   - Do not say "cloud sync complete".

2. Decide queue ownership.
   - Choose whether the mutation queue becomes the main sync path or remains a sidecar around `usePlanExecutionSync`.
   - Avoid two independent writers claiming the same sync status.

3. Extend domain mutation apply deliberately.
   - `task_completed_changed`, `daily_check_in_upserted`, and `weekly_review_upserted` are implemented backend apply paths.
   - Next, implement `plan_snapshot_updated` or frontend pull hydration so the new records can actually restore on another device.
   - Keep each new kind idempotent, ownership-scoped, and field-complete before adding another.

4. Keep sender wiring conservative.
   - Mount `useMutationQueueSync` only in real mode, authenticated state, API configured, and `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`.
   - Do not auto-run in demo mode.
   - Add conservative online/focus/manual trigger behavior.

5. Add queue coverage for remaining plan snapshot updates.
   - Daily check-in and weekly review now enqueue after local save.
   - Plan snapshot update still has no production enqueue call.
   - Preserve rich local fields in payload.
   - Do not rely only on synthetic metric logs if claiming full cloud restore.

6. Add backend schema fields needed for field-complete sync.
   - Client IDs.
   - Revisions.
   - Tombstones.
   - Task metadata.
   - First-class daily check-ins or equivalent field-complete records.
   - Expanded weekly reviews.

7. Extend pull/status before broad release.
   - `GET /api/sync/12-week/pull?cursor=` now exists as full pull v1.
   - Add `GET /api/sync/12-week/status`.
   - Add real cursor pagination/delta semantics.
   - Materialize remote state into local cache only after conflict policy is clear.

8. Extend cloud import beyond phase 2 basics.
   - Use `POST /api/sync/12-week/import/validate` first to verify payload contract safely.
   - `POST /api/sync/12-week/import` now exists for Goal/Plan/Week/Task/LeadMetric/DailyCheckIn/WeekReview upserts.
   - Add remaining plan setup metadata, metric logs, revisions, tombstones, status, transaction strategy, and end-to-end pull restore coverage before calling this complete cloud import.
   - Frontend import prompt should update copy from "local account-scope copy" to "cloud import" only after write + pull + restore are tested together.

9. Add end-to-end account tests.
   - Device A creates local data, imports, and syncs.
   - Device B signs in and pulls the same workspace.
   - Offline task toggle drains once and does not duplicate.
   - Conflict case blocks instead of silently overwriting.

## 8. Recommended Next Prompt

Use a narrow implementation prompt next, not a broad "finish cloud sync" prompt:

```text
You are a backend engineer. Implement the next narrow MVP 2 mutation apply path for plan_snapshot_updated, without changing demo mode or billing.

Before coding:
1. Read guidelines/MVP_2_SYNC_IMPLEMENTATION_STATUS.md.
2. Read guidelines/MVP_2_12_WEEK_SYNC_API_SPEC.md.
3. Read guidelines/MVP_2_HYDRATION_FIELD_GAP_AUDIT.md.
4. Read guidelines/MVP_2_DATA_MUTATION_QUEUE_DESIGN.md.
5. Read backend/src/services/syncMutationService.ts.
6. Read backend/src/models Goal/Plan/Week/Task/LeadMetric.
7. Read frontend mutationQueue plan_snapshot_updated payload.

Task:
- Apply only plan_snapshot_updated.
- Preserve idempotency and ownership checks.
- Do not implement pull cursors, conflict auto-resolution, billing, or frontend UI.
- Add tests for valid apply, duplicate idempotency, cross-user isolation, and unsupported field warnings.
```

## 9. Claims Not Allowed Publicly

Do not say or imply:

- "Cloud sync is complete."
- "Login backs up all your 12-week data to the cloud."
- "Import moves anonymous data to cloud."
- "Your account data is available across devices."
- "The backend is the source of truth for the 12-week workspace."
- "Daily check-ins and weekly reviews fully round-trip."
- "All queued mutation kinds are synced to the product backend domain."
- "Task history, completedAt, tactic metadata, and review dimensions are preserved across devices."
- "Payment/billing state is production-ready."

Allowed safer wording:

- "MVP 1 is local-first and stores data on this browser."
- "MVP 2 has early account/sync foundations."
- "Import phase 1 copies local anonymous data into this browser's account scope and keeps the anonymous copy."
- "Mutation queue plus task/check-in/review apply are foundations for future cloud sync."
- "Cloud sync is not complete until import, mutation apply, pull, conflict handling, and round-trip tests are implemented."

## Audit Scope

Files reviewed for this status:

- `AGENTS.md`
- `guidelines/MVP_2_CLOUD_SYNC_PLAN.md`
- `guidelines/MVP_2_DATA_MUTATION_QUEUE_DESIGN.md`
- `guidelines/MVP_2_12_WEEK_SYNC_API_SPEC.md`
- `guidelines/MVP_2_HYDRATION_FIELD_GAP_AUDIT.md`
- `guidelines/SYNC_AUDIT.md`
- `src/features/plan12week/persistence/mutationQueue.ts`
- `src/features/plan12week/persistence/mutationQueueSender.ts`
- `src/features/plan12week/hooks/useMutationQueueSync.ts`
- `src/app/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`
- `src/features/plan12week/hooks/usePlanExecutionSync.ts`
- `src/services/syncService.ts`
- `backend/src/routes/syncRoutes.ts`
- `backend/src/routes/index.ts`
- `backend/src/controllers/syncController.ts`
- `backend/src/services/syncMutationService.ts`
- `backend/src/services/twelveWeekImportService.ts`
- `backend/src/services/twelveWeekImportValidationService.ts`
- `backend/src/services/twelveWeekPullService.ts`
- `backend/src/models/DailyCheckInModel.ts`
- `backend/src/models/WeekReviewModel.ts`
- `backend/src/models/SyncMutationLogModel.ts`
- `backend/src/repositories/mongo/MongoSyncMutationLogRepository.ts`
- `src/app/utils/local-data-migration.ts`
- `src/app/components/RootLayout.tsx`
- `src/app/components/root-layout/LocalDataMigrationPrompt.tsx`
- `src/app/utils/app-mode.ts`
- `src/main.tsx`
- `backend/src/utils/apiError.ts`
- `backend/src/middleware/errorMiddleware.ts`

## 10. Security Hardening

Last updated: 2026-05-01

### Applied Hardening

#### Body Size Limits

- Global Express JSON body limit: **2 MB** (`backend/src/app.ts`).
- Sync route-level body limit: **1 MB** (`backend/src/routes/syncRoutes.ts`).
- Import validation service enforces **512 KB** payload limit internally.

#### String Length Enforcement

- `mutationId`: max **240** characters.
- `idempotencyKey`: max **240** characters.
- `batchId`: max **240** characters.
- `entity.*` client IDs (clientTaskId, clientPlanId, clientWeekId, etc.): max **120** characters.
- Import validation service already enforces `MAX_CLIENT_ID_LENGTH = 120` for import payloads.
- All text fields (check-in notes, review text): max **5,000** characters via `validateOptionalText`.

#### Mutation Kind Allowlist

- Only `task_completed_changed`, `daily_check_in_upserted`, `weekly_review_upserted`, and `plan_snapshot_updated` are accepted.
- Unknown mutation types return 400 immediately.

#### Batch Size Limits

- Maximum **100** mutations per batch.
- Import validation limits: MAX_GOALS=10, MAX_PLANS_PER_GOAL=3, MAX_WEEKS_PER_PLAN=12, MAX_TASKS_PER_WEEK=50, MAX_LEAD_METRICS_PER_WEEK=10.

#### User Ownership

- All mutation apply paths verify ownership through the authenticated user's Firebase UID:
  - `task_completed_changed`: `findOwnedTask` traces task → week → plan → userId.
  - `daily_check_in_upserted`: `findOwnedWeek` traces plan → userId.
  - `weekly_review_upserted`: `findOwnedWeek` traces plan → userId.
- Import creates records scoped to the authenticated userId.
- Pull endpoint filters all queries by authenticated userId.
- Cross-user writes return `failed_not_found` with `syncErrorCode: "ownership_denied"`.

#### Idempotency & Replay Protection

- Mutation log stores `payloadHash` (SHA-256) per user+mutationId.
- Same mutationId with same payload → `duplicate` status.
- Same mutationId with different payload → 409 `conflict`.
- Import uses `importId` with same idempotency logic.

#### Consistent Error Codes

- All error responses now include `errorCode` field:
  - 400 → `invalid_payload`
  - 401 → `unauthorized`
  - 403 → `forbidden`
  - 404 → `not_found`
  - 409 → `conflict`
  - 500 → `server_error`
- Mutation results include `syncErrorCode`:
  - `ownership_denied` for not-found/not-owned entity writes.
  - `unsupported_mutation` for unrecognized mutation kinds.
- `ApiError` supports explicit `errorCode` that overrides the default mapping.

#### Privacy / Logging Safety

- Mutation log stores only `payloadHash`, never raw user text.
- Error middleware never logs `req.body` for sync endpoints.
- Production mode strips stack traces from error responses.
- Test suite verifies that raw check-in and review text do not appear in serialized logs.
- Import response does not echo back analytics, billing, outbox, or app preference fields.

### Test Coverage (Hardening)

New tests added to `backend/src/tests/syncMutationRoutes.test.ts`:

- Oversized batch (101 mutations) rejected with 400.
- Too-long mutationId (241 chars) rejected with 400.
- Too-long entity clientId (121 chars) rejected with 400.
- Too-long batchId (241 chars) rejected with 400.
- Unsupported mutation type rejected with 400.
- Cross-user task write blocked with `syncErrorCode: "ownership_denied"`.
- Invalid date in daily check-in mutation rejected with 400.
- `errorCode` included in 400 error responses (`invalid_payload`).
- `errorCode` included in 401 error responses (`unauthorized`).

### Production Recommendations (Not Yet Implemented)

These are recommended for production deployment but are not implemented in the current codebase:

1. **Rate limiting**: Add reverse-proxy rate limiting (nginx, Cloudflare, Render) for sync endpoints. Recommended: 60 requests/minute per UID for mutations, 30/minute for import. No in-app rate limiter was added to avoid new dependencies.

2. **Helmet middleware**: Add `helmet` headers for production Express. Currently not installed.

3. **CORS review**: Current CORS allows `FRONTEND_ORIGIN` comma-separated origins. Production should minimize allowed origins.

4. **Request logging**: Consider structured request logging (e.g., `pino`) that excludes request bodies for sync endpoints. Current logging is minimal.

5. **MongoDB transaction**: Import creates multiple documents (goal, plan, weeks, tasks, metrics, check-ins, reviews) without a transaction. If the MongoDB deployment supports replica sets, wrap import in a session transaction.

6. **Webhook endpoint**: No billing webhook endpoint exists. When billing is implemented, add webhook signature verification and idempotent event processing (see `guidelines/PAID_MVP_PROVIDER_DECISION.md`).


## 10. Conflict Resolution Action V1

Manual sync conflict panel now has 4 actions:
1. Export local backup
2. Keep local for now
3. Retry sync
4. Use cloud version (requires confirm checkbox + no pending local mutations)

Key files changed: TwelveWeekLocalStatusSection.tsx, TwelveWeekSettingsShared.ts, analytics.ts, 12WeekSystem.tsx.
Analytics: use_cloud_version added to sync_conflict_action event (counts only, no raw text).


## 11. Offline/Online Hardening

### Network Status Hook
New `useNetworkStatus` hook (`src/app/hooks/useNetworkStatus.ts`): tracks browser online/offline state reactively. Supports a debounced `onReconnect` callback (default 3s) that fires when the browser transitions from offline to online. Timer is cancelled on unmount or if going offline again.

### Compact Before Retry
`mutationQueueSender.ts` now compacts the queue (`compactMutations`) before listing pending mutations. This eliminates duplicate collapse-key entries that accumulated while offline, reducing unnecessary network round-trips.

### Online Reconnect Retry
`useMutationQueueSync` gains `retryOnReconnect` option (default false). When enabled and all preconditions are met (real mode, authenticated, feature enabled, API configured), the hook calls `syncNow` 3s after browser fires 'online'. Preconditions prevent demo-mode or unauthenticated backend calls.

### Settings UI Indicators
Mutation Queue panel now shows: (1) Network status (Online/Offline/Unknown) with color-coded badge; (2) Reconnect retry enabled/disabled status; (3) Amber offline banner with WifiOff icon when offline.

### Retry Policy (Existing, Unchanged)
- Backoff delays: 30s, 2m, 10m, 1h, 4h, 24h
- Permanent failures (failed_terminal, failed_validation, blocked_conflict) are never retried
- `maxAttempts` default 7 per mutation
- Queue is never deleted on failure

### Tests Added
- `useNetworkStatus.test.ts`: 8 tests (initial state, transitions, debounced reconnect, cancel on offline, cancel on unmount, cleanup)
- `mutationQueueOffline.test.ts`: 9 tests (offline enqueue, offline skip, demo mode skip, permanent failure not retried, validation failure not retried, backoff respected, compact keeps latest, compact preserves in-flight, sender compacts before drain, failure preserves queue)


## 12. Staging Sync Smoke Test

New script `scripts/smoke-mvp2-sync-staging.mjs` � CI/staging-friendly E2E smoke test for cloud sync.

### Test Flow
1. Open staging URL
2. Authenticate with test credentials (skippable via `MVP2_SMOKE_SKIP_AUTH=true`)
3. Seed local 12-week data with `[SMOKE-{timestamp}]` prefix
4. Toggle a Today task
5. Trigger manual cloud sync from Settings
6. Refresh and verify task state persists
7. Logout/login and verify data restored
8. Cleanup test-prefixed data

### Safety
- All test data uses `[SMOKE-{timestamp}]` prefix � safe to identify and remove
- No hardcoded secrets � all from env/secrets
- No real payment � no billing flows triggered
- Graceful skip when env is missing (exit 0, not false pass)

### Commands
- `npm run smoke:mvp2-sync` � run locally
- GitHub Actions: `mvp2-sync-staging-smoke.yml` (manual workflow_dispatch)

### Documentation
- `guidelines/MVP_2_SYNC_STAGING_TESTING.md`
