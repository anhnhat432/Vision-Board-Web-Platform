# Goal Archetypes (v1)

Last updated: 2026-05-03
Source: [src/lib/smart-goal/goalArchetypes.ts](src/lib/smart-goal/goalArchetypes.ts)
Tests: [src/lib/smart-goal/goalArchetypes.test.ts](src/lib/smart-goal/goalArchetypes.test.ts)

## 1. Purpose

The classifier turns a SMART goal (or its raw form fields) into one of 10 archetypes so SMART, Feasibility and 12-week Plan can give targeted hints without an external AI call.

It is rule-based, pure, deterministic, and does not block "other".

## 2. Archetypes

| Archetype | Vietnamese label | Domain default | Typical bottleneck |
| --- | --- | --- | --- |
| `skill_learning` | Học kỹ năng | learning | resources |
| `health_fitness` | Sức khỏe & thể chất | health | energy |
| `career_growth` | Phát triển sự nghiệp | career | clarity |
| `financial_goal` | Mục tiêu tài chính | finance | routine |
| `exam_study` | Thi cử / chứng chỉ | learning (refined by keyword) | time |
| `project_completion` | Hoàn thành dự án | career (refined by keyword) | clarity |
| `habit_building` | Xây thói quen | life | routine |
| `creative_output` | Sáng tạo / sản xuất nội dung | life or career (refined) | confidence |
| `relationship_life` | Quan hệ & đời sống | relationship | routine |
| `other` | Khác | — | clarity |

## 3. Inference logic

Order of precedence in `inferGoalArchetype(input)`:

1. **Explicit `goalType`** from the 12-week setup form (`Skill Learning`, `Habit Building`, `Fitness / Health`, `Exam / Study`, `Career / Job Search`, `Finance / Saving`, `Project Completion`, `Personal Growth`, `Other`). Maps directly to archetype.
2. **Domain default + keyword refinement.** Domain is the strongest single signal. Keywords split a domain when there is a clear sub-archetype (e.g. `learning` + IELTS keyword → `exam_study`).
3. **Pure keyword scan** when domain is missing. Tie-break order: `exam_study → project_completion → creative_output → health_fitness → financial_goal → habit_building → relationship_life → career_growth → skill_learning`. Specific archetypes win ties.
4. **`other`** fallback when no signal triggers.

The classifier accepts either a `SmartGoal` or a minimal `GoalArchetypeInput` slice (`{ domain?, focusArea?, goalStatement?, metricName?, metricUnit?, goalType? }`) so the 12-week setup can call it before the full SmartGoal is built.

## 4. Per-archetype properties

`getArchetypeQualityHints(archetype)` returns:

- `recommendedMetric`: the kind of metric that tends to work.
- `antiPatterns`: 2-3 pitfalls to avoid in the SMART or plan.

`getArchetypePlanDefaults(archetype)` returns:

- `recommendedLeadIndicators`: 2-3 typical lead indicators.
- `weekOneStart`: how week 1 should typically open.

`getArchetypeFeasibilityFocus(archetype)` returns:

- `typicalBottleneck`: the most common feasibility axis to watch.
- `reason`: one-sentence rationale.

Examples:

- `skill_learning` — metric: số sản phẩm thực hành; anti-pattern: dùng số giờ học làm metric. Week 1: chọn một dự án nhỏ, không học lý thuyết tuần đầu. Bottleneck: `resources`.
- `exam_study` — metric: số đề thi thử + điểm thử (band score là phi tuyến). Anti-pattern: đặt mục tiêu là band cuối trong thời gian quá ngắn. Week 1: làm 1 đề thi thử để biết baseline. Bottleneck: `time`.
- `project_completion` — metric: số deliverable/feature ship được, hoặc số phiên feedback. Anti-pattern: launch tuần 12 mà không có mốc tuần 4 và 8. Week 1: chốt scope tối thiểu khả thi. Bottleneck: `clarity`.
- `health_fitness` — metric: km / số buổi tập. Anti-pattern: đặt mục tiêu giảm cân quá nhanh. Week 1: nhẹ, kiểm tra form. Bottleneck: `energy`.
- `financial_goal` — metric: số milestone đạt được hoặc % tổng. Anti-pattern: phụ thuộc thu nhập biến động không có plan B. Week 1: set up tracking và chuyển khoản tự động. Bottleneck: `routine`.

Full list lives in the source file. Each archetype has at least 2 anti-patterns (test asserts).

## 5. Privacy and constraints

- Pure module. No fetch, no console logs, no localStorage writes.
- Inputs are not mutated.
- No raw user text leaves the function. The only output is an archetype enum value plus the static property tables.
- "other" is always selectable. Classifier never blocks the user from continuing.
- No external AI / LLM call. No new dependency.
- Storage schema unchanged. Archetype is computed on demand, not persisted (callers may store it if they want, but not required).

## 6. Coverage matrix (against existing scenarios)

Every fixture in [src/test/fixtures/coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) classifies into a non-`other` archetype, both with and without domain provided:

| Scenario | Inferred archetype |
| --- | --- |
| `skill-rust-portfolio` | `skill_learning` |
| `health-run-5k` | `health_fitness` |
| `finance-savings-milestones` | `financial_goal` |
| `career-promotion-senior` | `career_growth` |
| `exam-ielts-7-12-weeks` | `exam_study` |
| `project-side-mvp-feedback` | `project_completion` |
| `habit-reading-3x-week` | `habit_building` |
| `self-development-mentor-journal` | `habit_building` |

## 7. Known limitations

1. **Keyword matching is accent-sensitive substring.** "thi" originally matched "thiện" inside "Cải thiện" — fixed by removing the bare "thi" from the exam_study list and only keeping phrases like "kỳ thi", "đề thi", "ôn thi", "thi cử". When extending the keyword lists, prefer 2+ char phrases over single short words.
2. **Tie-break order is fixed**, not learned. If a goal has equal hits in two archetypes, the order in `pickTopArchetype` decides. This is acceptable for v1; revisit when feedback says misclassifications are common.
3. **No language detection.** The classifier accepts mixed VN/EN text and treats both as substrings. Goals in other languages will likely fall to `other` — which is the safe behavior.
4. **`relationship` domain auto-maps to `relationship_life`** even if keywords suggest career. Domain wins. If the SMART form has a domain mismatch, the form is the data quality problem, not the classifier.
5. **No persistence.** If a caller wants archetype to survive reload, they need to recompute or store it themselves.

## 8. How to extend

- Add a new archetype: extend `GoalArchetype`, `KEYWORDS`, `ARCHETYPE_LABELS`, `QUALITY_HINTS`, `PLAN_DEFAULTS`, `FEASIBILITY_FOCUS`, `DOMAIN_DEFAULT` if it should be a domain default, and `pickTopArchetype` order.
- Add a keyword to an existing archetype: append to `KEYWORDS[archetype]`. Prefer phrases ≥ 4 chars to avoid substring collisions.
- Update a hint or anti-pattern: edit the corresponding table.
- Add a new scenario: append to [src/test/fixtures/coreFunnelScenarios.ts](src/test/fixtures/coreFunnelScenarios.ts) — the existing archetype coverage test will automatically check it.

## 9. Next integration steps (NOT done in this task)

1. **SMART setup UI** — show `inferGoalArchetype(...)` result and `getArchetypeQualityHints(...)` anti-patterns as a soft hint when user is on the Specific or Measurable step. Do not block.
2. **FeasibilityCheck** — when `bottleneck.axis !== getArchetypeFeasibilityFocus(archetype).typicalBottleneck`, surface a small note explaining the unusual bottleneck (often a real signal worth looking at).
3. **12-week setup `LeadIndicatorsStep`** — when the user has not added any lead indicators, suggest the archetype's `recommendedLeadIndicators` as starter chips.
4. **Plan quality** — feed the archetype into `assessPlanQuality` so the rubric can flag archetype-specific anti-patterns (e.g., `exam_study` plan with no đề thi thử in lead indicators).
5. **Analytics (if/when added)** — log only the archetype enum, never the raw user goal text.
