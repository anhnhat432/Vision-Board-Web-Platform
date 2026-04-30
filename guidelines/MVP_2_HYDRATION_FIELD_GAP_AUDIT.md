# MVP 2 Hydration Field Gap Audit

Last reviewed: 2026-04-30

This audit compares the local 12-week execution data shape with the current backend models and frontend backend hydration path. It is documentation only; no source code, endpoint, migration, or billing behavior is changed here.

## Summary

The current backend can restore a usable 12-week plan shell, weekly focus/output, task completion, metric progress, and a coarse weekly review. It cannot round-trip the full local `TwelveWeekSystem` because the backend model is intentionally thinner than the local MVP 1 execution model.

Highest-risk gaps for MVP 2 are:

- task metadata: `completedAt`, `isCore`, `tacticId`, `rescheduledFrom`, and `leadIndicatorName`;
- daily check-in detail beyond a boolean/value metric log;
- weekly review dimensions beyond one execution score plus reflection/adjustments;
- lead indicator/tactic schedule metadata;
- plan setup metadata such as lag metric, milestones, preferred days, review day, constraints, and template state.

## 1. Local Fields Currently Present

### Local root data

`src/app/utils/storage-types.ts` defines `UserData` as the browser-local source of truth:

- `userId`
- `onboardingCompleted`
- `currentWheelOfLife`
- `wheelOfLifeHistory`
- `goals`
- `visionBoards`
- `achievements`
- `reflections`
- `eventLog`
- `syncOutbox`
- `appPreferences`
- `subscription`
- `entitlements`
- `experimentAssignments`
- `emailReminderSchedule`
- `pushSubscription`
- `privacyConsents`

Only `goals[].twelveWeekSystem` is in the core scope of this audit.

### Local goal fields

`Goal` stores:

- `id`
- `category`
- `title`
- `description`
- `deadline`
- `tasks[]` with local onboarding task completion
- `feasibilityResult`
- `readinessScore`
- `focusArea`
- `twelveWeekSystem`
- `twelveWeekPlan`
- `createdAt`

### Local 12-week system fields

`TwelveWeekSystem` stores:

- plan identity/setup: `goalType`, `vision12Week`, `templateId`, `templateName`
- lag metric: `lagMetric.name`, `lagMetric.unit`, `lagMetric.target`, `lagMetric.currentValue`
- lead indicators/tactics: `leadIndicators[].id`, `name`, `target`, `unit`, `type`, `priority`, `schedule`
- milestones: `milestones.week4`, `week8`, `week12`
- setup copy/metadata: `successEvidence`, `reviewDay`, `week12Outcome`, `weeklyActions`, `successMetric`
- cycle dates/settings: `startDate`, `endDate`, `timezone`, `weekStartsOn`, `status`, `dailyReminderTime`
- setup preferences: `tacticLoadPreference`, `preferredDays`, `personalConstraint`
- recovery/progress metadata: `reentryCount`, `currentWeek`, `totalWeeks`
- week structure: `weeklyPlans[].weekNumber`, `phaseName`, `focus`, `milestone`, `completed`
- tasks: `taskInstances[].id`, `weekNumber`, `scheduledDate`, `title`, `leadIndicatorName`, `isCore`, `completed`, `completedAt`, `tacticId`, `rescheduledFrom`
- daily check-ins: `dailyCheckIns[].date`, `didWorkToday`, `whichLeadIndicatorWorkedOn`, `amountDone`, `outputCreated`, `obstacleOrIssue`, `dailySelfRating`, `optionalNote`, `mood`
- weekly reviews: `weeklyReviews[].weekNumber`, `leadCompletionPercent`, `lagProgressValue`, `biggestOutputThisWeek`, `mainObstacle`, `nextWeekPriority`, `workloadDecision`, `reviewCompleted`, `progressScore`, `disciplineScore`, `focusScore`, `improvementScore`, `outputQualityScore`, `completedLeadIndicators`
- scoreboard: `scoreboard[].weekNumber`, `leadCompletionPercent`, `mainMetricProgress`, `outputDone`, `reviewDone`, `weeklyScore`
- legacy fields: `dailyUpdates`, `legacyWeeklyReviews`, `legacyScoreboard`

### Frontend plan domain types

`src/features/plan12week/types` and `src/types/plan.ts` define a thinner API-facing plan shape:

- `Plan12Week`: `id`, `userId`, `vision`, `smartGoalId`, `startDate`, `createdAt`, `updatedAt`, `weeks`
- `Week`: `id`, `planId`, `weekNumber`, `focus`, `expectedOutput`, `tasks`, `leadMetrics`, `review`
- `Task`: `id`, `weekId`, `title`, `status`, `scheduledDate`, timestamps
- `LeadMetric`: `id`, `weekId`, `name`, `weeklyTarget`, `logs`
- `LeadMetricLog`: `id`, `date`, `value`, `completed`
- `WeekReview`: `weekNumber`, `executionScore`, `reflection`, `adjustments`

## 2. Backend Fields Currently Present

### `GoalModel`

Current fields:

- `userId`
- `title`
- `category`
- `description`
- `deadline`
- `status`
- `focusArea`
- `feasibilityResult`
- `readinessScore`
- `tasks[]` with `title`, `completed`
- `planId`
- timestamps

### `PlanModel`

Current fields:

- `userId`
- `vision`
- `smartGoalId`
- `startDate`
- timestamps

### `WeekModel`

Current fields:

- `planId`
- `weekNumber`
- `focus`
- `expectedOutput`
- `review`
- timestamps

Embedded `review` fields:

- `weekNumber`
- `executionScore`
- `reflection`
- `adjustments`

### `TaskModel`

Current fields:

- `weekId`
- `title`
- `status`: `todo`, `doing`, or `done`
- `scheduledDate`
- timestamps

### `LeadMetricModel`

Current fields:

- `weekId`
- `name`
- `weeklyTarget`
- `logs[]`
- timestamps

Embedded `logs[]` fields:

- `date`
- `value`
- `completed`
- generated `_id`

## 3. Fields Currently Hydrated

Hydration is implemented mainly by `src/app/hooks/useBackendPlanHydration.ts` and `src/app/hooks/useBackendProgressOverlay.ts`.

### Goal and plan shell

Current hydration can populate:

- local `Goal.id` from an existing local goal, `Plan.smartGoalId`, related backend goal, or `backend_plan_<planId>`;
- local `Goal.category`, `title`, `description`, `deadline`, `focusArea`, `feasibilityResult`, `readinessScore`, and `createdAt` from `ApiGoal` when available;
- local goal onboarding `tasks[]` from backend `Goal.tasks[]`;
- `twelveWeekSystem.goalType` from backend goal `focusArea` or `category`, otherwise a backend-plan default;
- `vision12Week` from `Plan.vision`, backend goal description/title, or derived week 12 outcome;
- `startDate` from `Plan.startDate` or fallback timestamps;
- `endDate` from `startDate + totalWeeks * 7 - 1`;
- `totalWeeks` from the highest backend `Week.weekNumber`, clamped to 1-12;
- `status` from backend goal status.

### Weekly plans

Current hydration can populate:

- `weeklyPlans[].weekNumber` from backend weeks;
- `weeklyPlans[].focus` from `Week.focus`;
- `weeklyPlans[].milestone` from `Week.expectedOutput`;
- `weeklyPlans[].completed` from `Week.review` presence;
- `milestones.week4`, `week8`, and `week12` from week 4/8/12 expected output;
- fallback phase names from local helper logic.

### Lead indicators and tactic schedule

Current hydration derives lead indicators rather than restoring exact local tactic definitions:

- first choice: backend `LeadMetric.name` and `weeklyTarget`, excluding the synthetic daily check-in metric;
- fallback: task base titles;
- final fallback: one generic execution tactic.

Hydrated indicators get generated local IDs, `unit: "times/week"`, `type: "core"`, priority by order, target from inferred task count or rounded weekly target, and schedule inferred from task dates in the densest matching week.

### Task progress

Current hydration and overlay can populate:

- task `completed` from backend `Task.status === "done"`;
- task title/date matching through stored link maps, then title/date heuristics;
- task links through `backend_plan_links.taskIdByLocalTaskId`;
- task completion overlay from backend task status and completed metric logs.

The actual local `taskInstances` are generated/normalized from the hydrated system, then linked back to remote tasks by title/date matching.

### Daily check-ins

Current overlay can synthesize local daily check-ins from backend metric logs where the metric name is the daily check-in metric:

- `date` from metric log date;
- `didWorkToday` from `log.completed || log.value > 0`;
- `amountDone: "Check-in backend"`;
- default rating/mood/detail fields.

Existing local check-ins are preserved if present for the same date.

### Weekly reviews and scoreboard

Current hydration/overlay can populate:

- `biggestOutputThisWeek` from backend `Week.review.reflection`;
- `nextWeekPriority` from backend `Week.review.adjustments`;
- a coarse score from backend `executionScore`;
- `reviewCompleted` from backend review presence;
- `leadCompletionPercent` and `completedLeadIndicators` from local task completion;
- scoreboard rows derived from the local system, then overlaid with backend review output/score and metric summaries.

## 4. Fields Lost Or Not Round-Tripped

| Local field area | Backend support today | Hydration result | Gap |
| --- | --- | --- | --- |
| `templateId`, `templateName` | None | Lost/default absent | Premium/free template identity cannot be restored. |
| `goalType` | Partial via goal category/focus area | Approximate | Original setup selection can change. |
| `lagMetric.name/unit/target/currentValue` | No plan-level lag metric | Mostly default/inferred current value | Target/unit and original lag metric are not round-tripped. |
| `leadIndicators[].id` | None | Regenerated local IDs | Stable tactic identity is lost. |
| `leadIndicators[].target` | Partial via metric weeklyTarget or task count | Inferred | Non-numeric targets and original text can be lost. |
| `leadIndicators[].unit` | None | Defaults to `times/week` | Original unit is lost. |
| `leadIndicators[].type` | None | Defaults to `core` | Optional/core distinction is lost. |
| `leadIndicators[].priority` | None | Order-derived | Original priority is lost. |
| `leadIndicators[].schedule` | None | Inferred from task dates | Original preferred schedule is not guaranteed. |
| `successEvidence` | None | From plan vision/outcome | Original evidence text can be lost. |
| `reviewDay` | None | Defaults to Sunday | User-selected review day is lost. |
| `week12Outcome` | Partial via final expected output or vision | Approximate | Original outcome text can be altered. |
| `weeklyActions`, `successMetric` | None | Lost | Setup support copy is not restored. |
| `timezone`, `weekStartsOn` | None | Runtime/default values | Original device/calendar settings can drift. |
| `dailyReminderTime` | None | Defaults to `19:00` | User reminder preference is lost. |
| `tacticLoadPreference` | None | Defaults to `balanced` | Setup load preference is lost. |
| `preferredDays` | None | Lost | Preferred execution days are lost. |
| `personalConstraint` | None | Lost | Constraint copy is lost. |
| `reentryCount` | None | Defaults to `0` | Recovery history is lost. |
| `weeklyPlans[].phaseName` | None | Re-derived | Safe if phase logic stays stable. |
| `taskInstances[].id` | Link store only | Regenerated then mapped heuristically | Fresh browsers cannot recover stable local IDs. |
| `taskInstances[].leadIndicatorName` | Only implicit metric/task name | Inferred from generated tasks | Exact tactic binding can be wrong. |
| `taskInstances[].isCore` | None | Defaults via tactic generation | Optional task metadata is lost. |
| `taskInstances[].completedAt` | None | Lost | Completion timestamp is lost. |
| `taskInstances[].tacticId` | None | Lost | Task-to-tactic relationship is lost. |
| `taskInstances[].rescheduledFrom` | None | Lost | Reschedule history is lost. |
| `dailyCheckIns[].whichLeadIndicatorWorkedOn` | None | Empty string for synthetic rows | Daily tactic detail is lost. |
| `dailyCheckIns[].amountDone` | Metric value only | Synthetic text | User-entered amount text is lost. |
| `dailyCheckIns[].outputCreated` | None | Empty | Output detail is lost. |
| `dailyCheckIns[].obstacleOrIssue` | None | Empty | Obstacle detail is lost. |
| `dailyCheckIns[].dailySelfRating` | None | Defaults to `3` | Original rating is lost. |
| `dailyCheckIns[].optionalNote` | None | Empty | Free-form note is lost. |
| `dailyCheckIns[].mood` | None | Defaults to `steady` | Original mood is lost. |
| `weeklyReviews[].leadCompletionPercent` | Derived only | Recomputed from tasks | Stored local value is not authoritative. |
| `weeklyReviews[].lagProgressValue` | Metric summary only | Existing local preserved or metric summary | Original text can be lost on backend-only hydration. |
| `weeklyReviews[].mainObstacle` | None | Empty unless local already has it | Lost on backend-only hydration. |
| `weeklyReviews[].workloadDecision` | None | Empty unless local already has it | Lost on backend-only hydration. |
| `weeklyReviews[] score dimensions` | One `executionScore` only | Same score spread or local preserved | Per-dimension review scores are lost. |
| `weeklyReviews[].completedLeadIndicators` | Derived only | Recomputed | Original count is not stored. |
| `scoreboard` | Derived only | Rebuilt | Mostly acceptable, but manual local scoreboard corrections would be lost. |
| billing/paywall local state | Separate local/mock provider state | Not hydrated through plan | Should not be part of 12-week sync. |

## 5. Risks By Field Type

### Task `completedAt`

Risk level: high for audit/history, medium for basic MVP 2 execution.

Backend `TaskModel` stores only `status` and timestamps. `updatedAt` is not equivalent to `completedAt` because title/date edits also update it. On hydration, a completed task can be restored as done, but the completion timestamp is lost. This weakens progress timelines, streaks, daily review context, and conflict resolution.

### Daily check-in detail

Risk level: high.

Local daily check-ins include work detail, output, obstacle, self-rating, optional note, and mood. Backend currently represents daily check-ins as metric logs with `date`, `value`, and `completed`. Hydration creates synthetic records and fills detail fields with defaults. This is the largest user-visible data-loss gap because check-ins are part of the core execution loop.

### Weekly review dimensions

Risk level: high.

Local weekly reviews have multiple dimensions: progress, discipline, focus, improvement, output quality, obstacle, lag progress, workload decision, and completed lead indicators. Backend stores one `executionScore`, `reflection`, and `adjustments`. Hydration can restore a coarse review but loses the detailed review model needed for cross-device fidelity.

### Tactic schedule

Risk level: medium-high.

Local lead indicators carry `schedule`, `priority`, `type`, and `unit`. Backend stores week-scoped metric names and weekly targets only. Hydration infers schedule from task dates in the densest matching week. That may be good enough for display, but it is not a reliable round-trip contract for setup preferences or regenerated tasks.

### Optional/core task metadata

Risk level: medium-high.

Local tasks know `isCore`, `tacticId`, and `leadIndicatorName`. Backend tasks know title/status/date only. If optional tasks and core tasks share similar titles, hydration can misclassify importance. This directly affects "most important task" UI and any future plan quality scoring.

### Progress metrics

Risk level: medium.

Backend lead metrics can preserve metric names, weekly targets, and logs, but local `lagMetric`, scoreboard rows, and per-week metric summaries are derived or partially overlaid. This is acceptable for basic progress display but not enough for exact round-trip of setup success metrics and lag targets.

### Paywall/premium local-only state

Risk level: low for cloud sync, high if accidentally synced.

Local `templateId`, `templateName`, mock entitlements, subscription state, and paywall unlocks are not represented in backend plan hydration. MVP 2 should not use the 12-week sync API as a billing authority. Template identity may be useful as plan metadata, but entitlement/payment state should stay out of the 12-week workspace sync contract.

## 6. Smallest Schema Updates Recommended For MVP 2

The smallest safe MVP 2 update is not to store the whole `UserData` blob. Instead, extend the current backend 12-week entities with explicit sync fields and a small metadata payload where the backend is currently too thin.

### Shared sync fields

Add these across goal/plan/week/task/metric/check-in/review records where applicable:

- `clientId` per entity type, scoped by `userId`;
- `revision` or `version`;
- `lastSyncedAt`;
- `deletedAt` tombstone;
- `createdByClientId` or mutation metadata if needed for diagnostics.

### Plan-level metadata

Add a `Plan.metadata` subdocument or equivalent fields for:

- `goalType`
- `templateId`
- `templateName`
- `lagMetric`
- `leadIndicators[]` with `clientMetricId`, `name`, `target`, `unit`, `type`, `priority`, `schedule`
- `milestones`
- `successEvidence`
- `reviewDay`
- `week12Outcome`
- `weeklyActions`
- `successMetric`
- `endDate`
- `timezone`
- `weekStartsOn`
- `dailyReminderTime`
- `tacticLoadPreference`
- `preferredDays`
- `personalConstraint`
- `reentryCount`

This keeps current plan/week/task routes recognizable while preserving setup fidelity.

### Task metadata

Add fields to `TaskModel` or a `metadata` subdocument:

- `clientTaskId`
- `leadIndicatorName`
- `isCore`
- `completedAt`
- `tacticId`
- `rescheduledFrom`
- `weekNumber` if needed for robust imports before week IDs are known
- `deletedAt`

### Daily check-ins

Add a first-class daily check-in representation instead of relying only on metric logs:

- `clientCheckInId` or deterministic `(planId, localDate)` key
- `planId`
- `localDate`
- `didWorkToday`
- `whichLeadIndicatorWorkedOn`
- `amountDone`
- `outputCreated`
- `obstacleOrIssue`
- `dailySelfRating`
- `optionalNote`
- `mood`
- `revision`
- `deletedAt`

Metric logs can still be derived from check-ins for progress charts.

### Weekly reviews

Expand `Week.review` or move to a first-class review model with:

- `clientReviewId` or deterministic `(planId, weekNumber)` key
- `leadCompletionPercent`
- `lagProgressValue`
- `biggestOutputThisWeek`
- `mainObstacle`
- `nextWeekPriority`
- `workloadDecision`
- `reviewCompleted`
- `progressScore`
- `disciplineScore`
- `focusScore`
- `improvementScore`
- `outputQualityScore`
- `completedLeadIndicators`
- `executionScore` as a derived or compatibility field
- `revision`

### Lead metrics

Keep `LeadMetricModel`, but add:

- `clientMetricId`
- `planId` or stable plan-level relationship if metrics become plan-level tactics;
- `unit`
- `type`
- `priority`
- `schedule`
- deterministic log key for one log per metric/date where appropriate.

## 7. Proposed Round-Trip Tests

### Frontend mapper tests

Add unit coverage around backend-to-local and local-to-backend serializers once the MVP 2 serializers exist:

- full local `TwelveWeekSystem` fixture with template metadata, lag metric, lead indicators, tasks, check-ins, reviews, and scoreboard;
- serialize to backend payload;
- hydrate back to local;
- compare a normalized local snapshot for all fields expected to round-trip.

### Hydration regression tests

Add tests for current and future hydration behavior:

- backend-only plan restores a usable local system;
- task `completedAt` is preserved after schema support is added;
- `isCore`, `tacticId`, `leadIndicatorName`, and `rescheduledFrom` are preserved;
- lead indicator schedule and priority are preserved;
- daily check-in detail fields are preserved;
- weekly review per-dimension scores are preserved;
- legacy thin backend payload still hydrates with defaults.

### Conflict detector tests

Expand `backendConflictDetector` coverage after new fields exist:

- task completion timestamp differs;
- task tactic/core metadata differs;
- daily check-in detail differs on the same date;
- weekly review dimension differs;
- plan metadata/tactic schedule differs;
- backend has a tombstone while local still has active data.

### Backend tests

Add route/service tests when schema changes are implemented:

- create/import plan with full metadata;
- update task with `completedAt` and metadata;
- upsert daily check-in by plan/date idempotently;
- upsert weekly review by week id idempotently;
- reject cross-user access for client IDs scoped to another user;
- older thin payloads still validate where backwards compatibility is required.

## 8. Fields That Should Not Sync In MVP 2

Do not sync these through the 12-week workspace sync contract:

- `subscription`
- `entitlements`
- mock billing account/session state
- local paywall unlock state used only for the public demo
- `eventLog`
- analytics/debug payloads
- current analytics `syncOutbox`
- browser push subscription details unless a notification backend is explicitly designed
- email reminder schedule unless account notification settings are in scope
- `experimentAssignments`
- local migration prompt skip/dismiss state
- service worker/cache state
- local-only demo seed markers
- raw vision board media or files unless media sync is explicitly designed
- unrelated reflections/achievements unless MVP 2 expands beyond 12-week workspace sync

Template identity (`templateId`, `templateName`) is safe to sync as plan metadata. Entitlement/payment authority is not.

## 9. Suggested Implementation Order After This Audit

1. Define the sync contract and client IDs.
   - Decide exact client ID fields and uniqueness rules per `userId`.
   - Align with the data mutation queue and 12-week sync API specs.

2. Add backend schema fields in backwards-compatible form.
   - Prefer optional metadata fields and subdocuments first.
   - Do not require migrations before old data can still hydrate.

3. Add serializers before changing UI behavior.
   - Implement local-to-backend and backend-to-local mapping helpers with focused tests.
   - Keep current hydration defaults for old thin backend payloads.

4. Add daily check-in and weekly review round-trip support.
   - These are the highest user-data-loss areas.
   - Add idempotent upsert semantics by plan/date and plan/week.

5. Add task metadata preservation.
   - Preserve `completedAt`, `isCore`, `tacticId`, `leadIndicatorName`, and `rescheduledFrom`.
   - Add conflict checks for metadata that can affect user-visible priority.

6. Add plan/tactic metadata preservation.
   - Preserve lag metric, lead indicators, schedule, preferences, and constraints.
   - Keep scoreboard derived unless a future product decision requires manual scoreboard state.

7. Update hydration and overlay.
   - Hydration should materialize the chosen backend snapshot into local cache after conflict decisions.
   - Overlay should stay read-only/progressive and avoid masking persistent divergence.

8. Add migration/import flow.
   - Import anonymous local data only after explicit user confirmation.
   - Keep backups and return an import summary.

9. Roll out behind real-mode/account sync checks.
   - Demo mode remains local-only.
   - Do not block MVP 1 public demo on backend availability.
