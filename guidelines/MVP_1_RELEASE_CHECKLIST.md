# MVP 1 Release Checklist

Last reviewed: 2026-04-29

MVP 1 release target: local-first public demo for the 12-week execution system.

Release promise:

- A visitor can complete the core journey without login.
- The app works without Firebase, backend, MongoDB, or real billing.
- Data is saved locally in the current browser/device.
- Mock upgrade demonstrates paywall and entitlement UX, not real payment.

## 1. Local Checks

- [ ] Install frontend dependencies with `npm ci`.
- [ ] Install backend dependencies with `npm --prefix backend ci` if backend checks are part of the release gate.
- [ ] Confirm local frontend env exists from `.env.example`.
- [ ] Confirm local demo mode starts with `npm run dev`.
- [ ] Open `http://localhost:5173`.
- [ ] Confirm fresh browser profile does not require login.
- [ ] Confirm console has no repeated backend/Firebase request spam in demo mode.
- [ ] Run `npm run env:check`.
- [ ] Confirm `env:check` may warn about missing backend/Firebase env but does not block demo mode.
- [ ] If testing full-stack sync, run `npm run env:check:full` only after setting Firebase/backend env.

## 2. Build Checks

Required frontend checks:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Recommended all-in-one frontend gate:

```bash
npm run check
```

Backend checks, if backend changes are included in the release:

```bash
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run build
```

Full repo check, if time permits:

```bash
npm run check:all
```

Local-first MVP 1 smoke:

```bash
npm run smoke:mvp1
```

Production smoke:

```bash
npm run smoke:prod
```

GitHub Actions smoke:

- [ ] `.github/workflows/production-smoke-e2e.yml` has `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` configured as repository secrets.
- [ ] Manual workflow run passes against `https://vision-board-web-platform.vercel.app`.
- [ ] Scheduled workflow failure email is treated as release-blocking only if the failure reproduces against the current production URL.

## 3. Environment Variables

Frontend demo-safe production env:

```env
VITE_APP_MODE=demo
VITE_API_BASE_URL=https://vision-board-web-platform.onrender.com/api
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
VITE_ANALYTICS_MODE=off
VITE_GA_MEASUREMENT_ID=
VITE_SHOW_BILLING_DEBUG=false
VITE_OUTBOX_SYNC_ENDPOINT=
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

Backend env is optional for MVP 1 demo but required for full-stack testing:

```env
PORT=4000
MONGODB_URI=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FRONTEND_ORIGIN=
```

Deployment config to verify:

- [ ] `vercel.json` rewrites `/(.*)` to `/index.html`.
- [ ] `netlify.toml` redirects `/*` to `/index.html` if using Netlify.
- [ ] `render.yaml` backend health check path is `/api/health`.
- [ ] Vercel project env overrides do not accidentally switch `VITE_APP_MODE` to `real`.

## 4. Demo Mode Settings

Required:

- [ ] `VITE_APP_MODE=demo`.
- [ ] No Firebase env required.
- [ ] No backend health required.
- [ ] Backend sync does not run for protected 12-week sync paths.
- [ ] Login page may show Firebase configuration notice, but login is not required for the core demo.
- [ ] Fresh signed-out dashboard starts cleanly and points to the core flow.
- [ ] Refresh keeps local plan/task/review data on the same browser/device.

Do not release MVP 1 demo with:

- [ ] `VITE_APP_MODE=real` without complete Firebase env.
- [ ] Required login before onboarding or 12-week setup.
- [ ] Backend sync errors that block local save.
- [ ] Demo/sample goals that look like private user data.

## 5. Billing Mock Settings

Required:

```env
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
```

Checklist:

- [ ] Paywall opens from premium template or premium review teaser.
- [ ] Paywall copy makes clear this is a demo/mock upgrade.
- [ ] Clicking Plus creates a mock checkout session.
- [ ] `/billing/mock-checkout?session=...` loads.
- [ ] Confirming mock checkout unlocks local Plus entitlements.
- [ ] User returns to the previous 12-week flow after checkout.
- [ ] Billing page shows current Plus state after mock checkout.
- [ ] Restore/sync entitlement actions do not imply real provider payment.

Known billing boundary:

- MVP 1 has no real payment, no webhook, no server-side entitlement authority, and no durable cross-device paid access.
- `PRO` exists as a compatibility type but is normalized to `PLUS`; do not describe Pro as a real plan.

## 6. Analytics Settings

Demo default:

```env
VITE_ANALYTICS_MODE=off
VITE_GA_MEASUREMENT_ID=
```

Optional GA4 mode, only if verified:

```env
VITE_APP_MODE=real
VITE_ANALYTICS_MODE=ga4
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Checklist:

- [ ] Demo mode writes local/debug analytics only.
- [ ] No direct `gtag` or `dataLayer` calls outside the analytics wrapper.
- [ ] No sensitive payloads such as goal text, private notes, answers, email, or account identifiers are sent.
- [ ] Event taxonomy in `guidelines/ANALYTICS_MVP.md` matches current code.
- [ ] If GA4 is enabled, verify `dataLayer`/`gtag` events for core funnel, 12-week, and mock checkout events.

## 7. Smoke Test Manual Flow

Run in a fresh browser profile or after resetting local data.

Automated local-first smoke:

- [ ] Start the local frontend with demo-safe env, or set `MVP1_SMOKE_URL` to the candidate demo URL.
- [ ] Run `npm run smoke:mvp1`.
- [ ] Confirm the script passes without Firebase/backend/payment credentials.
- [ ] If the UI wizard path changes and the script uses its controlled localStorage seed fallback, verify the log explains the fallback reason.
- [ ] Optional deep run: set `MVP1_SMOKE_FULL_UI=true` to exercise the full onboarding -> 12-week setup wizard instead of the fast seed path.

Core journey:

- [ ] Open `/`.
- [ ] Confirm signed-out/fresh dashboard is understandable and not crowded.
- [ ] Start onboarding.
- [ ] Complete Life Balance.
- [ ] Continue to Life Insight.
- [ ] Continue to SMART Goal setup.
- [ ] Create a SMART goal.
- [ ] Complete Feasibility Check.
- [ ] Create a 12-week plan.
- [ ] Confirm redirect to `/12-week-system`.
- [ ] Confirm Today tab is the first useful execution surface.
- [ ] Complete at least one Today task.
- [ ] Save daily check-in.
- [ ] Open Week tab.
- [ ] Submit or preview weekly review.
- [ ] Open Progress tab and confirm progress reflects task/review data.
- [ ] Refresh browser and confirm plan remains.

Mock upgrade:

- [ ] Open a premium template, premium review insight, or billing CTA.
- [ ] Confirm paywall opens.
- [ ] Start Plus mock checkout.
- [ ] Confirm mock checkout page says it is simulated.
- [ ] Confirm checkout.
- [ ] Confirm local Plus entitlement unlock.
- [ ] Confirm user returns to the right route.

Production smoke:

- [ ] Run `npm run smoke:prod` against the final production URL.
- [ ] If production smoke cannot run, document exact missing secret/env reason before release.

## 8. Browser/Device Checks

Desktop:

- [ ] Chrome latest.
- [ ] Edge latest.
- [ ] Safari latest if available.
- [ ] 1366px desktop viewport.
- [ ] Wide desktop viewport.

Mobile:

- [ ] iPhone-sized viewport.
- [ ] Android-sized viewport.
- [ ] Onboarding and wizard step transitions start at the top.
- [ ] No button text clips or overlaps.
- [ ] 12-week system tabs are reachable and readable.
- [ ] Paywall modal fits viewport and scrolls correctly.

PWA/service worker:

- [ ] `public/sw.js` does not serve stale broken assets after deploy.
- [ ] Navigation requests load from network first; cached `/index.html` is only an offline fallback.
- [ ] Vite hashed JS/CSS assets can use cache-first, but `/sw.js` itself must not be served from runtime cache.
- [ ] Mock checkout routes such as `/billing/mock-checkout?session=...` load through the SPA rewrite and are not cached as session-specific shell entries.
- [ ] After deploy, hard refresh the production URL and confirm the visible dashboard matches the new release copy.
- [ ] If production shows stale UI, unregister the service worker before treating it as a failed deployment.
- [ ] Clear site data when validating rollback or when a tester reports seeing an old dashboard after rollback.
- [ ] Service worker cache name changes are considered if shipping asset behavior changes.

If a tester sees an old build:

- [ ] Desktop Chrome/Edge: open DevTools -> Application -> Service Workers -> Unregister, then Application -> Storage -> Clear site data.
- [ ] Desktop Chrome/Edge quick check: open DevTools, right-click reload, choose Empty Cache and Hard Reload.
- [ ] Mobile browser: close all tabs for the site, clear site data/history for the domain if available, then reopen the production URL.
- [ ] Reopen `/`, `/12-week-system`, and `/billing/mock-checkout?session=invalid` to confirm SPA refresh behavior still works after cache reset.
- [ ] Re-run `MVP1_SMOKE_URL=<candidate-url> npm run smoke:mvp1` after cache reset.

Accessibility/ergonomics:

- [ ] Primary CTA is visually clear on onboarding.
- [ ] Keyboard focus is not trapped in paywall or dialogs.
- [ ] Form validation messages are readable.
- [ ] Toasts do not cover primary mobile actions for too long.

## 9. Data Reset/Export Checks

Local persistence:

- [ ] Create a plan and confirm it survives refresh.
- [ ] Complete tasks/check-ins/reviews and confirm they survive refresh.
- [ ] Confirm local data is browser/device-specific.
- [ ] Confirm clearing site data removes the demo state.

Reset:

- [ ] Verify any visible reset/local cleanup control works before release.
- [ ] Confirm reset clears mock billing sessions/account and entitlement snapshots where expected.
- [ ] Confirm reset does not leave old demo/sample data visible on the dashboard.

Export/disclosure:

- [ ] Do not promise account-level export or recovery in MVP 1.
- [ ] Public demo copy should disclose that progress is saved locally on this browser/device.
- [ ] If an export affordance is visible, verify the exported data is readable and does not include secrets.

Storage safety:

- [ ] Browser console has no JSON parse crash from old localStorage data.
- [ ] Auth-scoped storage does not leak another user's local data into signed-out demo state.
- [ ] Mock billing localStorage keys are treated as demo-only and not security authority.

## 10. Known Limitations To Disclose

Include these in release notes or demo copy:

- This is a local-first public demo.
- Data is stored in the current browser/device localStorage.
- Clearing browser storage can remove demo data.
- Login is optional for MVP 1 and not required for the core demo.
- Full cloud sync is not guaranteed in MVP 1.
- Firebase/backend sync requires separate real-mode env configuration.
- Mock checkout does not charge money.
- Plus unlock in MVP 1 is local/mock, not a real paid subscription.
- There is no production payment webhook or server-side entitlement authority yet.
- Push/email reminder delivery is not production-guaranteed.
- The product is web-only; there is no native mobile app.
- `PRO` is not a real public plan yet.

## 11. Rollback Plan

Before release:

- [ ] Tag or record the last known good commit.
- [ ] Record the Vercel deployment URL for the candidate release.
- [ ] Keep the previous Vercel production deployment available for instant rollback.
- [ ] Keep `.env.production` demo-safe in git.

If production demo breaks:

- [ ] In Vercel, redeploy/promote the previous known good deployment.
- [ ] Revert any Vercel env var that switched demo mode to real mode.
- [ ] Set `VITE_APP_MODE=demo`.
- [ ] Set `VITE_BILLING_PROVIDER_MODE=mock_provider`.
- [ ] Set `VITE_ANALYTICS_MODE=off` if analytics is suspected.
- [ ] Ask testers to hard refresh after rollback.
- [ ] If stale UI persists, unregister the service worker for the domain.
- [ ] Clear site data when testing rollback so cached `/index.html`, old chunks, mock checkout sessions, and local demo state do not mask the deployed build.
- [ ] After rollback, open the production URL in a clean browser profile and confirm the dashboard shows the expected rollback build.
- [ ] After rollback, refresh a deep SPA route such as `/12-week-system` and `/billing/mock-checkout?session=invalid` to verify Vercel rewrite still serves the app shell.
- [ ] Re-run `npm run smoke:prod` after rollback.

If backend is down:

- [ ] Do not block MVP 1 demo if frontend is in demo mode.
- [ ] Leave backend incident note in release status.
- [ ] Fix Render/backend separately, then re-run `npm run env:check:full` and backend health check.

If mock checkout breaks:

- [ ] Keep Free 12-week execution path public and usable.
- [ ] Hide/de-emphasize upgrade CTA if needed.
- [ ] Restore from previous deployment once mock checkout path is fixed.
