# Billing `/billing/plan` Smoke Timeout — Follow-up

Status: **OPEN — under investigation**
Scope: billing surface only. Not attributed to release `d8b35b71` (12-week setup route replacement).

## 1. Observed failure

- Command: `npm run smoke:prod:quick`
- Result: 4/5 steps passed.
- Failing step: `/billing/plan` payment-history hydration.
- Symptom: hydration wait condition exceeded timeout.
- Timeout: `30000ms`.
- Other smoke steps (including the 12-week setup route mapping and demo-copy leak check) passed.

## 2. Why this is treated as separate from `d8b35b71`

- `d8b35b71` ships the 12-week setup route replacement (`/12-week-setup` -> `TwelveWeekSetupLab`).
- The change does not touch `/billing/plan`, payment-history fetching, billing provider wiring, or backend `/billing/*` endpoints.
- Production route smoke for the 12-week setup route mapping passed independently.
- Demo-copy leak check passed.
- Failure is isolated to the billing surface and shares no code path or deployment artifact specific to the 12-week setup change.

Conclusion: tracked as an independent billing-surface issue. Does not block the 12-week setup Full GO route replacement.

## 3. Suspected causes

Ranked by likelihood given Render + smoke harness behavior:

- **Render cold start.** Backend dyno cold-start can exceed the 30s smoke wait when the billing route is the first protected call after idle. Typical cold-start cost on Render free / low tier can stack with Firebase Admin init and Mongo connection warm-up.
- **`payment-history` endpoint latency.** Endpoint may be slow under cold cache, large history, or upstream provider call (if it queries provider records rather than local mirror). Worth measuring p50 / p95 latency.
- **Frontend wait condition too strict.** Smoke harness may wait on a specific DOM marker or network-idle condition that is sensitive to slow hydration. A real user would likely see a loading state and recover; the smoke harness does not.

Other lower-likelihood factors to keep in mind:

- Firebase Admin token verification path delays on cold start.
- Mongo connection pool warm-up on a freshly woken dyno.
- Transient network blip between Vercel and Render.

## 4. Suggested next checks

In order:

1. **Rerun billing smoke after backend warmup.**
   - Hit a cheap backend health endpoint first to warm the dyno.
   - Rerun `npm run smoke:prod:quick`.
   - If `/billing/plan` now passes, primary cause is cold start.
2. **Inspect Render logs around the failed run.**
   - Look for cold-start markers, Firebase Admin init time, Mongo connect time.
   - Look for slow query / slow handler logs on `payment-history`.
3. **Inspect `payment-history` endpoint latency.**
   - Measure p50 / p95 server-side handler time on warm and cold dynos.
   - Check whether the endpoint hits the provider live or reads a local mirror; prefer local mirror for hot-path reads.
4. **Decide whether to adjust smoke timeout or improve loading state.**
   - If cold start is unavoidable on the deploy tier: extend smoke timeout for the billing step, or add an explicit warmup step in `smoke:prod:quick`.
   - If hydration timing is fragile: improve frontend loading state so the wait condition resolves on a stable signal (e.g. data-attribute on the hydrated section) rather than network-idle.
   - If endpoint latency is the root cause: optimize the query / cache the response, do not paper over with a longer timeout.

## Casso Standard expiration investigation

Triggered by a Casso email indicating that the Standard registration for business `dear-our-feature` has expired. Question: does this contribute to the `/billing/plan` smoke timeout at payment-history hydration?

### Evidence

- Casso email: Standard registration for `dear-our-feature` has expired. Webhook / API capabilities tied to the Standard tier may be downgraded or disabled until renewal. Exact dashboard state has **not** been verified by ops at the time of writing.

### Production billing dependency on Casso

- `render.yaml:23-24` pins production to `BILLING_PROVIDER=casso`.
- `render.yaml:25-36` declares the Casso env vars (`CASSO_WEBHOOK_SECRET`, `CASSO_BANK_ACCOUNT`, `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NAME`, `PLUS_PRICE_VND`) as `sync: false` host secrets. Render env values cannot be inspected from the repo; assumption is that they were set when production cut over to Casso. To be re-verified manually if the smoke regresses again.
- Provider resolution: `backend/src/services/paymentProviderRegistry.ts:65` returns `createCassoPaymentAdapter()` when `BILLING_PROVIDER=casso` and the adapter env is present; otherwise falls back to mock with a warn log. Production therefore expects the Casso adapter to be active.
- Adapter usage paths that touch Casso live infrastructure:
  - `createCheckoutSession` (`backend/src/services/cassoPaymentAdapter.ts:151`) — generates a VietQR URL and inserts a `PaymentOrder` row. No outbound Casso API call. VietQR image is fetched by the user's browser, not the backend.
  - `verifyWebhookSignature` / `parseWebhookEvent` (`backend/src/services/cassoPaymentAdapter.ts:203,223`) — invoked only when Casso POSTs to `/api/billing/webhook/casso`. Inbound from Casso to us.
- There is no scheduled job or hot-path read that calls Casso outbound from our backend.

### Direct dependency of `/billing/payment-history` on Casso

- Route: `backend/src/routes/billingRoutes.ts:97` -> `getPaymentHistory`.
- Handler: `backend/src/controllers/orderStatusController.ts:140-197`.
  - `PaymentOrderModel.updateMany` to mark expired pending orders.
  - `PaymentOrderModel.find(...).sort({ createdAt: -1 }).limit(20).lean()`.
  - `RefundRequestModel.find(...)` for matching refund metadata.
  - Pure Mongo reads. No Casso SDK call, no `fetch` to `*.casso.vn`, no provider adapter invocation.
- Frontend caller: `src/app/pages/BillingPlan.tsx:280` -> `apiClient.get("/billing/payment-history")`. Single HTTP GET, no provider-specific fan-out.

Conclusion: `/billing/payment-history` does not hit Casso at request time. The endpoint is independent of Casso Standard tier status.

### Expected impact if Casso webhook/API is disabled

- New paid checkouts would still create `PaymentOrder` rows (insert is local) and the user would still see a VietQR.
- The bank transfer would land in the merchant account, but the inbound webhook to `/api/billing/webhook/casso` would stop firing if Casso disabled webhook delivery for the expired plan.
- Effect: pending orders would not transition to `completed`. Entitlements would not flip to PLUS. `/billing/payment-history` would still return data (older completed orders, plus the new pending/expired ones), so the page would still render.
- Effect on `/billing/plan` smoke: none. The smoke wait condition at `scripts/smoke-production-quick.mjs:479-497` accepts any of the empty-state ("Chưa có giao dịch"), pending ("Đang chờ"), completed ("Đã thanh toán"), or error ("Không thể tải lịch sử thanh toán") strings. A backend that returns Mongo data — even with no completions — satisfies the empty-state branch.

### What was checked

- `render.yaml` -> production `BILLING_PROVIDER=casso`, Casso env vars declared as host secrets.
- `backend/src/services/cassoPaymentAdapter.ts` -> outbound calls are limited to VietQR image URL generation; no outbound Casso API call from the backend hot path.
- `backend/src/services/paymentProviderRegistry.ts` -> provider resolution and mock fallback behavior.
- `backend/src/routes/billingRoutes.ts` -> `/billing/payment-history` wiring.
- `backend/src/controllers/orderStatusController.ts` -> `getPaymentHistory` reads Mongo only.
- `backend/src/controllers/cassoWebhookController.ts` (grepped) -> webhook handler is inbound-only and not on the smoke path.
- `src/app/pages/BillingPlan.tsx` -> frontend issues a single GET to our backend, no Casso client.
- `scripts/smoke-production-quick.mjs` -> wait conditions and 30s default timeout (`PROD_QUICK_SMOKE_TIMEOUT_MS`).

What was **not** verified (requires manual access):
- Casso dashboard state for `dear-our-feature` (active vs. expired vs. webhook disabled).
- Render host env values for the Casso vars.
- Whether the failed smoke run captured the actual response status / latency of `/billing/payment-history`.

### Decision

**Unrelated** to the `/billing/plan` smoke timeout, with one **needs manual dashboard verification** caveat for ongoing webhook health.

Rationale:
- `/billing/payment-history` does not depend on Casso at request time.
- Casso Standard expiration cannot increase that endpoint's latency.
- The smoke timeout symptoms (cold-start / hydration sensitivity already documented in section 3) remain the strongest hypotheses.

Required manual ops actions (separate from this smoke fix):
1. Verify Casso dashboard for `dear-our-feature`: confirm webhook delivery is still enabled or renew the Standard plan. If webhooks are disabled, new paid orders will silently fail to upgrade entitlements — that is a real production risk independent of this smoke timeout.
2. Confirm with the merchant a known recent transaction has been ingested (PaymentOrder transitioned `pending` -> `completed`) since the expiration notice.

## 5. Impact on 12-week setup Full GO

- **No block** on the 12-week setup Full GO route replacement from this billing failure.
- Reassess only if either of the following becomes true:
  - The billing failure becomes user-visible in real-mode production (users report payment history not loading, paywall hangs, or upgrade flow stalls on `/billing/plan`).
  - A direct link is established between this billing failure and release `d8b35b71` (e.g. shared dependency, shared bundle change, or shared backend deploy artifact).
- Otherwise, continue to track this in the billing surface follow-up. The 12-week setup route replacement remains Full GO per `docs/ux/12-week-setup-limited-rollout-monitoring.md`.

## Payment provider decision note

Recorded 2026-05-21. Documentation only; no code changed.

- **Casso Standard expired.** Per the Casso email for business `dear-our-feature`, Standard registration has expired. Casso must not be used for accepting real payments unless the Standard plan is renewed and webhook delivery health (inbound `/api/billing/webhook/casso`) is verified end-to-end.
- **PayOS migration is planned later.** PayOS is the intended next provider for VietQR-style bank transfer checkout once the Casso situation is resolved. Migration is **not** scheduled for this task.
- **PayOS is not currently implemented in code.** `backend/src/services/paymentProviderRegistry.ts:82` treats `payos` as a placeholder branch via `createPlaceholderAdapter("payos")`. The placeholder adapter is fail-closed: `isConfigured: false`, `createCheckoutSession` rejects with `PaymentProviderNotConfiguredError`, `verifyWebhookSignature` returns `{ valid: false }`, and `parseWebhookEvent` throws. Setting `BILLING_PROVIDER=payos` in any environment would therefore disable real checkout and webhook ingestion until the adapter is implemented.
- **Paid checkout stays disabled / mock / manual.** Until the PayOS adapter is implemented, tested, and validated against a real PayOS sandbox + webhook, paid checkout in real-mode production should remain disabled, mocked, or handled manually (e.g. ops-assisted bank transfer + manual entitlement grant). Do not flip `BILLING_PROVIDER=payos` and do not promote Casso back into the hot path without renewal + webhook verification.
- **No impact on 12-week setup Full GO.** This decision is scoped to the billing surface. The 12-week setup route replacement (`/12-week-setup` -> `TwelveWeekSetupLab`) is unaffected and remains Full GO per `docs/ux/12-week-setup-limited-rollout-monitoring.md`.

Action items (not in scope of this doc update):
1. Confirm Casso dashboard state for `dear-our-feature` and webhook delivery health; renew or formally retire.
2. Implement and test a real PayOS adapter (checkout session, webhook verify/parse, status mapping, customer portal stub if applicable) before flipping `BILLING_PROVIDER=payos`.
3. Until either of the above is complete, keep paid checkout entry points gated to demo / mock / manual paths in real-mode deployments.
