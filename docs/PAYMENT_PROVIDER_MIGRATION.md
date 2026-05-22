# Payment Provider Migration

Status: paid checkout locked while moving from Casso to PayOS.
Date: 2026-05-22

## Current State

- Casso checkout is intentionally disabled while the team prepares the PayOS migration.
- Do not run Casso E2E checkout or create real transactions during this phase.
- PayOS is the target provider, but the backend `payos` adapter is still a fail-closed placeholder until a real adapter and webhook flow are implemented.
- Existing user entitlements, payment history, restore flows, refund requests, and support flows remain available.

## Required Production Flags

Production must set both kill-switch flags:

```bash
VITE_BILLING_PAID_CHECKOUT_DISABLED=true
BILLING_PAID_DISABLED=true
```

Keep these flags enabled until PayOS is implemented, verified, and signed off.

## Behavior While Locked

When both flags are enabled:

- UI upgrade and renewal CTAs show a temporary payment-lock notice and do not create checkout sessions.
- `/billing/confirm` does not call `/billing/checkout-session` or `/billing/public-checkout-session`.
- Backend `POST /api/billing/checkout-session` returns HTTP 503 with `errorCode: "checkout_disabled"`.
- Backend `POST /api/billing/public-checkout-session` returns HTTP 503 with `errorCode: "checkout_disabled"`.
- Backend checkout controllers return before calling the payment provider adapter.
- Current entitlements are not affected.
- Admin/support may process manual upgrades only after verified payment proof and approved internal process.

## Provider Notes

- `BILLING_PROVIDER=casso` may still exist in backend code for legacy webhooks, reconciliation, and old orders. Do not delete Casso backend code in this migration-lock phase.
- `BILLING_PROVIDER=payos` currently resolves to a placeholder adapter and fails closed until the real PayOS adapter is implemented.
- Do not enable real paid checkout by changing provider env alone. The kill-switch must stay on until release criteria pass.

## Reopen Criteria

Paid checkout can reopen only after all conditions pass:

1. PayOS adapter implemented and reviewed.
2. PayOS webhook signature/checksum verification implemented and tested.
3. PayOS webhook events map safely to local orders and entitlements.
4. Staging E2E passes for checkout, webhook, entitlement sync, receipt, duplicate webhook, failed/canceled payment, and public checkout.
5. Production smoke test passes with kill-switch still enabled.
6. Support, refund, and manual reconciliation flow are ready.
7. Monitoring covers checkout errors, webhook failures, amount mismatches, pending orders, and entitlement grant failures.
8. Product/ops sign-off approves a controlled real transaction window.

## Rollback

If PayOS rollout shows unsafe payment behavior:

1. Keep or re-enable `VITE_BILLING_PAID_CHECKOUT_DISABLED=true`.
2. Keep or re-enable `BILLING_PAID_DISABLED=true`.
3. Do not re-enable Casso if the business has retired it.
4. Keep webhook routes available for already-created provider orders until reconciliation finishes.
5. List pending provider orders and reconcile against provider dashboard.
6. Grant or revoke entitlements only through approved admin/reconciliation tooling.
7. Notify affected users through support if any payment succeeded without entitlement activation.

## Verification Commands

```bash
npm run typecheck
npm run lint
npm test -- billing-paid-checkout-disabled
npm --prefix backend run typecheck
npm --prefix backend test
```

Optional broader checks before release:

```bash
npm run test:run
npm run build
npm run smoke:prod
```
