# Current Project Status

Last reviewed: 2026-06-27

Purpose: this file records the current code-backed state of Vision Board Web Platform so humans and AI coding agents do not assume features are more complete than they are.

## 1. Project summary

Vision Board Web Platform is a React/Vite full-stack web app for turning a broad life vision into SMART goals and a 12-week execution system.

The current product is local-first. Most user-facing data is still persisted in browser localStorage first. The backend exists and is used for authenticated sync in the 12-week planning domain, but it is not yet the single source of truth for the whole product.

Important documentation nuance:

- `README.md` correctly describes the product as full-stack, but the current architecture is still local-first with selective backend sync.
- `.env.production` in repo is set to `VITE_APP_MODE=real` and `VITE_BILLING_PROVIDER_MODE=api_contract`. Vercel project-level env vars still win at build time, so the live deployment mode depends on those overrides. The MVP 1 demo override path is preserved through the rollback steps in `MVP_1_RELEASE_CHECKLIST.md`.
- `backend/package.json` requires Node `20.x`; GitHub release, CI, audit, backup, and staging/production proof workflows resolve Node from `.nvmrc` (`20`) to reduce engine drift. Local commands may still use a newer installed Node and can show engine warnings.
- 12-week setup route replacement is **Full GO** as of 2026-05-21. Current route behavior: `/12-week-setup` is the only setup route and renders `TwelveWeekSetupLab`. The `/12-week-setup-old` (legacy `TwelveWeekSetup`) and `/12-week-setup-lab` (QA reference) routes have been removed in 2026-05-22 cleanup; the legacy `12WeekSetup.tsx` page and its dedicated backend-sync test have also been deleted. The barrel re-export `src/app/pages/12WeekSetup.ts` now aliases `TwelveWeekSetup` to the current `TwelveWeekSetupLab` implementation so existing tests and app-flow helpers continue to work.

## 2. Core user flow

The intended core flow is:

`Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review`

The product should stay focused on this flow. Do not expand scope before the core loop is stable and easy to use.

## 3. Tech stack

Frontend:

- React 18
- Vite 6
- TypeScript
- React Router
- Tailwind CSS and existing component styles
- Radix UI primitives
- Vitest for unit/integration-style tests
- Biome for linting
- Firebase client SDK for optional auth

Backend:

- Express
- TypeScript
- MongoDB/Mongoose
- Firebase Admin for bearer-token verification
- Node engine target: `20.x`

Deployment and CI:

- Vercel for the frontend SPA
- Render config for the backend service
- GitHub Actions production smoke e2e workflow on `main`, scheduled runs, and manual dispatch

## 4. Current architecture

Frontend app:

- SPA entry is routed through Vite and React Router.
- `vercel.json` rewrites all routes to `index.html`, so direct refresh on SPA routes should work.
- App data is persisted through `src/app/utils/storage.ts` and related storage helpers.
- Storage is auth-scoped:
  - anonymous data key
  - authenticated-owner marker
  - per-user authenticated key
- Current storage schema version is tracked in code and includes migration/normalization helpers.

12-week planning:

- `/12-week-setup` renders `TwelveWeekSetupLab` (the only remaining setup flow after 2026-05-22 cleanup).
- The previous `/12-week-setup-old` and `/12-week-setup-lab` routes and the legacy `TwelveWeekSetup` component have been removed.
- The setup flow creates the local goal and local `twelveWeekSystem` first.
- Backend sync is conditional and best-effort:
  - app must not be in demo mode
  - Firebase/auth must be configured
  - user must be logged in
  - auth/profile loading must be finished
  - user profile must be available
- After local save, backend sync creates a backend goal, syncs the plan, saves local-to-backend links, then updates the backend goal with the backend plan id.
- `src/features/plan12week/hooks/usePlanSetupSync.ts` accepts local and backend goal ids. It stores plan link details by local goal id, while using backend goal id for the backend plan when available.
- `src/features/plan12week/hooks/usePlanExecutionSync.ts` handles best-effort sync for execution actions such as task toggles, daily check-ins, weekly reviews, and plan snapshots.
- `src/features/plan12week/persistence/planLinkStore.ts` stores backend plan/week/metric/task mapping in localStorage.
- `src/lib/api/goalLinkStore.ts` stores local goal id to backend goal id mapping in localStorage.

Backend API:

- `/api/health` is public.
- Most routes are protected by Firebase bearer auth middleware.
- Protected route groups include auth/profile, goals, orders, plans, weeks, tasks, metrics, and vision boards.
- `src/lib/api/apiClient.ts` attaches a Firebase ID token when available and dispatches an unauthorized event on 401.

Auth:

- Firebase client config is optional.
- If the required Firebase client env vars are missing, auth is disabled and the login page should show the existing "Firebase not configured" notice.
- Backend auth depends on Firebase Admin env vars and a valid Firebase token from the frontend.

Billing/paywall:

- Billing is abstracted through frontend helpers.
- Current supported modes are local/mock/API-contract style modes.
- Mock checkout state is stored locally.
- API-contract endpoints can be configured through env vars, but a real payment-provider integration is not fully owned by this repo yet.

Analytics:

- App events are stored locally in `eventLog` when local analytics preference is enabled.
- A local `syncOutbox` is maintained for pending analytics/outbox items.
- Monetization analytics can push to `window.dataLayer` and `window.gtag` when analytics mode is not `off`.
- There is no guarantee that production GA4 is fully wired unless the hosting page/env actually provides the needed script and measurement setup.

## 5. What is implemented

Implemented in the frontend:

- Onboarding and new-user guidance.
- Life balance assessment.
- Life insight flow.
- SMART goal setup helpers.
- Feasibility scoring logic and tests.
- 12-week plan setup with route replacement at Full GO: `/12-week-setup` is the primary and only remaining setup flow. `/12-week-setup-old` and `/12-week-setup-lab` have been removed.
- 12-week execution system with today/week/progress/settings style areas.
- Local-first goals, progress, reviews, achievements, reminders, and app preferences.
- Auth-scoped local data handling.
- Paywall UI, pricing-plan concepts, entitlements, mock checkout, and monetization events.
- Real Plus upgrade routing to the VietQR Casso checkout page when the billing provider mode is `api_contract` and the backend returns a `casso` provider session.
- Login page behavior for configured and unconfigured Firebase.
- `AuthProvider` now captures final frontend profile-bootstrap failures with safe monitoring context (`status`, `timedOut`, `recoverable`, cache-fallback availability, attempt count) without sending raw UID/email/profile payload.
- Settings account lifecycle actions for signed-in real-mode users: account export download and two-step delete-account flow with backend-first deletion and local cleanup only after success.
- Production smoke e2e workflow configuration.
- Automatic 12-week cloud sync mounted in `RootLayout` via `useAutoCloudSync` and `AutoCloudSyncProvider`. Triggers cover initial app load, login transitions, periodic interval, tab visibility regain, network reconnect, and post-mutation debounced drain. Real mode + signed-in + API configured + feature flags on are required; demo mode and signed-out users skip every trigger.
- Auto cloud sync now captures frontend monitoring for failed full-sync and drain-only results with safe metadata, while excluding raw owner UID, email, mutation payload, and pulled workspace data.
- Global auto-sync conflict dialog (`AutoCloudConflictDialog`) that surfaces when the merge report flags conflict or unsafe overwrite. Offers keep-local, use-cloud (with backup snapshot first), or postpone, and links to Settings for full detail.
- Header `SyncStatusPill` in the account dropdown showing live sync state (synced relative time, syncing, offline, pending count, conflict).
- First-login cloud restore toast (`FirstLoginRestoreToast`) that fires once when the user signs in on a fresh device and the cloud workspace is applied to empty local storage.

Implemented in backend:

- Express app with health check.
- Firebase Admin auth middleware.
- Mongo/Mongoose models and route groups for the planning domain.
- Goal, plan, week, task, metric, auth/profile, order, and vision-board route surfaces.
- Account export and delete endpoints at `/api/account/export` and `/api/account/delete`. Account deletion removes app data, calls Firebase Admin user deletion, treats `auth/user-not-found` as idempotent, and returns an error when Firebase deletion fails so frontend local cleanup does not run on incomplete account deletion.
- Backend check script through `npm --prefix backend run check`.

Implemented tests:

- There are 120+ frontend/backend-adjacent test files under `src` covering 1,200+ tests as of 2026-05-10.
- Coverage includes local storage, auth scoping, onboarding, dashboard fresh state, life balance/insight, SMART goal helpers, feasibility scoring, 12-week setup sync, 12-week execution sync, monetization flows, protected routes, authenticated core flow, automatic cloud sync triggers, conflict dialog, sync status pill, first-login restore toast, settings account export/delete flows, and backend account delete Firebase Admin success/failure handling.
- Production smoke e2e exists in `.github/workflows/production-smoke-e2e.yml`, auto-runs on `main` push plus scheduled/manual triggers, waits for the matching Vercel production deployment on push, then runs `npm run smoke:prod:quick` before `npm run smoke:prod` with required GitHub secrets.
- Production smoke workflow/runbook fixed-secret contract is limited to `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`; generated-account signup remains an explicit `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` opt-in, not a separate secret pair.
- Latest default-branch production smoke evidence on 2026-06-26 is failing, not pending: GitHub Actions run `28218523067` failed at `12-week save, reload, and backend sync` before billing checks because the full smoke waited for hidden `[data-testid="wam-section-score"]` on `/12-week-system?tab=week`. Local staged mitigation in `scripts/smoke-production-e2e.mjs` now opens the weekly-review flow before waiting on visible review UI, but this still needs a successful run after the change reaches `main`.
- Local production-core verification passed on 2026-06-26 both as focused groups and as the full `npm.cmd run test:production-core` command. It was re-verified locally on 2026-06-27 with the current full aggregate counts after guard tightening: ops (37 tests), unit (40 tests), UI (102 tests), sync (152 tests), slow 12-week write-safety (5 tests), backend billing (56 tests), backend account lifecycle (4 tests), and backend sync (23 tests). The 2026-06-27 guard-tightening batches added `src/lib/auth/firebase.test.ts`, `src/app/components/UpgradePaywallDialog.unverified.test.tsx`, `src/app/utils/production/outboxSync.test.ts`, `src/app/utils/storage-billing-ops.gracePeriod.test.ts`, `src/app/pages/billing-paid-checkout-disabled.test.tsx`, `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`, `src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts`, `src/features/plan12week/persistence/roundTripSync.test.ts`, `src/features/plan12week/persistence/twelveWeekImportPayload.test.ts`, `src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts`, `src/features/plan12week/hooks/usePlanSetupSync.test.tsx`, `backend/src/tests/routeIntegration.test.ts`, `scripts/check-github-workflow-readiness.test.mjs`, `scripts/check-production-smoke-run-readiness.test.mjs`, and `scripts/check-launch-proof-readiness.test.mjs` to `test:production-core`, so signup verification email/cooldown, unverified checkout blocking, email-unverified outbox pause, Plus grace-period entitlement safety, paid-checkout kill-switch UI, field-complete 12-week pull/apply/merge/manual-sync recovery, backend 12-week route happy-path/conflict contracts, default-branch proof-workflow availability, latest production-smoke run status, staged-but-unpublished production-smoke mitigation detection, and aggregate launch proof readiness now fail fast in the aggregate guard. Frontend lint/typecheck/build and backend typecheck/build also passed earlier in the same verification batch. This proves the repository guard set locally but does not replace deployed staging/production proof.
- After the readiness-doc cleanup and blocker-summary tightening on 2026-06-27, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` were rerun locally and all passed again; the frontend build still reports chunk-size warnings only, not build errors.
- Billing UI monitoring now keeps error triage metadata safe by replacing raw order ids and exact amounts with `hasOrderId` and coarse `amountBand` fields in frontend monitoring context.
- Checkout return polling now captures a safe billing monitoring event when server entitlement sync exhausts retries without confirming a non-free plan; the UI stays pending and does not unlock Plus optimistically.
- Full production smoke now accepts the active paid-checkout kill-switch as a valid production-safe billing state only after verifying `/billing/confirm` also renders `paid-checkout-disabled-banner` and does not leak checkout-session POSTs.
- Account-delete staging workflow exists in `.github/workflows/account-delete-e2e-staging.yml` and runs `npm run test:e2e:account-delete` manually with an explicit `DELETE_TEST_ACCOUNT` input, disposable `ACCOUNT_DELETE_E2E_*` secrets, and a non-local staging/preview target URL.
- Email-verification staging workflow exists in `.github/workflows/email-verification-e2e-staging.yml` and runs `npm run test:e2e:email-verification` manually with an explicit `CREATE_TEST_ACCOUNT` input and optional disposable `EMAIL_VERIFICATION_E2E_*` secrets.
- Email-verification fixed staging credentials must be configured as a complete `EMAIL_VERIFICATION_E2E_EMAIL` / `EMAIL_VERIFICATION_E2E_PASSWORD` pair or omitted so the generated disposable signup path is used.
- LWW staging workflow exists in `.github/workflows/lww-e2e-staging.yml` and runs `npm run test:e2e:lww` manually against a provided non-local staging/preview URL with required `allow_overwrite=OVERWRITE_TEST_WORKSPACE`, `LWW_E2E_EMAIL`, and `LWW_E2E_PASSWORD`. The email must use a dedicated overwrite-safe marker such as `+lww`.
- Local core-funnel quality preflight exists as `npm run smoke:core-quality`. It verifies SMART goal quality, feasibility recommendation, 12-week plan shape, Today execution, daily check-in, weekly review, and Progress trend on a local dev server without backend/Firebase/payment. It was re-verified locally on 2026-06-27 against `http://127.0.0.1:4173` after the current guard-tightening batch, and the smoke passed through Today, daily check-in, weekly review, Progress, and browser-error scan.
- Deployed core-funnel proof workflow now exists at `.github/workflows/core-funnel-quality-staging.yml`. It runs the same `npm run smoke:core-quality` script against a supplied staging/preview URL and rejects `localhost` / `127.0.0.1` so D-2 proof cannot be filled with local-only targets. The shared `scripts/smoke-core-quality.mjs` also refuses missing/local `CORE_QUALITY_URL` when `GITHUB_ACTIONS=true`, so workflow drift cannot silently fall back to localhost.
- `guidelines/SOFT_LAUNCH_CHECKLIST.md` has a D-2 proof ledger that must be filled with target URL, commit SHA, evidence URL / command, and `pass` status before D-1 go/no-go.
- `docs/ops/staging-proof-runbook.md` includes copyable `gh workflow run` commands and `gh run list` / `gh run view` evidence-capture commands for the proof ledger.
- `npm run proof:secrets` now performs the GitHub secret-name readiness audit locally without reading secret values and fails when required staging proof secrets are missing or partially configured.
- `npm run proof:workflows` now performs the GitHub default-branch workflow-availability audit locally without dispatching any workflow runs and fails when a required proof workflow is missing from or disabled on the default branch.
- `npm run proof:readiness` now runs the proof readiness audits in one command, continues after the first blocker, and prints a combined pass/blocked/error summary for secret names, default-branch workflow availability, latest production-smoke run status, and staged-but-unpublished production-smoke mitigation hints without reading secret values or dispatching workflows.
- GitHub secret-name audit was refreshed on 2026-06-27 after repository secret updates. `npm.cmd run proof:readiness` now reports `PROD_SMOKE_EMAIL`, `PROD_SMOKE_PASSWORD`, `ACCOUNT_DELETE_E2E_EMAIL`, `ACCOUNT_DELETE_E2E_PASSWORD`, `LWW_E2E_EMAIL`, and `LWW_E2E_PASSWORD` ready. `EMAIL_VERIFICATION_E2E_*` remains optional because the generated disposable signup path is still acceptable if staging Firebase allows signup. Secret values were not read.
- `npm.cmd run proof:secrets` was also rerun on 2026-06-27 and now passes with the same secret-name state: required production smoke, account-delete staging, and LWW staging secrets are configured, while email-verification fixed credentials remain optional under the generated-signup path.
- GitHub workflow-availability audit on 2026-06-27 found `.github/workflows/production-smoke-e2e.yml` available on default branch, while `.github/workflows/core-funnel-quality-staging.yml`, `.github/workflows/email-verification-e2e-staging.yml`, `.github/workflows/account-delete-e2e-staging.yml`, and `.github/workflows/lww-e2e-staging.yml` are present in the current staged worktree but not yet available on the default branch. `gh workflow list --limit 100` and `npm.cmd run proof:workflows` produced the same conclusion without dispatching a run.
- Production/staging proof workflows resolve Node from `.nvmrc` (`20`) instead of hard-coded Node 22 so launch evidence runs closer to the backend engine target.
- CI, npm audit, MongoDB backup, release, and proof workflows now share `.nvmrc` as the GitHub Actions Node source of truth.

## 6. What is mock/demo only

These areas should not be described as fully production-ready:

- Demo mode does not require Firebase, backend, MongoDB, or real billing.
- `.env.production` in repo now points at real mode, but Vercel/Render dashboard env overrides decide the actual deployed mode at build time.
- Mock checkout is still used when the billing provider mode is `mock_provider`. Real Casso/VietQR routing only kicks in when the frontend env is `api_contract` and the backend returns a `casso` provider session.
- Local analytics/outbox is not the same as a durable server-side analytics pipeline.
- Many product areas still rely on browser localStorage as the primary source of truth.
- Some backend route surfaces exist before the whole product has been migrated to backend-first data ownership.
- Production smoke e2e depends on repository secrets and the deployed environment being configured correctly.
- `/billing/plan` payment-history hydration has local hardening in place: the page exposes `data-payment-history-state`, signed-out real-mode users do not call protected history, signed-in requests time out into a retryable visible error before the smoke ceiling, and the quick production smoke waits on the stable marker. Live warmed/cold production smoke rerun is still pending in `docs/ops/billing-plan-smoke-timeout-follow-up.md`; this does not prove paid subscription readiness.

## 7. What is not implemented yet

Not fully implemented or not proven production-ready:

- Full backend-as-source-of-truth for every product area.
- Field-complete 12-week sync is improved for supported local shapes: plan setup metadata round-trips through import/pull/apply, tombstones are applied for local entity shapes, and backend lead metric logs are explicitly flagged as unsupported instead of being silently dropped because `TwelveWeekSystem` has no per-metric log entity yet.
- Paid subscription is not claimed live for production users. A small Casso/VietQR smoke transaction passed on 2026-05-10, but provider/billing readiness still needs production monitoring, support operations, Casso/webhook dashboard verification, and a live warmed/cold rerun of the hardened `/billing/plan` smoke.
- Complete production analytics pipeline with verified GA4 setup.
- End-to-end staging proof for account deletion now has an opt-in Playwright harness (`npm run test:e2e:account-delete`) and a manual GitHub Actions wrapper (`.github/workflows/account-delete-e2e-staging.yml`) with destructive safety guards in the current staged repo batch. It still needs both publication to default branch and an actual staging run before launch to confirm deployed auth/session behavior after delete; local backend route tests cover Firebase Admin deletion success, `auth/user-not-found`, and non-idempotent failure handling.
- End-to-end staging proof for signup email verification now has an opt-in Playwright harness (`npm run test:e2e:email-verification`) and a manual GitHub Actions wrapper (`.github/workflows/email-verification-e2e-staging.yml`) in the current staged repo batch. It still needs publication to default branch plus an actual staging run before launch to confirm deployed Firebase delivery and auth behavior.
- End-to-end staging proof for Last-Write-Wins sync now has both an opt-in Playwright harness (`npm run test:e2e:lww`) and a manual GitHub Actions wrapper (`.github/workflows/lww-e2e-staging.yml`) in the current staged repo batch. Both require explicit `OVERWRITE_TEST_WORKSPACE` opt-in and an overwrite-safe `+lww` style email before mutating cloud state, and they still need publication to default branch plus a real staging run before launch to prove deployed cross-device auth/session/network behavior.
- Account-delete and LWW staging proof are no longer blocked on missing GitHub repository secrets, but core-funnel, email-verification, account-delete, and LWW proof workflows are still not yet available on the default branch because the current staged batch has not been published; email-verification staging can still use generated disposable signup while fixed credentials remain optional; production smoke credentials are present but the latest default-branch run failed before completing the 12-week sync/billing proof.
- Manual core-flow launch evidence is still pending on a staging/production-like target. Local preflight passed on 2026-06-26 and was re-verified on 2026-06-27 with `CORE_QUALITY_URL=http://127.0.0.1:4173 npm run smoke:core-quality`, and `.github/workflows/core-funnel-quality-staging.yml` now exists in the current staged repo batch for the required deployed proof, but it is not yet available on the default branch and no real run evidence has been recorded yet.
- Email verification is now linked to sync trust locally: when pending outbox sync is blocked because the user email is unverified, the outbox snapshot records `email_unverified`, pending local outbox items remain pending, the persistent email verification banner and header `SyncStatusPill` can show a sync-specific reason from the `email-verification:required` event, and Settings account-sync shows that cloud sync is paused while local data remains safe.
- End-to-end monitoring, alerting, and error reporting for production incidents.
- Backend tests that cover every controller/service path.
- Security hardening beyond the current Firebase token guard, helmet, and rate limiter middleware.

## 8. Known risks

- LocalStorage is device/browser-specific. Users can lose data if browser storage is cleared.
- Backend sync is best-effort. Local flow should not fail when sync fails, but failed sync may leave backend data incomplete.
- If Vercel is switched to `VITE_APP_MODE=real` without Firebase env vars, auth/backend sync will not be ready. The app should guard this, but deployment will be misleading.
- Backend local/full-stack mode requires MongoDB and Firebase Admin env vars.
- `node scripts/check-runtime-env.mjs --full-stack` expects real mode and a reachable API health endpoint unless health is skipped.
- Backend package requires Node `20.x`; local commands on machines with newer Node can still produce engine warnings.
- Existing docs may display mojibake in some Vietnamese text if opened with the wrong encoding.
- `npm ci` can report audit warnings from dependencies; review before production launch.
- The product has many UI surfaces. UX can regress if new work adds panels/features before simplifying the core flow.

## 9. Commands to run locally

Install:

```bash
npm ci
npm --prefix backend ci
```

Frontend demo mode:

```bash
npm run dev
```

Backend local API:

```bash
npm --prefix backend run dev
```

Frontend checks:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Backend checks:

```bash
npm --prefix backend run check
```

Runtime env checks:

```bash
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

Production smoke:

```bash
npm run smoke:prod
```

`npm run smoke:prod` requires `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` by default. Set `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` only for an explicit one-off generated QA signup run.

Minimum demo env:

```bash
VITE_APP_MODE=demo
VITE_ANALYTICS_MODE=off
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
```

Minimum real/full-stack frontend env:

```bash
VITE_APP_MODE=real
VITE_API_BASE_URL=https://your-backend.example.com/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Minimum backend env:

```bash
PORT=4000
MONGODB_URI=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=http://localhost:5173
```

## 10. MVP recommendation

The MVP should stay narrow:

1. Make the core flow fast, understandable, and calm.
2. Keep demo mode stable for public demos and portfolio usage.
3. Make real mode reliable only for the core 12-week planning/execution loop before expanding backend sync.
4. Avoid adding new product modules until onboarding, SMART goal setup, feasibility, 12-week execution, and weekly review feel simple on mobile and desktop.
5. Do not sell paid functionality until billing, entitlement authority, and account recovery/export are production-safe.

Recommended MVP promise:

- Users can define a meaningful goal.
- The app turns it into a practical 12-week plan.
- Users can execute weekly/daily actions.
- Progress survives local reloads.
- Authenticated users can sync the 12-week plan when real mode is correctly configured.

## 11. Priority backlog

P0:

- Keep the 12-week setup and execution loop stable.
- Preserve local-first fallback whenever backend sync fails.
- Keep demo mode independent from Firebase/backend.
- Ensure Vercel real mode is only enabled with full Firebase and API env.

P1:

- Add backend tests for goal/plan/week/task/metric controller paths.
- Simplify crowded desktop and mobile layouts in the core flow.
- Add clearer production monitoring around failed sync and auth/profile bootstrap.
- Decide whether backend lead metric logs need a local entity shape/migration, or remain merge-report-only cloud evidence while daily check-ins and weekly reviews stay the local execution history source.

P2:

- Add server-side analytics or verified GA4 setup.
- Improve production smoke coverage for real authenticated sync.
- Add documentation for exact deployment ownership across Vercel, Render, Firebase, and MongoDB.
- Review dependency audit warnings and Node version alignment before public launch.
