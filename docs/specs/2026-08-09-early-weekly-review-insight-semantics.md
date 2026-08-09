# Feature: Early Weekly Review Insight Semantics

Status: Review
Risk: Medium
Delivery: Hybrid SDD/ADD, Standard specification depth
Base SHA: `3489a28ce0bb2bd511451c7058b55f7cbed78bf4`

## 1. Context & Goal

- Bug: Weekly Review V2 evaluates an active week with end-of-week task completion semantics.
- Why now: Users may choose `Bắt đầu review sớm` before the current week ends, while deterministic insights currently count future scheduled tasks in completion denominators.
- User impact: A user who completed every task due so far can receive premature warnings because unfinished future tasks are interpreted as missed execution.
- Modes affected: `real` and `demo`; the fix remains pure, local, and deterministic.

Product rule:

```text
future scheduled work != missed work
```

The Weekly Evidence Summary remains a factual whole-week ledger. Only the interpretation context becomes time-aware.

## 2. Surface Classification

- Type: `Mixed`.
- Core contract: deterministic date semantics, week-phase classification, task eligibility, and the meaning of completion metrics used by insight rules.
- Shell surface: none; Weekly Review layout, copy, evidence presentation, and interaction remain unchanged.
- Existing invariants that must not break:
  - `getWeeklyReviewEvidence().completion` remains completed tasks divided by all unskipped tasks scheduled for the reviewed week.
  - Canonical Weekly Review persistence, validation, mutation, and sync are untouched.
  - Insight IDs, copy library, severity, priority ordering, and positive-selection behavior remain unchanged unless a future-week result must be suppressed.
  - No backend, API, localStorage, schema, migration, network, billing, entitlement, or route change is allowed.

## 3. Actors & Entry Points

- Primary actor: a user opening or completing Weekly Review before the active week ends.
- Secondary actor: a user reading a completed historical review or viewing current execution insights on the Progress tab.
- Routes: `/12-week-system?tab=week`, legacy `?tab=review`, and `/12-week-system?tab=progress`.
- Main touchpoints:
  - `useTwelveWeekSystemSnapshot()`
  - `getExecutionInsights()`
  - `getWeeklyReflectionInsights()`
  - private execution insight aggregation and detection
  - `getWeeklyReviewEvidence()` as a preserved contract

## 4. Current Root Cause

The current snapshot builds a weekly view model with:

```ts
getWeeklyReflectionInsights(system, weekNumber, {
  todayDateKey: evidence.dateRange.end,
});
```

The execution insight aggregator then:

```text
selects every unskipped task in the reviewed week
counts completed / all selected tasks
uses that percentage for completion-dependent insight rules
```

`todayDateKey` currently affects only the previous-seven-day check-in window. It does not constrain task eligibility. Consequently, changing the caller to actual today without changing aggregation would not fix the denominator.

The same aggregate is used by the Progress tab. Although Progress already passes actual today, it still evaluates the entire current week's task denominator.

## 5. Time-Aware Insight Reference

The insight engine SHALL derive the reviewed week range with `getTwelveWeekWeekRange()` and classify it against the normalized input date.

| Reviewed week phase | Condition | Insight reference date | Task eligibility |
| --- | --- | --- | --- |
| Historical | `week.end < today` | `week.end` | all unskipped tasks in the week |
| Active | `week.start <= today <= week.end` | `today` | unskipped tasks where `scheduledDate <= today` |
| Future | `today < week.start` | `today` | none; suppress deterministic execution insights |

The derived reference date drives both task eligibility and the existing seven-day check-in window.

- A task scheduled exactly on the reference date is eligible.
- A task scheduled after the reference date is not eligible.
- Invalid or absent `todayDateKey` continues to fall back to local today through the existing normalizer.
- Historical weeks cap the reference at week end, preserving the reviewed week's check-in window rather than using the current calendar week.

## 6. Distinct Completion Metrics

The private aggregate SHALL use names that distinguish the two meanings:

```ts
fullWeekTaskCount: number;
fullWeekCompletionPercent: number | null;
executionToDateTaskCount: number;
executionToDateCompletionPercent: number | null;
executionToDateLeadCompletionPercent: number | null;
```

Semantics:

- `fullWeek*` uses all unskipped tasks assigned to the reviewed week.
- `executionToDate*` uses the eligible task set from Section 5.
- `executionToDateLeadCompletionPercent` uses eligible core tasks only.
- A zero-size eligible set returns `null`, not `0%`.
- Historical execution-to-date equals full-week completion because every task in the ended week is eligible.
- These metrics remain private derived data and do not change persisted scoreboard or review values.

The whole-week fields exist for semantic clarity and regression evidence only; deterministic execution judgements SHALL use the to-date fields.

## 7. Insight Rule Semantics

The following rules SHALL use `executionToDateCompletionPercent` for the reviewed active week:

- `overloaded_week`
- `task_completion_without_progress`
- `needs_scope_reduction`
- `progress_without_consistency`

Additional constraints:

- `overloaded_week` SHALL combine `executionToDateTaskCount` with `executionToDateCompletionPercent`. It SHALL NOT combine total future workload with a to-date completion rate.
- `needs_scope_reduction` SHALL use `executionToDateLeadCompletionPercent` when evaluating the active week, preventing future core tasks from lowering the lead denominator.
- Completion-dependent rules SHALL require a non-null eligible-task percentage. No warning may be derived from a zero-task denominator.
- Historical rule behavior remains whole-week behavior.
- Future reviewed weeks return no deterministic insights, preventing `overloaded_week`, `progress_without_consistency`, `consistency_dropping`, `review_missing`, `ready_to_push`, or other judgements from pre-start data.
- Active unfinished weeks SHALL NOT emit `consistency_dropping`, `consistency_improving`, or `ready_to_push` because `scoreboard.weeklyScore` is derived from full-week completion and is not comparable with a completed historical week.
- Historical weeks preserve existing `consistency_dropping`, `consistency_improving`, and `ready_to_push` behavior.
- `strong_lead_metric`, trend thresholds, copy, severity, priority ordering, cap of three, and warning/positive balancing remain otherwise unchanged.

## 8. Snapshot and Data Flow

Target flow:

```text
actual local today
  -> getWeeklyReflectionInsights(system, reviewedWeek, { todayDateKey })
  -> aggregate derives week range, phase, and bounded insight reference date
  -> aggregate derives full-week and execution-to-date metrics
  -> detectInsights uses coherent to-date metrics
  -> existing Weekly Review evidence/insight UI renders supplied values
```

- `useTwelveWeekSystemSnapshot()` SHALL pass the snapshot's actual normalized today key instead of the evidence range end.
- Phase and date bounding SHALL live in the insight logic, not in components.
- `getWeeklyReviewEvidence()` and its caller inputs remain unchanged.
- The Progress tab continues to call the shared engine with actual today and therefore receives due-to-date current-week semantics.

## 9. Functional Requirements

- `ERWI-01` - WHEN an active reviewed week contains future scheduled tasks, THE system SHALL exclude those tasks from completion-dependent insight denominators.
- `ERWI-02` - WHEN an active reviewed week contains a task scheduled today, THE system SHALL include that task in execution-to-date metrics.
- `ERWI-03` - WHERE an active reviewed week has no eligible tasks, THE system SHALL represent completion as `null` and SHALL NOT derive a completion warning from `0%`.
- `ERWI-04` - WHEN all due tasks are complete and future tasks are incomplete, THE system SHALL NOT derive `overloaded_week` or `progress_without_consistency` solely from the future tasks.
- `ERWI-05` - WHEN due tasks are genuinely under-completed, THE system SHALL continue to derive existing warnings when their remaining thresholds are met.
- `ERWI-06` - WHEN a reviewed week has ended, THE system SHALL evaluate all unskipped tasks in that week.
- `ERWI-07` - WHEN a reviewed week has not started, THE system SHALL return no deterministic insights for that week.
- `ERWI-08` - WHEN active-week overload is evaluated, THE system SHALL compare scheduled-so-far task count with scheduled-so-far completion.
- `ERWI-09` - WHEN active-week scope reduction is evaluated, THE system SHALL use due-to-date core completion rather than full-week core completion.
- `ERWI-10` - WHEN historical insights evaluate check-ins, THE system SHALL use the reviewed week end as the seven-day reference.
- `ERWI-11` - WHEN current Progress insights evaluate the active week, THE system SHALL use due-to-date task completion without changing insight copy or ordering.
- `ERWI-12` - THE system SHALL preserve whole-week Evidence Summary completion, including `4/10 = 40%` while active insight execution can be `4/4 = 100%`.
- `ERWI-13` - WHILE the reviewed week is active and unfinished, THE system SHALL suppress `consistency_dropping`, `consistency_improving`, and `ready_to_push` because their scoreboard inputs are not time-comparable.
- `ERWI-14` - WHEN the reviewed week is historical, THE system SHALL preserve existing scoreboard-based trend and readiness insights.

## 10. Required Regression Scenarios

### 10.1 Main early-review regression

```text
Week: Monday-Sunday
Today: Wednesday
Due tasks: 4/4 complete
Future tasks: 0/6 complete
Whole-week evidence: 4/10 = 40%
Execution-to-date: 4/4 = 100%
```

Expected: no `overloaded_week` or `progress_without_consistency` caused by future tasks.

### 10.2 Real misses

```text
Today: Wednesday
Due tasks: 1/4 complete
Future tasks: 0/6 complete
Execution-to-date: 25%
```

Expected: existing low-execution warnings may appear when their other thresholds are satisfied.

### 10.3 Date boundary

- `scheduledDate === today`: eligible.
- `scheduledDate > today`: excluded.

### 10.4 Historical week

```text
Ended week: 4/10 complete
Today: a later week
```

Expected: completion-dependent insights use `40%` and existing historical behavior remains available.

### 10.5 Future week

Expected: empty insight list, with no execution, consistency, review, or readiness judgement.

### 10.6 Progress tab

Expected: active-week Progress insights use due-to-date task semantics; historical behavior and the existing public insight contract otherwise remain stable.

### 10.7 Scoreboard trend comparability

- Active unfinished week: no `consistency_dropping`, `consistency_improving`, or `ready_to_push`, even when the current derived `weeklyScore` would satisfy their thresholds.
- Historical week: existing trend and readiness rules continue to use completed weekly scores.

## 11. Data, Storage, Sync, and Network Constraints

- localStorage keys/shapes touched: none.
- Migration or normalization needed: none.
- Backend models/API contracts touched: none.
- Canonical review fields or save behavior touched: none.
- Scoreboard persistence or derivation touched: none.
- Sync/outbox/mutation behavior touched: none.
- New fetch, polling, provider, analytics, or network work: none.
- Rollback: revert pure insight aggregation, snapshot caller, spec, plan, and focused tests; no user data repair is required.

## 12. Non-functional Requirements

- Determinism: date comparisons use existing calendar-date helpers and normalized `YYYY-MM-DD` keys.
- Time-zone safety: do not compare raw ISO timestamps with date keys or introduce UTC parsing for calendar-day eligibility.
- Performance: one bounded filter over at most the selected week's task instances; no additional snapshot scans outside the existing maximum of 12 weekly view models.
- Privacy: no task title, reflection, check-in note, or other free text enters insight output or metrics.
- Accessibility/UI: no visual or copy change is required.

## 13. Test Traceability

| Requirement | Automated evidence |
| --- | --- |
| `ERWI-01`, `ERWI-04`, `ERWI-08`, `ERWI-12` | Wednesday `4/4 due`, `4/10 whole week`; evidence remains 40%; no premature overload/progress warning |
| `ERWI-02` | today task included while tomorrow task is excluded |
| `ERWI-03` | no due tasks produces no completion-dependent warning |
| `ERWI-05` | Wednesday `1/4 due` yields 25% and can trigger valid low-execution warning |
| `ERWI-06`, `ERWI-10` | ended week uses all tasks and week-end reference |
| `ERWI-07` | next week returns no insights |
| `ERWI-09` | future core tasks do not false-trigger scope reduction |
| `ERWI-11` | `getExecutionInsights()` active-week regression uses due-to-date semantics |
| `ERWI-13` | active unfinished week suppresses score-based dropping, improving, and ready-to-push judgements |
| `ERWI-14` | historical week retains score-based trend and readiness behavior |

## 14. Verification Plan

TDD sequence:

```bash
npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts
```

Relevant integration:

```bash
npm run test:run -- src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
npm run test:ui -- src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx
```

Full verification:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

Any UI or sync failure must be reproduced against exact `BASE_SHA` before it is classified as an existing baseline failure. Backend verification is not required when the final diff proves `backend/` is untouched.

## 15. Out of Scope

- Weekly Review redesign or new questions
- confirmed next-week handoff
- evidence summary semantic changes
- canonical review persistence or sync
- task completion mutation behavior
- scoreboard persistence changes
- backend, API, storage, billing, auth, or network changes
- AI Coach, pet, gamification, or analytics platform work
- insight copy rewrite, psychological inference, or priority-library redesign

## 16. Acceptance Checklist

- [ ] Whole-week Evidence Summary completion remains unchanged.
- [ ] Active-week insights exclude future scheduled tasks from completion denominators.
- [ ] Tasks scheduled today are included.
- [ ] Zero eligible tasks are neutral, not `0%`.
- [ ] Real missed due tasks still support valid warnings.
- [ ] Historical weeks use all scheduled tasks and the reviewed week end.
- [ ] Future weeks return no deterministic insights.
- [ ] `overloaded_week` uses coherent scheduled-so-far count and completion.
- [ ] `progress_without_consistency` does not false-fire from future tasks.
- [ ] `needs_scope_reduction` does not false-fire from future core tasks.
- [ ] Progress current-week behavior is covered.
- [ ] Active unfinished weeks suppress score-based trend and readiness insights.
- [ ] Historical weeks preserve score-based trend and readiness insights.
- [ ] Insight copy, priority, cap, and positive-selection behavior remain stable.
- [ ] Weekly Review evidence UI and review UI remain unchanged.
- [ ] Backend, API, storage, canonical review, sync, and network behavior remain unchanged.
- [ ] Focused and full verification introduce no new regression.

## 17. Follow-up

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
