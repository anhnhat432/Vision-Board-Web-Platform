# Gap Analysis: Báo Cáo Nghiên Cứu vs Code Hiện Tại

Thời điểm đánh giá: `2026-03-26`

Tài liệu đối chiếu:

- [deep-research-report.md](C:/Users/admin/Downloads/deep-research-report.md)
- [12WeekTechnicalBacklog.md](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/guidelines/12WeekTechnicalBacklog.md)
- [12WeekPRD-MVP.md](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/guidelines/12WeekPRD-MVP.md)

## 1. Kết luận nhanh

Repo hiện tại đã làm rất tốt phần `execution system` của hệ 12 tuần, nhưng mới chỉ ở mức `local-first product core`.

Nói ngắn gọn:

- Phần `thực thi` đã có nền vững.
- Phần `monetization` gần như chưa bắt đầu thật.
- Phần `analytics production`, `billing`, `entitlements`, `premium templates`, `paywall`, `email/push thật` vẫn là khoảng trống chính.

Nếu so với báo cáo nghiên cứu, codebase hiện tại đang mạnh ở:

- trải nghiệm `today-first`
- weekly execution
- review flow
- local reminder/outbox
- local funnel tracking

Và đang yếu ở:

- giá trị trả phí được đóng gói thành product surface
- billing + entitlement
- experiment + analytics production
- backend contracts cho paid features

## 2. Cách đọc trạng thái

- `[x]` đã có ở mức dùng được
- `[-]` đã có một phần hoặc mới ở local/mock
- `[ ]` chưa có hoặc chưa thành feature thật

## 3. Bảng đối chiếu năng lực chính

| Nhóm năng lực | Trạng thái | Nhận định ngắn |
|---|---|---|
| 12-week core execution | `[x]` | Đây là phần mạnh nhất của repo hiện tại |
| Setup 4 bước | `[x]` | Đã gọn và đúng hướng execution-first |
| Today queue + task instances | `[x]` | Đã là source of truth thực sự |
| Daily check-in / weekly review | `[x]` | Đã dùng được, gắn với nhịp tuần |
| Reflection integration | `[x]` | Đã nối trực tiếp với review tuần |
| Goal tracker vai trò overview | `[x]` | Đã gần đúng định vị sản phẩm |
| Local event logging | `[-]` | Có event nội bộ nhưng chưa là analytics production |
| Local outbox + sync placeholder | `[-]` | Có contract sơ bộ nhưng chưa đủ cho backend thật |
| Browser notification | `[-]` | Có notification local, chưa phải push production |
| Privacy / local controls | `[-]` | Có export/clear/toggle local, chưa phải consent model đầy đủ |
| Paywall surface | `[ ]` | Chưa có |
| Billing / checkout | `[ ]` | Chưa có |
| Subscription / entitlements | `[ ]` | Chưa có domain model thật |
| Premium template catalog | `[ ]` | Chưa có |
| Premium insight gating | `[ ]` | Chưa có |
| GA4 / GTM / dataLayer | `[ ]` | Chưa có |
| Experiment framework | `[ ]` | Chưa có |
| Email reminder production | `[ ]` | Chưa có |
| Push subscription backend path | `[ ]` | Chưa có |

## 4. Phần đã khớp tốt với báo cáo nghiên cứu

## 4.1 Execution system thay vì checklist đơn thuần

Trạng thái: `[x]`

Code hiện tại đúng tinh thần của báo cáo ở điểm:

- `12WeekSetup` tạo cycle, tactics, review day, milestones, task instances nền.
- `12WeekSystem` xoay quanh `Today`, `Week`, `Progress`, `Settings`.
- Điểm tuần và review tuần đều nằm trong flow chính.
- `re-entry` và `rescue` đã có ở mức sản phẩm.

Điểm bám code:

- `src/app/pages/12WeekSetup.tsx`
- `src/app/pages/12WeekSystem.tsx`
- `src/app/components/TwelveWeekSystemSections.tsx`
- `src/app/utils/storage-twelve-week.ts`

Nhận định:

- Đây là nền rất tốt để làm monetization.
- Không nên thay đổi triết lý sản phẩm ở vùng này.

## 4.2 Today-first UX

Trạng thái: `[x]`

Code hiện tại đã trả lời được câu hỏi trọng tâm:

- Hôm nay làm gì
- Tuần này đang ở đâu
- Review có đến hạn không

Điểm bám code:

- `src/app/pages/Dashboard.tsx`
- `src/app/pages/12WeekSystem.tsx`
- `src/app/components/TwelveWeekSystemSections.tsx`

Nhận định:

- Đây là điểm rất quan trọng vì monetization trong báo cáo phụ thuộc nhiều vào `time-to-value`.
- Repo hiện đã có nền UX phù hợp để cắm `premium trigger` đúng ngữ cảnh.

## 4.3 Reflection và review tuần

Trạng thái: `[x]`

Code hiện tại đã nối review tuần sang reflection, phù hợp với báo cáo ở góc giữ nhịp và tạo ritual review.

Điểm bám code:

- `src/app/pages/ReflectionJournal.tsx`
- `src/app/pages/12WeekSystem.tsx`

Nhận định:

- Đây là chỗ rất phù hợp để đặt upsell `premium insight`.

## 4.4 Local event log và funnel summary

Trạng thái: `[-]`

Code hiện có:

- `trackAppEvent(...)`
- `TWELVE_WEEK_FUNNEL_STEPS`
- `getTwelveWeekFunnelSummary(...)`
- event log local
- outbox summary local

Điểm bám code:

- `src/app/utils/storage.ts`
- `src/app/utils/storage-local-ops.ts`
- `src/app/pages/12WeekSetup.tsx`
- `src/app/pages/12WeekSystem.tsx`

Nhận định:

- Đây là nền rất tốt để đi lên analytics thật.
- Nhưng hiện vẫn mới là `local instrumentation`, chưa phải `analytics product instrumentation`.

## 5. Các khoảng trống lớn nhất

## 5.1 Chưa có monetization domain

Trạng thái: `[ ]`

Báo cáo nghiên cứu yêu cầu:

- subscription
- entitlement
- plan tiers
- trial / season pass
- checkout
- paywall placements

Code hiện tại chưa có:

- model `subscription`
- model `entitlement`
- helper `hasEntitlement`
- helper `getCurrentPlan`
- state quản lý trial
- đường upgrade thật

Điểm xác nhận:

- `src/app/utils/storage-types.ts` chưa có bất kỳ domain model nào cho subscription hoặc entitlement.
- `src/app/pages/*` chưa có paywall, pricing, checkout, billing screen.
- search trong `src` không có `entitlement`, `subscription`, `checkout`, `paywall`, `billing` như feature thực.

Ý nghĩa:

- Khoảng trống lớn nhất của toàn repo hiện tại.
- Nếu muốn đi từ sản phẩm tốt sang sản phẩm bán được, đây là bước bắt buộc đầu tiên.

## 5.2 Chưa có premium template catalog

Trạng thái: `[ ]`

Báo cáo xem premium template là một paid value rất rõ.

Code hiện tại:

- `12WeekSetup` cho user tạo tactics thủ công.
- Có `goal type`, `review day`, `milestones`, `successEvidence`.
- Không có `template registry`, `template preview`, `free vs premium templates`.

Điểm xác nhận:

- `src/app/pages/12WeekSetup.tsx`
- `src/app/utils/storage-types.ts`

Ý nghĩa:

- Đây là một trong hai đường upgrade tự nhiên dễ làm nhất.
- Chưa có nên hiện app vẫn chưa có `entry-point monetization` đủ rõ.

## 5.3 Chưa có premium insight / analytics gating

Trạng thái: `[ ]`

Báo cáo đề xuất:

- premium insight ở weekly review
- risk score
- tactic-level analytics
- trend chart / heatmap / breakdown

Code hiện tại:

- Có scoreboard cơ bản.
- Có progress tab, milestone, completion.
- Chưa có `blurred premium block`, `teaser`, `locked insight`, `risk engine`, `tactic analytics`.

Điểm xác nhận:

- `src/app/components/TwelveWeekSystemSections.tsx`
- `src/app/pages/Dashboard.tsx`

Ý nghĩa:

- Đây là đường upgrade tự nhiên thứ hai sau template.
- Chưa có nên review tuần hiện mới hỗ trợ hành vi, chưa hỗ trợ monetization.

## 5.4 Analytics chưa ra ngoài local app

Trạng thái: `[-]`

Code hiện tại:

- Có event tracking nội bộ như `12_week_plan_created`, `12_week_task_completed`, `12_week_weekly_review_submitted`.
- Có summary funnel local.

Chưa có:

- `dataLayer`
- `gtag`
- GA4 adapter
- GTM contract
- ecommerce events như `begin_checkout`, `purchase`, `refund`
- event mapping cho paywall placements

Điểm xác nhận:

- `src/app/utils/storage.ts`
- `src/app/pages/12WeekSetup.tsx`
- `src/app/pages/12WeekSystem.tsx`
- search trong `src` không có `dataLayer`, `gtag`, `begin_checkout`, `purchase`

Ý nghĩa:

- Hiện repo đo được hành vi cục bộ nhưng chưa đo được funnel monetization.

## 5.5 Reminder production path mới ở mức local

Trạng thái: `[-]`

Code hiện có:

- in-app reminder
- browser notification
- nút xin quyền notification
- sync pending outbox tới endpoint cấu hình

Điểm bám code:

- `src/app/utils/production.ts`
- `src/app/components/RootLayout.tsx`
- `src/app/pages/12WeekSystem.tsx`

Thiếu:

- push subscription model
- service worker path
- email cadence
- backend notification queue
- delivery logs
- retry / failure model có chiều sâu

Ý nghĩa:

- Đủ tốt cho local-first demo
- Chưa đủ để coi là feature production / paid reminder

## 5.6 Outbox sync mới là contract thô

Trạng thái: `[-]`

Code hiện có:

- `VITE_OUTBOX_SYNC_ENDPOINT`
- `syncPendingOutbox()`
- snapshot `idle/success/partial/offline/not_configured/error`

Thiếu:

- payload schema versioning
- auth cho sync
- idempotency
- per-item error reason
- retry scheduling
- dead-letter path

Điểm bám code:

- `src/app/utils/production.ts`
- `src/app/utils/storage-local-ops.ts`

Ý nghĩa:

- Đây là một contract tốt để bắt đầu.
- Nhưng vẫn chưa đủ để backend team nối vào mà không phải thiết kế lại một phần.

## 6. Đối chiếu theo package Free / Plus / Pro

| Capability | Free | Plus | Pro | Code hiện tại |
|---|---|---|---|---|
| 1 active cycle | Có | Có | Có | `[x]` |
| Setup 4 bước | Có | Có | Có | `[x]` |
| Today queue | Có | Có | Có | `[x]` |
| Daily check-in | Có | Có | Có | `[x]` |
| Weekly review | Có | Có | Có | `[x]` |
| Reflection link | Có | Có | Có | `[x]` |
| Premium templates | Không | Có | Có | `[ ]` |
| Multi-channel reminders | Không | Có | Có | `[ ]` thực tế chưa có |
| Browser notification local | Có thể coi là thử nghiệm | Có | Có | `[-]` |
| Trend / risk insights | Không | Có | Có sâu hơn | `[ ]` |
| Tactic-level analytics | Không | Có ít | Có sâu | `[ ]` |
| Export report | Không | Có thể | Có | `[ ]` |
| Billing / trial / season pass | Không | Có | Có | `[ ]` |

## 7. Phần nào đang “production-looking” nhưng chưa production-ready

Đây là nhóm dễ gây ảo tưởng tiến độ:

### Reminder settings

Trông đã như production, nhưng thực chất:

- chưa có push backend
- chưa có email backend
- chưa có real scheduling contract đầy đủ

### Funnel summary

Trông đã như analytics dashboard, nhưng thực chất:

- mới là local event summary
- chưa có analytics export
- chưa có attribution, cohort, conversion measurement

### Outbox sync

Trông như đã có sync, nhưng thực chất:

- mới là POST đơn giản tới endpoint
- chưa có reliability model đầy đủ

## 8. Ưu tiên nên làm tiếp theo

Nếu chỉ chọn 3 việc có impact cao nhất để kéo repo sát báo cáo nghiên cứu, mình sẽ chọn:

### Ưu tiên 1: Entitlement + paywall foundation

Lý do:

- Không có cái này thì chưa thể làm monetization đúng cách.
- Mọi premium feature sau đó sẽ bớt chắp vá.

Bao gồm:

- domain model
- helpers
- paywall surface dùng chung
- billing adapter interface

### Ưu tiên 2: Premium template catalog

Lý do:

- Đây là paid value dễ hiểu nhất.
- Dễ đặt trong setup flow hiện tại.
- Ít rủi ro hơn làm analytics trả phí ngay từ đầu.

### Ưu tiên 3: Weekly review premium insight

Lý do:

- Đây là điểm upsell tự nhiên nhất sau template.
- Khớp với product ritual đang có sẵn.

## 9. Phần nào có thể giữ nguyên

Không nên đập đi làm lại các phần sau:

- triết lý `today-first`
- 4-tab structure của `12WeekSystem`
- setup 4 bước
- task instance model
- re-entry flow nền
- reflection linkage
- local-first storage backbone

Các phần này nên được xem là `foundation ổn`, rồi cắm monetization và analytics lên trên.

## 10. Kết luận cuối

Nếu nhìn thẳng vào code hiện tại:

- Repo đã đi được khoảng `70-75%` đường của một `execution product`.
- Nhưng mới chỉ đi khoảng `20-25%` đường của một `monetizable execution product`.

Điểm mạnh là:

- lõi trải nghiệm rất thật
- nhịp thực thi đã rõ
- cấu trúc page và storage đủ tốt để mở rộng

Điểm thiếu là:

- lớp business model và delivery infrastructure

Vì vậy, bước đúng tiếp theo không phải là tiếp tục polish UI chung chung, mà là:

1. dựng entitlement + paywall foundation
2. ra premium template catalog
3. ra weekly review premium insights

