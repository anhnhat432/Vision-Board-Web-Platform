# Task 8 — Backend Phase 0 verification

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-7 đã xong (`OrderCatalogModel`, seed script, 4 endpoints public+admin).

Hãy thực hiện **Task 8: Verify toàn bộ Phase 0 backend**.

## Mục tiêu

Xác nhận Phase 0 hoạt động end-to-end:
- Typecheck pass
- Toàn bộ test pass
- Seed chạy thành công và `GET /api/order-catalog` trả 22 items

## Steps

### 1. Typecheck full backend

```bash
npm --prefix backend run typecheck
```
Expected: 0 errors.

Nếu có error: sửa hết rồi mới đi tiếp.

### 2. Run toàn bộ backend test

```bash
npm --prefix backend test
```
Expected: tất cả test pass (bao gồm các test mới của orderCatalog + các test cũ không bị vỡ).

Nếu có test cũ FAIL do thay đổi nào đó (vd `adminRoutes` đụng nhầm export): điều tra và sửa.

### 3. Chạy seed trên DB dev (nếu environment có MongoDB chạy)

```bash
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
```
Expected: `Seeded 22 catalog items`.

Nếu không có MongoDB local: skip step này, ghi rõ trong báo cáo.

### 4. Smoke test endpoint (nếu seed step 3 chạy được)

Khởi động backend dev:
```bash
npm --prefix backend run dev
```

Trong tab khác:
```bash
curl http://localhost:<PORT>/api/order-catalog | jq '.data | length'
```
Expected: `22`.

Tham khảo `backend/package.json` để biết `<PORT>` (thường là `3000` hoặc `4000`, hoặc `.env` chỉ định).

Stop dev server sau khi check xong.

### 5. Báo cáo

Báo lại cho tôi:
- Typecheck: PASS / FAIL (kèm chi tiết)
- Toàn bộ test: số test PASS / số FAIL
- Seed: thành công / skip (lý do)
- Endpoint curl: kết quả (số items)
- Bất kỳ vấn đề nào phát hiện trong quá trình verify

**Không cần commit** trừ khi phát hiện bug và phải fix — nếu có fix, commit message: `fix(backend): <mô tả>`.

Bắt đầu làm.
