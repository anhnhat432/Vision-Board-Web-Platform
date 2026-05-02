# Core Funnel Test Scenarios

Last updated: 2026-05-03

## Purpose

Reproducible fixtures for the SMART Goal -> Feasibility Check -> 12-Week Plan funnel
covering 8 distinct goal types. Tests are pure (no UI render, no localStorage,
no network) so they can be added to `npm run test:run` without slowing CI.

These scenarios are the de facto rubric until the dedicated quality rubric docs
(`SMART_GOAL_QUALITY_RUBRIC.md`, `FEASIBILITY_SCORING_RUBRIC.md`,
`12_WEEK_PLAN_QUALITY_RUBRIC.md`) are written.

## Files

- Fixtures: [src/test/fixtures/coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts)
- Tests: [src/test/fixtures/coreFunnelScenarios.test.ts](src/test/fixtures/coreFunnelScenarios.test.ts)

## Scoring sources

The fixtures pin behavior across three modules:

1. SMART helpers — [src/lib/smart-goal/helpers.ts](src/lib/smart-goal/helpers.ts):
   `buildSmartGoal`, `estimateGoalDifficulty`, `hasOutcomeIndicator`.
2. Feasibility result — [src/app/pages/FeasibilityCheck/helpers.ts](src/app/pages/FeasibilityCheck/helpers.ts) `buildResult` (the production scorer used by the UI). The numeric library at [src/lib/feasibility](src/lib/feasibility/) is a parallel reference scorer with its own tests; the production funnel uses `buildResult`.
3. Plan load — [src/features/plan12week/logic/taskConstraints.ts](src/features/plan12week/logic/taskConstraints.ts) `getMaxWeeklyTaskCount`, `getMaxTasksPerTactic`, `getWeeklyTaskWarning`, `isTaskCountInRecommendedRange`, plus [src/app/pages/12WeekSetup/helpers.ts](src/app/pages/12WeekSetup/helpers.ts) `getFeasibilityDraftDefaults`, `buildLeadIndicatorSchedules`, `getPreviewTasks`.

## Scenario coverage matrix

| # | id | goalType | resultType | planLoad | weeklyCapacity | difficulty | week 1 tasks | in 3-5 range |
|---|-----|----------|-----------|----------|----------------|-----------|------------|--------------|
| 1 | skill-rust-portfolio | skill | challenging | lighter | low | medium | 3 | yes |
| 2 | health-run-5k | health | realistic | balanced | medium | medium | 5 | yes |
| 3 | finance-savings-milestones | finance | realistic | lighter | low | medium | 2 | no |
| 4 | career-promotion-senior | career | realistic | push | high | medium | 6 | no (warns) |
| 5 | exam-ielts-7-12-weeks | exam | too_ambitious | lighter | low | easy (!) | 2 | no |
| 6 | project-side-mvp-feedback | project | challenging | balanced | medium | medium | 5 | yes |
| 7 | habit-reading-3x-week | habit | realistic | balanced | medium | easy | 3 | yes |
| 8 | self-development-mentor-journal | self_development | challenging | lighter | low | easy | 2 | no |

The set is designed to span:

- All 8 goal types listed in the task brief.
- All 3 `ResultType` bands (`realistic`, `challenging`, `too_ambitious`).
- All 3 `PlanLoadRecommendation` values (`lighter`, `balanced`, `push`).
- All 3 `WeeklyCapacity` bands (`low`, `medium`, `high`).
- Both ends of the recommended week-1 task range (3-5) plus one over-the-limit case
  that triggers `getWeeklyTaskWarning`.

## What each scenario asserts

For every scenario the test suite asserts:

**SMART quality**

- `buildSmartGoal` returns a normalized `SmartGoal` with `goal_summary`.
- `goal_summary.difficulty` matches the expected `easy | medium | hard`.
- `hasOutcomeIndicator(specific.goal_statement)` matches the expected boolean.

**Feasibility result**

- `buildResult(...).type` matches expected `ResultType`.
- `planLoad` and `weeklyCapacity` match expected.
- `bottleneck.axis` and `bottleneck.score` match expected.
- `adjustedScore` is inside the expected range.
- `firstWeekGuidance`, `scopeRecommendation`, `recommendation` are non-empty.

**Plan load**

- `getFeasibilityDraftDefaults(...)` derives the expected `dailyTimeBudget`.
- `getMaxWeeklyTaskCount` and `getMaxTasksPerTactic` match expected limits.
- `getPreviewTasks(leadIndicators, options).length` equals expected `week1TaskCount`.
- `isTaskCountInRecommendedRange` matches expected.
- `getWeeklyTaskWarning` matches expected (string for >5 tasks, `null` otherwise).
- Each scheduled tactic stays within `getMaxTasksPerTactic`.

A coverage block also asserts the matrix above (8 goal types, all bands).

## Known limitations surfaced by these scenarios

1. **Difficulty rubric breaks on non-linear metrics.** Scenario 5 (IELTS 5.5 -> 7.0 in
   12 weeks at 15h/week) returns `difficulty: "easy"` because `estimateGoalDifficulty`
   = (target - baseline) / weekly_hours = 0.1. The feasibility scorer correctly flags
   the same goal as `too_ambitious`. The two signals contradict; the UI should not
   surface "easy" here. Fix candidates (out of scope for this task): metric-aware
   weighting in `estimateGoalDifficulty`, or suppress difficulty when the metric unit
   is qualitative (band, level, rank).

2. **Low-capacity scenarios fall below recommended week-1 range.** Scenarios 3, 5, 8
   schedule only 2 tasks in week 1, which is correct behavior for `lighter` load on a
   low-capacity user (avoids overload), but it falls below the 3-5 range used by
   `isTaskCountInRecommendedRange`. The setup UI should surface a "consider adding one
   indicator once the rhythm holds" hint rather than warn that the count is too low.

3. **`push` + `1.5h` produces 6 tasks.** Scenario 4 lands at exactly `getMaxWeeklyTaskCount`
   = 6 (the time-budget cap is 6 for `1.5h+`), which trips `getWeeklyTaskWarning`. The
   warning copy is correct; the planner should expose it prominently instead of letting
   the user create a plan that the same code calls overloaded.

4. **Bottleneck tie-breaking is order-dependent.** When multiple axes share the lowest
   score, `buildResult` keeps the first axis in `QUESTIONS` order (stable JS sort).
   Today that means `time` wins many ties — useful for `personalConstraint`, but
   review when adding new axes.

## How to add a scenario

1. Pick a goal type currently underrepresented (or covering a new edge case like a
   different bottleneck axis).
2. Compute `diagnosticScore = sum of option.score`, then `readinessScore = round(sum / 28 * 20)`,
   subtract `wheelPenalty` (3 if wheel<=3, 2 if <=5, 1 if <=7, else 0) to get
   `adjustedScore`. resultType band: `>=15` realistic, `>=10` challenging, else
   too_ambitious.
3. Compute `planLoad`: `lighter` if `adjusted<=10` or `weeklyCapacity=low` or
   `bottleneck.score<=2 && axis!=wheel`; `push` if `adjusted>=17 && weeklyCapacity=high`;
   else `balanced`.
4. For the plan: `dailyTimeBudget` is `30min` (low) / `1h` (medium) / `1.5h` (high);
   `getMaxWeeklyTaskCount`/`getMaxTasksPerTactic` are deterministic from
   `(planLoad, dailyTimeBudget)` via `taskConstraints.ts`.
5. Compute `week1TaskCount` by hand using `buildLeadIndicatorSchedules`'s greedy
   allocator: per indicator, `frequency = min(parseTarget, maxPerTactic, remainingWeeklyTasks - reservedForRemainingIndicators)`.
6. Add an entry to `CORE_FUNNEL_SCENARIOS` and let the per-scenario test loop pick it up.
7. Run `npx vitest run src/test/fixtures/coreFunnelScenarios.test.ts` and adjust until green.

## Constraints honored

- No new dependencies.
- No AI / generated content.
- No UI rewrite — fixtures consume existing helpers only.
- No backend or billing changes.
- No private user data — all personas are generic ("người mới chuyển ngành", "engineer cấp cao",
  "người làm văn phòng"). No real names, emails, account ids, or sensitive financials.

## How to run

```bash
npx vitest run src/test/fixtures/coreFunnelScenarios.test.ts
```

Or with the rest of the funnel logic:

```bash
npx vitest run src/lib/smart-goal src/lib/feasibility src/app/pages/12WeekSetup/helpers.test.ts src/test/fixtures/coreFunnelScenarios.test.ts
```
