# 12-Week Plan Quality Rubric

Last updated: 2026-05-03
Source code: [src/features/plan12week/logic/planQuality.ts](src/features/plan12week/logic/planQuality.ts)
Existing constraints: [src/features/plan12week/logic/taskConstraints.ts](src/features/plan12week/logic/taskConstraints.ts)
Calibration fixtures: [src/test/fixtures/calibrationCases.ts](src/test/fixtures/calibrationCases.ts)

## 1. Status

**No real tester data has informed this rubric.** Calibration is grounded in the known-limitations corpus surfaced by [src/test/fixtures/coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) and the working substitute rubric in [CORE_FUNNEL_USER_TESTING_SCRIPT.md §6](CORE_FUNNEL_USER_TESTING_SCRIPT.md#6-scoring-rubric-1-5-per-dimension).

`taskConstraints.ts` (production scheduler limits) is **not changed** — that file still drives the planner. `planQuality.ts` is additive and produces a richer assessment for the UI/QA to use.

## 2. Week-1 load bands

`assessWeekOneLoad({ taskCount, planLoad, weeklyCapacity })` returns a level + warning + suggestion.

The bands below replace the flat `isTaskCountInRecommendedRange(3, 5)` check, which over-warned `lighter+low` scenarios that legitimately schedule 2 tasks (see `clear-with-low-capacity` calibration case).

| planLoad / weeklyCapacity | appropriate min | appropriate max | hard cap (above = overloaded) |
| --- | --- | --- | --- |
| lighter / low | 1 | 3 | 4 |
| lighter / medium | 2 | 4 | 5 |
| lighter / high | 2 | 4 | 5 |
| balanced / low | 2 | 4 | 5 |
| balanced / medium | 3 | 5 | 6 |
| balanced / high | 3 | 5 | 6 |
| push / low | 2 | 4 | 5 |
| push / medium | 3 | 5 | 6 |
| push / high | 4 | 6 | 7 |

Levels:

- **appropriate**: `min ≤ count ≤ max`
- **upper_limit**: `max < count ≤ hardCap` — proportional warning, not a hard fail
- **overloaded**: `count > hardCap` — hard warning + concrete suggestion to remove 1-2 tasks
- **underloaded**: `count < min` — quiet hint to add a task, except `lighter+low` which stays silent (intentional)

The `upper_limit` band is the calibration response to the `career-promotion` scenario (push+1.5h) which produces exactly 6 tasks at the planner's hard cap; the existing `getWeeklyTaskWarning` fires above 5 regardless of load. `assessWeekOneLoad` distinguishes "right at the edge" from "over the edge".

## 3. Plan quality levels

`assessPlanQuality(input)` returns `weak | moderate | strong` from a small rule set:

- **weak** if any of: week-1 load is `overloaded` OR `underloaded`, OR `hasLagMetric = false`, OR `leadIndicatorCount < 2`
- **moderate** if week-1 load is `upper_limit` OR `hasMidCycleMilestones = false`
- **strong** otherwise

**Calibration override**: a `lighter+low` plan with `underloaded` week-1 (which means 0 tasks) but a valid lag metric and ≥ 2 lead indicators is reclassified from `weak` to `moderate`. Below-min for `lighter+low` is the planner's intent, not a quality failure. Surfaced by the `clear-with-low-capacity` case (which is `appropriate` at 2 tasks, not underloaded — the override exists for the edge where the user manually schedules zero).

## 4. Lead indicator count band

- Recommended: 2-4
- Below 2: warning + suggestion to add at least one core indicator
- Above 4: warning that the chu kỳ is diluted; suggest merging duplicates

Production planner (`buildLeadIndicatorSchedules`) does not enforce this; it is a quality signal.

## 5. Lag metric requirement

A 12-week plan without a lag metric (`hasLagMetric = false`) is always `weak`, regardless of week-1 load and lead indicators. Without it, weeks 4 / 8 / 12 milestones become unanchored.

## 6. Calibration cases shipped

| Case | Week 1 / Load / Capacity | Expected level | Expected week-1 level |
| --- | --- | --- | --- |
| `clear-with-low-capacity` | 2 tasks, lighter, low | moderate | appropriate |
| `good-plan-overloaded-week-one` | 7 tasks, balanced, medium | weak | overloaded |
| `realistic-boring-effective` | 4 tasks, balanced, medium | strong | appropriate |

Plus a guardrail test: `plan with no lag metric is weak regardless of week-1 load` (4 tasks, balanced, medium, lag missing → weak).

## 7. What this rubric does NOT score

- Tactic creativity. Boring repeatable tactics that hit the metric must score `strong`.
- Domain fit. The rubric does not know whether a "Run 30p" tactic is the right thing for a 5K goal — that is the user's judgment.
- Adaptive replanning quality. `adaptivePlanning.ts`, `executionFeedback.ts` are scored separately by execution rubrics not yet written.

## 8. Open questions for the next calibration pass

- Is the `lighter+low → 1 task` band too lenient? Tester signal needed.
- Should mid-cycle milestones be hard-required (move from `moderate` to `weak` when missing)? Currently a soft signal.
- Should `lead_indicator > 4` be a `weak` flag rather than a `strong`-blocker? Right now it stays under `strong` via warnings, not by demoting the level.
- The `upper_limit` band suggests "review sớm để cắt bớt nếu thấy đuối" — does the UI surface this proactively or only on demand?
