# MVP 1 Post-Deploy Smoke Report

## 1. URL Checked

- Primary URL from `README.md`: `https://vision-board-web-platform.vercel.app`
- Latest Vercel deployment URL observed from CLI: `https://vision-board-web-platform-1z6aws0ky-anhnhat432s-projects.vercel.app`
- Result for direct latest deployment URL: not publicly smoke-testable in this run because it redirected to Vercel login / SSO protection.

## 2. Check Date

- Checked at: 2026-04-30 21:29 +07:00
- Role: senior release engineer
- Scope: production deploy verification for MVP 1 local-first public demo

## 3. Env Mode Observed Or Assumed

Observed from behavior:

- Production is **not demo-safe** for MVP 1.
- Fresh signed-out visitor on `/` still sees signup-first copy.
- Direct refresh of `/12-week-setup` and `/12-week-system` redirects to `/login?next=...`.
- This behavior is consistent with a real/account-gated production build or production env where `VITE_APP_MODE` is not effectively `demo`.

Observed from Vercel CLI:

- `VITE_APP_MODE` exists for Production but value is encrypted, so the exact value was not read.
- Firebase client env vars exist for Production.
- `VITE_API_BASE_URL` exists for Production.
- `VITE_BILLING_PROVIDER_MODE` was not listed by `vercel env ls`; checked-in `.env.production` defaults it to `mock_provider`.
- `VITE_ANALYTICS_MODE` was not listed by `vercel env ls`; code defaults analytics mode to `off` unless explicitly set to GA4 with a valid measurement ID.

Required MVP 1 production env before public sharing:

```env
VITE_APP_MODE=demo
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_ANALYTICS_MODE=off
```

Firebase/backend must not become a requirement for the MVP 1 public demo.

## 4. Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run smoke:mvp1` with `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app` | Fail | Signed-out dashboard missing local-first CTA and still shows signup-first copy. |
| `npm run smoke:mvp1` with `MVP1_SMOKE_FULL_UI=true` and the same URL | Fail | Fails at the same signed-out dashboard gate before full UI flow can begin. |
| `npx.cmd agent-browser ... serviceWorker.getRegistrations().unregister()` | Completed | Found and unregistered 1 service worker, cleared caches/localStorage/sessionStorage. |
| Reopen `/` after service worker unregister/cache clear | Still fail | Signup-first UI remained, so this is not just browser cache. |
| Route refresh HTTP probe for required routes | Pass HTTP shell | All specified routes returned HTTP 200 and Vercel SPA shell. |
| Browser refresh probe for `/12-week-setup` | Fail runtime | Redirected to `/login?next=%2F12-week-setup`. |
| Browser refresh probe for `/12-week-system` | Fail runtime | Redirected to `/login?next=%2F12-week-system`. |
| `npx.cmd vercel env ls` | Completed | Env names visible, values encrypted. |
| `npx.cmd vercel ls` | Completed | Latest listed production deployment is ready and aliased to the live URL. |
| `npx.cmd vercel inspect <latest-deployment-url>` | Completed | Latest deployment target is Production and has live alias. |
| `Invoke-WebRequest https://vision-board-web-platform.vercel.app/sw.js` | Pass | `/sw.js` serves cache name `dof-mvp1-shell-v2`, `Cache-Control: public, max-age=0, must-revalidate`. |

## 5. Smoke Result

Result: **Fail**.

Failure evidence from `smoke:mvp1`:

- Expected one of:
  - `Trải nghiệm demo miễn phí`
  - `Dùng thử không cần đăng nhập`
  - `Bắt đầu Life Balance`
- Actual visible dashboard copy included:
  - `Đăng ký miễn phí để lưu`
  - `Tôi đã có tài khoản`
  - `Đăng ký để lưu và đồng bộ dữ liệu`
  - `Tạo tài khoản trước khi nhập dữ liệu thật`

This is the same release blocker recorded in `guidelines/MVP_1_GO_NO_GO.md`.

## 6. Full UI Smoke Result

Result: **Fail**.

Reason:

- Full UI smoke fails at the initial signed-out dashboard gate before the onboarding / Life Balance / SMART Goal / Feasibility / 12-week setup path can start.
- The app still pushes the visitor toward signup instead of the local-first public demo CTA.

## 7. Route Refresh Result

HTTP refresh result:

| Route | HTTP result |
| --- | --- |
| `/` | 200 |
| `/onboarding` | 200 |
| `/life-balance` | 200 |
| `/life-insight` | 200 |
| `/smart-goal-setup` | 200 |
| `/feasibility` | 200 |
| `/12-week-setup` | 200 |
| `/12-week-system` | 200 |
| `/billing/plan` | 200 |

Runtime browser result:

| Route | Runtime result |
| --- | --- |
| `/12-week-setup` | Redirects signed-out visitor to `/login?next=%2F12-week-setup` |
| `/12-week-system` | Redirects signed-out visitor to `/login?next=%2F12-week-system` |

Vercel SPA rewrite is functioning at the HTTP layer, but production runtime behavior is not MVP 1 demo-safe.

## 8. Cache / Service Worker Result

Static service worker check:

- `/sw.js` returned HTTP 200.
- Active cache name in served script: `dof-mvp1-shell-v2`.
- `Cache-Control`: `public, max-age=0, must-revalidate`.
- Navigation strategy in source is network-first with cached `/index.html` fallback.

Browser reset check:

- Agent-browser found 1 service worker registration.
- The registration was unregistered.
- Cache Storage, localStorage, and sessionStorage were cleared.
- Reopening `/` still showed the signup-first dashboard.

Conclusion:

- This failure is not explained by stale service worker/cache in the test browser.
- The live alias is serving a build/env combination that is still account-gated for signed-out visitors.

## 9. Production Demo-Safe Status

Production is **not demo-safe** for MVP 1.

The deploy fails the core MVP 1 requirement:

- A fresh signed-out visitor must be able to start the local-first core flow without login.

## 10. Decision

Decision: **NO-GO**.

Do not share `https://vision-board-web-platform.vercel.app` as the MVP 1 public demo until production smoke passes.

## 11. NO-GO Blocker

Blocker:

- Production signed-out flow is still signup-gated / account-first.

Likely cause:

- Vercel Production env is not effectively demo-safe, especially `VITE_APP_MODE`.
- The exact value cannot be read from `vercel env ls` because values are encrypted, but runtime behavior strongly indicates production is not running the demo-safe signed-out path.

Required fix:

1. Set Vercel Production env to MVP 1 demo-safe values:
   - `VITE_APP_MODE=demo`
   - `VITE_BILLING_PROVIDER_MODE=mock_provider`
   - `VITE_ANALYTICS_MODE=off`
2. Redeploy or promote a build from the latest `main` commit.
3. Confirm the production alias points to that deployment.
4. Hard refresh, unregister service worker, and clear site data if testers still see old UI.
5. Rerun:

```powershell
$env:MVP1_SMOKE_URL = "https://vision-board-web-platform.vercel.app"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
```

Then run the full UI smoke:

```powershell
$env:MVP1_SMOKE_URL = "https://vision-board-web-platform.vercel.app"
$env:MVP1_SMOKE_FULL_UI = "true"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
Remove-Item Env:\MVP1_SMOKE_FULL_UI
```

## 12. Next Recommended Task

Recommended next task:

```text
Update Vercel Production env to MVP 1 demo-safe mode, redeploy the latest main commit, then rerun post-deploy smoke. Do not change source code unless the redeployed demo-safe env still fails smoke.
```

Do not fix this by enabling Firebase/backend or real billing. MVP 1 public demo should remain local-first.
