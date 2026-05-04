# Core Coaching Copy Guide

Last updated: 2026-05-03
Audience: anyone editing visible strings in the SMART → Feasibility → 12-week setup → Today → Weekly Review → Progress flow.

This is the single source for **how the product talks**. Use it before writing new copy and when reviewing PRs that touch text.

## 1. Voice and stance

- **Coach, not judge.** Tell the user what works, never what is wrong with them.
- **Specific over inspirational.** "Tuần 1 chốt một dự án nhỏ" beats "Hãy bắt đầu mạnh mẽ".
- **Verb-first when asking for action.** "Tick việc đầu tiên" beats "Bạn nên tick việc đầu tiên".
- **Mọi câu phải gợi ra một next action**, hoặc giải thích một tín hiệu user vừa thấy. Không có câu "filler".
- **First person plural is reserved for shared work** ("Mình đang đọc lại mục tiêu..."). Otherwise use second person ("Bạn").

## 2. Length budget

| Surface | Target | Hard cap |
| --- | --- | --- |
| Step heading (h2) | 6-10 từ | 12 |
| Step description | 1 câu, 12-18 từ | 22 |
| Coaching/helper paragraph | 1 câu, dưới 22 từ | 28 |
| Empty state | 2 câu, mỗi câu ≤ 18 từ | 2 câu × 22 từ |
| CTA button | 2-5 từ | 6 |
| Toast | 1 câu, ≤ 14 từ | 18 |
| Tooltip / aria-label | 4-12 từ | 16 |

If you need more length, you are explaining a result (feasibility, progress) — split into bullet list, not paragraph.

## 3. Lead vs lag — keep them distinct

The flow has two kinds of measurement and they must not be conflated in copy.

- **Outcome / lag metric**: con số cuối chu kỳ ("5K dưới 30 phút", "8 phiên feedback", "12 deliverable IDP"). Use phrases: "kết quả 12 tuần", "chỉ số kết quả chính", "đầu ra cuối chu kỳ".
- **Lead action / lead indicator**: việc lặp lại hằng tuần để tạo nhịp ("3 buổi chạy/tuần", "1 buổi 1:1 stakeholder"). Use phrases: "việc giữ nhịp", "việc lặp lại", "lead indicator", "input bạn kiểm soát được".

Wrong: "Mục tiêu của bạn là chạy 3 buổi/tuần." (mixes the two — that's a lead, not the outcome).
Right: "Outcome 12 tuần: chạy 5K dưới 30 phút. Lead: 3 buổi chạy/tuần."

## 4. Score and risk explanations

When the app shows a score (`adjustedScore`, `readinessScore`, week completion %), the line directly under the number must say **what the user does with it**, not just what it means.

- Wrong: "Điểm sẵn sàng 14/20 nghĩa là bạn đang ở mức challenging."
- Right: "14/20 — challenging. Tuần 1 nên chốt scope tối thiểu trước khi tăng tốc."

Wrong (judgmental): "Mục tiêu của bạn quá tham vọng."
Right (specific): "Adjusted score 7/20 — cần thu nhỏ trước khi vào 12 tuần. Hạ target 0.5 band hoặc kéo dài timeline."

Wrong (vague): "Bạn đang làm tốt."
Right: "Tuần 2: 4/5 task xong, lead completion 80%. Giữ nhịp này tuần 3."

## 5. Empty states — never just "trống"

Every empty state has three lines:

1. **Tình trạng** ("Chưa có việc trong chu kỳ này")
2. **Lý do** ("Lead indicator chưa tạo task tuần 1")
3. **Next action** ("Mở tab Cài đặt → Tạo lại chu kỳ" — kèm CTA cụ thể)

Existing empty states that pass this test (keep the pattern):

- TodayTab — `todayQueue.length === 0`: tells user where to go (Tuần / Cài đặt) based on `hasPlanTasks` and `hasLeadMetrics`. Good.
- 12WeekSystem dashboard — empty state with 3-step list "Chọn lĩnh vực → Viết SMART → Chốt việc". Good.

## 6. Warning tone matrix

| Severity | Color/intent | Example phrase |
| --- | --- | --- |
| info / hint | xanh nhạt, biểu tượng nến/sparkles | "Tuần 1 nên nhẹ — cân nhắc thêm 1 việc nếu giữ nhịp tốt." |
| soft warning | hổ phách, biểu tượng tam giác | "Tuần này có 6 task — chạm trần. Nên cắt 1 việc tùy chọn." |
| hard warning | đỏ, biểu tượng cảnh báo | "Tuần 1 đang có 7 task — vượt giới hạn. Bỏ bớt 1-2 việc tùy chọn để tránh kiệt sức." |
| error | đỏ đậm, alert | "Số task tuần 1 không hợp lệ. Tạo lại chu kỳ để dashboard nhận đúng." |

Warning copy never starts with the word "Sai", "Lỗi của bạn", or "Bạn đã làm sai". Start with the situation, then the suggested action.

## 7. CTA copy patterns

| Pattern | Use when | Example |
| --- | --- | --- |
| `Verb + object` | Single primary action | "Tick việc đầu tiên", "Lưu check-in hôm nay", "Tạo kế hoạch 12 tuần" |
| `Verb + outcome` | Multi-step CTA where user needs context | "Tiếp theo: kiểm tra tính thực tế" |
| `Open destination` | Navigation only | "Mở tab Cài đặt", "Mở Plus" |
| Avoid | Vague | ❌ "OK", "Tiếp tục", "Xem thêm" (without object) |

Do NOT change these CTAs — they are referenced by smoke and tests:

- "Câu trả lời của bạn" (label)
- "Tiếp theo: kiểm tra tính thực tế"
- "Số tuần mục tiêu" (label)
- "Mốc hiện tại", "Mốc mục tiêu" (labels)
- "Thời gian mỗi tuần", "Kỹ năng cần có", "Nguồn lực hỗ trợ" (labels)
- "Lý do bạn thật sự muốn theo đuổi", "Lĩnh vực cuộc sống liên quan" (labels)
- "Con số hoặc dấu hiệu theo dõi" (label, smoke selector)
- "Tạo kế hoạch 12 tuần" (button, smoke + production)
- "Mục tiêu 12 tuần", "Tuần đầu tiên" (smoke text checks)
- "Bắt đầu Life Balance" (smoke text check)
- "Hôm nay", "Tuần", "Tiến độ", "Cài đặt" (tab labels)
- "Lưu check-in hôm nay" (button)

If you need to change one of these, update the matching test/smoke at the same time.

## 8. Forbidden phrases

- "Đừng lo" / "Không sao" — minimizing language. Replace with the specific reason it's OK.
- "Hãy mạnh mẽ", "Tin vào bản thân", "Bứt phá" — empty motivation.
- "Mục tiêu cuộc đời", "Thay đổi cuộc đời bạn", "Trở thành phiên bản tốt nhất" — marketing tone.
- "AI giúp bạn..." / "Hệ thống thông minh..." — false claim. Hệ thống là rule-based.
- "Đảm bảo thành công", "Cam kết kết quả" — overpromising.
- "Hoàn hảo", "Tối ưu" (when describing user's plan) — judgment language.
- Emoji in body copy. Keep emoji to celebration toasts only (and only when the user explicitly opted in to that style — current default is no emoji).

## 9. Per-surface conventions

### 9.1 SMART Goal Setup

- Step heading is a question to the user, not a label. ("Bạn muốn có kết quả gì?", not "Mục tiêu cụ thể")
- Helper text directly under the input is one short sentence about how to fill it, not why.
- Anti-pattern hints (archetype-aware) live in `ArchetypeHint` component, not inline. One archetype hint per step max.
- `hasOutcomeIndicator` warning copy: "Gợi ý: nên dùng động từ kết quả rõ ràng như đạt, hoàn thành, xây dựng, ra mắt hoặc chạm mốc." This is the canonical phrasing — do not soften.

### 9.2 Feasibility Check

- Result copy starts with the situation, not the verdict.
- `firstWeekGuidance` is **always** an action sentence ("Tuần 1 ..."). Never a generic "Bạn cần chuẩn bị tinh thần".
- `scopeRecommendation` says what to keep or cut, not "consider adjusting".
- `bottleneck.action` is a single imperative sentence. Archetype overlay (when present) appends one more imperative sentence.
- The 7 question stems and option text in `FeasibilityCheck/constants.ts` are tuning surface — change only with rubric review and re-tested fixtures.

### 9.3 12-week Setup

- Step labels: "Mục tiêu", "Việc lặp lại", "Tuần 1", "Chốt". 1-3 words each. Already tight.
- `lagMetricName` placeholder names the metric kind, not the goal. ("kg, bài, triệu đồng" is fine.)
- Plan load options: "Cân bằng / Nhẹ hơn / Đẩy mạnh". Do not change without updating tests + helpers.
- Week-1 preview header: "Những việc sẽ hiện ở màn Hôm nay" (when present) or "Tuần đầu nên mở bằng" (when empty). Both are correct — keep both branches.

### 9.4 Today Tab

- Card title: action noun ("Hàng việc hôm nay", "Check-in 30 giây"). Not "Today's tasks", not "Daily check-in form".
- Task status badges: "Đã chốt", "Đang trễ", "Hôm nay" — short, present tense. Do not change.
- Empty state mentions: review tab when review is due, Tuần/Settings paths otherwise.
- Reentry mode buttons inside "Cứu nhịp tuần này" — labels come from `getReentryModeLabel` helper. Keep that helper as the single source.

### 9.5 Weekly Review

- Prompts ask for **observation**, not judgment ("Tuần này bạn làm được điều gì?", not "Bạn đã đủ cố gắng chưa?").
- Workload-decision copy must distinguish "giữ nhịp / nhẹ hơn / đẩy mạnh" without judging the prior week.

### 9.6 Progress

- Number first, sentence second. ("4/5 task — lead completion 80%. Giữ nhịp tuần sau.")
- Charts have an aria-label that names the metric and the time window. ("Tiến độ tuần 1-12, lead completion %").
- No "you're behind" / "you're ahead" framing — say the gap in tasks or weeks.

## 10. Translation pitfalls

- Vietnamese tone "ạ" is too formal for this product — drop.
- "Bạn nhé" / "Bạn ơi" / "Cố lên nha" — too casual, mixes register. Stick to neutral Vietnamese.
- Acronyms (SMART, MVP, OKR, IDP, IELTS) are kept uppercase as-is. Do not translate.
- "Lead indicator" can stay English when the surrounding sentence is short ("3 lead indicator/tuần"); use "việc giữ nhịp" when explaining the concept.
- "Bottleneck" stays English in dev/QA copy, "phần yếu nhất" or "phần cần chú ý" in user-facing copy.

## 11. Copy audit checklist (for PR review)

Before approving a PR that adds or edits visible text:

- [ ] No phrase from §8 forbidden list.
- [ ] Length budgets §2 respected.
- [ ] CTA verb-first §7.
- [ ] Empty state has all 3 lines §5.
- [ ] Warning matches severity tier §6.
- [ ] Lead/lag distinction §3 preserved.
- [ ] Test/smoke selectors §7 not broken.
- [ ] No raw user data echoed in toasts or analytics text.

## 12. What NOT to change yet

The following copy is referenced by tests/smoke and changing it requires synchronizing the assertion. Do not change in pure copy passes:

- Form input labels in SMARTGoalSetup steps (see §7).
- Tab labels in 12WeekSystem ("Hôm nay", "Tuần", "Tiến độ", "Cài đặt").
- "Tạo kế hoạch 12 tuần" button.
- "Bắt đầu Life Balance" CTA on signed-out dashboard.
- "kiểm tra tính thực tế" partial CTA text.
- "Mục tiêu 12 tuần" / "Tuần đầu tiên" step headings used by `smoke-production-e2e.mjs`.
- Workload preference labels ("Cân bằng / Nhẹ hơn / Đẩy mạnh").
- Tactic type labels ("Cốt lõi", "Tùy chọn") used by Today badges.
- Mock checkout copy that signals "không thu tiền thật" — do not soften.

## 13. When to write new copy constants

Pull strings into a constants module when:

- The same string appears in 3+ files.
- A/B-style copy variants are anticipated (rare in MVP 1).
- Strings are user-facing and computed from data (use a helper, not a template literal scattered across files).

Otherwise inline JSX strings are fine — premature constants make i18n harder later.

## 14. Reference: tightening examples

Before / after pairs from this audit. Each cuts ≥ 25% length without losing meaning.

| Before | After | Saved |
| --- | --- | --- |
| "Dùng như bản nháp nếu bạn chưa biết bắt đầu từ đâu, sau đó sửa lại cho đúng đời sống của mình." | "Dùng làm bản nháp rồi sửa cho đúng đời sống bạn." | 47% |
| "Bạn sẽ rời khỏi màn này với một kết quả rõ, 2-4 việc lặp lại có lịch làm, và một tuần đầu tiên đủ nhẹ để bắt đầu ngay." | "Bạn rời màn này với một outcome rõ, 2-4 việc giữ nhịp có lịch, và tuần 1 đủ nhẹ để bắt đầu." | 25% |
| "Đây không phải là bài kiểm tra để ngăn bạn lại. Nó giúp bạn biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu để hành trình phía sau bền vững hơn." | "Giúp bạn biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu trước khi vào kế hoạch 12 tuần." | 50% (already shipped in mobile pass) |
| "Chỉ tính khung thời gian bạn thực sự có thể giữ đều mỗi tuần." | "Chỉ đếm thời gian bạn giữ được đều — không phải lúc lý tưởng." | similar length, more specific |
| "Chọn một chỉ số đủ rõ để bạn biết mình đang tiến lên hay đứng yên." | "Chọn chỉ số đo được — tăng hay đứng yên phải nhìn ra ngay." | 15% |

These have been applied. See [PR diff] for code locations.
