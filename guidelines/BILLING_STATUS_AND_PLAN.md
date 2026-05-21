# Billing Status And Plan

## Current Billing Flow

The current billing/paywall layer is suitable for a public demo and provider-contract prototyping. It is not a production payment system yet.

Main frontend entry points:

- `src/app/pages/BillingPlan.tsx`: billing settings page, current plan display, entitlement display, upgrade CTA, local trial, entitlement sync, restore access, and optional customer portal action.
- `src/app/components/UpgradePaywallDialog.tsx`: paywall modal shown from 12-week premium features and billing settings. It calls `startCheckoutFlow(...)`.
- `src/app/pages/MockBillingCheckout.tsx`: same-origin mock checkout confirmation page for demo provider mode.
- `src/app/utils/production.ts`: provider selection, local/mock/api-contract provider implementations, mock session storage, entitlement sync/restore helpers.
- `src/app/utils/billing-contract.ts`: TypeScript contract shape expected from a future billing provider/proxy.
- `src/app/utils/twelve-week-premium.ts`: plan definitions, entitlement definitions, plan normalization, paywall copy, premium review/template helpers.
- `src/app/hooks/usePlanEntitlements.ts`: reads current local plan and entitlements for UI.

Current user-facing flow:

1. User hits a premium template, premium review insight, reminder, advanced analytics area, or Billing Plan CTA.
2. `UpgradePaywallDialog` opens and logs paywall analytics.
3. User chooses Plus.
4. `startCheckoutFlow` chooses a provider by `VITE_BILLING_PROVIDER_MODE`.
5. Provider returns one of:
   - local upgrade immediately,
   - mock checkout redirect to `/billing/mock-checkout?session=...`,
   - external/provider checkout URL through `api_contract`.
6. If the flow completes locally or through mock provider, the app writes `subscription` and `entitlements` into localStorage.
7. Billing settings and 12-week settings read those local values and update UI.

Public demo copy convention:

- Public UI should say `Free` and `Plus demo`; do not present `PRO` as a purchasable plan.
- Mock checkout surfaces must state that no real money is charged.
- Local entitlement state should be described as `quyền local`, `mock upgrade`, or `mở trên trình duyệt này`, not as a verified paid subscription.
- Words such as subscription, renewal, transaction, payment, and billing authority are acceptable in technical docs/contracts, but public MVP 1 copy should use them only with a clear mock/demo qualifier.

## Plans

Current TypeScript plan code type:

- `FREE`
- `PLUS`
- `PRO`

Current UI plan catalog in `PLAN_DEFINITIONS`:

- `FREE`: price `0đ`, supports one 12-week cycle, Today queue/check-in, basic weekly review.
- `PLUS`: demo price label `Demo 149.000đ / chu kỳ`, unlocks premium templates, premium review insight, priority reminders, and advanced analytics for the local/mock demo flow.

Important compatibility note:

- `PRO` exists in `PricingPlanCode` and `PLAN_ENTITLEMENTS`, but `normalizePlanCode("PRO")` maps it to `PLUS`.
- The UI currently shows Free and Plus only. There is no distinct Pro product, price, or feature tier implemented.

## Entitlements

Current entitlement keys:

- `premium_templates`
- `premium_review_insights`
- `priority_reminders`
- `advanced_analytics`

Current entitlement mapping:

- `FREE`: no entitlements.
- `PLUS`: all four entitlement keys.
- `PRO`: same entitlement set as Plus, normalized to Plus by current helpers.

Current checks are frontend/local:

- `getCurrentPlan(...)` reads `subscription` and `entitlements` from localStorage user data.
- `getCurrentEntitlementKeys(...)` returns local entitlement keys.
- `hasEntitlement(...)` checks local entitlement entries.
- `usePlanEntitlements(...)` exposes those local values to pages/components.

## Mock Provider Behavior

Mock/local data keys:

- `visionboard_user_data`: stores `subscription` and `entitlements`.
- `visionboard_mock_billing_account`: stores one mock provider account.
- `visionboard_mock_billing_session_*`: stores mock checkout sessions.
- `visionboard_last_entitlement_sync`: stores last sync snapshot.
- `visionboard_last_restore_access`: stores last restore snapshot.

`local_test` provider:

- Used when `VITE_BILLING_PROVIDER_MODE=local_test`.
- Checkout calls `upgradePlanLocally(...)`.
- No external checkout page.
- No customer portal.
- Entitlement sync and restore are local-only.

`mock_provider` provider:

- Default in `.env.example`, `.env.production`, and current demo deployment docs.
- Checkout creates a local mock session and redirects to `/billing/mock-checkout?session=...`.
- `MockBillingCheckout` confirmation creates a mock account with `mock_customer_01` and `mock_subscription_plus`.
- Entitlements are generated locally from `getEntitlementsForPlan(...)`.
- Restore/sync read `visionboard_mock_billing_account`.
- No real money, no provider API, no webhook, no backend authority.

Local trial:

- `BillingPlan.tsx` can call `startTrialLocally("PLUS", 7)`.
- This is also localStorage-only and should not be presented as real billing.

## Provider Contract Already Present

`api_contract` mode is a frontend contract for a future billing backend/proxy. It is not currently backed by this repo's Express backend.

Env controls:

- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL`
- `VITE_BILLING_API_BASE`
- `VITE_BILLING_CHECKOUT_ENDPOINT`
- `VITE_BILLING_PORTAL_ENDPOINT`
- `VITE_BILLING_RESTORE_ENDPOINT`
- `VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT`

If `VITE_BILLING_API_BASE` is set, frontend derives:

- `POST {base}/checkout`
- `POST {base}/portal`
- `POST {base}/restore`
- `POST {base}/entitlements`

Current expected response shape is `BillingAccessContractPayload`:

- `checkoutUrl?: string`
- `portalUrl?: string`
- `planCode?: PricingPlanCode`
- `subscription?: Partial<Subscription> | null`
- `entitlements?: Entitlement[] | EntitlementKey[]`
- `message?: string`
- `providerLabel?: string`

Important behavior:

- If checkout endpoint is missing or the device is offline, `api_contract` falls back to local checkout.
- If entitlement/restore endpoints are missing, `api_contract` falls back to local restore/sync.
- This keeps demo UX smooth, but it is unsafe for paid production unless guarded by backend authority.

## Backend Status

Current backend has protected order routes:

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/cancel`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`

These use:

- `backend/src/models/OrderModel.ts`
- `backend/src/services/orderService.ts`
- `backend/src/routes/orderRoutes.ts`
- `backend/src/controllers/orderController.ts`

Those routes manage physical/order workflow fields such as `kitType`, shipping address, status history, admin status transitions, and cancellation. They are not a billing subscription/payment provider integration.

Not implemented in backend yet:

- billing customer model,
- subscription model,
- entitlement grants model,
- checkout session model,
- payment transaction/invoice model,
- webhook endpoint,
- webhook signature verification,
- server-side entitlement resolution API,
- customer portal session API.

## Production Billing Gaps

High-priority risks:

- Users can edit localStorage and unlock premium because current entitlement authority is frontend/local.
- Entitlements are not enforced by backend for any paid-only server route.
- Mock checkout creates local subscription state without payment verification.
- `api_contract` can fall back to local checkout when endpoints are missing/offline, which is useful for demo but unsafe as a paid launch default.
- No webhook endpoint exists to confirm checkout completion, subscription lifecycle, failed renewal, cancellation, refund, or chargeback.
- No provider event idempotency table exists, so webhook retry safety is not implemented.
- No server-side link exists between Firebase user id and billing customer id.
- No backend entitlement cache/API exists for app boot or cross-device restore.
- No customer portal integration exists in backend.
- No price/product ids are mapped in backend.
- Current `PRO` type could confuse future agents because it exists as a code but is normalized to Plus and not surfaced as a real product.

Medium-priority risks:

- Local trial can grant Plus-like state without server record.
- `subscription.renewsAt` expiry is enforced client-side by `getCurrentPlan(...)`, not by backend.
- Mock provider account uses fixed ids (`mock_customer_01`, `mock_subscription_plus`).
- Analytics can measure checkout flow, but cannot prove payment success.
- Billing debug UI is env-gated, but copied production env should avoid exposing confusing debug state to customers.

## Recommended Backend Models

Recommended minimum paid-launch backend models:

### BillingCustomer

- `userId`: Firebase uid.
- `provider`: e.g. `stripe`, `paddle`, `lemonsqueezy`, or local provider name.
- `providerCustomerId`.
- `email`.
- `createdAt`, `updatedAt`.

### BillingSubscription

- `userId`.
- `provider`.
- `providerSubscriptionId`.
- `providerCustomerId`.
- `planCode`: `FREE` or `PLUS` for MVP paid launch.
- `status`: `trialing`, `active`, `past_due`, `canceled`, `incomplete`, `unpaid`.
- `billingCycle`.
- `currentPeriodStart`.
- `currentPeriodEnd`.
- `cancelAtPeriodEnd`.
- `canceledAt`.
- `lastSyncedAt`.

### EntitlementGrant

- `userId`.
- `planCode`.
- `key`: one of current entitlement keys.
- `source`: `subscription`, `trial`, `manual`, `admin`.
- `sourceId`: subscription id, trial id, or admin grant id.
- `grantedAt`.
- `expiresAt`.
- `revokedAt`.

### CheckoutSession

- `userId`.
- `planCode`.
- `context`.
- `source`.
- `goalId`.
- `provider`.
- `providerCheckoutSessionId`.
- `status`: `created`, `completed`, `expired`, `canceled`.
- `returnUrl`.
- `createdAt`, `completedAt`.

### BillingEvent

- `provider`.
- `providerEventId`.
- `eventType`.
- `receivedAt`.
- `processedAt`.
- `status`: `received`, `processed`, `ignored`, `failed`.
- `payloadHash`.
- `error`.

### BillingTransaction

- `userId`.
- `provider`.
- `providerPaymentId` or `providerInvoiceId`.
- `providerCustomerId`.
- `providerSubscriptionId`.
- `amount`.
- `currency`.
- `status`.
- `paidAt`.
- `refundedAt`.

## Recommended APIs

Frontend contract-compatible APIs:

### `POST /billing/checkout`

Authenticated by Firebase token. Do not trust `userId` from body; derive user from token.

Request:

- `planCode`
- `context`
- `source`
- `goalId`
- `recommendedPlan`
- `returnUrl`

Response:

- `checkoutUrl`
- `providerLabel`
- `message`

### `POST /billing/portal`

Authenticated. Creates a provider customer portal session.

Response:

- `portalUrl`
- `providerLabel`
- `message`

### `POST /billing/entitlements`

Authenticated. Returns authoritative current subscription and entitlement state.

Response:

- `planCode`
- `subscription`
- `entitlements`
- `message`

### `POST /billing/restore`

Authenticated. Reconciles provider customer/subscription state, then returns authoritative entitlements.

Response:

- `planCode`
- `subscription`
- `entitlements`
- `message`

### `POST /billing/webhook`

Provider-authenticated by webhook signature, not Firebase. Must support idempotency through `BillingEvent.providerEventId`.

### Optional Admin APIs

- `GET /admin/billing/customers`
- `GET /admin/billing/subscriptions`
- `PATCH /admin/billing/entitlements/:id/revoke`
- `POST /admin/billing/entitlements/manual-grant`

## Recommended Webhook Events

Provider-neutral events to support:

- checkout completed,
- checkout expired/canceled,
- subscription created,
- subscription updated,
- subscription canceled,
- subscription resumed,
- invoice/payment succeeded,
- invoice/payment failed,
- trial will end,
- refund created,
- dispute/chargeback opened,
- dispute/chargeback closed.

If using Stripe, likely mappings:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

## Entitlement Sync Strategy

MVP demo strategy:

- localStorage remains the source of truth.
- `mock_provider` is allowed.
- premium unlock is intentionally local and reversible.
- no real payment claims.

MVP paid launch strategy:

- Backend becomes source of truth for subscription and entitlements.
- Frontend localStorage becomes cache only.
- On app boot/login, call `/billing/entitlements` after auth is ready.
- After checkout redirect, call `/billing/entitlements` or `/billing/restore`.
- Webhook must update backend before the client considers payment complete.
- Client can optimistically show "processing" but must not grant durable paid entitlement without backend confirmation.
- Premium UI can read cached entitlements for offline display, but any paid server-side action must use backend checks.
- Expiry/cancellation should be computed on backend and mirrored to frontend.
- Entitlement grants should have `expiresAt` or derive expiry from active subscription period.
- Keep `mock_provider` available only for demo/staging, never as paid production authority.

## MVP Paid Launch Checklist

Before selling Plus for real:

- Choose one payment provider and lock scope to Plus only.
- Remove ambiguity around `PRO`: either delete from paid launch docs or keep it explicitly as legacy alias to Plus.
- Add backend billing models for customer, subscription, entitlement grant, checkout session, billing event, and transaction.
- Implement `/billing/checkout`, `/billing/portal`, `/billing/entitlements`, `/billing/restore`, and `/billing/webhook`.
- Verify webhook signatures.
- Add idempotent webhook processing.
- Map provider product/price ids to internal `PLUS`.
- Derive backend user id from Firebase token, not request body.
- Disable local checkout fallback in production paid mode, or make fallback return `not_configured` without unlocking.
- Make backend entitlements authoritative and localStorage a cache.
- Add tests for successful checkout, canceled checkout, renewal success, payment failure, cancellation, refund, and entitlement expiry.
- Add deployment env checklist for provider secret keys and webhook signing secret.
- Add clear copy that mock checkout is demo only when `mock_provider` is active.
- Add monitoring for webhook failures and entitlement sync failures.
- Add manual admin recovery path for paid users.
- Run a full sandbox checkout before switching production env.

## Safe Current Recommendation

For MVP 1 public demo, keep:

```env
VITE_BILLING_PROVIDER_MODE=mock_provider
VITE_BILLING_PROVIDER_LABEL=Mock provider
```

Do not claim real payment support yet. The current implementation is useful for validating paywall UX, entitlement UX, analytics, and upgrade intent before building the production billing backend.

## Backend Billing Domain (Provider-Agnostic)

Last updated: 2026-05-01

### Status: PREPARE ONLY — No Real Provider Connected

Backend billing domain models and service have been added to prepare for a future paid MVP transition. No real payment provider (Stripe, Paddle, VNPay, MoMo, PayOS) is integrated.

### Files Added

| File | Purpose |
|---|---|
| `backend/src/models/BillingSubscriptionModel.ts` | Mongoose model for provider-agnostic subscriptions with embedded entitlement grants |
| `backend/src/models/BillingEventModel.ts` | Mongoose model for webhook/provider event idempotency log |
| `backend/src/services/billingService.ts` | Pure service with repository interfaces, entitlement resolution, and provider event processing |
| `backend/src/tests/billingService.test.ts` | 25 tests covering entitlement resolution, status transitions, idempotency, and user isolation |

### Models

#### BillingSubscription

- `userId` (string, indexed) — Firebase UID
- `planCode` ("FREE" | "PLUS") — no PRO for paid MVP
- `status` ("trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid")
- `provider` (string) — "none", "stripe", "paddle", etc.
- `source` ("mock" | "manual" | "provider")
- `providerCustomerId` (optional string)
- `providerSubscriptionId` (optional string, unique sparse index)
- `billingCycle` (optional: "monthly" | "quarterly" | "yearly" | "lifetime")
- `currentPeriodStart` / `currentPeriodEnd` (optional dates)
- `cancelAtPeriodEnd` (optional boolean)
- `canceledAt` (optional date)
- `entitlements` — embedded array of `{ key, grantedAt, expiresAt?, revokedAt? }`
- `lastSyncedAt` (optional date)
- `createdAt` / `updatedAt` (Mongoose timestamps)

#### BillingEvent

- `provider` (string)
- `providerEventId` (string, unique compound index with provider)
- `eventType` (string)
- `userId` (optional string, indexed)
- `status` ("received" | "processed" | "ignored" | "failed")
- `payloadHash` (string — SHA-256, raw payload never stored)
- `processedAt` (optional date)
- `error` (optional string)
- `createdAt` / `updatedAt` (Mongoose timestamps)

### Service API

```typescript
class BillingService {
  getCurrentEntitlementForUser(userId: string): Promise<UserEntitlementSnapshot>;
  upsertSubscriptionFromProviderEvent(event: ProviderSubscriptionEvent): Promise<{ subscription, eventStatus, eventId }>;
  createMockOrManualEntitlement(userId: string, planCode: BillingPlanCode, source: "mock" | "manual"): Promise<BillingSubscriptionEntity>;
}
```

### Entitlement Resolution Rules

1. No subscription → FREE, no keys.
2. FREE plan → no keys regardless of status.
3. PLUS + "active" or "trialing" → all 4 standard entitlement keys.
4. PLUS + "past_due" / "canceled" / "incomplete" / "unpaid" → no keys.
5. If explicit entitlement grants exist, filter by revocation and expiry.
6. Entitlements resolved server-side; frontend localStorage becomes a cache.

### Test Coverage (25 tests)

- `resolveActiveEntitlementKeys` — null, FREE, active PLUS, trialing, canceled, past_due, incomplete, revoked grants, expired grants.
- `getCurrentEntitlementForUser` — new user defaults FREE, active sub → PLUS keys, canceled → no keys, user isolation.
- `upsertSubscriptionFromProviderEvent` — first event creates sub, duplicate event idempotent, cancel updates status, user isolation.
- `createMockOrManualEntitlement` — mock PLUS, manual FREE, cross-user safety.
- `billing status transitions` — all non-active statuses verified to deny entitlements.

### Remaining Work for Provider Integration

When the owner answers provider constraint questions (see `guidelines/PAID_MVP_PROVIDER_DECISION.md` Section 4):

1. **Mongo repository**: Wire `BillingSubscriptionRepository` and `BillingEventRepository` interfaces to the Mongoose models.
2. **Routes**: Add `POST /billing/checkout`, `POST /billing/webhook`, `POST /billing/portal`.
3. **Provider adapter**: Implement provider-specific checkout/portal creation behind the repository interface.
4. **Webhook handler**: Verify provider signature, parse event, call `upsertSubscriptionFromProviderEvent`.
5. ~~**Frontend entitlement boot**: On login, fetch entitlements from backend instead of localStorage.~~ → **Done** (see below).
6. **Disable local fallback**: In real billing mode, `upgradePlanLocally()` and `startTrialLocally()` must not unlock features.

## Server-Authoritative Entitlement API

Last updated: 2026-05-01

### Endpoint

`GET /api/billing/entitlement` — auth required.

Response shape:

```json
{
  "success": true,
  "data": {
    "planCode": "FREE" | "PLUS",
    "status": "none" | "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid",
    "entitlements": ["premium_templates", ...],
    "source": "default" | "mock" | "manual" | "provider",
    "currentPeriodEnd": null,
    "resolvedAt": "2026-05-01T03:28:00.000Z"
  }
}
```

No provider secrets exposed (no providerCustomerId, providerSubscriptionId, payloadHash).

### Backend Files

| File | Purpose |
|---|---|
| `backend/src/controllers/billingController.ts` | Controller for GET /api/billing/entitlement |
| `backend/src/routes/billingRoutes.ts` | Route registration |
| `backend/src/services/billingServiceInstance.ts` | Singleton BillingService with in-memory repos |
| `backend/src/tests/billingRoutes.test.ts` | 6 route-level tests |

### Frontend Client

| File | Purpose |
|---|---|
| `src/lib/api/billingApi.ts` | `fetchServerEntitlement()`, `hasServerPremiumAccess()`, `hasServerEntitlement()` |

### Demo vs Real Mode Behavior

| Scenario | Behavior |
|---|---|
| **Demo mode** | `fetchServerEntitlement()` returns `null` immediately — no backend call. Local/mock entitlements from `localStorage` are used. |
| **Real mode + authenticated** | Calls `GET /api/billing/entitlement`. Server response is the entitlement authority. |
| **Real mode + backend failure** | Returns `null`. Caller must NOT unlock premium. Safe fallback = no premium access. |
| **Real mode + unauthenticated** | API returns 401. Frontend returns `null`. No premium. |
| **Mock checkout** | Unchanged. Demo mode still uses `mock_provider` with local upgrade. |

### Test Coverage

Backend (6 new route tests):
- 401 unauthorized
- New user → FREE, no entitlements
- Active Plus user → PLUS, 4 entitlements
- Canceled subscription → PLUS status but no active entitlements
- Cross-user isolation
- No provider secrets in response

### Architecture Notes

- Backend uses in-memory repositories for now. Switch to Mongo when `MongoSubscriptionRepository` is implemented.
- Frontend `billingApi.ts` is a pure utility module — no React hooks. Consumers (hooks, pages) can call it and merge with local state as needed.
- The API does not modify local state. It is read-only. State application (writing to localStorage) is left to the existing `applyBillingAccessPayload` flow.

---

## Provider-Agnostic Payment Adapter (Added 2026-05-01)

### What Was Added

1. **`PaymentProviderAdapter` interface** (`backend/src/services/paymentProviderAdapter.ts`)
   - `createCheckoutSession` � create a checkout URL
   - `verifyWebhookSignature` � validate webhook authenticity before parsing
   - `parseWebhookEvent` � transform provider payload into `NormalizedProviderEvent`
   - `mapSubscriptionStatus` � pure function mapping provider status to domain
   - `createCustomerPortalSession` � optional self-service portal
   - Error types: `PaymentProviderNotConfiguredError`, `PaymentProviderError`

2. **Mock adapter** (`backend/src/services/mockPaymentAdapter.ts`)
   - Implements full adapter interface without external API calls
   - `createMockWebhookBody()` helper for test webhook simulation
   - Safe for dev/test/demo

3. **Provider registry** (`backend/src/services/paymentProviderRegistry.ts`)
   - Resolves adapter from `BILLING_PROVIDER` env var
   - Supported values: `mock` (default), `stripe`, `payos`, `momo`, `vnpay`
   - Missing/unknown env falls back to mock (app never crashes)
   - Placeholder adapter for unconfigured providers (all methods throw safe error)
   - `isPaymentProviderReady()` � returns false for mock/placeholder

4. **Tests** (`backend/src/tests/paymentProviderAdapter.test.ts`)
   - 21 tests covering: mock checkout, webhook verify/parse, status mapping,
     portal, entitlement gating (checkout alone does NOT unlock), registry
     env resolution, placeholder safe errors, pure status mapping

### Key Safety Rules

- **Entitlement requires webhook**: `createCheckoutSession` alone does NOT grant entitlements. Only `BillingService.upsertSubscriptionFromProviderEvent` (called after webhook verification) unlocks features.
- **No secrets in code**: All provider credentials from env vars.
- **No crash on missing config**: Placeholder adapter returns safe errors.
- **Mock is default**: Demo/local always works without any billing env.

### Next Steps to Add a Real Provider

1. Choose provider and set `BILLING_PROVIDER` env var.
2. Create `backend/src/services/{provider}PaymentAdapter.ts` implementing `PaymentProviderAdapter`.
3. Add provider-specific env validation in the adapter constructor.
4. Add webhook endpoint route (`POST /api/billing/webhook/{provider}`).
5. Wire adapter into registry switch statement.
6. Add integration tests with provider test/sandbox keys.
7. Do NOT remove mock adapter � keep for dev/test.

---

## Real Checkout Flow (Added 2026-05-01)

### What Was Added

1. **Backend endpoint: `POST /api/billing/checkout-session`** (`backend/src/controllers/billingController.ts`)
   - Auth required (Firebase token)
   - Validates: `planCode` allowlist (only PLUS), `returnUrl`/`cancelUrl` format and origin
   - Calls `PaymentProviderAdapter.createCheckoutSession()`
   - Returns: `{ checkoutSessionId, checkoutUrl, provider, expiresAt, currentEntitlement }`
   - **Does NOT grant entitlement** � response includes `currentEntitlement` proving plan is still FREE
   - Unconfigured provider returns 503 with `provider_not_configured` error code

2. **Backend route** (`backend/src/routes/billingRoutes.ts`)
   - `POST /api/billing/checkout-session` added alongside existing `GET /api/billing/entitlement`

3. **Frontend: real checkout flow** (`src/app/utils/production/billingProvider.ts`)
   - In `api_contract` mode with `VITE_API_BASE_URL` configured:
     - Calls `POST /api/billing/checkout-session` via `apiClient`
     - Returns `redirect_required` with `checkoutUrl` for provider redirect
     - **Does NOT unlock entitlement from checkout response**
   - If backend fails, falls back to legacy `BILLING_CHECKOUT_ENDPOINT` flow
   - If offline, falls back to local checkout
   - Demo mode: unchanged mock checkout behavior

4. **Frontend: return URL handling** (`src/app/pages/BillingPlan.tsx`)
   - When returning from checkout (`?status=success`) in real mode:
     - Shows pending banner with spinner
     - Polls `GET /api/billing/entitlement` via `syncEntitlementsWithProvider()`
     - Only updates local state if server confirms PLUS
     - Shows confirmed/failed banner with retry option
   - **Return URL alone does NOT unlock premium** � server must confirm
   - Clears URL params after processing to prevent re-trigger

5. **Tests** (`backend/src/tests/billingRoutes.test.ts`)
   - 7 new checkout-session tests: 401, invalid plan, FREE plan, missing URLs, session creation, entitlement NOT granted, unconfigured provider 503

### Security Properties

- Checkout session creation ? entitlement grant
- Return URL ? entitlement grant
- Only verified webhook event (via `BillingService.upsertSubscriptionFromProviderEvent`) grants entitlement
- localStorage is never the authority for paid entitlements in real mode
- Origin validation prevents returnUrl/cancelUrl pointing to external domains

### Demo vs Real Mode Behavior

| Action | Demo mode | Real mode |
|--------|-----------|-----------|
| Upgrade CTA | Mock checkout (local) | Backend checkout session ? provider redirect |
| Entitlement source | localStorage | Server (`GET /api/billing/entitlement`) |
| Return URL | N/A | Polls server, shows pending banner |
| Mock checkout | Works normally | Skipped if API configured |

---

## Webhook Billing Endpoint (Added 2026-05-01)

### What Was Added

1. **Webhook controller** (`backend/src/controllers/webhookController.ts`)
   - `POST /api/billing/webhook/:provider`
   - Signature verification via `adapter.verifyWebhookSignature()` BEFORE any processing
   - Event parsing via `adapter.parseWebhookEvent()`
   - Idempotent processing via `BillingService.upsertSubscriptionFromProviderEvent()`
   - Handles: checkout_completed, subscription_created, subscription_updated, subscription_canceled, subscription_expired, payment_succeeded, payment_failed
   - `payment_failed` forces status to `past_due` � never grants entitlements
   - `subscription_canceled`/`subscription_expired` forces status to `canceled`
   - Unknown event types acknowledged with 200 (no processing, no retry)
   - Missing `userId` acknowledged with 200 and ignored
   - Non-active provider acknowledged with 200

2. **Webhook routes** (`backend/src/routes/webhookRoutes.ts`)
   - Mounted BEFORE `authMiddleware` in route chain
   - Providers send webhooks directly � no Firebase auth required
   - Signature verification is the security gate

3. **Route mounting** (`backend/src/routes/index.ts`)
   - `webhookRoutes` mounted after `healthRoutes`, before `authMiddleware`

4. **Signature-checking mock adapter** (`backend/src/services/mockPaymentAdapter.ts`)
   - `createMockPaymentAdapterWithSignature()` requires `X-Mock-Signature` header
   - Used for testing signature rejection without a real provider

5. **Tests** (`backend/src/tests/webhookRoutes.test.ts`)
   - 11 tests: valid event, duplicate idempotent, cancel revokes entitlements, payment_failed no entitlements, unknown event acknowledged, no userId ignored, non-active provider, no auth needed, signature reject/accept/missing

### Security Properties

1. **Signature verification first**: `verifyWebhookSignature()` called BEFORE `parseWebhookEvent()`
2. **No raw body logging**: Only safe metadata logged (provider, eventType, eventId, userId)
3. **No raw body persistence**: Only SHA-256 `payloadHash` stored in BillingEvent
4. **No auth bypass**: Webhook routes use signature verification instead of Firebase auth
5. **No entitlement from checkout/return URL**: Only verified webhook events grant entitlements
6. **payment_failed safety**: Forced to `past_due` status regardless of event payload
7. **Idempotent**: Duplicate `providerEventId` returns 200 no-op
8. **No provider SDK**: Uses adapter interface � provider logic isolated in adapters
9. **Graceful unknown events**: Returns 200 to prevent provider retries on unhandled types

---

## Subscription Management � Portal & Cancel (Added 2026-05-02)

### What Was Added

1. **Backend: `POST /api/billing/customer-portal`** (`billingController.ts`)
   - Auth required
   - Returns `portalUrl` if provider supports self-service portal
   - Returns `supported: false` with support email if provider does not support portal
   - Returns `supported: false` if user has no premium subscription
   - Does NOT modify entitlements

2. **Backend: `POST /api/billing/subscription/cancel`** (`billingController.ts`)
   - Auth required
   - Soft cancel: sets `cancelAtPeriodEnd = true`
   - Does NOT immediately remove entitlements � user keeps access until period end
   - Returns `already_canceled` or `already_pending_cancel` for idempotency
   - Response includes full `currentEntitlement` snapshot

3. **Backend service** (`billingService.ts`)
   - `getSubscriptionForUser(userId)` � returns raw subscription
   - `markCancelAtPeriodEnd(userId)` � sets cancel flag without revoking entitlements

4. **Backend routes** (`billingRoutes.ts`)
   - `POST /api/billing/customer-portal`\n   - `POST /api/billing/subscription/cancel`

5. **Backend entitlement endpoint enhanced** (`GET /api/billing/entitlement`)
   - Now returns `currentPeriodEnd` and `cancelAtPeriodEnd` from subscription

6. **Frontend: portal via backend** (`billingProvider.ts`)
   - `openBillingCustomerPortal()` prefers `POST /api/billing/customer-portal` in real mode
   - Falls back to legacy flow if backend unavailable

7. **Frontend: cancel subscription** (`billingProvider.ts`)
   - `cancelSubscriptionOnServer()` calls `POST /api/billing/subscription/cancel`
   - Only works in real mode with backend configured
   - Handles offline/error gracefully

8. **Frontend UI** (`BillingPlan.tsx`)
   - Cancel button with confirmation dialog for PLUS users in real mode
   - Confirmation warns user keeps access until period end
   - Manage billing button shows in real mode even without legacy endpoint
   - Entitlement labels distinguish real mode (server) vs demo (local)

9. **Tests** (`billingRoutes.test.ts`)
   - Portal: 401, unsupported for FREE, portalUrl for PLUS
   - Cancel: 401, 400 for FREE, marks cancelAtPeriodEnd, keeps entitlements, duplicate idempotent

### Cancel Policy

- Cancel = soft cancel at period end
- Entitlements remain active until `currentPeriodEnd`
- Final revocation happens via webhook (`subscription_expired` / `subscription_canceled`)
- No immediate data deletion
- No refund logic implemented

---

## Entitlement Reconciliation Tool (Added 2026-05-02)

### Purpose

Detects and fixes mismatches between subscription records and their entitlement grants without manual DB intervention.

### Files

- `backend/src/services/billingReconciliation.ts` � Pure reconciliation service
- `backend/scripts/reconcile-entitlements.ts` � CLI tool
- `backend/src/tests/billingReconciliation.test.ts` � 15 tests

### CLI Usage

```bash
# Dry-run all users (default � no writes)
npm --prefix backend run reconcile:entitlements

# Fix all mismatches
npm --prefix backend run reconcile:entitlements -- --write

# Check specific user
npm --prefix backend run reconcile:entitlements -- --user uid123

# Fix specific user
npm --prefix backend run reconcile:entitlements -- --user uid123 --write
```n
### Reconciliation Rules

| Subscription State | Expected Entitlements |
|---|---|
| active/trialing PLUS | Full 4 PLUS keys |
| canceled/past_due/incomplete/unpaid | None |
| expired currentPeriodEnd on active | None |
| FREE plan | None |
| No subscription | None (FREE) |
| pending checkout (no webhook) | None |
| payment_failed | None |

### Dry-Run Policy

- Default is always dry-run (`--write` is opt-in)
- Dry-run shows mismatches and exits with code 1 if any found
- Write mode applies fixes and exits with code 0
- No sensitive data in output (no card numbers, no raw webhooks)
- No external provider API calls
- No deletion of billing events

### Constraints

- CLI currently uses in-memory repo (swap to Mongo when Mongo repos are ready)
- No admin UI for reconciliation
- No frontend changes
- Does not call payment provider external APIs

## Payment provider decision note

Recorded 2026-05-21. Documentation only; no code changed in this update.

- **Casso Standard expired.** Casso Standard registration for business `dear-our-feature` has expired. Casso must not be used for accepting real payments unless the Standard plan is renewed and inbound webhook delivery to `/api/billing/webhook/casso` is verified end-to-end (signature valid, `PaymentOrder` transitions `pending` -> `completed`, entitlements flip to PLUS).
- **PayOS migration is planned later.** PayOS is the intended next provider for VietQR-style bank transfer checkout once the Casso situation is resolved. Migration is **not** in scope yet.
- **PayOS is not currently implemented in code.** `backend/src/services/paymentProviderRegistry.ts:82` routes `payos` (and `momo`, `vnpay`) through `createPlaceholderAdapter(...)`. The placeholder is fail-closed:
  - `isConfigured: false`
  - `createCheckoutSession` rejects with `PaymentProviderNotConfiguredError`
  - `verifyWebhookSignature` returns `{ valid: false, reason: "payos not configured" }`
  - `parseWebhookEvent` throws `PaymentProviderNotConfiguredError`
  - `mapSubscriptionStatus` returns `null`; `createCustomerPortalSession` resolves `null`

  Setting `BILLING_PROVIDER=payos` in any environment therefore disables real checkout and webhook ingestion until the adapter is implemented.
- **Paid checkout stays disabled / mock / manual.** Until a real PayOS adapter is implemented and tested against a PayOS sandbox + live webhook delivery, paid checkout in real-mode production should remain disabled, mocked, or handled manually (e.g. ops-assisted bank transfer with manual entitlement grant via the reconciliation tooling). Do not flip `BILLING_PROVIDER=payos` and do not promote Casso back into the hot path without renewal + webhook verification.
- **No impact on 12-week setup Full GO.** This decision is scoped to the billing surface. The 12-week setup route replacement (`/12-week-setup` -> `TwelveWeekSetupLab`) is unaffected and remains Full GO per `docs/ux/12-week-setup-limited-rollout-monitoring.md`.

Cross-reference: see `docs/ops/billing-plan-smoke-timeout-follow-up.md` (Casso expiration investigation + payment provider decision note) for the smoke-context and code-path evidence behind this decision.

Action items (not implemented in this doc update):
1. Confirm Casso dashboard state for `dear-our-feature`; renew Standard + verify webhook health, or formally retire Casso.
2. Implement and test a real PayOS adapter (checkout session, webhook verify/parse, status mapping, optional customer portal stub) before flipping `BILLING_PROVIDER=payos`.
3. Until either of the above is complete, keep paid checkout entry points gated to demo / mock / manual paths in real-mode deployments and avoid promoting any "real payment" copy in production.

## Paid Checkout Kill-Switch

Recorded 2026-05-21. Mitigation for the Casso-expired / PayOS-not-ready window.

### Summary

A two-layer env kill-switch disables paid checkout entry points without removing routes, paywalls, or the billing settings page. Independent of `BILLING_PROVIDER` so a stale Casso config or a half-shipped PayOS migration cannot leak unsafe checkout.

- Frontend flag: `VITE_BILLING_PAID_CHECKOUT_DISABLED` (Vite, build-time).
- Backend flag: `BILLING_PAID_DISABLED` (Node, runtime).
- Both accept `1` / `true` / `yes` / `on` (case-insensitive). Anything else is treated as off.

### Frontend behavior when enabled

`src/app/utils/app-mode.ts:isPaidCheckoutDisabled()` returns `true`.

- `UpgradePaywallDialog`:
  - Renders a "Thanh toán đang tạm khóa" banner above plan cards with the support email link.
  - Disables every plan upgrade button.
  - Swaps button label to "Tạm khóa thanh toán".
  - `handleUpgrade(...)` returns early so the dialog cannot navigate to `/billing/confirm`.
- `/billing/confirm` (`src/app/pages/BillingConfirm.tsx`):
  - Renders the same banner above the form.
  - `handleConfirm(...)` returns early with an inline error before any POST.
  - Submit button label switches to "Tạm khóa thanh toán" and stays disabled.
  - No POST to `/billing/checkout-session` or `/billing/public-checkout-session`.
- `/billing/plan` (`src/app/pages/BillingPlan.tsx`):
  - Renders a banner under `PageHero` explaining the temporary lock.
  - `handleOpenUpgrade(...)` and `handleRenewPlan(...)` toast a support message and return early — the paywall dialog never opens.
  - Free→Plus, renewal-priority notice, current-plan renewal, and recommended-plan upgrade CTAs are all disabled with "Tạm khóa thanh toán" copy.
  - Existing entitlement, restore, sync, payment history, refund, and customer-portal flows remain reachable.

The 12-week setup, dashboard, and other product surfaces are unaffected.

### Backend behavior when enabled

`backend/src/controllers/billingController.ts:isPaidCheckoutDisabled()` returns `true`.

- `POST /api/billing/checkout-session` and `POST /api/billing/public-checkout-session` short-circuit with `ApiError(503, ..., "checkout_disabled")` before invoking `getPaymentProviderAdapter()`.
- No `PaymentOrder` row is created.
- No VietQR URL is generated.
- Other billing endpoints (`/billing/entitlement`, `/billing/payment-history`, `/billing/customer-portal`, `/billing/orders/.../refund-request`, `/billing/subscription/cancel`) keep working so existing paid users can self-serve.

### Defense-in-depth rationale

The two layers cover different failure modes:

- Frontend flag protects fresh real-mode visits and prevents the user from ever seeing a checkout UI when paid is disabled.
- Backend flag protects against:
  - Stale frontend bundles cached on the user's device or CDN.
  - Direct API hits from scripts, browser devtools, or third parties.
  - Demo previews accidentally pointed at the real backend.

Operationally: flip both flags. Verify with `curl -X POST .../api/billing/checkout-session` returning 503 `checkout_disabled` and `/billing/plan` rendering the banner.

### Why not just flip `BILLING_PROVIDER=payos`?

Setting `BILLING_PROVIDER=payos` does fail-close the money path (placeholder adapter rejects `createCheckoutSession`), but it leaks a technical English error to the user (`Payment provider "payos" is not configured...`) and still lets the frontend get all the way to `/billing/checkout/{orderId}` request, where it surfaces the raw error string. The kill-switch flags are layered above the provider router so the UX copy stays Vietnamese and account-bound.

### Re-enabling when PayOS adapter is ready

1. Implement and merge the PayOS adapter; verify checkout/webhook end-to-end on a sandbox.
2. Unset `BILLING_PAID_DISABLED` on Render; redeploy backend.
3. Unset `VITE_BILLING_PAID_CHECKOUT_DISABLED` on Vercel; redeploy frontend.
4. Smoke `/billing/plan` and a single test checkout to confirm the money path is healthy before announcing re-opening.

### Files

- `src/app/utils/app-mode.ts`
- `src/app/components/UpgradePaywallDialog.tsx`
- `src/app/pages/BillingConfirm.tsx`
- `src/app/pages/BillingPlan.tsx`
- `backend/src/controllers/billingController.ts`
- `.env.example`, `backend/.env.example`
- Cross-reference: `docs/ops/billing-plan-smoke-timeout-follow-up.md` (paid checkout exposure audit section).
