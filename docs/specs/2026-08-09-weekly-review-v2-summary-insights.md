# Feature: Weekly Review V2 - Auto Summary + Deterministic Insights

Status: Review
Risk: Medium
Delivery: Hybrid SDD/ADD, Standard specification depth
Base SHA: `7fe04145b9a672bfd89063cdbd4b32f90aef3133`

## 1. Context & Goal

- Feature: Prepare factual weekly evidence and deterministic insights before asking the user to reflect.
- Why now: Canonical Weekly Review persistence and sync parity are merged, while the Week surface still asks users to reconstruct facts that already exist in the local snapshot.
- User impact: A user opening Weekly Review can understand completion, core/optional balance, unresolved work, check-in coverage, and week-over-week movement before typing reflection text.
- Modes affected: `real` and `demo`; all data remains local-snapshot derived in both modes.

Product principle:

```text
EVIDENCE - What happened?
INSIGHTS - What stands out?
REFLECTION - What did it mean?
```

## 2. Surface Classification

- Type: `Mixed`.
- Core contract: canonical review persistence, review field schema, localStorage shapes, sync/outbox behavior, backend DTOs, route availability, and save validation.
- Shell surface: evidence presentation, deterministic insight presentation, review information hierarchy, responsive layout, and accessibility labels.
- Existing invariants that must not break:
  - `commitTwelveWeekWeeklyReview()` remains the only manual Weekly Review commit path.
  - Local save still occurs before best-effort remote sync.
  - Existing review fields and validation remain unchanged.
  - Existing Premium insight entitlement behavior remains unchanged.
  - No backend, API, MongoDB, localStorage schema, migration, or network-fetch change is allowed.

## 3. Actors & Entry Points

- Primary actor: a user reviewing the current week or reading a completed historical review.
- Routes: `/12-week-system?tab=week` and the existing legacy `?tab=review` alias.
- Main component path:
  - `useTwelveWeekSystemSnapshot`
  - `TwelveWeekSystemTabs`
  - `TwelveWeekWeekTab`
  - `WeeklyReviewForm` or `WeeklyReviewSummary`
- Existing domain sources:
  - `TwelveWeekSystem.taskInstances`
  - `TwelveWeekSystem.dailyCheckIns`
  - `TwelveWeekSystem.weeklyReviews`
  - `getWeekTaskBreakdown()`
  - `getTwelveWeekWeekRange()`
  - `getWeeklyReflectionInsights()`

## 4. Current and Target Hierarchy

### Before

```text
Rescue nudge
Week rail
Review context hero + score/lag
Review heading
Step progress
Emotion Flow
Execution score repeated
Premium insight panel
Previous commitment classification
Human reflection textarea
Next-week commitments
Readiness + save CTA
```

Completed review:

```text
Header/status
Score + lag
Score interpretation
Tactic rows
Previous/next commitments
Human reflection
Edit action
Next-week recommendation
```

### After

```text
Rescue nudge
Week rail
Review heading/context
Auto Weekly Evidence Summary
Deterministic Insights
Previous commitment classification
Human reflection textarea
Next-week commitments
Readiness + existing save CTA
Emotion Flow + Premium panel as secondary detail
```

Completed review:

```text
Header/status
Shared Auto Weekly Evidence Summary
Shared Deterministic Insights
Saved human reflection and commitments
Existing tactic/score detail as secondary content
Existing edit and next-week actions
```

Rescue and week navigation remain available, but no rescue, rail, Premium, or Emotion content may appear between the review heading and its evidence summary.

## 5. Evidence Model

Introduce a pure, testable weekly review evidence derivation with this conceptual contract:

```ts
interface WeeklyReviewEvidence {
  weekNumber: number;
  totalWeeks: number;
  dateRange: { start: string; end: string };
  completion: WeeklyReviewRatio & { isEmpty: boolean };
  core: WeeklyReviewRatio | null;
  optional: WeeklyReviewRatio | null;
  checkIns: { days: number; possibleDays: number };
  overdueOpenCount: number;
  carryOverCount: number;
  onTime: { completed: number; total: number } | null;
  previousWeek: (WeeklyReviewRatio & { deltaPoints: number }) | null;
}
```

The exact type names may follow repository conventions, but the semantics below are fixed.

### 5.1 Overall, core, and optional completion

- Source: unskipped task instances for the reviewed `weekNumber`.
- Shared helper: `getWeekTaskBreakdown()`.
- Numerator: tasks with `completed === true`.
- Denominator: scheduled, unskipped tasks in the same category.
- Percentage: `Math.round(completed / total * 100)`.
- When overall denominator is zero, evidence is empty and the UI shows `Tuần này chưa có việc được lên lịch.` rather than `0%`.
- When only core or optional denominator is zero, that category shows a neutral `Chưa lên lịch` state and no percentage.

### 5.2 Check-in days

- Source: `dailyCheckIns` whose normalized calendar date belongs to the reviewed week range.
- Same-date entries count once, including same-day edit history.
- `possibleDays` is the inclusive number of calendar days in the reviewed week range, normally `7`.
- Zero check-ins render neutral copy: `Chưa có check-in tuần này`.
- Check-in evidence must not infer motivation, discipline, stress, or consistency.

### 5.3 Overdue open work

- Source: uncompleted, unskipped tasks still assigned to the reviewed week.
- A task is overdue only when `scheduledDate` is before the normalized local reference date.
- A task scheduled for the reference date is not overdue.
- Historical reviewed weeks therefore include unresolved tasks that remain assigned to that past week.

### 5.4 Carry-over

- Source: task instances moved to a later week where `rescheduledFrom` belongs to the reviewed week range.
- A same-week reschedule is not carry-over.
- Carry-over and overdue-open counts remain separate when both are present.
- If the UI needs one compact sentence, it may use factual wording such as `3 việc chưa hoàn thành từ lịch trước` without claiming why they were missed.

### 5.5 On-time completion

- Numerator: completed tasks with a valid `completedAt` calendar date on or before `scheduledDate`.
- Denominator: completed tasks in the reviewed week.
- The metric is rendered only when at least one task is completed and every completed task has a valid `completedAt` calendar date.
- If legacy or incomplete data makes the metric ambiguous, `onTime` is `null` and the UI omits it.
- Raw ISO strings must not be compared directly with `YYYY-MM-DD`; existing calendar-date normalization helpers are required.

### 5.6 Previous-week comparison

- Source: direct task-instance completion for week `N - 1`, using the same overall completion semantics as week `N`.
- Do not use `scoreboard.weeklyScore` as task completion.
- `deltaPoints = currentPercent - previousPercent`.
- Copy uses `điểm`, for example `72% -> 81% = +9 điểm`.
- Week 1 has no comparison.
- A previous week with no scheduled tasks has no comparison.
- A current no-task week has no comparison.

## 6. Derivation and Data Flow

Preferred architecture:

```text
pure getWeeklyReviewEvidence(system, weekNumber, referenceDate)
  -> useTwelveWeekSystemSnapshot memoizes week-scoped review view models
  -> TwelveWeekSystemTabs forwards the collection
  -> TwelveWeekWeekTab selects the active reviewed week
  -> Weekly evidence/insight components render only supplied data
```

- The snapshot may derive at most `totalWeeks` small view models while the Week tab is active.
- Presentation components must not read localStorage, call `getUserData()`, issue network requests, or scan raw system history independently.
- Current and completed-review views must consume the same evidence object for the same week.
- The existing `_weeklyReflectionInsights` dead prop is replaced by a meaningful week-scoped review view-model prop.

## 7. Deterministic Insight Model

- Primary source: `getWeeklyReflectionInsights()` and its existing `ExecutionInsight` contract.
- The helper remains deterministic, local-only, network-free, and free of user free-text interpolation.
- The reviewed week range end is supplied as the insight context date so seven-day check-in evidence aligns with that reviewed week rather than the current calendar week.
- Existing priority ordering remains the starting order.
- At most three insights render.
- If the highest-ranked three candidates are warnings and a trustworthy positive candidate exists, the final slot uses the highest-ranked positive candidate.
- No artificial positive item is created when none exists.
- A no-task week renders a neutral evidence state and does not render completion-dependent insights.
- Insight UI must render textual semantics in addition to icon/color.
- Forbidden inference includes motivation, discipline, procrastination timing, stress, personality, and morning-versus-evening performance.

The PR does not introduce AI interpretation or a new generalized insight engine. Strongest/weakest tactic and repeated-miss enhancements are deferred unless required to fix an existing helper contract uncovered by tests.

## 8. Functional Requirements

- `WRV2-EV-01` - WHEN a user opens a reviewable week, THE system SHALL show the reviewed week number and date range before reflection inputs.
- `WRV2-EV-02` - WHEN the reviewed week has tasks, THE system SHALL show factual overall completed/total and rounded completion percentage.
- `WRV2-EV-03` - WHEN core or optional tasks exist, THE system SHALL show their completed/total and percentage using `getWeekTaskBreakdown()` semantics.
- `WRV2-EV-04` - WHERE a task category has no scheduled tasks, THE system SHALL show a neutral category state without a fake `0%` or `100%` signal.
- `WRV2-EV-05` - WHEN multiple check-in entries share one calendar date, THE system SHALL count that date once.
- `WRV2-EV-06` - WHERE the reviewed week has no check-ins, THE system SHALL show neutral no-check-in copy.
- `WRV2-EV-07` - WHEN unresolved work is scheduled before the local reference date, THE system SHALL count it as overdue; work scheduled on the reference date SHALL NOT be overdue.
- `WRV2-EV-08` - WHEN a task was moved from the reviewed week into a later week, THE system SHALL count it as carry-over rather than overdue work still assigned to the reviewed week.
- `WRV2-EV-09` - WHERE completed task timestamps are complete and valid, THE system SHALL show on-time completed/total; otherwise it SHALL omit the metric.
- `WRV2-EV-10` - WHEN both current and previous weeks contain tasks, THE system SHALL compare their direct task completion percentages and label the difference in percentage points.
- `WRV2-EV-11` - WHERE the reviewed week is week 1 or the previous week has no tasks, THE system SHALL omit the previous-week comparison.
- `WRV2-EV-12` - WHERE the reviewed week has no scheduled tasks, THE system SHALL show `Tuần này chưa có việc được lên lịch.` and SHALL NOT render `0%` as a failure signal.
- `WRV2-IN-01` - WHEN Weekly Review is rendered with deterministic insights, THE system SHALL visibly render the supplied `weeklyReflectionInsights` before the human reflection workflow.
- `WRV2-IN-02` - THE system SHALL render no more than three deterministic insights.
- `WRV2-IN-03` - WHERE all first-ranked items are warnings and a positive candidate exists, THE system SHALL include the highest-ranked positive candidate without inventing positivity.
- `WRV2-IN-04` - THE system SHALL NOT generate psychological or time-of-day interpretations.
- `WRV2-HI-01` - WHEN the review form is open, THE system SHALL order review context, evidence, insights, reflection workflow, next-week commitment workflow, and save action in that sequence.
- `WRV2-HI-02` - WHEN a completed review is opened, THE system SHALL show the same factual evidence semantics without requiring resubmission.
- `WRV2-HI-03` - THE system SHALL preserve Emotion Flow, Premium insight, rescue, week navigation, review inputs, readiness validation, mobile sticky CTA behavior, and save behavior.
- `WRV2-AC-01` - AT a 390px viewport, THE system SHALL avoid horizontal overflow and keep grouped metrics readable in one or two columns.
- `WRV2-AC-02` - THE system SHALL expose evidence through text labels and values, not color or progress bars alone.

## 9. Data, Storage, Sync, and Network Constraints

- localStorage keys/shapes touched: none.
- Migration or normalization needed: none.
- Backend models/API contracts touched: none.
- Sync ordering changes: none.
- Review mutation changes: none.
- `commitTwelveWeekWeeklyReview()` changes: none.
- Assistant review action changes: none.
- New frontend fetch/polling/analytics requests: none.
- Rollback: revert presentation, pure helper, snapshot, and focused test changes; no user data repair is required.

## 10. Non-functional Requirements

- Performance: evidence and insights are memoized from the active local snapshot; a maximum of 12 weekly view models is acceptable.
- Accessibility: logical heading order, text labels for all metrics, non-color insight semantics, visible keyboard focus inherited from existing controls.
- Responsiveness: one grouped evidence container; no collection of equally weighted mini-dashboard cards.
- Security/privacy: no free-text reflection or check-in note is interpolated into deterministic insight copy or analytics.
- Observability: no new logging or analytics event is required.

## 11. Test Traceability

| Requirement | Focused automated evidence |
| --- | --- |
| `WRV2-EV-02` | `17/21 -> 81%` derivation test |
| `WRV2-EV-03`, `WRV2-EV-04` | core/optional numerator, denominator, and empty-category tests |
| `WRV2-EV-05`, `WRV2-EV-06` | duplicate-date and no-check-in tests |
| `WRV2-EV-07`, `WRV2-EV-08` | true overdue, today-not-overdue, and carry-over tests |
| `WRV2-EV-09` | valid on-time and missing-`completedAt` omission tests |
| `WRV2-EV-10`, `WRV2-EV-11` | `72 -> 81 = +9`, `81 -> 70 = -11`, week-1, and no-previous-task tests |
| `WRV2-EV-12` | no-task UI test proving no misleading `0%` |
| `WRV2-IN-01` | Week tab prop/integration test proving insight headline/body render |
| `WRV2-IN-02`, `WRV2-IN-03` | cap and warning/positive selection tests |
| `WRV2-HI-01` | DOM order test: evidence and insights precede reflection controls |
| `WRV2-HI-02` | completed-review evidence visibility test |
| `WRV2-HI-03` | existing form reachability, save, Premium, Emotion, rail, and sticky CTA regression tests |
| `WRV2-AC-01`, `WRV2-AC-02` | responsive browser QA plus structure/class/accessibility assertions |

## 12. Manual QA

Viewports:

- `1440x900`
- `390x844`

Scenarios:

- normal week
- week 1
- no tasks
- no check-ins
- previous-week improvement
- previous-week decline
- completed review
- overdue open work
- carry-over work

Checks:

- evidence is visible immediately after review context
- deterministic insights appear before the reflection textarea
- no duplicate overall score block competes with the evidence summary
- basic evidence is never paywalled
- Premium and Emotion content remain available as secondary detail
- no horizontal overflow at 390px
- completed review uses identical metric semantics

## 13. Verification Plan

Focused RED/GREEN tests run first, followed by:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

Backend verification is not required when `git diff` confirms `backend/` is untouched. Any `test:ui` or `test:sync` failure must be reproduced against the exact base SHA before classification as a new regression or baseline failure.

## 14. Out of Scope

- three-human-question reflection redesign
- confirmed next-week handoff
- automatic rescheduling
- mobile sticky CTA redesign
- strongest/weakest tactic engine expansion unless required by an existing helper defect
- repeated-miss history analysis
- AI Coach or generated interpretation
- calendar, gamification, or pet features
- backend/API/database/storage changes
- new analytics backend or events

## 15. Acceptance Checklist

- [ ] Canonical review persistence from PR #161 is untouched.
- [ ] Auto Weekly Summary appears before reflection inputs.
- [ ] Overall, core, optional, check-in, overdue, and carry-over evidence is factual.
- [ ] On-time is shown only when completion timestamps are trustworthy.
- [ ] Previous-week delta uses direct task completion and percentage points.
- [ ] Week 1 has no fake comparison.
- [ ] No-task week has no misleading failure percentage.
- [ ] No-check-in copy is neutral.
- [ ] `weeklyReflectionInsights` is actually rendered.
- [ ] No more than three deterministic insights render.
- [ ] No psychological inference or AI generation is introduced.
- [ ] Basic evidence and deterministic insights are not paywalled.
- [ ] Premium, Emotion Flow, rescue, rail, inputs, validation, sticky CTA, and save behavior are preserved.
- [ ] Completed-review evidence uses the same shared derivation.
- [ ] Desktop and 390px mobile hierarchy is verified.
- [ ] Backend, API, schema, storage, mutation, and network behavior are unchanged.
- [ ] Focused and full verification show no new regression.

## 16. Follow-up

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
