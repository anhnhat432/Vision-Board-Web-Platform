# MVP 1 QA Report

## 1. Ngày kiểm tra

- Date: 2026-04-30 09:55 +07:00
- Role: senior QA engineer
- Scope: MVP 1 local-first public demo.

## 2. URL đã kiểm tra

- Local release candidate: `http://localhost:5173`
- Live production URL found in `README.md`: `https://vision-board-web-platform.vercel.app`
- `MVP1_SMOKE_URL` was not set before local smoke, so the default local URL was used.

## 3. Env mode

- Local dev server was started with:
  - `VITE_APP_MODE=demo`
  - `VITE_BILLING_PROVIDER_MODE=mock_provider`
- Backend was not started and was not required for local MVP 1 smoke.
- Firebase login was not required for the local signed-out flow.
- `npm run env:check` read `.env.local` and reported `VITE_APP_MODE`/Firebase/backend variables present, but backend health was unavailable.

## 4. Commands đã chạy

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run env:check` | Pass with warning | Command exited 0. API health failed with `fetch failed`; non-blocking for local-first demo when backend is intentionally not required. |
| Local Vite dev server at `http://localhost:5173` | Pass | Started with demo/mock env and returned HTTP 200. |
| `npm.cmd run smoke:mvp1` | Pass | Default smoke used controlled localStorage seed after signed-out CTA, then verified 12-week system execution. |
| `$env:MVP1_SMOKE_FULL_UI='true'; npm.cmd run smoke:mvp1` | Pass | Full UI smoke completed `Core flow mode: ui`. |
| `$env:MVP1_SMOKE_URL='https://vision-board-web-platform.vercel.app'; npm.cmd run smoke:mvp1` | Fail | Live production dashboard is stale/not demo-safe: missing local-first CTA and still asks user to sign up before entering data. |
| `agent-browser` manual billing flow on `http://localhost:5173/billing/plan` | Pass | Verified mock checkout copy, mock checkout session, confirmation, Plus local entitlement, and reload persistence. |

## 5. Kết quả command

- `env:check`: pass with warning. Backend API health failed because no backend server was running. This is acceptable for MVP 1 local-first public demo, but not for a full-stack release.
- Local default smoke: pass. Dashboard signed-out did not force `/login`, CTA started demo flow, 12-week system opened, Today queue had useful content, first task toggle persisted, daily check-in persisted, Week/Progress opened, no serious browser/page errors, and no protected `/api` request spam was detected.
- Local full UI smoke: pass. Automation went through Dashboard -> Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility -> 12-week setup -> 12-week system, then Today/Week/Progress.
- Production smoke: fail. The live URL showed older copy/CTA: `Đăng ký miễn phí để lưu`, `Tôi đã có tài khoản`, and explanatory text telling visitors to create an account before entering real data. It did not contain one of the expected local-first CTA labels: `Trải nghiệm demo miễn phí`, `Dùng thử không cần đăng nhập`, or `Bắt đầu Life Balance`.

## 6. Core manual path đã kiểm tra

| Path | Status | Evidence |
| --- | --- | --- |
| Dashboard signed-out | Pass local, fail production | Local smoke found signed-out CTA and no forced `/login`. Production smoke failed on missing local-first CTA. |
| Onboarding | Pass local | Full UI smoke clicked onboarding start and entered assessment. |
| Life Balance | Pass local | Full UI smoke completed the Life Balance assessment. |
| Life Insight | Pass local | Full UI smoke reached Life Insight and clicked SMART goal CTA. |
| SMART Goal | Pass local | Full UI smoke filled specific, measurable, achievable, relevant, and deadline steps. |
| Feasibility | Pass local | Full UI smoke completed feasibility questions and reached result. |
| 12-week setup | Pass local | Full UI smoke filled tactics/metrics and created a 12-week plan. |
| Today tab | Pass local | Smoke verified Today queue had useful content. |
| Task complete | Pass local | Smoke toggled the first Today task and verified local persistence. |
| Daily check-in | Pass local | Smoke saved daily check-in and verified local persistence. |
| Week review | Partial pass local | Smoke opened Week tab. It did not submit a full weekly review in this run. |
| Progress tab | Pass local | Smoke opened Progress tab; when tab click did not switch, it opened `/12-week-system?tab=progress` directly and verified the route. |
| Mock checkout | Pass local | Manual agent-browser flow verified mock checkout text says no real charge, created a mock checkout session, confirmed Plus, and granted local entitlements. |
| Refresh persistence | Pass local | After mock checkout confirmation, page reload still showed Plus plan and premium entitlements on the same browser. Smoke also verified task/check-in localStorage persistence. |

## 7. Lỗi/blocker tìm thấy

1. Live production URL is not aligned with the current local release candidate.
   - Affected URL: `https://vision-board-web-platform.vercel.app`
   - Risk: high for public sharing, because a signed-out visitor is still pushed toward signup before the core demo flow.
   - Evidence: production smoke failed at dashboard expected-text check.
   - Recommended fix: deploy/promote the latest demo-safe frontend build, confirm production env keeps `VITE_APP_MODE=demo` and `VITE_BILLING_PROVIDER_MODE=mock_provider`, then rerun `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1`.

2. Backend health warning in local `env:check`.
   - Risk: low for MVP 1 local-first demo, medium for full-stack release.
   - Evidence: `API health: FAILED fetch failed`.
   - Recommended fix: no source change for MVP 1; start backend only for full-stack validation.

3. Week review is not fully submitted by `smoke:mvp1`.
   - Risk: medium for release confidence, not an observed product blocker.
   - Evidence: smoke opens Week tab but does not complete a full weekly review submission.
   - Recommended fix: extend `scripts/smoke-mvp1-local-demo.mjs` later to submit or preview weekly review.

## 8. Có thể release public demo chưa?

- Local release candidate: yes, suitable for MVP 1 local-first public demo based on local full UI smoke and mock checkout verification.
- Current live production URL: no, not yet. It must be redeployed or repointed to the latest demo-safe build before sharing publicly.

Release decision: do not share the current production URL broadly until production smoke passes.

## 9. Việc cần sửa tiếp theo

1. Redeploy/promote the latest frontend candidate to Vercel with demo-safe env.
2. Rerun production smoke:

```powershell
$env:MVP1_SMOKE_URL = "https://vision-board-web-platform.vercel.app"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
```

3. Add weekly-review submission coverage to `smoke:mvp1` in a separate task.
4. For full-stack release only, start backend and rerun env/full-stack checks; do not block MVP 1 local-first demo on backend health.
