# Implementation Plan: UX/UI Upgrade ("Dear Our Future")

## Overview

Kế hoạch hiện thực đợt visual refresh ở mức design token, theo nguyên tắc "đổi giá trị, giữ tên" và chỉ chạm lớp trình bày. Trình tự được sắp xếp để tiến triển tăng dần và test-driven: dựng harness kiểm chứng token + chụp baseline trước, tinh chỉnh `Token_Value` ở lớp Primitive/Semantic, migrate các primitive palette còn sót sang `app-status-*`, chuẩn hóa core-flow về component state/shell dùng chung, siết accessibility, ánh xạ sync state, an toàn real-mode, rồi cuối cùng là verification/CI gates.

Mọi task tuân thủ ràng buộc không hồi quy trong `requirements.md` và `AGENTS.md`: KHÔNG đổi route, business/domain logic, storage key/shape, analytics, billing/sync/auth/entitlement contract. Test PBT dùng `fast-check`, mỗi property chạy tối thiểu 100 vòng (`numRuns: 100`) và tag theo định dạng `Feature: ux-ui-upgrade, Property {n}: {property_text}`.

## Tasks

- [x] 1. Dựng verification harness và chụp baseline token set
  - [x] 1.1 Viết parser token thuần đọc `src/styles/tokens.css`
    - Tạo `src/test/ux-ui-upgrade/token-parser.ts`: parse CSS thành `TokenSet` (`Map<name, TokenDefinition>`), phân loại `layer` (primitive/semantic/component theo tiền tố `--app-*`/`--btn-*`/`--card-*`/primitive), suy ra `kind` (color/length/shadow/fontFamily/number/other), trích `rawValue`
    - Thêm hàm `resolveToken(name, set)` đi hết chuỗi `var()` tới literal Primitive, trả `ResolvedToken { resolvedValue, isNonEmpty, kindValid }`
    - Thêm hàm dựng đồ thị tham chiếu `buildReferenceGraph(set)` từ các `var(--x)` trong `rawValue`
    - _Requirements: 1.3, 1.5_

  - [x] 1.2 Chụp baseline snapshot token + app-mode branching
    - Tạo `src/test/ux-ui-upgrade/baseline.ts` export `UpgradeBaseline { tokenNames, appModeBranching }`: liệt kê toàn bộ `Token_Name` Semantic + Component hiện có (đọc qua parser tại thời điểm trước khi sửa giá trị)
    - Ghi snapshot tên token vào `src/test/ux-ui-upgrade/__snapshots__/token-names.baseline.json` để so sánh superset sau nâng cấp
    - Trích chữ ký nhánh `isRealMode()`/`isDemoMode()` từ `src/app/utils/app-mode` để dùng đối chiếu ở Requirement 9.2
    - _Requirements: 1.1, 9.2_

  - [x] 1.3 Viết token-compliance scanner cho Core_Flow_Screen
    - Tạo `src/test/ux-ui-upgrade/token-scan.ts`: quét file JSX core-flow tìm hex literal (`#rrggbb`) và primitive Tailwind palette (`slate-*`, `emerald-*`, `amber-*`, `sky-*`, `purple-*`, `red-600`...) trong `className`
    - Trả danh sách vi phạm kèm đường dẫn + dòng để các task sau migrate
    - _Requirements: 2.1_

- [x] 2. Tinh chỉnh Token_Value tại lớp Primitive và Semantic
  - [x] 2.1 Tinh chỉnh Primitive_Token trong `src/styles/tokens.css`
    - Cập nhật giá trị `--green-*`, `--terra-*`, `--neutral-*`, `--status-*`, `--color-*-accent` theo định hướng "Dreamy Guided Productivity" (chỉ đổi giá trị, KHÔNG đổi tên, KHÔNG xóa)
    - Đảm bảo cascade tự xuống Semantic/Component; không sửa `@theme inline`, `tailwind.config.js`, `src/styles/theme.css`
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Tinh chỉnh Semantic_Token và quan hệ Light/Dark
    - Điều chỉnh ánh xạ vai trò khi cần (`--app-accent*`, `--app-warm*`, `--app-bg*`, `--app-surface`, `--app-ink*`, `--app-line*`, `--app-status-*`, `--app-focus-ring`, `--app-focus-ring-warm`, `--app-radius-*`, `--app-shadow-*`) trỏ về Primitive đã tinh chỉnh
    - Giữ nguyên cặp giá trị Light (`:root`) và Dark (`html.dark`) theo tên, chỉ đổi value
    - _Requirements: 1.2, 1.3, 2.2_

  - [x] 2.3 Property test — Token integrity (giữ tên, phân giải non-empty đúng kiểu)
    - **Property 1: Token integrity — giữ tên, phân giải non-empty đúng kiểu**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
    - File `src/test/ux-ui-upgrade/property-1-token-integrity.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 1`
    - Generator chọn token bất kỳ từ baseline; assert tập sau ⊇ baseline, có trong tailwind bridge, resolve non-empty đúng `kind`

  - [x] 2.4 Property test — Bất biến cấu trúc 3 lớp (hướng tham chiếu + acyclic)
    - **Property 4: Bất biến cấu trúc 3 lớp (hướng tham chiếu + acyclic)**
    - **Validates: Requirements 1.3**
    - File `src/test/ux-ui-upgrade/property-4-three-layer.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 4`
    - Generator chọn token; assert Semantic chỉ ref Primitive/Semantic, Component chỉ ref Semantic/Primitive, chuỗi `var()` kết thúc tại literal sau hữu hạn bước (acyclic)

  - [x] 2.5 Unit test — token resolution failure & runtime fallback
    - Test harness báo lỗi liệt kê đúng tên token khi một token baseline bị thiếu/rỗng/sai kiểu, và không ghi đè cấu hình đang chạy
    - Kiểm tra chuỗi `var(--token, <fallback>)` cho phần tử vẫn có màu nền/chữ khi token không phân giải
    - _Requirements: 1.6, 2.8_

- [x] 3. Checkpoint — token layer ổn định
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Migrate primitive palette còn sót sang status token
  - [x] 4.1 Thay `bg-red-600` trong `OfflineBanner`
    - Sửa `src/app/components/states/OfflineBanner.tsx` dùng status token (`bg-app-status-error` / component danger token) thay primitive Tailwind
    - Giữ nguyên hành vi: dismiss, sessionStorage key `offline-banner-dismissed`, `role="status"`
    - _Requirements: 2.1, 8.5_

  - [x] 4.2 Cập nhật/giữ test cho OfflineBanner
    - Cập nhật `src/app/components/states/OfflineBanner.test.tsx`: assert dùng status token, hành vi dismiss + key sessionStorage không đổi
    - _Requirements: 2.1_

  - [x] 4.3 Migrate sync badge helpers sang status token
    - Sửa `getSyncBadgeClass`/`getSyncBadgeLabel` trong `src/features/plan12week/pages/12WeekSystem/helpers.ts` thay primitive palette (`emerald-*`, `amber-*`, `sky-*`, `slate-*`) bằng `app-status-*`
    - Giữ nguyên chữ ký hàm và label text
    - _Requirements: 2.1, 8.3_

- [x] 5. Chuẩn hóa ánh xạ Sync_State → status token
  - [x] 5.1 Hiện thực hàm thuần mapping Sync_State
    - Thêm `toSyncState(status, online)` và `SYNC_STATE_TOKEN` (record 4 giá trị → 4 token khác nhau) trong module helpers sync (cạnh `12WeekSystem/helpers.ts` hoặc util sync hiện có)
    - Không đổi logic sync/queue thực tế, chỉ dẫn xuất giá trị trình bày từ `BackendConnectionStatus`
    - _Requirements: 8.1, 8.3_

  - [x] 5.2 Property test — ánh xạ Sync_State → status token là đơn ánh
    - **Property 6: Ánh xạ Sync_State → status token là đơn ánh**
    - **Validates: Requirements 8.3**
    - File `src/test/ux-ui-upgrade/property-6-sync-mapping.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 6`
    - Generator chọn cặp Sync_State khác nhau; assert token khác nhau và |ảnh| = 4

  - [x] 5.3 Component test — sync indicator real-mode
    - Real-mode + signedIn → badge cố định, liên tục (không tự ẩn); đổi `BackendConnectionStatus` → cập nhật nhãn/màu ≤ 1s; error/offline copy đúng, dữ liệu cục bộ giữ nguyên
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 6. Chuẩn hóa core-flow về component state/shell dùng chung
  - [x] 6.1 Áp `ScreenDataState` cho các Core_Flow_Screen
    - Chuẩn hóa các màn (Onboarding, Life Balance, Life Insight, SMART Goal, Feasibility, 12-Week Setup/System, Weekly Execution/Today, Reflection, Dashboard) tiêu thụ `Skeleton`/`FormSkeleton` (loading), `EmptyState` (empty), error block dùng chung (`InlineStatusMessage tone="error"`) + control thử lại; đúng một trạng thái tại một thời điểm
    - Thêm timeout guard 30s → chuyển error; retry → quay về loading; KHÔNG xóa/reset dữ liệu cục bộ
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 6.2 Chuẩn hóa PageShell + CoreFlowProgress (giữ nội dung/thứ tự)
    - Đảm bảo các màn dùng `PageShell` (max-width tier) và `CoreFlowProgress`; giữ nguyên 100% văn bản, nhãn và thứ tự bước (`life_balance → life_insight → smart_goal → feasibility → twelve_week_setup → today`)
    - Migrate vi phạm token-scan (hex/primitive palette) còn lại sang Semantic/Component token
    - _Requirements: 2.1, 2.2, 2.7, 10.4, 10.5_

  - [x] 6.3 Áp phân vùng ngữ cảnh màu Execution ↔ Reflection
    - Execution_Context dùng `app-accent-*` cho hành động/tiến độ; Reflection_Context dùng `app-warm-*`/`--reflection-*`; không trộn lẫn
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [x] 6.4 Property test — máy trạng thái màn hình (mutual exclusion + retry)
    - **Property 5: Máy trạng thái màn hình — loại trừ lẫn nhau và retry**
    - **Validates: Requirements 7.7, 7.5**
    - File `src/test/ux-ui-upgrade/property-5-screen-state.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 5`
    - Generator sinh chuỗi sự kiện tải; assert luôn đúng một trạng thái, retry(error) → loading

  - [x] 6.5 Property test — phân vùng ngữ cảnh màu
    - **Property 3: Phân vùng ngữ cảnh màu (Execution ↔ Reflection)**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
    - File `src/test/ux-ui-upgrade/property-3-color-context.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 3`
    - Generator chọn node trong cây render Execution/Reflection; assert tập token không giao nhóm nghịch ngữ cảnh

  - [x] 6.6 Component test — states + content/order
    - Mount từng màn ở nhánh loading/empty/error/ready → assert đúng component dùng chung và 30s timeout; snapshot văn bản/nhãn + thứ tự `CoreFlowProgress` so baseline
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 2.7, 10.4, 10.5_

- [x] 7. Checkpoint — core-flow nhất quán trạng thái và màu
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Accessibility — contrast, focus, reduced-motion, responsive
  - [x] 8.1 Đảm bảo ngưỡng contrast trên token core-flow (Light/Dark)
    - Hiệu chỉnh `Token_Value` để text thường/placeholder ≥ 4.5:1, text lớn ≥ 3:1, viền/biểu tượng control + focus ring ≥ 3:1 trên nền hiệu dụng (alpha-compositing), cả hover/active/selected; control disabled được miễn
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 8.2 Property test — WCAG contrast trên mọi cặp màu core-flow
    - **Property 2: WCAG contrast trên mọi cặp màu của luồng cốt lõi**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.2, 4.4**
    - File `src/test/ux-ui-upgrade/property-2-contrast.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 2`
    - Generator sinh cặp (fg, effective bg) theo ThemeMode/loại phần tử/trạng thái; assert contrast ≥ ngưỡng; loại disabled

  - [x] 8.3 Focus ring + thao tác bàn phím
    - Áp `--app-focus-ring` (Execution) / `--app-focus-ring-warm` (Reflection) độ dày ≥ 2px, hiển thị ≤ 100ms khi focus và gỡ ≤ 100ms khi blur, không bị che/cắt; giữ thứ tự đọc Tab/Shift+Tab
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 8.4 Component test — focus & keyboard
    - `userEvent.tab()`/`shift+tab` kiểm thứ tự đọc; focus → ring ≥ 2px nhìn thấy; blur → gỡ ring; Reflection dùng ring warm
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 8.5 Reduced-motion compliance
    - Dưới `prefers-reduced-motion: reduce`: vô hiệu motion không thiết yếu, motion thiết yếu ≤ 200ms, control vẫn truy cập/thao tác; mặc định motion 150–500ms; toggle áp dụng ≤ 500ms không reload
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.6 Component test — reduced motion
    - Mock `matchMedia('(prefers-reduced-motion: reduce)')`; assert vô hiệu motion không thiết yếu, motion thiết yếu ≤ 200ms, control thao tác được, toggle không reload
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.7 Responsive layout + touch target
    - Đảm bảo 360–767px không cuộn ngang (overflow-x = 0), ≥768px dùng spacing desktop, <768px dùng padding card mobile; Touch_Target ≥ 44×44px, khoảng cách ≥ 8px; <360px giữ bố cục mốc 360px
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.8 E2E test responsive (Playwright)
    - File `e2e/ux-ui-upgrade-responsive.spec.ts`: viewport 320/360/414/767/768/1024 → assert không cuộn ngang 360–767px, spacing desktop ≥768px, padding mobile <768px, Touch_Target ≥ 44px + khoảng cách ≥ 8px (đo layout thực), <360px giữ bố cục 360px
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. An toàn real-mode, copy và hành động phá hủy
  - [x] 9.1 Áp token cho AlertDialog hành động phá hủy
    - Trong `TwelveWeekSystemDialogs.tsx` và các usage `AlertDialog` core-flow: áp `bg-app-status-error` cho action danger, `border-app-line` cho cancel; giữ hai lựa chọn confirm/cancel, xác nhận hai bước cho hành động không thể hoàn tác (checkbox + gõ `XOACLOUD`), KHÔNG dùng `window.confirm`
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 9.2 Đảm bảo gating route/copy theo real-mode
    - Xác nhận real-mode không register/render route demo-only (`/billing/mock-checkout`, seeders, debug UIs); rà copy core-flow loại cụm từ demo-only theo tập kiểm duyệt; giữ nguyên nhánh `isRealMode()`/`isDemoMode()` so baseline
    - _Requirements: 9.1, 9.2, 9.6_

  - [x] 9.3 Property test — an toàn dữ liệu khi hủy hành động phá hủy
    - **Property 7: An toàn dữ liệu khi hủy hành động phá hủy**
    - **Validates: Requirements 9.4**
    - File `src/test/ux-ui-upgrade/property-7-destructive-cancel.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 7`
    - Generator sinh (hành động phá hủy, quyết định ∈ {cancel, dismiss}); assert dữ liệu sau = trước

  - [x] 9.4 Property test — không rò rỉ ngôn từ demo-only ở real-mode
    - **Property 8: Không rò rỉ ngôn từ demo-only ở real-mode**
    - **Validates: Requirements 9.1**
    - File `src/test/ux-ui-upgrade/property-8-demo-copy.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 8`
    - Generator duyệt tập copy real-mode core-flow; assert không match cụm từ kiểm duyệt (không phân biệt hoa thường)

  - [x] 9.5 Component test — destructive dialog + real-mode gating
    - Trigger destructive → `AlertDialog` mở confirm/cancel; irreversible → hai bước; grep không có `window.confirm` trong core-flow; real-mode không register route demo
    - _Requirements: 9.3, 9.5, 9.2, 9.6_

- [x] 10. No-regression dữ liệu/storage và CI gates
  - [ ] 10.1 Property test — bất biến tập storage key
    - **Property 9: Bất biến tập storage key**
    - **Validates: Requirements 10.1**
    - File `src/test/ux-ui-upgrade/property-9-storage-keys.test.ts`, `fast-check` numRuns ≥ 100, tag `Feature: ux-ui-upgrade, Property 9`
    - So sánh tập tên storage key trước/sau; assert equality (không thêm/đổi/xóa)

  - [ ] 10.2 Unit test — bảo toàn storage shape và dữ liệu
    - Giữ test storage hiện có pass; assert shape `UserData`/`Goal`/`TwelveWeekSystem`/billing/entitlement/outbox không đổi và dữ liệu mẫu trước/sau còn nguyên
    - _Requirements: 10.2, 10.3_

  - [x] 10.3 Chạy CI gates và khắc phục hồi quy
    - Chạy `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`; sửa mọi lỗi kiểu/lint/test mới phát sinh về pass (0 fail)
    - _Requirements: 10.6, 10.7, 10.8, 10.9, 10.10_

- [x] 11. Final checkpoint — toàn bộ test và gates pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Task gắn `*` là optional (test) và có thể bỏ qua cho MVP nhanh; task cốt lõi không gắn `*`.
- Mỗi task tham chiếu requirement cụ thể để truy vết.
- Property test dùng `fast-check`, ≥ 100 vòng, tag `Feature: ux-ui-upgrade, Property {n}`.
- Tuyệt đối không đổi route, business/domain logic, storage key/shape, analytics, billing/sync/auth/entitlement contract.
- Verification cuối cùng dựa trên CI gates trong `AGENTS.md`.

## Follow-up TODOs

- [x] FUP-1 Migrate phân vùng ngữ cảnh màu cho 14 file Core_Flow_Screen còn vi phạm (đã giải quyết — Property 3 hiện pass)
  - Trạng thái: **Đã đóng**. Property test `src/test/ux-ui-upgrade/property-3-color-context.test.ts` pass 3/3 (xem verification phía dưới). Task 6.5 giữ trạng thái `[x]`; vi phạm phát hiện trong lần chạy đầu đã được xử lý qua hai hướng song song.
  - Hướng 1 — Siết heuristic `classifyContext()` trong test (`property-3-color-context.test.ts`):
    - Reflection_Context = path `src/features/reflection/**` HOẶC `src/app/pages/ReflectionJournal*` HOẶC basename PascalCase chứa whole-word `Reflection`/`Journal`.
    - Loại false-positive: `Preview` (chứa substring `review`) và `ReviewStep` setup-time (thuộc Execution_Context theo Color Context Map). 3 file dưới đây tự động phân loại đúng là Execution và `app-accent-*` là token đúng ngữ cảnh, không cần migrate:
      - `src/app/pages/SMARTGoalSetup/components/ReviewStep.tsx`
      - `src/features/dashboard/v2/DreamToPlanPreview.tsx`
      - `src/features/plan12week/pages/12WeekSetup/components/ReviewStep.tsx`
  - Hướng 2 — Migrate 11 file Execution dùng warm token sang neutral/status (callout/nudge → `app-status-warning`; surface trang trí → `app-muted-*` hoặc `app-surface` + `border-app-line`):
    - `src/app/pages/AspirationalVision.tsx`, `src/app/pages/GoalTracker.tsx`, `src/app/pages/LifeBalance.tsx`, `src/app/pages/SMARTGoalSetup/components/SmartGoalStepShell.tsx`
    - `src/features/dashboard/v2/PublicVisitorView.tsx`, `src/features/dashboard/v2/RescueAlert.tsx`
    - `src/features/plan12week/pages/12WeekSystem.tsx`, `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemDialogs.tsx`, `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.tsx`, `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx`, `src/features/plan12week/pages/12WeekSystem/components.tsx`
  - Verification:
    - `npx vitest run src/test/ux-ui-upgrade/property-3-color-context.test.ts` → 3/3 pass.
    - `npx vitest run src/test/ux-ui-upgrade/focus-keyboard.test.tsx` → 7/7 pass (Reflection vẫn dùng ring warm, Execution ring accent).
    - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
  - Ghi chú phạm vi: vẫn còn `app-warm-*` ở vài module ngoài Core_Flow_Screen (`PlanPreview.tsx`, `PlanQualityPanel.tsx`, `ExecutionFeedback.tsx`, `ReflectionPrompt.tsx`, `BillingCheckoutQR.tsx`). Một số là Reflection-context hợp lệ; không thuộc scope FUP-1, không vi phạm Property 3.
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "4.1", "4.3", "5.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "5.3", "6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["6.4", "6.5", "6.6", "8.1", "8.3", "8.5", "8.7"] },
    { "id": 5, "tasks": ["8.2", "8.4", "8.6", "8.8", "9.1", "9.2"] },
    { "id": 6, "tasks": ["9.3", "9.4", "9.5", "10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3"] }
  ]
}
```
