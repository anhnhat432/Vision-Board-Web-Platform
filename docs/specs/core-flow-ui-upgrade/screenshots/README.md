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

### Chụp lại cho R12–R15 (task 21.1)

Sau khi hoàn tất R12–R15 (a11y audit, inline validation + save-status cho form, skeleton loading,
Reflection/Review polish), đã chụp lại After_Screenshot cho các màn hình bị ảnh hưởng:

- `onboarding`, `smart-goal-setup`, `feasibility` — form friction (R13) + a11y (R12).
- `goals` (GoalTracker) — skeleton loading per-screen (R14).
- `journal` (ReflectionJournal) — layout/CTA/states polish (R15) + skeleton (R14).

Kết quả: 5 màn hình × 2 viewport = **10/10 ảnh After chụp lại thành công** (mỗi lần `exit code 0`),
dev server Vite (mặc định `http://localhost:5173`; lần chạy gần nhất dùng `http://localhost:5174` do 5173 đang bận,
override qua `BASELINE_BASE_URL`), Desktop `1440x900` + Mobile `390x844`. Các màn hình Core_Flow còn lại
(`life-balance`, `life-insight`, `12-week-setup`, `12-week-system`, `dashboard`) giữ nguyên ảnh After từ
task 13.1 vì không nằm trong phạm vi sửa R12–R15.

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

## Thay đổi R12–R15 theo bề mặt (task 15–21)

### Forms — Onboarding / SMARTGoalSetup / FeasibilityCheck (R12 + R13)

Thay đổi chính: inline validation cạnh field (cập nhật `onBlur`/`onChange` ≤ 500ms, thông báo nêu rõ điều kiện),
save-status UI ("đang lưu" hiện trong 300ms, "đã lưu" giữ tối thiểu 2s), validation/lưu thất bại không reset giá trị
đã nhập; a11y (Radix `Dialog`/`AlertDialog`, `aria-label`/`role` cho control icon-only, focus ring ≥ 2px, focus order
theo DOM). Giữ nguyên Storage_Contract (ghi qua API storage hiện có).

| Màn hình | Route | Baseline (desktop / mobile) | After (desktop / mobile) |
| --- | --- | --- | --- |
| Onboarding | `/onboarding` | `baseline/onboarding_desktop.png` / `baseline/onboarding_mobile.png` | `after/onboarding_desktop.png` / `after/onboarding_mobile.png` |
| SMARTGoalSetup | `/smart-goal-setup` | `baseline/smart-goal-setup_desktop.png` / `baseline/smart-goal-setup_mobile.png` | `after/smart-goal-setup_desktop.png` / `after/smart-goal-setup_mobile.png` |
| FeasibilityCheck | `/feasibility` | `baseline/feasibility_desktop.png` / `baseline/feasibility_mobile.png` | `after/feasibility_desktop.png` / `after/feasibility_mobile.png` |

### Skeleton loading (R14)

Thay đổi chính: skeleton per-screen cắm vào slot `loadingFallback` của `ScreenStateView`, ánh xạ 1:1 vùng nội dung thật
(tiêu đề / list-card / hành động), dùng cùng container `min-w-0`/`max-w`/grid, không tràn viewport, tôn trọng R10
(không motion > 300ms, không loop/glow). Nhánh `ready` thay thế hoàn toàn skeleton; nhánh `error` có "Thử lại".
Áp dụng cho các màn hình Core_Flow đang tải dữ liệu, gồm `goals` (GoalTracker) và `journal` (ReflectionJournal).

| Màn hình | Route | Baseline (desktop / mobile) | After (desktop / mobile) |
| --- | --- | --- | --- |
| GoalTracker | `/goals` | `baseline/goals_desktop.png` / `baseline/goals_mobile.png` | `after/goals_desktop.png` / `after/goals_mobile.png` |
| ReflectionJournal | `/journal` | `baseline/journal_desktop.png` / `baseline/journal_mobile.png` | `after/journal_desktop.png` / `after/journal_mobile.png` |

### ReflectionJournal polish (R15)

Thay đổi chính: chuẩn hoá thành đúng hai `<section>` có heading `h2` riêng + ranh giới (prompt phản tư | dữ liệu tiến độ),
đúng một Primary_CTA (các điều hướng còn lại `variant="outline"`), states loading/empty/error qua `ScreenStateView`
(loading → skeleton; empty → `EmptyState` title + mô tả 1–200 ký tự + 1 Primary_CTA trỏ route hiện có; error → khối lỗi + "Thử lại").
Giữ nguyên Storage_Contract reflection (`addReflection`/`deleteReflection`/`getUserData`/`saveUserData`). Ảnh After: xem `journal_*` ở trên.

> Ghi chú: ảnh After chụp ở trạng thái có dữ liệu seed (không phải trạng thái `empty`/`loading`); skeleton và
> empty-state được kiểm chứng qua component/DOM test (task 16.2, 19.2) thay vì ảnh tĩnh.

## Bề mặt chung (không có màn hình riêng)

- `SyncStatusIndicator` trong app header: chỉ render cho real-mode signed-in; xuất hiện xuyên suốt các màn hình
  ở trên (xem vùng header trong các ảnh After). Ở demo mode / chưa đăng nhập, indicator không render (Requirement 6.8).

## Ghi chú Core contract

Toàn bộ nâng cấp là lớp trình bày. Không thay đổi storage keys/shape, Entitlement_Authority,
billing route behavior, hay branching `isRealMode()`/`isDemoMode()`.
