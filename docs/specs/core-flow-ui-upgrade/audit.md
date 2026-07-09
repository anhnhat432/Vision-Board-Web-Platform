# Audit — Core Flow UI Upgrade

> Artifact audit dev-time cho tính năng `core-flow-ui-upgrade`.
> Thoả Requirement 1.1 (liệt kê từng màn hình Core_Flow + Dashboard, phân loại đúng một trong `Shell` | `Mixed`)
> và Requirement 1.3 (với màn hình `Mixed`, ghi rõ `touched contracts` và trạng thái `verified unchanged`).
>
> Route được đối chiếu với `createAppRoutes(appMode)` trong `src/app/routes.tsx` và các page file
> trong `src/app/pages` / `src/features/plan12week` tại thời điểm audit.
>
> Ý nghĩa cột `verified unchanged`:
> - `pending` — chưa xác nhận (baseline chưa chốt hoặc màn hình chưa được đụng tới trong đợt upgrade).
> - `unchanged` — đã xác nhận Core contract không đổi so với trạng thái trước upgrade.
> - `changed` — phát hiện thay đổi contract → theo Req 1.6 phải dừng upgrade màn hình đó và báo cáo.

## 1. Bảng phân loại màn hình (Requirement 1.1)

| screen id | route | classification |
|-----------|-------|----------------|
| Onboarding | `/onboarding` | Mixed |
| LifeBalance | `/life-balance` | Mixed |
| LifeInsight | `/life-insight` | Shell |
| SMARTGoalSetup | `/smart-goal-setup` | Mixed |
| FeasibilityCheck | `/feasibility` | Shell |
| 12WeekSetup | `/12-week-setup` | Mixed |
| 12WeekSystem | `/12-week-system` | Mixed |
| GoalTracker | `/goals` | Mixed |
| ReflectionJournal | `/journal` | Mixed |
| Dashboard | `/` (index → `DashboardEntry`) | Mixed |

**Ghi chú route (đối chiếu `src/app/routes.tsx`):**

- Tất cả 10 route trên đều đã đăng ký hiện có trong `createAppRoutes`, nằm dưới `RootLayout` (path gốc `/`).
- `/` là `index` route render `DashboardEntry` (không có path literal `/dashboard`).
- `/12-week-setup` render component `TwelveWeekSetupLab` (export từ `./pages/12WeekSetupLab`); các path `12-week-plan-setup` chỉ redirect về `/12-week-setup`.
- `/12-week-system` render `TwelveWeekSystem` (chứa các tab Today / Week / Progress); `today` redirect về `/12-week-system?tab=today`.
- Các route Core_Flow trên **không** bị đóng gói trong `ProtectedRoute` ở bảng route hiện tại (chỉ `order`, `order-status` mới nằm trong `ProtectedRoute`). Route availability guard theo Req 2.6/2.7 do đó phải giữ nguyên hành vi hiện có — không thêm/bớt guard trong đợt upgrade.

## 2. Chi tiết màn hình Mixed — touched contracts & verified unchanged (Requirement 1.3)

| screen id | route | touched contracts | verified unchanged |
|-----------|-------|-------------------|--------------------|
| Onboarding | `/onboarding` | Storage_Contract (đọc/ghi `onboardingCompleted`, wheel of life trong `UserData.currentWheelOfLife`) | pending |
| LifeBalance | `/life-balance` | Storage_Contract (đọc/ghi wheel of life / life areas) | pending |
| SMARTGoalSetup | `/smart-goal-setup` | Storage_Contract (đọc/ghi `UserData.goals`), Entitlement_Authority (free tier limit qua `usePlanEntitlements` / `UpgradePaywallDialog`) | pending |
| 12WeekSetup | `/12-week-setup` | Storage_Contract (`storage-twelve-week.ts`, `goal.twelveWeekSystem`), route availability (điều hướng sang `/12-week-system`) | pending |
| 12WeekSystem | `/12-week-system` | Storage_Contract (`storage-twelve-week.ts`), sync (`useAutoCloudSync` / `useBackendSyncIssueState` / `useNetworkStatus`), App_Mode (`isRealMode()` / `isDemoMode()`) | pending |
| GoalTracker | `/goals` | Storage_Contract (đọc/ghi `UserData.goals`) | pending |
| ReflectionJournal | `/journal` | Storage_Contract (đọc/ghi journal entries) | pending |
| Dashboard | `/` (index → `DashboardEntry`) | Storage_Contract (đọc completion để suy Next_Step), App_Mode (branching real/demo), route availability (Next_Step_Guidance trỏ route đã đăng ký) | pending |

**Màn hình Shell (không chạm Core contract):**

- `LifeInsight` (`/life-insight`) — trình bày insight suy ra từ dữ liệu đã có, chỉ đọc để hiển thị, không ghi / không đổi entitlement / không đổi sync semantics.
- `FeasibilityCheck` (`/feasibility`) — hiển thị/điều hướng thuần trên bề mặt UI, không đổi storage keys, data shape hay route availability.

## 3. Bất biến Core contract cần giữ (tham chiếu design)

Các contract dưới đây **đóng băng** trong toàn bộ đợt upgrade; mọi thay đổi phát hiện được phải đánh dấu `changed` ở cột `verified unchanged` và dừng theo Req 1.6:

- **Storage_Contract** — `storage.ts`, `storage-types.ts`, `storage-twelve-week.ts`: không đổi tên key, không đổi data shape, không xoá dữ liệu local.
- **Entitlement_Authority** — `usePlanEntitlements`, `UpgradePaywallDialog`: mọi kiểm tra paywall đi qua helper hiện có.
- **sync semantics** — `useAutoCloudSync`, `useBackendSyncIssueState`, `useNetworkStatus`: chỉ đọc/surface trạng thái, không đổi hành vi keep-local / use-cloud / conflict.
- **App_Mode** — `isRealMode()` / `isDemoMode()` trong `src/app/utils/app-mode.ts`: giữ nguyên branching.
- **route availability** — `createAppRoutes(appMode)`: không thêm/bớt route hay guard; `/billing/mock-checkout` chỉ đăng ký khi `appMode === "demo"`.

## 4. Trạng thái baseline screenshot (liên kết Req 1.2 / 1.5)

Trạng thái chụp baseline (Desktop 1440x900 + Mobile 390x844) được quản lý ở task 1.2 và thư mục
`docs/specs/core-flow-ui-upgrade/screenshots/baseline/`. Theo Req 1.5, không được chỉnh sửa một màn hình
khi baseline (Desktop hoặc Mobile) của màn hình đó chưa tồn tại.
