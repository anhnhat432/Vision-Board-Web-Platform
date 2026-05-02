# Paid MVP Readiness Decision

Date: 2026-04-30

Decision owner lens: product + monetization strategy.

Scope reviewed:

- `guidelines/MVP_1_FEEDBACK_SUMMARY.md`: not found in repo at review time.
- `guidelines/MVP_1_USER_TESTING_SCRIPT.md`
- `guidelines/BILLING_STATUS_AND_PLAN.md`
- `guidelines/MVP_2_SYNC_IMPLEMENTATION_STATUS.md`
- `guidelines/TECH_DEBT_REGISTER.md`
- `src/app/pages/BillingPlan.tsx`
- `src/app/pages/MockBillingCheckout.tsx`
- `src/app/components/UpgradePaywallDialog.tsx`
- `src/app/utils/twelve-week-premium/*`

## 1. Should We Build Real Billing Now?

No. Do not implement real payment collection yet.

The repo is ready to measure upgrade intent and prepare a paid architecture, but it is not ready to charge real users. The current product is still best described as a local-first MVP 1 demo with mock Plus upgrade and early MVP 2 account/sync foundations.

The main blocker is not just engineering. There is no committed `MVP_1_FEEDBACK_SUMMARY.md`, so there is no repo-backed evidence yet that users activate, return, understand the Plus value, or would pay for a specific feature. Also, MVP 2 sync is explicitly incomplete: import phase 2 can write basic Goal/Plan/Week/Task records, but there is no field-complete pull/restore, no completed mutation apply path, and no reliable multi-device recovery claim.

## 2. Decision

Decision: **PREPARE ONLY**

Meaning:

- Keep public demo billing in mock/local mode.
- Do not connect a real provider to charge users.
- Do not present mock checkout as real payment.
- Prepare paid MVP requirements, backend model/API plan, provider evaluation, pricing tests, and analytics around intent.
- Move to real billing only after activation, retention, paid-value clarity, account reliability, support/refund policy, and provider choice are validated.

## 3. Reasons

1. No feedback summary exists yet.
   The user testing script defines good criteria, but there is no consolidated result file showing activation, trust, usefulness, return intent, or willingness to pay.

2. Current billing authority is local/mock.
   `BillingPlan`, `MockBillingCheckout`, `UpgradePaywallDialog`, and the production billing utilities currently unlock Plus through local/mock provider state. `BILLING_STATUS_AND_PLAN.md` correctly says this is not production payment.

3. Backend billing is not implemented.
   There is no billing customer model, subscription model, entitlement grant model, checkout session model, webhook endpoint, webhook signature verification, provider event idempotency, server-side entitlement API, or customer portal API.

4. Entitlements are not authoritative.
   Current Plus access is frontend/local. A user can edit localStorage. That is acceptable for MVP 1 demo, but not for paid access.

5. MVP 2 sync is not complete.
   The sync implementation status says cloud sync is not complete. Selling “account backup”, “multi-device restore”, or “cloud sync” would be unsafe.

6. Paid value is plausible but not proven.
   Plus currently offers premium templates, review insights, priority reminders, and advanced analytics. These are reasonable candidates, but they need evidence from user tests and mock checkout intent before real payment work.

7. Public copy still has to avoid mock/real confusion.
   The current UI has good mock disclaimers, but the repo also keeps `PRO` as a compatibility type normalized to Plus. Real paid launch needs stricter Free/Plus SKU language.

## 4. Minimum Conditions Before Charging Real Money

### User Activation

Minimum evidence:

- 5-8 user tests completed using `MVP_1_USER_TESTING_SCRIPT.md`.
- Average Activation score >= 4/5.
- Average Clarity score >= 4/5.
- Most testers can start without login and reach Today without moderator help.
- No tester thinks login or payment is required for the demo core flow.

### Retention Signal

Minimum evidence:

- At least 3 of 5 testers say they would return tomorrow or this week.
- At least some testers actually come back after a refresh or next-day reminder.
- Today tab, task completion, daily check-in, weekly review, and Progress are named as useful, not just “nice UI”.

### Clear Paid Feature

Minimum evidence:

- Testers can name a specific paid value without prompting.
- Candidate paid values should be ranked:
  - adaptive 12-week templates;
  - better review insights;
  - reminders;
  - advanced progress analytics;
  - multi-device/account recovery only after sync is reliable.
- Mock checkout click or feedback should show intent, but not be treated as payment validation by itself.

### Account And Cloud Sync Reliability

Minimum bar if paid feature includes account recovery, sync, or multi-device:

- Backend mutation apply exists for key 12-week changes.
- Import is field-complete for lead metrics, daily check-ins, weekly reviews, and core task metadata.
- Pull/status endpoints exist.
- Client IDs, revisions, tombstones, conflict handling, and idempotency are tested.
- Device A create/import/sync -> Device B login/pull/continue is verified.

If paid feature is only local Plus templates/insights, account sync can remain outside the paid promise, but paid entitlement authority still must be backend-owned.

### Refund And Support Policy

Minimum bar:

- Written refund window and refund process.
- Support contact and expected response time.
- Manual entitlement recovery playbook.
- Clear disclaimer for what happens if sync fails or a user loses local browser data.
- Admin process for cancel/refund/entitlement correction.

### Provider Choice

Minimum bar:

- Choose one provider explicitly.
- Document why it fits the first market and currency.
- Define product/price IDs for Free and Plus only.
- Decide supported payment methods, tax/VAT handling, invoice/receipt handling, and customer portal scope.
- Do not leave production checkout with local/mock fallback.

## 5. What To Do Instead Of Real Billing Now

1. Improve paywall measurement.
   Keep mock checkout, but track safe events: paywall viewed, CTA clicked, mock checkout started/completed, and feedback submitted. Do not send raw goal text, review text, email, UID, or free-form feedback to external analytics.

2. Gather feedback before provider work.
   Run the user testing script and create `guidelines/MVP_1_FEEDBACK_SUMMARY.md` with Activation, Clarity, Trust, Usefulness, Return Intent, and Willingness to Pay scores.

3. Improve Plus demo value.
   Make the Plus demo feel concrete:
   - clearer premium template previews;
   - better explanation of review insights;
   - transparent “Plus demo unlocks locally on this browser” copy;
   - no claim that reminders or analytics are production-grade if they are not.

4. Tighten paid copy.
   Keep public copy to Free and Plus demo. Do not surface PRO as a real SKU. Keep “mock checkout does not charge real money” visible.

5. Prepare billing architecture without charging.
   Create backend billing design and provider decision docs. Build tests/contracts only when the provider is chosen.

6. Improve sync before selling recovery.
   If “save across devices” is part of paid value, finish MVP 2 sync first. Current state is not strong enough for a paid recovery promise.

## 6. If We Later Implement Paid MVP: Proposed Phases

### Phase 0: Product Gate

- Write `MVP_1_FEEDBACK_SUMMARY.md`.
- Decide paid feature promise.
- Decide whether paid value depends on cloud sync.
- Lock Free/Plus positioning and remove public PRO ambiguity.

### Phase 1: Provider Contract

- Choose provider.
- Define provider-neutral contract for checkout, portal, entitlement sync, restore, webhook events, refunds, and cancellations.
- Define production env names.
- Disable local/mock fallback in paid production mode.

### Phase 2: Backend Subscription Model

Add backend-owned records:

- `BillingCustomer`
- `BillingSubscription`
- `EntitlementGrant`
- `CheckoutSession`
- `BillingEvent`
- `BillingTransaction`

Entitlements must be keyed by authenticated backend user, not by client localStorage.

### Phase 3: Webhook And Idempotency

- Add provider webhook endpoint.
- Verify provider signatures.
- Store provider event IDs and payload hashes.
- Make webhook processing idempotent.
- Handle checkout completed, subscription updated/canceled, payment failed, refund, dispute/chargeback.

### Phase 4: Entitlement Authority

- Backend becomes source of truth for plan and entitlements.
- Frontend localStorage becomes cache only.
- App boot/login calls backend entitlement API.
- Paid feature gates trust backend entitlement state.
- Add manual recovery/admin override path.

### Phase 5: Frontend Checkout And Portal

- Replace mock provider only in paid env.
- Keep mock provider for demo/staging.
- Checkout starts only after auth is ready.
- Return page shows “processing” until backend entitlement confirms.
- Customer portal opens from provider session.

### Phase 6: Tests And Security

- Unit tests for provider contract mapping.
- Route tests for auth, checkout, portal, restore, entitlement API.
- Webhook tests for signature verification, duplicate events, cancellation, refund.
- E2E sandbox checkout test.
- Security review for userId trust, entitlement spoofing, env leakage, and local fallback.

## 7. Top 5 Codex Prompts Next For Paid MVP Planning

1. `Create guidelines/MVP_1_FEEDBACK_SUMMARY.md from user testing notes and score Activation, Clarity, Trust, Usefulness, Return Intent, and Willingness To Pay. Do not change source code.`

2. `Audit Plus demo value and paywall analytics. Identify which paid feature users are actually signaling interest in, without implementing payment.`

3. `Create a provider-neutral paid MVP billing architecture doc with backend models, APIs, webhook events, entitlement authority, env vars, and test plan. Do not code.`

4. `Create a payment provider decision matrix for Stripe, Paddle, Lemon Squeezy, and a Vietnam-local provider option, covering market fit, tax, webhook reliability, subscriptions, portal, refunds, and implementation risk. Do not choose a provider without explicit product constraints.`

5. `Design the minimum backend entitlement authority for Plus, including auth, subscription state, entitlement grants, localStorage cache strategy, and tests. Do not implement checkout or webhooks yet.`

## Final Recommendation

Do not start real billing implementation now.

Prepare only. The next best monetization work is to measure real user intent in the public demo, strengthen Plus demo value, and finish enough account/sync reliability to avoid selling a promise the app cannot yet keep.
