# MVP 1 Deploy Verification

## 1. URL Checked

- URL provided in this task: **none**
- Verification mode: **checklist / runbook only**
- Candidate URL to fill in before running: `<DEPLOY_URL>`

Context:

- `guidelines/MVP_1_GO_NO_GO.md` previously recorded `https://vision-board-web-platform.vercel.app` as stale/not demo-safe.
- Do not treat any deploy as releasable until the specific candidate URL passes `smoke:mvp1`.

## 2. Check Date

- Prepared at: 2026-04-30 12:28 +07:00
- Role: deploy preview / production release engineer
- Scope: MVP 1 local-first public demo deploy verification

## 3. Env Mode Observed

No live deploy URL was supplied in this task, so deploy env was **not observed live**.

Required MVP 1 demo-safe frontend env:

```env
VITE_APP_MODE=demo
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
VITE_ANALYTICS_MODE=off
VITE_GA_MEASUREMENT_ID=
VITE_SHOW_BILLING_DEBUG=false
```

Allowed but non-blocking for MVP 1:

```env
VITE_API_BASE_URL=https://vision-board-web-platform.onrender.com/api
```

Firebase client env may be empty for MVP 1 demo:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Only if intentionally testing real/full-stack mode:

- `VITE_API_BASE_URL` must point to a healthy backend.
- Firebase client env must be complete.
- Backend Render env must be configured separately.
- This is not required for MVP 1 public demo and must not become a demo gate.

## 4. Commands Run

No deploy smoke command was run because no deploy URL was provided in this task.

Commands to run once a candidate URL exists:

```powershell
$env:MVP1_SMOKE_URL = "<DEPLOY_URL>"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
```

Optional full UI deploy smoke:

```powershell
$env:MVP1_SMOKE_URL = "<DEPLOY_URL>"
$env:MVP1_SMOKE_FULL_UI = "true"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
Remove-Item Env:\MVP1_SMOKE_FULL_UI
```

Optional route-refresh probe:

```powershell
$base = "<DEPLOY_URL>".TrimEnd("/")
$routes = @("/", "/12-week-setup", "/12-week-system", "/billing/plan", "/billing/mock-checkout?session=invalid")
foreach ($route in $routes) {
  $url = "$base$route"
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 5
  "$route => HTTP $($response.StatusCode)"
}
```

## 5. Manual Flow To Test

Run in a fresh browser profile or after clearing site data for the deploy domain.

1. Open `<DEPLOY_URL>/`.
2. Confirm the app does not redirect to `/login`.
3. Confirm the signed-out dashboard has a local-first CTA such as:
   - `Trải nghiệm demo miễn phí`
   - `Dùng thử không cần đăng nhập`
   - `Bắt đầu Life Balance`
4. Confirm dashboard copy says data is saved locally on this browser/device.
5. Start the core flow.
6. Complete Onboarding / Life Balance.
7. Continue to Life Insight.
8. Create SMART Goal.
9. Complete Feasibility Check.
10. Create a 12-week plan.
11. Confirm `/12-week-system` opens.
12. Confirm Today tab shows useful next tasks.
13. Toggle one task.
14. Refresh the page and confirm the task state persists.
15. Save daily check-in.
16. Open Week tab and submit or preview weekly review.
17. Open Progress tab and confirm progress reflects task/review state.
18. Open `/billing/plan`.
19. Start Plus mock checkout.
20. Confirm `/billing/mock-checkout?session=...` says no real money is charged.
21. Complete mock checkout and confirm Plus unlock is local/mock.
22. Refresh and confirm local state remains on the same browser/device.

## 6. Smoke Test Result

Status: **not run in this task**.

Reason: no deploy URL was supplied.

Pass criteria when run:

- Signed-out dashboard does not force login.
- Core flow starts from the dashboard.
- `/12-week-system` loads.
- Today task toggle persists.
- Daily check-in persists.
- Week and Progress surfaces open.
- Browser console/page error scan is clean.
- No protected `/api` request spam appears in demo mode.

## 7. Route Refresh Result

Status: **not run in this task**.

Routes that must return the SPA shell with HTTP 200 on the deploy:

- `<DEPLOY_URL>/`
- `<DEPLOY_URL>/12-week-setup`
- `<DEPLOY_URL>/12-week-system`
- `<DEPLOY_URL>/billing/plan`
- `<DEPLOY_URL>/billing/mock-checkout?session=invalid`

Config audit:

- `vercel.json` rewrites `/(.*)` to `/index.html`.
- `netlify.toml` redirects `/*` to `/index.html` with status `200`.
- `render.yaml` backend health path is `/api/health`; backend is optional for MVP 1 demo.

## 8. Cache / Service Worker Result

Status: **static audit only; not verified against a live deploy in this task**.

Observed `public/sw.js` behavior:

- Cache name: `dof-mvp1-shell-v2`
- Precaches `/index.html`
- Deletes old service worker caches on activate.
- Calls `self.skipWaiting()` and `self.clients.claim()`.
- Navigation requests use network-first with `cache: "no-store"`, falling back to cached `/index.html` only when offline.
- `/sw.js` is never served from runtime cache.
- Hashed static assets use cache-first.

Manual cache verification required on deploy:

1. Open `<DEPLOY_URL>/`.
2. Hard refresh.
3. Confirm dashboard copy matches the latest local-first demo release.
4. Open DevTools -> Application -> Service Workers.
5. Confirm active service worker is current, or unregister it if stale UI appears.
6. Clear site data.
7. Reopen `/`, `/12-week-system`, and `/billing/mock-checkout?session=invalid`.
8. Rerun `MVP1_SMOKE_URL=<DEPLOY_URL> npm run smoke:mvp1`.

## 9. Blockers

Current blockers for this deploy verification task:

- No deploy URL was provided, so no live smoke/manual/route/cache verification could be completed.

Known blocker from the latest go/no-go document:

- The previously checked production URL `https://vision-board-web-platform.vercel.app` was stale/not demo-safe and failed `smoke:mvp1`.

Release-blocking deploy failures if observed:

- Fresh signed-out visitor is redirected to `/login`.
- Dashboard CTA requires signup before the core flow.
- `VITE_APP_MODE` is effectively real mode without complete Firebase/backend configuration.
- Mock checkout copy looks like real payment or charges real money.
- `/12-week-system` refresh returns 404 instead of SPA shell.
- Service worker keeps serving an old signup-gated dashboard after hard refresh and clear site data.
- Demo mode makes repeated protected backend `/api` calls.

## 10. Release Recommendation

Recommendation: **HOLD until a candidate deploy URL is provided and verified**.

Release can move to **GO WITH KNOWN LIMITATIONS** only when:

1. Candidate deploy URL is supplied.
2. Deploy env is confirmed demo-safe.
3. `MVP1_SMOKE_URL=<DEPLOY_URL> npm run smoke:mvp1` passes.
4. Hard refresh route checks pass for `/`, `/12-week-setup`, `/12-week-system`, `/billing/plan`, and `/billing/mock-checkout?session=invalid`.
5. Manual mock checkout confirms no real money is charged.
6. Cache/service worker reset does not reveal stale signup-gated UI.

## 11. Rollback Note

If a candidate deploy fails:

1. Promote the previous known-good Vercel deployment.
2. Reconfirm demo-safe env:
   - `VITE_APP_MODE=demo`
   - `VITE_BILLING_PROVIDER_MODE=mock_provider`
   - `VITE_ANALYTICS_MODE=off`
3. Ask testers to hard refresh.
4. If stale UI persists, unregister the service worker and clear site data.
5. Reopen:
   - `/`
   - `/12-week-system`
   - `/billing/mock-checkout?session=invalid`
6. Rerun:

```powershell
$env:MVP1_SMOKE_URL = "<ROLLBACK_URL>"
npm.cmd run smoke:mvp1
Remove-Item Env:\MVP1_SMOKE_URL
```

Do not roll forward by enabling real mode, Firebase requirement, backend requirement, or real billing for MVP 1.
