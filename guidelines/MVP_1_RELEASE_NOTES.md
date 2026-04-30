# MVP 1 Release Notes

## 1. Release Name / Version

Release name: MVP 1 Public Demo - Local-first 12-week execution loop

Version: `mvp1-public-demo-v0.1`

Release notes date: 2026-04-30

Release type: public demo, not a full production SaaS release.

## 2. What This Demo Does

This demo lets a first-time visitor turn a broad life priority into a practical 12-week execution system.

The intended validation is narrow:

- Can a user understand the core flow without coaching from the team?
- Can they create a usable 12-week plan?
- Can they see what to do today?
- Can they complete tasks, save a daily check-in, review the week, and see progress?
- Can the local-first experience work before login, cloud sync, or real billing?

MVP 1 is primarily a local-first product demo for the 12-week execution loop. It is not a launch of real payments, complete account recovery, or guaranteed multi-device sync.

## 3. Core User Flow

Primary flow:

1. Open the app.
2. Start the demo from the dashboard or onboarding CTA.
3. Complete onboarding and Life Balance.
4. Review Life Insight and choose a focus area.
5. Write a SMART goal.
6. Complete the feasibility check.
7. Create a 12-week plan.
8. Land in `/12-week-system`.
9. Use the Today tab to see immediate tasks.
10. Complete a task.
11. Save a daily check-in.
12. Open the Week tab and complete or preview a weekly review.
13. Open Progress and confirm the cycle status updates.
14. Try a premium teaser and complete mock upgrade if desired.

The user should be able to do this without signing in.

## 4. What Works

The public demo supports:

- Signed-out entry into the MVP 1 core flow.
- Onboarding / Life Balance.
- Life Insight focus selection.
- SMART goal setup.
- Feasibility check.
- 12-week setup with 2-4 recurring tactics.
- Free template path.
- Premium template teaser.
- Today tab in the 12-week system.
- Local task completion.
- Local daily check-in.
- Weekly review.
- Reflection entry from weekly review.
- Progress tab.
- Settings/local demo controls.
- Optional no-login feedback dialog with browser-local raw feedback storage.
- Mock paywall.
- Mock checkout.
- Local Plus entitlement unlock.
- Refresh persistence on the same browser/device.

Release-candidate status from 2026-04-29:

- Frontend typecheck, lint, tests, and build passed.
- Backend typecheck and build passed.
- `npm run env:check` passed with a backend health warning because the API was not reachable in that check.

## 5. What Is Intentionally Local / Mock

Data persistence:

- Demo data is stored in the current browser/device using local storage.
- Raw feedback submitted from the demo is stored locally on the current browser/device; analytics only receives safe metadata such as rating, category, and text length.
- Refreshing the page should keep the plan on the same browser/device.
- Clearing browser/site data can remove demo progress.
- The demo should not be presented as durable account-level storage.

Auth and sync:

- Login is optional for MVP 1.
- Firebase and backend are not required for the public demo path.
- Full cloud sync is not the MVP 1 promise.
- Backend sync is an optional later layer and requires real-mode environment configuration.

Billing:

- Upgrade is a mock flow.
- Mock checkout does not charge real money.
- Local Plus unlock is a demo entitlement on the current browser/device.
- There is no production payment webhook or server-side entitlement authority in MVP 1.

## 6. Known Limitations

- Data is browser/device-local.
- Clearing local storage can delete demo progress.
- A different browser, profile, or device will not automatically have the same plan.
- Login/cloud sync is not the focus of MVP 1.
- Real payment is not enabled.
- Mock upgrade is only a simulation.
- Plus entitlement in MVP 1 is local/mock, not a real paid subscription.
- Push/email reminders are not production-guaranteed.
- Backend health was not verified in the release status check because the API health request failed.
- The product is web-only; there is no native mobile app.
- Vision board, achievements, admin orders, advanced analytics, and full account sync are not the public demo promise.

## 7. How To Test

Recommended local checks:

```bash
npm run env:check
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run smoke:mvp1
```

Backend checks, when backend changes are included:

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run test
```

Production smoke:

```bash
npm run smoke:prod
```

Manual QA path:

1. Open `/` in a fresh browser profile.
2. Confirm login is not required.
3. Start onboarding.
4. Complete Life Balance.
5. Continue through Life Insight, SMART Goal, and Feasibility Check.
6. Create a 12-week plan.
7. Confirm `/12-week-system` opens.
8. Confirm Today has useful tasks.
9. Complete one task.
10. Save daily check-in.
11. Open Week and submit or preview weekly review.
12. Open Progress and confirm progress changed.
13. Try mock upgrade.
14. Confirm the checkout says it is simulated and does not charge real money.
15. Refresh and confirm local plan data remains on the same browser/device.
16. Repeat the key path on a mobile viewport.

## 8. How To Roll Back

Preferred rollback:

1. In Vercel, promote the previous known-good frontend deployment.
2. Confirm production env is demo-safe:
   - `VITE_APP_MODE=demo`
   - `VITE_BILLING_PROVIDER_MODE=mock_provider`
   - `VITE_ANALYTICS_MODE=off` unless verified
3. Re-run `npm run smoke:prod`.
4. Ask testers to hard refresh if stale assets remain.
5. If stale UI persists, unregister the service worker or clear site data.

If backend is down:

- Keep the frontend in demo mode.
- Do not block MVP 1 public demo on backend health.
- Fix backend separately before claiming full-stack sync.

If mock checkout breaks:

- Keep the free 12-week execution path available.
- De-emphasize or hide upgrade CTAs until the mock checkout path is fixed.
- Roll back to the previous deployment if upgrade CTA errors affect the core flow.

## 9. What Not To Promise Publicly

Do not promise:

- Real billing or real paid subscription activation.
- Production payment provider integration.
- Server-side entitlement authority.
- Complete cloud sync.
- Cross-device account recovery.
- Guaranteed persistence after browser data is cleared.
- Production email or push reminders.
- Native mobile app.
- AI coaching or automated forecasting.
- A complete vision board product.
- A complete life management suite.
- Admin/order operations as part of the MVP 1 demo.

Safe public framing:

- "This is a local-first public demo."
- "Your demo data is saved on this browser/device."
- "Mock checkout does not charge real money."
- "Login and cloud sync are planned layers, not required for this demo."
- "The demo is meant to validate the 12-week execution loop."

## 10. Next Roadmap After MVP 1

Recommended next roadmap:

1. Run deployed MVP 1 smoke and mobile QA against the final production URL.
2. Fix any public-demo blockers found in the smoke path.
3. Add clearer local-to-account migration prompts for MVP 2.
4. Build account + cloud sync around explicit user consent, not automatic import.
5. Harden backend sync for plan/week/task/metric ownership and conflict handling.
6. Add reliable cloud recovery only after auth and migration UX are clear.
7. Decide whether billing should remain mock or move to a real provider integration.
8. Add production payment only with webhook, entitlement authority, and clear public copy.
9. Improve reminders/notifications after local execution loop retention is proven.
10. Revisit vision board, achievements, and advanced analytics only after the 12-week loop is stable.
