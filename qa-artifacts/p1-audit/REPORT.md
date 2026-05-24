# P1 Audit Report — 2026-05-24

> Production audit cho buổi demo "Dear Our Future" trước thầy và lớp (1 tuần nữa).
> URL: https://dearourfuture.io.vn/
> Phương pháp: Playwright (chromium 1.59.1, headless), không sửa code, không thanh toán thật, không complete OAuth.
> Người chạy: agent assist trên Windows 11, Node 22.14.0.
> Artifacts (không commit): `qa-artifacts/p1-audit/*.png`, `*-findings.json`, `_probe-*.log`, `_probe-*.mjs`, `audit-runner.mjs`.

## Setup

- Account 1 (Plus, đã có 12-week plan, đã onboarded): `vqkklr0@gmail.com`
- Account 2 (signup mới): **không có** — user không cấp email khả dụng. Phase signup không kiểm chứng được trong audit này.
- Mobile testbed: Chrome DevTools emulator `devices["iPhone 12"]` (Playwright). Không có thiết bị thật.

## Findings

### 🔴 Blocker (chặn demo)

#### B1. Backend rate-limit `429 Too Many Requests` trên `POST /api/auth/profile` ngay sau login → trang chủ `/` bị **kick về `/onboarding`** dù account đã có goal + plan

Đây là blocker lớn nhất phát hiện được trong audit.

**Kịch bản tái hiện** (mobile-fresh, fresh browser, không có localStorage cũ):

1. Vào `/login` → submit email + password.
2. App redirect về `/` rồi tự bounce sang `/onboarding`.
3. Network log: nhiều `POST https://api.dearourfuture.io.vn/api/auth/profile` trả về `HTTP 429`.
4. Console: `Failed to bootstrap user profile. {message: Too many requests. Please wait a moment and try again., status: 429}` — lặp 3 lần.
5. UI hiện step `BƯỚC 1 / 6 · CÂN BẰNG / BẮT ĐẦU · CÂN BẰNG CUỘC SỐNG`, mất sạch UX của user đã có plan.

Khi vào trực tiếp `/12-week-system` ở phiên đó, app vẫn redirect về `/onboarding` (final URL `/onboarding`).

Bằng chứng: [`qa-artifacts/p1-audit/_probe-mobile-fresh.log`](qa-artifacts/p1-audit/_probe-mobile-fresh.log:1) (dòng 4, 6, 13–28).

**Reproduction trên desktop**:

- Sau khi đợi 60s cho rate-limit cool-down, login lại trên context mới → `/` cũng bounce sang `/onboarding` ([`qa-artifacts/p1-audit/_probe-desktop-fresh.log`](qa-artifacts/p1-audit/_probe-desktop-fresh.log:4)) **kể cả khi backend không trả 429** ở lần này.
- Nhưng nếu chủ động `goto /12-week-system` desktop sau settle, plan hiển thị đúng, kèm banner `Cần chọn bản dữ liệu` (xem B2).

**Risk demo**:

- Khán giả nhìn thấy onboarding trắng dù user nói "tôi đã có plan".
- Khi nhiều người (lớp) login cùng lúc trên 1 IP/network, rate-limit dễ bị bóp cò → toàn bộ phòng demo có thể bị bounce về onboarding.
- Rate-limit có thể là trên `POST /api/auth/profile` (đường bootstrap), trên Render free/paid tier, hoặc tier của Firebase Admin verifyIdToken. Cần kiểm tra trước demo.

**Đề xuất hành động trước demo** (không thực hiện trong P1):

1. Kiểm tra middleware rate-limit cho `auth/profile` ở [`backend/src/middleware`](backend/src/middleware) và config [`backend/src/server.ts`](backend/src/server.ts:1) — nâng giới hạn cho route này hoặc whitelist tạm thời.
2. Frontend: nếu `/api/auth/profile` 429, fallback giữ phiên local thay vì kick onboarding (xem [`docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md`](docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md) — đã có bug ticket).
3. Hôm demo: login sẵn các laptop demo từ trước, không clear cookies giữa các phiên.

#### B2. Sync conflict `Cần chọn bản dữ liệu` xuất hiện trên header sau MỖI phiên login mới

Mọi route đã login trên desktop fresh-context đều thấy banner top `Cần chọn bản dữ liệu` (kế bên `Workspace / ...`). Console log:

```
[auto-sync] finished with attention needed {status: unsafe, message: Có dữ liệu chưa thể gộp tự động. Chưa ghi đè bản trên thiết bị.}
[auto-sync] finished with attention needed {status: conflict, message: Có xung đột dữ liệu không thể tự động giải quyết. Vui lòng chọn phiên bản cần giữ.}
```

`localStorage["visionboard_pull_cursor:auth:..."]` lưu `"lastPullStatus":"conflict"`.

Banner xuất hiện ngay lần đầu login sạch, nghĩa là local seed default (storageVersion 8, 8 wheel-of-life lĩnh vực điểm 0, plus default goal "Hoàn thành một dự án nổi bật...") xung đột với cloud snapshot. User chưa làm gì đã thấy "có xung đột".

**Risk demo**: Khán giả thấy banner cảnh báo data conflict trên nav bar trong khi giảng viên giới thiệu sản phẩm — gây ấn tượng "bug".

Bằng chứng: [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:55), [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:119).

#### B3. Billing đang **TẠM KHÓA**: copy "Thanh toán đang tạm khóa do chuyển nhà cung cấp"

Trang [`/billing/plan`](https://dearourfuture.io.vn/billing/plan) hiển thị:

> Thanh toán đang tạm khóa.
> Thanh toán đang tạm khóa do chuyển nhà cung cấp. Quyền hiện có không bị ảnh hưởng. Liên hệ support nếu cần nâng cấp thủ công: dearourfuture123@gmail.com.

Account 1 đã là Plus nên không có nút `Nâng cấp Plus` để click; còn user free hiện tại cũng không thể upgrade (theo copy). Audit không thể verify QR Casso/VietQR vì flow bị tắt.

**Risk demo**: Khán giả hỏi monetization → demo phải nói "đang chuyển nhà cung cấp", trông không vững.

**Tham chiếu**: [`docs/PAYMENT_PROVIDER_MIGRATION.md`](docs/PAYMENT_PROVIDER_MIGRATION.md), [`docs/ops/payos-migration-plan.md`](docs/ops/payos-migration-plan.md), [`docs/ops/billing-plan-smoke-timeout-follow-up.md`](docs/ops/billing-plan-smoke-timeout-follow-up.md).

Bằng chứng: [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:67).

### 🟡 Risk (nên fix nhưng không chặn demo)

#### R1. Trang public landing có copy demo-only `"không cần đăng nhập"`, vi phạm production safety rule

Heading section 1: `Mở là dùng được, không bắt đăng nhập`.
Hero callout: `Local-first, không cần đăng nhập để xem`.

Theo [`AGENTS.md`](AGENTS.md:1) rule `Production Mode Safety Rules`:

> Copy strings phải audit cho demo-only phrasing: `"không cần đăng nhập"`... Trong real mode phải biến mất hoặc đổi sang account-bound, production-appropriate language.

Demo trên `https://dearourfuture.io.vn/` (production domain) đang hiển thị copy này. Không phải lỗi chặn buổi demo, nhưng rủi ro nếu thầy đọc kỹ landing.

Bằng chứng: [`qa-artifacts/p1-audit/_probe-public.mjs`](qa-artifacts/p1-audit/_probe-public.mjs) output.

#### R2. Spec drift: section "Vì sao chọn Dear Our Future" trong prompt KHÔNG tồn tại trên prod

Prompt yêu cầu verify section `Vì sao chọn Dear Our Future` (3 card). Thực tế prod có 3 card với eyebrow `LOCAL-FIRST` / `ĐÚNG THỨ TỰ` / `MOBILE-READY`, sub-heading lần lượt:

- `Mở là dùng được, không bắt đăng nhập`
- `Không phải trang trắng như Notion`
- `Đủ nhẹ cho buổi sáng vội`

Layout 3 card vẫn pass nội dung và CTA cuối vẫn hiện. Đây là khác biệt prompt vs implementation, không phải bug. Cập nhật prompt audit lần sau.

#### R3. Login form có nút **Google OAuth** (`Tiếp tục với Google` / aria `Đăng nhập với Google`) nhưng audit-runner v1 dò không thấy do regex sai

Probe sâu lại xác nhận button tồn tại — không click để khỏi bật cửa sổ Google. Nếu Google OAuth flow chưa được test end-to-end thì là gap. Đề xuất user tự click 1 lần trên laptop demo trước hôm chiếu để đảm bảo Firebase project domain whitelist `dearourfuture.io.vn` cho Google sign-in.

Bằng chứng: [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:16-19).

#### R4. Kế hoạch audit yêu cầu test signup account 2 → bị skip do user không cấp email mới

Phase 1.2 không kiểm chứng được signup redirect, password reset, email verification banner. Đây là gap audit, không phải bug code. Trước demo, đề xuất tự signup 1 account trên laptop dự phòng để xác nhận flow.

#### R5. `/journal` request bị `429` trên `GET /api/plans/{id}` (2 plan id) ngay sau khi vào tab

Khi điều hướng `/journal` ở phiên đã có cache, backend trả 429 cho 2 plan id liên tiếp. Frontend vẫn render được (do localStorage), nhưng danh sách plan nguồn không refresh được. Có thể phụ trợ B1 — chung 1 rate-limit window.

Bằng chứng: [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:71-74).

### 🟢 Note (không cần fix trước demo)

#### N1. CSP error cho `static.cloudflareinsights.com/beacon.min.js` — đã biết trước

Mỗi page load trả 1 console error CSP block cho Cloudflare beacon. Không ảnh hưởng UX, chỉ là analytics beacon. Theo prompt: note nhưng không xử lý.

Cách fix nếu sau demo có thời gian: trong `Content-Security-Policy` thêm `static.cloudflareinsights.com` vào `script-src` hoặc explicit set `script-src-elem`.

#### N2. Mobile (iPhone 12) public landing và 12-week-system không tràn ngang

Cả 2 viewport check: `scrollWidth = clientWidth` (375 và 1280). Nav, Today tab, billing đều render đầy đủ trên mobile sau settle.

#### N3. Reload (F5) giữ auth — không kick về `/login`

Sau khi vào `/journal` rồi reload, URL vẫn ở `/journal`, đăng nhập persist qua `firebase_id_token` trong localStorage.

Bằng chứng: [`qa-artifacts/p1-audit/phase-1.3-findings.json`](qa-artifacts/p1-audit/phase-1.3-findings.json:131).

#### N4. Account đã onboarded có `assistant.onboarded:UID = "1"` trong localStorage → backend link đầy đủ 12 tuần

`backend_plan_links:auth:UID` lưu plan id + 12 week id + revision; `latest_12_week_goal_id` trỏ đúng goal của user. Tức là dữ liệu cloud-side **vẫn an toàn** — chỉ là `auth/profile` 429 chặn flow bootstrap nên trang chủ tưởng user trắng.

Bằng chứng: [`qa-artifacts/p1-audit/_probe-deep.log`](qa-artifacts/p1-audit/_probe-deep.log:111-126).

#### N5. Entitlement Plus đồng bộ ổn

`visionboard_last_entitlement_sync` cuối cùng: `status: success, providerMode: api_contract, planCode: PLUS, entitlementCount: 4`. Quyền Plus đến đúng client.

#### N6. Phase 1.5 (sync multi-context) chỉ verify 2 phiên đọc cùng plan, **KHÔNG mutate task** để tránh chỉnh data thật của user

Audit không tick task ở context A rồi đợi 30s ở context B vì sẽ ghi đè production state. Sync latency end-to-end vì vậy chưa đo được. Đề xuất: sau demo, dùng account QA staging riêng để chạy [`e2e/sync-lww.spec.ts`](e2e/sync-lww.spec.ts:1).

## Console errors

Tổng hợp tất cả console error/warning ghi nhận trong audit (sau khi chống trùng):

- `error`: `Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/...' violates the following Content Security Policy directive...` — **mọi page load** (đã biết trước, N1).
- `error`: `Failed to load resource: the server responded with a status of 429 ()` — sau login fresh-context, lặp 3–4 lần (B1).
- `error`: `Failed to bootstrap user profile. {message: Too many requests. Please wait a moment and try again., status: 429, ...}` — lặp 3 lần fresh-mobile, 0 lần khi cool-down (B1).
- `warning`: `[auto-sync] finished with attention needed {status: unsafe, message: Có dữ liệu chưa thể gộp tự động. Chưa ghi đè bản trên thiết bị.}` — mọi phiên đã login (B2).
- `warning`: `[auto-sync] finished with attention needed {status: conflict, message: Có xung đột dữ liệu không thể tự động giải quyết. Vui lòng chọn phiên bản cần giữ.}` — sau ~30s phiên đã login (B2).

Không thấy uncaught pageerror.

## Network errors

- `POST https://api.dearourfuture.io.vn/api/auth/profile` → **HTTP 429** (4 lần fresh mobile, 0 lần fresh desktop sau 60s cool-down). Cũng xuất hiện `net::ERR_ABORTED` 2 lần (do navigation cắt request giữa chừng).
- `GET https://api.dearourfuture.io.vn/api/billing/payment-history` → **HTTP 429** (1 lần fresh mobile).
- `GET https://api.dearourfuture.io.vn/api/plans/{id}` → **HTTP 429** (2 plan id, 1 lần `/journal` desktop).
- `GET https://static.cloudflareinsights.com/beacon.min.js/...` → CSP-blocked (mọi page).
- `GET https://dearourfuture.io.vn/favicon-512.png` → `net::ERR_ABORTED` (2 lần) — tab navigation cắt prefetch, không quan trọng.

Không thấy 5xx từ backend trong audit.

## Performance (đo bằng Playwright timing, không phải Lighthouse)

- `/login` page load (desktop): ~1.0–1.4s.
- Login submit → redirect: ~1.3–1.5s (3 lần đo); fresh mobile lần đầu: 3.6s (kèm 429 retry).
- `/12-week-system` first paint sau login (desktop): ~4.5–5.1s đến networkidle.
- `/billing/plan` first paint (desktop): ~4.7s đến networkidle (đã warning trong [`docs/ops/billing-plan-smoke-timeout-follow-up.md`](docs/ops/billing-plan-smoke-timeout-follow-up.md)).
- `/journal` first paint (desktop): ~3.9s.
- Public landing first paint (desktop 1280): ~2.2s; mobile 375: ~3.7s (cold).
- Sync delay (mutation-based): **chưa đo** (xem N6).
- Plan setup time: **chưa đo** (account đã onboarded, không chạy lại flow 6 bước).
- LCP, FCP, CLS: audit không tích Lighthouse, không có số.

## Screenshots

Tất cả nằm trong [`qa-artifacts/p1-audit/`](qa-artifacts/p1-audit/) (không commit theo prompt):

Phase 1.1 — public:

- `public-1280.png`, `public-768.png`, `public-375.png`

Phase 1.2 — auth:

- `post-login-1280.png`, `auth-google-popup-test-1280.png`

Phase 1.3 — core flow:

- `12week-system-overview-1280.png`, `12week-today-1280.png`, `12week-week-1280.png`, `12week-progress-1280.png`, `journal-1280.png`, `post-refresh-1280.png`

Phase 1.4 — billing:

- `billing-plan-1280.png`, `billing-after-upgrade-click-1280.png`

Phase 1.5 — sync:

- `sync-ctxA-initial-1280.png`, `sync-ctxB-initial-1280.png`

Phase 1.6 — mobile:

- `mobile-public-iphone12.png`, `mobile-post-login-iphone12.png`, `mobile-12week-iphone12.png`, `mobile-after-login-iphone12.png`, `mobile-after-settle-iphone12.png`, `mobile-12week-after-settle-iphone12.png`, `mobile-billing-iphone12.png`

Probe sâu (extra):

- `desktop-fresh-12week-1280.png`

Findings JSON (per phase): `phase-1.1-findings.json`, …, `phase-1.6-findings.json`.
Probe logs: `_probe-public.mjs/log`, `_probe-deep.mjs/log`, `_probe-mobile-fresh.mjs/log`, `_probe-desktop-fresh.mjs/log`.
Audit driver: `audit-runner.mjs`.

## Tóm tắt khuyến nghị trước demo

| #   | Việc                                                                                                                                                                                                                               | Mức ảnh hưởng | Ai           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------ |
| 1   | Investigate + nâng rate-limit cho `POST /api/auth/profile` (B1)                                                                                                                                                                    | 🔴 Blocker    | backend dev  |
| 2   | Frontend fallback khi `/api/auth/profile` 429 thay vì bounce `/onboarding` (B1) — đã có ticket [`2026-05-24-loginpage-profile-loading-regression.md`](docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md) | 🔴 Blocker    | frontend dev |
| 3   | Quyết định: hide banner `Cần chọn bản dữ liệu` trong demo, hoặc auto-merge default seed vs cloud (B2)                                                                                                                              | 🔴 Blocker    | frontend     |
| 4   | Quyết định: copy nói gì với khán giả về billing đang tắt (B3); hoặc hide trang `/billing/plan` khỏi nav demo flow                                                                                                                  | 🔴 Blocker    | PM           |
| 5   | Pre-login sẵn 2 laptop demo + tránh fresh-context giữa các phần                                                                                                                                                                    | 🟡 Mitigation | demo team    |
| 6   | Audit lại copy real-mode, đặc biệt `"không cần đăng nhập"` (R1)                                                                                                                                                                    | 🟡 Risk       | UX writer    |
| 7   | Tự signup 1 account QA + thử flow Google OAuth trên laptop demo (R3, R4)                                                                                                                                                           | 🟡 Risk       | demo team    |
| 8   | Sau demo: thêm `qa-artifacts/` vào [`.gitignore`](.gitignore:1) (hiện chưa ignore — chỉ commit REPORT.md trong audit này)                                                                                                          | 🟢 Note       | dev ops      |
| 9   | Sau demo: fix CSP cho Cloudflare beacon (N1)                                                                                                                                                                                       | 🟢 Note       | dev ops      |

## Quy tắc đã tuân

- ❌ Không sửa code production.
- ❌ Không deploy lại.
- ❌ Không commit secrets/credentials (email/password user cấp chỉ tồn tại trong env biến của terminal session, không ghi vào file).
- ❌ Không thanh toán thật (billing đang khóa nên cũng không thể).
- ❌ Không tự complete OAuth.
- ❌ Không mutate task của user trong sync test (xem N6).
- ✅ Read-only audit, output là báo cáo gap.

## Limitations

- Mobile test dùng emulator iPhone 12 của Playwright, không phải iOS Safari thật. UA và viewport mô phỏng được, nhưng touch behavior, biometric input, momentum scroll không.
- Sync latency end-to-end chưa đo do không mutate.
- Signup, password reset, email verification flows chưa kiểm chứng.
- LCP/FCP/CLS chưa có vì audit không tích Lighthouse/WebVitals.
- Audit chạy 1 client tại 1 thời điểm, không simulate được tải nhiều người đồng thời (rate-limit khi cả lớp login cùng lúc).
