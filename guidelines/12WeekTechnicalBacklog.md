# Technical Backlog: Hệ 12 Tuần Bám Theo Repo Hiện Tại

Nguồn đầu vào chính của backlog này là [deep-research-report.md](C:/Users/admin/Downloads/deep-research-report.md), nhưng nội dung dưới đây đã được chỉnh lại để bám sát codebase hiện tại của dự án.

## 1. Mục tiêu

Biến hệ `12-week` hiện tại từ một `local-first execution system` thành một `production-ready monetizable system` có:

- Paywall, entitlement và subscription rõ ràng.
- Premium value dễ hiểu và đo được.
- Analytics đủ tốt để tối ưu funnel.
- Reminder và outbox có backend contract thật.
- Chất lượng vận hành đủ chắc để triển khai MVP có thu phí.

## 2. Baseline hiện tại trong repo

Các phần đã có và không nên làm lại từ đầu:

- Flow lõi đã gom quanh `12WeekSetup` và `12WeekSystem`.
- `Dashboard` đã theo hướng `today-first`.
- `GoalTracker` đã lùi về vai trò tổng quan.
- `ReflectionJournal` đã nối với nhịp review tuần.
- `storage.ts` đã được tách module đáng kể.
- Có local event log, local outbox, in-app reminder, browser notification, export local data.
- Có lint, typecheck, test, build.
- Có app-level error boundary.

Các điểm hiện vẫn còn là khoảng trống so với báo cáo nghiên cứu:

- Chưa có billing thật.
- Chưa có entitlement model chạy thật ngoài local state.
- Chưa có paywall engine và pricing surface rõ ràng.
- Chưa có premium template catalog.
- Chưa có analytics contract chuẩn GA4/dataLayer.
- Chưa có outbox sync endpoint thật.
- Chưa có push/email delivery thật.
- Chưa có experiment framework cho paywall/trial.

## 3. Module hiện tại cần bám vào

Các vùng code chính sẽ là nền của backlog:

- `src/app/pages/12WeekSetup.tsx`
- `src/app/pages/12WeekSystem.tsx`
- `src/app/components/TwelveWeekSystemSections.tsx`
- `src/app/pages/Dashboard.tsx`
- `src/app/pages/GoalTracker.tsx`
- `src/app/pages/ReflectionJournal.tsx`
- `src/app/components/RootLayout.tsx`
- `src/app/utils/storage.ts`
- `src/app/utils/storage-types.ts`
- `src/app/utils/storage-twelve-week.ts`
- `src/app/utils/storage-local-ops.ts`
- `src/app/utils/production.ts`
- `src/app/routes.tsx`

## 4. Nguyên tắc kỹ thuật

- Không phá flow `today-first` đang có.
- Không đẩy billing logic thẳng vào page; mọi gating phải đi qua entitlement layer.
- Không để premium value chỉ là khóa UI; phải có behavior hoặc insight thật sự khác biệt.
- Giữ `local-first` như fallback, nhưng backend contract phải là nguồn sự thật cho paid features.
- Event taxonomy phải được chốt trước khi mở A/B test hay paywall rollout.

## 5. Backlog đề xuất

## Track A. Monetization Foundation

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| A1 | P0 | Subscription + entitlement domain | Đây là nền của mọi paywall và premium feature | `src/app/utils/storage-types.ts`, `src/app/utils/storage.ts`, `src/app/utils/production.ts` | Thêm model `subscription`, `entitlement`, `plan_code`, `trial_state`, `billing_status` | App phân biệt được `FREE`, `PLUS`, `PRO`, `SEASON_PASS`; có helper `hasEntitlement()` và `getCurrentPlan()` | 16-24h |
| A2 | P0 | Billing adapter layer | Hiện app chưa có chỗ gắn Stripe/VNPay/MoMo mà không bẩn page | `src/app/utils/production.ts`, `src/app/utils/storage-local-ops.ts` | Tạo abstraction `startCheckout`, `restoreEntitlements`, `handleBillingReturn` | UI gọi qua adapter, không gọi provider trực tiếp trong page | 14-22h |
| A3 | P0 | Pricing + paywall surface | Báo cáo nhấn mạnh paywall theo ngữ cảnh, không hard paywall mù | `src/app/pages/12WeekSetup.tsx`, `src/app/pages/12WeekSystem.tsx`, `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/pages/Dashboard.tsx` | Paywall modal/sheet dùng chung, hỗ trợ context `template`, `review`, `insight`, `reminder` | Mỗi trigger mở đúng copy, đúng pricing CTA, có đường `continue free` | 18-28h |
| A4 | P0 | Account / plan management screen | Có trả tiền mà không có màn quản lý gói sẽ rất yếu | `src/app/pages`, `src/app/routes.tsx`, `src/app/components/RootLayout.tsx` | Thêm màn `Billing & Plan` hoặc `Subscription` | Xem gói hiện tại, trial end, entitlement, lịch sử giao dịch mock/real | 12-20h |

## Track B. Premium Value Thật Sự

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| B1 | P0 | Premium template catalog | Đây là paid value rõ nhất trong báo cáo | `src/app/pages/12WeekSetup.tsx`, `src/app/utils/storage-types.ts`, `src/app/utils/storage-twelve-week.ts` | Template registry gồm free + premium + metadata | User thấy catalog, preview template, premium template mở paywall nếu chưa có quyền | 18-30h |
| B2 | P1 | Template personalization | Tăng giá trị trả phí và giảm choice overload | `src/app/pages/12WeekSetup.tsx`, `src/app/utils/storage-twelve-week.ts` | Wizard hỏi 2-3 câu ngắn để cá nhân hóa template | Setup sinh tactics/task instances phù hợp với nhánh template | 16-28h |
| B3 | P1 | Premium insights trong weekly review | Báo cáo đề xuất review là điểm upsell tự nhiên | `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/utils/storage-twelve-week.ts` | Khối `insight`, `risk score`, `suggested adjustment` | Free thấy teaser, paid thấy insight thật và gợi ý hành động | 18-32h |
| B4 | P1 | Premium progress analytics | Cần một khác biệt thật giữa free và paid | `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/pages/Dashboard.tsx` | Heatmap, trend chart, tactic-level breakdown | Free chỉ có scoreboard cơ bản; paid có trend, risk, tactic breakdown | 20-36h |

## Track C. Analytics Và Experiment

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| C1 | P0 | Event taxonomy chuẩn | Nếu chưa chốt event contract thì A/B test và funnel sẽ đo sai | `src/app/utils/storage.ts`, `src/app/utils/production.ts`, `src/app/utils/storage-local-ops.ts` | Danh sách event chuẩn hóa: `sign_up`, `tutorial_begin`, `plan_created`, `task_completed`, `weekly_review_submitted`, `paywall_view`, `paywall_cta_click`, `purchase` | Event names và params được chuẩn hóa, không còn log rời rạc theo nơi phát sinh | 10-16h |
| C2 | P0 | dataLayer / GA4 adapter | Báo cáo nhấn mạnh dataLayer contract nên được chốt sớm | `src/app/utils/production.ts`, `src/main.tsx`, `src/app/components/RootLayout.tsx` | Adapter gửi event ra `dataLayer` và fallback local | Có thể bật/tắt analytics, có contract rõ cho GTM/GA4 | 10-18h |
| C3 | P1 | Paywall experiment framework | Trial/freemium/reverse-trial cần thử nghiệm, không đoán | `src/app/utils/storage-types.ts`, `src/app/utils/storage.ts`, `src/app/utils/production.ts`, `src/app/pages/*` | Assignment + variant resolution + exposure logging | Mỗi user nhận variant ổn định, paywall copy/offer đổi theo variant, event log phân biệt được | 16-24h |

## Track D. Reminder Và Sync Production

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| D1 | P0 | Outbox sync contract thật | Hiện outbox mới là local-first với endpoint placeholder | `src/app/utils/production.ts`, `src/app/utils/storage-local-ops.ts` | Retry model, sync response schema, error states, partial success handling | App sync được từng item, có trạng thái `queued`, `sent`, `failed`, `retry_at` | 14-24h |
| D2 | P1 | Push notification production path | Báo cáo coi đây là paid value mạnh nếu làm đúng | `src/app/utils/production.ts`, `src/app/components/RootLayout.tsx`, `src/app/pages/12WeekSystem.tsx` | Web push subscription flow, permission UX, deep-link payload shape | User paid có thể bật push; app lưu subscription, có open-path đúng ngữ cảnh | 18-32h |
| D3 | P1 | Email reminder cadence | Email là fallback rẻ và hợp lý cho retention | `src/app/utils/production.ts`, `src/app/utils/storage-local-ops.ts` | Reminder schedule payload + backend contract + logs | Có thể gửi review reminder, missed-task rescue, trial ending reminder | 12-22h |
| D4 | P1 | Rescue flow automation | Báo cáo đề xuất rescue flow là retention engine quan trọng | `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/utils/storage-twelve-week.ts`, `src/app/utils/production.ts` | Rule engine đơn giản cho `missed check-in`, `execution < threshold`, `lighten week` | Rescue flow xuất hiện đúng lúc, có log và có thể dùng làm premium trigger | 14-24h |

## Track E. UX, Accessibility, Compliance

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| E1 | P0 | Accessibility audit cho flow 12 tuần | Báo cáo chỉ rõ các điểm WCAG 2.2 dễ fail | `src/app/pages/12WeekSetup.tsx`, `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/pages/Dashboard.tsx`, `src/app/pages/GoalTracker.tsx` | Checklist audit + fix keyboard/focus/target-size | Không còn lỗi rõ ở form, checklist, tabs, icon button, sticky panels | 14-24h |
| E2 | P1 | Privacy / consent / data controls | Paid + analytics + push thì cần quyền và xóa dữ liệu rõ ràng | `src/app/pages/12WeekSystem.tsx`, `src/app/utils/storage.ts`, `src/app/utils/production.ts` | Màn privacy tốt hơn: consent, export, clear local, analytics toggle, push toggle | User hiểu dữ liệu nào đang lưu local, dữ liệu nào được gửi đi | 12-18h |
| E3 | P1 | Trial and paywall copy polish | Monetization fail rất nhiều ở microcopy | `src/app/pages/12WeekSetup.tsx`, `src/app/components/TwelveWeekSystemSections.tsx`, `src/app/pages/Dashboard.tsx` | Bộ copy cho template paywall, review paywall, trial end reminder, rescue flow | Copy nhất quán, không guilt-trip, có CTA/secondary CTA rõ | 8-14h |

## Track F. Performance Và Quality

| ID | Priority | Hạng mục | Vì sao phải làm | File / module chạm chính | Deliverable | Definition of Done | Estimate |
|---|---:|---|---|---|---|---|---:|
| F1 | P1 | Tối ưu charts còn nặng | `charts` vẫn là chunk lớn nhất | `src/app/pages/LifeBalance.tsx`, `src/app/pages/LifeInsight.tsx`, `src/app/components/ui/chart.tsx` | Lazy-load chart và chỉ tải khi thật sự cần | Build giảm thêm cho first route, không kéo chart vào màn không dùng | 10-18h |
| F2 | P1 | Tối ưu motion ở shell | `motion` vẫn lớn và đang hiện diện ở nhiều màn | `src/app/components/RootLayout.tsx`, `src/app/components/ui/*`, `src/app/pages/*` | Giảm motion dùng chung, giữ animation có ý nghĩa | Chunk `motion` hoặc lượng code sử dụng giảm, UX không xấu đi | 12-20h |
| F3 | P1 | Flow tests cho monetization | Khi thêm paywall/billing, regression risk sẽ tăng mạnh | `src/test`, `vitest.config.ts` | Smoke flow cho `template paywall`, `review paywall`, `entitlement gating`, `checkout start` | Test bảo vệ các đường monetization chính | 12-22h |

## 6. Sprint order đề xuất

### Sprint 1: Nền tảng để có thể bán

- A1 Subscription + entitlement domain
- A2 Billing adapter layer
- A3 Pricing + paywall surface
- C1 Event taxonomy chuẩn
- C2 dataLayer / GA4 adapter

### Sprint 2: Tạo paid value dễ hiểu

- B1 Premium template catalog
- B3 Premium insights trong weekly review
- D1 Outbox sync contract thật
- E3 Trial and paywall copy polish

### Sprint 3: Tăng retention và học từ dữ liệu

- C3 Paywall experiment framework
- D2 Push notification production path
- D3 Email reminder cadence
- D4 Rescue flow automation

### Sprint 4: Chốt chiều sâu sản phẩm

- B2 Template personalization
- B4 Premium progress analytics
- E1 Accessibility audit
- E2 Privacy / consent / data controls
- F1, F2, F3 cho performance và chất lượng

## 7. Backlog “không làm ngay”

Các mục nên để sau khi nền monetization rõ hơn:

- Bundle với kit vật lý.
- Workshop / accountability group.
- Affiliate / partnership.
- Offline-first mở rộng hơn mức local-first hiện tại.
- Cohort analytics sâu hoặc forecasting dùng mô hình phức tạp.

## 8. Definition of Success cho giai đoạn tiếp theo

Backlog này được coi là đi đúng hướng khi repo đạt được:

- Có 1 đường upgrade thật sự chạy được từ `template` hoặc `weekly review`.
- Có entitlement gating thống nhất, không khóa UI theo kiểu ad-hoc.
- Có event log chuẩn cho funnel monetization.
- Có ít nhất 1 premium value mà user free chạm vào rồi hiểu ngay vì sao đáng trả.
- Có backend contract rõ cho sync, billing và notification.

## 9. Gợi ý bước làm tiếp ngay sau backlog này

Sau backlog kỹ thuật, hai tài liệu nên làm tiếp là:

- PRD/MVP plan cho gói `Free / Plus / Pro`.
- Gap analysis `báo cáo nghiên cứu vs code hiện tại`.

