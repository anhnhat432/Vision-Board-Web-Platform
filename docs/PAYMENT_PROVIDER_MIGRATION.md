# Payment Provider Migration

Status: paid checkout locked while moving from Casso to PayOS.
Date: 2026-05-22

## Current State

- Paid checkout remains intentionally locked while the team migrates from Casso to PayOS.
- Do not run Casso E2E checkout or create real transactions during this phase.
- Backend `BILLING_PROVIDER=payos` now resolves to a real PayOS adapter and verified webhook handler, but this does **not** make production checkout live.
- Production must keep `BILLING_PAID_DISABLED=true` and `VITE_BILLING_PAID_CHECKOUT_DISABLED=true` until staging E2E and ops sign-off pass.
- Existing user entitlements, payment history, restore flows, refund requests, and support flows remain available.

## Required Production Flags

Production must set both kill-switch flags:

```bash
VITE_BILLING_PAID_CHECKOUT_DISABLED=true
BILLING_PAID_DISABLED=true
```

Keep these flags enabled until PayOS is configured, verified end-to-end in staging, smoke-tested with the backend kill-switch still on, and signed off for a controlled production payment window.

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
- `BILLING_PROVIDER=payos` resolves to the real PayOS payment-link adapter. It requires `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, and `PLUS_PRICE_VND` for checkout creation.
- PayOS webhook URL: `/api/billing/webhook/payos` (legacy alias: `/api/webhooks/payos`). Health check: `/api/billing/webhook/payos/health`.
- PayOS returns/redirects do not grant Plus. Plus entitlement is granted only after a PayOS webhook with a valid checksum, successful payment status, matching pending `PaymentOrder`, matching amount/currency, and no expiry violation.
- Do not enable real paid checkout by changing provider env alone. The backend and frontend kill-switches must stay on until release criteria pass.

## Reopen Criteria

Paid checkout can reopen only after all conditions pass:

1. PayOS adapter and webhook implementation reviewed.
2. PayOS env set on staging/production hosts without disabling kill-switches: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PLUS_PRICE_VND`.
3. PayOS dashboard configured to call `/api/billing/webhook/payos`.
4. PayOS webhook checksum verification tested with invalid and valid payloads.
5. Webhook success maps safely to local orders and entitlements; return URL alone never grants Plus.
6. Staging E2E passes for checkout, webhook, entitlement sync, receipt, duplicate webhook, amount mismatch, unknown order, failed/canceled payment, and public checkout.
7. Production smoke test passes with kill-switch still enabled.
8. Support, refund, and manual reconciliation flow are ready.
9. Monitoring covers checkout errors, webhook failures, amount mismatches, pending orders, and entitlement grant failures.
10. Product/ops sign-off approves a controlled real transaction window.

## Rollback

If PayOS rollout shows unsafe payment behavior:

1. Keep or re-enable `VITE_BILLING_PAID_CHECKOUT_DISABLED=true`.
2. Keep or re-enable `BILLING_PAID_DISABLED=true`.
3. Do not re-enable Casso if the business has retired it.
4. Keep webhook routes available for already-created provider orders until reconciliation finishes.
5. List pending provider orders and reconcile against provider dashboard.
6. Grant or revoke entitlements only through approved admin/reconciliation tooling.
7. Notify affected users through support if any payment succeeded without entitlement activation.

## PayOS Staging E2E Before Production

1. Deploy backend with `BILLING_PROVIDER=payos`, `BILLING_REPOSITORY=mongo`, PayOS env vars, and `BILLING_PAID_DISABLED=true` still active.
2. Confirm `POST /api/billing/checkout-session` and `POST /api/billing/public-checkout-session` return `503 checkout_disabled` while locked.
3. Configure PayOS dashboard webhook URL to `/api/billing/webhook/payos`.
4. In staging only, temporarily disable backend checkout behind a controlled access path/account; do not change production kill-switches.
5. Create one sandbox/test payment link, complete payment, and verify the webhook marks the `PaymentOrder` completed, grants Plus through the billing service, and sends/queues receipt.
6. Replay the same webhook and verify idempotency does not grant Plus twice.
7. Send invalid checksum, amount mismatch, unknown order, and failed/canceled status payloads; verify no entitlement is granted.
8. Re-enable the backend kill-switch immediately after the controlled test window.

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
