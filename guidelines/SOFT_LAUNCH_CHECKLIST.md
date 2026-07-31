# Soft Launch Checklist — Vision Board Web Platform

Last updated: 2026-07-30

Status note 2026-07-30:

- Treat this checklist as a gate review, not as proof that old checkmarks are still current.
- Authoritative current blockers are the D-2 proof ledger below plus `guidelines/CURRENT_PROJECT_STATUS.md`.
- Known blockers right now:
  - Production smoke latest default-branch run `28995039420` failed on commit `6ad15aca67c264cbf8ae544dbc45100b6939db01` with HTTP 429 `rate_limited` during 12-week backend-sync proof. Local smoke harness retries that proof after `Retry-After`, but D-1 still needs a fresh passing production-smoke run after deployment.
  - Staging proof workflows are now available on the default branch, but email verification, account deletion, and LWW still need real staging runs with opt-in inputs.
  - Live `npm run proof:secrets` on 2026-07-30 reports GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` missing. The four deployed proof workflows remain blocked until it is configured, then they still need protected-preview runs and recorded pass evidence.
- Treat historical tags such as `v1.0-production-ready` as historical markers only, not launch proof for current `main`.

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
  - Frontend: `VITE_APP_MODE=real`, `VITE_API_BASE_URL`, `VITE_FIREBASE_*`, `VITE_BILLING_PROVIDER_MODE=api_contract`, `VITE_BILLING_PROVIDER_LABEL`, `VITE_BILLING_SUPPORT_EMAIL`, `VITE_SENTRY_DSN`, `VITE_BILLING_PLUS_MONTHLY_PRICE_VND`.
  - Backend: `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FRONTEND_ORIGIN`, `BILLING_PROVIDER`, `BILLING_REPOSITORY=mongo`, provider-specific webhook/bank/API keys, `PLUS_PRICE_VND`, `SENTRY_DSN`, `NODE_ENV=production`.
  - Run `npm run env:check:prod`; it must not list `frontend:VITE_BILLING_SUPPORT_EMAIL`, `frontend:VITE_SENTRY_DSN`, `backend:BILLING_PROVIDER(real-provider-required-in-production)`, or `backend:BILLING_REPOSITORY(mongo-required-in-production)`.
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

Runbook: `docs/ops/staging-proof-runbook.md` lists the exact workflow inputs, repository secrets, `gh workflow run` commands, safety markers, and evidence to record.

- [ ] Run `npm run proof:readiness` first; it checks required GitHub secret names, default-branch workflow availability, and the latest production-smoke run status without reading secret values or dispatching workflows.
- [ ] Run `npm run proof:secrets` and resolve any missing required proof secrets before triggering staging proof workflows.
- [ ] Run `npm run proof:workflows` and confirm required proof workflows are available on default branch before triggering `gh workflow run`.
- [ ] Run local core-funnel preflight first:
  - `npm run dev -- --host 127.0.0.1 --port 4173`
  - `$env:CORE_QUALITY_URL="http://127.0.0.1:4173"; npm run smoke:core-quality`
  - Treat this as local preflight only; D-2 still needs protected demo-preview evidence in the ledger.
- [ ] Confirm GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` exists by name; keep `Require Log In` enabled and do not publish a protection-bypass URL.
- [ ] Run GitHub Actions workflow `.github/workflows/core-funnel-quality-staging.yml` against the protected demo preview (`VITE_APP_MODE=demo`) with `VERCEL_AUTOMATION_BYPASS_SECRET`. Keep `Require Log In` enabled and do not point this workflow at the production real-mode domain.

- [ ] Chạy production smoke `npm run smoke:prod` từ máy local với credentials thật. Kỳ vọng pass.
- [ ] Không chạy `npm run smoke:prod` với generated account mặc định. Chỉ set `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` nếu cố ý tạo 1 QA account mới cho run này.
- [ ] Run GitHub Actions workflow `.github/workflows/email-verification-e2e-staging.yml` against staging/preview with `allow_create=CREATE_TEST_ACCOUNT` to prove signup, unverified-email banner, resend cooldown, and paid-checkout availability.
- [ ] Run GitHub Actions workflow `.github/workflows/account-delete-e2e-staging.yml` against staging/preview with `allow_delete=DELETE_TEST_ACCOUNT` and a disposable `ACCOUNT_DELETE_E2E_EMAIL` containing `+delete` so the destructive check cannot delete a shared account.
- [ ] Manual smoke 30 phút với 1 tài khoản test thật:
  - Đăng ký mới qua Firebase Google Sign-in.
  - Hoàn thành onboarding → SMART goal → feasibility → 12-week setup.
  - Thực hiện check-in 1 task, weekly review.
  - Kích Plus → QR Casso → chuyển khoản 1.000đ thật.
  - Verify webhook fire, entitlement up, Plus active.
  - Đăng nhập trên thiết bị thứ 2 (mobile) → verify auto-restore + sync indicator.
  - Tắt wifi, check-in 2 task, bật wifi → verify auto-drain queue.
- [ ] Chạy `npm run test:e2e:lww` với `LWW_E2E_URL`, `LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE`, `LWW_E2E_EMAIL`, `LWW_E2E_PASSWORD` trên staging/preview để chứng minh Last-Write-Wins cross-device trước soft launch.
- [ ] Or run GitHub Actions workflow `.github/workflows/lww-e2e-staging.yml` with `allow_overwrite=OVERWRITE_TEST_WORKSPACE` and repository secrets `LWW_E2E_EMAIL` / `LWW_E2E_PASSWORD`. `LWW_E2E_EMAIL` must be a dedicated overwrite-safe address containing `+lww`, `.lww`, `_lww`, or `-lww`.
- [ ] Stress test nhẹ: 10 request/giây vào `/api/health` trong 1 phút từ 1 IP → verify rate limit không kill server.
- [ ] Confirm Casso bank account số dư đủ để hoàn tiền nếu user yêu cầu refund.

Blocking rule: do not enter D-1 go/no-go while any required proof row below is still `pending`, missing a target URL, missing a commit SHA, or missing an evidence URL / command.

| Gate | Required evidence before D-1 | Status | Target URL | Commit SHA | Evidence URL / command | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Production smoke | `npm run smoke:prod` or `.github/workflows/production-smoke-e2e.yml` passes with fixed QA credentials | blocked-latest-run-failed | `https://vision-board-web-platform.vercel.app` | `6ad15aca67c264cbf8ae544dbc45100b6939db01` | https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28995039420 | Latest default-branch scheduled run created at `2026-07-09T04:54:41Z` failed on `GET /api/weeks/:weekId/metrics` with HTTP 429 `rate_limited`. Local smoke harness now retries the 12-week backend-sync proof after `Retry-After`; rerun production smoke after that change is deployed before D-1 go/no-go. Previous pass: run `28917039391` on 2026-07-08. |
| Email verification staging | `.github/workflows/email-verification-e2e-staging.yml` passes with `allow_create=CREATE_TEST_ACCOUNT` | pending-staging-run | | | | Workflow is active on the default branch. Fixed secrets remain optional because the generated disposable signup path is available if staging Firebase allows signup. If fixed secrets are added, `EMAIL_VERIFICATION_E2E_EMAIL` and `EMAIL_VERIFICATION_E2E_PASSWORD` must be configured as a complete pair. |
| Account deletion staging | `.github/workflows/account-delete-e2e-staging.yml` passes with `allow_delete=DELETE_TEST_ACCOUNT` and delete-marked disposable email | pending-staging-run | | | | Workflow is active on the default branch, and `ACCOUNT_DELETE_E2E_EMAIL` / `ACCOUNT_DELETE_E2E_PASSWORD` are configured by secret name. Actual destructive staging proof still needs explicit `DELETE_TEST_ACCOUNT` opt-in. |
| LWW sync staging | `.github/workflows/lww-e2e-staging.yml` or equivalent local command passes with dedicated QA credentials | pending-staging-run | | | | Workflow is active on the default branch, and `LWW_E2E_EMAIL` / `LWW_E2E_PASSWORD` are configured by secret name. Actual overwrite proof still needs explicit `OVERWRITE_TEST_WORKSPACE` opt-in and an overwrite-safe test account. |
| Manual core-flow smoke | `.github/workflows/core-funnel-quality-staging.yml` proves Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility -> 12-week setup -> Today action -> weekly review on the protected demo preview | pending-protected-preview-run | `https://vision-board-web-platform-git-codex-e17daa-anhnhat432s-projects.vercel.app` | | | Local preflight passed previously. The next run keeps Deployment Protection enabled and uses `VERCEL_AUTOMATION_BYPASS_SECRET`; the row remains pending until a successful workflow URL and commit SHA are recorded. |

## 3. D-1 — Final go/no-go

Bảng ra quyết định launch. Tất cả phải ✅ trước khi mở đăng ký.

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Code freeze active | | |
| Production deploy stable 24h | | Vercel + Render |
| D-2 proof ledger complete | | All required D-2 rows have status `pass`, target URL, commit SHA, and evidence URL / command |
| Production smoke pass | | Evidence row points to `npm run smoke:prod` or `.github/workflows/production-smoke-e2e.yml` |
| Email verification staging pass | | Evidence row points to `.github/workflows/email-verification-e2e-staging.yml` |
| Account deletion staging pass | | Evidence row points to `.github/workflows/account-delete-e2e-staging.yml` |
| LWW staging e2e pass | | Evidence row points to `.github/workflows/lww-e2e-staging.yml` |
| Manual core-flow smoke pass | | Evidence row points to `.github/workflows/core-funnel-quality-staging.yml` or equivalent deployed run |
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
