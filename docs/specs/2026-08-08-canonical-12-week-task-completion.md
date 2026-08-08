# Canonical 12-Week Task Completion

## 1. Context & Goal

- Feature / bug: Today and GoalTracker implement separate mutation authorities for `TwelveWeekTaskInstance.completed`.
- Why now: Daily Home V2 must reuse a trustworthy task-completion contract instead of adding a third implementation.
- User impact: complete/reopen remains instant and local-first while every surface creates the same task and lead-metric mutations.
- Modes affected: both `real` and `demo`; protected remote sync remains real-mode only.

## 2. Surface Classification

- Type: `Core` data mutation with `Shell` feedback adapters.
- Specification depth: Standard.
- Touched domains: auth-scoped localStorage, 12-week task state, mutation queue, lead metrics, legacy direct sync rollback, surface feedback.
- Existing invariants that must not break:
  - local persistence happens before network work;
  - mutation-sync failures do not roll back local progress;
  - legacy direct-sync failure rolls back only the attempted task when the persisted state still matches that attempt;
  - no backend DTO, endpoint, schema, storage key, or stored shape changes;
  - simple-goal tasks keep their current GoalTracker behavior.

## 3. Actors & Entry Points

- Primary actor: a person completing or reopening a 12-week task.
- Entry points:
  - `/12-week-system?tab=today` through `useTwelveWeekExecutionActions.handleToggleTask`;
  - `/goals` through `GoalTracker.handleToggleTask`;
  - future Dashboard/Home through the exported canonical contract.
- API / hook / store touchpoints:
  - `src/app/utils/storage.ts`;
  - `src/features/plan12week/persistence/mutationQueue.ts`;
  - `src/features/plan12week/persistence/leadMetricMutation.ts`;
  - `src/features/plan12week/hooks/usePlanExecutionSync.ts`.

## 4. Current Behavior Matrix

| Behavior | Today | GoalTracker | Ownership after change |
| --- | --- | --- | --- |
| local save | `commitSystemUpdate` | `toggleTwelveWeekTask` | canonical core |
| optimistic UI | Today component | GoalTracker local view state | surface |
| `completedAt` / `lastModifiedAt` | yes | yes | canonical core |
| task mutation | yes | no | canonical core |
| lead-metric mutation | yes | no | canonical core |
| mutation-sync scheduling | queue/provider | data-update event only | existing sync layer |
| legacy direct sync | yes | no | Today adapter, unchanged |
| legacy rollback | yes | no | canonical rollback primitive + Today adapter |
| analytics | `today_task_completed` | none | surface |
| toast/sound/celebration | Today layers | GoalTracker layer | one surface sequence |
| progress recompute | derived scoreboard | derived scoreboard + goal progress | canonical core + surface display |

Domain side effects are local persistence, timestamps, derived scoreboard, task mutation, lead-metric mutation, and conditional rollback. Toasts, sound, haptics, confetti, sparkles, pet events, and analytics are surface side effects.

## 5. Functional Requirements

1. **CTC-001** — WHEN a surface requests a task state different from the latest persisted state, THE system SHALL persist the new `completed`, `completedAt`, and `lastModifiedAt` values before starting remote sync.
2. **CTC-002** — WHEN a task is completed, THE system SHALL set `completedAt` to the same action timestamp used for `lastModifiedAt`.
3. **CTC-003** — WHEN a task is reopened, THE system SHALL clear `completedAt` and update `lastModifiedAt`.
4. **CTC-004** — WHEN local persistence succeeds, THE system SHALL enqueue one logical `task_completed_changed` mutation and the applicable `lead_metric_upserted` mutation(s).
5. **CTC-005** — WHEN queue persistence fails, THE system SHALL keep the local task change authoritative and return queue status to the caller without throwing away progress.
6. **CTC-006** — WHEN the requested state already matches the latest persisted task, THE system SHALL return `noop` without another local write, task mutation, lead-metric mutation, analytics event, or success feedback.
7. **CTC-007** — WHILE mutation-sync architecture is enabled, THE system SHALL not wait for REST or roll back local state because the remote drain fails.
8. **CTC-008** — WHILE legacy direct sync is active, THE Today adapter SHALL preserve its direct-sync call and restore the previous task snapshot only when the persisted task still matches the failed attempt.
9. **CTC-009** — WHEN a rollback is applied, THE system SHALL restore the previous `completed`, `completedAt`, and `lastModifiedAt` values and enqueue the resulting task and lead-metric mutations.
10. **CTC-010** — WHEN an applied result reaches a surface, THE surface SHALL emit at most one coherent success-feedback sequence; `noop` SHALL emit none.
11. **CTC-011** — WHERE a GoalTracker task belongs to `goal.tasks` rather than `goal.twelveWeekSystem.taskInstances`, THE existing standard-goal behavior SHALL remain unchanged.
12. **CTC-012** — THE canonical core SHALL be importable without a React page or hook so future Daily Home can reuse it.

## 6. Canonical Contract

The reusable module owns synchronous local-first commit and queue sidecars:

```ts
commitTwelveWeekTaskCompletion({ goalId, taskId, completed, now })
  -> applied | noop | not_found | local_save_failed
```

An applied result includes the previous task, updated task, updated system, task-mutation queue status, and lead-metric mutation count. A matching rollback primitive restores the previous task snapshot for the legacy Today path.

Network orchestration remains outside the persistence primitive because GoalTracker may display multiple goals and does not own a per-goal `usePlanExecutionSync` instance. Today keeps its existing mutation-sync versus legacy direct-sync policy. UI feedback and analytics remain outside the core module.

## 7. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: existing auth-scoped `UserData` and existing mutation queue only.
- Migration or normalization needed: none.
- Backend models or API contracts touched: none.
- Sync ordering: local write -> task mutation -> lead-metric mutation -> existing drain/direct-sync behavior.
- Queue collapse: repeated pending mutations for the same task/metric retain the latest logical state.
- Duplicate guard: the canonical primitive reads latest persisted state and treats a repeated identical request as `noop`.
- Rollback: compare current persisted state with the failed attempted state before restoring the previous snapshot.

## 8. Non-functional Requirements

- Performance: local commit remains synchronous and does not wait for network.
- Reliability: queue failure is observable in the structured result but does not invalidate local success.
- Request volume: no new immediate plan refresh and no additional backend request path.
- Security/privacy: no new logging of task content, UID, email, or mutation payload.
- Accessibility/UI: no layout or visual-style changes.

## 9. Out of Scope

- Daily Home V2 or Dashboard completion UI.
- Weekly review, billing, auth, backend routes, schema, rate limits, AI, pet, or design-system changes.
- Canonicalizing standard-goal tasks.
- Changing analytics semantics beyond preventing duplicate emission for a no-op.

## 10. Acceptance Criteria & Traceability

- [x] `CTC-001`–`CTC-004`: core tests cover complete/reopen timestamps, persistence, task mutation, and lead-metric mutation.
- [x] `CTC-005`: queue-write failure test proves local state survives.
- [x] `CTC-006`: duplicate/rapid same-state test proves one logical mutation and no second applied result.
- [x] `CTC-007`: Today mutation-queue integration keeps local state on async sync failure.
- [x] `CTC-008`–`CTC-009`: rollback unit/integration coverage preserves prior timestamps and newer peer changes.
- [x] `CTC-010`: focused surface test proves one observable success-feedback sequence.
- [x] `CTC-011`: GoalTracker standard-goal regression remains green.
- [x] `CTC-012`: Today and GoalTracker import the same non-React canonical module.

## 11. Verification Plan

```bash
npm run test:ui -- src/app/pages/GoalTracker.multi-tab.test.tsx src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
npm run test:sync -- src/features/plan12week/persistence/taskCompletionMutation.test.ts src/features/plan12week/persistence/mutationQueue.test.ts src/features/plan12week/persistence/leadMetricMutation.test.ts
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run typecheck
npm run lint
npm run test:run
npm run test:sync
npm run test:ops
npm run build
```

Manual local checks are attempted only with test/demo data. Production credentials and production user data are out of scope.

## 12. Open Questions / Follow-ups

- No blocking questions. The user-provided task already approves the Core/Shell split and explicitly defers Daily Home V2.
- Follow-up: Daily Home V2 imports the canonical module instead of copying Today or GoalTracker internals.
