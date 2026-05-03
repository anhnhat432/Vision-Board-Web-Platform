# 12-Week Plan Quality Rubric v1

Module: `src/features/plan12week/logic/planQuality.ts`

## Mục đích

Đánh giá chất lượng một 12-week plan ngay tại bước Review trước khi user nhấn "Tạo kế hoạch".
App **không chặn** flow — chỉ cảnh báo và gợi ý cải thiện. User vẫn có thể tạo plan dù level
là `weak`.

Plan Quality cũng cung cấp tín hiệu để các phiên sau (analytics MVP, plan insights) có thể
phân biệt plan "rỗng" với plan "đầy đủ" mà không cần đọc nội dung text.

## Tổng quan

| Trường         | Mô tả                                                           |
| -------------- | --------------------------------------------------------------- |
| `overallScore` | 0–100, tổng các dimension scores                                |
| `level`        | `weak` (0–39), `okay` (40–69), `strong` (70–100)                |
| `dimensions`   | Mảng 7 dimension scores                                         |
| `warnings`     | Các vấn đề nghiêm trọng (overload, thiếu indicator, vague v.v.) |
| `suggestions`  | Gợi ý cải thiện không bắt buộc                                  |

## 7 Dimensions

### 1. Outcome Clarity (0–15 điểm)

Đánh giá độ rõ của tầm nhìn 12 tuần và kết quả tuần 12.

| Tiêu chí                                          | Điểm |
| ------------------------------------------------- | ---- |
| `vision12Week` ≥ 30 ký tự                         | +5   |
| `week12Outcome` ≥ 15 ký tự                        | +5   |
| `lagMetric.target` và `lagMetric.name` không rỗng | +5   |

Warnings phát ra khi vision/outcome trống.

### 2. Milestone Progression (0–15 điểm)

Đánh giá mốc tuần 4/8/12.

| Tiêu chí                                                                | Điểm |
| ----------------------------------------------------------------------- | ---- |
| `week4Milestone` ≥ 8 ký tự                                              | +5   |
| `week8Milestone` ≥ 8 ký tự                                              | +5   |
| Có ít nhất 2 mốc khác biệt VÀ ít nhất một mốc cụ thể (≥4 từ, ≥12 ký tự) | +5   |

Warning khi cả tuần 4 và tuần 8 đều quá ngắn (< 3 từ). Suggestion khi một trong hai vague,
hoặc khi week4 = week8.

### 3. Lead Indicator Quality (0–20 điểm)

Đánh giá chất lượng lead indicators (việc lặp lại).

| Tiêu chí                                                        | Điểm |
| --------------------------------------------------------------- | ---- |
| Có 2–4 lead indicators valid (name không rỗng)                  | +5   |
| Tất cả indicator có name                                        | +5   |
| Tất cả indicator có target số dương hợp lệ                      | +5   |
| Tất cả indicator có schedule offset (ít nhất 1 ngày trong tuần) | +5   |

Warnings: 0 indicators, chỉ 1 indicator, hoặc > 4 indicators.

### 4. Task Load Realism (0–15 điểm)

Đánh giá tổng task tuần đầu so với `getMaxWeeklyTaskCount(loadPreference, dailyTimeBudget)`.

| Tiêu chí                                     | Điểm |
| -------------------------------------------- | ---- |
| Tổng task tuần đầu > 0 và ≤ max cho phép     | +8   |
| Tổng task tuần đầu ≥ 2 (minimum viable plan) | +4   |
| Mọi indicator đều có schedule offset         | +3   |

Warning khi vượt max. Suggestion khi một indicator schedule vượt `getMaxTasksPerTactic`.

### 5. Week 1 Startability (0–15 điểm)

Đánh giá tuần đầu có dễ bắt đầu không, đặc biệt khi feasibility thấp. Cập nhật v1
thêm kiểm tra chất lượng việc đầu tiên (additive — không đổi điểm).

| Tiêu chí                                                            | Điểm |
| ------------------------------------------------------------------- | ---- |
| Có preview tasks tuần 1                                             | +5   |
| Tuần 1 ≤ 4 task (nếu feasibility low) hoặc ≤ 6 task (nếu không low) | +5   |
| Có ít nhất 1 lead indicator type `core`                             | +5   |

"Low feasibility" = `planLoad === "lighter"` hoặc `weeklyCapacity === "low"` hoặc
bottleneck axis là `energy` / `confidence`.

Warning khi low feasibility nhưng tuần đầu > 4 task.

#### Week 1 Startability v1 — Định nghĩa

Một plan tuần 1 được coi là "startable" khi:

1. **Có việc đầu tiên rõ** — `firstTaskTitle` không rỗng và ≥ 6 ký tự.
2. **Việc đầu tiên đủ nhỏ** — không phải tên generic kiểu `Việc 1`, `Task`,
   `Kết quả`, `Tốt hơn`...
3. **Có động từ hành động ở đầu tên** — bắt đầu bằng động từ tiếng Việt
   (viết, đọc, làm, đo, lên lịch, gửi...) hoặc tiếng Anh (write, ship, set up...).
4. **Không yêu cầu chuẩn bị quá nhiều** — số task tuần 1 ≤ 4 (low feasibility)
   hoặc ≤ 6 (chuẩn).
5. **Liên kết với lead indicator hoặc milestone** — qua việc có ≥ 1 indicator
   type `core` (đã có trong scoring).

#### Additive warnings (không đổi điểm)

`PlanQualityContext` có thêm optional `firstTaskTitle?: string`. Khi truyền và
weeklyTaskCount > 0:

| Điều kiện                                | Output                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `firstTaskTitle` trống                   | **warning** "Việc đầu tiên tuần 1 chưa có tên — đặt tên rõ để bạn biết làm gì trong 24h tới."        |
| Tên < 6 ký tự hoặc match generic pattern | **warning** "Việc đầu tiên còn mơ hồ — viết rõ hành động và đầu ra (ví dụ: 'viết draft 800 từ'...)." |
| 3 từ đầu không chứa động từ              | **warning** "Việc đầu tiên thiếu động từ hành động — bắt đầu tên bằng động từ (viết, làm, đo, ...)." |

Helper public `analyzeFirstTaskTitle(title)` trả về `{ isMissing, isVague, missingActionVerb }`
để các module khác có thể tái sử dụng phân tích.

Khi `firstTaskTitle` không truyền → không phát warning (backwards compatible).
Numeric scoring không thay đổi.

#### generatePlan — feasibility hint

`generate12WeekPlan(goal, { goalArchetype, feasibilityHint })` nhận thêm
`feasibilityHint?: { planLoad, weeklyCapacity, bottleneckAxis }`. Khi infer ra
**low feasibility** (cùng định nghĩa với rubric trên), generator dùng
`firstAction.lowFeasibility` (smaller variant <30 phút, làm hôm nay/ngày mai)
thay vì `firstAction.standard`. Output xuất hiện ở `week 1.expectedOutput` dưới
dạng dòng "Việc đầu tiên: ...".

Mỗi archetype có 1 cặp `firstAction`:

| Archetype            | Standard (24-48h)                             | Low feasibility (<30 phút hôm nay)           |
| -------------------- | --------------------------------------------- | -------------------------------------------- |
| `skill_learning`     | Lên lịch buổi luyện 30-60 phút                | Buổi luyện 15 phút                           |
| `health_fitness`     | Đo baseline trong 24h                         | Đi bộ 10-15 phút + ghi 1 dòng                |
| `career_growth`      | Block 60-90 phút deep work + xin 1:1          | Block 30 phút + soạn tin nhắn (chưa cần gửi) |
| `financial_goal`     | Mở app tracking + set chuyển khoản tự động    | Ghi 3 khoản chi gần nhất                     |
| `exam_study`         | Lên lịch đề thi thử full + in đề              | Làm 1 phần nhỏ đề (15-20 phút)               |
| `project_completion` | Viết scope document 5-10 dòng                 | Viết 3 dòng scope (10 phút)                  |
| `habit_building`     | Đặt cue + làm habit 2 phút hôm nay            | Habit phiên bản 1 phút                       |
| `creative_output`    | Viết draft rough + đặt lịch publish cuối tuần | Viết 100-200 chữ rough hoặc sketch nhỏ       |
| `relationship_life`  | Nhắn tin chốt buổi chất lượng                 | Gửi tin nhắn ngắn hỏi thăm (5 phút)          |
| `other`              | Đặt lịch việc cốt lõi trong 24-48h            | Phiên bản 10 phút của việc cốt lõi           |

#### Today tab — first-week emphasis

`TwelveWeekTodayTab` khi `currentWeek === 1`:

- Đổi headline hero từ "Việc quan trọng nhất hôm nay" thành "Việc đầu tiên của
  tuần 1".
- Thay copy reminder thành "Bắt đầu nhỏ — xong việc này là tuần 1 đã khởi động
  đúng hướng."
- Render thêm 1 dòng encouragement (`data-testid="today-first-week-encouragement"`):
  "Tuần đầu — bắt đầu nhỏ là quan trọng nhất. Đừng cố làm hết hôm nay, hãy giữ
  nhịp đến hết tuần."

Khi `currentWeek > 1`, hero quay lại copy chuẩn — không có encouragement extra.

### 6. Review Cadence (0–10 điểm)

Đánh giá nhịp nhìn lại.

| Tiêu chí                    | Điểm |
| --------------------------- | ---- |
| `reviewDay` được chọn       | +5   |
| `dailyTimeBudget` được chọn | +5   |

Warning khi không có review day. Suggestion khi không có time budget.

### 7. Feasibility Alignment (0–10 điểm)

Đánh giá plan có khớp với điểm nghẽn từ Feasibility Check không.

| Tiêu chí                                                           | Điểm |
| ------------------------------------------------------------------ | ---- |
| `tacticLoadPreference` khớp `feasibility.planLoad`                 | +5   |
| `personalConstraint` khớp với expected mapping của bottleneck axis | +5   |

Mapping bottleneck → constraint:

- `time` → `time`
- `energy` / `routine` / `confidence` → `consistency`
- `resources` / `clarity` / `wheel` → `complexity`
- `obstacle` → `motivation`

Warning khi feasibility recommends `lighter` nhưng user chọn `push`.
Suggestion khi mismatch nhẹ hơn.

Nếu không có feasibility context, dimension này được +5/10 (nửa điểm) để không phạt nặng
plan độc lập.

## Archetype Fit (mới — additive only)

`PlanQualityInput` nhận thêm optional `goalArchetype` (xem
`guidelines/GOAL_ARCHETYPES.md`). Khi được truyền, `evaluateTwelveWeekPlanQuality`
gọi thêm `evaluateArchetypeFit(input)` để **append** warnings/suggestions phù hợp
với loại mục tiêu. **Không thay đổi numeric scoring** của 7 dimension.

### Signal chung cho mọi archetype

| Signal                                         | Triggered                                                  | Output                                                          |
| ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Indicator names không match archetype keywords | có ≥ 1 indicator nhưng không có tên chứa keyword đặc trưng | **warning** "Việc lặp lại chưa phản ánh loại mục tiêu..."       |
| Milestones không match archetype keywords      | có milestone nhưng không chứa keyword đặc trưng            | **suggestion** "Mốc tuần 4/8/12 chưa nói đến output đặc thù..." |

### Archetype-specific rules

| Archetype            | Rule                                                            | Output                                                      |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `health_fitness`     | `tacticLoadPreference === "push"`                               | **warning** về chấn thương / kiệt sức khi push tuần đầu     |
| `health_fitness`     | ≥ 2 indicator nhưng không có recovery/nghỉ/mobility             | **suggestion** thêm việc recovery                           |
| `project_completion` | < 2 milestone có độ dài ≥ 8 ký tự                               | **warning** cần deliverable rõ ở ≥ 2 trong 3 mốc            |
| `exam_study`         | có indicator nhưng không có "đề thi thử"/"practice test"/"mock" | **warning** cần practice test cadence                       |
| `financial_goal`     | 0 indicator                                                     | **warning** về chỉ có lag metric, thiếu controllable action |
| `financial_goal`     | 1 indicator                                                     | **suggestion** nên có ≥ 2 hành động tài chính hằng tuần     |
| `habit_building`     | có indicator nhưng không có cue/trigger/routine                 | **suggestion** thêm cue rõ (sau cà phê, trước đánh răng)    |
| `skill_learning`     | có indicator nhưng không có demo/pair/review/feedback/output    | **suggestion** feedback loop                                |

### Fallback behavior

- `goalArchetype` không truyền → không archetype warnings (behavior cũ).
- `goalArchetype === "other"` → không archetype warnings. `requiredSignals` trống
  → `indicatorsMatchArchetype` và `milestonesMatchArchetype` luôn return `true`.
- Scoring 100 điểm giữ nguyên: archetype chỉ append vào `warnings`/`suggestions` arrays.

### Tích hợp runtime

- `12WeekSetup/components/ReviewStep.tsx` hiện chưa truyền `goalArchetype`; khi
  ReviewStep được wire, truyền archetype từ feasibility ref hoặc infer lại từ
  pending SMART goal.
- Hiện tại warnings chỉ hiển thị khi caller truyền archetype qua `PlanQualityInput`.

## Levels

- **weak** (0–39): nhiều dimension yếu, kế hoạch thiếu cấu trúc
- **okay** (40–69): đủ cấu trúc nhưng còn gap rõ
- **strong** (70–100): tất cả dimension chính đều đạt

Mỗi dimension cũng có status riêng: `strong` (≥70%), `okay` (≥40%), `weak` (<40%).

## Warnings vs Suggestions

- **Warnings**: vấn đề có thể làm plan thất bại sớm — overload, thiếu indicator, milestone
  quá vague. Hiển thị trong amber box ở Review step.
- **Suggestions**: gợi ý cải thiện không bắt buộc — collapsed details. User vẫn proceed bình
  thường.

## Nguyên tắc thiết kế

1. **Pure module**: input là plain shape (vision, outcome, lead indicators...) + optional
   feasibility context. Không phụ thuộc storage hay React.
2. **Không chặn flow**: kết quả chỉ là tín hiệu UI; user luôn có thể tạo plan.
3. **Không AI external**: rule-based, chạy offline.
4. **Không gửi raw goal text**: warnings/suggestions là string Vietnamese cố định, không
   chứa nội dung user.
5. **Không đổi storage schema**: chỉ đọc, không persist.
6. **Backwards compatible**: feasibility context optional. Plans từ trước (chưa có
   feasibility level/quality bridge) vẫn được đánh giá.

## API

```typescript
evaluateTwelveWeekPlanQuality(input: PlanQualityInput, context?: PlanQualityContext): PlanQualityResult
getPlanQualityWarnings(input: PlanQualityInput, context?: PlanQualityContext): string[]
getPlanImprovementSuggestions(input: PlanQualityInput, context?: PlanQualityContext): string[]
```

## Tích hợp UI

Hiện tại module được dùng trong `src/app/pages/12WeekSetup/components/ReviewStep.tsx`:

- Panel "Plan quality check" hiển thị overall level + score, dimensions grid, warnings
  (amber), suggestions (collapsible).
- 12WeekSetup truyền:
  - `feasibility` (PendingFeasibilityResult) → context.feasibility
  - `scheduledLeadIndicators` (đã build từ buildLeadIndicatorSchedules) → indicators
  - `weekOneTaskPreview.length` → context.weeklyTaskCount

## Limitations

- **Không đọc semantics**: rubric dựa trên độ dài, count, schedule presence. Không phát
  hiện "milestone dài nhưng vô nghĩa" hay "indicator name dài nhưng không actionable".
- **Không phân tích progression**: không biết `week4Milestone` có đại diện cho 33% tiến độ
  của `week12Outcome` hay không.
- **Threshold cố định**: 70/40 cho strong/okay, 0.7/0.4 cho dimension status. Có thể cần
  calibrate sau khi có dữ liệu user thật.
- **Không tính dailyTimeBudget**: chỉ kiểm tra `dailyTimeBudget` không trống, không validate
  format. Thông qua `getMaxWeeklyTaskCount` dùng để tính ceiling task load.
- **Mapping bottleneck → constraint là heuristic**: cùng mapping với
  `getFeasibilityDraftDefaults` trong 12WeekSetup helpers, có thể lệch nếu UX thay đổi.
- **Goal type không được tính điểm**: hiện chỉ là metadata, không vào scoring.

## Hướng phát triển

- Tích hợp Plan Quality vào analytics MVP (`twelve_week_plan_created` event) — bucket
  `plan_quality_level` và `plan_quality_score_bucket` (xem REMOTE_ANALYTICS_FIELD_ALLOWLIST
  rule trước khi thêm).
- Persist Plan Quality result vào `Goal.twelveWeekSystem` cho Insights tab — cần migration
  - backwards compatibility test.
- Mở rộng dimension "consistency" khi có execution data (review.completed, daily check-in
  rate).
- Thêm dimension "goal alignment" so sánh `vision12Week` với SMART goal `specific` để phát
  hiện drift.
