# MVP 2 Round-Trip Sync Report

Last updated: 2026-05-02

## Overview

This report documents the round-trip sync test results for the MVP 2 cloud sync path:

```
Browser A (local) → createTwelveWeekImportPayload → backend (echo) → pull workspace → applyPulledWorkspaceToUserData → Browser B (reconstructed)
```

The test suite is at `src/features/plan12week/persistence/roundTripSync.test.ts` and runs as a pure Vitest unit test — no browser context, no backend, no credentials required.

## Test Results

**28 tests, all passing.**

| Suite | Tests | Status |
|-------|-------|--------|
| Core task state | 7 | ✅ All pass |
| Daily check-in | 4 | ✅ All pass |
| Weekly review | 3 | ✅ All pass |
| Goal identity and plan metadata | 5 | ✅ All pass |
| Lead indicator round-trip via lead metrics | 3 | ✅ All pass |
| Known field gaps generate warnings | 3 | ✅ All pass |
| User isolation | 1 | ✅ All pass |
| Non-sync fields are not leaked | 1 | ✅ All pass |
| **Total** | **28** | ✅ |

## Fields That Round-Trip Successfully

### Task state (all preserved)

- `id` (clientTaskId)
- `weekNumber`
- `title`
- `scheduledDate`
- `completed`
- `completedAt`
- `leadIndicatorName`
- `isCore`
- `tacticId`
- `rescheduledFrom`

### Daily check-in (all preserved)

- `date`
- `didWorkToday`
- `whichLeadIndicatorWorkedOn`
- `amountDone`
- `outputCreated`
- `obstacleOrIssue`
- `dailySelfRating`
- `optionalNote`
- `mood`

### Weekly review (all preserved)

- `weekNumber`
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
- `leadCompletionPercent`
- `lagProgressValue`
- `completedLeadIndicators`

### Goal identity (all preserved)

- `id` (clientGoalId)
- `title`
- `category`
- `description`
- `deadline`

### Plan metadata (partially preserved)

- `vision12Week` ✅
- `startDate` ✅
- Week `focus` and `milestone`/`expectedOutput` ✅

### Lead indicators (reconstructed from lead metrics)

- `name` ✅
- `unit` ✅
- `type` ✅
- `priority` ✅
- `schedule` ✅
- `id` — regenerated from metric `leadIndicatorId`, may differ from original
- `target` — inferred from `weeklyTarget`, may lose original text format

## Known Field Gaps

These fields are **not round-tripped** by design in the current pull v1 implementation. The test suite explicitly detects and warns about them — they are never silently passed.

### Medium severity

| Field | Reason |
|-------|--------|
| `lagMetric` | Pull v1 does not return plan-level lag metric metadata. Defaults to lead indicator name. |
| `leadIndicators` | Pull v1 returns week-level metrics, not the original lead indicator setup. Reconstructed from metrics or tasks. |
| `milestones` | Pull v1 returns weekly expectedOutput, not the original milestones object. |
| `endDate` | Pull v1 does not return endDate. Defaults to empty. |

### Low severity

| Field | Reason |
|-------|--------|
| `templateId` | Pull v1 does not return template identity. |
| `templateName` | Pull v1 does not return template identity. |
| `successEvidence` | Pull v1 does not return setup evidence text. |
| `reviewDay` | Defaults to Sunday. |
| `week12Outcome` | Derived from last week milestone or goal title. |
| `weeklyActions` | Legacy setup action list not returned. |
| `successMetric` | Setup success metric not returned. |
| `timezone` | Defaults to Asia/Ho_Chi_Minh. |
| `weekStartsOn` | Defaults to Monday. |
| `dailyReminderTime` | Local reminder preference not returned. |
| `tacticLoadPreference` | Defaults to balanced. |
| `preferredDays` | Preferred execution days not returned. |
| `personalConstraint` | Personal constraint not returned. |
| `reentryCount` | Defaults to 0. |
| `scoreboard` | Derived from tasks/reviews, not stored directly. |
| `weeklyPlans[].phaseName` | Re-derived from week number. |
| `goalType` | Inferred from goal focusArea/category. |

### Not gaps (by design)

These fields are **intentionally not synced**:

- `subscription`, `entitlements`, billing state
- `eventLog`, `syncOutbox`, analytics data
- `pushSubscription`, `emailReminderSchedule`
- `experimentAssignments`
- Local migration/demo markers

## Behavioral Observations

### `getTotalWeeks` clamps to 12

`pulledWorkspaceApply.ts` always clamps `totalWeeks` to `Math.min(Math.max(maxWeek, 12), 12) = 12`. A 2-week original system reconstructs to 12 weeks on Browser B. This is acceptable for the current product model (12-week year), but means short plans get padded with empty weeks.

### `normalizeGoal` generates additional tasks

The apply path calls `normalizeGoal` which generates task instances from lead indicators for all 12 weeks. This means Browser B will have more tasks than Browser A's original count. The original tasks are preserved with correct state; additional tasks are generated from the reconstructed lead indicators.

### Merge report detects gaps

`createPulledWorkspaceMergeReport` correctly flags unsupported fields as `unsupportedFields` entries when comparing original local data against the pulled workspace. This ensures field loss is visible and auditable, not silently accepted.

## User Isolation

The test confirms that pulling a cloud workspace for one goal does not modify or overwrite unrelated local goals on Browser B. Each goal is matched by `clientGoalId`.

## How to Run

```bash
npx vitest run src/features/plan12week/persistence/roundTripSync.test.ts
```

No environment variables, backend, or credentials required.

## Relationship to Other Tests

| Test file | Scope |
|-----------|-------|
| `twelveWeekImportPayload.test.ts` | Serializer: local → import payload |
| `pulledWorkspaceApply.test.ts` | Apply: pulled workspace → local |
| `pulledWorkspaceMergeReport.test.ts` | Merge report: local vs cloud comparison |
| **`roundTripSync.test.ts`** | **Full round-trip: local → serialize → echo → apply → compare** |
| `backendConflictDetector.test.ts` | Conflict detection for concurrent edits |
