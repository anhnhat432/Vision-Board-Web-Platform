# Public Order Status Redaction

## Context

Anonymous checkout pages use `/api/billing/public-order-status/:orderId` so users can open or refresh a payment page before signing in. A pending order needs payment instructions, but a completed, expired, or failed order no longer needs bank account or QR details to be shown to anonymous viewers.

## Surface Classification

- Type: Core
- Touched domains: billing order status, public checkout, sensitive payment data exposure.
- Storage changes: none.
- Payment state changes: none.
- Entitlement changes: none.
- API shape strategy: keep existing top-level fields but redact payment-instruction values for terminal public orders.

## Requirements

1. WHEN an anonymous viewer reads a pending public order, THE system SHALL keep the payment instructions required to complete checkout: bank account, bank name, account name, description, QR data, checkout URL, amount, currency, and expiration.
2. WHEN an anonymous viewer reads a completed, expired, or failed public order, THE system SHALL not expose payment-instruction fields: bank account, bank name, account name, description, QR data, checkout URL, or discount details.
3. WHEN an authenticated owner reads their order status, THE system SHALL preserve the existing full response for support and receipt flows.
4. WHILE this response redaction is applied, THE system SHALL NOT modify order status, subscription state, entitlements, or stored payment order data except for the existing pending-expiry behavior.
5. WHERE the frontend receives a redacted terminal public response, THE system SHALL preserve the existing checkout page success/expired/error rendering contract by keeping string fields present as empty strings and nullable URL fields as `null`.

## Verification Plan

Targeted backend route test:

```bash
npm.cmd --prefix backend run test:run -- dist/tests/billingRoutes.test.js
```

Backend compile gates:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
```

Frontend route/component safety, if response typing changes:

```bash
npm.cmd run test:ui -- src/app/pages/OrderStatusPage.polling.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```
