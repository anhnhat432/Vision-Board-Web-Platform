# Implementation Plan: global-ui-upgrade

## Overview

Kế hoạch triển khai theo hướng **elevate** (tinh chỉnh phong cách hiện có), bám sát design 3 lớp token và 13 correctness properties. Nguyên tắc **Mixed**: đóng băng Core contract (entitlement/route/auth/sync/copy theo App_Mode) trước, chỉ iterate tầng trình bày (`src/styles/*`, `src/app/components/*`, `src/app/pages/*`). Mọi thay đổi giữ nguyên tên Design_Token và props/API component; chỉ đổi giá trị/style bên trong.

Hạ tầng PBT được **tái sử dụng** từ `src/test/ux-ui-upgrade/` (`token-parser.ts`, `contrast.ts`, `baseline.ts`, các `*-scan.ts`) với **fast-check + Vitest**, mỗi property chạy tối thiểu `numRuns: 100` và gắn tag `Feature: global-ui-upgrade, Property {n}`. Mỗi bề mặt kết thúc bằng cổng xác minh (`npm run typecheck` / `npm run lint` / `npm run test:run` / `npm run build`).

Sub-task gắn hậu tố `*` là test tùy chọn (có thể bỏ để tăng tốc MVP), nhưng vẫn nằm trong đồ thị phụ thuộc.

## Tasks

- [x] 1. Chuẩn bị baseline và đóng băng Core contract
  - [x] 1.1 Mở rộng baseline token và storage cho `global-ui-upgrade`
    - Cập nhật `src/test/ux-ui-upgrade/baseline.ts`: chụp snapshot tập tên Design_Token và storage key hiện tại làm baseline bất biến (superset check cho Property 1, Property 11)
    - Không đổi tên/khóa nào; chỉ ghi nhận trạng thái hiện tại làm mốc
    - _Requirements: 1.3, 9.4_
  - [x] 1.2 Viết property test P11 bảo toàn key localStorage
    - **Property 11: Bảo toàn key localStorage**
    - **Validates: Requirements 9.4**
    - File mới `src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts`, tái dùng `storage-keys-scan.ts` + baseline; `fc.assert(..., { numRuns: 100 })`
  - [x] 1.3 Viết property test P12 ánh xạ trạng thái sync sang chỉ báo UI
    - **Property 12: Ánh xạ trạng thái sync sang chỉ báo UI phân biệt được**
    - **Validates: Requirements 9.5**
    - File mới `src/test/ux-ui-upgrade/global-property-12-sync-mapping.test.ts`, render mỗi state ∈ {synced, syncing, offline, error} cho real-mode signed-in; đối chiếu chỉ báo phân biệt (đơn ánh)
  - [x] 1.4 Viết property test P13 real mode không lộ copy demo-only
    - **Property 13: Real mode không lộ copy demo-only**
    - **Validates: Requirements 10.1**
    - File mới `src/test/ux-ui-upgrade/global-property-13-realmode-copy.test.ts`, quét cụm "dùng thử", "trên trình duyệt này", "không thu tiền thật", "mock", "demo" khi `isRealMode()`

- [ ] 2. Củng cố hệ Semantic/Component token trong `src/styles/tokens.css`
  - [x] 2.1 Củng cố cấu trúc 3 lớp và đồng bộ chú thích giá trị
    - Rà soát `tokens.css`: đảm bảo hướng tham chiếu hợp lệ (Semantic → {Primitive, Semantic}; Component → {Primitive, Semantic}), không token nào trỏ vào Component_Token, đồ thị `var()` acyclic
    - Đồng bộ chú thích khớp giá trị thực thi: radius card `14px → 18px`, control `11px → 12px`; giữ nguyên tên mọi token
    - _Requirements: 1.1, 1.3, 2.1, 2.5, 4.2_
  - [x] 2.2 Viết property test P1 bảo toàn tên token và bất biến 3 lớp
    - **Property 1: Bảo toàn tên token và bất biến cấu trúc 3 lớp**
    - **Validates: Requirements 1.3, 2.1**
    - Tái dùng `token-parser.ts` (`loadTokenSet`, `buildReferenceGraph`, `classifyLayer`, `resolveToken`): superset tên vs baseline, DFS acyclic, mọi chuỗi `var()` kết thúc tại literal Primitive
  - [x] 2.3 Hoàn thiện dark mode parity cho mọi Semantic_Token thị giác
    - Bổ sung override trong `html.dark` cho mọi Semantic_Token thị giác định nghĩa ở `:root` còn thiếu, để không token nào rơi về giá trị light khi bật `dark`
    - _Requirements: 6.1, 6.3_
  - [-] 2.4 Viết property test P5 dark parity
    - **Property 5: Dark mode parity cho mọi Semantic_Token thị giác**
    - **Validates: Requirements 6.1, 6.3**
    - So tập semantic light (`:root`) vs dark override (`html.dark`) qua `token-parser.ts`
  - [x] 2.5 Tinh chỉnh giá trị token để đạt ngưỡng contrast (giữ nguyên tên)
    - Điều chỉnh **giá trị** token ink/bg/line/status/focus ring ở cả light và dark để đạt body ≥ 4.5:1 và non-text/focus ≥ 3:1; ưu tiên chỉnh Primitive/Semantic, ghi lý do sắc độ trong comment; không thêm ngoại lệ literal cục bộ
    - _Requirements: 7.1, 7.2, 7.3_
  - [~] 2.6 Viết property test P6 contrast văn bản nội dung ≥ 4.5:1
    - **Property 6: Contrast văn bản nội dung ≥ 4.5:1**
    - **Validates: Requirements 7.1**
    - Tái dùng `contrast.ts` trên cặp (ink, bg hợp lệ) × mode ∈ {light, dark}
  - [~] 2.7 Viết property test P7 contrast phi văn bản và focus ring ≥ 3:1
    - **Property 7: Contrast thành phần phi văn bản và focus ring ≥ 3:1**
    - **Validates: Requirements 7.2, 7.3**
    - `contrast.ts` trên cặp (`--app-line-strong`/`--app-status-*`/`--app-focus-ring`/`--app-focus-ring-warm`, nền liền kề) × mode

- [ ] 3. Chuẩn hóa typography và motion trong `src/styles/theme.css`
  - [x] 3.1 Chuẩn hóa thang typography và line-height body
    - Đảm bảo thang `--text-xs … --text-display` đơn điệu không đảo bậc; đặt `--text-base--line-height` và `--text-sm--line-height` ≥ 1.45; đồng bộ chú thích font serif khớp `--app-font-serif` thực tế (`Bricolage Grotesque`) và `fonts.css`
    - _Requirements: 1.2, 3.1, 3.2, 2.5_
  - [x] 3.2 Viết property test P8 thang typography đơn điệu
    - **Property 8: Thang typography đơn điệu**
    - **Validates: Requirements 3.1**
    - Resolve `--text-*` qua `token-parser.ts`, so cặp bậc liền kề `xs → … → display`
  - [x] 3.3 Viết property test P9 line-height văn bản nội dung ≥ 1.45
    - **Property 9: Line-height văn bản nội dung ≥ 1.45**
    - **Validates: Requirements 3.2**
    - Resolve `--text-base--line-height`, `--text-sm--line-height`
  - [x] 3.4 Chuẩn hóa motion và loại color drift trong `theme.css`
    - Giữ mọi `--duration-*` dùng chung trong [150ms, 500ms], transition/animation dùng token `--duration-*`/`--ease-*`; thay drift trong `.ambient-glow::before/::after` (tím/indigo) và `.glass-surface-gradient-border` (xanh dương/cyan) cùng literal `#7c3aed`/`#2563eb`/`.dark .bg-violet-600` bằng gradient/token thương hiệu Forest Green
    - _Requirements: 8.1, 8.2, 8.4, 2.3_
  - [-] 3.5 Viết property test P10 thời lượng transition trong [150ms, 500ms]
    - **Property 10: Thời lượng transition dùng chung trong [150ms, 500ms]**
    - **Validates: Requirements 8.2**
    - Resolve `--duration-*` qua `token-parser.ts`

- [x] 4. Đồng bộ Tailwind bridge trong `tailwind.config.js`
  - [x] 4.1 Đồng bộ chú thích ↔ giá trị và kiểm tra ánh xạ bridge
    - Cập nhật comment `card 14px → 18px`, `control 11px → 12px` khớp `tokens.css`; đảm bảo mỗi utility màu/shape/shadow/spacing ánh xạ đúng một Semantic_Token qua `var(...)`
    - _Requirements: 2.5, 2.1, 4.2_

- [ ] 5. Loại color drift và chuẩn hóa token ở tầng consumer
  - [x] 5.1 Thay drift và Primitive trực tiếp trong `src/app/components/**`
    - Thay literal màu drift (tím/indigo/xanh dương/cyan, `bg-violet-*`) và mọi tham chiếu Primitive trực tiếp (`--green-*`, `--terra-*`, `--neutral-*`) bằng Semantic/Component token đúng ngữ cảnh; thay `font-size`/`line-height`/spacing/radius/box-shadow/duration/easing literal trùng token bằng token tương ứng
    - _Requirements: 2.2, 2.3, 2.4, 3.4, 4.4, 5.1, 6.4, 8.1, 8.4_
  - [ ] 5.2 Thay drift và Primitive trực tiếp trong `src/app/pages/**`
    - Áp dụng cùng quy tắc thay literal → token cho các Product_Page; vùng Reflection dùng `--app-warm*`/`--reflection-*`, vùng khác dùng `--app-accent*`
    - _Requirements: 2.2, 2.3, 2.4, 1.4, 3.4, 4.4, 6.4, 8.4_
  - [~] 5.3 Viết property test P2 tầng tiêu thụ chỉ dùng token
    - **Property 2: Tầng tiêu thụ chỉ dùng token, không literal giá trị dùng chung**
    - **Validates: Requirements 2.2, 2.4, 3.4, 4.4, 5.1, 6.4, 8.1, 8.4**
    - Scan `src/app/components/**` + `src/app/pages/**` bằng `token-scan.ts` + regex token-vs-literal
  - [~] 5.4 Viết property test P3 không còn Color_Drift ngoài Brand_Identity
    - **Property 3: Không còn Color_Drift ngoài Brand_Identity**
    - **Validates: Requirements 2.3**
    - Scan `src/styles/**` + `src/app/**` với tập literal drift; tái dùng `calm-style-scan.ts`
  - [~] 5.5 Viết property test P4 phân vùng ngữ cảnh màu (warm chỉ trong Reflection)
    - **Property 4: Phân vùng ngữ cảnh màu (warm chỉ trong Reflection)**
    - **Validates: Requirements 1.4**
    - Classify context theo path/khối, kiểm file ngoài Reflection không tham chiếu `--app-warm*`/`--reflection-*`/`--app-focus-ring-warm`

- [~] 6. Checkpoint - Đảm bảo token nền và drift-removal ổn định
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Nâng polish các UI_Component dùng chung (giữ nguyên props/API)
  - [~] 7.1 Áp elevation và trạng thái hover/disabled dùng token
    - Áp `--app-shadow-sm … --app-shadow-xl` / `--shadow-1 … --shadow-5` theo mức nổi khối; hover dùng token màu + `--duration-*`/`--ease-*`; disabled dùng `--app-ink-disabled`; giữ nguyên tên props, kiểu props và hành vi API
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 8.1_
  - [~] 7.2 Chuẩn hóa focus ring theo ngữ cảnh
    - Dùng `--app-focus-ring` cho Execution và `--app-focus-ring-warm` cho Reflection_Context khi focus bằng bàn phím; giữ nguyên cấu trúc component
    - _Requirements: 5.3, 5.5, 7.3_
  - [~] 7.3 Viết unit/DOM test hover/focus/disabled và elevation
    - Kiểm CSS state + DOM focus cho UI_Component tương tác; xác nhận props/API không đổi
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  - [~] 7.4 Giữ xanh regression test focus bàn phím
    - Chạy và bảo toàn `focus-keyboard.test.tsx`
    - _Requirements: 7.3, 11.3_

- [ ] 8. Đồng bộ Product_Page: typography/spacing/radius và page transition
  - [~] 8.1 Áp thang typography, spacing và radius token trên Product_Page
    - Dùng bậc typography thống nhất cho tiêu đề/nội dung; `--app-section-gap*` cho khoảng cách section, `--app-card-padding*` cho padding card, `--app-radius-*` theo loại phần tử; tiêu đề cấp trang cùng bậc trên các trang tương đương
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.3_
  - [~] 8.2 Áp hiệu ứng chuyển trang dùng token motion
    - Áp class `page-enter` (hoặc tương đương) dùng `--duration-*`/`--ease-*` khi điều hướng vào Product_Page
    - _Requirements: 8.1, 8.3, 8.4_
  - [~] 8.3 Viết DOM test nhất quán trang và page transition
    - Render nhóm trang/component cùng loại kiểm cùng token; kiểm class chuyển trang dùng token motion
    - _Requirements: 3.3, 4.3, 8.3_

- [ ] 9. Hoàn thiện accessibility reduced-motion
  - [~] 9.1 Bảo đảm reduced-motion qua media query toàn cục
    - Trong `src/styles/index.css` (global), giảm/tắt animation không thiết yếu khi `prefers-reduced-motion: reduce`; component không tự bật animation bỏ qua media query
    - _Requirements: 7.4_
  - [~] 9.2 Giữ xanh regression test reduced-motion
    - Chạy và bảo toàn `reduced-motion.test.tsx` qua `matchMedia`
    - _Requirements: 7.4, 11.3_

- [ ] 10. Bảo toàn copy theo App_Mode và chỉ báo sync
  - [~] 10.1 Giữ nhánh copy real/demo và gate route demo khi polish
    - Khi chỉnh chuỗi copy lúc polish, giữ nguyên nhánh `isRealMode()` / `isDemoMode()`; không đăng ký/render route hoặc UI demo (`/billing/mock-checkout`, debug gated `VITE_SHOW_BILLING_DEBUG`/`VITE_SHOW_SYNC_DEBUG`) trong real mode; không để lộ copy demo-only
    - _Requirements: 10.1, 10.2, 10.3, 9.2_
  - [~] 10.2 Giữ nguyên chỉ báo trạng thái sync cho real-mode signed-in
    - Bảo toàn chỉ báo synced/syncing/offline/error khi polish trình bày, không đổi ngữ nghĩa ánh xạ state → UI
    - _Requirements: 9.5, 9.1, 9.3, 9.4_
  - [~] 10.3 Giữ xanh regression test route + copy mode và gating
    - Chạy và bảo toàn `public-legal-demo-copy.test.ts`, `destructive-dialog-realmode-gating.test.tsx`, `no-window-confirm-runtime.test.ts`
    - _Requirements: 10.1, 10.2, 10.3, 11.3_

- [~] 11. Checkpoint cuối - Cổng xác minh regression toàn cục
  - Ensure all tests pass, ask the user if questions arise.
  - Chạy `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` (dùng `npm run check` nếu ảnh hưởng rộng); giữ xanh mọi contract test hiện có (`reflection-layout-contract`, `empty-state-contract`, a11y, `focus-keyboard`, `reduced-motion`, `destructive-dialog-realmode-gating`, `no-window-confirm-runtime`, `public-legal-demo-copy`). Nếu một bước fail do nâng cấp, sửa nguyên nhân gốc trước khi coi là hoàn tất.
  - _Requirements: 11.1, 11.2, 11.3_

## Notes

- Sub-task gắn `*` là test tùy chọn, có thể bỏ để tăng tốc MVP; core implementation không bao giờ bị đánh dấu tùy chọn.
- Mỗi task tham chiếu sub-requirement cụ thể để truy vết.
- Property test tái sử dụng helper hiện có (`token-parser.ts`, `contrast.ts`, `baseline.ts`, `*-scan.ts`), fast-check + Vitest, `numRuns: 100`, tag `Feature: global-ui-upgrade, Property {n}`.
- Không đổi tên Design_Token và không đổi props/API component — chỉ đổi giá trị/style bên trong.
- Core (entitlement/route/auth/sync/copy mode) đóng băng; Shell chỉ đọc, không sửa Core.
- Checkpoint đảm bảo xác minh tăng dần; bề mặt dùng chung nên chạy `npm run check`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.3", "3.4", "2.2", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.5", "2.4", "3.5", "5.1"] },
    { "id": 4, "tasks": ["2.6", "2.7", "5.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 6, "tasks": ["7.1", "8.1"] },
    { "id": 7, "tasks": ["7.2", "8.2", "9.1"] },
    { "id": 8, "tasks": ["7.3", "7.4", "8.3", "9.2", "10.1"] },
    { "id": 9, "tasks": ["10.2"] },
    { "id": 10, "tasks": ["10.3"] }
  ]
}
```
