# Billing Portal Support Email Fallback

## Context

The backend customer-portal endpoint returns unsupported-provider guidance when the active billing provider cannot create a self-service portal session. Receipt emails also include a support contact for refund/help follow-up. These backend billing surfaces must not fall back to outdated or off-brand support addresses when production env is missing.

## Surface Classification

- Type: Core
- Touched domains: billing customer portal, payment receipt email, support contact copy, backend API response.
- Storage changes: none.
- Payment state changes: none.
- Entitlement changes: none.
- API shape changes: none; existing `supportEmail` and `message` fields remain.

## Requirements

1. WHEN `/api/billing/customer-portal` cannot use a provider portal because the adapter has no portal method, THE system SHALL return the configured support email in `supportEmail` and in the user-facing fallback message.
2. WHEN the provider portal method returns `null`, THE system SHALL return the configured support email in `supportEmail` and in the user-facing fallback message.
3. WHERE multiple support email env vars are configured, THE system SHALL resolve them consistently with backend email services: `SUPPORT_EMAIL`, then `VITE_BILLING_SUPPORT_EMAIL`, then `BILLING_SUPPORT_EMAIL`.
4. WHERE no support email env var is configured, THE system SHALL use the branded fallback `support@dearourfuture.com`.
5. WHILE this endpoint returns fallback portal guidance, THE system SHALL NOT modify subscriptions, entitlements, orders, or local-first data.
6. WHEN a payment receipt email is rendered without configured support env vars, THE system SHALL use the same branded fallback support email.

## Verification Plan

Run targeted backend tests first:

```bash
npm.cmd --prefix backend run test:run -- dist/tests/billingRoutes.test.js
npm.cmd --prefix backend run test:run -- dist/tests/receiptEmail.test.js
```

Then run compile gates:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
```

If frontend API types or billing UI copy are changed, also run:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```
