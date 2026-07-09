# Verification Report — core-flow-ui-upgrade (Task 13.2)

_Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

Chạy tuần tự bốn lệnh kiểm chứng chuẩn của dự án từ repo root. Ghi exit code + tóm tắt output từng lệnh.

## Kết quả pipeline

| # | Lệnh | Exit code | Kết quả |
|---|------|-----------|---------|
| 1 | `npm run typecheck` (`tsc --noEmit`) | 0 | PASS |
| 2 | `npm run lint` (`biome lint .`) | 0 | PASS (0 warning sau khi sửa) |
| 3 | `npm run test:run` (`vitest run --config vitest.fast.config.ts`) | 0 | PASS — 131 files, 1331 tests |
| 4 | `npm run build` (`vite build`) | 0 | PASS — 3046 modules, built in ~11s |

→ Cả 4 lệnh exit code 0 ⇒ bước kiểm chứng THÀNH CÔNG (Req 11.2).

### Chi tiết output

1. **typecheck**: `tsc --noEmit` không phát sinh lỗi type. Exit 0.
2. **lint**: Lần chạy đầu báo 1 warning `lint/correctness/noUnusedImports` tại `src/features/plan12week/local-first.test.ts:37` (import `addGoal` không dùng — file do spec này tạo). Đã loại bỏ import thừa. Chạy lại: `Checked 981 files`, 0 warning. Exit 0.
3. **test:run**: 131 test files, 1331 tests passed, duration ~34s. Bao gồm toàn bộ PBT của spec (`property-*`, `widgetPriority`, `core-flow-position`, `demo-copy-guard`, `useScreenDataState`, `calm-style-audit`, `local-first`, `brand-preservation`, `SyncStatusIndicator`...). Exit 0.
   - Lưu ý: `test:run` dùng `vitest.fast.config.ts`, KHÔNG chạy suite e2e `src/app/pages/authenticated-core-flow.e2e.test.tsx` (suite này cần backend thật — pre-existing, ngoài phạm vi task này).
4. **build**: `vite build` transform 3046 modules, tạo bundle `dist/` thành công. Exit 0.

## Lệnh không chạy được (Req 11.4)

Không có. Cả 4 lệnh chuẩn đều chạy được và exit 0. Suite e2e phụ thuộc backend (`authenticated-core-flow.e2e.test.tsx`) không nằm trong `test:run` mặc định; để chạy cần backend + Firebase + biến môi trường (xem AGENTS.md phần LWW Sync E2E). Đây là pre-existing, không do spec này gây ra.

## File thay đổi bởi task 13.2

- `src/features/plan12week/local-first.test.ts` — xóa import `addGoal` không dùng (fix warning lint spec-introduced, minimal).

## Rủi ro / TODO còn lại

- Suite e2e `authenticated-core-flow.e2e.test.tsx` vẫn cần backend + credentials để verify đầy đủ (pre-existing, ngoài scope).
- Task optional còn `[ ]`: 5.3, 6.2 (unit test UI bổ sung) — không bắt buộc cho MVP.
- Core contract giữ nguyên: không đổi storage keys/shape, Entitlement_Authority, billing route behavior, branching `isRealMode()`/`isDemoMode()`.
