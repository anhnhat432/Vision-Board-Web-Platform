# SMART Goal Quality Rubric

Last updated: 2026-05-03
Source code: [src/lib/smart-goal/quality.ts](src/lib/smart-goal/quality.ts)
Calibration fixtures: [src/test/fixtures/calibrationCases.ts](src/test/fixtures/calibrationCases.ts)

## 1. Status

**No real tester data has informed this rubric.** Calibration is grounded in the known-limitations corpus surfaced by [src/test/fixtures/coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) and the working substitute rubric in [CORE_FUNNEL_USER_TESTING_SCRIPT.md §6](CORE_FUNNEL_USER_TESTING_SCRIPT.md#6-scoring-rubric-1-5-per-dimension). When real sessions populate [CORE_FUNNEL_FEEDBACK_SYNTHESIS.md](CORE_FUNNEL_FEEDBACK_SYNTHESIS.md), thresholds in §3 should be revisited.

## 2. Five clarity dimensions

| ID | Label | Pass criterion |
| --- | --- | --- |
| `outcome_verb` | Câu mục tiêu có động từ kết quả rõ | `hasOutcomeIndicator(specific.goal_statement) === true` |
| `measurable_target` | Có chỉ số đo và con số mục tiêu lớn hơn baseline | `metric_name` non-empty AND `target_value > 0` AND `target_value > baseline_value` (when baseline defined) |
| `achievable_weekly_hours` | Quỹ thời gian mỗi tuần hợp lý | `1 <= weekly_time_commitment_hours <= 60` |
| `relevant_motivation` | Lý do quan trọng đủ rõ | `motivation_reason.trim().length >= 10` |
| `time_bound` | Có deadline | `target_weeks > 0` OR `target_date` non-empty |

Each dimension contributes 1/5 to the raw score.

## 3. Levels

- **strong**: score ≥ 0.8 AND `outcome_verb` passed
- **moderate**: score ≥ 0.6 OR (score ≥ 0.8 AND `outcome_verb` failed)
- **weak**: score < 0.6

The "outcome_verb cap" was added during calibration: a goal that meets every other dimension but lacks an outcome verb cannot reach `strong`. Without an outcome verb, the goal is still ambiguous about what "done" looks like.

## 4. Calibrated difficulty

`getCalibratedDifficulty(goal)` wraps the raw `estimateGoalDifficulty` from `helpers.ts` and adds two suppression rules:

- Returns `"qualitative"` when `metric_name` or `metric_unit` matches a non-linear keyword (`band`, `level`, `score`, `grade`, `rank`, `tier`, `percentile`, `điểm`, `hạng`, `mức`, `cấp`). The raw difficulty math `delta / weekly_hours` is meaningful for counting goals (kg, km, sessions) but misleading for band/level scores. Surfaced by the IELTS scenario in [coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) where `delta = 1.5, hours = 15 -> 0.1 -> "easy"` while feasibility correctly flagged `too_ambitious`.
- Returns `"unknown"` when `metric_name` is empty, `target <= 0`, `target <= baseline`, or `weekly_hours <= 0`. Surfaced by the `vague-with-high-motivation` calibration case where the form was filled but `metric_name` was missing.

The UI should NOT display `easy/medium/hard` when the calibrated value is `qualitative` or `unknown`. Use feasibility result type for ambition signal in those cases.

## 5. Suggestions

`generateGoalClaritySuggestions(goal)` returns one Vietnamese suggestion per missing dimension, plus a special note when clarity is `strong` AND metric is qualitative ("đừng tin nhãn easy/medium/hard, hãy dùng kết quả Feasibility"). Suggestions are heuristic-validated to be ≥ 30 characters with verb-driven hints — see test `suggestions are actionable (not platitudes)` in [calibrationCases.test.ts](src/test/fixtures/calibrationCases.test.ts).

## 6. Calibration cases shipped

| Case | Archetype | Expected level | Expected difficulty |
| --- | --- | --- | --- |
| `weak-but-enthusiastic` | Outcome verb missing, motivation strong | moderate | medium |
| `strong-but-overambitious` | All 5 dimensions pass, qualitative metric (IELTS-shaped) | strong | qualitative |
| `clear-with-low-capacity` | Clear goal, low weekly hours | strong | medium |
| `vague-with-high-motivation` | Outcome verb missing, no metric, no deadline | weak | unknown |
| `good-plan-overloaded-week-one` | Clear goal | strong | medium |
| `realistic-boring-effective` | Clear goal, simple metric | strong | medium |

## 7. What this rubric does NOT score

- Novelty / creativity. A boring-but-effective plan must score the same as a clever one. Surfaced by the `realistic-boring-effective` calibration case.
- Ambition. The score for "good SMART form" is independent of "is this goal too big." That signal lives in Feasibility, not here.
- Emotional confidence. Tester-reported willingness to start is part of the user testing rubric ([CORE_FUNNEL_USER_TESTING_SCRIPT.md §6](CORE_FUNNEL_USER_TESTING_SCRIPT.md#6-scoring-rubric-1-5-per-dimension)), not this code rubric.

## 8. Open questions for the next calibration pass

- Is the `motivation_reason >= 10 chars` check meaningful, or is it just a length gate? Consider a "no boilerplate" check after first wave of tester data.
- Should `outcome_verb` regex be extended for English? Currently English verbs (become, reach, complete, build, launch, achieve) are present but Vietnamese coverage is wider.
- Should `qualitative` metrics get a separate "ambition" hint surfaced in the UI, or just a suppression of difficulty? Decide from feedback.
