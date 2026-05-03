# Current Implementation Map

Audited: 2026-05-02. Source: code files, not docs.

---

## 1. Module Status

| # | Module | Status | Key Files | Tests |
|---|--------|--------|-----------|-------|
| 1 | **MVP 1 local-first demo** | ✅ Implemented | `storage.ts`, `.env.production` (demo mode) | 321 frontend |
| 2 | **Dashboard / onboarding / core funnel** | ✅ Implemented | `Dashboard.tsx`, `Onboarding.tsx`, `LifeBalance.tsx`, `LifeInsight.tsx` | Yes |
| 3 | **12-week setup** | ✅ Implemented | `12WeekSetup.tsx` (37KB), `planService.ts` | Yes |
| 4 | **12-week execution** | ✅ Implemented | `12WeekSystem.tsx` (34KB), `useTwelveWeekExecutionActions.ts` | Yes |
| 5 | **localStorage / auth-scoped storage** | ✅ Implemented | `storage.ts`, `storage-types.ts`, `storage-twelve-week.ts` | Yes |
| 6 | **MVP 2 mutation queue** | ✅ Implemented | `mutationQueue.ts`, `mutationQueueSender.ts` | Yes |
| 7 | **Backend mutation apply** | ✅ Implemented | `syncMutationService.ts` (43KB), 3 kinds: task/checkin/review | 65KB tests |
| 8 | **Import endpoint** | ✅ Implemented | `POST /sync/12-week/import`, `twelveWeekImportService.ts` (47KB) | Yes |
| 9 | **Pull endpoint** | ✅ Implemented | `GET /sync/12-week/pull`, `twelveWeekPullService.ts` (25KB) | Yes |
| 10 | **Incremental cursor** | ❌ Not implemented | Cursor param reserved but returns full snapshot | — |
| 11 | **Conflict UI** | ⚠️ Partial | v1 safe-action panel in Settings (keep local / use cloud / export) | Yes |
| 12 | **Backup / export** | ⚠️ Partial | Local JSON export from Settings/conflict panel. No server-side export. | — |
| 13 | **Cloud workspace delete / export** | ❌ Not implemented | No endpoint exists | — |
| 14 | **Sync smoke / staging CI** | ✅ Implemented | `smoke-mvp2-sync-staging.mjs`, `smoke:mvp2-sync` script | — |
| 15 | **Billing provider adapter** | ✅ Implemented | `paymentProviderAdapter.ts`, `paymentProviderRegistry.ts`, `mockPaymentAdapter.ts` | 21+ tests |
| 16 | **Checkout endpoint** | ✅ Implemented | `POST /billing/checkout-session` | 7 tests |
| 17 | **Webhook endpoint** | ✅ Implemented | `POST /billing/webhook/:provider`, signature verify, idempotent | 11 tests |
| 18 | **Server entitlement** | ✅ Implemented | `GET /billing/entitlement`, server-authoritative | Yes |
| 19 | **Customer portal / cancel** | ✅ Implemented | `POST /billing/customer-portal`, `POST /billing/subscription/cancel` | 7 tests |
| 20 | **Reconciliation CLI** | ✅ Implemented | `billingReconciliation.ts`, `scripts/reconcile-entitlements.ts` | 16 tests |
| 21 | **Paid go/no-go** | ✅ Documented | `PAID_MVP_GO_NO_GO.md` — decision: NO-GO | — |

### Billing sub-components detail

| Sub-component | Status | Notes |
|---------------|--------|-------|
| Real provider adapter (Stripe/PayOS) | ❌ Not implemented | Only mock adapter exists |
| Mongo-backed billing repos | ❌ Not implemented | In-memory repos; data lost on restart |
| `CheckoutSessionModel` (Mongoose) | ❌ Not implemented | Checkout sessions are in-memory only |
| `EntitlementSnapshotModel` (Mongoose) | ❌ Not implemented | Entitlements embedded in `BillingSubscriptionModel` |
| Rate limiting on checkout | ❌ Not implemented | — |
| Server-side trial creation | ❌ Not implemented | `startTrialLocally()` is localStorage-only |
| Webhook raw body for real HMAC | ❌ Not implemented | `express.json()` parses before signature check |

### Backend models (14 Mongoose models in code)

`BillingEventModel`, `BillingSubscriptionModel`, `DailyCheckInModel`, `GoalModel`, `GoalProgressModel`, `LeadMetricModel`, `OrderModel`, `PlanModel`, `SyncMutationLogModel`, `TaskModel`, `UserModel`, `VisionBoardModel`, `WeekModel`, `WeekReviewModel`

### Backend routes (13 route files)

`healthRoutes` (public) → `webhookRoutes` (pre-auth) → `authMiddleware` → `authRoutes`, `billingRoutes`, `goalRoutes`, `orderRoutes`, `planRoutes`, `syncRoutes`, `weekRoutes`, `taskRoutes`, `metricRoutes`, `visionBoardRoutes`

### Test counts (verified 2026-05-02)

- Backend: **171/171 pass**, 35 suites, 15 test files
- Frontend: **321/321 pass**, 58 test files

### Verification snapshot (2026-05-02)

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | PASS | Frontend TypeScript clean |
| `npm run lint` | PASS | Biome checked 369 files |
| `npm run test:run` | PASS | 321/321 frontend tests pass after local timeout cleanup for slow 12-week integration/e2e tests |
| `npm run build` | PASS | Vite production build succeeds; existing dynamic/static import chunk warning remains |
| `npm --prefix backend run typecheck` | PASS | Backend TypeScript clean |
| `npm --prefix backend run build` | PASS | Backend compiles clean |
| `npm --prefix backend run test` | PASS | 171/171 backend tests pass |

Verification debt cleaned on 2026-05-02: full-suite Vitest runs were timing out at the default 5s limit in three 12-week integration/e2e tests that pass when run individually. The fix only adds local 10s timeouts to those specific tests; no product behavior, storage schema, routes, sync logic, or billing logic changed.

---

## 2. Stale Docs Audit

### Docs that say "not implemented" but code NOW has it

| Doc | Claim | Reality |
|-----|-------|---------|
| `CURRENT_PROJECT_STATUS.md` §7 | "Real subscription webhooks and server-side entitlement authority" not implemented | ✅ **Implemented**: `webhookRoutes.ts`, `billingController.ts`, `GET /billing/entitlement`. 11 webhook tests + 7 billing tests. |
| `CURRENT_PROJECT_STATUS.md` §7 | "Real payment provider integration" not owned end-to-end | ⚠️ **Partially implemented**: Provider adapter pattern exists with mock adapter. Real provider adapter NOT implemented. |
| `CURRENT_PROJECT_STATUS.md` §7 | "Security hardening beyond Firebase token guard" not done | ⚠️ **Partially done**: Webhook signature verification, body size limits, idempotency, replay protection all exist. But no rate limiting, Helmet, or monitoring. |
| `PAID_MVP_PROVIDER_DECISION.md` §7 | "Billing models: Add Mongoose models" listed as required future work | ⚠️ **Partially done**: `BillingSubscriptionModel` + `BillingEventModel` exist. `CheckoutSessionModel`, `BillingCustomer`, `BillingTransaction` do NOT exist. |
| `PAID_MVP_READINESS_DECISION.md` §3 | "Backend billing is not implemented" | ❌ **STALE**: Backend billing IS implemented (checkout, webhook, entitlement, portal, cancel, reconciliation). |
| `MVP_2_SYNC_IMPLEMENTATION_STATUS.md` | Accurately says sync is incomplete | ✅ **Still accurate** — sync IS partial. |

### Docs that say "implemented" but code may not fully support

| Doc | Claim | Reality |
|-----|-------|---------|
| `BILLING_STATUS_AND_PLAN.md` mentions `CheckoutSessionModel` | Implied as existing | ❌ No Mongoose model file exists. Sessions are in-memory only. |

### Docs that need update after this audit

| File | What to update |
|------|----------------|
| `CURRENT_PROJECT_STATUS.md` | §5 add billing endpoints, webhook, entitlement, reconciliation. §7 remove "real webhooks not implemented." Update "last reviewed" date. |
| `PAID_MVP_READINESS_DECISION.md` | §3 point 3 is now false — backend billing IS implemented. Add note referencing `PAID_MVP_GO_NO_GO.md` as superseding document. |

---

## 3. Do Not Claim Publicly

| Claim | Why not |
|-------|---------|
| "Cloud sync is complete" | Cursor is full-pull only. No delta. No complete round-trip restore. Manual sync only. |
| "Paid subscription is live" | No real provider adapter. Mock adapter only. In-memory repos. |
| "Real payment processing" | Only mock checkout exists in production env. |
| "Automatic subscription management" | No real provider lifecycle. Cancel is soft-only on local data. |
| "Cloud data export/delete" | No server-side endpoint for account export or delete. |
| "Multi-device restore" | Sync round-trip has known hydration gaps. |
| "Encrypted backup" | No encryption at rest. Backup is local JSON only. |
| "Refund policy" | None exists. |
| "24/7 support" | No verified support channel. |

---

## 4. Next 10 Prompts (Priority Order)

| # | Prompt | Why now |
|---|--------|---------|
| 1 | **Update `CURRENT_PROJECT_STATUS.md`** to reflect billing/webhook/entitlement implementation. Remove stale "not implemented" claims. | Prevents AI/dev confusion. Highest value per effort. |
| 2 | **Run 5–8 user tests** using `MVP_1_USER_TESTING_SCRIPT.md`. Create `MVP_1_FEEDBACK_SUMMARY.md`. | Product blocker for every paid decision. |
| 3 | **Implement Mongo-backed billing repositories** replacing in-memory repos in `billingServiceInstance.ts`. | Hard blocker B2 for paid MVP. Data loss on restart. |
| 4 | **Owner answers 8 provider questions** (market, currency, entity, pricing, refund). Update `PAID_MVP_PROVIDER_DECISION.md`. | Hard blocker B3. Cannot choose provider without this. |
| 5 | **Implement real provider adapter** (Stripe or PayOS) behind `PaymentProviderAdapter` interface. | Hard blocker B1. Mock cannot process real money. |
| 6 | **Draft privacy policy, terms of service, refund policy.** Commit as `guidelines/PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `REFUND_POLICY.md`. | Hard blockers B4/B5. Legal requirement. |
| 7 | **Add delta/incremental pull** to `GET /sync/12-week/pull`. Use revision-based cursor instead of full snapshot. | Scale blocker. Current full-pull won't work at user volume. |
| 8 | **Add account data export endpoint** (`GET /api/account/export`). | User trust. Required before paid launch. |
| 9 | **Add rate limiting** on checkout, webhook, and mutation endpoints. | Security soft blocker S1. |
| 10 | **Staging end-to-end payment test** with real provider. Verify checkout → webhook → entitlement round-trip. | Gate for Phase 2 launch checklist. |

---

## 5. File Inventory Summary

| Area | Files | Total Size |
|------|-------|------------|
| Backend services | 19 | ~220KB |
| Backend models | 14 | ~33KB |
| Backend routes | 13 | ~8KB |
| Backend tests | 15 | ~195KB |
| Frontend pages | 37 files + 4 dirs | — |
| Frontend scripts | 5 | ~121KB |
| Guidelines docs | 32 | ~370KB |
