# Billing Cancel-At-Period-End Persistence Spec

## 1. Context & Goal

- Feature / bug: after a Plus user schedules cancellation at period end, the billing page can show a success banner in memory, but the frontend subscription cache does not persist the backend `cancelAtPeriodEnd` flag.
- Why now: production users need the account billing page to keep showing the scheduled-cancel state after reload, restore, or entitlement sync.
- User impact: a real-mode Plus user can see that Plus is ending at the current period boundary without repeating the cancel action or contacting support.
- Modes affected: real primary; demo/mock billing remains unaffected.

## 2. Surface Classification

- Type: Core.
- Touched domains: billing entitlement sync, local subscription cache, billing plan page, production billing tests.
- Existing invariants that must not break: backend entitlement remains authority; localStorage remains backward compatible; local save must keep working; no entitlement is revoked before the period end.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode Plus user with `cancelAtPeriodEnd=true` on the backend subscription.
- Route(s): `/billing/plan`.
- API / hook / store touchpoints: `/billing/entitlement`, `/billing/subscription/cancel`, `applyBillingAccessPayload`, `BillingPlanPage`, `Subscription`.

## 4. Functional Requirements

1. WHEN entitlement sync receives `cancelAtPeriodEnd=true`, THE frontend SHALL persist that flag in the local `Subscription` cache.
2. WHEN cancel-at-period-end is confirmed by `/billing/subscription/cancel`, THE frontend SHALL apply the returned entitlement snapshot so the billing page survives reload/focus refresh.
3. WHEN a cached Plus subscription has `cancelAtPeriodEnd=true`, THE billing page SHALL show visible end-at-period copy and SHALL label the period as ending rather than renewing.
4. WHERE old local subscriptions do not include `cancelAtPeriodEnd`, THE system SHALL treat the field as absent/false without migration breakage.
5. WHERE `cancelAtPeriodEnd=true`, THE system SHALL keep entitlements active until the existing period/grace rules expire.

## 5. Data, Storage, and Sync Constraints

- localStorage keys touched: none.
- localStorage shapes touched: `Subscription` gains optional `cancelAtPeriodEnd?: boolean`.
- migration or normalization needed: no version bump; absence is backward-compatible and interpreted as false.
- backend models or API contracts touched: none; backend already returns `cancelAtPeriodEnd`.
- sync ordering guarantees: backend response is authoritative; local cache mirrors only after server sync/cancel response.
- rollback / restore concerns: removing the field returns UI to prior renewal copy but does not alter entitlements.

## 6. Non-functional Requirements

- accessibility: scheduled-cancel state must be visible text, not color-only.
- observability / logging: no new raw provider identifiers or secret values.
- security / privacy: do not infer cancel state from URL params or checkout responses.

## 7. Out of Scope

- Provider-specific cancellation automation.
- Refund policy changes.
- Immediate entitlement revocation on cancel.

## 8. Acceptance Criteria

- [x] `applyBillingAccessPayload` preserves `cancelAtPeriodEnd=true` from server entitlement payloads.
- [x] `syncEntitlementsWithProvider` maps backend `/billing/entitlement.cancelAtPeriodEnd` into the local subscription cache.
- [x] `cancelSubscriptionOnServer` success updates local billing cache from `currentEntitlement`.
- [x] `/billing/plan` shows persistent scheduled-cancel copy when local subscription has `cancelAtPeriodEnd=true`.
- [x] Old subscriptions without `cancelAtPeriodEnd` remain valid and do not revoke Plus early.

## 9. Verification Plan

```bash
npm.cmd run test:run -- src/app/utils/production/billingCore.test.ts src/app/utils/storage-billing-ops.gracePeriod.test.ts
npm.cmd run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
npm.cmd run typecheck
npx biome lint src/app/utils/storage-types.ts src/app/utils/production/billingCore.ts src/app/utils/production/billingProvider.ts src/features/billing/BillingPlanPage.tsx src/app/pages/billing-production-surfaces.test.tsx src/app/utils/production/billingCore.test.ts
git diff --check
git diff --cached --check
```

## 10. Batch Evidence - 2026-06-27

- `Subscription` now includes optional `cancelAtPeriodEnd`, and `applyBillingAccessPayload` preserves that flag from server-authoritative entitlement payloads without requiring a storage-version bump.
- `syncEntitlementsWithProvider` now maps `/billing/entitlement.cancelAtPeriodEnd` into the local subscription cache, and the change is treated as a real sync update even when the plan and entitlement keys stay unchanged.
- `cancelSubscriptionOnServer` now applies the returned `currentEntitlement` snapshot immediately, so `/billing/plan` reflects scheduled cancellation without waiting for a separate page-level sync round-trip.
- `BillingPlanPage` now renders persistent scheduled-cancel state: the billing card switches from renewal copy to end-of-period copy, the status reads `Sẽ kết thúc cuối kỳ`, the scheduled-cancel banner survives reload, and the duplicate cancel CTA is hidden while refund/support paths remain reachable.
- `src/app/utils/storage-billing-ops.gracePeriod.test.ts` is now included in `npm run test:production-core:unit`, so the aggregate launch guard protects the existing grace-period rule that keeps Plus active during grace and revokes only after the grace window ends.
- Verification passed:
  - `npm.cmd run test:run -- src/app/utils/production/billingCore.test.ts src/app/utils/storage-billing-ops.gracePeriod.test.ts` (10 tests passed)
  - `npm.cmd run test:ui -- src/app/pages/billing-production-surfaces.test.tsx` (18 tests passed)
  - `npm.cmd run typecheck`
  - `npx biome lint src/app/utils/storage-types.ts src/app/utils/production/billingCore.ts src/app/utils/production/billingProvider.ts src/features/billing/BillingPlanPage.tsx src/app/pages/billing-production-surfaces.test.tsx src/app/utils/production/billingCore.test.ts`
  - `npm.cmd run build`
