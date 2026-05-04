# Feasibility Scoring Rubric

Last updated: 2026-05-03
Source code (production scorer used by the UI): [src/app/pages/FeasibilityCheck/helpers.ts](src/app/pages/FeasibilityCheck/helpers.ts)
Source code (parallel reference scorer): [src/lib/feasibility](src/lib/feasibility/)

## 1. Status

**No real tester data has informed this rubric.** No numeric calibration was applied to the production scorer in this pass — the calibrated layer in this repo currently lives on the SMART side (`getCalibratedDifficulty` suppresses `easy/medium/hard` for qualitative metrics) so the user does not see two contradictory signals (SMART says "easy", Feasibility says "too_ambitious"). When real sessions populate [CORE_FUNNEL_FEEDBACK_SYNTHESIS.md](CORE_FUNNEL_FEEDBACK_SYNTHESIS.md), revisit thresholds and weights here.

## 2. Production scorer (UI path)

`buildResult(answers, wheelScore)` in [FeasibilityCheck/helpers.ts](src/app/pages/FeasibilityCheck/helpers.ts) is what the user sees:

- 7 axes (time, energy, resources, clarity, obstacle, routine, confidence). Each option scores 1-4.
- `diagnosticScore = sum of axis scores` (max 28).
- `readinessScore = round(diagnosticScore / 28 * 20)` (0-20).
- `wheelPenalty`: wheel ≤ 3 → 3; ≤ 5 → 2; ≤ 7 → 1; else 0.
- `adjustedScore = readinessScore - wheelPenalty`, clamped to ≥ 0.
- `resultType`: `adjusted >= 15` → `realistic`; `>= 10` → `challenging`; else `too_ambitious`.

Plan load (drives setup defaults):

- `lighter` if `adjusted ≤ 10` OR `weeklyCapacity = low` OR (`bottleneck.score ≤ 2` AND `bottleneck.axis ≠ wheel`).
- `push` if `adjusted ≥ 17` AND `weeklyCapacity = high`.
- `balanced` otherwise.

`weeklyCapacity` is read from question 1 (time): `lt1 / 1to3 → low`, `3to5 → medium`, `gt5 → high`.

Bottleneck is the lowest-scoring axis. When wheel ≤ 4 AND `wheel/10 < weakest_score/4`, bottleneck is overridden to `wheel`. Stable JS sort means ties resolve to the first axis in question order — currently `time`.

## 3. Parallel reference scorer

[src/lib/feasibility](src/lib/feasibility/) computes a continuous 0-1 dimension score using normalized averages of capacity (Q1+Q2), readiness (Q3+Q4), risk (Q5+Q6), context (Q7 weighted with wheel). Used only by its own tests; not on the user path. Kept as a reference if we ever need to A/B the scoring shape.

## 4. Status bands (parallel scorer)

`getDimensionStatus(score)`: `>= 0.7` strong, `>= 0.5` moderate, else weak.

## 5. What was calibrated in this pass

- Bottleneck label is preserved. Tie-breaking remains `time` due to stable sort. Documented as a known limitation in [CORE_FUNNEL_TEST_SCENARIOS.md](CORE_FUNNEL_TEST_SCENARIOS.md) §"Known limitations" item 4. No code change yet — wait for feedback before re-ordering axes.
- Plan-load → daily-time-budget mapping (`low → 30min`, `medium → 1h`, `high → 1.5h`) preserved. Verified by `clear-with-low-capacity` calibration case.
- `qualitative` metric handling moved to SMART side (`getCalibratedDifficulty`) to keep feasibility scoring purely behavioral. The UI should still display feasibility's `too_ambitious` for IELTS-shaped goals; the calibration only stops SMART from contradicting it with `easy`.
- **Archetype-aware copy overlay.** `buildResult` now accepts an optional `goalArchetype` argument. Numeric scoring is unchanged (`adjustedScore`, `resultType`, `planLoad`, `weeklyCapacity`, `bottleneck.axis/score` are identical with or without archetype). Only the human-readable strings (`firstWeekGuidance`, `scopeRecommendation`, and an appended note on `bottleneck.action`) are overridden per archetype. Source: [src/app/pages/FeasibilityCheck/archetypeCopy.ts](src/app/pages/FeasibilityCheck/archetypeCopy.ts). Generic helpers.ts copy is the fallback when archetype is `undefined` or `"other"`.

### 5.1 Archetype copy overlays shipped

| Archetype | Headline angle of advice |
| --- | --- |
| `skill_learning` | Practice consistency + feedback loop. "Tạo output tuần 1, lý thuyết để sau." |
| `health_fitness` | Recovery + sustainable pace. "Frequency over intensity, ngủ + ăn quan trọng tuần 1." |
| `career_growth` | Input control over outcome. "Promotion là kết quả phụ thuộc; track deliverable thay vào." |
| `financial_goal` | Controllable actions + automation. "Track + auto-transfer trước khi đặt số tiết kiệm to." |
| `exam_study` | Practice tests + spaced repetition. "Tuần 1 làm 1 đề full để biết baseline thật." |
| `project_completion` | Scope + dependencies + milestones. "Mốc tuần 4 và 8 phải rõ trước khi bắt đầu." |
| `habit_building` | Cue + environment + 2-minute rule. "Streak quan trọng hơn cường độ." |
| `creative_output` | Cadence over perfection. "Ship rough tuần 1, edit pass thứ 3 không tăng giá trị." |
| `relationship_life` | Lịch cố định + input có thể kiểm soát. |
| `other` | No override — generic copy wins. |

For each archetype × resultType (`realistic` / `challenging` / `too_ambitious`) the table provides a `firstWeekGuidance` line and a `scopeRecommendation` line. A separate per-axis `bottleneckOverlay` table appends an archetype-specific note to `bottleneck.action` when the bottleneck axis matches an entry. Missing entries fall back silently to the generic copy.

## 6. What was NOT calibrated in this pass

- Numeric thresholds (15 / 10 / 17) were not changed. Doing so blindly without tester data would invalidate the existing 8 scenarios in [coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) that span the three resultType bands.
- Wheel penalty curve (3/2/1/0) was not changed.
- Weights of the 7 axes (currently equal: `diagnosticScore = sum`) were not changed.
- Question text and option scoring (1-4 per option) unchanged. Risk of breaking existing scenarios was higher than benefit without tester data.
- The high-level `recommendation` line per resultType remains generic. Only `firstWeekGuidance`, `scopeRecommendation`, and `bottleneck.action` are archetype-aware.

## 7. Trust signals to look for in the next tester wave

These come from [CORE_FUNNEL_USER_TESTING_SCRIPT.md §5](CORE_FUNNEL_USER_TESTING_SCRIPT.md#5-what-to-watch-for-during-the-session). Bring back to this doc:

- Tester accepts result band ("yes, that's me right now") → keep current thresholds.
- Tester argues with band ("too harsh / too easy") → consider shifting threshold or wheel penalty.
- Tester ignores result (skim past) → recommendation copy fails, not the score.
- Bottleneck label does not match real struggle → reconsider tie-break order.
- Plan load (`lighter / balanced / push`) misunderstood → copy fix in setup, not score change.

## 8. Open questions for the next calibration pass

- Is the wheel penalty too aggressive at `wheel ≤ 3`? It removes 3 points (15% of max readiness), which can flip realistic to challenging.
- Should `bottleneck.score = 2` always force `lighter`? Currently yes (axis ≠ wheel). Some testers may prefer `balanced` even with one weak axis.
- Should we expose `firstWeekGuidance` more prominently? It is generated but the testing script flags ignore-rate as the worst signal.
