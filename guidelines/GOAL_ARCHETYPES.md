# Goal Archetypes v1

Module: `src/lib/smart-goal/goalArchetypes.ts`

## Mục đích

Mỗi mục tiêu có một "hình dạng" khác nhau: học kỹ năng cần practice + feedback,
sức khỏe cần recovery + progressive load, dự án cần milestone + deliverable, v.v.
Archetype là một tag deterministic để các bước downstream (Feasibility,
12-week plan generation, Plan Quality) có thể điều chỉnh copy, default và
warning sao cho phù hợp với từng loại mục tiêu.

Archetype **không** thay đổi scoring (feasibility readiness, plan quality
overall score); chỉ thay đổi **copy và default suggestions**.

## Danh sách archetype

| Archetype ID | Nhãn UI | Tín hiệu đặc trưng |
|---|---|---|
| `skill_learning` | Học kỹ năng | practice + feedback loop + output (dự án nhỏ) |
| `health_fitness` | Sức khỏe & thể chất | recovery + baseline + progressive load |
| `career_growth` | Phát triển sự nghiệp | deliverable input + 1:1 với mentor / stakeholder |
| `financial_goal` | Mục tiêu tài chính | controllable action + tracking + risk buffer |
| `exam_study` | Thi cử / chứng chỉ | coverage + practice test + spaced repetition |
| `project_completion` | Hoàn thành dự án | milestone + deliverable + dependency |
| `habit_building` | Xây thói quen | cue + môi trường + low friction |
| `creative_output` | Sáng tạo / sản xuất nội dung | cadence xuất bản > chất lượng từng tác phẩm |
| `relationship_life` | Quan hệ & đời sống | lịch cố định + input kiểm soát được |
| `other` | Khác | generic fallback — không áp dụng override |

## Classifier

`inferGoalArchetype(input)` là rule-based deterministic. Cùng input → cùng kết
quả. Không AI, không network.

### Thứ tự precedence

1. **Explicit `goalType`** từ 12-week setup form (nếu map vào `GOAL_TYPE_TO_ARCHETYPE`).
2. **Domain default + keyword refinement**: mỗi `SmartGoalDomain` có archetype mặc định; keyword hits từ `goalStatement` / `metricName` / `metricUnit` / `focusArea` refine.
3. **Pure keyword scan** khi domain trống.
4. **`"other"`** fallback — classifier không bao giờ block.

### Keyword matching
- Lower-case, substring, accent-sensitive.
- Keywords bao gồm cả tiếng Việt có dấu, không dấu, và tiếng Anh phổ biến (ví dụ: "tiết kiệm", "tiet kiem", "saving", "budget").

## Property tables

Archetype có 3 bảng thuộc tính riêng biệt để các downstream module dùng:

### 1. Quality hints (SMART goal review)
`getArchetypeQualityHints(archetype)` trả về:
- `recommendedMetric`: kiểu metric phù hợp (ví dụ: skill → số sản phẩm, không phải số giờ).
- `antiPatterns`: danh sách pattern tránh khi viết SMART cho archetype này.

### 2. Plan defaults (12-week plan setup — simple)
`getArchetypePlanDefaults(archetype)` trả về:
- `recommendedLeadIndicators`: 2-3 ví dụ lead indicator.
- `weekOneStart`: hướng dẫn ngắn cho tuần 1.

### 3. Feasibility focus
`getArchetypeFeasibilityFocus(archetype)` trả về:
- `typicalBottleneck`: trục bottleneck phổ biến nhất (time/energy/resources/clarity/obstacle/routine/confidence).
- `reason`: giải thích vì sao archetype này hay bị bottleneck đó.

### 4. Plan full defaults (12-week plan generation — mở rộng)
Module `src/features/plan12week/logic/planArchetypeDefaults.ts` ·
`getArchetypePlanFullDefaults(archetype)` trả về:
- `leadIndicatorSuggestions` — 2-3 tên indicator gợi ý.
- `milestoneTemplates.{week4, week8, week12}` — template mốc.
- `weekOneFocus`, `weekOneExpectedOutput` — seed tuần 1.
- `weekOneTacticLoadHint` — `lighter` / `balanced` / `push`.
- `reviewPrompt` — gợi ý câu hỏi review hằng tuần.
- `antiPatterns` — danh sách pattern tránh.
- `requiredSignals.{leadIndicatorKeywords, milestoneKeywords}` — dùng bởi `planQuality` để detect plan-archetype mismatch.

## Tích hợp hiện tại

### Feasibility Check
- `src/app/pages/FeasibilityCheck.tsx` infer archetype từ pending SMART goal (domain + focusArea + goal_statement + metric_name + metric_unit).
- `buildResult(answers, wheelScore, { goalArchetype })` áp dụng archetype copy overlay (xem `archetypeCopy.ts`): thay `firstWeekGuidance`, `scopeRecommendation`, append note vào `bottleneck.action`.
- Scoring (`adjustedScore`, `resultType`, `planLoad`) **không đổi**.
- Docs chi tiết: `guidelines/FEASIBILITY_SCORING_RUBRIC.md` (section "Goal Archetype Overlay").

### 12-Week Plan Generation
- `src/features/plan12week/logic/generatePlan.ts` · `generate12WeekPlan(goal, { goalArchetype })`:
  - Khi archetype có, seed tuần 1 với `focus`/`expectedOutput`/`leadMetrics` từ archetype defaults.
  - Seed milestone weeks (4/8/12) với `expectedOutput` template.
  - Các tuần còn lại vẫn empty cho user điền.
  - Khi archetype omitted → 12 tuần empty (behavior cũ).

### Plan Quality
- `src/features/plan12week/logic/planQuality.ts` · `evaluateTwelveWeekPlanQuality(input, context)`:
  - `PlanQualityInput` nhận thêm optional `goalArchetype`.
  - Khi có, emit **warnings/suggestions** thêm:
    - Lead indicator names không match archetype keywords → warning "việc lặp lại chưa phản ánh loại mục tiêu".
    - Milestone text không match archetype keywords → suggestion.
    - Archetype-specific rule (ví dụ `health_fitness` + `push` load → warning về chấn thương; `exam_study` thiếu practice test → warning; `financial_goal` 0 indicator → warning về chỉ có lag metric).
  - Numeric scoring **không đổi**.
  - Docs chi tiết: `guidelines/12_WEEK_PLAN_QUALITY_RUBRIC.md` (section "Archetype fit").

## Backwards compatibility

- Tất cả hàm nhận archetype là **optional**.
- Khi không truyền → behavior cũ (generic copy/defaults, không archetype warnings).
- `"other"` archetype → generic fallback, không override.
- Scoring (feasibility, plan quality) giữ nguyên — archetype chỉ ảnh hưởng copy/warnings/defaults.

## Test coverage

| File | Coverage |
|---|---|
| `src/app/pages/FeasibilityCheck/helpers.archetype.test.ts` | Archetype-aware feasibility copy: different archetypes → different guidance, bottleneck overlay, fallback. |
| `src/features/plan12week/logic/generatePlan.archetype.test.ts` | Archetype-aware plan seeding: week 1 focus, lead metrics, milestone templates per archetype. |
| `src/features/plan12week/logic/planQuality.archetype.test.ts` | Archetype-fit warnings: practice test cho exam, deliverable cho project, controllable action cho financial, recovery cho health, cue cho habit, feedback loop cho skill. |

## Limitations

- **Keyword matching is substring**, không stemming. Có thể miss variations (ví dụ "luyen tap" matches "luyện tập" nhưng không match "rèn luyện" nếu keyword list chưa có).
- **Inference only at Feasibility phase**: plan generation và plan quality nhận archetype qua option, không auto-infer. 12WeekSetup hiện chưa wire archetype inference (xem "Hướng phát triển").
- **`"other"` archetype không emit warnings**: fallback mục đích không phạt plan generic. Có thể dẫn đến false negative nếu user chọn archetype sai.
- **Archetype chưa được persist**: infer runtime từ pending SMART goal. Nếu reload sau khi navigate khỏi Feasibility, archetype có thể mất context. Trade-off chấp nhận được ở v1.
- **Không calibrate từ user data thật**: thresholds và keywords dựa trên domain knowledge, chưa validate với analytics.

## Hướng phát triển

- **Wire archetype trong 12WeekSetup**: hiện form tự user điền lead indicators/milestones mà không dùng archetype defaults. Có thể thêm CTA "Gợi ý theo loại mục tiêu" cho user click để pre-fill.
- **Lưu `goalArchetype` vào `Goal.twelveWeekSystem`**: tránh re-infer, hỗ trợ analytics bucket. Cần migration + schema update.
- **Mở rộng calibration fixtures**: test chéo giữa goal statement → expected archetype (xem worktree `calibrationCases.ts` để adapt).
- **Thêm archetype analytics bucket**: với allowlist-safe field (`goal_archetype`) cho plan_created/feasibility_completed events.
- **Archetype override UX**: cho user xác nhận/thay đổi archetype tại Feasibility step nếu inference sai.
