# Production Smoke Checkout Kill-Switch Spec

## 1. Context & Goal

- Feature / bug: full production smoke still tried to create a checkout QR even when paid checkout is intentionally locked by the production kill-switch.
- Why now: current production billing policy can validly keep `VITE_BILLING_PAID_CHECKOUT_DISABLED` and `BILLING_PAID_DISABLED` active while provider rollout is unresolved.
- User impact: launch evidence can prove billing management and safe checkout lock state without failing because real paid checkout is intentionally disabled.
- Modes affected: real production smoke only.

## 2. Surface Classification

- Type: Shell verification for Core billing behavior.
- Touched domains: production smoke harness, billing kill-switch proof, ops tests.
- Existing invariants that must not break: full smoke still verifies billing payment history; checkout QR proof still runs when the kill-switch is off and `PROD_SMOKE_SKIP_CHECKOUT` is not set; no app runtime or localStorage shape changes.

## 3. Actors & Entry Points

- Primary actor: launch operator running `.github/workflows/production-smoke-e2e.yml` or `npm run smoke:prod`.
- Secondary actor(s): reviewer checking production billing readiness evidence.
- Route(s): `/billing/plan`, `/billing/confirm`, `/billing/checkout`.
- API / hook / store touchpoints: `scripts/smoke-production-e2e.mjs`, network recorder for `/api/billing/checkout-session`.

## 4. Functional Requirements

1. WHEN `/billing/plan` shows the paid-checkout disabled banner, THE smoke SHALL treat checkout lock as an acceptable production-safe state.
2. WHEN checkout is locked, THE smoke SHALL verify `/billing/confirm` also shows the paid-checkout disabled banner.
3. WHEN checkout is locked, THE smoke SHALL fail if `/billing/confirm` POSTs to `/api/billing/checkout-session` or `/api/billing/public-checkout-session`.
4. WHEN checkout is not locked and `PROD_SMOKE_SKIP_CHECKOUT` is not set, THE smoke SHALL keep the existing checkout QR proof.
5. WHILE `PROD_SMOKE_SKIP_CHECKOUT=1`, THE smoke SHALL keep the explicit operator skip behavior.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no sync change.
- rollback / restore concerns: reverting only restores stricter QR-required smoke behavior.

## 6. Non-functional Requirements

- performance / latency: locked-checkout branch waits briefly for accidental checkout POSTs after `/billing/confirm` render.
- accessibility: no UI copy changes.
- observability / logging: smoke logs whether checkout proof was skipped by env or accepted due to kill-switch.
- security / privacy: no credentials or payment data logged.

## 7. Out of Scope

- Changing production kill-switch env vars.
- Running live provider transactions.
- Implementing provider adapters.
- Changing billing UI runtime.

## 8. Acceptance Criteria

- [x] full smoke accepts locked checkout only when `paid-checkout-disabled-banner` is visible.
- [x] full smoke verifies `/billing/confirm` lock state before skipping checkout QR.
- [x] full smoke fails if locked checkout still posts checkout-session requests.
- [x] existing QR proof path remains in the script for unlocked checkout.
- [x] ops harness tests cover the lock-aware branch.

## 9. Verification Plan

```bash
node --check scripts/smoke-production-e2e.mjs
npm.cmd run test:ops
npm.cmd run lint
```

## 10. Open Questions / Follow-ups

- After provider sign-off, run full smoke with checkout unlocked and a controlled provider transaction to prove QR/hosted checkout again.
