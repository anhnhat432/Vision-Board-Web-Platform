# Production Launch Checklist

Last updated: 2026-05-22

Scope: final gate before public use for paid users via PayOS hosted payment links.

Casso giữ trong code làm provider legacy nhưng không được dùng cho real payment đến khi Standard plan + webhook được khôi phục và verify lại độc lập. Kế hoạch chuyển đổi: [docs/ops/payos-migration-plan.md](../docs/ops/payos-migration-plan.md). Hạ tầng: [PRODUCTION_INFRA_CHECKLIST.md](PRODUCTION_INFRA_CHECKLIST.md).

## Billing safety

Verified by backend tests (`npm --prefix backend test`):

- PayOS webhook with invalid HMAC-SHA256 signature is rejected with 401.
- PayOS webhook with mismatching `amount`, non-VND `currency`, or PayOS code ≠ `00` does not grant PLUS.
- PayOS webhook with mismatching `metadata.payos.orderCode` or `paymentLinkId` is ignored.
- Pending PayOS order past `expiresAt` becomes `expired` and does not grant PLUS.
- Concurrent PayOS webhooks for the same order: only the first wins the atomic claim, the second returns `status: "duplicate"` without granting PLUS twice.
- Replay of a completed PayOS order returns `status: "duplicate"`.
- Active PLUS subscription past `currentPeriodEnd` resolves to no active entitlements.
- Casso legacy: duplicate webhook does not grant PLUS twice; underpaid transfer does not grant PLUS; expired pending Casso order does not grant PLUS (these tests still run for legacy safety).

Commands:

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend test
```

## MongoDB backup

Manual backup command:

```bash
npm run backup:mongo
```

Dry-run command:

```bash
npm run backup:mongo:dry-run
```

Operational rule:

- Store backups under `backups/mongodb`.
- Keep `backups/` out of git.
- Retain local backups for 14 days unless `MONGODB_BACKUP_RETENTION_DAYS` is changed.
- Do not upload database archives to public CI artifacts or public storage.

Recurring backup:

- Codex automation: `daily-mongodb-backup`
- Frequency: daily
- Task: run `npm run backup:mongo`, verify a new `.archive.gz`, and report archive path and size.

## Production smoke

Run before inviting real users:

```bash
npm run smoke:prod:quick
```

For a deeper production smoke without creating a real PayOS payment:

```bash
PROD_SMOKE_SKIP_CHECKOUT=1 npm run smoke:prod
```

Coverage:

- Login/signup.
- 12-week save.
- Reload persistence.
- Backend sync.
- Billing management page.
- Desktop and mobile viewport checks.
- No visible demo/mock checkout copy in real billing flow.

Live PayOS payment cannot be fully smoke-tested without an actual transaction or a signed PayOS webhook from the PayOS dashboard. The backend safety cases above cover the webhook logic; run one small real transaction in the controlled rollout window before final public launch (xem step 8–11 trong [docs/ops/payos-migration-plan.md](../docs/ops/payos-migration-plan.md)).

## Plus expiration reminders

- Billing and Settings show an in-app renewal notice when a PLUS period has 7 days or fewer left.
- Admin orders screen has a reminder panel for sending 7-day renewal emails.
- Reminder email sending is idempotent per subscription/date through `BillingEvent`, so rerunning the admin action does not spam the same user on the same expiry date.
- Email sending requires `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, and `RESEND_API_KEY` on Render.

## Sentry billing alerts

Manual Sentry setup before launch:

- Create an issue alert for any event where `feature=billing` and `severity=critical`; notify Slack and email immediately.
- Create a metric alert for a spike in 4xx/5xx responses on PayOS webhook routes (`POST /api/webhooks/payos`, `POST /api/billing/webhook/payos`); notify Slack and email immediately.
- Keep a parallel metric alert for legacy Casso webhook routes (`POST /api/webhooks/casso`, `POST /api/webhook/casso`, `POST /api/billing/webhook/casso`) until Casso is fully decommissioned.
- Create a metric or issue alert when reconciliation fails more than 2 consecutive runs; use events tagged `event=billing_reconciliation_job_failed` or `/api/health/billing` returning `reconciliation=stale`.
- Watch Sentry tag `provider=payos` for `payos_webhook_signature_mismatch`, `payos_webhook_amount_mismatch`, `payos_webhook_identifier_mismatch`, `payos_webhook_unknown_order` — these should stay near zero in steady state.
- Keep Sentry `sendDefaultPii=false`; billing alert context must only include `orderId`, `amount`, and `status`.

## Operational risks

Render free cold start:

- For public use, prefer Render Starter or higher.
- If staying on free tier, expect first request after idle to be slow and keep `/api/health` visible for checks.

PayOS webhook delivery:

- PayOS retries failed webhook delivery. Atomic claim + `providerEventId` dedup guarantee idempotency, but watch for sustained 4xx/5xx that prevent eventual settlement.
- If webhook URL changes, update PayOS dashboard immediately; backend route alias `/api/billing/webhook/payos` exists for backwards compatibility.
- Manual recovery path: admin order screen + PayOS dashboard transaction lookup.

No automatic recurring billing:

- PLUS is a 12-week period.
- Entitlement resolution stops granting PLUS after `currentPeriodEnd`.
- Renewals are new one-time PayOS payments, not provider-managed recurring subscriptions.
- Use payment history and expiration reminders for renewal handling.

Rate limit during QA:

- Avoid repeated rapid checkout/auth/sync tests from the same IP.
- If QA hits 429, wait for the limiter window instead of loosening production limits.
- PayOS webhook rate limiter keys on `x-payos-merchant-id` header or IP; do not send synthetic webhook traffic from production-facing IPs.
