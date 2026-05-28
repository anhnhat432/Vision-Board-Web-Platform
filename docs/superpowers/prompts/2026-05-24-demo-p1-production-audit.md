# P1 — Audit production end-to-end với account thật

> Bối cảnh demo: 1 tuần nữa nhóm demo **Dear Our Future** trước thầy và các bạn trong lớp.
> **Đây không phải prototype** — sản phẩm đã production-ready và user thật có thể đăng ký dùng ngay. Demo trên URL **https://dearourfuture.io.vn/** + laptop backup.
>
> Mục tiêu P1: xác nhận production live ổn từ đầu đến cuối với 1 account thật, identify bug chặn demo. Không sửa code ở P1 — chỉ audit + báo cáo.

---

## Bối cảnh

- Frontend: React 18 + Vite, deploy Vercel
- Backend: Express + MongoDB, deploy Render
- Auth: Firebase (email + Google OAuth)
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- URL production: **https://dearourfuture.io.vn/**
- Đọc trước: `CLAUDE.md`, `guidelines/MVP_1_SCOPE.md`, `guidelines/CURRENT_PROJECT_STATUS.md`.

## Phạm vi

Chỉ audit. **KHÔNG sửa code, KHÔNG commit, KHÔNG deploy lại.** Output là báo cáo gap.

## Yêu cầu setup trước khi bắt đầu

Hỏi user 3 thứ trước khi chạy audit:

1. **Email + mật khẩu của 1 account thật** trên production (hoặc account bạn vừa tạo). Cần để test toàn bộ flow đã login.
2. **Có demo data sẵn trong account đó không?** Nếu chưa có, sẽ tạo trong audit.
3. **Có thể tạo thêm 1 account thứ 2** trong audit để test signup flow không? (Email khả dụng)

Nếu user chưa cấp credential, **DỪNG LẠI** và yêu cầu, đừng đoán hoặc skip.

## Phase 1.1 — Smoke public visitor (không cần login)

1. Mở Playwright MCP, navigate `https://dearourfuture.io.vn/` ở viewport 1280x900, ẩn danh (clear cookies/localStorage trước).
2. Verify hiển thị PublicVisitorView mới với heading "Biến mục tiêu mơ hồ thành kế hoạch 12 tuần và việc làm mỗi ngày."
3. Scroll xuống xem section "Cách hoạt động" (4 bước) + "Vì sao chọn Dear Our Future" (3 card) + CTA "Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?"
4. Check console errors — note bất kỳ error nào. **Biết trước**: có 1 CSP error cho `static.cloudflareinsights.com/beacon.min.js` — note nhưng không xử lý ở P1.
5. Test 2 viewport thêm: 768px + 375px. Layout không tràn ngang.
6. Lưu screenshot `qa-artifacts/p1-audit/public-{viewport}.png`.

**Kết quả mong đợi**: PublicVisitorView pass cả 3 viewport.

## Phase 1.2 — Auth flow (signup + login)

1. Trên viewport 1280, click "Đăng ký" trong header hoặc "Sẵn sàng dựng chu kỳ 12 tuần đầu tiên? → Đăng nhập để bắt đầu".
2. Switch sang mode signup. Tạo account thứ 2 với email user cung cấp.
3. Verify redirect sau signup: phải về `/onboarding` hoặc `/` chứ không phải mãi ở `/login`.
4. Logout. Login lại với account thứ 1 (account đã có data).
5. Verify redirect sau login: nếu account đã onboarded → `/12-week-system` hoặc `/`; nếu chưa → `/onboarding`.
6. Test Google OAuth (chỉ click button "Tiếp tục với Google" → verify popup mở, dừng lại, **không tự complete OAuth**).

**Lưu ý**: Nếu signup hoặc login fail, capture network response + console error. Đây là blocker cho demo.

## Phase 1.3 — Core flow đã login (account 1, đã có data nếu có)

Nếu account thứ 1 đã có 12-week plan:

1. Vào `/12-week-system`. Verify hiển thị goal đúng, không phải sample/demo goal.
2. Vào tab Hôm nay, tick 1 task, verify check-icon hiện ngay (không cần refresh).
3. Vào tab Tuần, mở weekly review nếu có button. Verify lưu được.
4. Vào tab Tiến độ, verify số liệu tuần / completion %.
5. Vào `/journal`, kiểm tra reflection list có item từ tuần đã review.
6. Refresh trang (F5). Verify mọi state vẫn còn.

Nếu account thứ 1 CHƯA có plan:

1. Vào `/onboarding`. Đi từ Bước 1 → Bước 6: Cân bằng → Trọng tâm → SMART → Khả thi → Setup 12 tuần → Vào hệ thống.
2. Note thời gian thực hiện thật (đo bằng đồng hồ). User demo cần biết flow này mất bao lâu.
3. Sau khi hoàn tất, verify `/12-week-system` mở đúng goal.

## Phase 1.4 — Billing / Plus upgrade

1. Vào `/billing/plan`. Verify gói hiện tại = "Miễn phí · 0đ".
2. Click "Nâng cấp Plus". Quan sát:
   - Mở dialog/modal hay chuyển trang `/billing/checkout/...`?
   - Hiển thị QR code Casso không? Hay redirect khác?
   - Copy thanh toán (Casso/VietQR) hiển thị đúng?
3. **KHÔNG hoàn tất chuyển khoản thật.** Chỉ verify UI/flow tới được trang chờ thanh toán.
4. Note: nếu Plus upgrade gặp lỗi (Firebase token, backend 5xx, etc) → blocker cho demo (vì user demo có thể hỏi về monetization).
5. Quay về `/billing/plan`, verify trang load hết, không timeout (theo `docs/ops/billing-plan-smoke-timeout-follow-up.md` có warning về timeout).

## Phase 1.5 — Sync + multi-device sanity

1. Mở incognito tab thứ 2 (cùng browser, không share localStorage).
2. Login account thứ 1 ở tab 2.
3. Verify sau ~30s, data từ tab 1 hiện ra ở tab 2 (auto cloud sync).
4. Tick 1 task ở tab 2, đợi 30s, refresh tab 1, verify tab 1 thấy task đó đã tick.
5. Note thời gian sync thật (đồng hồ). Nếu > 60s, demo có thể awkward.

## Phase 1.6 — Mobile production check (real device hoặc emulator)

1. Mở https://dearourfuture.io.vn/ trên điện thoại thật (iOS Safari hoặc Android Chrome). Nếu không có thiết bị, dùng Chrome DevTools device emulator (iPhone 12 hoặc Pixel 7).
2. Test core flow:
   - PublicVisitorView không tràn ngang.
   - Onboarding mở được, slider Life Balance touch-friendly.
   - 12-week-system tab nav chuyển được bằng touch.
   - Today task checkbox tap được.
3. Lưu screenshot mobile-{page}.png.

## Báo cáo cuối P1

Tạo file mới `qa-artifacts/p1-audit/REPORT.md` với cấu trúc:

```markdown
# P1 Audit Report — 2026-05-XX

## Setup
- Account 1 (đã có data): email...
- Account 2 (mới tạo): email...

## Findings

### ✅ Pass
- ...

### 🔴 Blocker (chặn demo)
- ...

### 🟡 Risk (nên fix nhưng không chặn)
- ...

### 🟢 Note (không cần fix trước demo)
- ...

## Console errors
- Liệt kê tất cả error (kể cả CSP cloudflare beacon).

## Network errors
- 4xx/5xx response trong audit.

## Performance
- LCP (mobile + desktop) ước tính.
- Sync delay đo được.
- Plan setup time (giây).

## Screenshots
- Đường dẫn `qa-artifacts/p1-audit/*.png`.
```

Sau khi tạo file REPORT.md, commit nó:

```bash
git add qa-artifacts/p1-audit/REPORT.md
git commit -m "docs(qa): P1 production audit report"
```

(Không add screenshot — chúng được gitignore theo plan dọn working tree.)

## Quy tắc khi làm

- KHÔNG sửa code, KHÔNG deploy.
- Dùng tool `Read` / Playwright MCP để inspect, KHÔNG `Bash` curl/fetch trực tiếp đến production trừ phi cần verify network.
- Không submit form thanh toán thật.
- Báo cáo bằng tiếng Việt.
- Sau khi tạo REPORT.md, dừng lại — không tự chạy P2 hay sửa bất kỳ thứ gì.

Bắt đầu Phase 1.1 sau khi đã có credential từ user.
