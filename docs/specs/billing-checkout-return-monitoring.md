# Billing Checkout Return Monitoring Spec

## 1. Context & Goal

- Feature / bug: checkout return polling keeps the UI local-safe when provider entitlement is still `FREE`, but exhausted retry outcomes were not captured for launch operators.
- Why now: production billing readiness needs visibility into paid checkout returns where webhook/provider confirmation lags or never grants the account entitlement.
- User impact: users still see the existing payment-processing message, while operators can investigate unconfirmed checkout returns from safe metadata.
- Modes affected: real primary; demo/mock checkout behavior remains unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: billing entitlement sync, checkout return polling, frontend monitoring, production-core UI tests.
- Existing invariants that must not break: checkout-session response never grants paid access by itself; entitlement remains server-confirmed; local UI remains retryable; no localStorage shape/key changes.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user returning to `/billing/plan?status=success`.
- Secondary actor(s): launch operator reviewing billing monitoring.
- Route(s): `/billing/plan`.
- API / hook / store touchpoints: `useCheckoutReturn`, `syncEntitlementsWithProvider`, `logBillingUiError`.

## 4. Functional Requirements

1. WHEN checkout return polling confirms a non-free server entitlement, THE system SHALL keep the existing confirmed state and success toast.
2. WHEN checkout return polling exhausts retries while entitlement is still unconfirmed or `FREE`, THE system SHALL capture a billing UI monitoring event.
3. WHERE monitoring context is attached, THE system SHALL include safe surface/action/status metadata only.
4. WHILE entitlement remains unconfirmed, THE system SHALL NOT locally unlock Plus or mark checkout as confirmed.
5. WHILE frontend monitoring is disabled or unconfigured, THE system SHALL preserve the existing pending UI and informational toast.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: entitlement sync remains provider/server-authoritative.
- rollback / restore concerns: removing monitoring only reduces operator visibility.

## 6. Non-functional Requirements

- performance / latency: capture happens only after retry exhaustion.
- accessibility: no UI copy changes.
- observability / logging: distinguish unconfirmed checkout return from network/error failure.
- security / privacy: no emails, checkout URLs, raw provider payloads, or order ids in monitoring context.

## 7. Out of Scope

- Changing retry count or delay.
- Granting entitlements optimistically.
- Webhook/provider backend changes.
- Live payment provider smoke.

## 8. Acceptance Criteria

- [x] exhausted checkout return polling emits a billing monitoring event.
- [x] unconfirmed checkout return remains `pending`, not `confirmed`.
- [x] non-free entitlement confirmation path remains unchanged.
- [x] production-core UI verification includes the regression.

## 9. Verification Plan

```bash
npm.cmd run test:ui -- src/features/billing/useCheckoutReturn.test.tsx
npm.cmd run test:production-core:ui
npm.cmd run typecheck
npm.cmd run lint
```

## 10. Open Questions / Follow-ups

- Correlate frontend unconfirmed-return events with backend webhook/order status after staging billing evidence is available.
