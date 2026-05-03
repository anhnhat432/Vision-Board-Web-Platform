# Feasibility Scoring Rubric

## Mục đích

Hệ thống feasibility đánh giá mức độ khả thi của mục tiêu SMART Goal tại thời điểm hiện tại, dựa trên 7 góc nhìn + điểm nền lĩnh vực (wheel score). Kết quả không chặn user mà cung cấp hướng dẫn cụ thể: nên giữ nguyên, thu nhỏ hay điều chỉnh trước khi tạo kế hoạch 12 tuần.

## Inputs

| Input                         | Nguồn                        | Mô tả                                                                    |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| 7 câu hỏi (1-4 điểm)          | User trả lời                 | Đánh giá time, energy, resources, clarity, obstacle, routine, confidence |
| Wheel score (0-10)            | Life Balance                 | Điểm nền của lĩnh vực trọng tâm                                          |
| Smart goal quality (optional) | `evaluateSmartGoalQuality()` | Mức chất lượng mục tiêu: weak/okay/strong                                |

## Scoring Formula

### 1. Diagnostic Score

```
diagnosticScore = sum(axisScores[i].score)  // max = 28 (7 câu × 4 điểm)
```

### 2. Readiness Score

```
readinessScore = round((diagnosticScore / 28) * 20)  // scale 0-20
```

### 3. Wheel Penalty

| Wheel Score | Penalty |
| ----------- | ------- |
| ≤ 3         | -3      |
| 4-5         | -2      |
| 6-7         | -1      |
| ≥ 8         | 0       |

### 4. Adjusted Score

```
adjustedScore = max(0, readinessScore - wheelPenalty)
```

### 5. Result Type Thresholds

| Adjusted Score | Result Type     | Ý nghĩa                            |
| -------------- | --------------- | ---------------------------------- |
| ≥ 15           | `realistic`     | Đủ thực tế, có thể đi tiếp         |
| 10-14          | `challenging`   | Khó nhưng làm được, cần thu hẹp    |
| < 10           | `too_ambitious` | Cần thu nhỏ trước khi tạo kế hoạch |

## Bottleneck Detection

1. Tìm trục yếu nhất (axis score thấp nhất)
2. Nếu `wheelScore ≤ 4` VÀ `wheelScore/10 < weakestAxis.score/4` → bottleneck = wheel
3. Ngược lại → bottleneck = weakest axis

## Plan Load Recommendation

| Điều kiện                                            | Plan Load  |
| ---------------------------------------------------- | ---------- |
| `adjustedScore ≤ 10` hoặc `weeklyCapacity === "low"` | `lighter`  |
| `bottleneck.score ≤ 2` (không phải wheel)            | `lighter`  |
| `adjustedScore ≥ 17` và `weeklyCapacity === "high"`  | `push`     |
| Mặc định                                             | `balanced` |

## Weekly Capacity

| Câu trả lời thời gian | Capacity |
| --------------------- | -------- |
| < 1 giờ hoặc 1-3 giờ  | `low`    |
| 3-5 giờ               | `medium` |
| > 5 giờ               | `high`   |

## First Week Guidance

Dựa trên `resultType` + `planLoad` + `bottleneck`:

- **too_ambitious**: "Tuần 1 chỉ nên có 1-2 hành động bắt buộc..."
- **lighter**: "Tuần 1 nên nhẹ hơn vì phần cần chú ý nhất là {bottleneck}."
- **push**: "Tuần 1 có thể thử thách hơn một chút..."
- **balanced**: "Tuần 1 nên cân bằng: đủ rõ để tiến lên, đủ nhẹ để không mất nhịp."

## Scope Recommendation

Dựa trên `planLoad`:

- **lighter**: Giữ 2 việc chính, bỏ bớt phần mở rộng
- **push**: 3-4 việc lặp lại nếu có lịch rõ
- **balanced**: 1 kết quả chính, 2-3 việc lặp lại

## Pre-Plan Action (mới)

Mỗi kết quả giờ có câu "Trước khi tạo kế hoạch 12 tuần, hãy..." với hành động cụ thể theo bottleneck:

| Bottleneck | Hành động                                     |
| ---------- | --------------------------------------------- |
| time       | Khóa ít nhất 2 khung giờ cố định              |
| energy     | Chọn thời điểm trong ngày còn năng lượng nhất |
| resources  | Xác định 1-2 nguồn lực cần bổ sung            |
| clarity    | Thu hẹp về một kết quả chính đo được          |
| obstacle   | Viết ra trở ngại chính và cách xử lý          |
| routine    | Khóa lịch cố định trước                       |
| confidence | Chọn một bước nhỏ nhất chắc chắn hoàn thành   |
| wheel      | Củng cố nền tảng lĩnh vực song song           |

## Goal Archetype Overlay (mới)

### Cách hoạt động

`buildResult()` nhận optional `goalArchetype` (xem `src/lib/smart-goal/goalArchetypes.ts`). Archetype **không** thay đổi scoring; chỉ thay `firstWeekGuidance`, `scopeRecommendation`, và optional append lên `bottleneck.action` để recommendation phù hợp với loại mục tiêu.

### Archetype mapping

| Archetype            | Hướng dẫn đặc thù                                                              |
| -------------------- | ------------------------------------------------------------------------------ |
| `skill_learning`     | Practice consistency + feedback loop, tuần 1 chọn 1 dự án nhỏ làm output.      |
| `health_fitness`     | Recovery, baseline, safety, sustainable pace. Cắt 30% target nếu quá nhanh.    |
| `career_growth`      | Đặt input kiểm soát được (deliverable, 1:1) thay vì kết quả (promotion).       |
| `financial_goal`     | Controllable actions (saving rate, tracking), runway + risk buffer.            |
| `exam_study`         | Làm đề thi thử tuần 1 để biết baseline, spaced repetition, kỹ năng yếu nhất.   |
| `project_completion` | Scope tối thiểu khả thi, dependencies tuần 1, mốc tuần 4/8 cụ thể.             |
| `habit_building`     | Cue + môi trường + giảm friction, habit 2-phút tuần 1 để xây streak.           |
| `creative_output`    | Cadence xuất bản > chất lượng tác phẩm, ship rough tuần 1 chống perfectionism. |
| `relationship_life`  | Lịch cố định + input kiểm soát, không phụ thuộc "khi rảnh thì gặp".            |
| `other`              | Fallback generic copy — không có override.                                     |

### Ưu tiên khi ghép với SMART quality bridge

- `weak` quality suffix vẫn được append vào `scopeRecommendation` kể cả khi archetype override đang active — user yếu về quality vẫn cần nudge clarify.
- Bottleneck action generic luôn giữ; overlay note chỉ **append**, không replace.

### Backward compatibility

- Không truyền `goalArchetype` → generic copy (giống trước).
- `"other"` archetype → generic copy (giống trước).
- Scoring (adjustedScore, readinessScore, resultType, planLoad, weeklyCapacity, bottleneck.axis/score) **không đổi** với bất kỳ archetype nào.

### Infer trong runtime

`FeasibilityCheck.tsx` infer archetype từ `pending_smart_goal` đã normalize: domain + focusArea + goal_statement + metric_name + metric_unit. Inference là rule-based deterministic (không AI, không network), có thể override bằng explicit `goalType` từ 12-week setup.

## SMART Goal Quality Bridge

### Cách hoạt động

- `buildResult()` nhận optional `smartGoalQualityLevel` (weak/okay/strong)
- Nếu `weak`: thêm `smartGoalQualityNote` cảnh báo, scope recommendation thêm gợi ý clarify
- Nếu `okay` hoặc `strong` hoặc không có: không ảnh hưởng scoring

### Scoring không bị thay đổi

- `adjustedScore`, `readinessScore`, `resultType` giữ nguyên công thức
- Quality chỉ ảnh hưởng copy/guidance, không ảnh hưởng điểm số
- Backward compatible: gọi `buildResult(answers, wheelScore)` vẫn hoạt động

### Quality Note (hiển thị khi weak)

> "Mục tiêu viết chưa đủ rõ ràng. Nên quay lại bước viết mục tiêu để làm rõ kết quả cần đạt, con số đo và lý do trước khi tạo kế hoạch 12 tuần."

## Test Coverage

File: `src/app/pages/FeasibilityCheck/helpers.test.ts`

8 scenario chuẩn:

1. High capacity + clear goal → realistic
2. Low time + high ambition → too_ambitious/challenging
3. Low clarity → bottleneck clarity, khuyên thu hẹp scope
4. Low resources → bottleneck resources, khuyên preparation
5. Low confidence → lighter planLoad, tuần đầu nhẹ
6. Low life balance → wheel bottleneck, cảnh báo xung đột
7. Strong SMART goal + low capacity → challenging, không quality note
8. Weak SMART goal + high energy → realistic nhưng có quality note

Thêm:

- Quality bridge backward compat
- Scoring thresholds
- Bottleneck detection
- Copy actionable (recommendation luôn có "Trước khi tạo kế hoạch 12 tuần")
- Analytics safety (không raw text)
- Result structure completeness

## Limitations

- Scoring dựa trên self-assessment, không phải dữ liệu khách quan
- 7 câu hỏi đánh giá perception, có thể bias optimistic hoặc pessimistic
- Quality bridge chỉ ảnh hưởng copy, không ảnh hưởng scoring — có thể cần tích hợp sâu hơn nếu user testing cho thấy weak goal + realistic scoring gây hiểu lầm
- Wheel penalty là heuristic thô, cần calibrate dựa trên user data thực

## Hướng phát triển

- Tích hợp SMART quality score vào adjustedScore (nếu user testing cho thấy cần)
- Thêm dimension "goal clarity" dựa trên SMART quality thay vì chỉ self-assessment
- Lưu feasibility result vào analytics với quality_level + score_bucket
- A/B test giữa threshold hiện tại và threshold điều chỉnh
