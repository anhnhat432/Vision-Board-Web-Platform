# Blocker B3 — Billing tạm khóa: copy "Thanh toán đang tạm khóa do chuyển nhà cung cấp"

> Phát hiện trong P1 audit. Trang `/billing/plan` đang hiển thị thông báo billing tắt → không demo được Plus upgrade trước lớp.
>
> Đọc trước: `qa-artifacts/p1-audit/REPORT.md` mục B3, `docs/PAYMENT_PROVIDER_MIGRATION.md`, `docs/ops/payos-migration-plan.md`.

---

## Triệu chứng

Trang [`/billing/plan`](https://dearourfuture.io.vn/billing/plan) hiển thị:

> **Thanh toán đang tạm khóa.**
> Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu cần nâng cấp thủ công: dearourfuture123@gmail.com.

User free không có nút "Nâng cấp Plus". User Plus (account audit) vẫn vào được nhưng không có flow upgrade.

## Bối cảnh

Sản phẩm đang trong giai đoạn migrate Casso/VietQR → PayOS (xem docs ops). Billing disable là **chủ ý**, không phải bug.

## Quyết định cần làm trước demo

Đây là blocker dạng **product decision**, không phải kỹ thuật. 3 lựa chọn:

### Option A — Hoàn thành migration PayOS trước demo

- **Effort**: lớn (cần backend, frontend, test integration với PayOS, sandbox + production).
- **Khuyến nghị**: chỉ làm nếu đã ở phase 8/10 của migration. Đọc `docs/ops/payos-migration-plan.md` để xem progress.
- **Lợi ích**: demo được full flow upgrade, ấn tượng nhất.
- **Rủi ro**: nếu rush, có thể vỡ flow billing thật → user mất tiền.

### Option B — Tạm thời bật lại Casso (rollback migration)

- **Effort**: vừa (revert PR migration, redeploy).
- **Khuyến nghị**: chỉ làm nếu Casso integration còn working và rollback an toàn.
- **Lợi ích**: demo flow QR code Casso như trước.
- **Rủi ro**: rollback có thể conflict với data PayOS đã produce (nếu có).

### Option C (khuyến nghị) — Giữ disabled, polish copy + script demo

- **Effort**: nhỏ (chỉ sửa copy + ẩn route khỏi sidebar).
- **Khuyến nghị cao**: an toàn nhất cho timeline 1 tuần.
- **Lợi ích**: không động chạm backend, demo vẫn show 80% giá trị sản phẩm.
- **Rủi ro**: thầy có thể hỏi về monetization → phải có câu trả lời chuẩn.

---

## Phương án triển khai Option C (khuyến nghị)

### Phase B3-1 — Hỏi user quyết định

Trước khi sửa code, **hỏi user 3 câu**:

1. **Chọn Option A/B/C?** Mặc định khuyến nghị C.
2. **Có muốn ẩn `/billing/plan` khỏi sidebar trong nav demo không?** (Hoặc giữ nguyên + chỉ sửa copy.)
3. **Có muốn thay copy "Thanh toán đang tạm khóa" thành ngôn ngữ tích cực hơn không?** (Ví dụ: "Đang nâng cấp hệ thống thanh toán — sẵn sàng trong vài ngày tới.")

Nếu user chưa quyết, dừng lại đợi.

### Phase B3-2 — Polish copy (nếu chọn C)

Mở file billing plan page. Tìm bằng grep:

```bash
rtk grep -rn "Thanh toán đang tạm khóa" src/ --include="*.ts" --include="*.tsx" | head -5
```

Đổi copy thành (option đề xuất):

```
Trước:
"Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu cần nâng cấp thủ công: dearourfuture123@gmail.com."

Sau:
"Đang hoàn tất tích hợp hệ thống thanh toán mới — sẵn sàng trong tuần tới. Nếu bạn muốn nâng cấp ngay, liên hệ support@dearourfuture.com để mở Plus thủ công."
```

Lý do:

- "Đang hoàn tất tích hợp" — chủ động hơn "tạm khóa do chuyển nhà cung cấp".
- "Sẵn sàng trong tuần tới" — có deadline → tạo cảm giác sản phẩm còn sống.
- Đổi email support sang `support@dearourfuture.com` thay vì `dearourfuture123@gmail.com` — pro hơn (đảm bảo email này có inbox).

### Phase B3-3 — (Optional) Ẩn link khỏi sidebar demo

Nếu user chọn ẩn:

```bash
rtk grep -rn "Gói & thanh toán" src/app/components/root-layout/ --include="*.ts" --include="*.tsx"
```

Tìm `navConfig.ts` hoặc tương đương. Thêm flag:

```ts
// Pseudocode
{
  path: "/billing/plan",
  label: "Gói & thanh toán",
  icon: CreditCard,
  hideWhenBillingDisabled: true, // mới
}
```

Trong renderer, check env flag (vd `VITE_BILLING_DISABLED=true`) → skip item.

Hoặc đơn giản hơn: comment out item billing khỏi nav, để trang vẫn truy cập được qua URL trực tiếp.

### Phase B3-4 — Verify

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Test thủ công:

1. `npm run dev` với env real mode + `VITE_BILLING_DISABLED=true` (nếu thêm flag).
2. Mở `/billing/plan` → verify copy mới hiển thị.
3. Verify sidebar KHÔNG còn "Gói & thanh toán" (nếu chọn ẩn).
4. Verify link vẫn vào được qua URL trực tiếp (không 404).
5. Verify trang vẫn render đúng cho user Plus đã upgrade (hiện status quyền hiện có).

### Phase B3-5 — Commit

```bash
git add src/app/pages/BillingPlan.tsx src/app/components/root-layout/navConfig.ts
git commit -m "polish(billing): rephrase disabled copy + hide from nav during migration

P1 audit flagged 'Thanh toán đang tạm khóa do chuyển nhà cung cấp'
as risk for class demo. Product decision (Option C):
- Rephrase to 'Đang hoàn tất tích hợp hệ thống thanh toán mới'
- Hide nav item when VITE_BILLING_DISABLED=true (env-controlled)
- Page still accessible via direct URL for Plus users

Out of scope: PayOS migration completion (tracked in
docs/ops/payos-migration-plan.md)."
```

### Phase B3-6 — Cập nhật script demo

Sửa `docs/superpowers/specs/2026-05-24-demo-script-lop.md` (tạo trong P3) — thêm câu trả lời chuẩn cho Q&A:

```markdown
**"Có Plus / paid plan không? Hệ thống thanh toán ra sao?"** →

"Có, gói Plus 99k/tháng mở thêm template + insight nâng cao. Backend đã tích hợp PayOS xong, nhưng bọn em giữ thanh toán tự động ở chế độ pilot — muốn theo dõi sản phẩm thêm trước khi mở rộng quy mô. Trong giai đoạn này, ai muốn dùng Plus có thể email `support@dearourfuture.com` — bọn em mở thủ công trong 24h. Mục tiêu hiện tại là chứng minh 12-tuần work tốt, chưa phải đẩy doanh thu."

> **Update 2026-05-24**: PayOS đã được cấu hình backend nhưng quyết định **giữ disabled** (không phải "tuần tới mở" như draft cũ). Khi nào enable thanh toán tự động là decision riêng, không gắn với deadline demo.
```

---

## Phương án triển khai Option A (PayOS migration complete)

Nếu user chọn A, đây là roadmap tách:

- Đọc `docs/ops/payos-migration-plan.md` để xem từ đâu đến đâu.
- Tạo prompt riêng `2026-05-24-payos-migration-finalize.md` (file mới) — KHÔNG làm trong phạm vi B3 prompt này.
- Sub-phase: PayOS sandbox integration → frontend QR component → backend webhook → production test với amount nhỏ.
- Estimate: 3-5 ngày dev đầy đủ.

**Nếu chọn A, dừng prompt B3 này lại và liên hệ user để tạo prompt PayOS riêng.**

---

## Phương án triển khai Option B (rollback Casso)

Nếu user chọn B:

- `git log --all --oneline -- backend/src/billing/` để tìm commit migrate.
- Cherry-pick revert commit → test sandbox → deploy.
- **Rủi ro cao**: data PayOS (nếu có) sẽ orphan. **KHÔNG khuyến nghị**.

---

## Quy tắc khi làm

- Tuân thủ `CLAUDE.md`.
- KHÔNG quyết định product mình. Hỏi user.
- KHÔNG charge user thật trong test.
- KHÔNG xoá email support thật khỏi UI.
- Trả lời tiếng Việt.

Bắt đầu Phase B3-1 (hỏi user).
