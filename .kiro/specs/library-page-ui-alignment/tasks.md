# Implementation Plan: Library Page UI Alignment

## Overview

Kế hoạch triển khai căn chỉnh giao diện `VisionBoardGallery` (route `/gallery`) cho đồng bộ với Design_System, **chỉ sửa lớp trình bày** và **bóc tách bảo toàn hành vi** phần logic thuần. Thứ tự thực thi được sắp xếp tăng dần: (1) bóc tách selector thuần + test oracle để chốt "hành vi dữ liệu không đổi", (2) tích hợp selector vào component, (3) căn chỉnh từng vùng trình bày (container → hero → bento → toolbar → thẻ → empty/loading/error) theo từng bước nhỏ trên cùng file `VisionBoardGallery.tsx`, (4) thêm registry test-only và các property test bất biến trình bày, (5) unit/integration test và checkpoint kiểm chứng.

Mọi thay đổi tuân thủ AGENTS.md: nhỏ, có kiểu, tập trung; không đổi Storage_Contract, sync semantics, route, hay nhánh `isRealMode()`/`isDemoMode()`. Ngôn ngữ triển khai: **TypeScript/React** (theo design).

## Tasks

- [x] 1. Bóc tách selector thuần (behavior-preserving)
  - [x] 1.1 Tạo module selector thuần `gallerySelectors.ts`
    - Tạo file `src/app/pages/vision-board-gallery/gallerySelectors.ts`
    - Bóc tách **nguyên trạng** logic đang inline trong `VisionBoardGallery.tsx` thành các hàm thuần: `filterAndSortBoards`, `groupBoardsByYear`, `resolveGroupedByYear`, `computeGalleryStats`
    - Khai báo type `VisionBoardSort` và interface `GalleryStats` theo design; import `VisionBoard` từ `@/app/utils/storage`
    - Giữ đúng thuật toán/thứ tự so sánh/giá trị trả về (search trim + case-insensitive, lọc năm, sort `newest`/`oldest`/`name`/`items`, gom nhóm theo `year`, công thức stats + phân bổ %)
    - _Requirements: 10.2, 10.3_

  - [x] 1.2 Property test cho filter/sort/group (oracle)
    - File `src/app/pages/vision-board-gallery/gallerySelectors.test.ts`
    - **Property 6: Lọc/sắp xếp/gom nhóm bảo toàn hành vi (oracle)**
    - **Validates: Requirements 10.2**
    - Dùng fast-check `{ numRuns: 100 }`, generator `arbVisionBoard` + tổ hợp `(searchTerm, selectedYear, sortBy, viewMode)`
    - Tag: `// Feature: library-page-ui-alignment, Property 6: ...`

  - [x] 1.3 Property test cho stats (oracle)
    - File `src/app/pages/vision-board-gallery/gallerySelectors.stats.test.ts`
    - **Property 7: Thống kê chính xác và nhất quán**
    - **Validates: Requirements 10.3**
    - fast-check `{ numRuns: 100 }`; assert `total`/`totalItemsCount`/`yearsCount`/`avgItems`/`distribution` theo công thức, mỗi % ∈ [0,100]
    - Tag: `// Feature: library-page-ui-alignment, Property 7: ...`

- [x] 2. Tích hợp selector vào component (giữ nguyên I/O)
  - [x] 2.1 Thay logic inline trong `VisionBoardGallery.tsx` bằng import từ `gallerySelectors`
    - Import và dùng `filterAndSortBoards`/`groupBoardsByYear`/`resolveGroupedByYear`/`computeGalleryStats` trong các `useMemo` hiện có
    - Không đổi input/output, không đổi điều kiện gom nhóm, không đổi state `searchTerm/selectedYear/sortBy/viewMode`
    - Chạy `npm run typecheck` để xác nhận không đổi kiểu
    - _Requirements: 10.2, 10.3_

- [x] 3. Chuẩn hoá container trang (Standard_Page_Container)
  - [x] 3.1 Thay `<div>` gốc bằng Standard_Page_Container trong `VisionBoardGallery.tsx`
    - Đổi container gốc thành `stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8`
    - Xoá chuỗi `bg-gradient-to-br from-app-bg ... to-app-accent-subtle/30`, `dark:from-app-bg ...`, `border border-app-line/40`, `shadow-app-sm`, `overflow-hidden`, `relative`, `min-h-[600px]`, `animate-fade-in`
    - Xoá khối "Background Aurora Orbs" chứa `blur-[120px]` và wrapper `relative z-10`
    - Khối nội dung con dùng `bg-app-surface`/`bg-app-bg-subtle`; radius chỉ dùng `rounded-card`/`rounded-card-lg`/`rounded-[var(--r-*)]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Căn chỉnh Hero theo PageHero chuẩn
  - [x] 4.1 Chuẩn hoá hero + gỡ mockup 3D trong `VisionBoardGallery.tsx`
    - Giữ nguyên nội dung/đích: eyebrow "Thư viện Bản vẽ Tương lai", Primary_CTA "Tạo bảng mới" → `navigate("/vision-board")`, phụ "Trang chủ" → `navigate("/")`, giữ `serif`
    - `title`: bỏ `<span className="bg-gradient-to-r ... bg-clip-text text-transparent">`, cụm nhấn dùng `<span className="text-app-accent">`
    - `aside`: thay `<Gallery3DHeroMockup />` bằng `VisionMapIllustration` tĩnh bọc `<div aria-hidden="true">` (hoặc bỏ trống `aside`); bỏ `perspective`/`translateZ`/`rotate`/tape
    - Xoá định nghĩa function `Gallery3DHeroMockup` khỏi file; bỏ `group-hover:scale-105 transition-transform` trên CTA
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.3, 4.4, 9.5_

- [x] 5. Căn chỉnh Bento stats theo token
  - [x] 5.1 Chuẩn hoá 4 stat card trong `VisionBoardGallery.tsx`
    - Mỗi `Card`: nền `bg-app-surface`, viền `border-app-line`, phân tách `shadow-app-sm`; bỏ mọi `bg-gradient-*`, overlay gradient `absolute inset-0`, `group-hover:*scale*`, `rotate-12`
    - Bỏ `animate-pulse` trên icon `Sparkles`; icon badge dùng `bg-app-accent`/`bg-app-accent-soft`/`bg-app-warm-soft`
    - Biểu đồ phân bổ: Hình ảnh → `bg-app-accent`, Câu nói → `bg-app-warm`, Biểu tượng → `bg-app-status-info`, track `bg-app-line/45`; bỏ `amber-500`/`indigo-500` và mọi màu ngoài token
    - Giữ nguyên công thức tính `stats` và điều kiện hiển thị
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.2, 5.1, 5.3, 5.4, 5.5, 8.1, 8.2, 8.5_

- [x] 6. Căn chỉnh Toolbar + nhãn a11y
  - [x] 6.1 Chuẩn hoá search/select/view toggle trong `VisionBoardGallery.tsx`
    - Đảm bảo `<input>` search và `<select>` dùng `rounded-[var(--r-input)]`, `border-app-line`, `focus:ring-app-accent/*`
    - Thêm `aria-label` (hoặc `<label className="sr-only">`) cho input search và mỗi `select` (năm, sắp xếp)
    - View toggle giữ `Button variant="ghost"`; trạng thái active dùng token `bg-app-surface text-app-accent border-app-line/*`
    - Giữ nguyên state và logic lọc/sắp xếp
    - _Requirements: 6.5, 9.2, 9.3, 9.4_

- [x] 7. Căn chỉnh thẻ board (grid + list + collage)
  - [x] 7.1 Gỡ InteractiveSurface, chuẩn hoá overlay/màu/a11y thẻ trong `VisionBoardGallery.tsx`
    - Gỡ `InteractiveSurface`, render `Card` trực tiếp với phản hồi tĩnh `transition-shadow duration-300 hover:shadow-app-lg`
    - Overlay hover: bỏ `bg-black/40 backdrop-blur-[3px]` + `translate-y`; render hàng action tĩnh dùng `Button` token (đổi opacity ≤ 300ms khi hover/focus-within, không scale/blur/3D); bỏ `bg-white text-app-accent`
    - Thêm `aria-label` cho nút icon xem/sửa/xoá (Req 9.1); giữ `title`
    - `BoardCollagePreview`: gỡ tape (`bg-white/40 backdrop-blur`), `group-hover:scale-105`, `-rotate-6`/`rotate-6`/`rotate-1`; nền `bg-app-bg-subtle`, viền `border-app-line`, polaroid frame `bg-app-surface`/`border-app-line`
    - `BoardListView`: đổi màu sync `text-amber-600` → `text-app-status-warning`; thêm `aria-label` nút icon
    - Giữ nguyên `navigate` đích, spotlight, chỉ báo sync, luồng xoá `AlertDialog` + `deleteVisionBoard`/`backendDeleteVisionBoard`
    - _Requirements: 3.1, 3.3, 3.5, 5.1, 5.2, 5.5, 6.1, 6.3, 6.4, 8.5, 9.1, 9.2, 10.4, 10.5, 10.6_

- [x] 8. Empty / Loading / Error states
  - [x] 8.1 Chuẩn hoá skeleton + thêm nhánh lỗi tải trong `VisionBoardGallery.tsx`
    - Giữ hai nhánh `EmptyState` (thư viện trống, lọc-không-kết-quả) không đổi điều kiện
    - Chuẩn hoá `VisionBoardGallerySkeleton`: mỗi vùng chính (hero, stats, toolbar, grid) có đúng một nhóm skeleton; không glow/3D/loop, mọi transition ≤ 300ms; giữ gate `if (!userData)` và `role="status"`/`aria-busy`
    - Bổ sung nhánh **trình bày** lỗi tải: hiển thị `EmptyState`/`InlineStatusMessage tone="error"` với thông báo "Không tải được dữ liệu thư viện" + `Button` "Thử lại" gọi `reloadUserData()`; không giữ skeleton sau khi vào lỗi; không đổi Data_Behavior
    - _Requirements: 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Checkpoint - Đảm bảo build/test xanh sau phần trình bày
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Registry kiểm chứng trình bày (TEST-ONLY)
  - [x] 10.1 Tạo `decoration-registry.ts` test-only
    - File `src/app/pages/vision-board-gallery/__tests__/decoration-registry.ts` (không import vào bundle runtime)
    - Khai báo `FORBIDDEN_DECORATION_PATTERNS`, `FORBIDDEN_COLOR_PATTERNS`, `DEMO_ONLY_PHRASES` và hàm `findForbiddenDecorations(markup)` theo design
    - Bổ sung allowlist loại token hợp lệ (`--r-*`, `app-*`, `--chart-*`) trước khi so khớp để tránh dương tính giả
    - _Requirements: 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 5.1, 8.1, 11.1_

- [x] 11. Property tests bất biến trình bày
  - [x] 11.1 Property test: không có lớp trang trí ngoài hệ thống
    - File `src/app/pages/vision-board-gallery/__tests__/forbidden-decorations.pbt.test.tsx`
    - **Property 1: Không tồn tại lớp trang trí ngoài hệ thống trong markup**
    - **Validates: Requirements 1.2, 1.3, 1.4, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 7.3**
    - fast-check `{ numRuns: 100 }`; render 4 nhánh (grid gom nhóm, grid phẳng, list, skeleton) với `arbUserData`; assert `findForbiddenDecorations(container.innerHTML) === []`
    - Tag: `// Feature: library-page-ui-alignment, Property 1: ...`

  - [x] 11.2 Property test: mọi màu thuộc tập token
    - File `src/app/pages/vision-board-gallery/__tests__/forbidden-colors.pbt.test.tsx`
    - **Property 2: Mọi màu đều thuộc tập token Design_System**
    - **Validates: Requirements 4.2, 5.1, 5.3, 5.4, 5.5, 8.1, 8.2, 8.5**
    - fast-check `{ numRuns: 100 }`; assert markup không match `FORBIDDEN_COLOR_PATTERNS`
    - Tag: `// Feature: library-page-ui-alignment, Property 2: ...`

  - [x] 11.3 Property test: Standard_Page_Container hợp lệ
    - File `src/app/pages/vision-board-gallery/__tests__/standard-container.pbt.test.tsx`
    - **Property 3: Container trang là Standard_Page_Container hợp lệ**
    - **Validates: Requirements 1.1, 1.6**
    - fast-check `{ numRuns: 100 }`; assert container gốc có `mx-auto max-w-6xl` + `px-4 sm:px-6 lg:px-8 pb-12 pt-8`, không phải wrapper gradient/orbs
    - Tag: `// Feature: library-page-ui-alignment, Property 3: ...`

  - [x] 11.4 Property test: cấu trúc heading hợp lệ
    - File `src/app/pages/vision-board-gallery/__tests__/heading-structure.pbt.test.tsx`
    - **Property 4: Đúng một tiêu đề cấp trang và cấu trúc heading hợp lệ**
    - **Validates: Requirements 4.4**
    - fast-check `{ numRuns: 100 }`; assert đúng một `h1`, các heading còn lại cấp ≥ 2
    - Tag: `// Feature: library-page-ui-alignment, Property 4: ...`

  - [x] 11.5 Property test: a11y phần tử tương tác
    - File `src/app/pages/vision-board-gallery/__tests__/a11y-interactive.pbt.test.tsx`
    - **Property 5: Mọi phần tử tương tác có accessible name và không dùng tabindex dương**
    - **Validates: Requirements 9.1, 9.3, 9.4**
    - fast-check `{ numRuns: 100 }`; assert mọi nút icon + control có accessible name không rỗng, không có `tabindex` dương
    - Tag: `// Feature: library-page-ui-alignment, Property 5: ...`

  - [x] 11.6 Property test: real mode không rò rỉ Demo_Only_Copy
    - File `src/app/pages/vision-board-gallery/__tests__/real-mode-copy.pbt.test.tsx`
    - **Property 8: Real mode không rò rỉ Demo_Only_Copy**
    - **Validates: Requirements 11.1, 11.3**
    - fast-check `{ numRuns: 100 }`; render real mode (kể cả `VITE_APP_MODE` thiếu/không hợp lệ), assert markup không chứa `DEMO_ONLY_PHRASES` (không phân biệt hoa/thường)
    - Tag: `// Feature: library-page-ui-alignment, Property 8: ...`

- [x] 12. Unit / integration tests bổ trợ
  - [x] 12.1 Unit/example tests cho component
    - File `src/app/pages/vision-board-gallery/__tests__/VisionBoardGallery.test.tsx`
    - Hero (title slot, eyebrow, CTA đích `/vision-board` & `/`, serif); reuse `Card`/`Button`/`Badge`/`EmptyState`; toolbar token; skeleton mapping + biến mất khi có dữ liệu; nhánh lỗi tải + "Thử lại" gọi `reloadUserData`; màu trạng thái sync theo token; xoá `AlertDialog` hai bước; App_Mode real vs demo cho cùng dữ liệu; illustration/aside có `aria-hidden`
    - Spy `getUserData`/`saveUserData`/`deleteVisionBoard`/`backendGetVisionBoards`/`backendDeleteVisionBoard`/`getBackendVisionBoardId` để khẳng định Data_Behavior không đổi
    - _Requirements: 2.1, 2.2, 4.3, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 7.5, 9.5, 10.1, 10.4, 10.5, 10.6, 11.2, 11.4_

  - [x] 12.2 Integration/DOM tests: contrast + mobile-safety
    - File `src/app/pages/vision-board-gallery/__tests__/VisionBoardGallery.integration.test.tsx`
    - `axe-core` (jest-axe/vitest-axe) trên Light_Mode và Dark_Mode; toggle `html.dark` không cần reload; viewport 320–767px assert `scrollWidth <= clientWidth`; Primary_CTA `min-h`/`min-w` ≥ 44px
    - _Requirements: 8.3, 8.4, 8.6, 8.7, 12.3, 12.4_

- [ ] 13. Checkpoint cuối - Chuỗi kiểm chứng frontend
  - Ensure all tests pass, ask the user if questions arise.
  - Chạy tuần tự `npm run typecheck` → `npm run lint` → `npm run test:run` → `npm run build`; grep guard `VisionBoardGallery.tsx` còn sót `duration-500/700/1000`, `animate-pulse`, `blur-[120px]`, `perspective`, `hover:scale-`
  - _Requirements: 12.1_

## Notes

- Task gắn `*` là test tùy chọn (có thể bỏ để MVP nhanh); task lõi không bao giờ gắn `*`.
- Các task 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1 cùng sửa `VisionBoardGallery.tsx` nên được xếp ở các wave khác nhau để tránh xung đột ghi file.
- Mỗi property test = MỘT test, chạy fast-check ≥ 100 iteration, gắn tag `// Feature: library-page-ui-alignment, Property {n}: ...`.
- Property 6/7 kiểm hành vi dữ liệu qua selector oracle; Property 1–5, 8 kiểm bất biến trình bày trên markup render.
- Checkpoint đảm bảo kiểm chứng tăng dần; task 13 chạy đủ pipeline theo Req 12.1.
- Tuyệt đối không đổi Storage_Contract, sync semantics, route, hay nhánh `isRealMode()`/`isDemoMode()`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 9, "tasks": ["12.1", "12.2"] }
  ]
}
```
