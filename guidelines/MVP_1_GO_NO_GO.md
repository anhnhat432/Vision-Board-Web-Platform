# MVP 1 Go / No-Go

## 1. Decision

Decision: **NO-GO for public sharing of the current live URL**.

Local repo candidate status: **GO with known limitations after the latest build is deployed in demo-safe mode**.

Reason:

- The current repo candidate passes the local release gate: env check, typecheck, lint, full tests, build, default MVP 1 smoke, and full UI MVP 1 smoke.
- The current public production URL `https://vision-board-web-platform.vercel.app` fails `smoke:mvp1`: signed-out dashboard is stale and still pushes the visitor toward signup before the local-first demo flow.

Do not share the current production URL broadly until the latest candidate is deployed/promoted and production smoke passes.

## 2. Check Date

- Checked at: 2026-04-30 12:25 +07:00
- Reviewer role: senior release engineer, final MVP 1 public demo gate
- Node: `v22.12.0`
- npm: `10.9.0`
- Backend package target: Node `20.x`

## 3. Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run env:check` | Pass with warning | Exit code 0. API health failed with `fetch failed`; non-blocking for MVP 1 local-first demo, blocking for full-stack claims. |
| `npm run typecheck` | Pass | `tsc --noEmit` completed successfully after the lint blocker fix. |
| `npm run lint` | Initially failed, then pass | Fixed two small lint blockers in the local data migration prompt path. |
| `npm run test:run` | Pass | Vitest: 46 files passed, 190 tests passed. |
| `npm run build` | Pass | Vite production build completed successfully. |
| `MVP1_SMOKE_URL=http://127.0.0.1:5173 npm run smoke:mvp1` | Pass | Local dev server smoke passed using controlled seed fallback after signed-out CTA. |
| `MVP1_SMOKE_URL=http://127.0.0.1:5173 MVP1_SMOKE_FULL_UI=true npm run smoke:mvp1` | Pass | Full UI path passed: Dashboard -> Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility -> 12-week setup -> 12-week system. |
| `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1` | Fail | Production URL is stale/not demo-safe; dashboard lacks local-first CTA and still asks user to sign up first. |

Notes:

- Local dev server was started with `VITE_APP_MODE=demo` and `VITE_BILLING_PROVIDER_MODE=mock_provider`.
- `http://localhost:5173` timed out in the shell probe, but `http://127.0.0.1:5173` responded with HTTP 200 and was used for local smoke.
- Backend checks were not rerun in this final MVP 1 gate because backend is explicitly not required for MVP 1 public demo. Earlier release status already records backend typecheck/build passing for that check window.

## 4. Status By MVP 1 Area

| Area | Status | Release judgment |
| --- | --- | --- |
| Core local-first user flow | Pass locally, fail on current production URL | Full UI smoke passes locally. Production must be redeployed before sharing. |
| Dashboard signed-out demo flow | Pass locally, fail on current production URL | Local candidate has signed-out demo CTA. Current production still shows signup-first copy. |
| 12-week setup | Pass locally | Full UI smoke creates a plan and reaches `/12-week-system`. |
| 12-week system Today tab | Pass locally | Smoke verifies useful Today content, task toggle, and local persistence. |
| Weekly review | Acceptable with manual check required | Smoke opens Week tab. Full weekly review submission should still be manually verified before broad public sharing. |
| Progress tab | Acceptable with manual check required | Smoke verifies Progress route; automation used direct URL fallback when tab click did not switch. Tester should manually click the tab. |
| Mock billing / mock checkout | Acceptable | Full test suite includes monetization/billing tests. Public copy now says mock/local and no real charge. Manual checkout should still be included in final tester pass. |
| Analytics privacy | Acceptable | Analytics tests pass. Demo env should keep `VITE_ANALYTICS_MODE=off` unless GA4 is separately verified. |
| Local data reset/export | Acceptable with manual check required | No release-gate failure found. Tester should verify reset/export in final manual smoke. |
| Service worker/cache/rollback | Acceptable with rollout discipline | Checklist has hard refresh, unregister service worker, clear site data, and rollback verification steps. Production stale state reinforces this requirement. |
| Mobile UX risk | Acceptable with manual check required | Full UI smoke passes desktop automation. Mobile viewport check remains required before broad public sharing. |
| Backend not required for MVP 1 | Pass | API health warning is not a demo blocker. Do not promise full-stack sync. |

## 5. Blockers Before Public Release

### P0 - Current production URL is stale/not demo-safe

- Affected URL: `https://vision-board-web-platform.vercel.app`
- Evidence: `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1` failed on the signed-out dashboard.
- Observed production copy still says:
  - `Đăng ký miễn phí để lưu`
  - `Tôi đã có tài khoản`
  - `Đăng ký để lưu và đồng bộ dữ liệu`
  - `Tạo tài khoản trước khi nhập dữ liệu thật`
- Required fix:
  1. Deploy or promote the latest repo candidate.
  2. Confirm Vercel env remains demo-safe:
     - `VITE_APP_MODE=demo`
     - `VITE_BILLING_PROVIDER_MODE=mock_provider`
     - `VITE_ANALYTICS_MODE=off` unless GA4 has been verified.
  3. Clear service worker/cache if the old UI remains visible.
  4. Rerun `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1`.

No source-code blocker remains from the local release gate after the lint fixes.

## 6. Known Limitations Acceptable For Public Demo

- Data is stored locally in the current browser/device.
- Clearing browser storage can remove demo progress.
- Login is optional and should not be required for the MVP 1 core flow.
- Cloud sync is not complete and must not be promised.
- Backend health is not required for MVP 1 demo mode.
- Mock checkout does not charge real money.
- Plus unlock is local/mock, not a real paid subscription.
- There is no production billing webhook or server-side entitlement authority.
- Production email/push reminder delivery is not guaranteed.
- Weekly review submission and reset/export should receive one final manual check before broad public sharing.
- Mobile viewport still needs a human smoke pass even though step scroll/focus tests and desktop smoke pass.

## 7. What Not To Promise Publicly

Do not promise:

- Complete cloud sync.
- Real payment.
- Multi-device saved data.
- Production billing.
- Server-side entitlement authority.
- Account recovery for local demo data.
- Durable persistence after browser data is cleared.
- Production reminders or push/email delivery.
- A real `PRO` public plan.

Safe promise:

- A local-first public demo that validates the 12-week execution loop on the current browser/device.

## 8. Manual Smoke Path For Tester

Run in a fresh browser profile, or after unregistering service worker and clearing site data.

1. Open `/`.
2. Confirm signed-out dashboard does not force login and shows local-first demo CTA.
3. Start onboarding.
4. Complete Life Balance.
5. Continue to Life Insight.
6. Create SMART goal.
7. Complete Feasibility Check.
8. Create 12-week plan.
9. Confirm redirect to `/12-week-system`.
10. Confirm Today tab answers what to do next.
11. Complete one Today task.
12. Save daily check-in.
13. Click Week tab and submit or preview weekly review.
14. Click Progress tab and confirm progress changed.
15. Open mock paywall or billing page.
16. Start Plus mock checkout.
17. Confirm checkout page says no real money is charged.
18. Complete mock checkout and confirm local Plus unlock.
19. Refresh and confirm local plan/task/check-in state remains.
20. Repeat the key path on a mobile viewport.

## 9. Rollback Checklist

Before release:

- Record the candidate commit and Vercel deployment URL.
- Keep the previous known-good Vercel deployment available.
- Confirm production env is demo-safe.

If production is broken:

1. Promote the previous known-good Vercel deployment.
2. Reconfirm:
   - `VITE_APP_MODE=demo`
   - `VITE_BILLING_PROVIDER_MODE=mock_provider`
   - `VITE_ANALYTICS_MODE=off`
3. Ask testers to hard refresh.
4. If old UI persists, unregister the service worker.
5. Clear site data when validating rollback.
6. Reopen `/`, `/12-week-system`, and `/billing/mock-checkout?session=invalid`.
7. Rerun `MVP1_SMOKE_URL=<production-url> npm run smoke:mvp1`.

If backend is down:

- Keep frontend in demo mode.
- Do not block MVP 1 local-first demo on backend health.
- Do not claim cloud sync until full-stack env and backend health pass.

## 10. Related Release Docs

- `guidelines/MVP_1_SCOPE.md`
- `guidelines/MVP_1_RELEASE_CHECKLIST.md`
- `guidelines/MVP_1_RELEASE_STATUS.md`
- `guidelines/MVP_1_RELEASE_NOTES.md`
- `guidelines/MVP_1_QA_REPORT.md`
- `guidelines/TECH_DEBT_REGISTER.md`

## 11. Next Recommended Prompt / Task

Recommended next task:

```text
Deploy or promote the latest MVP 1 frontend candidate to Vercel in demo-safe mode, then run production smoke with MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1. If it fails, inspect whether Vercel env, service worker cache, or stale deployment is responsible. Do not add features or change MVP 1 scope.
```

Release can move from **NO-GO** to **GO WITH KNOWN LIMITATIONS** only after the production URL shows the local-first signed-out dashboard and `smoke:mvp1` passes against that URL.
