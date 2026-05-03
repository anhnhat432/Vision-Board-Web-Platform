# Paid MVP Go / No-Go Decision

**Decision: ⚠️ NO-GO — PREPARE ONLY**

Date of assessment: 2026-05-02

Assessor role: Senior release / security / product reviewer.

---

## 1. Decision

### ❌ NO-GO for real payment collection

The paid billing backend architecture is technically well-built and security-audited. However, the product, business, legal, and provider prerequisites required to charge real users are **not met**. The system must remain in mock/demo billing mode until the blockers in §10 are resolved.

This is consistent with the prior decisions in:
- `PAID_MVP_READINESS_DECISION.md` (2026-04-30): **PREPARE ONLY**
- `PAID_MVP_PROVIDER_DECISION.md` (2026-05-01): **DO NOT IMPLEMENT PAYMENT YET**

---

## 2. Date of Assessment

2026-05-02 (UTC+7)

---

## 3. Commands Run

| # | Command | Result |
|---|---------|--------|
| 1 | `npm --prefix backend run typecheck` | ✅ PASS |
| 2 | `npm --prefix backend run build` | ✅ PASS (included in test) |
| 3 | `npm --prefix backend run test` | ✅ **171/171 pass, 0 fail** |
| 4 | `npm run typecheck` | ✅ PASS |
| 5 | `npm run test:run` | ✅ **321/321 pass (58 test files)** |
| 6 | `npm run build` | ✅ Built in 24.72s |

---

## 4. Command Results Summary

All 6 verification commands pass cleanly. No type errors, no test failures, production build succeeds.

Backend billing test coverage (171 tests total across 35 suites):

| Area | Tests |
|------|-------|
| Billing service: entitlement resolution, upsert, idempotency | 30 |
| Checkout session endpoint: auth, validation, origin, provider | 7 |
| Webhook endpoint: signature, idempotency, cancel, payment_failed | 11 |
| Customer portal endpoint: auth, FREE user, PLUS user | 3 |
| Subscription cancel endpoint: auth, FREE, cancel, idempotent | 4 |
| Reconciliation: consistency, dry-run, write, batch | 16 |
| Payment provider adapter: mock, registry, portal, status mapping | 21+ |
| Auth, routes, sync, models, other | 79+ |

---

## 5. Product Readiness

| Criterion | Status | Evidence |
|-----------|--------|----------|
| User testing completed | ❌ **NOT DONE** | `MVP_1_FEEDBACK_SUMMARY.md` does not exist. `PAID_MVP_READINESS_DECISION.md` confirmed this 2026-04-30. |
| Activation/retention signal | ❌ **NO DATA** | No testers have completed `MVP_1_USER_TESTING_SCRIPT.md` |
| Willingness-to-pay signal | ❌ **NO DATA** | No user has been asked about payment or shown a real price |
| Clear paid feature identified | ⚠️ **CANDIDATES ONLY** | Templates, insights, reminders, analytics defined in `PLAN_DEFINITIONS` but unvalidated with users |
| Free vs Plus value gap clear to users | ⚠️ **IN CODE ONLY** | Plan page and paywall exist but no user evidence the gap is worth paying for |
| Mock checkout clearly labeled | ✅ | UI copy: "không thu tiền thật", "mock upgrade", "quyền local" |
| Cloud sync reliable enough for paid account features | ❌ **NOT READY** | `MVP_2_SYNC_IMPLEMENTATION_STATUS.md` says: "Do not publicly claim cloud sync is complete." Beta Go decision = GO WITH KNOWN LIMITATIONS. Sync is manual-only, no delta pull, no complete round-trip restore. |

**Product verdict**: No evidence users would pay. No feedback data. Cloud sync beta status means any paid feature requiring account/backup is not deliverable.

---

## 6. Technical Readiness

### 6.1 Billing Endpoint Audit

| Component | Status | Evidence |
|-----------|--------|---------|
| **Checkout** `POST /api/billing/checkout-session` | ✅ | Auth required. Plan validation. Origin check for returnUrl/cancelUrl. Provider adapter. 7 tests. |
| **Webhook** `POST /api/billing/webhook/:provider` | ✅ | Signature verification BEFORE parse. Idempotent by `providerEventId`. Handles cancel/fail/unknown. No auth bypass. 11 tests. |
| **Entitlement** `GET /api/billing/entitlement` | ✅ | Server-authoritative. Returns `currentPeriodEnd`, `cancelAtPeriodEnd`. Derives from subscription state, not request body. |
| **Customer portal** `POST /api/billing/customer-portal` | ✅ | Auth required. Provider-aware. Returns `portalUrl` or unsupported with instructions. 3 tests. |
| **Cancel** `POST /api/billing/subscription/cancel` | ✅ | Soft cancel (cancelAtPeriodEnd). Keeps entitlements until period end. Idempotent. 4 tests. |
| **Return URL** | ✅ Safe | Return URL alone does NOT unlock entitlements. Frontend polls `GET /api/billing/entitlement` and shows "Processing…" until server confirms. |
| **Reconciliation CLI** | ✅ | `billingReconciliation.ts` service + `reconcile-entitlements.ts` script. Dry-run default. `--write` mode. 16 tests. |

### 6.2 Provider Adapter Architecture

| Property | Status |
|----------|--------|
| Provider-agnostic `PaymentProviderAdapter` interface | ✅ |
| Mock adapter implemented and tested | ✅ |
| Provider registry with `BILLING_PROVIDER` env | ✅ |
| Real provider adapter (Stripe/PayOS/etc.) | ❌ **NOT IMPLEMENTED** — only mock exists |
| Unconfigured provider fails safely (503) | ✅ Tested |

### 6.3 Missing Technical Items

| Item | Severity |
|------|----------|
| **Real provider adapter** | 🔴 BLOCKER — cannot process real payments |
| **Mongo-backed billing repos** | 🔴 BLOCKER — in-memory repos lose data on restart |
| **Webhook raw body for real HMAC** | 🟡 — `express.json()` parses before signature; some providers (Stripe) need raw body |
| **Rate limiting on checkout** | 🟡 — no per-user checkout creation throttle |
| **Helmet security headers** | 🟡 — not configured for billing routes |

---

## 7. Security Readiness

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Webhook signature verification | ✅ | `verifyWebhookSignature()` called before `parseWebhookEvent()`. 3 dedicated tests (reject/accept/missing). |
| 2 | Webhook idempotency | ✅ | `BillingEventModel` stores `providerEventId` + `payloadHash`. Duplicate returns 200 no-op. Tested. |
| 3 | Server-side entitlement authority | ✅ | Backend resolves from `BillingSubscriptionEntity`. Frontend polls `GET /api/billing/entitlement` in real mode. |
| 4 | No localStorage-only entitlement in paid mode | ✅ | Real mode checkout goes through backend. Return URL does NOT unlock. `upgradePlanLocally()` only runs in demo mode. |
| 5 | UserId from token, not body | ✅ | `requireAuthUser(req)` in every billing controller. userId never from request body. |
| 6 | No secrets in frontend | ✅ | Only `VITE_*` env vars exposed. Provider keys never in frontend bundle. `.env.production` has `mock_provider` only. |
| 7 | CORS/origin safe | ✅ | `FRONTEND_ORIGIN` validates returnUrl/cancelUrl. Backend CORS configured. |
| 8 | Payment events not replayable | ✅ | `providerEventId` uniqueness + `payloadHash` conflict detection. Same ID different hash → logged, not applied. |
| 9 | User A cannot read/modify user B billing | ✅ | All billing queries scoped by `userId` from auth token. Cross-user isolation tested in billing service + entitlement tests. |
| 10 | Logs do not contain payment secrets | ✅ | Only metadata logged: provider, eventType, eventId, userId, plan. Raw webhook body stored as SHA-256 `payloadHash` only. |
| 11 | Provider API keys in env only | ✅ | Adapter reads from `process.env`. No keys in source. `.env` files gitignored. |

**Security verdict**: All 11 security requirements are met. The mock adapter proves the security contract. A real adapter must uphold the same contract.

---

## 8. Support / Refund Readiness

| Item | Status |
|------|--------|
| Written refund policy | ❌ **MISSING** |
| Support contact / email | ❌ **NOT VERIFIED** — `support@visionboard.app` referenced in code but unconfirmed |
| Manual entitlement recovery SOP | ⚠️ **PARTIAL** — reconciliation CLI exists but no written runbook |
| Data loss disclaimer | ❌ **MISSING** |
| Privacy policy | ❌ **MISSING** |
| Terms of service | ❌ **MISSING** |

**Support verdict**: Cannot launch paid product without refund policy, verified support contact, and legal documents.

---

## 9. Legal / Tax / Payment Provider Unknowns

All 8 owner-decision questions from `PAID_MVP_PROVIDER_DECISION.md §4` remain unanswered:

| # | Question | Answer |
|---|----------|--------|
| 1 | Target country / market | ❓ Unknown |
| 2 | Currency | ❓ Unknown |
| 3 | Entity type (individual/company) | ❓ Unknown |
| 4 | Payment methods | ❓ Unknown |
| 5 | Billing model (monthly/yearly/lifetime) | ❓ Unknown |
| 6 | Invoice / tax requirement | ❓ Unknown |
| 7 | Refund policy | ❓ Unknown |
| 8 | Target price range | ❓ Unknown |

---

## 10. Blockers

### 🔴 Hard Blockers (must resolve before ANY real payment)

| # | Blocker | Owner | Prior Doc |
|---|---------|-------|-----------|
| B1 | **No real payment provider adapter** — only mock | Engineering | PROVIDER_DECISION §1 |
| B2 | **No Mongo-backed billing repos** — data lost on restart | Engineering | PROVIDER_DECISION §7 |
| B3 | **Owner has not answered provider questions** (market, currency, entity, pricing) | Product owner | PROVIDER_DECISION §4 |
| B4 | **No refund policy** | Product owner | READINESS_DECISION §3 |
| B5 | **No privacy policy / terms of service** | Legal | — |
| B6 | **No user feedback / willingness-to-pay data** | Product owner | READINESS_DECISION §1 |
| B7 | **No verified support channel** | Product owner | — |
| B8 | **Cloud sync incomplete** — paid features requiring account backup are not deliverable | Engineering | SYNC_STATUS §1 |

### 🟡 Soft Blockers (should resolve before wide launch)

| # | Item | Owner |
|---|------|-------|
| S1 | Rate limiting on checkout endpoint | Engineering |
| S2 | Webhook raw body handling for real provider HMAC | Engineering |
| S3 | Production monitoring/alerting for failed webhooks | DevOps |
| S4 | Entitlement recovery SOP document | Engineering |
| S5 | Cloud sync beta feedback collected | Product owner |
| S6 | Server-side trial creation (replace `startTrialLocally()`) | Engineering |

---

## 11. Known Limitations

1. **Billing repositories are in-memory.** All subscription/event data is lost on backend restart. Mongo repos must be implemented before real data flows.

2. **Mock adapter only.** `createMockPaymentAdapter()` simulates the full billing flow. No real money can be processed.

3. **No webhook retry/dead-letter.** Failed webhook events are marked "failed" but not automatically retried or alerted.

4. **Reconciliation CLI uses in-memory repo.** Cannot scan production data until Mongo repos exist.

5. **Cancel is soft-only.** `cancelAtPeriodEnd` is set locally. Real provider must also be notified via adapter.

6. **No server-side trial.** `startTrialLocally()` is localStorage-only. Server-side `trialing` subscription not created.

7. **Cloud sync is beta.** Manual-only, no delta pull, no complete round-trip restore, no automatic import on login.

8. **Frontend local fallback exists.** In `api_contract` mode, if backend is unreachable, some billing functions fall back to local logic. Safe for demo, must be disabled for paid production.

9. **`PRO` plan normalized to `PLUS`.** `PRO` exists as compatibility type but `normalizePlanCode("PRO")` maps to `PLUS`. No distinct PRO product exists.

---

## 12. What NOT to Promise Publicly

| Do NOT say | Why |
|------------|-----|
| "Your payment is secure" | No real provider integrated |
| "Upgrade anytime, cancel anytime" | Cancel flow is soft-only, no real provider cancel |
| "Cloud backup included with Plus" | Sync is beta, manual-only, incomplete round-trip |
| "Multi-device access" | Sync round-trip gaps exist |
| "Automatic subscription management" | No real provider lifecycle |
| "Refund within X days" | No refund policy defined |
| "24/7 support" | No support channel verified |
| "Your data is encrypted and backed up" | No encryption at rest, no server-side backup export |
| "Mock checkout" is a real purchase | Mock = demo simulation only |

---

## 13. Launch Checklist

When all hard blockers are resolved:

### Phase 0: Business Prerequisites
- [ ] Owner answers all 8 provider questions (§9)
- [ ] Written refund policy committed
- [ ] Privacy policy committed
- [ ] Terms of service committed
- [ ] Support email verified and receiving
- [ ] 5–8 user tests completed → `MVP_1_FEEDBACK_SUMMARY.md`
- [ ] At least 1 clear paid feature validated by users

### Phase 1: Engineering Prerequisites
- [ ] Mongo-backed `BillingSubscriptionRepository` + `BillingEventRepository`
- [ ] Real provider adapter implementing `PaymentProviderAdapter`
- [ ] Webhook raw body handling verified with real provider
- [ ] `BILLING_PROVIDER` env set to real provider on production
- [ ] Provider webhook endpoint URL registered
- [ ] Provider signing secret in production env
- [ ] Rate limiting on checkout endpoint
- [ ] Reconciliation CLI connected to Mongo
- [ ] `startTrialLocally()` replaced with server-side trial (or removed)
- [ ] Frontend local fallback disabled in paid production mode

### Phase 2: Staging Verification
- [ ] Create real checkout session → redirect → complete real payment
- [ ] Webhook received → processed → entitlement granted
- [ ] Cancel → `cancelAtPeriodEnd` → period end → entitlement revoked
- [ ] Customer portal opens in real provider dashboard
- [ ] Duplicate webhook returns idempotent 200
- [ ] `payment_failed` → `past_due` → no entitlement
- [ ] Reconciliation CLI dry-run on staging data
- [ ] Cross-user isolation verified with 2 test accounts

### Phase 3: Production Launch
- [ ] Switch `BILLING_PROVIDER` from `mock` to real provider
- [ ] Verify demo mode still works (separate env / deployment)
- [ ] Monitor first 10 real payments in provider dashboard
- [ ] Monitor webhook delivery success rate ≥ 99%
- [ ] Rollback plan tested (§14)

---

## 14. Rollback Plan

If real billing must be disabled after launch:

| Step | Action | Effect | Time |
|------|--------|--------|------|
| 1 | Set `BILLING_PROVIDER=mock` in backend env | New checkouts go to mock. No new real charges. | Instant |
| 2 | Disable webhook endpoint in provider dashboard | Provider stops sending events. | 1 min |
| 3 | Run reconciliation CLI `--write` | Fix any entitlement mismatches. | 5 min |
| 4 | Set `VITE_BILLING_PROVIDER_MODE=mock_provider` on frontend | UI shows mock checkout. | Deploy cycle |
| 5 | Existing paid users | Keep entitlements until `currentPeriodEnd`. No data deleted. | Automatic |

**Data safety**: No user data deleted during rollback. Subscriptions, events, and entitlements remain in database. Paid users keep access until their period ends naturally.

---

## 15. Next Recommended Tasks

### Immediate (before any real payment)

1. **Product owner**: Answer provider questions (§9). Define refund policy.
2. **Product owner**: Run 5–8 user tests. Create `MVP_1_FEEDBACK_SUMMARY.md`.
3. **Legal**: Draft and commit privacy policy, terms of service.
4. **Ops**: Set up and verify support email.
5. **Engineering**: Implement Mongo-backed billing repositories.
6. **Engineering**: Implement real provider adapter (Stripe for international, PayOS/VNPay for Vietnam).

### After blockers resolved

7. **Engineering**: Staging end-to-end real payment test.
8. **Engineering**: Rate limiting on checkout endpoint.
9. **Engineering**: Production webhook monitoring.
10. **Engineering**: Replace `startTrialLocally()` with server-side trial.
11. **Engineering**: Disable frontend local fallback in paid production mode.

### Post-launch

12. Track conversion funnel: paywall view → checkout → payment → activation.
13. Scheduled reconciliation (cron/job) for entitlement consistency.
14. Admin dashboard for subscription/entitlement management.

---

## Summary

The billing **engineering is solid**: 171 backend tests pass, 321 frontend tests pass, all security requirements met, server-authoritative entitlements, idempotent webhooks, provider-agnostic adapter, reconciliation tooling.

But the **product is not ready to charge**: no user feedback, no provider chosen, no legal docs, no support channel, cloud sync is beta. Three prior decision documents all recommend **PREPARE ONLY / DO NOT IMPLEMENT PAYMENT YET**.

**Decision: NO-GO.** Keep mock billing for demo. Resolve the 8 hard blockers. Then execute the launch checklist.
