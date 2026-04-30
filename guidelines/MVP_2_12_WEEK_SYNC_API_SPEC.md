# MVP 2 12-Week Sync API Spec

Last reviewed: 2026-04-30

Status: design/spec only. This document does not implement endpoints, change frontend code, change backend code, or add billing/payment scope.

This spec defines a backend API contract for MVP 2 account-based cloud sync of the 12-week workspace. It is designed to fit the current Express/Firebase/Mongo backend while closing the gaps documented in `MVP_2_CLOUD_SYNC_PLAN.md`, `SYNC_AUDIT.md`, and `TECH_DEBT_REGISTER.md`.

Existing backend routes are CRUD-oriented:

- `POST/GET/PATCH/DELETE /api/goals`
- `POST/GET/PATCH /api/plans`
- `GET /api/plans/:planId/weeks`
- `PATCH /api/weeks/:weekId`
- `POST /api/weeks/:weekId/review`
- `POST /api/weeks/:weekId/tasks`
- `PATCH/DELETE /api/tasks/:taskId`
- `GET/POST /api/weeks/:weekId/metrics`
- `POST/PATCH /api/metrics/:metricId/logs`

Those routes are useful but insufficient for reliable local-first sync because they do not provide client IDs, idempotency, revisions, tombstones, delta pull, or batch conflict responses.

## 1. Goals

1. Provide a reliable 12-week workspace sync contract for signed-in users.
2. Preserve local-first behavior: frontend saves to localStorage first, then syncs.
3. Support explicit local-to-account import without auto-importing anonymous data.
4. Add stable client IDs so backend records can be matched across devices and reloads.
5. Add idempotency so retrying queued mutations does not create duplicates.
6. Add revisions and conflict responses so backend data is not overwritten silently.
7. Add tombstones so deletes do not reappear during pull/restore.
8. Support partial success in batch mutation sync.
9. Keep MVP 2 focused on goals, plans, weeks, tasks, lead metrics, daily check-ins, and weekly reviews.
10. Be implementable in small backend prompts: model fields first, import endpoint, mutations endpoint, pull endpoint, status endpoint.

## 2. Non-Goals

- No real-time sync, websockets, or collaborative editing.
- No production billing/payment/entitlement API.
- No vision-board media sync.
- No social sharing or public plans.
- No AI coaching or generated sync decisions.
- No field-level merge UI requirement in the first backend implementation.
- No requirement that demo mode or signed-out mode call these endpoints.
- No guarantee that unsupported local fields are losslessly synced until model changes below are implemented.

## 3. Entities

All entities are owned by Firebase UID, stored as backend `userId`, and must be scoped by the authenticated user.

### Goal

Current backend: `GoalModel`.

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
- `tasks`
- `planId`
- timestamps

MVP 2 sync fields needed:

- `clientGoalId`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`

Local mapping:

- `Goal.id -> clientGoalId`
- `Goal.title -> title`
- `Goal.category -> category`
- `Goal.description -> description`
- `Goal.deadline -> deadline`
- `Goal.focusArea -> focusArea`
- `Goal.twelveWeekSystem -> plan/week/task/metric/check-in/review bundle`

### Plan

Current backend: `PlanModel`.

Current fields:

- `userId`
- `vision`
- `smartGoalId`
- `startDate`
- timestamps

MVP 2 sync fields needed:

- `clientPlanId`
- `clientGoalId`
- `totalWeeks`
- `endDate`
- `timezone`
- `weekStartsOn`
- `status`
- `goalType`
- `templateId`
- `templateName`
- `lagMetric`
- `leadIndicators`
- `milestones`
- `successEvidence`
- `reviewDay`
- `week12Outcome`
- `weeklyActions`
- `successMetric`
- `dailyReminderTime`
- `tacticLoadPreference`
- `preferredDays`
- `personalConstraint`
- `reentryCount`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`

Local mapping:

- `Goal.twelveWeekSystem.vision12Week -> Plan.vision`
- full `TwelveWeekSystem` metadata should live on `Plan` or a dedicated `PlanMetadata` subdocument.

### Week

Current backend: `WeekModel`.

Current fields:

- `planId`
- `weekNumber`
- `focus`
- `expectedOutput`
- embedded `review`
- timestamps

MVP 2 sync fields needed:

- `clientWeekId`
- `clientPlanId`
- `phaseName`
- `completed`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`

Local mapping:

- `weeklyPlans[].weekNumber -> weekNumber`
- `weeklyPlans[].focus -> focus`
- `weeklyPlans[].milestone -> expectedOutput`
- `weeklyPlans[].phaseName -> phaseName`
- `weeklyPlans[].completed -> completed`

### Task

Current backend: `TaskModel`.

Current fields:

- `weekId`
- `title`
- `status`
- `scheduledDate`
- timestamps

MVP 2 sync fields needed:

- `clientTaskId`
- `clientWeekId`
- `clientPlanId`
- `weekNumber`
- `leadIndicatorName`
- `isCore`
- `completedAt`
- `tacticId`
- `rescheduledFrom`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`

Local mapping:

- `taskInstances[].id -> clientTaskId`
- `completed true -> status "done"`
- `completed false -> status "todo"`

### Lead Metric

Current backend: `LeadMetricModel`.

Current fields:

- `weekId`
- `name`
- `weeklyTarget`
- embedded logs `{ date, value, completed }`
- timestamps

MVP 2 sync fields needed:

- `clientMetricId`
- `clientWeekId`
- `clientPlanId`
- `leadIndicatorId`
- `unit`
- `type`
- `priority`
- `schedule`
- logs with `clientLogId`, `localDate`, `source`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`

Local mapping:

- `leadIndicators[].id -> leadIndicatorId`
- deterministic metric key may be `clientPlanId + weekNumber + leadIndicatorId/name`.

### Daily Check-In

Current backend: no dedicated model. Current implementation maps daily check-ins to a synthetic lead metric log named `DAILY_CHECKIN_METRIC_NAME`.

MVP 2 recommendation: add dedicated `DailyCheckInModel`.

Fields:

- `userId`
- `planId`
- `clientPlanId`
- `goalId`
- `clientGoalId`
- `weekNumber`
- `localDate`
- `didWorkToday`
- `whichLeadIndicatorWorkedOn`
- `amountDone`
- `outputCreated`
- `obstacleOrIssue`
- `dailySelfRating`
- `optionalNote`
- `mood`
- `clientCheckInId`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`
- timestamps

Unique index:

- `{ userId: 1, clientPlanId: 1, localDate: 1 }`

Local mapping:

- `dailyCheckIns[].date` normalized to `localDate`.
- Keep rich local fields; do not reduce cloud record to boolean metric log if claiming complete restore.

### Weekly Review

Current backend: embedded `Week.review` and unused `WeekReviewModel`.

MVP 2 recommendation: either expand embedded review or use dedicated `WeekReviewModel`. For sync clarity, prefer dedicated model with unique review per user/plan/week.

Fields:

- `userId`
- `planId`
- `clientPlanId`
- `weekId`
- `clientWeekId`
- `weekNumber`
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
- `clientReviewId`
- `revision`
- `deletedAt`
- `lastMutationId`
- `syncUpdatedAt`
- timestamps

Unique index:

- `{ userId: 1, clientPlanId: 1, weekNumber: 1 }`

Local mapping:

- `weeklyReviews[].weekNumber -> weekNumber`
- preserve local score breakdown; current backend `executionScore` alone is not enough.

## 4. Client IDs

Client IDs are required for idempotent upsert, import, pull, and cross-device mapping.

Required IDs:

- `clientGoalId`
- `clientPlanId`
- `clientWeekId`
- `clientTaskId`
- `clientMetricId`

Additional recommended IDs:

- `clientCheckInId`
- `clientReviewId`
- `clientMetricLogId`

Rules:

- Client IDs are opaque strings generated by frontend and stable for the life of a local entity.
- Backend must scope uniqueness by `userId`, not globally.
- Unique indexes should use `{ userId, clientXId }`.
- For weeks, backend may accept either explicit `clientWeekId` or deterministic key `{ clientPlanId, weekNumber }`. Prefer explicit `clientWeekId` plus unique `{ userId, clientPlanId, weekNumber }`.
- For daily check-ins, unique identity is `{ userId, clientPlanId, localDate }`.
- For weekly reviews, unique identity is `{ userId, clientPlanId, weekNumber }`.
- Backend responses must always include both backend `id` and `client*Id`.

Example ID policy:

```json
{
  "clientGoalId": "goal_1714440000000_ab12cd",
  "clientPlanId": "plan_goal_1714440000000_ab12cd_v1",
  "clientWeekId": "week_plan_goal_1714440000000_ab12cd_v1_01",
  "clientTaskId": "task_1714441111111_ef34gh",
  "clientMetricId": "metric_plan_goal_1714440000000_ab12cd_v1_week01_deep_work"
}
```

## 5. Idempotency

Every write endpoint must support:

- `mutationId`
- `idempotencyKey`

Definitions:

- `mutationId`: frontend-generated local mutation ID from data mutation queue.
- `idempotencyKey`: stable key unique per user/device/mutation, for example `<firebaseUid>:<deviceId>:<mutationId>`.

Rules:

- Backend stores processed `idempotencyKey` values with response summary.
- Retrying the same idempotency key returns the original per-mutation result without applying side effects again.
- Same `idempotencyKey` with different payload hash returns `409 idempotency_conflict`.
- Import endpoint should use one request-level idempotency key and per-entity mutation IDs.
- Mutations endpoint should accept per-mutation idempotency keys.

Recommended backend model:

```ts
SyncMutationLog {
  userId: string;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
  status: "applied" | "conflict" | "failed";
  result: unknown;
  createdAt: Date;
  updatedAt: Date;
}
```

Unique index:

- `{ userId: 1, idempotencyKey: 1 }`

## 6. Revision Model

Every synced entity should include:

- `revision`: positive integer, starts at `1`.
- `syncUpdatedAt`: ISO datetime controlled by backend.
- `lastMutationId`: latest mutation that changed the entity.
- `deletedAt`: nullable tombstone timestamp.

Write rule:

- Client sends `baseRevision` for each entity it intends to update.
- If `baseRevision` equals current backend revision, apply update and increment revision.
- If `baseRevision` is missing during import and entity does not exist, create it.
- If `baseRevision` is stale and fields differ, return conflict.
- If `baseRevision` is stale but payload is identical to current server state, return applied/noop with current revision.

Pull rule:

- `GET /api/sync/12-week/pull?cursor=` returns entities changed after cursor.
- Cursor should be opaque, not a raw timestamp contract. Internally it can encode last `syncUpdatedAt` plus tie-breaker id.

## 7. Tombstone/Delete Model

MVP 2 should avoid hard deletes for synced entities.

Tombstone fields:

- `deletedAt`
- `deletedByMutationId`
- `deleteReason?: "user_delete" | "plan_reset" | "reentry" | "cleanup"`

Rules:

- Delete mutations set `deletedAt`, increment revision, and keep client ID.
- Pull includes tombstones so other devices remove/archive local records.
- Import should not revive a tombstoned backend entity unless explicitly sent with `restore: true`.
- Hard delete can be a later retention job after a safe window, for example 90 days.

Applies to:

- goal
- plan
- week
- task
- lead metric
- metric log if modeled separately
- daily check-in
- weekly review

## 8. Proposed Endpoints

All endpoints are protected by existing Firebase `authMiddleware`.

Base route group:

```text
/api/sync/12-week
```

Response wrapper should follow existing backend convention:

```json
{
  "success": true,
  "data": {}
}
```

Error wrapper should follow existing convention:

```json
{
  "success": false,
  "message": "Validation failed.",
  "details": {}
}
```

### POST /api/sync/12-week/import

Purpose: explicit local-to-account import of one or more complete local 12-week workspaces after user confirmation.

Use cases:

- first account import from archived anonymous local data;
- recovery import from exported local backup;
- creating the initial cloud state for a clean backend account.

Request:

```json
{
  "requestId": "import_1714440000000_ab12cd",
  "idempotencyKey": "firebaseUid:device_1:import_1714440000000_ab12cd",
  "source": "anonymous_local_import",
  "clientGeneratedAt": "2026-04-30T03:00:00.000Z",
  "mode": "create_or_conflict",
  "workspace": {
    "goals": [
      {
        "clientGoalId": "goal_local_1",
        "title": "Launch portfolio",
        "category": "Career",
        "description": "Ship a focused 12-week goal.",
        "deadline": "2026-07-22",
        "status": "active",
        "focusArea": "Career",
        "readinessScore": 16,
        "plan": {
          "clientPlanId": "plan_local_1",
          "vision": "A clear 12-week execution plan.",
          "startDate": "2026-04-30",
          "endDate": "2026-07-22",
          "timezone": "Asia/Ho_Chi_Minh",
          "weekStartsOn": "Monday",
          "totalWeeks": 12,
          "leadIndicators": [
            {
              "id": "lead_1",
              "name": "Deep work",
              "target": "3",
              "unit": "sessions/week",
              "type": "core",
              "priority": 1,
              "schedule": [1, 3, 5]
            }
          ],
          "weeks": [
            {
              "clientWeekId": "week_plan_local_1_1",
              "weekNumber": 1,
              "phaseName": "Foundation",
              "focus": "Clarify output",
              "expectedOutput": "Draft shipped",
              "completed": false
            }
          ],
          "tasks": [
            {
              "clientTaskId": "task_local_1",
              "clientWeekId": "week_plan_local_1_1",
              "weekNumber": 1,
              "title": "Draft case study",
              "status": "todo",
              "scheduledDate": "2026-05-01",
              "leadIndicatorName": "Deep work",
              "isCore": true
            }
          ],
          "leadMetrics": [
            {
              "clientMetricId": "metric_local_1",
              "clientWeekId": "week_plan_local_1_1",
              "weekNumber": 1,
              "name": "Deep work",
              "weeklyTarget": 3,
              "unit": "sessions/week"
            }
          ],
          "dailyCheckIns": [
            {
              "clientCheckInId": "checkin_plan_local_1_2026-05-01",
              "localDate": "2026-05-01",
              "weekNumber": 1,
              "didWorkToday": true,
              "whichLeadIndicatorWorkedOn": "Deep work",
              "amountDone": "90 minutes",
              "outputCreated": "Draft outline",
              "obstacleOrIssue": "",
              "dailySelfRating": 4,
              "optionalNote": "",
              "mood": "steady"
            }
          ],
          "weeklyReviews": [
            {
              "clientReviewId": "review_plan_local_1_week_1",
              "weekNumber": 1,
              "leadCompletionPercent": 75,
              "lagProgressValue": "1/12",
              "biggestOutputThisWeek": "Draft outline",
              "mainObstacle": "Context switching",
              "nextWeekPriority": "Finish first draft",
              "workloadDecision": "keep same",
              "reviewCompleted": true,
              "progressScore": 7,
              "disciplineScore": 8,
              "focusScore": 7,
              "improvementScore": 7,
              "outputQualityScore": 8
            }
          ]
        }
      }
    ]
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "requestId": "import_1714440000000_ab12cd",
    "status": "applied",
    "cursor": "sync_cursor_001",
    "summary": {
      "created": 6,
      "updated": 0,
      "skipped": 0,
      "conflicts": 0,
      "failed": 0
    },
    "links": {
      "goals": [{ "clientGoalId": "goal_local_1", "id": "662f..." }],
      "plans": [{ "clientPlanId": "plan_local_1", "id": "6630..." }],
      "weeks": [{ "clientWeekId": "week_plan_local_1_1", "id": "6631...", "weekNumber": 1 }],
      "tasks": [{ "clientTaskId": "task_local_1", "id": "6632..." }],
      "leadMetrics": [{ "clientMetricId": "metric_local_1", "id": "6633..." }],
      "dailyCheckIns": [{ "clientCheckInId": "checkin_plan_local_1_2026-05-01", "id": "6634..." }],
      "weeklyReviews": [{ "clientReviewId": "review_plan_local_1_week_1", "id": "6635..." }]
    },
    "conflicts": [],
    "errors": []
  }
}
```

Conflict response:

```json
{
  "success": true,
  "data": {
    "requestId": "import_1714440000000_ab12cd",
    "status": "conflict",
    "cursor": "sync_cursor_001",
    "summary": {
      "created": 0,
      "updated": 0,
      "skipped": 1,
      "conflicts": 1,
      "failed": 0
    },
    "links": {},
    "conflicts": [
      {
        "mutationId": "import_1714440000000_ab12cd",
        "entityType": "plan",
        "clientId": "plan_local_1",
        "serverId": "6630...",
        "reason": "remote_exists_with_different_content",
        "fieldConflicts": [
          {
            "field": "vision",
            "localValue": "A clear 12-week execution plan.",
            "remoteValue": "Existing remote plan vision.",
            "remoteRevision": 4
          }
        ],
        "resolutionOptions": ["keep_remote", "overwrite_remote", "create_copy"]
      }
    ],
    "errors": []
  }
}
```

### POST /api/sync/12-week/mutations

Purpose: apply queued local data mutations after local-first saves.

Supported mutation kinds:

- `plan_snapshot_upsert`
- `week_upsert`
- `task_upsert`
- `task_delete`
- `lead_metric_upsert`
- `metric_log_upsert`
- `daily_checkin_upsert`
- `weekly_review_upsert`

Request:

```json
{
  "batchId": "batch_1714442222222_qwerty",
  "clientGeneratedAt": "2026-04-30T03:10:00.000Z",
  "mutations": [
    {
      "mutationId": "dmq_1714442222222_a1",
      "idempotencyKey": "firebaseUid:device_1:dmq_1714442222222_a1",
      "kind": "task_upsert",
      "entity": {
        "clientGoalId": "goal_local_1",
        "clientPlanId": "plan_local_1",
        "clientWeekId": "week_plan_local_1_1",
        "clientTaskId": "task_local_1"
      },
      "baseRevision": 2,
      "payload": {
        "weekNumber": 1,
        "title": "Draft case study",
        "status": "done",
        "scheduledDate": "2026-05-01",
        "completedAt": "2026-05-01T10:20:00.000Z",
        "leadIndicatorName": "Deep work",
        "isCore": true
      }
    },
    {
      "mutationId": "dmq_1714442222222_a2",
      "idempotencyKey": "firebaseUid:device_1:dmq_1714442222222_a2",
      "kind": "daily_checkin_upsert",
      "entity": {
        "clientGoalId": "goal_local_1",
        "clientPlanId": "plan_local_1",
        "clientCheckInId": "checkin_plan_local_1_2026-05-01"
      },
      "baseRevision": 1,
      "payload": {
        "localDate": "2026-05-01",
        "weekNumber": 1,
        "didWorkToday": true,
        "whichLeadIndicatorWorkedOn": "Deep work",
        "amountDone": "90 minutes",
        "outputCreated": "Draft outline",
        "obstacleOrIssue": "",
        "dailySelfRating": 4,
        "optionalNote": "",
        "mood": "steady"
      }
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "batchId": "batch_1714442222222_qwerty",
    "status": "partial",
    "cursor": "sync_cursor_002",
    "results": [
      {
        "mutationId": "dmq_1714442222222_a1",
        "status": "applied",
        "entityType": "task",
        "clientId": "task_local_1",
        "serverId": "6632...",
        "revision": 3,
        "syncUpdatedAt": "2026-04-30T03:10:01.000Z"
      },
      {
        "mutationId": "dmq_1714442222222_a2",
        "status": "conflict",
        "entityType": "daily_checkin",
        "clientId": "checkin_plan_local_1_2026-05-01",
        "serverId": "6634...",
        "revision": 2,
        "conflict": {
          "reason": "stale_revision",
          "fieldConflicts": [
            {
              "field": "didWorkToday",
              "localValue": true,
              "remoteValue": false,
              "remoteRevision": 2
            }
          ],
          "resolutionOptions": ["keep_remote", "overwrite_remote"]
        }
      }
    ],
    "summary": {
      "applied": 1,
      "noop": 0,
      "conflicts": 1,
      "failed": 0
    }
  }
}
```

### GET /api/sync/12-week/pull?cursor=

Purpose: return all changed 12-week workspace entities for the authenticated account since the cursor.

Initial full pull:

```text
GET /api/sync/12-week/pull
```

Delta pull:

```text
GET /api/sync/12-week/pull?cursor=sync_cursor_002
```

Response:

```json
{
  "success": true,
  "data": {
    "cursor": "sync_cursor_003",
    "hasMore": false,
    "serverTime": "2026-04-30T03:20:00.000Z",
    "changes": {
      "goals": [
        {
          "id": "662f...",
          "clientGoalId": "goal_local_1",
          "revision": 3,
          "syncUpdatedAt": "2026-04-30T03:10:01.000Z",
          "deletedAt": null,
          "title": "Launch portfolio",
          "category": "Career",
          "description": "Ship a focused 12-week goal.",
          "deadline": "2026-07-22",
          "status": "active",
          "focusArea": "Career"
        }
      ],
      "plans": [],
      "weeks": [],
      "tasks": [],
      "leadMetrics": [],
      "dailyCheckIns": [],
      "weeklyReviews": []
    },
    "tombstones": {
      "goals": [],
      "plans": [],
      "weeks": [],
      "tasks": [
        {
          "id": "6632...",
          "clientTaskId": "task_deleted_1",
          "revision": 4,
          "deletedAt": "2026-04-30T03:15:00.000Z"
        }
      ],
      "leadMetrics": [],
      "dailyCheckIns": [],
      "weeklyReviews": []
    }
  }
}
```

Rules:

- Pull returns only authenticated user's data.
- Pull returns both active changes and tombstones.
- Pull cursor is opaque.
- If cursor is invalid/expired, return `400 invalid_cursor` with instruction to do full pull.
- Full pull should be paginated if payload is large.

### GET /api/sync/12-week/status

Purpose: lightweight account sync status for UI and diagnostics.

Response:

```json
{
  "success": true,
  "data": {
    "userId": "firebase_uid",
    "serverTime": "2026-04-30T03:25:00.000Z",
    "workspace": {
      "goalCount": 1,
      "planCount": 1,
      "taskCount": 36,
      "dailyCheckInCount": 4,
      "weeklyReviewCount": 1,
      "tombstoneCount": 2
    },
    "sync": {
      "latestCursor": "sync_cursor_003",
      "latestMutationAt": "2026-04-30T03:10:01.000Z",
      "latestImportAt": "2026-04-30T03:00:00.000Z",
      "pendingServerConflicts": 0
    }
  }
}
```

## 9. Request/Response Examples

### Successful Mutation Noop Due To Idempotency

```json
{
  "mutationId": "dmq_1714442222222_a1",
  "status": "noop",
  "reason": "idempotency_replay",
  "entityType": "task",
  "clientId": "task_local_1",
  "serverId": "6632...",
  "revision": 3
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "details": {
    "errors": [
      {
        "path": "mutations[0].payload.status",
        "code": "invalid_enum",
        "message": "status must be one of: todo, doing, done."
      }
    ]
  }
}
```

### Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Payload Too Large

```json
{
  "success": false,
  "message": "Payload too large.",
  "details": {
    "maxBytes": 524288,
    "actualBytes": 743912
  }
}
```

## 10. Validation Rules

Global:

- Body must be JSON object.
- Reject unknown top-level fields unless explicitly documented.
- `requestId`, `batchId`, `mutationId`, and `idempotencyKey` must be non-empty strings.
- Date strings must be ISO date or date-only strings where documented.
- `weekNumber` must be integer `1..12`.
- `totalWeeks` must be integer `1..12`.
- Text fields should be trimmed.
- Text field length limits should be explicit:
  - title/name: 1..200 chars;
  - description/vision/review text: max 5000 chars;
  - optional note/detail fields: max 3000 chars.
- Arrays must have upper bounds:
  - goals per import: max 10;
  - weeks per plan: max 12;
  - tasks per plan import: max 240;
  - lead metrics per plan: max 60;
  - check-ins per plan import: max 366;
  - weekly reviews per plan: max 12;
  - mutations per batch: max 100.

Entity validation:

- `clientGoalId`, `clientPlanId`, `clientWeekId`, `clientTaskId`, `clientMetricId` must be stable opaque strings, max 120 chars.
- Goal deadline must be valid date.
- Plan timezone must be valid IANA timezone if backend can validate; otherwise accept string and normalize later.
- `weekStartsOn` must be `"Monday"` or `"Sunday"`.
- Task status must be `"todo"`, `"doing"`, or `"done"`.
- `dailySelfRating` must be integer `1..5` or `0..5` if existing frontend allows empty/zero.
- Weekly review score fields must be `0..10`; `leadCompletionPercent` must be `0..100`.
- `workloadDecision` must be `"keep same"`, `"reduce slightly"`, `"increase slightly"`, or empty string.

## 11. Ownership Rules

- All sync endpoints require Firebase auth.
- Backend must use `req.user.uid` as `userId`; never trust user ID from request body.
- Any body `userId`, `firebaseUid`, `email`, or role fields must be ignored or rejected.
- Upsert lookup must always include `userId`.
- Server IDs passed by client are optional hints and must be ownership-checked before use.
- Client IDs are unique only within one authenticated user.
- Cross-user records should return existing service convention:
  - `403` when a record exists but belongs to another user and that fact is known through an ownership check;
  - `404` is acceptable where hiding existence is preferred, but choose one convention per endpoint and test it.
- Import from anonymous local data must still write under authenticated `userId` only after explicit user confirmation in frontend.

## 12. Conflict Response Shape

Conflict item:

```ts
type SyncConflict = {
  mutationId?: string;
  entityType:
    | "goal"
    | "plan"
    | "week"
    | "task"
    | "lead_metric"
    | "metric_log"
    | "daily_checkin"
    | "weekly_review";
  clientId: string;
  serverId?: string;
  reason:
    | "stale_revision"
    | "remote_deleted"
    | "remote_exists_with_different_content"
    | "idempotency_conflict"
    | "missing_parent"
    | "ownership_mismatch";
  localRevision?: number;
  remoteRevision?: number;
  fieldConflicts: Array<{
    field: string;
    localValue: unknown;
    remoteValue: unknown;
    remoteRevision: number;
  }>;
  serverSnapshot?: unknown;
  resolutionOptions: Array<"keep_remote" | "overwrite_remote" | "create_copy" | "restore_deleted">;
};
```

Rules:

- Conflict responses use HTTP 200 for batch partial success where the request itself was valid.
- Use HTTP 409 only when the entire request cannot proceed because of request-level idempotency conflict or invalid import mode.
- Frontend must not retry `blocked_conflict` mutations automatically.
- Conflict response should include enough server snapshot data for the UI to explain the choice.

## 13. Payload Size Limits

Recommended limits:

- `POST /api/sync/12-week/import`: max 512 KB compressed JSON body for MVP 2 beta.
- `POST /api/sync/12-week/mutations`: max 256 KB body.
- `GET /api/sync/12-week/pull`: max 500 changed records or 512 KB response before `hasMore: true`.
- Max mutation batch count: 100.
- Max import goals: 10.
- Max total task records in one import: 240.

If payload exceeds limit:

- return HTTP 413;
- include `maxBytes` and `actualBytes` when available;
- frontend should split import/mutation batches where safe.

## 14. Partial Success Strategy

Import endpoint:

- Default `mode: "create_or_conflict"`.
- If any entity conflicts, do not silently overwrite it.
- Non-conflicting entities may be created if their parents are valid.
- Response status can be:
  - `applied`
  - `partial`
  - `conflict`
  - `failed`

Mutations endpoint:

- Process mutations in order.
- Stop processing dependent child mutations when parent fails/conflicts.
- Independent mutations can continue.
- Return per-mutation status:
  - `applied`
  - `noop`
  - `conflict`
  - `failed_validation`
  - `failed_dependency`
  - `failed_not_found`
- Do not wrap a partial batch in HTTP 500 unless the server itself crashed.

Atomicity:

- For one plan import, prefer Mongo transaction if deployment supports it.
- If no transaction, implement compensating cleanup or mark partial result clearly.
- Never return success for a plan import that created a plan but failed every week.

## 15. Backend Model Changes Needed

Minimum additions:

- Add sync metadata to `GoalModel`, `PlanModel`, `WeekModel`, `TaskModel`, and `LeadMetricModel`:
  - client ID field;
  - `revision`;
  - `deletedAt`;
  - `lastMutationId`;
  - `syncUpdatedAt`.
- Add unique indexes by `userId + clientId` where `userId` exists.
- For week/task/metric where current models do not store `userId`, either:
  - denormalize `userId` onto each model for sync indexing; or
  - enforce uniqueness through parent plan ownership and compound parent/client keys.
- Add `DailyCheckInModel`.
- Expand or replace `WeekReviewModel` for full local review fields.
- Add `SyncMutationLogModel` for idempotency.
- Add optional `SyncCursor` or use change collection query based on `syncUpdatedAt`.
- Add plan metadata fields required for full `TwelveWeekSystem` restore.

Recommended indexes:

```text
Goal: { userId: 1, clientGoalId: 1 } unique sparse
Plan: { userId: 1, clientPlanId: 1 } unique sparse
Plan: { userId: 1, clientGoalId: 1 }
Week: { planId: 1, weekNumber: 1 } unique
Week: { userId: 1, clientWeekId: 1 } unique sparse
Task: { userId: 1, clientTaskId: 1 } unique sparse
LeadMetric: { userId: 1, clientMetricId: 1 } unique sparse
DailyCheckIn: { userId: 1, clientPlanId: 1, localDate: 1 } unique
WeekReview: { userId: 1, clientPlanId: 1, weekNumber: 1 } unique
SyncMutationLog: { userId: 1, idempotencyKey: 1 } unique
All syncable models: { userId: 1, syncUpdatedAt: 1, _id: 1 }
```

## 16. Frontend Changes Needed

Required before using endpoints:

- Generate stable `clientGoalId`, `clientPlanId`, `clientWeekId`, `clientTaskId`, and `clientMetricId`.
- Keep existing local IDs stable; map them directly to client IDs where possible.
- Add sidecar data mutation queue or equivalent durable queue.
- Send `mutationId` and `idempotencyKey` with every write.
- Track `revision` and `syncUpdatedAt` per entity, either in local records or sidecar sync metadata.
- Store backend links returned from import/mutations.
- Stop using title/date matching as primary task identity once backend client IDs exist.
- Add local-to-account import flow that calls import only after explicit user confirmation.
- Treat conflicts as blocked queue items requiring review.
- Pull cloud changes after login/profile bootstrap before showing account workspace as fully synced.
- Keep demo mode and signed-out mode local-only.

Compatibility:

- Do not change `USER_DATA_STORAGE_KEY` just to support sync metadata.
- If adding local sync metadata to `UserData`, include migration tests.
- Existing `syncOutbox` should remain analytics/event outbox, not data mutation queue.

## 17. Test Plan

Backend unit/service tests:

- Import creates goal/plan/weeks/tasks/metrics/check-ins/reviews under authenticated user.
- Import rejects missing client IDs.
- Import rejects invalid week/task/review payloads with 400.
- Import is idempotent for same idempotency key and same payload.
- Import returns 409 for same idempotency key and different payload.
- Mutations endpoint applies task upsert and increments revision.
- Mutations endpoint detects stale revision and returns conflict.
- Mutations endpoint tombstones task delete.
- Mutations endpoint blocks child mutation when parent plan/week is missing.
- Pull returns only authenticated user's records.
- Pull includes tombstones.
- Status returns counts only for authenticated user.
- Cross-user client/server IDs cannot update another account's data.

Backend route/integration tests:

- Missing bearer token returns 401.
- Invalid Firebase auth is rejected by existing middleware.
- Invalid ObjectId hints return 400 where server ID is used.
- Bad payload returns 400 with details.
- Payload too large returns 413.
- Partial batch returns HTTP 200 with per-mutation failures.
- Conflict batch returns HTTP 200 with `status: "partial"` or `status: "conflict"`.

Frontend integration tests after implementation:

- Local task toggle saves local first, enqueues mutation, mutation applies once.
- Offline daily check-in survives refresh and drains after reconnect.
- Weekly review overwrite collapses queue and syncs final state.
- Anonymous data does not import automatically after login.
- Explicit import creates account records and keeps anonymous backup until success.
- Second device pulls account workspace and materializes local cache.
- Conflict pauses sync and exposes keep-local/use-cloud decision.

End-to-end tests:

- Device A imports local 12-week workspace; Device B signs in and pulls it.
- Device A completes task offline; Device B edits same task online; Device A reconnects and receives conflict.
- Delete task on one device; other device receives tombstone and does not recreate it from stale local data.

## 18. Rollout Plan

Phase 0: approve spec.

- Confirm entity model, client ID policy, idempotency policy, revision policy, and endpoint response shapes.

Phase 1: add backend model fields and idempotency log.

- Add client IDs, revisions, tombstones, sync timestamps, and indexes.
- Add migration-safe defaults for existing records.
- No frontend behavior change yet.

Phase 2: implement pull/status read-only endpoints.

- Add `GET /api/sync/12-week/status`.
- Add full `GET /api/sync/12-week/pull`.
- Use existing backend records to return best-effort workspace shape.

Phase 3: implement import endpoint.

- Add `POST /api/sync/12-week/import`.
- Start with one goal + one plan bundle.
- Add idempotency and ownership tests.

Phase 4: implement mutation endpoint.

- Add `POST /api/sync/12-week/mutations`.
- Start with task upsert, daily check-in upsert, weekly review upsert.
- Add plan snapshot update after basic mutation reliability is proven.

Phase 5: wire frontend behind guarded real mode.

- Enable only when Firebase, backend profile, and queue storage are ready.
- Keep local-first save path.
- Keep demo mode fully local.

Phase 6: internal beta.

- Test with internal accounts and multi-browser scenarios.
- Monitor duplicates, conflicts, partial imports, and queue failures.
- Keep export backup and rollback path.

Phase 7: public MVP 2 release.

- Only claim cloud sync when import, mutation replay, pull, conflict blocking, and account isolation tests pass.
- Do not introduce billing/payment dependency into the sync release.
