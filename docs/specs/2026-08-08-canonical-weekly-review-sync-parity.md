# Canonical Weekly Review Sync Parity

Status: Approved for implementation
Risk: High
Delivery: Hybrid SDD/ADD, Standard specification depth
Modes affected: `real` and local-first storage in both modes

## 1. Context And Goal

Weekly Review data is broader than the current backend persistence and pull contracts. The manual review form queues the complete local review, but the backend drops reflection arrays and tactic fields, while the Assistant owns a separate direct-write path that bypasses the mutation queue.

The goal is one non-React local-first commit authority that preserves a complete Weekly Review through local save, mutation queue, backend persistence, pull, and frontend hydration without changing the Weekly Review UI.

## 2. Surface Classification

- Type: `Core` persistence and sync contract with thin `Shell` adapters.
- Touched domains: localStorage, mutation queue, backend mutation handler, Mongo schema, import compatibility, pull DTO, hydration, manual review adapter, Assistant action.
- Existing invariants:
  - local save succeeds independently of backend availability;
  - mutation-sync mode does not also issue the legacy immediate REST write;
  - legacy direct sync remains available when mutation sync is disabled;
  - scoreboard behavior remains derived from tasks/check-ins/review completion;
  - Reflection Journal, toast, haptic, analytics, confetti, navigation, and React state stay outside the canonical persistence primitive;
  - no frontend storage-version bump or destructive migration.

## 3. Actors And Entry Points

- User submitting the manual Weekly Review in `useTwelveWeekExecutionActions`.
- Assistant executing `add_weekly_review` in `executeAction`.
- Signed-in device draining `weekly_review_upserted` mutations.
- A second device applying a full or delta workspace pull.

## 4. Canonical Review Contract

The canonical persisted review supports:

```text
weekNumber
leadCompletionPercent
executionScore
lagProgressValue
biggestOutputThisWeek
mainObstacle
nextWeekPriority
workloadDecision
reviewCompleted
lastReviewAt
commitmentsKept
commitmentsMissed
insights
nextWeekCommitments
keepTactic
reduceTactic
reflection
adjustments
progressScore
disciplineScore
focusScore
improvementScore
outputQualityScore
completedLeadIndicators
```

String arrays are normalized as follows:

```text
array only -> string items only -> trim -> remove blanks -> maximum 5 items
```

Legacy ratings remain optional compatibility data. They are not the authority for new-save execution score.

## 5. Current Round-Trip Matrix

| Field | Local | Queue | Handler | Mongo | Pull API | Apply |
| --- | --- | --- | --- | --- | --- | --- |
| `weekNumber` | yes | yes | yes | yes | yes | yes |
| `executionScore` | yes | yes | yes | yes | yes | no |
| `leadCompletionPercent` | yes | yes | yes | yes | yes | yes |
| `lagProgressValue` | yes | yes | yes | yes | yes | yes |
| `biggestOutputThisWeek` | yes | yes | yes | yes | yes | yes |
| `mainObstacle` | yes | yes | yes | yes | yes | yes |
| `nextWeekPriority` | yes | yes | yes | yes | yes | yes |
| `workloadDecision` | yes | yes | nested only | yes | yes | yes |
| `reviewCompleted` | yes | yes | yes | yes | yes | yes |
| `lastReviewAt` | yes | yes | no | no | no | no |
| `commitmentsKept` | yes | yes | no | no | no | no |
| `commitmentsMissed` | yes | yes | no | no | no | no |
| `insights` | yes | yes | no | no | no | no |
| `nextWeekCommitments` | yes | yes | no | no | no | no |
| `keepTactic` | yes | yes | no | no | no | no |
| `reduceTactic` | yes | yes | no | no | no | no |
| `reflection` | yes | yes | no | incorrectly derived from biggest output | yes | used only as biggest-output fallback |
| `adjustments` | yes | yes | no | incorrectly derived from next-week priority | yes | used only as priority fallback |
| rating fields | yes | yes | yes | yes | yes | yes |
| `completedLeadIndicators` | yes | yes | yes | yes | yes | yes |

## 6. Functional Requirements

- `WR-001` WHEN a caller commits a valid review, THE system SHALL read the latest persisted `UserData`, merge against the latest review for that goal/week, rebuild the derived scoreboard, save local authoritative state, and enqueue one logical `weekly_review_upserted` mutation.
- `WR-002` WHEN a review update omits a field, THE system SHALL preserve the latest persisted value for that field.
- `WR-003` WHEN a review update explicitly provides an empty string or empty string array, THE system SHALL persist that explicit clearing after normalization.
- `WR-004` WHEN the normalized review and optional lag metric do not differ from persisted state, THE system SHALL return `noop` and SHALL NOT enqueue another logical mutation.
- `WR-005` WHEN the target goal, system, or week does not exist, THE system SHALL return a structured `not_found` result without saving or queueing.
- `WR-006` WHEN localStorage persistence fails, THE system SHALL return `local_save_failed` and SHALL NOT enqueue a mutation.
- `WR-007` WHEN `lagMetricCurrentValue` is provided, THE system SHALL update `lagMetric.currentValue` in the same local save.
- `WR-008` WHEN a new frontend review is saved, THE system SHALL set `executionScore` to the reviewed week's overall non-skipped task completion percentage.
- `WR-009` WHERE an explicit valid `executionScore` is present, THE backend SHALL preserve it ahead of `leadCompletionPercent` and legacy rating-derived fallback.
- `WR-010` WHERE an old client omits explicit execution score, THE backend MAY derive it from `leadCompletionPercent`, then legacy ratings, then zero.
- `WR-011` WHEN a `weekly_review_upserted` payload carries fields at payload level or under `payload.review`, THE handler SHALL extract both shapes without requiring the new fields.
- `WR-012` WHEN string arrays reach the mutation handler, THE handler SHALL keep only trimmed non-blank strings and SHALL cap each array at five items.
- `WR-013` WHEN a canonical review is persisted, THE Mongo review document and pull DTO SHALL preserve every field in section 4 additively.
- `WR-014` WHEN frontend hydration receives canonical arrays, THE system SHALL restore them exactly after normalization.
- `WR-015` WHEN hydration receives no `insights` but receives legacy `reflection`, THE system SHALL use `reflection` as the `insights` fallback.
- `WR-016` WHEN hydration receives no canonical next-week commitments, THE system SHALL fall back first to `nextWeekPriority`, then to legacy `adjustments`.
- `WR-017` WHEN `biggestOutputThisWeek` is absent, THE system SHALL NOT synthesize it from `insights`.
- `WR-018` WHEN the Assistant writes a review, THE Assistant SHALL call the canonical commit and SHALL NOT directly mutate `system.weeklyReviews` or call `saveUserData()` for that review.
- `WR-019` WHEN the Assistant omits legacy ratings, THE system SHALL preserve existing ratings and SHALL NOT invent neutral rating values.
- `WR-020` WHILE mutation sync is enabled, THE manual adapter SHALL rely on the mutation queue and SHALL NOT issue the immediate legacy REST review update.
- `WR-021` WHILE mutation sync is disabled, THE existing legacy direct-sync fallback SHALL remain available after a successful local commit.
- `WR-022` WHEN manual review save succeeds, Reflection Journal projection and existing feedback behavior SHALL remain outside the canonical primitive and continue to run once.

## 7. Canonical Primitive

The implementation will add:

```ts
type WeeklyReviewCommitPatch = Pick<UniversalWeeklyReview, "weekNumber"> &
  Partial<Omit<UniversalWeeklyReview, "weekNumber">>;

commitTwelveWeekWeeklyReview({
  goalId,
  review,
  lagMetricCurrentValue?,
  now?,
})
```

Result states:

```text
applied
noop
not_found(goal | system | week)
local_save_failed
```

An `applied` result returns the merged review, updated system, and queue success metadata. A `noop` result returns the current review and system.

## 8. Execution Score Semantics

- `review.executionScore` and backend `executionScore`: overall scheduled non-skipped task completion percentage for the reviewed week.
- `scoreboard.weeklyScore`: existing behavioral composite.
- `scoreboard.leadCompletionPercent`: existing scoreboard core-task completion semantics.
- Legacy rating-derived execution score remains a compatibility fallback only.

Priority for backend compatibility:

```text
payload.executionScore
review.executionScore
review.leadCompletionPercent
legacy rating-derived fallback
0
```

## 9. Data And Migration

- Frontend localStorage shape already contains the canonical fields; no storage-version bump.
- Legacy rating fields become optional in TypeScript so Assistant-created reviews can omit them.
- Mongo fields are optional and additive.
- No migration script is required.
- Old Mongo documents remain valid.
- Existing indexes remain unchanged.

## 10. Error And Duplicate Handling

- Invalid week numbers are rejected locally as `not_found: week` and by the backend as validation failures.
- Queue failure does not roll back a successful local save; the result exposes `mutationEnqueued: false`.
- Exact normalized duplicates are no-ops before timestamp generation and queueing.
- Backend ownership failures preserve the existing `failed_not_found` / `ownership_denied` contract.

## 11. Out Of Scope

- Weekly Review V2 visual redesign.
- Auto Summary or deterministic insight UI.
- New reflection questions or handoff UI.
- Mobile sticky CTA, suggested-plan behavior, AI Coach, pet, gamification, charts, calendar, analytics redesign.

## 12. Acceptance And Verification

- Full canonical mutation payload persists every field.
- Nested and legacy payloads remain accepted.
- Invalid array items normalize safely.
- Explicit `executionScore = 20` wins over five ratings of `8`.
- Backend pull and frontend apply preserve canonical fields and legacy fallbacks.
- A two-device Week 4 scenario retains meaningful review data.
- Assistant queues one weekly-review mutation and preserves unspecified fields.
- Manual submit saves the review, keeps Reflection Journal behavior, updates scoreboard, and queues once.
- Old Mongo review documents without new fields validate successfully.
- Focused tests run before implementation and fail for the intended missing behavior.
- Final verification runs the required frontend and backend commands, with exact baseline blockers reported.

