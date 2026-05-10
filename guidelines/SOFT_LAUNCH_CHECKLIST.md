# Soft Launch Checklist — Vision Board Web Platform

Last updated: 2026-05-10

Purpose: hướng dẫn soft-launch cho ~200 user thật (sinh viên Việt Nam) sau khi Phase 1, 2, 4 đã ✅ và Phase 3 bảo mật fin được đóng.

Soft-launch = mở đăng ký giới hạn cho nhóm beta đã biết, theo dõi 7 ngày, rồi quyết định public.

## 0. Tiền đề trước khi áp dụng checklist này

- ✅ Phase 1 hạ tầng (Firebase + MongoDB + Render + Vercel real mode) đã verify.
- ✅ Phase 1.5 live transaction Casso/VietQR đã verify thật trên 2026-05-10.
- ✅ Phase 2 Casso + VietQR live verified.
- ✅ Phase 4 UX production polish đã merged.
- ⚠ Phase 3 bảo mật fin: phải hoàn thành PROMPT PHASE-3-SECURITY-FIN trước khi soft-launch.
- Tag `v1.0-production-ready` đã push.

Nếu bất kỳ điều kiện nào chưa đạt, dừng và xử lý trước.

## 1. D-7 đến D-3 — Chuẩn bị

### Code & deploy

- [ ] Tag commit chuẩn bị soft-launch: `v1.0-soft-launch-rc1`.
- [ ] Code freeze: chỉ cho phép bug fix critical, không feature mới.
- [ ] Deploy Vercel production từ tag, smoke test tay 5 phút.
- [ ] Deploy Render production từ commit cùng ref, kiểm tra `/api/health` 200.
- [ ] Verify env vars production đầy đủ trên Vercel + Render dashboard:
  - Frontend: `VITE_APP_MODE=real`, `VITE_API_BASE_URL`, `VITE_FIREBASE_*`, `VITE_BILLING_PROVIDER_MODE=api_contract`, `VITE_BILLING_PROVIDER_LABEL=Chuyển khoản ngân hàng`, `VITE_SENTRY_DSN`.
  - Backend: `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FRONTEND_ORIGIN`, `CASSO_WEBHOOK_SECRET`, `CASSO_BANK_ACCOUNT`, `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NAME`, `SENTRY_DSN`, `NODE_ENV=production`.
- [ ] Confirm CSP headers chạy đúng trên frontend (curl -I production URL).
- [ ] Confirm rate limiters live: gửi >100 request/phút vào `/api/health` → thấy 429.

### Backup & rollback

- [ ] MongoDB Atlas: bật automated backup (M0 free tier có cloud backup mặc định, verify retention).
- [ ] Snapshot MongoDB thủ công ngay trước launch (tag là `pre-soft-launch-2026-MM-DD`).
- [ ] Rollback plan viết ra rõ:
  - Bước 1: revert Vercel deployment về commit cũ (Vercel dashboard).
  - Bước 2: revert Render deployment về deploy trước.
  - Bước 3: nếu schema breaking, restore Mongo từ snapshot.
  - Bước 4: đăng thông báo cho user nhóm beta.
- [ ] Rollback test thử 1 lần trên Vercel preview để chắc nút Revert hoạt động.

### Monitor & alert

- [ ] Sentry production project đã active. Verify capture được error: gọi 1 endpoint cố tình throw → thấy issue trong Sentry dashboard.
- [ ] Sentry alert rule: lỗi mới > 5 lần/phút → email/Slack.
- [ ] Sentry alert rule: webhook fail Casso → notify ngay.
- [ ] Render log dashboard đã quen thao tác (tail logs).
- [ ] MongoDB Atlas alert: connection > 80% pool → email.
- [ ] Vercel function/edge runtime monitor (nếu có).

### Tài liệu & support

- [ ] FAQ cơ bản viết: cách đăng ký, cách thanh toán Plus, cách sync giữa thiết bị, gặp lỗi báo ai.
- [ ] Email/Zalo/Telegram support đã có: ai trực, giờ trực, SLA reply.
- [ ] Trang `/help` hoặc nội dung `BillingPlan` "Hỗ trợ thanh toán" đầy đủ liên hệ.
- [ ] Link Privacy + Terms (kể cả ngắn) đã có và link được từ footer.

## 2. D-2 — Pre-launch dry run

- [ ] Chạy production smoke `npm run smoke:prod` từ máy local với credentials thật. Kỳ vọng pass.
- [ ] Manual smoke 30 phút với 1 tài khoản test thật:
  - Đăng ký mới qua Firebase Google Sign-in.
  - Hoàn thành onboarding → SMART goal → feasibility → 12-week setup.
  - Thực hiện check-in 1 task, weekly review.
  - Kích Plus → QR Casso → chuyển khoản 1.000đ thật.
  - Verify webhook fire, entitlement up, Plus active.
  - Đăng nhập trên thiết bị thứ 2 (mobile) → verify auto-restore + sync indicator.
  - Tắt wifi, check-in 2 task, bật wifi → verify auto-drain queue.
- [ ] Stress test nhẹ: 10 request/giây vào `/api/health` trong 1 phút từ 1 IP → verify rate limit không kill server.
- [ ] Confirm Casso bank account số dư đủ để hoàn tiền nếu user yêu cầu refund.

## 3. D-1 — Final go/no-go

Bảng ra quyết định launch. Tất cả phải ✅ trước khi mở đăng ký.

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Code freeze active | | |
| Production deploy stable 24h | | Vercel + Render |
| Smoke test pass | | `npm run smoke:prod` |
| Mongo backup snapshot mới nhất | | Tag `pre-soft-launch-2026-MM-DD` |
| Sentry FE + BE active | | Capture test pass |
| Rate limiter live | | 429 response confirmed |
| Casso webhook live | | Live transaction verify lại 1 lần |
| Support kênh sẵn sàng | | Email + Zalo/Telegram |
| Rollback plan tested | | Vercel revert UI quen thao tác |
| FAQ + Privacy + Terms public | | Link từ footer |

Nếu 1 dòng đỏ → hoãn launch ít nhất 24h.

## 4. D0 — Launch day

### Buổi sáng (trước launch)

- [ ] Re-run smoke test 1 lần cuối.
- [ ] Verify Sentry dashboard không có error nào trong 12h gần nhất.
- [ ] Đội support cam kết available trong 8h sau launch.

### Launch (giờ X)

- [ ] Đăng thông báo nhóm beta (Zalo/Facebook/Telegram) với:
  - Link đăng ký.
  - Hướng dẫn ngắn 3-5 dòng.
  - Liên hệ support khi gặp lỗi.
  - Yêu cầu phản hồi sau 24h dùng thử.
- [ ] Theo dõi Sentry + Render log liên tục trong 30 phút đầu.
- [ ] Theo dõi MongoDB connection count.
- [ ] Theo dõi tỉ lệ lỗi 4xx/5xx qua Render request log.

### Trong 6h sau launch

- [ ] Mỗi giờ check Sentry issue mới.
- [ ] Phản hồi user trong vòng 1h.
- [ ] Ghi log issue user báo vào file/sheet riêng để retro.

### Cuối ngày D0

- [ ] Ghi metrics:
  - Số user đăng ký mới.
  - Số user hoàn thành onboarding.
  - Số user hoàn thành 12-week setup.
  - Số transaction Plus thành công.
  - Số transaction Plus fail (phân loại lý do).
  - Số issue Sentry mới (phân theo severity).
- [ ] Tổng hợp 5-10 dòng báo cáo cho team.

## 5. D+1 đến D+7 — Theo dõi

Mỗi ngày:

- [ ] Sáng: review Sentry issue mới, triage P0/P1/P2.
- [ ] Sáng: review user feedback từ kênh support.
- [ ] Trưa: hot-fix bug P0/P1 nếu có (mở branch fix riêng, không gộp feature mới).
- [ ] Tối: ghi metrics ngày + so sánh xu hướng.

Cuối D+7:

- [ ] Retro: viết tài liệu `guidelines/SOFT_LAUNCH_RETRO_2026-MM-DD.md` ghi:
  - Số user, conversion rate.
  - Top 5 issue đã sửa.
  - Top 5 issue còn pending.
  - Quyết định: tiếp tục soft-launch / mở public / rollback.

## 6. Emergency rollback procedure

Khi nào rollback ngay không cần họp:

- Sentry error rate > 10% request trong 5 phút liên tiếp.
- MongoDB connection bị reject > 50% trong 5 phút.
- Casso webhook fail > 30% trong 1h và có user mất tiền.
- Auth flow bị break (user không login được).

Quy trình rollback (có thể chạy < 5 phút):

1. Vercel dashboard → Deployments → tìm deploy trước đó → "Promote to Production".
2. Render dashboard → Service → Deploys → tìm deploy trước đó → "Redeploy".
3. Đăng thông báo nhóm beta: "Hệ thống đang được nâng cấp, quay lại sau 30 phút".
4. Verify rollback xong: smoke test 5 phút.
5. Mở Sentry investigate root cause trước khi roll forward.

Khi nào restore Mongo backup:

- Schema migration breaking xảy ra mà không có rollback path.
- Data corruption phát hiện qua user report (không phải false positive).

Quy trình restore Mongo:

1. Atlas dashboard → Backups → chọn snapshot trước incident.
2. Restore vào cluster mới (KHÔNG ghi đè cluster live).
3. Test cluster mới với 1 read query → đúng data.
4. Đổi `MONGODB_URI` env trong Render → cluster mới.
5. Restart backend → smoke test.
6. Sau 24h ổn → xoá cluster cũ.

## 7. Soft-launch → public-launch tiêu chí

Sau 7-14 ngày soft-launch, public khi đạt đủ:

- ≥ 80% user soft-launch hoàn thành 12-week setup không gặp lỗi blocking.
- Sentry error rate < 0.5% request.
- Conversion Plus ≥ 5% user signed-in (chỉ tham khảo, không cần đạt mới mở public).
- 0 incident P0 trong 7 ngày liên tiếp.
- Rollback plan đã thực hành thành công ít nhất 1 lần (drill trên staging).

Public-launch checklist riêng sẽ viết khi đạt ngưỡng trên.

## 8. Cấm trong giai đoạn soft-launch

- KHÔNG deploy feature mới ngoài bug fix.
- KHÔNG thay đổi billing pricing.
- KHÔNG thay đổi storage shape (UserData migration).
- KHÔNG mở rộng beyond 200 user khi chưa retro.
- KHÔNG bỏ qua Sentry alert.

## 9. Liên kết

- `guidelines/PRODUCTION_ROADMAP.md` — phase status tổng quan.
- `guidelines/CURRENT_PROJECT_STATUS.md` — code-backed state hiện tại.
- `guidelines/MVP_2_SYNC_IMPLEMENTATION_STATUS.md` — sync truth doc.
- `guidelines/VercelDeploymentChecklist.md` — env + deploy mode.
- `guidelines/MVP_1_RELEASE_CHECKLIST.md` — rollback về demo nếu cần.
