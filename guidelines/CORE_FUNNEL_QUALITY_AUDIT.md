# Core Funnel Quality Audit

Document mô tả **chất lượng output thực tế** cần kiểm tra ở mỗi bước core funnel,
song song với các smoke test "route mở được" hiện có.

## Mục tiêu

Đảm bảo mỗi bước trong funnel không chỉ **render mà sản sinh dữ liệu có nghĩa**
trước khi user đi tiếp. Ngăn các regression dạng "form submit thành công nhưng
output rỗng / thiếu trường".

## Funnel + Quality Bars

| Bước | Output có nghĩa cần có | Cách verify |
|---|---|---|
| **SMART Goal** | `specific.goal_statement` ≥ 1 ký tự, `measurable.metric_name` không trống, `measurable.target > 0`, `measurable.metric_unit` không trống, `time_bound.target_weeks > 0` | `pending_smart_goal` trong localStorage |
| **Feasibility** | `resultType` ∈ `{realistic, challenging, too_ambitious}`, `recommendation` ≥ 20 ký tự, `adjustedScore` hữu hạn | `pending_feasibility_result` trong localStorage |
| **12-week Plan** | `vision12Week` hoặc `week12Outcome` không trống, `lagMetric.target` không trống, `leadIndicators.length ≥ 2`, `taskInstances` chứa ≥ 1 task tuần 1, ít nhất một trong `milestones.week4/week8/week12` không trống, `reviewDay` không trống | `goals[*].twelveWeekSystem` trong `visionboard_user_data` |
| **Today tab** | Element `[data-testid="today-primary-hero"]` tồn tại với text non-empty, gợi ý "việc quan trọng nhất hôm nay" hoặc tương đương | DOM query |
| **Toggle task** | `taskInstances` có ít nhất 1 `completed === true` sau khi click checkbox | Snapshot `completedTaskCount ≥ 1` |
| **Daily check-in** | `dailyCheckIns[0]?.optionalNote` matches input đã type | Snapshot `dailyCheckInCount ≥ 1` |
| **Weekly review** | `weeklyReviews[*].biggestOutputThisWeek` matches input + summary card render | Snapshot + DOM `[data-testid="weekly-review-summary"]` |
| **Progress tab** | Element `[data-testid="progress-trend-hero"]` non-empty + có "Tiếp theo:" hoặc reference tới tab khác | DOM query |

## Smoke scripts

### `npm run smoke:mvp1`
- **Mục đích**: kiểm tra route + happy path từ signed-out → 12-week-system
- **Phạm vi**: structural (route mở được, button click được, basic seed → toggle/check-in/review)
- **Hạn chế**: không assert content quality của SMART/feasibility/plan output

### `npm run smoke:core-quality` (mới)
- **Mục đích**: kiểm tra **semantic output** ở mỗi bước
- **Phạm vi**:
  - Seed deterministic `pending_smart_goal` + `pending_feasibility_result` + `twelveWeekSystem`
  - Hydrate `/12-week-system` rồi assert toàn bộ Quality Bars trong bảng trên
  - Toggle task → check-in → review → mở Progress tab → assert hero
- **Phụ thuộc**:
  - Local dev server (`npm run dev`) ở `http://localhost:5173` (override bằng `CORE_QUALITY_URL`)
  - `agent-browser` stack (đã có sẵn từ smoke:mvp1)
- **Không phụ thuộc**:
  - Backend / Firebase
  - Payment provider
  - Production URL
- **Override env**:
  - `CORE_QUALITY_URL` — URL local server
  - `CORE_QUALITY_SESSION` — session id để debug song song

## Test IDs đã thêm cho assertions

Các test ID dưới đây được thêm trong các task UX gần đây và **được smoke
core-quality dựa vào**. Khi refactor UI, không xóa các id này nếu không update
script tương ứng:

| `data-testid` | File | Mục đích |
|---|---|---|
| `today-primary-hero` | `TwelveWeekTodayTab.tsx` | Hero "Việc quan trọng nhất hôm nay" |
| `today-primary-done-nudge` | `TwelveWeekTodayTab.tsx` | Nudge "Việc chính đã xong" |
| `today-empty-state` | `TwelveWeekTodayTab.tsx` | Empty state CTA |
| `weekly-review-summary` | `TwelveWeekWeekTab.tsx` | Card summary sau khi save review |
| `weekly-score-interpretation` | `TwelveWeekWeekTab.tsx` | Narrative card cho execution score |
| `progress-trend-hero` | `TwelveWeekProgressTab.tsx` | Hero "Trạng thái nhịp tuần này" |

Ngoài testid, smoke vẫn tận dụng id sẵn có (`#smart-specific`, `#weekly-best`,
`#weekly-keep`, `#weekly-reduce`, `#daily-note`...) và `data-tour-id` (e.g.
`system-today-queue`).

## Khi smoke fail nên check gì

1. **SMART/feasibility seed lỗi** → kiểm tra schema match với types ở
   `src/lib/smart-goal/types.ts` + `src/app/pages/FeasibilityCheck/types.ts`.
2. **`twelveWeekSystem` missing leadIndicators / week-1 tasks** → kiểm tra
   `storage-twelve-week.ts` migration logic, đặc biệt `buildTaskInstances`.
3. **Today hero không render** → có thể `firstPriorityTask === null` (mọi task
   đã completed). Smoke seed tạo 2 task không completed nên đây là regression.
4. **Weekly review summary không render** → kiểm tra `currentReview?.reviewCompleted`
   và prop `currentReview` được pass xuống `TwelveWeekWeekTab` từ `12WeekSystem.tsx`.
5. **Progress hero không render** → kiểm tra `interpretProgressTrend` import +
   `hasAnyTasks` logic không filter quá tay.

## Limitations (smoke:core-quality)

- **Không exercise full SMART wizard UI**: test seed trực tiếp localStorage để
  deterministic. Smoke `mvp1` vẫn test full UI wizard (khi `MVP1_SMOKE_FULL_UI=true`).
- **Không kiểm tra analytics payload**: smoke không đăng ký telemetry sink. Để
  verify analytics, dùng unit tests cho `analytics.ts` allowlist.
- **Không kiểm tra mobile viewport**: chạy ở viewport mặc định của agent-browser.
  Mobile responsive cần task riêng.
- **Test ID phụ thuộc UI**: nếu rename test ID, smoke sẽ fail. Document đã list
  toàn bộ test ID quan trọng để giảm rủi ro.
- **Reviewday cố định**: seed dùng `reviewDay: "Sunday"` — nếu logic feasibility
  default thay đổi, có thể cần update seed.

## Khi nào chạy

| Tình huống | Smoke nên chạy |
|---|---|
| PR sửa core funnel UI | `smoke:mvp1` + `smoke:core-quality` |
| PR sửa storage / mutation queue | `smoke:core-quality` (catches semantic regressions) |
| Pre-release MVP | `npm run check` + `smoke:mvp1` + `smoke:core-quality` |
| PR billing / sync | `smoke:mvp2-sync` (separate scope) |

## Output kỳ vọng (success run)

```
[core-quality] Target: http://localhost:5173
[core-quality] ▶ Reset browser session
[core-quality] ▶ Open and clear local storage
[core-quality] ▶ Seed deterministic SMART + Feasibility + 12-week system
[core-quality] ▶ Reload to hydrate seeded state
[core-quality] ▶ Read funnel snapshot
[core-quality] ▶ Assert SMART goal carries metric/target/time
[core-quality] ✓ SMART goal: ... → 12 weeks in 12 weeks
[core-quality] ▶ Assert feasibility result has recommendation
[core-quality] ✓ Feasibility: realistic (18/20) — recommendation len=...
[core-quality] ▶ Assert 12-week plan output is meaningful
[core-quality] ✓ 12-week plan: 2 lead indicators, 2 week-1 tasks, review on Sunday
[core-quality] ▶ Assert Today primary task hero
[core-quality] ✓ Today primary hero rendered: ...
[core-quality] ▶ Toggle the first Today task
[core-quality] ✓ Today task toggle persisted to localStorage
[core-quality] ▶ Save daily check-in
[core-quality] ✓ Daily check-in persisted with the smoke note
[core-quality] ▶ Save weekly review with new fields
[core-quality] ✓ Weekly review saved + summary card rendered
[core-quality] ▶ Assert Progress trend hero + next action
[core-quality] ✓ Progress trend hero rendered with next-action: ...
[core-quality] ✅ Core funnel quality smoke passed
```
