# Paid MVP Provider Decision

Date: 2026-05-01

Decision owner lens: product + backend architect.

## Sources Reviewed

- `guidelines/PAID_MVP_READINESS_DECISION.md` — existing readiness decision (PREPARE ONLY).
- `guidelines/BILLING_STATUS_AND_PLAN.md` — full billing status, mock provider behavior, recommended models/APIs/webhook events, paid launch checklist.
- `guidelines/MVP_2_SYNC_IMPLEMENTATION_STATUS.md` — current sync implementation truth.
- `guidelines/TECH_DEBT_REGISTER.md` — billing/mock risk items #12–14, sync risk items #8–11.
- `src/app/pages/BillingPlan.tsx` — billing settings page (mock provider, local entitlements).
- `src/app/pages/MockBillingCheckout.tsx` — mock checkout confirmation page.
- `src/app/components/UpgradePaywallDialog.tsx` — paywall modal with provider mode awareness.
- `src/app/utils/twelve-week-premium/*` — plan definitions, entitlements, paywall copy.
- `backend/src/models/OrderModel.ts` — existing order model (physical/kit orders, not billing subscriptions).
- `backend/src/routes/orderRoutes.ts` — order CRUD routes (not payment/subscription).

---

## 1. Current Decision

### ❌ DO NOT IMPLEMENT PAYMENT YET

Real payment collection must not be connected to the product at this time.

### ✅ PREPARE PROVIDER-AGNOSTIC BACKEND

Create backend billing models, API contracts, webhook event types, and entitlement authority as abstract TypeScript interfaces. Do not connect to a specific provider. Do not charge users.

### ⏳ IMPLEMENT PROVIDER INTEGRATION — later

Only after all preconditions in Section 3 are met and the owner provides the constraints in Section 4.

---

## 2. Reasons

1. **No repo-backed feedback summary.** `guidelines/MVP_1_FEEDBACK_SUMMARY.md` does not exist. There is no consolidated evidence of activation, retention, willingness to pay, or which specific feature users would pay for. `PAID_MVP_READINESS_DECISION.md` confirmed this on 2026-04-30.

2. **Entitlement authority is frontend/local.** Current Plus access is stored in `localStorage`. Users can edit it. This is acceptable for demo but not for real payment. Backend has no billing customer, subscription, entitlement grant, checkout session, or webhook endpoint.

3. **MVP 2 sync is incomplete.** The sync status document explicitly says: "Do not publicly claim cloud sync is complete." If any paid feature depends on account backup, multi-device restore, or cloud-synced state, selling it now would be a broken promise.

4. **No provider has been chosen.** The owner has not declared target market, currency, payment methods, entity type (individual vs company), tax requirements, or subscription vs one-time model. Choosing a provider without these constraints would be premature.

5. **Mock checkout works and is safe.** The current `mock_provider` mode correctly simulates the upgrade flow without charging. It is useful for measuring upgrade intent, testing paywall UX, and validating the checkout return flow.

6. **Backend order model is not billing.** `OrderModel` handles physical kit orders with shipping addresses and admin status transitions. It is not a subscription/payment system.

---

## 3. Preconditions Before Real Payment

All preconditions must be met before connecting a real payment provider.

### 3.1 Feedback Signal

| Condition | Minimum Bar | Status |
|---|---|---|
| User testing completed | 5–8 tests using `MVP_1_USER_TESTING_SCRIPT.md` | ❌ Not done |
| Activation score | ≥ 4/5 average | ❌ No data |
| Clarity score | ≥ 4/5 average | ❌ No data |
| Return intent | ≥ 3/5 testers say they would return | ❌ No data |
| Feedback summary | `MVP_1_FEEDBACK_SUMMARY.md` committed | ❌ Missing |

### 3.2 Activation & Retention Signal

| Condition | Minimum Bar | Status |
|---|---|---|
| Users complete onboarding → Today without help | Most testers | ❌ No data |
| Users return after first session | At least some testers | ❌ No data |
| Today/check-in/review named as useful | Not just "nice UI" | ❌ No data |

### 3.3 Clear Paid Feature

| Condition | Minimum Bar | Status |
|---|---|---|
| Users name a specific paid value unprompted | At least 1 feature | ❌ No data |
| Mock checkout intent signal | ≥ 2 testers click upgrade CTA | ❌ No data |
| Paid feature does not require incomplete sync | Unless sync is finished | ⚠️ Sync incomplete |

Candidate paid features ranked by current readiness:

1. **Adaptive 12-week templates** — local-only, does not require sync. Strongest candidate.
2. **Premium review insights** — local-only. Ready.
3. **Priority reminders** — local-only. Ready but limited.
4. **Advanced progress analytics** — local-only. Ready but limited.
5. **Multi-device / account recovery** — depends on sync. **Not ready.**

### 3.4 Account & Cloud Sync Reliability (if paid feature requires account)

| Condition | Minimum Bar | Status |
|---|---|---|
| Backend mutation apply for key kinds | task, check-in, review | ✅ Implemented |
| Import field-complete | Goal/Plan/Week/Task/Metric/CheckIn/Review | ⚠️ Partial |
| Pull endpoint exists | Full snapshot | ✅ v1 exists |
| Client IDs, revisions, idempotency tested | Route-level tests | ⚠️ Partial |
| Device A → Device B round-trip verified | End-to-end test | ❌ Not done |

### 3.5 Refund & Support Process

| Condition | Minimum Bar | Status |
|---|---|---|
| Written refund window | e.g., 7 days, 30 days | ❌ Not defined |
| Support contact | Email or form | ❌ Not defined |
| Manual entitlement recovery playbook | Admin can fix stuck users | ❌ Not written |
| Data loss disclaimer | What happens if localStorage is cleared | ❌ Not written |

---

## 4. Provider Constraints — Owner Must Answer

These questions cannot be decided by engineering alone. They determine provider choice, pricing, tax handling, and legal requirements.

| # | Question | Options | Current Answer |
|---|---|---|---|
| 1 | Target country / market | Vietnam, international, both | ❓ Unknown |
| 2 | Currency | VND, USD, EUR, multi-currency | ❓ Unknown |
| 3 | Entity type | Individual, company, sole proprietorship | ❓ Unknown |
| 4 | Payment methods | International cards, domestic cards, e-wallets (MoMo/ZaloPay), bank transfer | ❓ Unknown |
| 5 | Billing model | Monthly subscription, quarterly, one-time per cycle, lifetime | ❓ Unknown |
| 6 | Invoice / tax requirement | VAT invoice, electronic receipt, none for MVP | ❓ Unknown |
| 7 | Refund policy | 7-day, 30-day, no refund, case-by-case | ❓ Unknown |
| 8 | Target price range | e.g., 99k–199k VND/month, $5–$15/month | ❓ Unknown |

### Provider Evaluation Matrix (for reference only — do not choose yet)

| Provider | International cards | VN domestic | Subscription | Webhook | Tax/Invoice | Self-hosted | Complexity |
|---|---|---|---|---|---|---|---|
| Stripe | ✅ | ❌ | ✅ | ✅ | ✅ | No | Medium |
| Paddle | ✅ | ❌ | ✅ | ✅ | ✅ (MoR) | No | Medium |
| Lemon Squeezy | ✅ | ❌ | ✅ | ✅ | ✅ (MoR) | No | Low |
| VNPay | ❌ | ✅ | ❌ native | ❌ basic | ❌ | No | High |
| MoMo Business | ❌ | ✅ (e-wallet) | ❌ | ⚠️ | ❌ | No | High |
| Self-managed | ✅ | ✅ | Manual | Manual | Manual | Yes | Very High |

**Recommendation**: Do not choose a provider until the owner answers questions 1–8. If the answer is "Vietnam market first, VND, individual", VNPay or a local aggregator may be needed. If the answer is "international, USD, company", Stripe or Paddle/Lemon Squeezy is more practical.

---

## 5. Provider-Agnostic Architecture (Proposed)

These models and interfaces should be prepared now, without connecting to any provider. They match the recommendations in `BILLING_STATUS_AND_PLAN.md`.

### 5.1 Subscription

```typescript
interface Subscription {
  id: string;
  userId: string;                // Firebase UID
  provider: string;              // "stripe" | "paddle" | "vnpay" | "mock"
  providerSubscriptionId: string;
  providerCustomerId: string;
  planCode: "FREE" | "PLUS";     // No PRO in paid MVP
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid";
  billingCycle: "monthly" | "quarterly" | "yearly" | "lifetime";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 Entitlement

```typescript
interface EntitlementGrant {
  id: string;
  userId: string;
  planCode: "PLUS";
  key: "premium_templates" | "premium_review_insights" | "priority_reminders" | "advanced_analytics";
  source: "subscription" | "trial" | "manual" | "admin";
  sourceId: string;              // subscription.id or admin grant id
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}
```

### 5.3 CheckoutSession

```typescript
interface CheckoutSession {
  id: string;
  userId: string;
  planCode: "PLUS";
  context: string;               // paywall context
  source: string;                // "paywall_dialog" | "billing_plan" | etc.
  provider: string;
  providerCheckoutSessionId: string | null;
  status: "created" | "completed" | "expired" | "canceled";
  returnUrl: string;
  createdAt: Date;
  completedAt: Date | null;
}
```

### 5.4 PaymentEvent (Webhook)

```typescript
interface BillingEvent {
  id: string;
  provider: string;
  providerEventId: string;       // Idempotency key from provider
  eventType: string;             // "checkout.completed" | "subscription.updated" | etc.
  receivedAt: Date;
  processedAt: Date | null;
  status: "received" | "processed" | "ignored" | "failed";
  payloadHash: string;           // SHA-256 of raw webhook body
  error: string | null;
}
```

### 5.5 WebhookEvent Types to Support

Provider-neutral event types the backend must handle:

- `checkout_completed`
- `checkout_expired`
- `subscription_created`
- `subscription_updated`
- `subscription_canceled`
- `subscription_resumed`
- `payment_succeeded`
- `payment_failed`
- `trial_ending`
- `refund_created`
- `dispute_opened`
- `dispute_closed`

---

## 6. Frontend Changes Required (When Implementing)

1. **Disable local checkout fallback in paid production mode.** `api_contract` currently falls back to local checkout when endpoints are offline. In paid mode, this must return `not_configured` without unlocking.

2. **Backend becomes entitlement authority.** `getCurrentPlan()` and `getCurrentEntitlementKeys()` must call backend on app boot/login. LocalStorage becomes a cache with TTL, not the source of truth.

3. **Checkout return page.** After provider redirect, show "Processing..." until backend confirms entitlement via webhook → entitlement API.

4. **Remove PRO from public UI.** Keep as internal compatibility type but never show as a purchasable plan.

5. **Update mock checkout copy.** When `mock_provider` is active, keep current "mock checkout does not charge real money" copy. When real provider is active, remove all mock language.

6. **Trial UI.** `startTrialLocally()` must be replaced with server-side trial creation that creates a `Subscription` with `status: "trialing"` and `EntitlementGrant` with `expiresAt`.

---

## 7. Backend Changes Required (When Implementing)

1. **Billing models.** Add Mongoose models for `BillingCustomer`, `BillingSubscription`, `EntitlementGrant`, `CheckoutSession`, `BillingEvent`, `BillingTransaction`.

2. **Billing API routes.** Add authenticated endpoints:
   - `POST /billing/checkout` — create provider checkout session.
   - `POST /billing/portal` — create customer portal session.
   - `POST /billing/entitlements` — return authoritative entitlements.
   - `POST /billing/restore` — reconcile provider state.
   - `POST /billing/webhook` — provider-authenticated, not Firebase.

3. **Entitlement resolution service.** Backend resolves entitlements from `BillingSubscription` + `EntitlementGrant`, not from request body or localStorage.

4. **Provider adapter pattern.** Abstract provider calls behind an interface so switching providers later is a config change, not a rewrite.

5. **Admin routes.** `GET /admin/billing/subscriptions`, `PATCH /admin/billing/entitlements/:id/revoke`, `POST /admin/billing/entitlements/manual-grant`.

---

## 8. Security Requirements

| # | Requirement | Rationale |
|---|---|---|
| 1 | **Webhook signature verification** | Provider webhooks must be verified using the provider's signing secret. Never trust raw webhook body without signature check. |
| 2 | **Webhook idempotency** | Store `providerEventId` and `payloadHash`. Replay the same event without double-applying side effects. Same event ID with different hash → log conflict, do not apply. |
| 3 | **Server-side entitlement authority** | Backend is the source of truth. Frontend localStorage is a cache. Never grant durable paid access based on client-side data alone. |
| 4 | **No localStorage-only entitlement in paid mode** | In paid production mode, `upgradePlanLocally()` and `startTrialLocally()` must be disabled or gated. Local fallback must not unlock paid features. |
| 5 | **UserId from token, not body** | All billing API calls derive userId from the Firebase auth token, never from the request body. |
| 6 | **Checkout session expiry** | Checkout sessions expire after a configured window (e.g., 30 minutes). Expired sessions cannot be completed. |
| 7 | **No raw payment data in logs** | Do not log card numbers, bank account details, or raw provider webhook payloads to application logs. Store only `payloadHash`. |
| 8 | **HTTPS only for webhook endpoint** | Webhook endpoint must only be reachable over HTTPS in production. |
| 9 | **Rate limiting on checkout creation** | Prevent checkout spam. Limit per-user checkout session creation (e.g., 5/hour). |
| 10 | **Provider secret key in env only** | Webhook signing secret and provider API keys must be in env vars, never in source code or committed files. |

---

## 9. Migration: Mock Checkout → Real Checkout

### Phase 1: Coexistence

- Keep `mock_provider` as the default in `.env.production` for demo.
- Add `real` or provider-specific mode (e.g., `stripe`) as a new `VITE_BILLING_PROVIDER_MODE` value.
- In `real` mode, disable `upgradePlanLocally()`, `startTrialLocally()`, and local mock checkout redirect.
- In `real` mode, `startCheckoutFlow()` calls backend `/billing/checkout` and redirects to the provider checkout URL.

### Phase 2: Entitlement Migration

- On first login after `real` mode is enabled:
  - If user has local Plus entitlement from mock provider, show a banner: "Your demo Plus has been converted. Please subscribe to keep Plus features."
  - Do not auto-grant real entitlement based on mock localStorage.
  - Allow a grace period (e.g., 7 days) before revoking mock entitlements.
- Backend creates `BillingCustomer` on first checkout or restore call.

### Phase 3: Deprecate Mock in Production

- After real billing is stable, switch `.env.production` default to `real` mode.
- Keep `mock_provider` available for staging/test environments.
- Remove mock billing copy from production UI.

---

## 10. Next Prompt If Decision = PREPARE ONLY

This is the current decision. The next engineering prompt should be:

```
Bạn là backend architect. Tạo backend billing model interfaces và provider-agnostic service contracts, không code Mongoose models, không connect provider.

Tạo:
1. backend/src/services/billing/billingTypes.ts — TypeScript interfaces cho Subscription, EntitlementGrant, CheckoutSession, BillingEvent, BillingTransaction, BillingCustomer.
2. backend/src/services/billing/billingProviderContract.ts — abstract provider interface (createCheckout, createPortal, verifyWebhook, getSubscription).
3. backend/src/services/billing/entitlementResolver.ts — pure function: given Subscription + EntitlementGrant[], return current entitlement keys.

Không:
- Không thêm Mongoose models.
- Không thêm routes.
- Không connect Stripe/Paddle/VNPay.
- Không sửa frontend.
- Không sửa mock checkout.

Chạy: npm --prefix backend run typecheck && npm --prefix backend run build
```

---

## 11. Next Prompt If Decision = IMPLEMENT PROVIDER

Only run this after all preconditions in Section 3 are met and the owner has answered all questions in Section 4.

```
Bạn là full-stack engineer. Implement [PROVIDER_NAME] billing integration cho Plus subscription.

Trước khi code:
1. Đọc guidelines/PAID_MVP_PROVIDER_DECISION.md.
2. Đọc guidelines/BILLING_STATUS_AND_PLAN.md.
3. Đọc backend/src/services/billing/ (interfaces từ PREPARE phase).

Tạo:
1. Mongoose models: BillingCustomer, BillingSubscription, EntitlementGrant, CheckoutSession, BillingEvent.
2. Routes: POST /billing/checkout, POST /billing/portal, POST /billing/entitlements, POST /billing/restore, POST /billing/webhook.
3. Webhook handler: verify [PROVIDER_NAME] signature, idempotent event processing, handle checkout_completed + subscription_updated + payment_failed + refund.
4. Entitlement API: server-side authority, derive from active subscription.
5. Frontend: replace mock_provider logic in real mode, add backend entitlement boot call, disable local fallback.
6. Tests: webhook signature, duplicate events, checkout flow, entitlement sync, cross-user isolation.
7. Env: add [PROVIDER]_SECRET_KEY, [PROVIDER]_WEBHOOK_SECRET, [PROVIDER]_PRICE_ID_PLUS to .env.example.

Không:
- Không sửa mock_provider logic (keep for demo/staging).
- Không add PRO plan.
- Không sửa sync endpoints.

Chạy:
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run test
npm run typecheck
npm run build
```

---

## Final Recommendation

**Do not implement payment now.** The product is not ready to charge users.

The right next step is:
1. Run user tests and create `MVP_1_FEEDBACK_SUMMARY.md`.
2. Determine which feature users would actually pay for.
3. Prepare provider-agnostic billing interfaces (Section 10 prompt).
4. Ask the owner to answer provider constraint questions (Section 4).
5. Only then implement a real provider integration.
