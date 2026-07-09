# Billing Entitlement Authority Spec

## 1. Context & Goal

- Feature / bug: production billing must treat backend entitlement state as authority.
- Why now: real-mode launch depends on paid conversion without mock leakage or optimistic unlocks.
- User impact: users can pay, wait for confirmation, and see accurate access state.
- Modes affected: real primary, demo gated separately.

## 2. Surface Classification

- Type: Core
- Touched domains: billing provider, checkout session, webhook/order completion, entitlement sync, customer portal, real/demo routing.
- Existing invariants that must not break: checkout-session response never grants paid access by itself; local-first app remains usable while entitlement sync is pending; demo billing stays demo-only.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user upgrading to PLUS.
- Secondary actor(s): admin, billing provider webhook, support flow.
- Route(s): /billing/plan, /billing/checkout/:orderId, /settings, admin billing routes.
- API / hook / store touchpoints: apiContractBillingProvider, /billing/\* backend endpoints, entitlement sync helpers, PaymentOrder, Subscription.

## 4. Functional Requirements

1. WHEN user creates a checkout session in real mode, THE system SHALL return a provider/order handoff without setting local PLUS entitlement as confirmed.
2. WHEN provider webhook confirms payment, THE system SHALL update PaymentOrder and Subscription server-side before entitlement appears as confirmed to the user.
3. WHERE provider is disabled or misconfigured, THE system SHALL fail before unnecessary discount or provider side effects.
4. WHILE entitlement sync is pending, THE system SHALL communicate pending/sync state rather than claiming paid access is final.
5. WHERE route is demo-only, THE system SHALL not register or render it in real mode.
6. EVEN IF a checkout-session response includes a non-free `currentEntitlement`, THE frontend SHALL keep local plan/entitlements unchanged until a later entitlement sync confirms access.
7. WHERE a billing action creates a refund or account-claim side effect, THE backend SHALL require a verified Firebase email before validation or side effects run; checkout-session creation SHALL remain available to unverified signed-in users.
8. WHEN a user returns from checkout with a success URL, THE frontend SHALL show confirmed Plus only after entitlement sync returns a non-free server plan; a success URL with still-FREE entitlement remains pending.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none in this spec unless entitlement schema changes; use existing billing/entitlement helpers.
- migration or normalization needed: no.
- backend models or API contracts touched: PaymentOrder, Subscription, DiscountModel indexes.
- sync ordering guarantees: server entitlement beats checkout response; local cache may mirror only after sync.
- rollback / restore concerns: do not remove orders or subscription evidence during failed checkout retries.

## 6. Non-functional Requirements

- performance / latency: checkout fast-fail should avoid slow DB work when provider is disabled or not configured.
- accessibility: billing states and errors must be visible text, not only color.
- observability / logging: webhook duplicate/replay, failed provider config, and entitlement grant failures need logs.
- security / privacy: never expose provider secrets or unlock entitlements client-side from untrusted responses.

## 7. Out of Scope

- Choosing a specific payment provider.
- Building a custom payment proof upload system.
- Changing price model or plan catalogue.

## 8. Acceptance Criteria

- [x] real-mode checkout does not unlock PLUS from checkout-session response alone.
- [x] even a forged/non-free `currentEntitlement` in checkout-session response does not unlock local PLUS access.
- [x] disabled/misconfigured provider returns expected error without discount DB dependency.
- [x] webhook completion is idempotent and side effects run only after successful claim.
- [x] demo mock checkout is not registered in real-mode routes.
- [x] customer portal / support path remains reachable for PLUS users.
- [x] unverified Firebase users can create checkout sessions but remain blocked from refund-request side-effect routes.
- [x] checkout return polling does not confirm Plus from the URL alone when server entitlement is still FREE.

## 9. Verification Plan

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
npm run typecheck
npm run test:run
npm run build
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run test:run -- dist/tests/billingRoutes.test.js dist/tests/webhookRoutes.test.js dist/tests/auth.requireEmailVerified.test.js
```

Focused evidence:

- Frontend checkout and portal: `src/app/pages/billing-production-surfaces.test.tsx`.
- Frontend checkout return polling: `src/features/billing/useCheckoutReturn.test.tsx`.
- Real route table: `src/app/routes.test.tsx` and `src/app/routes.tsx`.
- Checkout/provider failure contract: `backend/src/tests/billingRoutes.test.ts`.
- Email-verification side-effect guard: `backend/src/tests/auth.requireEmailVerified.test.ts`.
- Webhook idempotency: `backend/src/tests/webhookRoutes.test.ts`.

## 10. Batch Evidence - 2026-06-25

- Backend checkout authority verified by `backend/src/tests/billingRoutes.test.ts`: checkout-session creation returns provider/order handoff, but `does NOT grant entitlement after checkout session creation` keeps entitlement state `FREE`.
- Backend webhook authority verified by `backend/src/tests/webhookRoutes.test.ts`: valid provider webhook grants `PLUS`, duplicate webhook is idempotent no-op, `payment_failed` does not grant entitlements, duplicate Casso transaction does not grant `PLUS` twice, low amount / wrong description / expired order do not grant `PLUS`.
- Backend email-verification side-effect guard verified by `backend/src/tests/auth.requireEmailVerified.test.ts`: unverified Firebase users can create billing checkout sessions, but still get `EMAIL_NOT_VERIFIED` before refund request side effects.
- Verification passed:
  - `npm.cmd --prefix backend run build`
  - `node --test backend\\dist\\tests\\billingRoutes.test.js backend\\dist\\tests\\webhookRoutes.test.js` (52 tests passed)
  - `npm.cmd --prefix backend run test -- auth.requireEmailVerified.test.ts` (551 backend tests passed; legacy script currently runs the full backend dist suite)
  - `node --test backend\\dist\\tests\\auth.requireEmailVerified.test.js` with dummy local Firebase/Mongo/frontend env (4 tests passed)
  - `npm.cmd --prefix backend run test:run -- dist/tests/auth.requireEmailVerified.test.js` (4 tests passed)
  - `npm.cmd --prefix backend run test:run -- dist/tests/billingRoutes.test.js dist/tests/webhookRoutes.test.js dist/tests/auth.requireEmailVerified.test.js` (56 tests passed)

## 10.1. Batch Evidence - 2026-06-26

- Frontend checkout return polling verified by `src/features/billing/useCheckoutReturn.test.tsx`: success URL confirms Plus only after entitlement sync returns a non-free server plan; still-`FREE` entitlement remains pending and retries.
- Production-core CI guard now includes `src/features/billing/useCheckoutReturn.test.tsx` through `package.json` `test:production-core:ui`, and `.github/workflows/ci.yml` runs `npm run test:production-core` so PR/main CI fails if checkout-return URL alone can re-confirm Plus.
- Verification passed:
  - `npm.cmd run test:ui -- src/features/billing/useCheckoutReturn.test.tsx` (3 tests passed)
  - `npm.cmd run test:production-core:ui` (89 tests passed)

## 10.2. Billing Legal/Support Reachability Evidence - 2026-06-26

- `src/app/pages/billing-production-surfaces.test.tsx` now verifies that the real `/billing/plan` surface renders the configured support email and links to `/terms`, `/privacy`, `/refund-policy`, and `/billing/faq` before paid conversion.
- This closes the production requirement that legal/support surfaces are reachable before any paid transaction path is allowed to continue.
- Verification passed:
  - `npm.cmd run test:ui -- src/app/pages/billing-production-surfaces.test.tsx` (15 tests passed)
  - `npm.cmd run test:production-core:ui` (89 tests passed)

## 11. Open Questions / Follow-ups

- Confirm live Render env uses api_contract provider and production webhook URLs.
- Add provider-specific smoke transaction before launch.
