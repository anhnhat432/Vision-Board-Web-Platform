# Sync Audit

Last reviewed: 2026-04-29

This audit describes the current sync behavior between frontend local data and the backend API. It is intentionally descriptive only; no source code was changed for this audit.

## 1. Source of truth hiện tại là gì?

For the current MVP path, the practical source of truth is still the browser localStorage snapshot managed by `src/app/utils/storage.ts`.

Important frontend entry points:

- `getUserData()` in `src/app/utils/storage.ts` reads `visionboard_user_data`, normalizes old/missing fields, and initializes demo or empty data when needed.
- `saveUserData()` in `src/app/utils/storage.ts` writes the normalized `UserData` snapshot and emits `visionboard:user-data-updated`.
- `updateGoal()` in `src/app/utils/storage.ts` updates a local `Goal`, including its embedded `twelveWeekSystem`.
- `useSyncedUserData()` in `src/app/hooks/useSyncedUserData.ts` keeps React state in sync with localStorage events, not backend state.
- `useTwelveWeekSystemSnapshot()` in `src/app/hooks/useTwelveWeekSystemSnapshot.ts` selects the active local 12-week goal/system, then applies a best-effort backend progress overlay.

The backend is an optional remote layer for authenticated real/full-stack mode:

- `apiClient` in `src/lib/api/apiClient.ts` attaches Firebase bearer tokens to API calls.
- `AuthProvider` in `src/lib/auth/AuthContext.tsx` bootstraps the backend profile with `post<UserProfile>("/auth/profile")`.
- `12WeekSetup` in `src/app/pages/12WeekSetup.tsx` saves local data first, then optionally syncs backend goal/plan in the background.
- `usePlanExecutionSync()` in `src/features/plan12week/hooks/usePlanExecutionSync.ts` syncs local task/check-in/review snapshots to backend when enabled.
- `useBackendPlanHydration()` and `hydrateTwelveWeekPlansFromBackend()` in `src/app/hooks/useBackendPlanHydration.ts` can pull backend plans into local data, but they guard conflicts instead of blindly overwriting active local work.

Conclusion: localStorage is canonical for MVP 1 UX. Backend data is best-effort remote persistence and overlay unless the user explicitly imports/applies a backend snapshot.

## 2. Data nào sống ở localStorage?

Main key:

- `visionboard_user_data` from `USER_DATA_STORAGE_KEY` in `src/app/utils/storage.ts`.

Scoped auth keys:

- `visionboard_user_data:auth_owner_uid`
- `visionboard_user_data:anonymous`
- `visionboard_user_data:auth:<encoded Firebase UID>`

Planning/draft keys from `APP_STORAGE_KEYS` in `src/app/utils/storage.ts`:

- `selected_focus_area`
- `pending_smart_goal`
- `pending_feasibility_result`
- `pending_feasibility_answers`
- `pending_12_week_setup_draft`
- `pending_12_week_plan_draft`
- `latest_12_week_goal_id`
- `latest_12_week_system_goal_id`
- `latest_12_week_plan_goal_id`
- `readiness_level`
- `readiness_score`

Backend/local mapping keys:

- `backend_goal_links` in `src/lib/api/goalLinkStore.ts`
- `backend_plan_links` in `src/features/plan12week/persistence/planLinkStore.ts`
- `backend_order_links` in `src/lib/api/orderLinkStore.ts`
- `backend_vision_board_links` in `src/lib/api/visionBoardLinkStore.ts`

Other local-first/demo keys mentioned by storage cleanup:

- `visionboard_orders_v1`
- `visionboard_mock_billing_account`
- `visionboard_mock_billing_session_*`
- `visionboard_last_outbox_sync`
- `visionboard_last_entitlement_sync`
- `visionboard_last_restore_access`
- `visionboard_new_user_guide_dismissed`
- `visionboard_new_user_guide_seen_at`
- `visionboard_rescue_dismissed`
- `last_reminder_date`
- `visionboard_last_browser_notification`

Main local schemas are defined in `src/app/utils/storage-types.ts`:

- `UserData`: root local snapshot with `goals`, `visionBoards`, `achievements`, `reflections`, `eventLog`, `syncOutbox`, `appPreferences`, `subscription`, `entitlements`, reminder/privacy fields, and `onboardingCompleted`.
- `Goal`: local goal record with local `id`, `category`, `title`, `description`, `deadline`, `tasks`, optional feasibility fields, and embedded `twelveWeekSystem`.
- `TwelveWeekSystem`: local 12-week execution state with `vision12Week`, lead/lag metrics, weekly plans, task instances, daily check-ins, weekly reviews, scoreboard, reminders, and cycle metadata.
- `TwelveWeekTaskInstance`, `UniversalDailyCheckIn`, `UniversalWeeklyReview`, and `UniversalScoreboardWeek`: local execution subrecords.
- `SyncOutboxItem`: local outbox/event queue metadata, but this is not currently a full backend CRUD retry queue.

## 3. Data nào sống ở backend?

Backend routes are mounted in `backend/src/routes/index.ts`. All routes except health pass through `authMiddleware` from `backend/src/middleware/authMiddleware.ts`, so backend data is scoped by Firebase UID.

Backend API surface:

- Auth profile: `authRoutes.ts` -> `authController.ts` -> `authService.ts` -> `MongoUserRepository.ts` -> `UserModel.ts`.
- Goals: `goalRoutes.ts` -> `goalController.ts` -> `goalService.ts` -> `MongoGoalRepository.ts` -> `GoalModel.ts`.
- Plans: `planRoutes.ts` -> `planController.ts` -> `planService.ts` -> `MongoPlanRepository.ts` -> `PlanModel.ts`.
- Weeks/reviews: `weekRoutes.ts` -> `weekController.ts` -> `weekService.ts` -> `MongoWeekRepository.ts` -> `WeekModel.ts`.
- Tasks: `taskRoutes.ts` -> `taskController.ts` -> `taskService.ts` -> `MongoTaskRepository.ts` -> `TaskModel.ts`.
- Metrics/logs: `metricRoutes.ts` -> `metricController.ts` -> `metricService.ts` -> `MongoMetricRepository.ts` -> `LeadMetricModel.ts`.
- Orders: `orderRoutes.ts` -> `orderController.ts` -> `orderService.ts` -> `MongoOrderRepository.ts` -> `OrderModel.ts`.
- Vision boards: `visionBoardRoutes.ts` -> `visionBoardController.ts` -> `visionBoardService.ts` -> `MongoVisionBoardRepository.ts` -> `VisionBoardModel.ts`.

Backend 12-week data model:

- `GoalModel.ts`: `userId`, title/category/description/deadline/status, feasibility/readiness fields, onboarding tasks, optional `planId`.
- `PlanModel.ts`: `userId`, `vision`, optional `smartGoalId`, `startDate`.
- `WeekModel.ts`: `planId`, `weekNumber`, `focus`, `expectedOutput`, optional embedded `review`.
- `TaskModel.ts`: `weekId`, `title`, `status`, optional `scheduledDate`.
- `LeadMetricModel.ts`: `weekId`, metric `name`, `weeklyTarget`, embedded `logs`.

`planService.getPlanDetails()` in `backend/src/services/planService.ts` returns a composite plan snapshot: plan + weeks + tasks + metrics.

## 4. ID local và ID backend được map thế nào?

Local IDs are usually app-generated UUID-like strings. Backend IDs are MongoDB ObjectId strings.

Goal mapping:

- `saveGoalLink(localGoalId, backendGoalId)` in `src/lib/api/goalLinkStore.ts` writes `backend_goal_links`.
- `getBackendGoalId(localGoalId)` reads the backend goal id for a local goal.

Plan/week/task/metric mapping:

- `savePlanDetailsLink(localGoalId, details)` in `src/features/plan12week/persistence/planLinkStore.ts` writes `backend_plan_links[localGoalId]`.
- That link stores:
  - `planId`
  - `weekIdByNumber`
  - `metricIdByKey`, keyed as `weekNumber::metricName`
  - `taskIdByLocalTaskId`
- `getWeekIdForGoal()`, `getMetricIdForGoal()`, `setMetricIdForGoal()`, `getRemoteTaskIdForGoal()`, and `setRemoteTaskIdForGoal()` read/update this map.

Setup flow mapping:

- `src/app/pages/12WeekSetup.tsx` creates the local `Goal` and embedded `TwelveWeekSystem` first.
- If backend sync is allowed, it calls `createGoal()` from `src/services/goalService.ts`, stores `saveGoalLink(localGoalId, backendGoal.id)`, then calls `planSetupActions.syncPlanForGoal()`.
- `syncPlanForGoal()` in `src/features/plan12week/hooks/usePlanSetupSync.ts` creates a backend plan with `smartGoalId = backendGoalId ?? localGoalId`, then fetches full `PlanDetails` and calls `savePlanDetailsLink(localGoalId, details)`.
- If both backend goal and backend plan exist, `12WeekSetup.tsx` calls `updateGoal(backendGoalId, { planId: backendPlanId })` through `src/services/goalService.ts`.

Hydration mapping:

- `hydrateTwelveWeekPlansFromBackend()` in `src/app/hooks/useBackendPlanHydration.ts` matches backend plans to local goals by existing `backend_plan_links`, by `plan.smartGoalId`, or by linked backend goal (`findRelatedApiGoal()`).
- `persistHydratedGoalLinks()` in the same file saves the plan link, remote task links, and goal link when possible.

Other mappings:

- `backend_order_links` maps local order ID to backend order ID via `src/lib/api/orderLinkStore.ts`.
- `backend_vision_board_links` maps local vision board ID to backend board ID via `src/lib/api/visionBoardLinkStore.ts`.

## 5. Khi offline/online thì chuyện gì xảy ra?

There is no single global sync engine that reacts to browser online/offline events and replays all failed mutations.

Local-first behavior:

- Most product flows write to localStorage immediately through `saveUserData()`, `updateGoal()`, or local storage helpers.
- Demo mode can run without Firebase and without backend.
- `useSyncedUserData()` only syncs browser tabs/local snapshots; it does not pull backend data.

Authenticated backend behavior:

- `apiClient.request()` in `src/lib/api/apiClient.ts` gets a Firebase token from `getFirebaseToken()`, falls back to `getStoredFirebaseToken()`, and sends `Authorization: Bearer <token>`.
- Network failures become `ApiClientError` with `isNetworkError: true`.
- 401 responses trigger `handleUnauthorizedResponse()`, which logs out Firebase and dispatches `api:unauthorized`.
- `usePlanExecutionSync()` serializes backend writes through `enqueueSync()` and keeps a per-hook pending counter, but it does not persist that queue across reloads.

Plan execution:

- `usePlanExecutionSync.ensurePlanDetails()` first uses `backend_plan_links`, then searches backend plans by `smartGoalId`, then creates a backend plan if needed.
- `syncTaskToggle()`, `syncDailyCheckIn()`, `syncWeeklyReview()`, and `syncLocalSnapshot()` attempt backend writes when enabled.
- If sync is disabled, missing a goal/system, or cannot get plan details, most small actions return success-like values to avoid blocking local UX.

Hydration/import:

- `hydrateTwelveWeekPlansFromBackend()` can pull remote plans into localStorage.
- `applyBackendPlanSnapshotToLocal()` can replace one local plan snapshot with a backend-derived snapshot when the user chooses that direction.

## 6. Khi backend fail thì UI rollback thế nào?

There are two different rollback styles.

Main MVP localStorage route (`src/app/pages/12WeekSystem.tsx`):

- `handleToggleTask()` updates local state first, then calls `executionSyncActions.syncTaskToggle()`.
- If `syncTaskToggle()` returns `false`, the page attempts a guarded rollback only if the latest local task still has the attempted state. If the user changed the task again meanwhile, it keeps the latest local state.
- `handleDailyCheckIn()` saves local check-in first. If backend sync fails, it shows an info toast saying the check-in is local and will sync when backend is ready; it does not rollback.
- `handleWeeklyReviewSubmit()` saves local review first. If backend sync fails, it shows an info toast; it does not rollback.
- `handleSyncLocalSnapshot()` surfaces `success`, `partial`, `offline`, `not_configured`, `idle`, or `error` style messages based on the snapshot returned by `syncLocalSnapshot()`.

Backend-oriented hook (`src/features/plan12week/hooks/usePlan12Week.ts`):

- `updateWeek()` optimistically updates local hook state and rolls back week fields if `updateRemoteWeek()` fails.
- `addTask()` adds a temporary task locally and removes it if `addRemoteTask()` fails.
- `updateTaskStatus()` rolls back task status if `updateRemoteTask()` fails.
- `logLeadMetric()` rolls back metric logs if metric creation/logging fails.
- `submitWeeklyReview()` rolls back review state if `submitRemoteWeeklyReview()` fails.

Overlay/hydration:

- `useBackendProgressOverlay()` catches fetch failures and returns local data unchanged.
- `useBackendTaskOverlay()` catches fetch failures and returns an empty overlay.
- `useBackendPlanHydration()` catches errors and reports an error result instead of throwing into the UI.

Setup:

- `12WeekSetup.tsx` completes local save, clears drafts, shows success, and navigates to `/12-week-system` independently of backend sync result.
- Backend goal/plan/link failures are logged with `console.warn()` and should not destroy local progress.

## 7. Các conflict case có thể xảy ra

Existing conflict detection:

- `detectBackendPlanConflicts()` in `src/features/plan12week/persistence/backendConflictDetector.ts` detects differences in weekly focus, milestone/output, task completion, task title, task schedule, missing linked backend task, daily check-in, weekly review output, weekly review priority, and weekly review score.
- `hydrateTwelveWeekPlansFromBackend()` skips overwriting an existing local plan when conflicts are detected.

Likely conflict cases:

1. Same task title/date matching is ambiguous. `findRemoteTaskForLocalTask()` in `usePlanExecutionSync.ts` and `backendConflictDetector.ts` can match by linked id, then title/date, then single same-title match. Duplicate task titles can map incorrectly.
2. `Plan.smartGoalId` can contain either backend goal id or local goal id depending on whether backend goal creation succeeded before plan creation. This is intentional fallback, but it makes plan discovery less deterministic.
3. `backend_plan_links` can be stale after backend deletion or account changes. The app handles missing records softly, but stale links can cause duplicate remote plan creation or failed overlays.
4. Backend overlay can make UI show backend-completed tasks while the local `TwelveWeekSystem.taskInstances` still stores a different value.
5. Weekly review merge is coarse. A backend review can override display values in the overlay, while local review fields remain separate until the user applies backend or pushes local.
6. Daily check-ins are represented locally as rich `UniversalDailyCheckIn` records but remotely as metric logs on a synthetic daily-check-in metric. Some local fields have no backend equivalent.
7. Lead metrics are matched by normalized metric name. Renaming a lead indicator can create a new backend metric instead of updating the old one.
8. Local reset/reentry changes can rewrite local schedule/task state, but there is no full backend delete/reconcile for old remote tasks and metrics.
9. There is no cross-device conflict policy. Two browsers can edit separate local snapshots and push snapshots in different orders.
10. `syncOutbox` in `UserData` is not currently the durable retry log for all backend CRUD writes, so failed backend mutations may not be replayed after refresh.

## 8. Các bug/rủi ro lớn nhất

Highest risk:

- There is no unified sync metadata per entity. Local `Goal`, `TwelveWeekTaskInstance`, `UniversalDailyCheckIn`, and `UniversalWeeklyReview` do not carry `remoteId`, `localUpdatedAt`, `remoteUpdatedAt`, `syncStatus`, `version`, or `deletedAt`.
- Backend writes are best-effort and mostly not durable. `enqueueSync()` in `usePlanExecutionSync.ts` serializes in-memory operations but does not persist pending mutations.
- Pull and overlay can diverge from local source. `useBackendProgressOverlay()` can display backend progress without materializing that exact state into `visionboard_user_data`.
- Duplicate backend plans are possible if `backend_plan_links` is missing/stale and backend plan discovery by `smartGoalId` fails.
- Remote deletions are not reconciled with local data. `deleteTask()` exists in `backend/src/services/taskService.ts`, but local 12-week reset/replanning does not appear to call backend deletion for removed local task instances.

Medium risk:

- `apiClient.request()` falls back to `getStoredFirebaseToken()` when `getFirebaseToken()` fails. That improves resilience but can send a stale token until the backend returns 401.
- Backend services validate ownership by user id through `requirePlanOwnership()`, `requireWeekOwnership()`, `requireTaskOwnership()`, and `requireMetricOwnership()`, but the frontend still needs to avoid protected sync calls before `AuthProvider` has a user profile.
- Backend plan details are assembled with separate task/metric queries per week in `planService.getPlanDetails()`. For 12 weeks this is acceptable, but it can become expensive if the model grows.
- Backend weekly review supports one embedded review per week; it does not preserve review history.
- Backend metric logs can accumulate duplicate logs unless frontend finds and patches an existing same-date log.

Lower risk but worth tracking:

- `Goal.planId` is a string field, not an ObjectId ref, so backend cannot enforce referential integrity between goals and plans.
- `Plan.smartGoalId` is a plain string and can point to either a backend ObjectId or a local id fallback.
- Order and vision board link stores are present, but they are not part of the core MVP 1 12-week execution policy.

## 9. Sync policy đơn giản khuyến nghị cho MVP 1

MVP 1 should remain local-first public demo.

Recommended policy:

1. Treat `visionboard_user_data` as canonical for public demo behavior.
2. Demo mode must not call protected backend sync paths.
3. Real mode may sync in the background only when Firebase is configured, user is signed in, and backend profile is ready.
4. Local save should complete before any backend call.
5. Backend failure should not erase local progress.
6. Use backend overlay only as a convenience indicator, not as the canonical source unless the user explicitly chooses "use backend version".
7. Avoid automatic local overwrite during hydration when `detectBackendPlanConflicts()` reports conflicts.
8. Keep `backend_goal_links` and `backend_plan_links` as best-effort mapping only.
9. Do not claim cloud sync is complete in MVP 1 copy/docs.
10. For tests, prioritize local demo completion, 12-week setup, today tasks, weekly review, progress display, and mock upgrade. Backend sync tests should verify "does not break local flow" more than perfect cloud behavior.

MVP 1 user-facing rule:

- "Your progress is saved on this device. Login/backend sync is optional and best-effort."

## 10. Sync policy khuyến nghị cho MVP 2 có login/cloud sync

MVP 2 should define a real sync contract before broad cloud-sync promises.

Recommended architecture:

1. Add sync metadata to local records or sidecar maps:
   - `localId`
   - `remoteId`
   - `localUpdatedAt`
   - `remoteUpdatedAt`
   - `syncStatus`
   - `lastSyncedAt`
   - `deletedAt`
   - `version` or `etag`
2. Promote the current `syncOutbox` idea into a durable mutation outbox for backend CRUD:
   - create/update/delete task
   - daily check-in upsert
   - weekly review upsert
   - plan/week changes
   - goal-plan linking
3. Use idempotency keys or client mutation ids so retries do not create duplicate tasks/plans/metric logs.
4. Add backend batch sync endpoints:
   - pull changes since timestamp/version
   - push mutation batch
   - return per-mutation success/conflict/error
5. Make backend authoritative after login, but keep local cache optimistic for responsiveness.
6. Define merge rules:
   - Tasks: latest timestamp per task field, with deletion tombstones.
   - Daily check-ins: one record per local date; merge by date.
   - Metric logs: one log per metric/date where appropriate; use upsert instead of append-only for daily check-in style metrics.
   - Weekly reviews: one current review per week, with optional review history later.
   - Plan structure: manual conflict resolution if local and backend both changed milestones/tasks materially.
7. Replace overlay-only display with explicit local cache materialization after conflict decisions.
8. Add a first-login migration flow:
   - detect anonymous local data
   - detect existing remote data
   - let user choose merge, keep local, or use cloud
9. Add account-scoped link stores or include links in the scoped user data snapshot to reduce cross-account stale links.
10. Add observability for sync status:
   - last sync time
   - pending mutation count
   - failed mutation count
   - retry action

MVP 2 user-facing rule:

- "After login, cloud is the shared source across devices, while this device keeps an offline cache and sync queue."
