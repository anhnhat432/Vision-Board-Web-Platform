# Billing UI Monitoring Privacy Spec

## 1. Context & Goal

- Feature / bug: billing UI errors were captured through frontend monitoring with useful context, but the shared context allowed raw order ids and exact amounts.
- Why now: production launch needs billing observability without leaking payment identifiers or exact transaction values into client error metadata.
- User impact: users still see retryable billing errors, while operators can triage billing UI failures from safe metadata.
- Modes affected: real primary; demo/local billing behavior remains unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: billing UI monitoring, checkout/order/payment-history error context, production-core unit guard.
- Existing invariants that must not break: billing errors remain visible to users; Sentry stays optional; checkout and entitlement authority remain unchanged; no localStorage shapes change.

## 3. Actors & Entry Points

- Primary actor: real-mode user on billing, checkout, order status, or paywall surfaces.
- Secondary actor(s): launch operator reviewing frontend monitoring.
- Route(s): `/billing/plan`, `/billing/checkout/:orderId`, `/order-status`, paywall dialogs.
- API / hook / store touchpoints: `logBillingUiError`, `toastBillingNetworkError`, `captureFrontendException`.

## 4. Functional Requirements

1. WHEN a billing UI error is captured, THE system SHALL include surface, action, and status metadata needed for triage.
2. WHERE an order id exists, THE system SHALL record only that an order id was present, not the raw id value.
3. WHERE an amount exists, THE system SHALL record only a coarse amount band, not the exact amount.
4. WHILE frontend monitoring is disabled or unconfigured, THE system SHALL preserve existing user-facing error behavior.
5. WHERE billing monitoring context is captured, THE system SHALL NOT include raw order ids, exact amounts, emails, checkout URLs, or provider payloads.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no sync change.
- rollback / restore concerns: removing this change only reduces metadata privacy hardening.

## 6. Non-functional Requirements

- performance / latency: sanitization is constant-time and local.
- accessibility: no UI copy changes.
- observability / logging: preserve enough fields for grouping by billing surface and action.
- security / privacy: reduce payment/order metadata precision before capture.

## 7. Out of Scope

- Backend billing telemetry.
- Provider webhook observability.
- Payment-history UI changes.
- Running live provider transactions.

## 8. Acceptance Criteria

- [x] billing UI monitoring no longer sends raw `orderId`.
- [x] billing UI monitoring no longer sends exact `amount`.
- [x] monitoring still includes surface, action, status, order-id presence, and amount band.
- [x] production-core unit verification includes the regression test.

## 9. Verification Plan

```bash
npm.cmd run test:run -- src/app/utils/billing-ui-monitoring.test.ts
npm.cmd run test:production-core:unit
npm.cmd run typecheck
npm.cmd run lint
```

## 10. Open Questions / Follow-ups

- Decide later whether backend billing logs should apply the same coarse amount-band convention.
