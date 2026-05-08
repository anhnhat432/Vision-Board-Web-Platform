# Production Launch Checklist

Last updated: 2026-05-08

Scope: final gate before public use for about 200 users with Casso + VietQR billing.

## Billing safety

Verified by backend tests:

- Duplicate Casso webhook does not grant PLUS twice.
- Underpaid bank transfer does not grant PLUS.
- Wrong transfer description does not match an order and does not grant PLUS.
- Pending order past `expiresAt` becomes `expired` and does not grant PLUS.
- Active PLUS subscription past `currentPeriodEnd` resolves to no active entitlements.

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

For a deeper production smoke without creating a real bank transfer:

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

Live Casso payment cannot be fully smoke-tested without an actual bank transfer or a signed Casso webhook from Casso. The backend safety cases above cover the webhook logic; run one small real transfer before final public launch if possible.

## Plus expiration reminders

- Billing and Settings show an in-app renewal notice when a PLUS period has 7 days or fewer left.
- Admin orders screen has a reminder panel for sending 7-day renewal emails.
- Reminder email sending is idempotent per subscription/date through `BillingEvent`, so rerunning the admin action does not spam the same user on the same expiry date.
- Email sending requires `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, and `RESEND_API_KEY` on Render.

## Operational risks

Render free cold start:

- For public use, prefer Render Starter or higher.
- If staying on free tier, expect first request after idle to be slow and keep `/api/health` visible for checks.

Wrong bank transfer description:

- VietQR embeds the order code automatically.
- Keep checkout warning: user must not edit transfer content.
- Admin/manual recovery remains the fallback for a paid transfer that Casso cannot match.

No automatic recurring billing:

- PLUS is a 12-week period.
- Entitlement resolution now stops granting PLUS after `currentPeriodEnd`.
- Use payment history and expiration reminders for renewal handling.

Rate limit during QA:

- Avoid repeated rapid checkout/auth/sync tests from the same IP.
- If QA hits 429, wait for the limiter window instead of loosening production limits.
