# PayOS Migration Plan

Status: plan only. PayOS is not implemented, not enabled, and not live.
Date: 2026-05-22
Scope: billing surface only. 12-week setup is Full GO and must not be changed by this migration.

## 1. Current Billing Status

- Production paid checkout is intentionally disabled while the provider migration is unresolved.
- Frontend billing remains mode-driven through `VITE_BILLING_PROVIDER_MODE`. Real production uses `api_contract` so frontend calls backend `/billing/*` endpoints instead of unlocking local entitlements.
- Backend provider selection is controlled by `BILLING_PROVIDER` in `backend/src/services/paymentProviderRegistry.ts`.
- `casso` is the only real-ish adapter currently implemented. It creates a local `PaymentOrder`, returns a VietQR image URL, and relies on Casso webhooks to mark the order completed.
- `payos`, `momo`, and `vnpay` currently resolve to placeholder adapters. The placeholders fail closed: checkout rejects, webhook verification returns invalid, event parsing throws, and status mapping returns `null`.
- Entitlements must not be granted from checkout creation or frontend return URLs. They are granted only after a verified provider event is processed by backend billing services.

## 2. Why Casso Is Retired/Paused

- Casso Standard for business `dear-our-feature` has expired, per the existing ops note.
- The Casso checkout path can still create a local VietQR order without calling Casso outbound, so users could pay even when inbound webhook delivery is unavailable.
- If Casso webhooks are disabled or degraded, money can land in the merchant bank account while `PaymentOrder` stays `pending` and PLUS entitlement never activates.
- That creates a high-risk money-loss/support path for real users.
- Casso must stay out of the real-payment hot path unless Standard is renewed and inbound webhook delivery is verified end-to-end.
- Migration target is PayOS, but PayOS must not be treated as live until sandbox and production webhook verification pass.

## 3. Current Kill-Switch State

Production is currently protected by two independent flags:

- Frontend: `VITE_BILLING_PAID_CHECKOUT_DISABLED=1`
- Backend: `BILLING_PAID_DISABLED=1`

Expected behavior while enabled:

- `UpgradePaywallDialog`, `/billing/plan`, and `/billing/confirm` block upgrade/renew CTAs and show support fallback copy.
- `/billing/confirm` must not POST to `/billing/checkout-session` or `/billing/public-checkout-session`.
- Backend `POST /api/billing/checkout-session` and `POST /api/billing/public-checkout-session` return HTTP 503 with `errorCode: "checkout_disabled"` before resolving any provider adapter.
- No `PaymentOrder` is created and no QR/payment instructions are generated.
- Existing entitlement, payment history, restore, refund request, and customer-portal fallback surfaces remain available.

These flags must remain enabled until PayOS implementation is merged, tested in sandbox, verified in production with a controlled transaction, and signed off for rollout.

## 4. PayOS Adapter Scope

Implement a real `PaymentProviderAdapter` in a new backend service file, likely `backend/src/services/payosPaymentAdapter.ts`. Do not replace the provider-agnostic interface unless PayOS requires fields that cannot be represented safely.

### createCheckoutSession

Required behavior:

- Validate adapter configuration before any provider call.
- Generate a unique PayOS-compatible order code or order id that can be mapped back to `PaymentOrder` and user id.
- Create a local `PaymentOrder` with:
  - `provider: "payos"`
  - `status: "pending"`
  - `userId`, `planCode`, `billingCycle`, `amount`, `currency: "VND"`
  - provider order/payment link identifiers when available
  - receipt email/name metadata
  - expiry timestamp if PayOS supports or returns one
- Call PayOS payment-link creation API/SDK with amount, description, return URL, cancel URL, and item details.
- Return `CheckoutSessionResult`:
  - `sessionId`: stable local order id or PayOS order code
  - `checkoutUrl`: PayOS checkout/payment link URL
  - `expiresAt`: provider expiry if available, otherwise local expiry
- Never grant PLUS entitlement in this method.
- Fail closed with `PaymentProviderNotConfiguredError` or `PaymentProviderError` if PayOS config, amount, order creation, or provider response is invalid.

### verifyWebhookSignature

Required behavior:

- Verify PayOS webhook authenticity using PayOS checksum/signature requirements and `PAYOS_CHECKSUM_KEY` or provider-approved equivalent.
- Use raw body when PayOS verification requires exact raw payload bytes. If PayOS SDK verifies parsed data, still preserve raw body for payload hashing.
- Use timing-safe comparison for manual HMAC/checksum verification if not using official SDK verification.
- Return `{ valid: false, reason }` for missing config, missing signature/checksum, malformed payload, or mismatch.
- Never parse and process a webhook event before signature verification passes.

### parseWebhookEvent

Required behavior:

- Parse only verified payloads.
- Compute `payloadHash` as SHA-256 of the raw body string/buffer used by the webhook handler.
- Extract provider event id from a stable PayOS id if present. If PayOS lacks event ids, build a deterministic id from provider order code, transaction/reference id, status, and payload hash.
- Populate `userId` from PayOS metadata/custom data if PayOS can echo it back safely. If PayOS payload only includes order code/description, plan a backend change because current `parseWebhookEvent(rawBody)` is synchronous and cannot perform a `PaymentOrder` database lookup by itself.
- Map successful paid events to:
  - `eventType: "checkout_completed"` or `"payment_succeeded"`
  - `status: "active"`
  - `planCode: "PLUS"`
  - `billingCycle: "twelve_week"`
  - `currentPeriodStart: now or provider-paid timestamp`
  - `currentPeriodEnd: +12 weeks`
- Map canceled/expired/failed events to non-granting event/status values.
- Return `unknown` for unsupported PayOS event types and acknowledge them without entitlement changes.
- Do not log raw webhook bodies or secrets.

### mapSubscriptionStatus

PayOS is expected to behave as one-time payment links, not native subscriptions. Mapping should represent payment/order lifecycle rather than recurring subscription lifecycle.

Proposed initial mapping, pending PayOS sandbox payload confirmation:

- `PAID`, `SUCCESS`, `COMPLETED` -> `active`
- `PENDING`, `PROCESSING` -> `incomplete`
- `CANCELLED`, `CANCELED`, `EXPIRED` -> `canceled`
- `FAILED` -> `past_due` or `unpaid` depending on existing billing-domain semantics
- Unknown values -> `null`

For PLUS access, one successful PayOS payment should create a 12-week active entitlement period. Renewals are new one-time payments, not provider-managed recurring subscriptions.

## 5. Required PayOS Env Vars

Exact names must be confirmed against the PayOS dashboard, SDK, and API docs before implementation. Proposed backend env names:

- `BILLING_PROVIDER=payos`
- `BILLING_REPOSITORY=mongo`
- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`
- `PAYOS_ENV=sandbox|production` or equivalent if the SDK/API needs explicit environment selection
- `PAYOS_API_BASE_URL` only if PayOS does not infer base URL from environment
- `PLUS_PRICE_VND=99000` or current approved 12-week price
- `FRONTEND_ORIGIN=https://...` for return/cancel URL origin validation
- `BILLING_SUPPORT_EMAIL` for payment support copy and receipt reply-to

Frontend/env already needed for real mode:

- `VITE_APP_MODE=real`
- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL=PayOS`
- `VITE_BILLING_SUPPORT_EMAIL`
- `VITE_API_BASE_URL`
- `VITE_BILLING_PAID_CHECKOUT_DISABLED=1` until final rollout sign-off

Operational PayOS dashboard/config values:

- Webhook URL: `https://<backend-domain>/api/billing/webhook/payos`
- Return URL pattern: frontend billing success/processing route
- Cancel URL pattern: frontend billing plan route
- Merchant/bank account details verified in PayOS dashboard

Do not store API keys, checksum keys, or merchant secrets in source code or docs.

## 6. Backend Changes Needed

- Add `backend/src/services/payosPaymentAdapter.ts` implementing `PaymentProviderAdapter`.
- Update `backend/src/services/paymentProviderRegistry.ts` so `BILLING_PROVIDER=payos` returns the real PayOS adapter instead of `createPlaceholderAdapter("payos")`.
- Keep `PaymentProviderAdapter` provider-agnostic where possible. If PayOS requires order lookup during event parsing, choose a small explicit extension such as async `parseWebhookEvent`, a provider-specific PayOS webhook controller, or a pre-parse lookup helper instead of hiding database access inside a synchronous adapter method.
- Confirm raw body capture works for PayOS webhook verification. Current generic webhook handler uses `(req as { rawBody?: Buffer }).rawBody` when available and falls back to `JSON.stringify(req.body)`. PayOS verification must define whether this fallback is safe.
- Keep existing PayOS routes in `backend/src/routes/webhookRoutes.ts`:
  - `POST /api/webhooks/payos` via mounted `/api`
  - `POST /api/billing/webhook/payos`
- Ensure `validateWebhookProviderParam` accepts `payos`; add PayOS-specific payload validation only after real sandbox payloads are known.
- Extend `PaymentOrderModel` only if needed for PayOS identifiers such as `payosOrderCode`, `paymentLinkId`, `checkoutUrl`, `providerTransactionId`, or cancellation fields. Current order serialization is Casso-shaped (`bankAccount`, `bankName`, `accountName`, `qrDataUrl` required), so PayOS may need nullable/provider-neutral fields or a separate hosted-checkout status shape.
- Ensure order status transitions are idempotent and replay-safe. Duplicate webhooks must not double-grant PLUS.
- Update `getCheckoutInfo`, `getOrderStatus`, public order status, and payment-history surfaces if provider label, bank fields, QR image fields, or payment method currently hardcode Casso/VietQR copy.
- Update env examples and Render env declarations only during implementation, not in this planning task.
- Ensure receipt delivery still runs after confirmed PayOS payment, using local order metadata.
- Add monitoring events/tags for `provider: "payos"`, signature failures, payload parse failures, amount mismatch, no matching order, duplicate webhook, and successful entitlement grant.

## 7. Frontend Changes Needed

- Keep kill-switch behavior unchanged until rollout.
- Update `/billing/confirm` copy from Casso-specific QR language to provider-neutral PayOS/payment-link language:
  - button labels currently mention creating QR
  - method row currently names Casso/VietQR
  - trust copy currently says Casso confirms the transaction
- Update `BillingConfirm.handleConfirm` behavior. It currently ignores `checkoutUrl` and navigates to `/billing/checkout/{checkoutSessionId}`. For PayOS, it should redirect to returned `checkoutUrl` or open the PayOS hosted checkout path, unless a local PayOS status page is intentionally built.
- Keep `src/app/utils/production/billingProvider.ts` behavior that treats non-`casso` providers as external redirects via `result.checkoutUrl`.
- Confirm `/billing/checkout/:orderId` remains Casso/local-order specific or make it provider-neutral if PayOS returns users there after payment.
- After PayOS return, sync entitlements through `GET /api/billing/entitlement`; do not unlock based on `returnUrl` query params.
- Show a processing state after return because webhook delivery may lag behind browser redirect.
- Update plan/paywall/provider label copy to `PayOS` only after sandbox verification.
- Ensure public checkout, authenticated checkout, and renewal flows share the same provider-aware handling.
- Keep mock checkout route gated to demo/mock mode only.

## 8. Webhook Flow

Target flow:

1. User selects PLUS and confirms terms/email.
2. Frontend calls `POST /api/billing/checkout-session` or `POST /api/billing/public-checkout-session` only when kill-switch is off.
3. Backend validates auth or public client id, plan code, billing cycle, and URL origins.
4. PayOS adapter creates local pending `PaymentOrder` and PayOS payment link.
5. Frontend redirects user to PayOS checkout URL.
6. User completes or cancels payment on PayOS.
7. PayOS sends webhook to `/api/billing/webhook/payos` or `/api/webhooks/payos`.
8. Generic webhook controller verifies provider matches active `BILLING_PROVIDER=payos`.
9. PayOS adapter verifies signature/checksum before event parsing.
10. Adapter parses payload, finds local order by order code/description/provider id, validates amount and status, and returns `NormalizedProviderEvent`.
11. `billingService.upsertSubscriptionFromProviderEvent(...)` idempotently creates/updates subscription and entitlement grants.
12. Local `PaymentOrder` is marked completed/failed/expired as needed, and receipt delivery runs for successful payment.
13. Frontend return/processing page polls or triggers entitlement sync until server authority shows PLUS or timeout/support fallback.

Safety rules:

- Browser redirect is not proof of payment.
- Webhook with invalid signature is rejected with 401.
- Unknown events are acknowledged but ignored.
- Failed/canceled/expired events must not grant entitlement.
- Duplicate events must return 200 and no-op.

## 9. Tests Needed

Backend unit tests:

- PayOS adapter config readiness: missing each required env fails closed.
- `createCheckoutSession` creates pending `PaymentOrder`, calls PayOS with correct amount/description/URLs, returns checkout URL, and does not grant entitlement.
- Provider errors map to safe `PaymentProviderError`/503 behavior.
- Signature verification accepts valid PayOS payload and rejects missing/invalid signatures/checksums.
- `parseWebhookEvent` maps successful, pending, failed, canceled, expired, and unknown PayOS payloads correctly.
- `mapSubscriptionStatus` covers all known PayOS statuses and unknown values.
- Amount mismatch and missing order do not grant entitlement.

Backend route tests:

- `POST /api/billing/checkout-session` still returns `checkout_disabled` when `BILLING_PAID_DISABLED=1`, even with PayOS configured.
- With kill-switch off and PayOS configured, checkout returns provider `payos` plus PayOS checkout URL.
- `POST /api/billing/webhook/payos` rejects invalid signature.
- Valid success webhook grants PLUS once.
- Duplicate webhook is acknowledged without duplicate grants.
- Failed/canceled webhook does not grant PLUS.
- Active provider mismatch is acknowledged/ignored as current generic handler intends.

Frontend tests:

- Kill-switch still blocks `/billing/plan`, paywall dialog, and `/billing/confirm` before any checkout POST.
- `/billing/confirm` uses returned `checkoutUrl` for `payos` instead of navigating to Casso local checkout path.
- PayOS return/processing path does not unlock until entitlement sync returns PLUS.
- Provider-neutral copy no longer says Casso when provider label is PayOS.
- Public checkout path includes `clientUserId` and handles external checkout URL.

Operational/smoke tests:

- `npm --prefix backend run typecheck`
- `npm --prefix backend run build`
- backend PayOS-specific tests
- `npm run typecheck`
- `npm run test:run` for touched frontend surfaces
- `npm run build`
- production/staging smoke after sandbox verification

## 10. Sandbox Verification Checklist

Before production rollout:

- PayOS sandbox account approved and test merchant/bank details verified.
- Sandbox env vars set only in staging/preview backend; no secrets committed.
- `BILLING_PROVIDER=payos` set in sandbox backend.
- Keep kill-switch on for production while sandbox runs.
- Create authenticated checkout session for PLUS.
- Confirm local `PaymentOrder` created with provider `payos`, pending status, correct amount, correct user id, and expiry.
- Confirm frontend redirects to PayOS checkout URL.
- Complete sandbox payment.
- Confirm PayOS webhook reaches backend route.
- Confirm signature/checksum verification passes only for valid webhook.
- Confirm `PaymentOrder` transitions `pending` -> `completed`.
- Confirm `BillingSubscription` becomes PLUS/active with 12-week period.
- Confirm entitlement endpoint returns PLUS and expected entitlement keys.
- Confirm receipt delivery path runs or queues safely.
- Confirm duplicate webhook no-ops.
- Confirm canceled/expired/failed sandbox payment does not grant PLUS.
- Confirm return URL shows processing/success based on server entitlement, not URL params.
- Confirm payment history shows PayOS order without Casso-only copy.
- Confirm logs/monitoring contain safe metadata and no secrets/raw webhook bodies.

## 11. Production Rollout Steps

Do not start until sandbox checklist passes.

1. Merge PayOS adapter and tests with kill-switch defaults unchanged.
2. Add PayOS env vars to Render production without disabling `BILLING_PAID_DISABLED`.
3. Update Vercel provider label/copy env as needed, keeping `VITE_BILLING_PAID_CHECKOUT_DISABLED=1`.
4. Deploy backend with `BILLING_PROVIDER=payos`, `BILLING_REPOSITORY=mongo`, PayOS secrets, and `BILLING_PAID_DISABLED=1` still active.
5. Configure PayOS production webhook URL to `/api/billing/webhook/payos`.
6. Verify backend health, billing health, and direct checkout POST still returns `checkout_disabled` while kill-switch is on.
7. Run production smoke for non-money billing surfaces: `/billing/plan`, entitlement, payment history, restore, support copy.
8. Schedule a controlled payment window.
9. Temporarily disable backend kill-switch only for controlled test, or use a private/staging production-like environment if supported.
10. Run one small real transaction with owner-approved amount and account.
11. Verify webhook, order completion, PLUS entitlement, receipt, payment history, and monitoring.
12. If successful, unset `BILLING_PAID_DISABLED` on Render and redeploy.
13. Unset `VITE_BILLING_PAID_CHECKOUT_DISABLED` on Vercel and redeploy.
14. Run full billing smoke and one final controlled checkout.
15. Monitor checkout errors, webhook failures, pending order count, entitlement sync errors, and support inbox for at least 24 hours.

## 12. Rollback Plan

Immediate rollback if webhook failures, amount mismatches, pending orders, entitlement grants, or user reports indicate unsafe payment behavior:

1. Set `VITE_BILLING_PAID_CHECKOUT_DISABLED=1` on Vercel and redeploy.
2. Set `BILLING_PAID_DISABLED=1` on Render and redeploy.
3. Keep `BILLING_PROVIDER=payos` or switch to placeholder/mock only if doing so does not break webhook processing for already-paid PayOS orders.
4. Do not delete PayOS webhook route while unresolved PayOS payments may still send events.
5. Export/list pending PayOS `PaymentOrder` records for manual reconciliation.
6. Manually verify PayOS dashboard transactions against local orders.
7. Grant or revoke entitlements through approved admin/reconciliation tooling only after transaction proof.
8. Notify affected users through support email if any payment succeeded without entitlement activation.
9. Keep Casso disabled unless it has been separately renewed and verified.
10. Document incident timeline, failed event ids/order codes, remediation, and next safe rollout condition.

## 13. Explicit Non-Goals

- Do not implement PayOS in this planning task.
- Do not change source code in this planning task.
- Do not turn off `VITE_BILLING_PAID_CHECKOUT_DISABLED` or `BILLING_PAID_DISABLED` in this planning task.
- Do not claim PayOS is live, production-ready, or accepting real payments.
- Do not reactivate Casso for real payments unless its Standard plan and webhook delivery are verified separately.
- Do not touch 12-week setup, 12-week execution, plan generation, or sync behavior for this migration.
- Do not add new payment providers beyond PayOS.
- Do not add native recurring subscription semantics. PayOS scope is one-time payment per 12-week cycle unless business requirements change.
- Do not grant entitlements from frontend redirects, checkout-session responses, localStorage writes, or manual URL params.
- Do not hardcode secrets, merchant credentials, bank account details, or test credentials.
- Do not create public copy saying payments are open until production rollout is completed and monitored.

## Open Questions Before Implementation

- Which exact PayOS package/API version will be used, and what are its canonical env names?
- Does PayOS webhook verification require raw request bytes, parsed JSON, or SDK-specific data shape?
- What stable PayOS field should become `providerEventId` for idempotency?
- What PayOS field should map to local `PaymentOrder.orderId`: `orderCode`, description, payment link id, or transaction id?
- Does PayOS support payment-link expiry, cancellation, and failed-payment webhooks in sandbox?
- What exact status strings does PayOS send for paid/canceled/expired/failed states?
- Should PayOS checkout be fully hosted externally, or should the app keep a local payment-instructions/status page?
- How should public checkout map anonymous `clientUserId` to later account login/restore after PayOS success?
- Who owns manual reconciliation when PayOS webhook is delayed or absent?
- What production amount should be used for the first controlled real transaction?
