# Billing Payment History Readiness Spec

## 1. Context & Goal

- Feature / bug: `/billing/plan` smoke can hang while waiting for payment-history hydration.
- Why now: production paid readiness needs billing management to fail visibly and quickly instead of leaving users or smoke checks on an indefinite spinner. Production smoke must also avoid creating generated live QA accounts unless explicitly opted in.
- User impact: signed-in real-mode users can tell whether payment history is loading, empty, loaded, or failed, and can retry without losing local data or changing entitlement state.
- Modes affected: real-mode billing surface; demo remains mock/local.

## 2. Surface Classification

- Type: Core
- Touched domains: billing page, protected payment-history call, production smoke harness.
- Existing invariants that must not break: entitlement authority stays backend/webhook-based; checkout kill-switch remains enforced; no localStorage key/shape changes; signed-out users do not call protected payment-history.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user on `/billing/plan`.
- Secondary actor(s): signed-out visitor, production smoke runner.
- Route(s): `/billing`, `/billing/plan`.
- API / hook / store touchpoints: `usePaymentHistory`, `apiClient.get("/billing/payment-history")`, `scripts/smoke-production-quick.mjs`.

## 4. Functional Requirements

1. WHEN a signed-in real-mode user opens `/billing/plan`, THE system SHALL load payment history through the protected backend endpoint.
2. WHILE payment history is loading too long, THE system SHALL stop waiting, show a visible retryable error, and not imply payment or entitlement loss.
3. WHERE the user is signed out, THE system SHALL not call protected payment-history and SHALL show an account-bound signed-out state.
4. WHERE the signed-in user's email is not verified, THE system SHALL not call protected payment-history and SHALL show an email-verification state instead of a network error.
5. WHERE payment history resolves empty, THE system SHALL show a stable empty state.
6. WHERE production smoke checks `/billing/plan`, THE smoke SHALL wait on explicit DOM/state markers instead of brittle text-only hydration.
7. WHERE production smoke lacks `PROD_SMOKE_EMAIL` / `PROD_SMOKE_PASSWORD`, THE smoke SHALL fail before launching a browser unless `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` explicitly allows a generated QA signup.
8. WHERE production smoke is run through GitHub Actions or the launch runbook, THE operator contract SHALL name only the fixed secrets the smoke scripts actually read: `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no entitlement or payment state is written from payment-history hydration.
- rollback / restore concerns: rollback removes only the timeout/state marker and smoke wait change.

## 6. Non-functional Requirements

- performance / latency: payment-history UI should fail visibly before the existing 30s smoke timeout.
- accessibility: loading/error/empty states remain readable text and not color-only.
- observability / logging: timeout and endpoint errors continue through billing UI monitoring.
- security / privacy: protected endpoint remains signed-in only; no provider secrets in UI or logs.

## 7. Out of Scope

- Re-enabling paid checkout.
- PayOS/Casso provider migration.
- Changing entitlement authority or subscription status logic.

## 8. Acceptance Criteria

- [x] payment history request times out into a retryable visible error before 30s.
- [x] payment history section exposes stable `data-payment-history-state` values.
- [x] signed-out real-mode billing page does not call `/billing/payment-history`.
- [x] unverified signed-in real-mode billing page does not call `/billing/payment-history` and exposes `data-payment-history-state="email-unverified"`.
- [x] production quick smoke waits on the stable state marker.
- [x] production smoke scripts require explicit credentials or an explicit generated-account opt-in before touching the live app.
- [x] production smoke workflow/runbook do not declare unused fixed-secret names outside `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`.

## 9. Verification Plan

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx src/app/pages/billing-paid-checkout-disabled.test.tsx
node scripts/smoke-production-quick.mjs
node scripts/smoke-production-e2e.mjs
npm run test:ops
npm run typecheck
npm run build
```

## 10. Batch Evidence - 2026-06-25

- `scripts/smoke-production-quick.mjs` and `scripts/smoke-production-e2e.mjs` now fail before browser launch when smoke credentials are missing, unless `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` explicitly opts into generated QA signup.
- `scripts/smoke-production-quick.mjs` now waits for structural billing markers and `data-payment-history-state` instead of requiring Vietnamese text literals during initial hydration.
- Verification passed:
  - `node scripts/smoke-production-quick.mjs` without credentials exits before browser launch with the required-credentials error.
  - `node scripts/smoke-production-e2e.mjs` without credentials exits before browser launch with the required-credentials error.
  - `node --check scripts/smoke-production-quick.mjs`
  - `node --check scripts/smoke-production-e2e.mjs`
  - `npm.cmd run lint`
  - `npm.cmd run typecheck`

## 10.1. Batch Evidence - 2026-06-26

- `.github/workflows/production-smoke-e2e.yml` no longer declares unused `PROD_SMOKE_FRESH_*` secrets; the workflow contract now matches `scripts/smoke-production-quick.mjs`, `scripts/smoke-production-e2e.mjs`, and `scripts/check-github-secret-readiness.mjs`.
- `docs/ops/staging-proof-runbook.md` now documents the fixed-account rule explicitly: normal workflow/operator runs use only `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`, while generated-account signup remains an explicit `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` opt-in outside the scheduled workflow.
- `scripts/github-workflow-guards.test.mjs` now prevents unused production-smoke secret names from reappearing in the workflow/runbook contract.
- Verification passed:
  - `npm.cmd run test:ops`
  - `node --check scripts/smoke-production-quick.mjs`
  - `node --check scripts/smoke-production-e2e.mjs`

## 10.2. Batch Evidence - 2026-06-27

- `src/app/pages/billing-paid-checkout-disabled.test.tsx` is now included in `npm run test:production-core:ui`, so the aggregate launch guard fails if the paid-checkout kill-switch stops disabling the paywall, confirm page, checkout QR page, billing plan CTA, or pending-order resume path.
- Focused verification passed:
  - `npm.cmd run test:ui -- src/app/pages/billing-paid-checkout-disabled.test.tsx` (8 tests passed)

## 11. Open Questions / Follow-ups

- Rerun `npm run smoke:prod:quick` against warmed and cold production once staging/production credentials are available.
