# Real Demo Boundary Spec

## 1. Context & Goal

- Feature / bug: production real mode must never silently downgrade into demo behavior or copy.
- Why now: app is launching to real users with billing/auth/sync expectations.
- User impact: production users see account-bound, provider-backed flows; demo users still get preview-safe behavior.
- Modes affected: both real and demo.

## 2. Surface Classification

- Type: Core
- Touched domains: app mode helpers, routes, copy, billing, sync, debug/admin/demo surfaces.
- Existing invariants that must not break: Vercel production uses VITE_APP_MODE=real; previews may use demo; mock billing routes remain demo-only.

## 3. Actors & Entry Points

- Primary actor: production visitor/user.
- Secondary actor(s): preview/demo visitor, developer, deployment owner.
- Route(s): all route registration, especially billing/mock-checkout and debug routes.
- API / hook / store touchpoints: isRealMode, isDemoMode, appRoutes, billing provider selection, sync guards.

## 4. Functional Requirements

1. WHEN VITE_APP_MODE is missing or malformed in production-bound builds, THE system SHALL not silently downgrade production to demo behavior.
2. WHERE a route is mock/demo-only, THE system SHALL register it only when demo mode allows it.
3. WHERE copy refers to trials, THE system SHALL use account-bound wording in real mode and browser/demo wording only in demo mode.
4. WHILE demo mode is active, THE system SHALL avoid protected backend sync and real payment assumptions.
5. WHEN real mode is active, THE system SHALL avoid mock checkout, mock unlock, and demo-only debug UIs even if debug env flags are accidentally enabled.
6. WHERE app routes are registered, THE system SHALL prove by recursive route-table test that demo-only billing/debug/seeder paths are statically omitted from production routes.
7. WHEN a production user opens a legacy demo-only billing URL directly, THE system SHALL route to a production-safe real-mode surface without rendering mock/demo checkout copy or the app error boundary.
8. WHEN real mode boots with missing or unsafe production-critical frontend env, THE system SHALL report a sanitized runtime readiness issue without exposing env values.
9. WHEN real-mode assistant API calls cannot find a configured backend API base URL, THE system SHALL fail fast with a configuration error instead of calling a localhost fallback.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none unless mode migration changes persisted flags.
- migration or normalization needed: no.
- backend models or API contracts touched: none by boundary doc alone.
- sync ordering guarantees: demo must not call protected sync; real requires auth readiness.
- rollback / restore concerns: mode changes are deployment/env changes, not user data migrations.

## 6. Non-functional Requirements

- performance / latency: mode checks must be cheap and deterministic.
- accessibility: mode-specific copy must remain readable and clear.
- observability / logging: missing real-mode env should be loud in production boot/deployment checks.
- security / privacy: no mock unlock or debug data in production user paths.

## 7. Out of Scope

- Removing demo mode.
- Changing deployment provider.
- Rewriting all marketing copy.

## 8. Acceptance Criteria

- [x] app routes do not expose mock checkout in real mode.
- [x] app route tests recursively reject demo-only billing/debug/seeder routes.
- [x] real-mode copy avoids browser-only trial wording.
- [x] billing provider honors production api_contract path.
- [x] sync guards prevent demo protected backend calls.
- [x] deployment checklist names VITE_APP_MODE=real as required for production.
- [x] runtime env checker treats missing/malformed VITE_APP_MODE as production-safe real fallback and flags malformed values in full-stack checks.
- [x] direct legacy demo-only billing URLs redirect to a safe real-mode surface without registering the demo route.
- [x] debug UI env flags only render debug panels in demo mode, never in real mode.
- [x] real-mode runtime boot reports missing or unsafe production-critical frontend env through sanitized console/monitoring evidence.
- [x] real-mode assistant chat and telemetry do not call localhost fallback when `VITE_API_BASE_URL` is missing.

## 9. Verification Plan

Focused automated evidence:

```bash
npm run test:run -- src/app/utils/app-mode.test.ts src/app/utils/production/billingCore.test.ts src/test/ux-ui-upgrade/property-8-demo-copy.test.ts
npm run test:run -- src/app/utils/production-runtime-env.test.ts
npm run test:run -- src/app/features/assistant/__tests__/assistantApi.test.ts src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts
npm run test:ui -- src/app/routes.test.tsx src/test/ux-ui-upgrade/destructive-dialog-realmode-gating.test.tsx
npm run test:sync -- src/features/plan12week/persistence/mutationQueueOffline.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts
npx vitest run scripts/check-runtime-env.test.mjs
npm run typecheck
npm run build
```

Manual/deployment evidence still required before launch:

```bash
npm run smoke:prod:quick
npm run smoke:prod
```

## 10. Batch Evidence - 2026-06-25

- App mode fallback verified by `src/app/utils/app-mode.test.ts`: malformed or missing `VITE_APP_MODE` resolves to `real`, not `demo`.
- Real/demo billing and copy boundary verified by `src/app/utils/production/billingCore.test.ts` and `src/test/ux-ui-upgrade/property-8-demo-copy.test.ts`: demo keeps mock-provider-safe behavior, real-mode copy avoids browser-only trial wording, and production billing path stays aligned with `api_contract`.
- Recursive route exclusion verified by `src/app/routes.test.tsx`: route table resolves expected real-mode routes and rejects demo-only billing/debug/seeder patterns from production registration.
- Deployed smoke now probes the direct mock-checkout URL in real mode: `scripts/smoke-production-quick.mjs` and `scripts/smoke-production-e2e.mjs` open `/billing/mock-checkout?session=legacy_checkout_test` and fail if any mock/demo checkout copy, app error boundary, or visible failure state renders on the production target.
- Real-mode destructive gating verified by `src/test/ux-ui-upgrade/destructive-dialog-realmode-gating.test.tsx`: irreversible actions require in-app two-step confirmation instead of unsafe production shortcuts.
- Demo protected-sync guard verified by `src/features/plan12week/persistence/mutationQueueOffline.test.ts`, `src/features/plan12week/persistence/mutationQueueSender.test.ts`, and `src/features/plan12week/hooks/useAutoCloudSync.test.ts`: demo or auth-unready flows do not call protected backend sync paths.
- Production-core CI guard now includes `src/test/ux-ui-upgrade/destructive-dialog-realmode-gating.test.tsx` through `package.json` `test:production-core:ui`; `.github/workflows/ci.yml` runs the frontend production-core subset in the frontend job while the backend job owns backend install, typecheck, build, and tests.
- Verification passed:
  - `npm.cmd run test:run -- src/app/utils/app-mode.test.ts src/app/utils/production/billingCore.test.ts src/test/ux-ui-upgrade/property-8-demo-copy.test.ts` (15 tests passed)
  - `npm.cmd run test:ui -- src/app/routes.test.tsx src/test/ux-ui-upgrade/destructive-dialog-realmode-gating.test.tsx` (20 tests passed)
  - `npm.cmd run test:sync -- src/features/plan12week/persistence/mutationQueueOffline.test.ts src/features/plan12week/persistence/mutationQueueSender.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts` (60 tests passed)
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`

## 10.1. Batch Evidence - 2026-06-26

- `test:production-core:ui` now explicitly includes `src/test/ux-ui-upgrade/destructive-dialog-realmode-gating.test.tsx`, so the production CI suite covers static demo-route omission and destructive-dialog gating on every PR/main run.
- Verification passed:
  - `npm.cmd run test:production-core:ui` (89 tests passed after the checkout-return monitoring guard was added)

## 10.2. Legal Surface Copy Evidence - 2026-06-26

- `/terms` no longer uses trial/demo wording in the production legal copy; account-abuse language now refers to promotions instead of trial abuse.
- `src/app/routes.test.tsx` asserts the real-mode `/terms`, `/privacy`, `/help`, and `/billing/faq` routes do not render banned demo-only phrases such as `bản dùng thử`, `trên trình duyệt này`, `không thu tiền thật`, `không cần đăng nhập`, `mock`, or `demo`.
- `src/test/ux-ui-upgrade/public-legal-demo-copy.test.ts` statically scans `/terms`, `/privacy`, `/help`, `/billing/faq`, and `/refund-policy` page sources for the same demo-only wording, and `test:production-core:unit` runs it with the other production-core copy guards.

## 10.3. Signed-in Route Copy Evidence - 2026-06-26

- `src/app/routes.test.tsx` now also asserts that real-mode signed-in route renders for `/billing`, `/settings`, and `/vision` do not surface banned demo-only wording such as `bản dùng thử`, `dùng thử`, `trên trình duyệt này`, `không thu tiền thật`, `không cần đăng nhập`, `mock`, or `demo`.
- This closes the gap where page source may still contain valid demo-only branches, but production route rendering must keep those branches hidden from signed-in real-mode users.
- Verification passed:
  - `npm.cmd run test:ui -- src/app/routes.test.tsx` (9 tests passed)
  - `npm.cmd run test:production-core:ui` (89 tests passed after the checkout-return monitoring guard was added)

## 11. Runtime Env Gate Evidence - 2026-06-25

- `scripts/check-runtime-env.mjs` now normalizes `VITE_APP_MODE` like `src/app/utils/app-mode.ts`: only explicit `demo` becomes demo; missing or malformed values resolve to `real` for safety.
- Malformed values are reported loudly and fail `--full-stack` checks with `frontend:VITE_APP_MODE(invalid:<value>)`.
- Missing `VITE_APP_MODE` no longer prints demo-mode skip copy or skips backend-sync requirements as if production were demo.
- Verification passed:
  - `npx.cmd vitest run scripts/check-runtime-env.test.mjs` (2 tests passed)
  - `npm.cmd run env:check -- --skip-health`
  - `npm.cmd run test:run -- src/app/utils/app-mode.test.ts` (8 tests passed)
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`

## 11.1 Frontend Runtime Env Boot Evidence - 2026-07-08

- `src/app/utils/production-runtime-env.ts` reports missing or unsafe real-mode frontend env at app boot without blocking the app or exposing env values.
- Demo mode returns no runtime readiness issues, preserving preview/demo deployments without Firebase/backend requirements.
- Real-mode readiness covers the backend API base URL, Firebase client keys, billing provider mode/support email, and frontend Sentry DSN.
- Production builds also flag localhost API targets and non-`api_contract` billing provider mode as unsafe.
- Verification passed:
  - `npm.cmd run test:run -- src/app/utils/production-runtime-env.test.ts`
  - `npm.cmd run test:run -- src/app/utils/production-runtime-env.test.ts src/app/utils/app-mode.test.ts`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run test:run`
  - `npm.cmd run build`
  - `npm.cmd run env:check -- --skip-health`

## 11.1.1 Full-Stack Runtime Env Gate Evidence - 2026-07-08

- `scripts/check-runtime-env.mjs` now prints the frontend real-mode runtime requirements used by `src/app/utils/production-runtime-env.ts`: `VITE_BILLING_PROVIDER_MODE`, `VITE_BILLING_SUPPORT_EMAIL`, and `VITE_SENTRY_DSN`.
- Full-stack real-mode checks fail when any of those keys are missing, so production deployments catch missing billing/support/monitoring configuration before launch.
- Demo/report mode still reports the keys without failing, preserving preview/demo deployments.
- Verification passed:
  - `npx.cmd vitest run scripts/check-runtime-env.test.mjs`
  - `npm.cmd run test:ops`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd run env:check -- --skip-health`

## 11.2 Assistant API Base URL Guard Evidence - 2026-07-08

- Real-mode assistant streaming/chat fails fast with `ASSISTANT_BACKEND_NOT_CONFIGURED` when `VITE_API_BASE_URL` is missing instead of calling the localhost fallback from `apiClient`.
- Assistant telemetry forwarding now requires both real mode and a configured API base URL, so observability events are not sent to localhost when production env is incomplete.
- Demo assistant behavior remains unchanged because demo mode still uses the local mock provider.
- Verification passed:
  - `npm.cmd run test:run -- src/app/features/assistant/__tests__/assistantApi.test.ts`
  - `npm.cmd run test:run -- src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts`
  - `npm.cmd run test:run -- src/app/utils/production-runtime-env.test.ts src/app/utils/app-mode.test.ts src/app/features/assistant/__tests__/assistantApi.test.ts src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run test:run`
  - `npm.cmd run build`

## 12. Open Questions / Follow-ups

- Confirm Vercel production env and all preview branch envs manually before launch.
