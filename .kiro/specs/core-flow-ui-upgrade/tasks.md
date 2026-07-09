# Implementation Plan: Core Flow UI Upgrade

## Overview

Kế hoạch triển khai nâng cấp UI/UX Core_Flow + Dashboard lên mức production-polished mà **không** thay đổi bất kỳ Core contract nào (storage keys/shape, Entitlement_Authority, billing route behavior, branching `isRealMode()` / `isDemoMode()`).

Cách tiếp cận: xây trước **lớp logic thuần** (pure helpers testable + PBT), sau đó **nối lại** vào lớp trình bày bằng cách tái sử dụng component/helper sẵn có (`CoreFlowProgress`, `getDashboardNextAction`, bộ `states/*`, hook sync). Chỉ bổ sung các pure-helper mỏng và một component trình bày `SyncStatusIndicator` như design mô tả — không tạo abstraction/dependency mới ngoài `fast-check` cho PBT.

Ngôn ngữ: **TypeScript** (theo design + tech stack React 18 + Vite + Vitest + Testing Library). PBT dùng **fast-check**, mỗi property test chạy `{ numRuns: 100 }` và gắn comment tag theo định dạng `// Feature: core-flow-ui-upgrade, Property N`.

Quy trình dev-time bắt buộc: audit + baseline/after screenshot (Playwright/trình duyệt ở Desktop 1440x900 và Mobile 390x844) với gating theo Req 1, kết thúc bằng chuỗi kiểm chứng `npm run typecheck` → `npm run lint` → `npm run test:run` → `npm run build`.

## Tasks

- [x] 1. Audit và baseline gating (dev-time process — Requirement 1)
  - [x] 1.1 Tạo artifact audit Core_Flow + Dashboard
    - Tạo `docs/specs/core-flow-ui-upgrade/audit.md` với bảng: `screen id`, `route`, `classification` (đúng một trong `Shell` | `Mixed`)
    - Với mỗi màn hình `Mixed`, thêm cột `touched contracts` (Storage_Contract, Entitlement_Authority, sync, App_Mode, route availability) và cột `verified unchanged`
    - Điền theo danh sách màn hình trong design (Onboarding, LifeBalance, LifeInsight, SMARTGoalSetup, FeasibilityCheck, 12WeekSetup, 12WeekSystem, GoalTracker, ReflectionJournal, Dashboard)
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Tạo script chụp baseline screenshot có gating
    - Thêm script Playwright/trình duyệt dưới `scripts/` chụp mỗi màn hình Core_Flow + Dashboard ở Desktop_Viewport (1440x900) và Mobile_Viewport (390x844), lưu vào `docs/specs/core-flow-ui-upgrade/screenshots/baseline/`
    - Nếu thiếu baseline cho màn hình được yêu cầu chỉnh sửa → thoát non-zero và in thông báo "baseline missing" kèm screen + viewport (chặn chỉnh sửa)
    - Nếu chụp thất bại → không đánh dấu hoàn tất, in lỗi kèm screen + viewport
    - _Requirements: 1.2, 1.5, 1.7_

- [x] 2. Lớp logic thuần (pure decision helpers) và property tests
  - [x] 2.1 Implement `resolveCoreFlowPosition`
    - Tạo `src/app/utils/core-flow-position.ts` với `CoreFlowStepId`, `CoreFlowCompletion`, `CoreFlowPosition` và hàm thuần `resolveCoreFlowPosition(currentStepId, completion)`
    - Trả `firstIncompleteStepId` (bước `false` đầu tiên theo thứ tự, `null` nếu đã xong hết), `stepNumber` 1-based, `totalSteps`, `nextStepId` (`null` khi là bước cuối)
    - Chỉ đọc suy luận từ completion; không import storage, không side effect
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x]* 2.2 Property test cho `resolveCoreFlowPosition`
    - Tạo `src/app/utils/core-flow-position.test.ts`, dùng fast-check sinh `CoreFlowCompletion` + `currentStepId`, `{ numRuns: 100 }`
    - **Property 3: Vị trí Core_Flow nhất quán với thứ tự bước**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
    - Tag: `// Feature: core-flow-ui-upgrade, Property 3`

  - [x] 2.3 Implement `resolveSyncIndicatorStatus`
    - Tạo `src/app/utils/sync-indicator-status.ts` với `SyncIndicatorStatus`, `SyncIndicatorInput` và hàm thuần trả `null` khi `appMode === "demo"` hoặc `signedIn === false`; ngược lại đúng một trạng thái theo ưu tiên `offline > error > syncing > synced`
    - Chỉ ánh xạ từ input đã phân giải; không gọi sync, không đổi sync semantics
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 9.6_

  - [x]* 2.4 Property test cho `resolveSyncIndicatorStatus`
    - Tạo `src/app/utils/sync-indicator-status.test.ts`, fast-check sinh `SyncIndicatorInput` ngẫu nhiên, `{ numRuns: 100 }`
    - **Property 2: Sync indicator phân giải một trạng thái duy nhất với đúng thứ tự ưu tiên**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.8**
    - Tag: `// Feature: core-flow-ui-upgrade, Property 2`

  - [x] 2.5 Implement `orderDashboardWidgets`
    - Tạo `src/features/dashboard/helpers/widgetPriority.ts` với `WidgetGroup`, `DashboardWidgetDescriptor` và hàm thuần sắp xếp ổn định: mọi `core_flow` trước mọi `secondary`, trong nhóm theo `priority` rồi thứ tự gốc
    - Output là hoán vị của input (không thêm/xoá/ẩn phần tử)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x]* 2.6 Property test cho `orderDashboardWidgets`
    - Tạo `src/features/dashboard/helpers/widgetPriority.test.ts`, fast-check sinh danh sách widget, `{ numRuns: 100 }`
    - **Property 4: Sắp xếp widget Dashboard là hoán vị bảo toàn, nhóm Core_Flow đứng trước**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Tag: `// Feature: core-flow-ui-upgrade, Property 4`

  - [x] 2.7 Implement `demo-copy-guard`
    - Tạo `src/app/utils/demo-copy-guard.ts` với `DEMO_ONLY_PHRASES`, `containsDemoOnlyCopy(text)` (không phân biệt hoa/thường) và `resolveModeAwareCopy(text, appMode)`
    - Real mode: thay Demo_Only_Copy bằng bản production account-bound; demo mode: giữ nguyên chuỗi gốc
    - _Requirements: 8.1, 8.2_

  - [x]* 2.8 Property test cho `demo-copy-guard`
    - Tạo `src/app/utils/demo-copy-guard.test.ts`, fast-check sinh chuỗi (kèm chèn cụm demo ngẫu nhiên), `{ numRuns: 100 }`
    - **Property 5: Copy theo mode không rò rỉ Demo_Only_Copy trong real mode**
    - **Validates: Requirements 8.1, 8.2**
    - Tag: `// Feature: core-flow-ui-upgrade, Property 5`

  - [x]* 2.9 Property test cho `resolveScreenStateKind` (helper sẵn có)
    - Bổ sung PBT vào `src/app/components/states/useScreenDataState.test.ts`, fast-check sinh `(status, isEmpty, timedOut)`, `{ numRuns: 100 }`
    - **Property 1: Máy trạng thái màn hình loại trừ lẫn nhau**
    - **Validates: Requirements 5.3, 5.5, 5.6**
    - Tag: `// Feature: core-flow-ui-upgrade, Property 1`

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Sync_Status_Indicator (Requirement 6)
  - [x] 4.1 Implement component trình bày `SyncStatusIndicator`
    - Tạo `src/app/components/SyncStatusIndicator.tsx` — component mỏng chỉ hiển thị, nhận trạng thái đã phân giải từ `resolveSyncIndicatorStatus`, dùng copy `SYNC_STATUS` trong `user-facing-copy.ts`
    - Không render khi resolver trả `null`; ở trạng thái `error` render control "Thử lại"
    - Component không tự gọi sync backend
    - _Requirements: 6.1, 6.6_

  - [x] 4.2 Nối `SyncStatusIndicator` vào layout cho real-mode signed-in
    - Đọc trạng thái từ nguồn sẵn có (`useNetworkStatus`, `useAutoCloudSync`, `useBackendSyncIssueState`, `BackendConnectionStatus`, `AuthContext`, `getAppMode`) và truyền vào resolver
    - Control "Thử lại" gọi `triggerSyncNow()` hiện có; demo mode / chưa đăng nhập → không render và không gọi đường sync bảo vệ
    - Không thay đổi sync semantics, không đụng dữ liệu local khi error/timeout
    - _Requirements: 6.2, 6.3, 6.4, 6.7, 6.8, 6.9, 9.6_

  - [x]* 4.3 Unit test cho SyncStatusIndicator (error + retry)
    - Trạng thái error hiển thị nút thử lại; click → `triggerSyncNow` được gọi; demo mode không render
    - _Requirements: 6.6, 6.7, 6.8_

- [x] 5. Next_Step_Guidance và "bước M / N" (Requirement 2)
  - [x] 5.1 Nối `CoreFlowProgress` + `resolveCoreFlowPosition` vào các màn hình Core_Flow
    - Mỗi màn hình Core_Flow gắn `CoreFlowProgress` với `currentStepId` đúng để hiển thị "bước M / N"; render đúng một Primary_CTA (`Button size="lg"`) trỏ bước kế tiếp
    - Không có bước kế tiếp → không render Primary_CTA "next"; route bị guard chặn/chưa đăng ký → ẩn Primary_CTA "next" và hiển thị `InlineStatusMessage` "bước kế tiếp chưa truy cập được"
    - Chỉ dùng route đã đăng ký trong `createAppRoutes`; không sửa guard/route
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.2 Nối Next_Step_Guidance trên Dashboard qua `getDashboardNextAction`
    - Dashboard hiển thị Next_Step_Guidance trỏ bước Core_Flow chưa hoàn tất đầu tiên khi Onboarding chưa xong, trong render đầu tiên
    - Tái sử dụng `getDashboardNextAction` (không đổi API) kết hợp `resolveCoreFlowPosition`
    - _Requirements: 2.1, 2.6_

  - [x]* 5.3 Unit test Next_Step_Guidance UI
    - Mỗi màn hình có đúng một Primary_CTA; mọi `ctaTarget` ∈ route đã đăng ký; mô phỏng route guarded → CTA ẩn + indicator hiển thị
    - _Requirements: 2.4, 2.6, 2.7_

- [x] 6. Empty / Loading / Error states (Requirement 5)
  - [x] 6.1 Nối `useScreenDataState` + `ScreenStateView` + `EmptyState` vào các màn hình Core_Flow
    - Nối nguồn tải dữ liệu (localStorage/hook) vào máy trạng thái loại trừ lẫn nhau; error kèm control "Thử lại" (retry không đụng dữ liệu local); loading không hiển thị empty
    - Empty state: tiêu đề + mô tả ≤ 200 ký tự + đúng một Primary_CTA trỏ route hiện có; không tạo route mới
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x]* 6.2 Unit test empty state contract
    - Mỗi màn hình: có title, description ≤ 200 ký tự, đúng một Primary_CTA trỏ route hiện có; click CTA → navigate đúng
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Dashboard widget prioritization (Requirement 3)
  - [x] 8.1 Áp dụng `orderDashboardWidgets` vào render Dashboard
    - Sắp xếp nhóm `core_flow` lên trên nhóm `secondary` theo thứ tự đọc; giữ 100% widget đã cấu hình (không xoá/ẩn vĩnh viễn)
    - Widget không có dữ liệu vẫn giữ trong layout ở trạng thái rỗng qua `EmptyState variant="dashed"`
    - Không đổi nguồn dữ liệu / điều kiện hiển thị / Storage_Contract
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 8.2 Unit test Dashboard widgets + storage regression
    - Số widget hiển thị == số widget cấu hình; widget rỗng vẫn giữ với `EmptyState`; danh sách storage keys không đổi
    - _Requirements: 3.1, 3.4, 3.5, 9.1_

- [x] 9. Tách bạch copy và route real/demo (Requirement 8)
  - [x] 9.1 Áp dụng `resolveModeAwareCopy` cho copy đếm ngược/hạn gói trong real mode
    - Real mode không render Demo_Only_Copy; nội dung countdown/hạn gói dùng "trên tài khoản này", không dùng "trên trình duyệt này"
    - Giữ nguyên `createAppRoutes(appMode)` gating `/billing/mock-checkout` (không sửa)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 9.2 Unit test route table + copy real mode
    - `createAppRoutes("real")` không có `/billing/mock-checkout`; `createAppRoutes("demo")` có; countdown real mode chứa "trên tài khoản này", không chứa "trên trình duyệt này"
    - _Requirements: 8.3, 8.4, 8.5, 9.7_

- [x] 10. Mobile-safety và calm style/tokens (Requirements 4, 10)
  - [x] 10.1 Áp dụng lớp trình bày mobile-safety + design tokens
    - Container `min-w-0` / `overflow-x-hidden` / `flex-wrap` hợp lý; text `break-words`/`truncate` chủ đích; Primary_CTA `min-h-11` (≥ 44x44) và trong viewport; không cuộn ngang
    - Chỉ dùng typography scale (`theme.css`) và spacing/radius scale (`tokens.css`); motion ≤ 300ms, không loop/autoplay/glow/3D; tái sử dụng component/helper sẵn có
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 10.1, 10.3, 10.5, 10.6_

  - [x]* 10.2 DOM/integration test mobile-safety + desktop
    - Render ở viewport 320–767px và ≥1024px: `scrollWidth <= clientWidth`, không bounding box giao > 0px (trừ overlay), Primary_CTA ≥ 44x44 và trong viewport
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x]* 10.3 Static audit test typography/spacing/motion
    - Script/test grep phát hiện font-size/weight/line-height/spacing ngoài scale, motion > 300ms, loop/glow/3d transform trong `src/app/pages`, `src/app/components`, `src/features/dashboard`, `src/features/plan12week`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Brand preservation và local-first (Requirements 7, 9)
  - [x] 11.1 Implement brand preservation guard (dev-time/CI)
    - Test snapshot chuỗi tên thương hiệu + hash byte tệp logo so với baseline; nếu diff/chưa phê duyệt → fail (chặn áp dụng), thông báo chờ phê duyệt; không sửa asset/tên
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]* 11.2 Integration test local-first
    - Mock backend/Firebase lỗi hoặc offline: thao tác 12-Week (setup, Today, weekly review, progress) vẫn chạy, lưu local < 2s, progress local bất biến khi sync fail, indicator hiển thị offline/error; đọc dữ liệu bản cũ tương thích shape hiện hành
    - _Requirements: 9.2, 9.4, 9.5, 9.6_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. After screenshot và verification pipeline (Requirements 1, 11)
  - [x] 13.1 Chụp After_Screenshot và tạo báo cáo before/after
    - Chụp After_Screenshot Desktop (1440x900) + Mobile (390x844) cho từng màn hình đã sửa vào `docs/specs/core-flow-ui-upgrade/screenshots/after/`; ghép báo cáo before/after cho bề mặt UI ảnh hưởng
    - Chụp thất bại → không đánh dấu hoàn tất, báo lỗi kèm screen + viewport
    - _Requirements: 1.4, 1.7, 11.6_

  - [x] 13.2 Chạy chuỗi verification pipeline
    - Chạy tuần tự `npm run typecheck` → `npm run lint` → `npm run test:run` → `npm run build`, ghi exit code + output từng lệnh
    - Báo cáo file đổi, giải thích thay đổi, lệnh đã chạy + kết quả, lệnh không chạy được + nguyên nhân/setup, rủi ro/TODO còn lại
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional (unit/property/integration test) và có thể bỏ qua khi cần MVP nhanh; core implementation không bao giờ optional.
- PBT dùng fast-check, mỗi property một test, `{ numRuns: 100 }`, gắn tag `// Feature: core-flow-ui-upgrade, Property N`.
- Core contract bất biến trong toàn bộ kế hoạch: không đổi storage keys/shape, Entitlement_Authority, billing route behavior, branching `isRealMode()`/`isDemoMode()`.
- Chỉ bổ sung 5 pure-helper mỏng (`core-flow-position`, `sync-indicator-status`, `widgetPriority`, `demo-copy-guard`, tái dùng `resolveScreenStateKind`) và 1 component trình bày `SyncStatusIndicator`; phần còn lại tái sử dụng component/helper sẵn có.
- Audit + baseline/after screenshot và verification pipeline là quy trình dev-time bắt buộc, không đưa vào bundle sản phẩm.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.3", "2.5", "2.7"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.4", "2.6", "2.8", "2.9", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1", "8.1", "9.1"] },
    { "id": 3, "tasks": ["4.3", "5.2", "5.3", "6.1", "8.2", "9.2"] },
    { "id": 4, "tasks": ["6.2", "10.1", "11.1"] },
    { "id": 5, "tasks": ["10.2", "10.3", "11.2"] },
    { "id": 6, "tasks": ["13.1"] },
    { "id": 7, "tasks": ["13.2"] }
  ]
}
```
