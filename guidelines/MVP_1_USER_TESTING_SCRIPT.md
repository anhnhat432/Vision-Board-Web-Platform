# MVP 1 User Testing Script

Prepared: 2026-04-30

Purpose: run lightweight user testing for the MVP 1 public demo without promising cloud sync, real payment, or production account recovery.

## 1. Test Goals

The test should answer:

- Can a new visitor understand what the app does within 30 seconds?
- Can they move from a broad life priority to a usable 12-week plan?
- Can they tell what they should do today after creating the plan?
- Do Today, daily check-in, Week review, and Progress feel useful enough to revisit?
- Does mock upgrade feel clearly simulated and trustworthy?
- Which step causes the most confusion or drop-off?

This is not a test of real billing, cloud sync, backend reliability, or long-term retention across devices.

## 2. Who Should Test

Recruit 5-8 people from these groups:

- People who currently have a personal goal they want to make progress on.
- People who have used planners, Notion, todo apps, habit trackers, journals, or goal-setting templates.
- People who often start goals but abandon them after a few days or weeks.

Avoid only testing with engineers or people who already know the project. The best tester is someone who can judge whether the flow makes sense without product context.

## 3. How To Send The Demo Link

Send one short message with the link and expectations:

```text
Mình đang test một bản demo giúp biến một mục tiêu cá nhân thành kế hoạch hành động 12 tuần. Bạn thử đi từ trang đầu tới phần "Hôm nay", tick một task, check-in ngắn, xem tiến độ và gửi feedback giúp mình nhé.

Link demo: <DEMO_URL>

Mất khoảng 15-25 phút. Bạn không cần đăng nhập.
```

If the current production URL has not passed deploy smoke yet, send a preview URL only after it has been verified. Do not send a URL known to be stale or signup-gated.

## 4. Short Disclaimer For Testers

Say this before the test, and include it in the message if possible:

```text
Đây là bản demo local-first. Dữ liệu bạn nhập được lưu trên trình duyệt/thiết bị hiện tại, không phải cloud sync hoàn chỉnh. Mock checkout không thu tiền thật. Đừng nhập thông tin nhạy cảm, bí mật công việc, dữ liệu tài chính, y tế, hoặc thông tin cá nhân của người khác.
```

## 5. Tester Task List

Ask the tester to share their screen if possible. Do not coach them unless they are blocked for more than 2 minutes.

1. Open the app from the demo link.
2. Spend 30 seconds on the first screen and say what they think the app helps them do.
3. Start the demo without logging in.
4. Create or choose one personal goal they are comfortable using for a demo.
5. Go through Life Balance if the flow asks for it.
6. Continue to Life Insight and choose the area to focus on.
7. Complete SMART Goal setup.
8. Complete Feasibility Check.
9. Create a 12-week plan.
10. Open the 12-week system.
11. In the Today tab, explain what they think they should do next.
12. Tick one task as complete.
13. Save a daily check-in.
14. Open Progress and say whether the progress view is understandable.
15. Open Week review and say what they would write at the end of the week.
16. Try opening a paywall or mock checkout path.
17. Confirm they understand mock checkout does not charge real money.
18. Submit feedback through the feedback form.
19. Refresh the page and confirm whether their local plan still appears on the same browser/device.

Optional mobile task:

- Repeat the first 5 minutes on a phone or mobile viewport and note where scrolling or text density feels hard.

## 6. Questions After The Test

Ask these after the tester finishes. Let them answer in their own words first.

1. Bạn hiểu app này giúp gì không?
2. Bước nào khó hiểu nhất?
3. Bạn có tin plan 12 tuần này dùng được không? Vì sao?
4. Khi vào tab Hôm nay, bạn có biết hôm nay cần làm gì không?
5. Bạn có quay lại ngày mai để tick task hoặc check-in không?
6. Bạn có trả tiền cho phần nào không? Nếu có, phần nào tạo đủ giá trị?
7. Có chỗ nào khiến bạn lo dữ liệu bị mất hoặc bị gửi đi không?
8. Mock checkout có đủ rõ là không thu tiền thật không?
9. Nếu chỉ được sửa một thứ trước khi public rộng hơn, bạn muốn sửa gì?

## 7. Scoring Rubric

Score each dimension from 1 to 5.

| Dimension | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Activation | Cannot start without help. | Starts after some confusion. | Starts demo confidently without login. |
| Clarity | Cannot explain what the app does. | Understands the broad idea but misses steps. | Clearly understands the flow and next action. |
| Trust | Worried about payment/data or feels misled. | Understands most disclaimers after reading. | Confident it is local/mock and safe enough for demo. |
| Usefulness | Plan feels generic or unusable. | Some useful tasks, but needs editing. | Plan feels actionable for the next week. |
| Return intent | Would not come back. | Might return if reminded. | Wants to return tomorrow or this week. |
| Willingness to pay | No paid value perceived. | Would pay only after sync/reminders improve. | Names a specific Plus/premium value they would pay for. |

Suggested pass signal:

- Average score 4+ on Activation and Clarity.
- Average score 3.5+ on Usefulness.
- At least 3 of 5 testers say they would return tomorrow or this week.
- No tester believes mock checkout charged real money.

## 8. How To Summarize Feedback

After each session, record notes within 10 minutes.

Summarize by grouping feedback into:

- Drop-off point: where the tester slowed down, hesitated, or asked for help.
- Confusing copy: exact phrase or screen that caused misunderstanding.
- Missing trust signal: local storage, mock checkout, no login, or data privacy concern.
- Plan quality issue: task overload, vague tactics, unrealistic schedule, weak Today action.
- Useful moment: where the tester said "this helps" or understood the next step.
- Payment signal: what they would pay for, if anything.
- Return signal: whether they would come back tomorrow and why.

Use tags for quick analysis:

- `activation`
- `copy`
- `mobile`
- `plan_quality`
- `today_tab`
- `weekly_review`
- `progress`
- `mock_billing`
- `local_data_trust`
- `feedback_form`

## 9. Decision Rules

Use these rules after 5-8 tester sessions.

Polish UX before more features when:

- Testers can finish the flow but repeatedly misunderstand button labels, step order, local storage, or mock checkout.
- Activation or Clarity average is below 4.
- Testers say the app is useful only after the moderator explains it.

Improve plan quality before more features when:

- Testers complete setup but do not trust the generated 12-week plan.
- Today tab does not clearly answer "what should I do today?"
- Multiple testers say tasks are too many, too vague, or not matched to their time budget.

Prioritize cloud sync when:

- Testers find the core loop useful and say they would return.
- The main trust blocker is "I do not want to lose this plan" or "I need this on another device."
- They understand local-first limitations but want account recovery.

Prioritize real billing only when:

- Testers can name a specific paid value, such as better templates, review insights, reminders, or multi-device recovery.
- Mock checkout is understood as simulated.
- Core flow and local data trust are already strong.

Do not add features when:

- Testers cannot explain the core value.
- Testers are blocked before reaching Today.
- The main problem is copy, ordering, mobile scrolling, or plan overload.
- A new feature would distract from validating the 12-week execution loop.

## 10. Tester Note Template

Use one copy of this template per tester.

```markdown
## Tester

- Date:
- Tester profile:
- Device/browser:
- Demo URL:
- Session length:
- Moderator:

## Pre-Test Context

- Has a current personal goal? Yes / No
- Uses planner/Notion/todo/habit app? Yes / No
- Often drops goals? Yes / No

## Task Completion

- Opened app:
- Understood app in 30 seconds:
- Started demo without login:
- Completed Life Balance:
- Completed Life Insight:
- Created SMART Goal:
- Completed Feasibility:
- Created 12-week plan:
- Opened Today tab:
- Ticked one task:
- Saved daily check-in:
- Viewed Progress:
- Opened Week review:
- Opened mock checkout/paywall:
- Understood mock checkout is not real payment:
- Submitted feedback:
- Refresh persistence worked:

## Scores

- Activation (1-5):
- Clarity (1-5):
- Trust (1-5):
- Usefulness (1-5):
- Return intent (1-5):
- Willingness to pay (1-5):

## Observations

- First 30-second explanation in tester's words:
- Biggest confusion:
- Most useful moment:
- Point of hesitation/drop-off:
- Data/payment trust concern:
- Plan quality comment:
- Today tab comment:
- Weekly review/progress comment:
- Would return tomorrow? Why:
- Would pay for what:

## Quotes

- Quote 1:
- Quote 2:
- Quote 3:

## Researcher Summary

- Main issue to fix:
- Severity: Low / Medium / High
- Recommended next action:
- Tags:
```
