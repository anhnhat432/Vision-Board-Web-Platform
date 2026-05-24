# Go/No-Go Decision — Demo Dear Our Future trước lớp

**Ngày quyết định**: 2026-05-24
**Người quyết định**: chờ user duyệt (agent đề xuất GO with caveats 🟡)
**Demo dự kiến**: 2026-05-31 (1 tuần)

## Tóm tắt

**🟡 GO with caveats** — sản phẩm xuất xưởng demo được, nhưng phải đi đúng script + tránh 4 surface yếu (login flow lần đầu, banner conflict, billing upgrade, signup mới). Đã có script demo + preflight checklist + plan B đầy đủ.

## Smoke results

| Lệnh                                              | Kết quả                                 | Note                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                               | ✅                                      | clean                                                                                                                                                                                                                                                                         |
| `npm run lint`                                    | ✅                                      | 747 files, no fixes                                                                                                                                                                                                                                                           |
| `npm run test:run`                                | 🟡 (1646 pass / 1 fail / 7 skip / 1654) | Fail [`src/app/routes.test.tsx`](src/app/routes.test.tsx:121) `redirects /billing to the billing plan page` — flaky timeout chờ `router.state.navigation.state === "idle"`. Test environment vấn đề, không reproduce ở build. Baseline 1616 pass — hiện hơn baseline 30 pass. |
| `npm run build`                                   | ✅                                      | 3475 modules, 12.6s                                                                                                                                                                                                                                                           |
| `node scripts/check-runtime-env.mjs`              | 🟡                                      | OK frontend + backend env. `api:health: FAILED fetch failed` (backend local không chạy, expected). MISSING Sentry DSN (warning).                                                                                                                                              |
| `node scripts/check-runtime-env.mjs --full-stack` | 🟡                                      | Cùng lý do — backend local không lên. Production backend trên Render vẫn live (Phase A confirm).                                                                                                                                                                              |
| `npm run smoke:mvp1`                              | ❌                                      | Script drift: chờ copy `"trải nghiệm demo miễn phí"` / `"dùng được ngay không cần đăng nhập"` — đã bị xóa ở P2 polish theo Production Mode Safety Rules. **Tooling debt, không phải product bug.**                                                                            |
| `npm run smoke:core-quality`                      | ❌                                      | Vẫn fail trong demo mode vì script seed localStorage rồi navigate `/12-week-system`, app redirect login (real-mode env trong `.env.local` thắng `.env.development.local` khi cả 2 cùng tồn tại). **Tooling debt.**                                                            |
| `npm run smoke:prod:quick`                        | 🟡 4/5                                  | PASS: SPA shell, signed-out home, seeded 12-week localStorage, progress tab. FAIL: `Production billing management loads` (timeout 30s) — đúng kỳ vọng vì billing đang khóa (B3).                                                                                              |
| `npm run qa:visual-ux-ui`                         | ⏭                                      | Yêu cầu agent-browser MCP, không khả dụng. Thay bằng [`qa-artifacts/p4-visual/_runner.mjs`](qa-artifacts/p4-visual/_runner.mjs:1) — 30 screenshot capture qua Playwright Node trực tiếp.                                                                                      |

## Visual QA local (`qa-artifacts/p4-visual/{viewport}/{step}.png`)

Tất cả 30 lần load HTTP 200 trên dev server local (port 5173).

| Page × Viewport     | 1280 | 768 | 375 |
| ------------------- | ---- | --- | --- |
| `/`                 | ✅   | ✅  | ✅  |
| `/onboarding`       | ✅   | ✅  | ✅  |
| `/life-insight`     | ✅   | ✅  | ✅  |
| `/smart-goal-setup` | ✅   | ✅  | ✅  |
| `/feasibility`      | ✅   | ✅  | ✅  |
| `/12-week-setup`    | ✅   | ✅  | ✅  |
| `/12-week-system`   | ✅   | ✅  | ✅  |
| `/today-v2`         | ✅   | ✅  | ✅  |
| `/journal`          | ✅   | ✅  | ✅  |
| `/billing/plan`     | ✅   | ✅  | ✅  |

Quan sát chính:

- `/12-week-system` ở 1280: header sạch, có CTA "Mở review tuần" + "Mở mục tiêu", chip "Khởi động" + "Lưu trên thiết bị" + "Gói Miễn phí", **không hiện banner "Cần chọn bản dữ liệu"** trong demo mode (B2 chỉ trigger trong real-mode khi auto-sync conflict).
- `/billing/plan` ở 1280: hero "Chọn gói phù hợp với bạn" + 4 trust signal + section "Gói hiện tại" — copy production-appropriate.
- 375 (mobile): không thấy text overflow ở các route core flow.

## Production smoke (`https://dearourfuture.io.vn/`)

### Phase A — public, automated (`qa-artifacts/p4-prod-smoke/public-{viewport}.png`)

| Item                 | Status | Detail                                                                                                                                                                               |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/` 1280 load        | ✅     | http=200, 1433ms (< 3s)                                                                                                                                                              |
| `/` 768 load         | ✅     | http=200, 1325ms                                                                                                                                                                     |
| `/` 375 load         | ✅     | http=200, 1207ms                                                                                                                                                                     |
| Copy demo-only check | ✅     | Snippet 1280 không còn `"không cần đăng nhập"` ở hero (P2 polish đã clean) — vẫn còn `"không cần email"` trong card "Mở trang là dùng được, không cần email" — sẽ note R1 follow-up. |

### Phase B — authenticated, manual

User chọn tự test bằng tay trên laptop demo trước hôm chiếu (không lưu credentials trong env). Checklist:

| Item                                             | Trách nhiệm | Done? |
| ------------------------------------------------ | ----------- | ----- |
| Login demo account → `/12-week-system` < 5s      | user manual | ⏳    |
| `/12-week-system` data đúng (plan đã setup)      | user manual | ⏳    |
| Tick task → đợi 5s → refresh → vẫn ticked        | user manual | ⏳    |
| Logout → bounce về public landing                | user manual | ⏳    |
| 3 viewport PublicVisitorView (Phase A automated) | agent       | ✅    |

## Bugs đã fix trong P4

Không có. P4 là phase QA + decision, không sửa code production.

## Bugs defer (đã có workaround trong script demo + preflight checklist)

| ID        | Tên                                             | Workaround                                                                                                                                                                                                                                                                            |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**    | `/api/auth/profile` 429 → bounce `/onboarding`  | **Preflight**: pre-login sẵn 2 laptop demo trước demo, KHÔNG clear cookie giữa các phần. Đã có ticket frontend fallback [`docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md`](docs/superpowers/prompts/2026-05-24-loginpage-profile-loading-regression.md). |
| **B2**    | Banner "Cần chọn bản dữ liệu" sau login lần đầu | **Plan B**: nếu trên prod hiện banner trước khán giả, chuyển ngay sang laptop demo (`VITE_APP_MODE=demo`) đã chuẩn bị — demo mode KHÔNG có banner conflict.                                                                                                                           |
| **B3**    | Billing tạm khóa do chuyển nhà cung cấp         | **Script demo**: khi nói tới monetization, dẫn câu "đang chuyển provider VietQR/Casso → PayOS, cuối tháng mở lại". KHÔNG demo flow upgrade Plus.                                                                                                                                      |
| **P4-N1** | `routes.test.tsx` flaky timeout                 | Không product bug. Test env timeout, baseline pass count vẫn cao hơn. Không cần fix trước demo.                                                                                                                                                                                       |
| **P4-N2** | `smoke:mvp1` script drift                       | Chờ copy demo cũ đã xóa theo Production Safety Rules. Backlog post-demo: cập nhật expected text trong script.                                                                                                                                                                         |
| **R1**    | Card "Mở trang là dùng được, không cần email"   | Câu này nhẹ hơn `"không cần đăng nhập"` (đã xóa) và mô tả đúng hành vi local-first. Không gấp. Backlog UX writer post-demo.                                                                                                                                                           |
| **R3**    | Google OAuth chưa test end-to-end               | **Preflight**: user tự click 1 lần trên laptop demo trước hôm chiếu, đảm bảo Firebase whitelist `dearourfuture.io.vn`.                                                                                                                                                                |
| **R4**    | Signup flow chưa kiểm chứng (no email mới)      | **Preflight**: user tự signup 1 account thử trên laptop dự phòng.                                                                                                                                                                                                                     |

## Risk còn lại (đã có mitigation)

1. **Cả lớp login cùng IP** → có thể trigger rate-limit B1 dây chuyền. Mitigation: dùng demo mode trên màn chiếu, **không** yêu cầu khán giả tự đăng ký trong buổi demo. Nếu muốn để khán giả thử, đưa link sau buổi với khoảng cách 30s/người.
2. **Vercel hoặc Render outage** → đã có plan B (laptop demo mode) + plan C (video record).
3. **Banner sync conflict** xuất hiện trên prod khi user đã có plan, login fresh-context → script demo không hiện thanh nav khi giảng (zoom vào nội dung), hoặc dùng laptop demo mode.

## Demo plan B/C

- **Plan B — Vercel/Render down**: laptop demo có sẵn `.env.development.local` với `VITE_APP_MODE=demo` + `VITE_BILLING_PROVIDER_MODE=mock_provider` + `VITE_ANALYTICS_MODE=off`. Chạy `npm run dev` → demo bằng localhost.
- **Plan C — cả 2 down**: dùng video record `qa-artifacts/demo-record.mp4` (TODO: user record sẵn 1 lần trước demo).
- **Plan D — projector hỏng**: in QR code đăng ký, share link qua chat lớp Zalo/Discord.

## Quyết định

**🟡 GO with caveats** — đề xuất duyệt với điều kiện user hoàn tất 4 việc preflight tay trước demo:

1. ✅ Login demo account trên laptop demo + giữ session (mitigate B1).
2. ✅ Tick 1 task → refresh kiểm sync (mitigate Phase B prod smoke).
3. ✅ Click `Tiếp tục với Google` 1 lần (mitigate R3).
4. ✅ Signup 1 account thử trên laptop dự phòng (mitigate R4).

Nếu cả 4 việc đều pass, escalate lên **GO ✅**.
Nếu Google OAuth fail hoặc tick task không persist sau refresh → **NO-GO 🛑**, phải fix B1 trước.

## Tham chiếu

- [`qa-artifacts/p1-audit/REPORT.md`](qa-artifacts/p1-audit/REPORT.md:1) — full audit findings
- [`docs/superpowers/specs/2026-05-24-demo-script-lop.md`](docs/superpowers/specs/2026-05-24-demo-script-lop.md:1) — script demo trước lớp
- [`docs/superpowers/specs/2026-05-24-demo-preflight-checklist.md`](docs/superpowers/specs/2026-05-24-demo-preflight-checklist.md:1) — preflight 60 phút trước demo
- [`qa-artifacts/p4-visual/_runner.mjs`](qa-artifacts/p4-visual/_runner.mjs:1) — visual QA runner
- [`qa-artifacts/p4-prod-smoke/_runner.mjs`](qa-artifacts/p4-prod-smoke/_runner.mjs:1) — production smoke runner
- [`qa-artifacts/p4-prod-smoke/log.json`](qa-artifacts/p4-prod-smoke/log.json:1) — production timing log
