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
