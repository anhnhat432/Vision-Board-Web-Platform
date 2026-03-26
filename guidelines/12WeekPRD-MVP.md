# PRD / MVP Plan: Hệ 12 Tuần Cho Vision Board Web Platform

Tài liệu này được xây từ:

- [deep-research-report.md](C:/Users/admin/Downloads/deep-research-report.md)
- [12WeekTechnicalBacklog.md](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/guidelines/12WeekTechnicalBacklog.md)

Mục tiêu của tài liệu là biến hướng nghiên cứu và backlog kỹ thuật thành một `PRD/MVP plan` có thể đưa vào triển khai theo sprint.

## 1. Product Summary

`12-week system` là lớp thực thi trung tâm của sản phẩm, giúp người dùng:

- Chuyển mục tiêu thành vài tactics rõ ràng.
- Biết chính xác hôm nay nên làm gì.
- Theo dõi điểm tuần và review tuần.
- Nhận nhắc việc và rescue flow khi rơi nhịp.
- Có lý do nâng cấp khi muốn template tốt hơn, insight tốt hơn, và nhắc việc mạnh hơn.

Định vị sản phẩm:

- Không chỉ là `vision board`.
- Không chỉ là `goal tracker`.
- Đây là `execution system` bám theo chu kỳ 12 tuần.

## 2. Mục tiêu sản phẩm

### Mục tiêu người dùng

- Trong 5 phút đầu, người dùng phải tạo được một kế hoạch đủ để bắt đầu tuần 1.
- Trong 1-3 ngày đầu, người dùng phải thấy rõ “hôm nay tôi làm gì”.
- Trong tuần đầu, người dùng phải hiểu `điểm tuần` và `review tuần`.
- Khi người dùng rơi nhịp, app phải kéo họ quay lại bằng một việc nhỏ, không tạo cảm giác thất bại.

### Mục tiêu kinh doanh

- Tạo một luồng `free -> paid` tự nhiên, dựa trên giá trị thật.
- Chuyển premium từ “khóa UI” sang “khác biệt về chất lượng hệ thống”.
- Tạo đủ event và billing foundation để sau này tối ưu conversion bằng A/B test.

### North Star cho MVP

- Tăng tỷ lệ người dùng mới tạo xong chu kỳ 12 tuần.
- Tăng tỷ lệ người dùng quay lại hoàn thành check-in/review tuần đầu.
- Tạo được ít nhất 1 đường upgrade tự nhiên từ `template` hoặc `weekly review`.

## 3. Giả định hiện tại

Các giả định đang dùng cho MVP vì repo hiện chưa có đầy đủ dữ liệu thị trường:

- Người dùng chính là nhóm tự phát triển bản thân, học tập, công việc, sức khỏe.
- Thiết bị chính là mobile web và desktop web.
- Payment provider chưa chốt.
- Push/email sẽ được thiết kế dưới dạng adapter, chưa khóa vào một vendor cụ thể.
- Giai đoạn MVP ưu tiên `local-first + backend contract`, chưa bắt buộc production backend đầy đủ cho mọi thứ trong lượt đầu.

## 4. User Segments

### Segment 1: Người muốn bắt đầu nhanh

Đặc điểm:

- Có mục tiêu nhưng chưa có hệ thực thi.
- Dễ bị quá tải khi lập kế hoạch.
- Cần template và setup ngắn.

Kỳ vọng:

- Tạo plan trong vài phút.
- Không phải nghĩ quá nhiều.

### Segment 2: Người đã từng bỏ nhịp

Đặc điểm:

- Từng dùng habit tracker hoặc planner nhưng bỏ dở.
- Cần nhắc việc và rescue flow nhẹ nhàng.

Kỳ vọng:

- App giúp quay lại dễ dàng khi lỡ vài ngày.
- Không bị guilt-trip.

### Segment 3: Người nghiêm túc với tiến độ

Đặc điểm:

- Muốn dashboard, score, review, analytics.
- Sẵn sàng trả tiền cho template và insight tốt hơn.

Kỳ vọng:

- Biết tactic nào hiệu quả.
- Biết tuần nào đang có rủi ro rơi nhịp.

## 5. Value Proposition

### Free

“Đủ để bắt đầu một chu kỳ 12 tuần và hiểu cách hệ thống vận hành.”

### Plus

“Giúp bạn giữ nhịp tốt hơn và có kế hoạch đúng hơn.”

### Pro

“Giúp bạn tối ưu chiến lược thực thi bằng insight, analytics và accountability mạnh hơn.”

## 6. Package Design

## Free

Phạm vi:

- 1 active 12-week cycle.
- Setup 4 bước.
- Today queue từ task instances.
- Daily check-in cơ bản.
- Weekly review cơ bản.
- Scoreboard cơ bản.
- In-app reminders.
- Reflection liên kết với weekly review.

Không bao gồm:

- Premium templates.
- Multi-channel reminders.
- Premium analytics.
- Export report nâng cao.
- Multi-cycle entitlement.

## Plus

Phạm vi:

- Nhiều chu kỳ hơn hoặc nhiều plan song song hơn.
- Premium templates.
- Push/email reminders.
- Rescue flow nâng cao.
- Trend / risk insights cơ bản.
- Calendar sync và reminder scheduling sâu hơn.

## Pro

Phạm vi:

- Tactic-level analytics.
- Risk dashboard sâu hơn.
- Recommendation / suggested adjustment.
- Export báo cáo.
- Group / workshop / accountability nếu giai đoạn sau mở rộng.

## 7. MVP Scope

## Trong scope MVP

- Entitlement model cho `FREE`, `PLUS`, `PRO`, `SEASON_PASS`.
- Paywall surface dùng chung.
- Premium template catalog.
- Một đường upgrade từ `template`.
- Một đường upgrade từ `weekly review`.
- Event taxonomy cho funnel chính.
- dataLayer / analytics adapter.
- Billing adapter abstraction.
- Outbox sync contract thật.
- Browser notification và email/push contract ở mức có thể nối backend.
- Accessibility pass cho flow `12-week`.

## Ngoài scope MVP

- Workshop/community thật.
- Affiliate monetization.
- AI coaching sâu.
- Forecasting phức tạp.
- Offline-first hoàn chỉnh với background sync production.
- Nhiều pricing experiments chạy song song ở quy mô lớn.

## 8. MVP User Flows

## Flow A: New user -> Free activation

1. User vào app.
2. Hoàn thành setup hoặc onboarding ngắn.
3. Tạo 12-week plan trong 4 bước.
4. Vào `Today`.
5. Chốt ít nhất 1 task.
6. Thấy `điểm tuần` và `review day`.

Success criteria:

- User tạo được plan.
- User hiểu hôm nay làm gì.

## Flow B: Free -> Paid qua premium template

1. User vào `12WeekSetup`.
2. Chạm template premium.
3. Xem preview template.
4. Gặp paywall đúng ngữ cảnh.
5. Checkout.
6. Quay lại setup với entitlement đã mở.

Success criteria:

- User hiểu vì sao template premium đáng tiền.
- Entitlement mở đúng sau checkout.

## Flow C: Free -> Paid qua weekly review insight

1. User hoàn thành tuần đầu.
2. Vào weekly review.
3. Thấy summary cơ bản.
4. Chạm `premium insight` hoặc `risk score`.
5. Gặp paywall.
6. Checkout.
7. Quay lại thấy insight đầy đủ.

Success criteria:

- Upgrade xảy ra từ hành vi có intent cao.
- Không hard-block flow review miễn phí.

## Flow D: Rescue -> Reminder upsell

1. User bỏ lỡ 2-3 ngày.
2. App hiện rescue flow.
3. User thấy tùy chọn nhẹ nhàng để quay lại.
4. App gợi ý nhắc việc mạnh hơn.
5. Nếu user muốn, mở paywall `reminders`.

Success criteria:

- Rescue flow không làm user bỏ luôn.
- Reminder upsell gắn đúng nỗi đau.

## 9. Core Screens

## Screen 1: Setup

File hiện tại bám vào:

- `src/app/pages/12WeekSetup.tsx`

MVP cần có thêm:

- Free template vs premium template picker.
- Preview ngắn cho template.
- Premium template gating.
- Tracking cho template selection và paywall exposure.

## Screen 2: Today

File hiện tại bám vào:

- `src/app/pages/12WeekSystem.tsx`
- `src/app/components/TwelveWeekSystemSections.tsx`

MVP cần có thêm:

- Reminder surface rõ hơn.
- Rescue flow log được event.
- Tín hiệu premium nhẹ nếu user thường xuyên lỡ nhịp.

## Screen 3: Weekly Review

File hiện tại bám vào:

- `src/app/components/TwelveWeekSystemSections.tsx`
- `src/app/pages/ReflectionJournal.tsx`

MVP cần có thêm:

- Insight teaser cho free.
- Insight thật cho paid.
- CTA nâng cấp bám đúng ngữ cảnh review.

## Screen 4: Billing / Plan

Chưa có màn riêng trong repo hiện tại.

MVP cần có:

- Gói hiện tại.
- Trial end date.
- Entitlements đang có.
- CTA nâng cấp / quản lý gói.
- Trạng thái thanh toán gần nhất.

## 10. Functional Requirements

## Entitlements

- Hệ thống phải đọc được plan hiện tại của user.
- Hệ thống phải xác định được user có quyền dùng premium template hay không.
- Hệ thống phải xác định được user có quyền xem premium insights hay không.
- Hệ thống phải xác định được user có quyền bật multi-channel reminders hay không.

## Paywall

- Phải hỗ trợ nhiều placement:
  - `template`
  - `review`
  - `insight`
  - `reminder`
- Phải có CTA chính và secondary CTA `tiếp tục free`.
- Phải nhận context để đổi copy.

## Billing

- UI không gọi Stripe hoặc provider trực tiếp.
- Billing phải đi qua adapter/service layer.
- Entitlements phải được khôi phục sau login/refresh.

## Analytics

- Phải log tối thiểu các event:
  - `tutorial_begin`
  - `tutorial_complete`
  - `plan_created`
  - `task_completed`
  - `weekly_review_submitted`
  - `paywall_view`
  - `paywall_cta_click`
  - `begin_checkout`
  - `purchase`
- Phải hỗ trợ dataLayer contract.

## Reminder

- Free dùng in-app reminder.
- Paid có thể bật push/email nếu đã cấp quyền và có entitlement.
- Rescue flow phải dùng cùng hệ event và scheduling.

## 11. Non-Functional Requirements

- Flow `Today` không được chậm rõ rệt sau khi thêm monetization layer.
- Nếu backend billing/reminder lỗi, free flow vẫn phải dùng được.
- Paywall không được làm crash flow setup hoặc weekly review.
- Dữ liệu local phải có đường export/xóa cơ bản.
- Các màn chính phải pass keyboard navigation cơ bản và focus visible.

## 12. Success Metrics

## Activation

- Tỷ lệ `tutorial_begin -> plan_created`
- Thời gian từ vào setup đến tạo xong plan
- Tỷ lệ user chạm `Today` trong ngày đầu

## Engagement

- Tỷ lệ user hoàn thành ít nhất 1 task trong tuần đầu
- Tỷ lệ submit daily check-in
- Tỷ lệ submit weekly review

## Monetization

- `paywall_view -> paywall_cta_click`
- `paywall_cta_click -> begin_checkout`
- `begin_checkout -> purchase`
- Conversion theo placement: `template`, `review`, `reminder`

## Retention

- Tỷ lệ user quay lại ở tuần 2
- Tỷ lệ rescue flow thành công
- Tỷ lệ user paid còn active sau 1 chu kỳ

## 13. Rollout Plan

### Phase 1: Instrumentation + Foundation

- Chốt entitlement domain.
- Chốt analytics taxonomy.
- Chốt billing adapter contract.
- Chưa bật paywall thật cho toàn bộ user.

### Phase 2: Premium Template MVP

- Ra premium template catalog.
- Mở paywall placement đầu tiên tại setup.
- Bắt đầu đo funnel.

### Phase 3: Review Insight MVP

- Ra premium insight teaser và full insight.
- Mở paywall placement thứ hai ở weekly review.

### Phase 4: Reminder / Rescue Monetization

- Mở paid reminder path.
- Thêm rescue automation và premium reminder upgrade.

## 14. Rủi ro chính

- Làm premium quá sớm khiến free user không thấy giá trị cốt lõi.
- Làm paywall quá nặng ở setup làm giảm activation.
- Chưa có entitlement foundation mà đã gắn nhiều gating ad-hoc vào UI.
- Event taxonomy không ổn làm hỏng đo lường và A/B test.
- Reminder production đi quá nhanh khi chưa có fallback UX tốt.

## 15. Quyết định sản phẩm cần chốt sau PRD này

Các quyết định còn mở:

- Chốt pricing thật cho `Plus` và `Pro`.
- Chốt billing provider đầu tiên.
- Chốt có dùng `trial`, `reverse trial`, hay `freemium-only` ở MVP.
- Chốt payment method ưu tiên cho thị trường đầu tiên.
- Chốt scope `Plus` vs `Pro` có cần tách ngay ở MVP hay chỉ ra `Free + Premium`.

## 16. Đề xuất triển khai sau PRD

Sau tài liệu này, bước tiếp theo hợp lý nhất là:

1. Làm `gap analysis`: báo cáo nghiên cứu vs code hiện tại.
2. Chuyển `Phase 1` thành sprint tickets thật.
3. Bắt đầu từ:
   - entitlement domain
   - analytics taxonomy
   - paywall surface

