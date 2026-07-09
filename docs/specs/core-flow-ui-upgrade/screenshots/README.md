# Báo cáo Before/After — Core Flow UI Upgrade

Tài liệu này ghép cặp `Baseline_Screenshot` (trước nâng cấp) và `After_Screenshot` (sau nâng cấp) cho từng
bề mặt UI bị ảnh hưởng của Core_Flow + Dashboard, phục vụ so sánh trực quan và phát hiện hồi quy
(Requirements 1.4, 11.6).

## Cách chụp lại

- Yêu cầu: dev server chạy tại `http://localhost:5173` (`npm run dev`).
- Baseline: `npm run screenshots:baseline` → lưu vào `screenshots/baseline/`.
- After: `npm run screenshots:after` → lưu vào `screenshots/after/`.
- Gate baseline (chặn sửa khi thiếu): `npm run screenshots:baseline:check`.
- Cả hai viewport: Desktop_Viewport `1440x900` và Mobile_Viewport `390x844`.
- Nếu chụp thất bại, script thoát non-zero và in `screenshot capture FAILED: screen=... viewport=...`
  (Requirement 1.7) — bước chụp KHÔNG được coi là hoàn tất.

## Trạng thái chụp

- Ngày chụp After: xem lịch sử git của thư mục `screenshots/after/`.
- Kết quả lần chụp gần nhất: 10 màn hình × 2 viewport = **20/20 ảnh After chụp thành công** (exit code 0).
- Baseline hiện có: **20/20 ảnh** trong `screenshots/baseline/`.

## Bảng before/after theo màn hình

Mỗi màn hình có 2 viewport. Đường dẫn tương đối tính từ thư mục này.

### 1. Dashboard (`/`) — Mixed

Thay đổi chính: sắp xếp lại thứ tự widget (nhóm Core_Flow lên trên), thêm Next_Step_Guidance,
copy đếm ngược trial dùng ngôn ngữ gắn tài khoản ("trên tài khoản này"), và `SyncStatusIndicator`
ở header (real-mode signed-in).

| Viewport | Baseline | After |
| --- | --- | --- |
| Desktop 1440x900 | `baseline/dashboard_desktop.png` | `after/dashboard_desktop.png` |
| Mobile 390x844 | `baseline/dashboard_mobile.png` | `after/dashboard_mobile.png` |

### 2. GoalTracker (`/goals`) — Mixed

Thay đổi chính: empty/loading/error states loại trừ lẫn nhau (retry không đụng dữ liệu local),
gỡ `CoreFlowProgress` khỏi màn hình này, tinh chỉnh token/spacing.

| Viewport | Baseline | After |
| --- | --- | --- |
| Desktop 1440x900 | `baseline/goals_desktop.png` | `after/goals_desktop.png` |
| Mobile 390x844 | `baseline/goals_mobile.png` | `after/goals_mobile.png` |

### 3. ReflectionJournal (`/journal`) — Mixed

Thay đổi chính: empty/loading/error states, gỡ `CoreFlowProgress`, tinh chỉnh token/motion.

| Viewport | Baseline | After |
| --- | --- | --- |
| Desktop 1440x900 | `baseline/journal_desktop.png` | `after/journal_desktop.png` |
| Mobile 390x844 | `baseline/journal_mobile.png` | `after/journal_mobile.png` |

### 4. LifeBalance (`/life-balance`) — Mixed

Thay đổi chính: `CoreFlowProgress` ("bước M / N") + Primary_CTA, tinh chỉnh token/motion, mobile-safety.

| Viewport | Baseline | After |
| --- | --- | --- |
| Desktop 1440x900 | `baseline/life-balance_desktop.png` | `after/life-balance_desktop.png` |
| Mobile 390x844 | `baseline/life-balance_mobile.png` | `after/life-balance_mobile.png` |

### 5. 12WeekSystem (`/12-week-system`) — Mixed

Thay đổi chính: `CoreFlowProgress` + Primary_CTA, tinh chỉnh token/motion, mobile-safety.

| Viewport | Baseline | After |
| --- | --- | --- |
| Desktop 1440x900 | `baseline/12-week-system_desktop.png` | `after/12-week-system_desktop.png` |
| Mobile 390x844 | `baseline/12-week-system_mobile.png` | `after/12-week-system_mobile.png` |

## Các màn hình Core_Flow còn lại (Next_Step_Guidance + tokens + mobile-safety)

Những màn hình dưới đây cũng nhận `CoreFlowProgress`/Primary_CTA, chuẩn hoá typography/spacing/motion
và mobile-safety theo Requirements 2, 4, 10.

| Màn hình | Route | Baseline (desktop / mobile) | After (desktop / mobile) |
| --- | --- | --- | --- |
| Onboarding | `/onboarding` | `baseline/onboarding_desktop.png` / `baseline/onboarding_mobile.png` | `after/onboarding_desktop.png` / `after/onboarding_mobile.png` |
| LifeInsight | `/life-insight` | `baseline/life-insight_desktop.png` / `baseline/life-insight_mobile.png` | `after/life-insight_desktop.png` / `after/life-insight_mobile.png` |
| SMARTGoalSetup | `/smart-goal-setup` | `baseline/smart-goal-setup_desktop.png` / `baseline/smart-goal-setup_mobile.png` | `after/smart-goal-setup_desktop.png` / `after/smart-goal-setup_mobile.png` |
| FeasibilityCheck | `/feasibility` | `baseline/feasibility_desktop.png` / `baseline/feasibility_mobile.png` | `after/feasibility_desktop.png` / `after/feasibility_mobile.png` |
| 12WeekSetup | `/12-week-setup` | `baseline/12-week-setup_desktop.png` / `baseline/12-week-setup_mobile.png` | `after/12-week-setup_desktop.png` / `after/12-week-setup_mobile.png` |

## Bề mặt chung (không có màn hình riêng)

- `SyncStatusIndicator` trong app header: chỉ render cho real-mode signed-in; xuất hiện xuyên suốt các màn hình
  ở trên (xem vùng header trong các ảnh After). Ở demo mode / chưa đăng nhập, indicator không render (Requirement 6.8).

## Ghi chú Core contract

Toàn bộ nâng cấp là lớp trình bày. Không thay đổi storage keys/shape, Entitlement_Authority,
billing route behavior, hay branching `isRealMode()`/`isDemoMode()`.
