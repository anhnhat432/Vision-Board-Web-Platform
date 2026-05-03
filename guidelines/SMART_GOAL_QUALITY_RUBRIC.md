# SMART Goal Quality Rubric v1

Module: `src/lib/smart-goal/quality.ts`

## Mục đích

Đánh giá chất lượng một SMART Goal trước khi chuyển sang Feasibility Check.
App không chặn user, chỉ cảnh báo và gợi ý cải thiện.

## Tổng quan

| Trường          | Mô tả                                                              |
| --------------- | ------------------------------------------------------------------- |
| `overallScore`  | 0–100, tổng các dimension scores                                   |
| `level`         | `weak` (0–39), `okay` (40–69), `strong` (70–100)                   |
| `dimensions`    | Mảng 8 dimension scores                                            |
| `warnings`      | Các vấn đề nghiêm trọng cần lưu ý                                 |
| `suggestions`   | Gợi ý cải thiện không bắt buộc                                     |
| `canProceedToFeasibility` | `true` nếu goal có câu mục tiêu + target value + score ≥ 20 |

## 8 Dimensions

### 1. Specificity (0–15 điểm)
Đánh giá câu mục tiêu (goal_statement).

| Tiêu chí                         | Điểm |
| --------------------------------- | ----- |
| Dài ≥ 20 ký tự                   | +5    |
| Có động từ kết quả (outcome verb) | +5    |
| Đủ chi tiết (≥ 8 từ)             | +5    |

### 2. Measurable Clarity (0–15 điểm)
Đánh giá chỉ số đo lường.

| Tiêu chí                  | Điểm |
| -------------------------- | ----- |
| Có tên chỉ số (metric)    | +5    |
| Có mốc đích (target) > 0  | +5    |
| Có đơn vị đo (metric_unit)| +5    |

### 3. Baseline/Target Quality (0–10 điểm)
Đánh giá chất lượng mốc đầu – mốc đích.

| Tiêu chí                   | Điểm |
| --------------------------- | ----- |
| Có target hợp lệ           | +3    |
| Có baseline                 | +4    |
| Target > baseline           | +3    |

### 4. Achievable Realism (0–15 điểm)
Đánh giá tính thực tế về thời gian cam kết.

| Tiêu chí                         | Điểm |
| --------------------------------- | ----- |
| Có cam kết giờ/tuần > 0          | +5    |
| Mức hợp lý (≤ 25h: +5, ≤ 40h: +3, > 40h: +1) | +1–5  |
| Tổng thời gian phù hợp mục tiêu  | +2–5  |

### 5. Resource/Support Clarity (0–10 điểm)
Đánh giá nguồn lực và hỗ trợ.

| Tiêu chí                        | Điểm |
| -------------------------------- | ----- |
| Có ≥ 1 kỹ năng (required_skills)| +5    |
| Có ≥ 1 nguồn hỗ trợ             | +5    |

### 6. Relevance/Motivation Strength (0–15 điểm)
Đánh giá sức mạnh lý do theo đuổi.

| Tiêu chí                               | Điểm |
| --------------------------------------- | ----- |
| Lý do ≥ 15 ký tự                       | +5    |
| Đủ chi tiết (≥ 6 từ)                   | +5    |
| Có gắn lĩnh vực cuộc sống (alignment)  | +5    |

### 7. Time-Bound Clarity (0–10 điểm)
Đánh giá mốc thời gian.

| Tiêu chí                                 | Điểm |
| ----------------------------------------- | ----- |
| Có số tuần hoặc ngày đích                | +5    |
| Số tuần trong vùng hợp lý (4–24 tuần)    | +5    |

### 8. Twelve-Week Compatibility (0–10 điểm)
Đánh giá tương thích với hệ thống 12 tuần.

| Tiêu chí                                  | Điểm |
| ------------------------------------------ | ----- |
| Target weeks trong sweet spot (8–16 tuần)  | +6 (4–24: +4, ngoài: +1) |
| Tổng giờ cam kết hợp lý trong chu kỳ      | +4    |

## Nguyên tắc thiết kế

1. **Không chặn flow**: `canProceedToFeasibility` rất dễ đạt (chỉ cần goal statement + target + score ≥ 20).
2. **Warnings vs Suggestions**: Warnings là vấn đề nghiêm trọng (thiếu dữ liệu quan trọng). Suggestions là gợi ý cải thiện.
3. **Không gọi AI bên ngoài**: Toàn bộ logic là rule-based, chạy offline.
4. **Không gửi dữ liệu ra ngoài**: Không tracking goal text, không analytics cho nội dung mục tiêu.
5. **Không đổi storage schema**: Module chỉ đọc `SmartGoal`, không persist kết quả.

## API

```typescript
evaluateSmartGoalQuality(goal: SmartGoal): SmartGoalQualityResult
getSmartGoalQualityScore(goal: SmartGoal): number
getSmartGoalQualityWarnings(goal: SmartGoal): string[]
getSmartGoalImprovementSuggestions(goal: SmartGoal): string[]
```

## Limitations

- **Không phân tích ngữ nghĩa sâu**: Rubric dựa trên heuristic (độ dài, word count, outcome verb pattern). Không phát hiện được mục tiêu "dài nhưng vô nghĩa".
- **Outcome indicator chỉ cover một số pattern**: Dựa trên regex có sẵn trong `hasOutcomeIndicator`. Có thể miss các cách diễn đạt mới.
- **Baseline/target ratio không thể đánh giá domain-specific**: Không biết "5.5 → 7.0 IELTS" khó hơn "5 → 10 dự án" bao nhiêu.
- **Không đánh giá tính conflict giữa các goal**: Module chấm từng goal độc lập.
- **Time-bound date mode**: Không so sánh target_date với ngày hiện tại (tránh coupling với clock).
- **Language bias**: Heuristic word count và outcome verb được tối ưu cho tiếng Việt và tiếng Anh cơ bản.

## Hướng phát triển

- Tích hợp vào ReviewStep UI (hiển thị score + warnings) — cần product decision.
- Mở rộng outcome verb pattern khi có thêm dữ liệu user thật.
- Thêm dimension "goal conflict" khi hỗ trợ multi-goal.
- Export quality result vào feasibility check input (nếu product muốn liên kết).
