# MVP 2 Cloud Sync Plan

MVP 2 goal: add account-based persistence and reliable cloud sync while preserving the MVP 1 local-first demo path. Demo mode must continue to work without Firebase, backend, MongoDB, or network access.

Primary scope:

- Firebase account sign-in and backend profile bootstrap.
- Cloud restore for a signed-in user's 12-week execution workspace.
- Explicit migration from local-only data to an account.
- Conflict-safe local-first sync for goals, 12-week plans, weeks, tasks, daily check-ins, lead metrics, and weekly reviews.

Out of scope for MVP 2 unless explicitly scheduled: production billing, social features, AI coaching, public sharing, and full vision-board media sync.

## 1. Current Auth State

Frontend auth is optional and env-gated.

- `src/lib/auth/firebase.ts` builds Firebase client config from `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. If any required client value is missing, Firebase auth is disabled.
- Supported sign-in methods are Google popup, email/password sign-in, and email/password registration.
- Firebase ID tokens are cached in localStorage under `firebase_id_token`.
- `src/lib/api/apiClient.ts` attaches `Authorization: Bearer <Firebase ID token>` to requests when a token is available.
- A `401` response triggers Firebase logout and dispatches `api:unauthorized`.
- `src/lib/auth/AuthContext.tsx` bootstraps the backend user profile with `POST /auth/profile` after Firebase has a user.
- `src/lib/auth/useAuth.ts` switches localStorage to an auth-scoped workspace via `activateAuthenticatedUserData(uid)`.
- `RootLayout` only enables backend plan hydration when the app is not in demo mode, Firebase is configured, and a backend profile is ready.

Important current behavior:

- Signing in does not automatically migrate anonymous local data into the account.
- On first sign-in for a Firebase UID, the app starts from a fresh account-scoped local snapshot.
- The previous anonymous snapshot is archived under `visionboard_user_data:anonymous`.
- Account-specific snapshots are stored under `visionboard_user_data:auth:<firebaseUid>`.
- Backend link maps such as `backend_goal_links` and `backend_plan_links` are currently global localStorage keys, not auth-scoped keys.

MVP 2 implication:

- Keep the clean-account behavior as the default safety baseline.
- Add an explicit "move this device data to my account" migration flow instead of silently importing anonymous data on login.
- Scope or namescape backend link maps by auth UID before multi-account cloud sync is treated as stable.

## 2. Current Backend API State

Backend auth and routing:

- `backend/src/routes/index.ts` exposes `healthRoutes` before auth middleware.
- All other API routes are protected by `authMiddleware`.
- `authMiddleware` verifies Firebase ID tokens with Firebase Admin and sets `req.user.uid`, `req.user.email`, and `req.user.name`.
- Ownership is based on Firebase UID stored in model `userId` fields, not Mongo `User._id`.
- CORS allows origins listed in `FRONTEND_ORIGIN`.

Available protected APIs:

- `POST /auth/profile`, `GET /auth/profile`, `PATCH /auth/profile`
- `POST /goals`, `GET /goals`, `GET /goals/:id`, `PATCH /goals/:id`, `DELETE /goals/:id`
- `POST /plans`, `GET /plans`, `GET /plans/:id`, `PATCH /plans/:id`
- `GET /plans/:planId/weeks`, `PATCH /weeks/:weekId`, `POST /weeks/:weekId/review`
- `POST /weeks/:weekId/tasks`, `PATCH /tasks/:taskId`, `DELETE /tasks/:taskId`
- `GET /weeks/:weekId/metrics`, `POST /weeks/:weekId/metrics`
- `POST /metrics/:metricId/logs`, `PATCH /metrics/:metricId/logs/:logId`
- Vision board and order routes exist, but they are secondary to MVP 2 account + 12-week sync.

Current backend strengths:

- Firebase token verification exists.
- Profile bootstrap exists.
- Goal, plan, week, task, and metric services are user-owned and protected.
- Plan detail fetch returns plan + weeks + tasks + metrics.
- Service guard coverage exists for plan/week/task/metric ownership.

Current backend limits:

- No bulk sync endpoint.
- No local client ID fields on persisted records.
- No idempotency key or mutation ID.
- No revision, ETag, or version field for conflict checks.
- No tombstone/deletedAt support.
- No delta pull endpoint.
- No transaction around plan creation + week initialization.
- No backend model for the full local `TwelveWeekSystem` metadata.
- `GoalProgressModel` and `WeekReviewModel` exist, but the current 12-week services do not use them. Weekly review is embedded on `WeekModel`.

## 3. Required Env Vars

Frontend account + sync env:

```text
VITE_APP_MODE=real
VITE_API_BASE_URL=https://<backend-host>/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Optional frontend env:

```text
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_ANALYTICS_MODE=off|ga4
VITE_GA_MEASUREMENT_ID=...
VITE_OUTBOX_SYNC_ENDPOINT=...
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
```

Backend env:

```text
PORT=4000
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@<project>.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=https://<frontend-host>
```

Firebase Console requirements:

- Enable Google and/or Email/Password sign-in providers.
- Add localhost and production frontend domains to Firebase Auth authorized domains.
- Use the same Firebase project ID on frontend and backend.
- Keep the Admin SDK private key in env with escaped `\n`; do not commit service account JSON.

## 4. Data Model Mapping Local <-> Backend

Current local source of truth is `UserData` in localStorage key `visionboard_user_data`.

| Local data | Backend data | Current mapping | MVP 2 notes |
| --- | --- | --- | --- |
| `UserData.userId` | `User.firebaseUid` | No direct mapping. Local ID is generated per local snapshot; backend user uses Firebase UID. | Keep Firebase UID as backend identity. Do not rewrite local `userId` unless a migration requires it. |
| `UserData.onboardingCompleted` | `User.onboardingCompletedAt` | Profile supports `onboardingCompletedAt`, but frontend does not fully sync local onboarding state. | Add explicit profile sync after onboarding/Life Balance completion. |
| `currentWheelOfLife`, `wheelOfLifeHistory` | none | Local only. | Add backend model or store in user settings snapshot if MVP 2 requires cross-device onboarding restore. |
| `Goal.id` | `Goal._id` | `backend_goal_links` maps local goal ID to backend goal ID. | Add `clientGoalId` on backend or auth-scoped link maps for reliable restore. |
| `Goal.title` | `Goal.title` | Synced on create/update. | OK. |
| `Goal.category` | `Goal.category` | Synced. | OK. |
| `Goal.description` | `Goal.description` | Synced. | OK. |
| `Goal.deadline` | `Goal.deadline` | Local date string to backend Date. | Normalize as date-only or ISO policy to avoid timezone drift. |
| `Goal.tasks[]` | `Goal.tasks[]` | Synced only as onboarding task snapshots. | Not enough for 12-week execution tasks. Keep separate from `TaskModel`. |
| `Goal.feasibilityResult` | `Goal.feasibilityResult` | Backend stores mixed payload. | OK for MVP 2 if treated as opaque. |
| `Goal.readinessScore` | `Goal.readinessScore` | Synced. | OK. |
| `Goal.focusArea` | `Goal.focusArea` | Synced. | OK. |
| `Goal.twelveWeekSystem.vision12Week` | `Plan.vision` | Synced. | OK. |
| `Goal.twelveWeekSystem.startDate` | `Plan.startDate` | Synced. | Normalize to ISO on write, date key on local read. |
| `Goal.twelveWeekSystem.endDate` | derived | Not stored. | Can derive from startDate + totalWeeks. |
| `Goal.twelveWeekSystem.totalWeeks` | weeks count | Plan create can initialize 1-12 weeks. | Store totalWeeks or derive from week count. |
| `Goal.twelveWeekSystem.weeklyPlans[].weekNumber` | `Week.weekNumber` | Synced. | OK. |
| `weeklyPlans[].focus` | `Week.focus` | Synced. | OK. |
| `weeklyPlans[].milestone` | `Week.expectedOutput` | Synced. | OK. |
| `weeklyPlans[].phaseName` | none | Local only. | Derive on hydration or add metadata if needed. |
| `weeklyPlans[].completed` | `Week.review` presence | Approximate during hydration. | Use review completion as derived state. |
| `taskInstances[].id` | `Task._id` | `backend_plan_links.taskIdByLocalTaskId` maps local to remote. | Needs auth scoping and ideally `clientTaskId` persisted backend-side. |
| `taskInstances[].title` | `Task.title` | Synced. | OK. |
| `taskInstances[].completed` | `Task.status` | `true -> done`, `false -> todo`. | Backend also supports `doing`; local does not. |
| `taskInstances[].scheduledDate` | `Task.scheduledDate` | Synced. | Normalize date-only comparisons. |
| `taskInstances[].completedAt` | none | Local only. | Add backend field or derive from metric log date if needed. |
| `taskInstances[].leadIndicatorName` | `LeadMetric.name` | Used to create/log metric when task completes. | Needs first-class tactic/lead indicator model or persisted metadata. |
| `taskInstances[].isCore`, `tacticId`, `rescheduledFrom` | none | Local only. | Add task metadata or keep derived local-only. |
| `leadIndicators[].name` | `LeadMetric.name` | Metrics are created per week on demand. | Setup sync does not create all metric definitions. |
| `leadIndicators[].target` | `LeadMetric.weeklyTarget` | Partial; current createMetric often uses `0`. | Parse numeric target into weeklyTarget on setup sync. |
| `leadIndicators[].unit`, `type`, `priority`, `schedule` | none | Inferred during hydration from tasks/metrics. | Add backend tactic model or plan metadata JSON. |
| `dailyCheckIns[].date` | `LeadMetric.logs[].date` on daily check-in metric | Synced. | OK. |
| `dailyCheckIns[].didWorkToday` | `LeadMetric.logs[].completed/value` | `true -> value 1`, `false -> value 0`. | OK. |
| `dailyCheckIns` detail fields | none | Hydration creates synthetic local check-ins. | Add backend check-in payload if these fields matter across devices. |
| `weeklyReviews[].biggestOutputThisWeek` | `Week.review.reflection` | Synced. | OK. |
| `weeklyReviews[].nextWeekPriority` | `Week.review.adjustments` | Synced. | OK. |
| `weeklyReviews` score fields | `Week.review.executionScore` | Local average score converted to 0-100. | Loses per-dimension scores unless backend stores them. |
| `weeklyReviews[].mainObstacle`, `workloadDecision`, `lagProgressValue` | none or derived metric summary | Mostly local only. | Add review metadata if needed. |
| `scoreboard` | derived | Not stored. | Keep derived. |
| `eventLog`, `syncOutbox` | optional outbox endpoint | Current outbox is event-oriented, not mutation-oriented. | Add data mutation outbox for cloud sync. |
| `subscription`, `entitlements` | billing provider contract | Local/mock oriented. | Keep separate from MVP 2 cloud sync unless account billing is explicitly added. |

## 5. Migration Path From Local-Only User To Logged-In User

Current behavior intentionally protects accounts from stale anonymous data by starting signed-in users from a fresh auth-scoped local snapshot. MVP 2 should preserve that safety and add an explicit migration path.

Recommended migration flow:

1. Before sign-in, detect whether `visionboard_user_data` contains meaningful local data:
   - non-demo goals, wheel history, reflections, 12-week system, or user-created plan data;
   - ignore seeded demo snapshots where `isHydratedFromDemo === true` unless the user has edited them.
2. On successful Firebase auth, call `POST /auth/profile` and activate the auth-scoped local workspace.
3. If backend has existing plans/goals, hydrate them first into the signed-in workspace.
4. Show a migration prompt only when archived anonymous data has meaningful local work:
   - "Move this device data to this account"
   - "Keep it only on this device"
   - "Review before importing"
5. On import:
   - copy the anonymous snapshot into the auth-scoped workspace only after user confirmation;
   - keep a backup under `visionboard_user_data:anonymous` until import completes;
   - create or upsert backend goals/plans/weeks/tasks/metrics;
   - save link maps after every successful backend create;
   - record an import result summary.
6. If backend is empty, local import can become the account's initial cloud snapshot.
7. If backend already has data, run conflict detection before pushing local data.
8. If conflict detection finds differences, pause automatic sync for the affected goal until the user chooses local or backend.
9. After successful import, mark the account profile with a migration timestamp or local marker so the prompt does not repeat.

Do not:

- auto-import anonymous data just because a user logged in;
- import seeded demo data into a real account by default;
- overwrite backend data during first login without a visible choice;
- delete the anonymous backup before the sync result is known.

## 6. Conflict Policy

Current conflict detection exists in `backendConflictDetector.ts` for:

- weekly focus and milestone;
- task completion, title, and schedule;
- missing linked backend task;
- daily check-in;
- weekly review output, priority, and score.

MVP 2 conflict policy:

- Default to local-first writes for the active device, but never overwrite known divergent backend data silently.
- Use backend `updatedAt` only as a tie-breaker when the field has no meaningful local edit since last sync.
- Treat task `done` as monotonic by default:
  - do not downgrade a backend `done` task to `todo` during passive snapshot sync;
  - allow downgrade only for a direct user action on the active device.
- For daily check-ins on the same date:
  - if one side has no entry, merge the existing entry;
  - if both sides exist and `didWorkToday` differs, show a conflict;
  - if backend has only synthetic data and local has detail text, preserve local detail.
- For weekly reviews:
  - merge missing review fields;
  - if both sides have non-empty differing output, priority, or score, show a conflict;
  - do not discard local `mainObstacle`, `workloadDecision`, or score breakdown until backend can store them.
- For plan/week structure:
  - if backend has a plan missing locally, hydrate it;
  - if local has a plan missing backend, push it after confirmation or normal sync;
  - if both exist and differ, pause auto-sync for that goal.
- For deletes:
  - avoid hard delete as the default conflict action;
  - introduce `deletedAt` tombstones before multi-device delete sync;
  - until tombstones exist, prefer archive/paused state for user-visible delete flows.

Conflict UI for MVP 2:

- Keep the existing "use backend" / "keep local" goal-level action as a baseline.
- Add a review summary before destructive overwrite.
- Field-level merge can be deferred if the goal-level choice is explicit and clear.

## 7. Offline Policy

MVP 2 must remain local-first.

Rules:

- All user actions save to localStorage first.
- Backend sync is best-effort and must not block task completion, daily check-in, weekly review, or setup completion.
- Demo mode must not call protected backend sync paths.
- If Firebase is unconfigured, user is signed out, profile is not ready, or token is unavailable, keep local-only behavior.
- If `navigator.onLine === false` or fetch fails with a network error, queue a retry and show a local-saved status.
- Remote sync failures must not roll back local progress.

Needed offline sync queue:

- Current `syncOutbox` is analytics/event-summary oriented. It is not enough for data mutation replay.
- Add a structured data mutation queue with:
  - mutation ID;
  - entity type and local ID;
  - operation type (`create`, `update`, `delete`, `review`, `metric_log`);
  - payload;
  - createdAt;
  - retryCount/retryAt;
  - auth UID;
  - idempotency key.
- Drain FIFO per account when profile and network are ready.
- Collapse superseded updates where safe, for example multiple title edits before any server write.
- Keep failed mutations inspectable in Settings.

## 8. API Gaps

Required for MVP 2 reliability:

- Bulk import endpoint for a complete local snapshot or 12-week goal bundle.
- Bulk pull endpoint for all account data needed by the frontend workspace.
- Idempotent upsert endpoints using client IDs:
  - `clientGoalId`
  - `clientPlanId`
  - `clientWeekId` or `(clientPlanId, weekNumber)`
  - `clientTaskId`
  - `clientMetricId` or deterministic metric key
  - `clientMutationId`
- Revision/version fields for conflict detection.
- Tombstone support with `deletedAt`.
- Delta sync endpoint such as `GET /sync/changes?since=<cursor>`.
- Server sync cursor per user/device.
- Batch task and metric log writes.
- Backend representation for full 12-week metadata:
  - lead indicator unit/type/priority/schedule;
  - lag metric;
  - milestones;
  - success evidence;
  - review day;
  - timezone;
  - tactic load preference;
  - preferred days;
  - personal constraint.
- Backend representation for daily check-in details beyond boolean completion.
- Backend representation for weekly review details beyond reflection/adjustments/executionScore.
- Cascade or transaction strategy for plan/week/task/metric creation.
- API-level conflict response shape, not only frontend-side conflict detection.

Nice-to-have after MVP 2:

- Sync wheel-of-life history.
- Sync reflections.
- Sync achievements if they become account-level.
- Sync app preferences and notification settings.
- Sync vision boards only after asset/media storage is designed.

## 9. Frontend Gaps

Account/migration gaps:

- No explicit local-to-account migration UI.
- Login starts clean for a new auth UID and archives anonymous data, but does not offer import.
- No summary of what will be moved into the account.
- No account migration completion marker.

Sync correctness gaps:

- Backend link stores are global localStorage keys and can leak or collide across accounts on the same browser.
- Link maps are local-only; a fresh browser must infer links from titles/dates because backend does not persist client IDs.
- Current setup sync creates the backend plan/weeks, but does not create full lead metric definitions.
- Current execution sync can push local snapshots, but it is not backed by a durable mutation queue.
- Current hydration can restore backend plans, but merge semantics are limited.
- Current conflict UI is goal-level, not field-level.
- Current daily check-in hydration recreates synthetic check-ins and loses detail fields.
- Current weekly review sync loses some local review dimensions.
- No full account workspace loading state that separates:
  - auth check;
  - profile bootstrap;
  - backend hydration;
  - local migration prompt;
  - conflict review.

UX gaps:

- Need a first-login account handoff screen: "Your work is still on this device. Move it to your account?"
- Need sync status in the main 12-week header and Settings with clear states:
  - local only;
  - signed in, not synced;
  - syncing;
  - synced;
  - offline;
  - needs review;
  - failed.
- Need "retry sync" and "download cloud copy" actions.
- Need "export local backup" before destructive conflict actions.

## 10. Backend Gaps

Data model gaps:

- `PlanModel` is too thin for the full local 12-week system.
- `WeekModel.review` stores only a subset of local weekly review fields.
- `LeadMetricModel` is week-scoped and does not model plan-level lead indicators/tactics.
- `TaskModel` lacks client ID, completedAt, isCore, tacticId, rescheduledFrom, and deletedAt.
- `GoalModel` lacks clientGoalId, sync revision, deletedAt, and account migration metadata.
- `UserModel` lacks sync cursor, migration status, and app preference fields.
- `GoalProgressModel` and `WeekReviewModel` are currently unused by services.

Service/API gaps:

- Plan creation initializes weeks with multiple writes and no transaction.
- There is no endpoint to create/update a full 12-week system atomically.
- There is no backend-side conflict detection.
- There is no idempotency protection for retried creates.
- There is no delete cascade or tombstone strategy.
- There is no sync cursor or change feed.
- There are no backend tests for bulk snapshot import because the API does not exist yet.

Security and operations gaps:

- All protected writes trust Firebase UID ownership, which is good, but client IDs must also be scoped by UID.
- CORS depends on correct `FRONTEND_ORIGIN`; production rollout needs explicit domain checklist.
- Need rate limits or request size checks for future bulk sync endpoints.
- Need structured logging around sync/import failures.

## 11. Test Plan

Frontend unit tests:

- Firebase disabled: app stays local-first, no protected backend calls.
- Firebase enabled: token attaches to API calls.
- 401 response logs out and emits unauthorized event.
- Account storage scoping keeps two Firebase users isolated.
- Anonymous local snapshot is archived and not auto-imported.
- Migration detector ignores untouched seeded demo data.
- Migration detector flags real local goals/12-week systems.
- Link stores are auth-scoped after the change.
- Mapping serializers preserve 12-week plan, weeks, tasks, metrics, check-ins, and reviews.
- Conflict detector covers every supported conflict kind.
- Offline mutation queue retries and does not duplicate successful mutations.

Frontend integration tests:

- Local-only user completes MVP 1 flow, signs in, imports data, reloads, and sees the same 12-week system.
- Signed-in new user with existing backend data hydrates from cloud on a clean browser.
- Switching accounts does not show another account's goals or backend links.
- Backend unavailable: user can continue locally and sees a retryable sync state.
- Conflict state pauses auto-sync and exposes "use backend" / "keep local" actions.

Backend tests:

- Auth middleware rejects missing/invalid bearer tokens.
- Profile bootstrap creates exactly one user per Firebase UID.
- Goal/plan/week/task/metric ownership rejects cross-user access.
- Bulk import is idempotent by client IDs and mutation IDs.
- Bulk import validates payload shape and size.
- Plan import uses transaction-like behavior or compensating cleanup.
- Tombstone behavior prevents deleted records from reappearing.
- Delta pull returns only the authenticated user's changes.
- Conflict metadata is returned when revisions mismatch.

End-to-end tests:

- First device: create local plan, sign in, import, sync, reload.
- Second device/browser: sign in, hydrate same plan, complete a task, sync.
- First device: reconnect, pull remote task completion, preserve local detail fields.
- Two-device conflict: both edit same weekly focus; app blocks silent overwrite and lets user choose.
- Offline flow: complete task and weekly review offline; reconnect; queue drains once.
- Demo production mode: no Firebase/backend requirement and no protected backend calls.

Runtime checks:

- `npm run check`
- `npm --prefix backend run check`
- `node scripts/check-runtime-env.mjs --full-stack`
- Manual production smoke for real mode with Firebase + backend + Mongo configured.

## 12. Rollout Plan

Phase 0: finalize contract.

- Approve MVP 2 scope: account + 12-week cloud sync first.
- Decide whether wheel-of-life and reflections are part of first cloud restore or deferred.
- Choose sync contract: bulk snapshot upsert plus delta pull, or operation log first.

Phase 1: harden current account sync foundation.

- Auth-scope backend link maps.
- Add explicit sync status copy for signed-in users.
- Ensure demo mode never reaches protected backend sync.
- Keep current clean-login behavior.

Phase 2: add local-to-account migration UX.

- Detect meaningful anonymous data before login.
- Show migration prompt after profile bootstrap.
- Import only after confirmation.
- Keep anonymous backup until import succeeds.
- Add migration tests.

Phase 3: add backend sync contract.

- Add client IDs, revision fields, tombstones, and sync cursor fields.
- Add bulk import/upsert endpoint for goal + 12-week bundle.
- Add account pull endpoint for workspace hydration.
- Add idempotency handling for mutation retries.

Phase 4: replace best-effort snapshot sync with durable queue.

- Add structured data mutation queue.
- Queue local writes while offline or unauthenticated.
- Drain queue after profile readiness.
- Persist sync result per account.

Phase 5: expand conflict handling.

- Keep existing goal-level choice for MVP 2.
- Add safer copy and local backup before overwrite.
- Add field-level merge only for high-frequency conflicts if user testing requires it.

Phase 6: beta rollout.

- Start with internal real-mode accounts.
- Enable cloud restore for signed-in users.
- Keep local-first save path as the primary UX guarantee.
- Monitor sync failures, duplicate tasks, missing link maps, and timezone drift.

Phase 7: production rollout.

- Set production Vercel env to real mode only after Firebase, backend, Mongo, and CORS are verified.
- Keep a documented rollback path to demo mode.
- Keep export-local-backup available.
- Do not introduce real billing dependency into the cloud sync release.
