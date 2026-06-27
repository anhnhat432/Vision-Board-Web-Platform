# Billing Cancel-At-Period-End UI Spec

## 1. Context & Goal

- Feature / bug: the backend already exposes `/billing/subscription/cancel`, but the real billing page still treats "stop using" as informational copy instead of an actual cancel-at-period-end action.
- Why now: production launch requires a clear account-side path for paid users to stop renewal without contacting support first.
- User impact: a signed-in real-mode Plus user can explicitly mark their subscription to end at the current period boundary and immediately see confirmation copy in the billing UI.
- Modes affected: real primary; local-only and demo/mock surfaces must stay non-destructive and informative.

## 2. Surface Classification

- Type: Core.
- Touched domains: billing plan page, production billing helper, frontend production-core billing tests.
- Existing invariants that must not break: destructive billing action uses `AlertDialog`, not `window.confirm`; no optimistic PLUS unlocks; no localStorage schema change in this batch; support/refund paths remain reachable.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user with an active Plus subscription.
- Secondary actor(s): support reviewer handling refund follow-up.
- Route(s): `/billing/plan`.
- API / hook / store touchpoints: `BillingPlanPage`, `cancelSubscriptionOnServer`, `/billing/subscription/cancel`, `useSyncedUserData`.

## 4. Functional Requirements

1. WHEN a real-mode Plus user confirms they do not want to continue, THE billing page SHALL call `cancelSubscriptionOnServer()`.
2. WHEN the backend returns `pending_cancel`, `already_pending_cancel`, or `already_canceled`, THE billing page SHALL show the returned confirmation message in visible page copy and SHALL reload local user data.
3. WHEN the cancel call fails with `offline`, `local_only`, or `error`, THE billing page SHALL keep the current plan state and SHALL show a clear non-destructive toast message.
4. WHERE the cancel action is confirmed, THE UI SHALL keep using `AlertDialog` instead of `window.confirm`.
5. WHERE refund and support paths exist, THE cancel action SHALL NOT remove or replace them.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none in this batch.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: cancel uses backend authority; frontend reload happens after the server response.
- rollback / restore concerns: this batch improves UI reachability only and does not change provider/webhook cancellation semantics.

## 6. Non-functional Requirements

- accessibility: cancel confirmation and result text must be readable text, not icon-only.
- observability / logging: existing billing monitoring/toasts remain available for network failures.
- security / privacy: no secret or provider identifiers added to UI state.

## 7. Out of Scope

- Provider-specific customer portal implementation.
- Refund policy changes.
- Local subscription schema additions such as `cancelAtPeriodEnd`.

## 8. Acceptance Criteria

- [x] BillingPlan real-mode paid-user dialog triggers `/billing/subscription/cancel` through the existing frontend helper.
- [x] Success responses render visible "end at period boundary" confirmation copy on the page.
- [x] Refund/support actions remain reachable after the cancel action is wired.
- [x] The flow stays behind `AlertDialog`, not `window.confirm`.

## 9. Verification Plan

```bash
npm.cmd run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
npm.cmd run typecheck
git diff --check
git diff --cached --check
```
