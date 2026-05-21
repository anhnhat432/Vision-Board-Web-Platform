# Current Project Status

Last reviewed: 2026-05-21

Purpose: this file records the current code-backed state of Vision Board Web Platform so humans and AI coding agents do not assume features are more complete than they are.

## 1. Project summary

Vision Board Web Platform is a React/Vite full-stack web app for turning a broad life vision into SMART goals and a 12-week execution system.

The current product is local-first. Most user-facing data is still persisted in browser localStorage first. The backend exists and is used for authenticated sync in the 12-week planning domain, but it is not yet the single source of truth for the whole product.

Important documentation nuance:

- `README.md` correctly describes the product as full-stack, but the current architecture is still local-first with selective backend sync.
- `.env.production` in repo is set to `VITE_APP_MODE=real` and `VITE_BILLING_PROVIDER_MODE=api_contract`. Vercel project-level env vars still win at build time, so the live deployment mode depends on those overrides. The MVP 1 demo override path is preserved through the rollback steps in `MVP_1_RELEASE_CHECKLIST.md`.
- `backend/package.json` requires Node `20.x`; some local and CI commands may use Node 22 and can show engine warnings.
- 12-week setup route replacement is **Full GO** as of 2026-05-21. Current route behavior: `/12-week-setup` is the primary new setup flow, `/12-week-setup-old` is temporary rollback/reference, and `/12-week-setup-lab` is temporary QA/reference. Route cleanup is a future follow-up, not immediate work.

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

- `/12-week-setup` now renders `TwelveWeekSetupLab` as the primary setup flow under the Full GO route replacement.
- `/12-week-setup-old` keeps the previous `TwelveWeekSetup` implementation temporarily for rollback/reference.
- `/12-week-setup-lab` keeps the same `TwelveWeekSetupLab` flow temporarily for QA/reference.
- Route cleanup for the temporary old/lab routes is a future follow-up, not immediate work.
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
- 12-week plan setup with route replacement at Full GO: `/12-week-setup` is the primary new setup flow, `/12-week-setup-old` is temporary rollback/reference, and `/12-week-setup-lab` is temporary QA/reference.
- 12-week execution system with today/week/progress/settings style areas.
- Local-first goals, progress, reviews, achievements, reminders, and app preferences.
- Auth-scoped local data handling.
- Paywall UI, pricing-plan concepts, entitlements, mock checkout, and monetization events.
- Real Plus upgrade routing to the VietQR Casso checkout page when the billing provider mode is `api_contract` and the backend returns a `casso` provider session.
- Login page behavior for configured and unconfigured Firebase.
- Production smoke e2e workflow configuration.
- Automatic 12-week cloud sync mounted in `RootLayout` via `useAutoCloudSync` and `AutoCloudSyncProvider`. Triggers cover initial app load, login transitions, periodic interval, tab visibility regain, network reconnect, and post-mutation debounced drain. Real mode + signed-in + API configured + feature flags on are required; demo mode and signed-out users skip every trigger.
- Global auto-sync conflict dialog (`AutoCloudConflictDialog`) that surfaces when the merge report flags conflict or unsafe overwrite. Offers keep-local, use-cloud (with backup snapshot first), or postpone, and links to Settings for full detail.
- Header `SyncStatusPill` in the account dropdown showing live sync state (synced relative time, syncing, offline, pending count, conflict).
- First-login cloud restore toast (`FirstLoginRestoreToast`) that fires once when the user signs in on a fresh device and the cloud workspace is applied to empty local storage.

Implemented in backend:

- Express app with health check.
- Firebase Admin auth middleware.
- Mongo/Mongoose models and route groups for the planning domain.
- Goal, plan, week, task, metric, auth/profile, order, and vision-board route surfaces.
- Backend check script through `npm --prefix backend run check`.

Implemented tests:

- There are 120+ frontend/backend-adjacent test files under `src` covering 1,200+ tests as of 2026-05-10.
- Coverage includes local storage, auth scoping, onboarding, dashboard fresh state, life balance/insight, SMART goal helpers, feasibility scoring, 12-week setup sync, 12-week execution sync, monetization flows, protected routes, authenticated core flow, automatic cloud sync triggers, conflict dialog, sync status pill, and first-login restore toast.
- Production smoke e2e exists in `.github/workflows/production-smoke-e2e.yml` and runs `npm run smoke:prod` with required GitHub secrets.

## 6. What is mock/demo only

These areas should not be described as fully production-ready:

- Demo mode does not require Firebase, backend, MongoDB, or real billing.
- `.env.production` in repo now points at real mode, but Vercel/Render dashboard env overrides decide the actual deployed mode at build time.
- Mock checkout is still used when the billing provider mode is `mock_provider`. Real Casso/VietQR routing only kicks in when the frontend env is `api_contract` and the backend returns a `casso` provider session.
- Local analytics/outbox is not the same as a durable server-side analytics pipeline.
- Many product areas still rely on browser localStorage as the primary source of truth.
- Some backend route surfaces exist before the whole product has been migrated to backend-first data ownership.
- Production smoke e2e depends on repository secrets and the deployed environment being configured correctly.
- `/billing/plan` payment-history hydration timeout remains a separate ops follow-up in `docs/ops/billing-plan-smoke-timeout-follow-up.md`; it is not a 12-week setup blocker and does not prove paid subscription readiness.

## 7. What is not implemented yet

Not fully implemented or not proven production-ready:

- Full backend-as-source-of-truth for every product area.
- Field-complete round-trip restore for plan setup metadata, lead metric history logs, and tombstones; the auto-sync path applies the supported subset only.
- Paid subscription is not claimed live for production users. A small Casso/VietQR smoke transaction passed on 2026-05-10, but provider/billing readiness still needs production monitoring, support operations, and the separate `/billing/plan` smoke-timeout follow-up.
- Complete production analytics pipeline with verified GA4 setup.
- Full account lifecycle features such as export, delete account, and server-side data cleanup.
- End-to-end monitoring, alerting, and error reporting for production incidents.
- Backend tests that cover every controller/service path.
- Security hardening beyond the current Firebase token guard, helmet, and rate limiter middleware.

## 8. Known risks

- LocalStorage is device/browser-specific. Users can lose data if browser storage is cleared.
- Backend sync is best-effort. Local flow should not fail when sync fails, but failed sync may leave backend data incomplete.
- If Vercel is switched to `VITE_APP_MODE=real` without Firebase env vars, auth/backend sync will not be ready. The app should guard this, but deployment will be misleading.
- Backend local/full-stack mode requires MongoDB and Firebase Admin env vars.
- `node scripts/check-runtime-env.mjs --full-stack` expects real mode and a reachable API health endpoint unless health is skipped.
- Backend package requires Node `20.x`; using Node 22 can produce engine warnings.
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
- Extend auto-sync coverage to lead metric log history, tombstones, and field-complete plan setup metadata.

P2:

- Add account data export and delete-account flow.
- Add server-side analytics or verified GA4 setup.
- Improve production smoke coverage for real authenticated sync.
- Add documentation for exact deployment ownership across Vercel, Render, Firebase, and MongoDB.
- Review dependency audit warnings and Node version alignment before public launch.
