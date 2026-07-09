# Public Checkout Coupon Identity Hardening

## 1. Context & Goal

- Feature / bug: Public checkout accepts `couponCode` while deriving the coupon user key from client-controlled `clientUserId`.
- Why now: Coupons are revenue-sensitive. A local browser user id can be reset or forged, so it cannot enforce one-use-per-user coupon semantics.
- User impact: Visitors can still start public checkout without a coupon. Visitors with a coupon must sign in before using it.
- Modes affected: `real` backend billing route. Demo/local mock UX remains secondary and must not unlock real entitlements.

## 2. Surface Classification

- Type: `Core`
- Touched domains: billing checkout API, coupon validation, unauthenticated payment flow.
- Existing invariants that must not break:
  - Paid checkout kill-switch remains authoritative.
  - Public checkout without coupon remains available while the route is enabled.
  - Authenticated checkout can still apply coupons against Firebase `uid`.
  - Checkout-session creation must not grant entitlements.

## 3. Actors & Entry Points

- Primary actor: signed-out visitor trying to buy PLUS with a coupon.
- Secondary actor(s): signed-in user buying PLUS with a coupon.
- Route(s):
  - `POST /api/billing/public-checkout-session`
  - `POST /api/billing/checkout-session`
- API / hook / store touchpoints:
  - `backend/src/controllers/billingController.ts`
  - `backend/src/tests/billingRoutes.test.ts`
  - `src/app/pages/BillingConfirm.tsx`

## 4. Functional Requirements

1. WHEN a public checkout request includes `couponCode`, THE system SHALL reject it before coupon validation or provider checkout creation.
2. WHEN rejecting a public coupon request, THE system SHALL return a stable `coupon_requires_login` error code.
3. WHEN public checkout has no `couponCode`, THE system SHALL preserve the existing checkout-session behavior.
4. WHEN authenticated checkout includes `couponCode`, THE system SHALL continue to validate and reserve coupon usage using the authenticated Firebase `uid`.
5. WHERE sale-event or env fallback discounts are active, THE system MAY continue to apply them because they are not per-user coupon redemptions.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: public checkout error contract only.
- sync ordering guarantees: not applicable.
- rollback / restore concerns: if product later wants public coupon redemption, implement a server-owned identity proof first.

## 6. Non-functional Requirements

- performance / latency: reject public coupon before database/provider calls.
- accessibility: checkout error copy should be clear and actionable.
- observability / logging: no raw coupon or payment secrets in logs.
- security / privacy: do not trust `clientUserId` for coupon identity.

## 7. Out of Scope

- Provider integration changes.
- Coupon admin UI changes.
- New anonymous identity or email-verification flow.
- Changing `CouponUsageModel` indexes.

## 8. Acceptance Criteria

- [ ] Public checkout with `couponCode` returns `400 coupon_requires_login`.
- [ ] Public checkout with `couponCode` does not call the payment adapter.
- [ ] Public checkout without `couponCode` still creates a checkout session.
- [ ] Authenticated checkout coupon behavior remains covered by existing tests.
- [ ] Relevant backend tests, typecheck, and build pass.

## 9. Verification Plan

Commands to run:

```bash
npm --prefix backend run build
node --test backend/dist/tests/billingRoutes.test.js
npm --prefix backend run typecheck
npm --prefix backend run test:run
```

Add frontend tests if checkout error mapping changes.

## 10. Open Questions / Follow-ups

- Should `BillingPlanPage` hide coupon input for signed-out real-mode visitors, or prompt sign-in before storing the coupon?
- Should public checkout eventually require a server-created anonymous checkout identity instead of client `userId`?
