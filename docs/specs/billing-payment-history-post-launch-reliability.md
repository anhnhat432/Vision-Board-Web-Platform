# Billing Payment History Post-Launch Reliability

## 1. Context & Goal

- Feature / bug: a signed-in production user can reach `/billing/plan` with an active Plus entitlement while payment history times out after eight seconds and shows a retryable error.
- Why now: checkout is live through PayOS, so account-bound payment history is an operational trust surface rather than a pre-launch smoke-only concern.
- User impact: a transient Render, Firebase token, or Mongo warm-up delay can make a valid payment look unavailable even though entitlement state remains active and a later retry succeeds.
- Modes affected: `real` only. Demo billing remains local/mock and must not call the protected endpoint.

## 2. Surface Classification

- Type: `Core` behavior with a small `Shell` status presentation.
- Touched domains: protected payment-history hydration, billing UI monitoring, `/billing/plan` state copy, production billing documentation.
- Existing invariants that must not break:
  - Entitlement authority remains backend/webhook-based.
  - Checkout creation, PayOS webhook processing, refunds, cancellation, and restore-access behavior remain unchanged.
  - Signed-out and unverified-email users do not call `/billing/payment-history`.
  - A history read never grants, revokes, or changes Plus access.
  - No provider secrets, raw payment payloads, account identifiers, or exact amounts enter client monitoring.

## 3. Actors & Entry Points

- Primary actor: signed-in, email-verified real-mode user opening `/billing/plan`.
- Secondary actor(s): production support operator reading privacy-safe monitoring; production smoke runner observing stable DOM state.
- Route(s): `/billing`, `/billing/plan`.
- API / hook / store touchpoints:
  - `usePaymentHistory`
  - `apiClient.get("/billing/payment-history")`
  - `BillingPlanPage` payment-history state marker
  - billing UI monitoring

## 4. Evidence & Root-Cause Hypothesis

- On 2026-07-31, the first live production visit showed `data-payment-history-state="error"` with the eight-second timeout copy while Plus remained active.
- A subsequent visit in the same production session returned the completed order and `data-payment-history-state="ready"`.
- Warm public backend checks returned successfully in under one second.
- The payment-history backend path reads local MongoDB state and does not call PayOS.
- Current frontend behavior performs exactly one attempt and starts its eight-second timer before Firebase token acquisition and the protected HTTP request complete.

The confirmed behavioral failure is therefore a transient first-attempt latency crossing the client deadline without automatic recovery. The narrow fix is one bounded retry for transient failures, not a longer unconditional timeout and not a billing data-contract change.

## 5. Functional Requirements

1. WHEN the first payment-history attempt times out, THE system SHALL retry the protected GET exactly once before showing the final error state.
2. WHEN the first payment-history attempt fails with a network error or HTTP `5xx`, THE system SHALL retry exactly once.
3. WHILE the automatic retry is in progress, THE system SHALL expose `data-payment-history-state="retrying"` and explain that it is reconnecting without implying payment or entitlement loss.
4. WHEN the retry succeeds, THE system SHALL render the returned history and clear the transient error state.
5. WHEN the retry also fails, THE system SHALL show the existing safe retryable error and manual `Thử lại` action.
6. WHERE the failure is HTTP `401`, `403`, `429`, or another non-transient `4xx`, THE system SHALL NOT automatically retry.
7. WHERE the user manually selects `Thử lại`, THE system SHALL start a fresh two-attempt cycle.
8. WHERE the user is signed out or their email is unverified, THE system SHALL preserve the current no-request behavior.
9. WHEN monitoring records the first transient failure or final failure, THE system SHALL use privacy-safe metadata only and SHALL NOT include order ids, email addresses, provider payloads, or exact amounts.

## 6. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no billing or entitlement writes are introduced.
- rollback / restore concerns: rollback restores the single-attempt hook; stored payment and entitlement state are unaffected.

## 7. Non-functional Requirements

- Performance / latency: each attempt retains the existing eight-second deadline; at most two protected GET attempts occur per automatic load cycle.
- Accessibility: `loading`, `retrying`, `empty`, `ready`, and `error` states remain readable text and are not color-only.
- Observability / logging: distinguish first-attempt recovery from final failure without recording sensitive payment data.
- Security / privacy: retry only the idempotent authenticated GET; do not broaden authorization or expose backend details.

## 8. Out of Scope

- Changing PayOS checkout, webhook, entitlement, refund, cancellation, receipt, or customer-portal behavior.
- Rewriting Mongo queries or adding indexes without production query evidence.
- Increasing the global `authedFetch` timeout.
- Retention analytics and funnel event design.
- Deployment or environment-variable changes.

## 9. Acceptance Criteria

- [x] A first timeout followed by success performs two calls and renders payment history without showing the final error.
- [x] A first network or `5xx` failure followed by success performs two calls and renders payment history.
- [x] During the second attempt, the section exposes `data-payment-history-state="retrying"` with reconnecting copy.
- [x] Two transient failures end in the current safe error state with `Thử lại`.
- [x] `401`, `403`, and `429` failures perform one call only and retain their existing handling.
- [x] Signed-out and unverified-email states perform no protected history call.
- [x] Monitoring metadata remains privacy-safe.
- [x] Demo mode behavior and all entitlement/payment authority tests remain unchanged.

## 10. Verification Plan

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
npm run test:production-core:unit
npm run typecheck
npm run lint
npm run build

npm --prefix backend run typecheck
npm --prefix backend run build
node --test backend/dist/tests/billingRoutes.test.js
```

Verification evidence recorded on 2026-07-31:

- `npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx`: `32/32` tests passed, including timeout recovery, network/`5xx` recovery, retrying state, manual fresh retry cycle, and no-retry `400`/`401`/`403`/`429` cases.
- `npm run test:production-core:unit`: `45/45` tests passed, including app-mode, billing monitoring privacy, entitlement authority, auth, and demo-copy boundaries.
- `npm run typecheck`: passed.
- `npm run lint`: exited `0`; one pre-existing informational `useTemplate` finding remains in `src/app/components/admin/AdminPagination.tsx`.
- `npm run build`: passed.
- `npm --prefix backend run typecheck` and `npm --prefix backend run build`: passed with isolated test env values.
- `node --test backend/dist/tests/billingRoutes.test.js`: `53/53` tests passed.
- Static security review confirmed the retry is limited to the authenticated idempotent GET, creates at most two attempts per cycle, and sends only `surface` / `action` context for this path without email, account id, order id, provider payload, or exact amount metadata.

Production acceptance after deployment:

- [ ] Open `/billing/plan` with a signed-in Plus account after a backend idle window.
- [ ] Confirm the section moves through `loading` or `retrying` to `ready` without manual intervention.
- [ ] Confirm the displayed entitlement and payment records remain account-bound and unchanged.
- [ ] Record endpoint status/latency from deployment monitoring without copying tokens or payment payloads.

These production checks remain pending until this branch is deployed to a real-mode preview or production target.

## 11. Documentation Updates

- Mark checkout as live through PayOS in current production status documentation.
- Explain that checked-in `.env.production` and `render.yaml` values are safe fallbacks and may not reflect active Vercel/Render host overrides.
- Preserve historical migration and kill-switch records as dated evidence instead of rewriting them as current truth.

## 12. Open Questions / Follow-ups

- Add backend handler/query timing only if the retry still fails after deployment or production monitoring shows warm requests near the eight-second deadline.
- Design the post-launch activation and retention funnel as a separate feature after this billing reliability slice is complete.
