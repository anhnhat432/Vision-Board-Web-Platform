# QA Report — Dashboard active-system mobile priority

## Scope

- Route chính: `/`
- Trạng thái mục tiêu: signed-in user có active 12-week system
- Không sửa Dashboard UI, không sửa business logic, không chạm `/12-week-setup` hoặc `/12-week-setup-lab`, không đổi storage schema, không đổi auth production behavior.

## QA strategy decision

**Chọn Hướng A — Component-level QA.**

Lý do:

- Dashboard không chỉ đọc localStorage để quyết định state active-system. `DashboardContent` lấy `user` từ auth context; khi `user === null`, app coi session là signed-out.
- Trong signed-out state, Dashboard cố ý set `visibleGoals = []`, `visibleWheelOfLife = []`, `visibleReflections = []`, `visibleVisionBoards = []`, và `visibleActiveTwelveWeekGoal = null`.
- Vì vậy browser script chỉ seed `localStorage` là chưa đủ: app vẫn render public visitor dashboard, không render active-system Dashboard.
- Không chọn Hướng B vì yêu cầu này không nên thay đổi production auth behavior hoặc thêm route/harness khi chưa có nhu cầu screenshot signed-in thật bắt buộc. Source of truth hiện tại cho active-system responsive order là component test có mock signed-in auth context.

## Commands run và kết quả

| Command                                                                                      | Result                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                          | PASS — exit code 0                                                                                                                  |
| `npm run build`                                                                              | PASS — exit code 0                                                                                                                  |
| `npm run test:run -- Dashboard.active-system`                                                | PASS — 1 file, 3 tests passed                                                                                                       |
| `node -e "...check ports 5173/5174..."`                                                      | PASS — `127.0.0.1:5173` và `127.0.0.1:5174` trả HTTP 200                                                                            |
| `node qa-artifacts/dashboard-active-mobile-priority/qa-dashboard-active-mobile-priority.mjs` | PASS về mặt automation chạy xong và chụp đủ ảnh; FAIL mục tiêu state vì app vẫn render public visitor view thay vì active dashboard |

## App local

- Đã dùng dev server sẵn có:
  - `npm run dev -- --host 127.0.0.1`
  - `set VITE_APP_MODE=demo&& npm run dev -- --host 127.0.0.1 --port 5174`
- QA automation chạy với `http://127.0.0.1:5174`.

## Viewports tested

- Mobile: `375 x 812`
- Tablet: `768 x 1024`
- Desktop: `1440 x 900`

## Root cause confirmed

- Seeding `localStorage` chưa đủ để vào active-system Dashboard trong browser QA.
- Dashboard dùng auth context để quyết định signed-in/signed-out.
- Nếu auth `user` là `null`, Dashboard lọc dữ liệu local ra khỏi UI signed-in:
  - `visibleGoals` rỗng.
  - `visibleActiveTwelveWeekGoal` là `null`.
  - Active-system cards không được render.
- Actual browser screenshots hiện tại là public visitor dashboard, không phải active-system dashboard.

## Component-level validation now used as source of truth

`Dashboard.active-system.test.tsx` đã được cập nhật để assert rõ responsive DOM order trong signed-in active-system state:

- Mobile/responsive DOM order:
  1. `DashboardHero`
  2. `TodayMiniCard` bản mobile, không nằm trong `aside`
  3. `ActiveGoalsCard` — heading `Mục tiêu đang chạy`
  4. `WeekRhythmCard` — heading `Nhịp tuần 1`
  5. `TwelveWeekTrendCard` — heading `Đường 12 tuần`
- Desktop structural assertion:
  - `TodayMiniCard` bản desktop nằm trong `aside`.
  - Test giữ nguyên task seed/logic; chỉ assert layout/order.

## Browser DOM/order check

### Expected

- Mobile `375px`: sau `DashboardHero` và `RescueAlert` nếu có, `TodayMiniCard` phải xuất hiện trước `ActiveGoalsCard`, `WeekRhythmCard`, `TwelveWeekTrendCard`.
- Desktop `1440px`: `TodayMiniCard` nằm trong aside bên phải; không render block mobile `TodayMiniCard` trên desktop nhờ CSS responsive; layout 2 cột giữ ổn.

### Actual observed

- Browser session vẫn render public visitor/marketing dashboard, không render active dashboard state seeded qua `localStorage`.
- Các heading/card active-system không xuất hiện trong DOM:
  - `Việc hôm nay`: không tìm thấy heading active `TodayMiniCard`.
  - `Mục tiêu đang chạy`: không tìm thấy.
  - `Nhịp tuần ...`: không tìm thấy.
  - `Đường 12 tuần`: không tìm thấy.
  - `data-testid="dashboard-primary-action-card"`: không tìm thấy.
  - CTA `Mở Today`: không tìm thấy.
- Nội dung hiển thị là public visitor view với copy như `Xin chào, đây là Vision Board`, `Bắt đầu demo`, và preview mock `Việc hôm nay · 7/14`.

## Screenshot list

Đã lưu trong `qa-artifacts/dashboard-active-mobile-priority/`:

- `dashboard-mobile-375.png`
- `dashboard-tablet-768.png`
- `dashboard-desktop-1440.png`

Lưu ý: screenshot phản ánh public visitor dashboard, không phải active-system dashboard mong muốn.

## Console/runtime

- `console.error`: không ghi nhận.
- Uncaught exception/page error: không ghi nhận.
- Failed requests: có `net::ERR_ABORTED` trên một số module Vite dev như `usePlanExecutionSync.ts` và `recharts.js`; không thấy lỗi UI trực tiếp, nhiều khả năng do navigation/reload trong automation khi đổi viewport.

## Bugs found

1. **QA blocker — không vào được active-system Dashboard bằng localStorage seed trong browser automation**
   - Seed đã dùng key hiện có: `visionboard_user_data`, `latest_12_week_goal_id`, `latest_12_week_system_goal_id`, thêm dữ liệu active goal + `twelveWeekSystem` + `taskInstances` hôm nay.
   - Actual vẫn là public visitor view vì auth context signed-out.
   - Browser visual QA không thể validate active-system signed-in nếu không có auth harness hoặc đăng nhập thật.

## UX issues found

- Không thể đánh giá UX active-system thực tế bằng browser screenshot do state blocker.
- Với public visitor view đã render: không thấy tràn ngang ở `375px`; không thấy che khuất nghiêm trọng trong screenshot.

## Go/No-Go recommendation

**GO cho code-level validation.**

- `Dashboard.active-system` unit/component test là validation chính cho signed-in active-system responsive DOM order.
- Test xác nhận `TodayMiniCard` mobile đứng trước `ActiveGoalsCard` / `WeekRhythmCard` / `TwelveWeekTrendCard`, và `TodayMiniCard` desktop nằm trong `aside`.

**NO-GO cho browser screenshot active-system cho đến khi có auth harness hoặc đăng nhập signed-in thật.**

- Browser visual QA hiện tại không thật sự vào đúng active-system state.
- Recommendation tiếp theo nếu cần screenshot thật: tạo QA-only harness route/test wrapper trong dev/test, render Dashboard với mock signed-in user + seeded userData, không expose trong production navigation và không đổi production auth behavior.
