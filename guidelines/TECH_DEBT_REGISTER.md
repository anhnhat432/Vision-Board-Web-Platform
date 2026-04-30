# Technical Debt Register

Last reviewed: 2026-04-30

Scope: repo-wide technical debt for the local-first public demo, MVP 2 account/cloud sync, and a later paid MVP. This register is a backlog, not a release blocker list. Do not treat every item as P0. Only items that block the public demo or can cause data loss should be escalated to release-blocking work.

Sources reviewed:

- `AGENTS.md`
- `guidelines/CURRENT_PROJECT_STATUS.md`
- `guidelines/MVP_1_SCOPE.md`
- `guidelines/MVP_2_CLOUD_SYNC_PLAN.md`
- Largest frontend/backend source files under `src` and `backend/src`

Largest file scan highlights:

- `src/app/pages/Dashboard.tsx`: 1583 lines
- `src/app/pages/FeasibilityCheck.tsx`: 1269 lines
- `src/app/pages/SMARTGoalSetup.tsx`: 1207 lines
- `src/app/pages/GoalTracker.tsx`: 1113 lines
- `src/app/components/RootLayout.tsx`: 1078 lines
- `src/app/pages/VisionBoardEditor.tsx`: 953 lines
- `src/app/pages/12WeekSetup.tsx`: 868 lines
- `src/app/utils/twelve-week-premium.ts`: 867 lines
- `src/app/hooks/useBackendPlanHydration.ts`: 768 lines
- `src/app/utils/storage.ts`: 724 lines
- `src/app/utils/storage-twelve-week.ts`: 723 lines
- Backend largest current files are service/test files, led by `backend/src/tests/goalPlanOwnership.test.ts`, `backend/src/services/goalService.ts`, and `backend/src/services/planService.ts`.

## Oversized Files

### 1. Dashboard route remains too large

- Affected files: `src/app/pages/Dashboard.tsx`, `src/features/dashboard/components/*`, `src/features/dashboard/helpers/*`
- Risk level: medium
- Why it matters: The dashboard is the public demo entry point. A large route file makes it easier to regress signed-out/demo CTA behavior, local data import/export UI, and returning-user states.
- Recommended fix: Continue extracting display-only sections and pure navigation helpers. Keep route-level state and callbacks in `Dashboard.tsx`; keep localStorage writes out of child components.
- Should do before: MVP 2
- Suggested Codex prompt: `Refactor Dashboard.tsx by extracting one remaining cohesive UI section into src/features/dashboard/components, preserving route behavior, auth behavior, storage schema, and tests.`

### 2. Core funnel pages carry too much UI and validation in route files

- Affected files: `src/app/pages/FeasibilityCheck.tsx`, `src/app/pages/SMARTGoalSetup.tsx`, `src/app/pages/Onboarding.tsx`, `src/app/pages/LifeBalance.tsx`
- Risk level: medium
- Why it matters: These pages define the core public demo path. Large mixed route files make mobile/focus fixes, copy changes, and validation changes harder to verify safely.
- Recommended fix: Extract step components and pure validation helpers one page at a time. Add focused tests for helper behavior where route tests are too heavy.
- Should do before: MVP 2
- Suggested Codex prompt: `Refactor SMARTGoalSetup.tsx by extracting typed step UI components and pure validation helpers without changing route, storage keys, copy, or business behavior.`

### 3. RootLayout is doing too much orchestration

- Affected files: `src/app/components/RootLayout.tsx`, `src/app/hooks/useBackendPlanHydration.ts`, `src/lib/auth/AuthContext.tsx`
- Risk level: medium
- Why it matters: RootLayout sits at the intersection of auth, hydration, demo/real mode, navigation, layout, and unauthorized handling. This increases risk that a demo-mode change accidentally triggers protected sync or login noise.
- Recommended fix: Move backend hydration readiness, unauthorized handling, and sync-state orchestration into small hooks with explicit inputs and tests.
- Should do before: MVP 2
- Suggested Codex prompt: `Extract RootLayout backend hydration/auth readiness logic into a typed hook with tests, preserving demo mode behavior and existing routing.`

### 4. Template and premium support logic is dense

- Affected files: `src/app/utils/twelve-week-premium.ts`, `src/app/pages/12WeekSetup/components/OutcomeStep.tsx`
- Risk level: low
- Why it matters: The file mixes plan definitions, template catalog, adaptive support, paywall copy, and premium review suggestions. It is easy to accidentally change free template behavior while editing Plus copy.
- Recommended fix: Split catalog data, adaptive template support, paywall copy, and review insight helpers into separate modules while preserving exports.
- Should do before: Paid MVP
- Suggested Codex prompt: `Split twelve-week-premium.ts into catalog, adaptiveSupport, paywallCopy, and reviewInsight modules while keeping existing public exports and tests passing.`

## LocalStorage / Schema Risk

### 5. UserData remains the main product source of truth

- Affected files: `src/app/utils/storage.ts`, `src/app/utils/storage-types.ts`, `src/app/utils/storage-twelve-week.ts`, `src/app/utils/storage-*.ts`
- Risk level: high
- Why it matters: Most user value is stored in browser localStorage. A schema regression can lose or hide local plans, tasks, reviews, mock entitlements, or demo state.
- Recommended fix: Treat storage as a compatibility layer. Add migration/normalization tests for every stored shape change. Keep `USER_DATA_STORAGE_KEY`, `APP_STORAGE_KEYS`, and `CURRENT_STORAGE_VERSION` stable unless a migration is included.
- Should do before: MVP 1 for any storage change; otherwise MVP 2
- Suggested Codex prompt: `Audit the next storage change for schema compatibility and add focused migration/normalization tests without changing storage keys or stored shapes unnecessarily.`

### 6. Local-to-account migration is not yet a product flow

- Affected files: `src/app/utils/local-data-migration.ts`, `src/app/utils/storage-auth-scope.ts`, `src/lib/auth/useAuth.ts`, `src/lib/auth/AuthContext.tsx`
- Risk level: high
- Why it matters: MVP 2 needs explicit import from anonymous local work to an account. Auto-import can pollute accounts; no prompt can make users think data disappeared after login.
- Recommended fix: Add a first-login migration prompt that detects meaningful local work, explains local/device storage, and lets the user import, skip, or review before import.
- Should do before: MVP 2
- Suggested Codex prompt: `Design and implement the local-to-account migration prompt using hasMeaningfulLocalWork, preserving clean-account login behavior and never auto-importing anonymous data.`

### 7. Demo data and real local work need continuous separation

- Affected files: `src/app/utils/storage-demo-data.ts`, `src/app/utils/local-data-migration.ts`, `src/app/pages/Dashboard.tsx`
- Risk level: medium
- Why it matters: Seeded demo data should not be treated as real user work or imported into an account by default.
- Recommended fix: Keep demo markers explicit and add regression tests whenever demo seeding or meaningful-work detection changes.
- Should do before: MVP 2
- Suggested Codex prompt: `Add regression tests proving untouched seeded demo data is not treated as meaningful account-import data, while edited demo-derived work is detected.`

## Sync / Cloud Risk

### 8. Current sync is best-effort, not a durable protocol

- Affected files: `src/features/plan12week/hooks/usePlanSetupSync.ts`, `src/features/plan12week/hooks/usePlanExecutionSync.ts`, `src/app/hooks/useBackendPlanHydration.ts`, `backend/src/services/planService.ts`
- Risk level: high
- Why it matters: Local save is reliable, but remote sync can miss writes, duplicate creates, or lose detail without a server-side sync contract.
- Recommended fix: Define and implement idempotent sync with client IDs, mutation IDs, revisions, tombstones, and a pull cursor.
- Should do before: MVP 2
- Suggested Codex prompt: `Draft backend and frontend changes for idempotent 12-week sync using client IDs, mutation IDs, revisions, tombstones, and a delta pull cursor. Do not implement billing or unrelated domains.`

### 9. No durable data mutation queue

- Affected files: `src/app/utils/storage-types.ts`, `src/app/utils/storage.ts`, `src/features/plan12week/hooks/usePlanExecutionSync.ts`, `src/app/utils/production/outboxSync.ts`
- Risk level: high
- Why it matters: Existing local outbox/event behavior is not enough to replay data mutations after offline use or failed auth/backend calls.
- Recommended fix: Add a per-auth-user data mutation queue with retry metadata, idempotency keys, and collapse rules for superseded updates.
- Should do before: MVP 2
- Suggested Codex prompt: `Add a design doc for a per-account data mutation queue for 12-week sync, including storage shape, retry policy, idempotency, and tests. Do not code yet.`

### 10. Backend link map scoping and migration needs continued verification

- Affected files: `src/app/utils/backend-link-storage.ts`, `src/lib/api/goalLinkStore.ts`, `src/features/plan12week/persistence/planLinkStore.ts`, `src/lib/api/orderLinkStore.ts`, `src/lib/api/visionBoardLinkStore.ts`
- Risk level: medium
- Why it matters: Link maps connect local IDs to backend IDs. If they are shared across users or migrated poorly, one browser profile can read stale links from another account.
- Recommended fix: Keep all link stores auth-scoped, preserve legacy fallback safely, and add tests for anonymous, user A/user B isolation, legacy fallback, and delete-all cleanup.
- Should do before: MVP 2
- Suggested Codex prompt: `Audit backend link stores for auth-scoped keys, legacy fallback, and deleteAllUserData cleanup. Add missing tests without changing public link-store APIs.`

### 11. Hydration loses detail fields

- Affected files: `src/app/hooks/useBackendPlanHydration.ts`, `src/app/hooks/useBackendProgressOverlay.ts`, `src/features/plan12week/persistence/backendConflictDetector.ts`, `backend/src/models/WeekModel.ts`, `backend/src/models/TaskModel.ts`, `backend/src/models/LeadMetricModel.ts`
- Risk level: medium
- Why it matters: Backend models do not yet store all local 12-week metadata, daily check-in detail, weekly review dimensions, completedAt, task core/optional metadata, or tactic schedules.
- Recommended fix: Add backend metadata fields or a dedicated 12-week bundle model before claiming complete cloud restore.
- Should do before: MVP 2
- Suggested Codex prompt: `Compare local TwelveWeekSystem fields to backend plan/week/task/metric models and propose the minimum schema additions needed for lossless MVP 2 restore.`

## Billing / Mock Risk

### 12. Mock entitlement can be mistaken for real paid access

- Affected files: `src/app/utils/production/*`, `src/app/pages/BillingPlan.tsx`, `src/app/pages/MockBillingCheckout.tsx`, `src/app/components/UpgradePaywallDialog.tsx`, `src/app/components/twelve-week/TwelveWeekPlanAccessSection.tsx`
- Risk level: medium
- Why it matters: MVP 1 allows mock upgrade. If copy or state labels imply real payment, public users can misunderstand product maturity.
- Recommended fix: Keep "mock checkout does not charge real money" visible in checkout, paywall, billing plan, and settings restore surfaces.
- Should do before: MVP 1
- Suggested Codex prompt: `Audit billing/paywall UI copy for MVP 1 and ensure every mock checkout or local entitlement surface says it is simulated and does not charge real money. Do not change billing logic.`

### 13. Billing provider contract is not a production payment system

- Affected files: `src/app/utils/production/billingProvider.ts`, `src/app/utils/production/mockBillingProvider.ts`, `src/app/utils/production/entitlementSync.ts`, `backend/src/routes/orderRoutes.ts`
- Risk level: medium
- Why it matters: The frontend has provider abstractions, but no owned production webhook, server-side entitlement authority, or provider reconciliation.
- Recommended fix: Before paid MVP, implement real provider endpoints, webhook verification, entitlement storage, and restore semantics. Keep mock provider isolated.
- Should do before: Paid MVP
- Suggested Codex prompt: `Create a technical plan for real billing provider integration with webhook verification and server-side entitlement authority. Do not implement payment code yet.`

### 14. `PRO` compatibility type can create public-plan confusion

- Affected files: `src/app/utils/twelve-week-premium.ts`, `src/app/utils/storage-types.ts`, billing UI components
- Risk level: low
- Why it matters: `PRO` appears as a compatibility type but is normalized to `PLUS`. Public copy should not imply a real Pro plan exists.
- Recommended fix: Keep UI copy on Free/Plus only unless a real Pro SKU is added.
- Should do before: Paid MVP
- Suggested Codex prompt: `Audit public pricing and entitlement copy to ensure PRO is not presented as a real plan while preserving internal compatibility types.`

## Analytics Risk

### 15. Local event log is not a verified production analytics pipeline

- Affected files: `src/app/utils/analytics.ts`, `src/app/utils/monetization-analytics.ts`, `src/app/utils/storage-types.ts`
- Risk level: medium
- Why it matters: MVP decisions may rely on analytics, but current behavior is local/debug oriented unless GA4 and host scripts are explicitly configured.
- Recommended fix: Decide MVP analytics mode, document it, and add tests that sensitive goal text, notes, email, and account IDs are not sent to external analytics.
- Should do before: Paid MVP
- Suggested Codex prompt: `Audit analytics payloads for sensitive data and add tests that public analytics events do not include goal text, notes, emails, or account identifiers.`

### 16. Outbox concerns are mixed

- Affected files: `src/app/utils/production/outboxSync.ts`, `src/app/utils/storage-types.ts`, `src/features/plan12week/hooks/usePlanExecutionSync.ts`
- Risk level: medium
- Why it matters: Analytics/event outbox and future data mutation replay have different guarantees. Mixing them can make sync behavior brittle.
- Recommended fix: Separate event/analytics outbox from data mutation queue in naming, storage shape, and retry policy.
- Should do before: MVP 2
- Suggested Codex prompt: `Write a refactor plan to separate analytics outbox from future data mutation queue, including storage compatibility and migration tests.`

## Backend Validation / Test Risk

### 17. Backend tests are service-heavy, not route-integration complete

- Affected files: `backend/src/tests/*.ts`, `backend/src/controllers/*.ts`, `backend/src/routes/*.ts`, `backend/src/app.ts`
- Risk level: medium
- Why it matters: Services now cover ownership and validation well in several areas, but route/controller middleware behavior can still regress without request-level tests.
- Recommended fix: Add lightweight Express integration tests using built-in Node test and mocked auth/service seams, or a small app-level test harness if no new dependency is allowed.
- Should do before: MVP 2
- Suggested Codex prompt: `Add backend route-level tests for goals/plans/weeks/tasks/metrics invalid id, bad payload, unauthorized, and cross-user conventions without adding dependencies.`

### 18. Plan creation is multi-write without transaction semantics

- Affected files: `backend/src/services/planService.ts`, `backend/src/repositories/mongo/MongoPlanRepository.ts`, `backend/src/repositories/mongo/MongoWeekRepository.ts`
- Risk level: medium
- Why it matters: Creating a plan and initializing weeks can partially succeed. For MVP 1 this is not blocking because local save comes first, but MVP 2 cloud restore/import needs stronger guarantees.
- Recommended fix: Add transaction support when Mongo deployment supports it, or add compensating cleanup and idempotent create semantics.
- Should do before: MVP 2
- Suggested Codex prompt: `Harden backend plan creation so plan + initialized weeks cannot leave partial unusable state. Prefer transaction or compensating cleanup, with tests.`

### 19. Bulk sync endpoints do not exist

- Affected files: `backend/src/routes`, `backend/src/controllers`, `backend/src/services`, `backend/src/models`
- Risk level: high
- Why it matters: MVP 2 requires reliable account restore/import. Current CRUD endpoints are not enough for efficient, conflict-safe migration of a full local 12-week workspace.
- Recommended fix: Add a scoped sync API contract before coding: import/upsert bundle, pull workspace, conflict metadata, idempotency, tombstones, and payload limits.
- Should do before: MVP 2
- Suggested Codex prompt: `Create backend API spec for MVP 2 12-week workspace import and pull endpoints, including validation, ownership, idempotency, tombstones, and tests. Do not code yet.`

## UX / Mobile Risk

### 20. Mobile step scroll/focus needs browser verification after every funnel change

- Affected files: `src/app/hooks/useScrollToTopOnChange.ts`, `src/app/pages/Onboarding.tsx`, `src/app/pages/SMARTGoalSetup.tsx`, `src/app/pages/FeasibilityCheck.tsx`, `src/app/pages/12WeekSetup.tsx`, `src/app/pages/12WeekSystem.tsx`
- Risk level: medium
- Why it matters: The public demo is mobile-sensitive. Step transitions that start mid-screen make the flow feel broken even when logic works.
- Recommended fix: Keep hook tests and add mobile viewport smoke checks whenever funnel steps/tabs are changed.
- Should do before: MVP 1
- Suggested Codex prompt: `Run mobile browser verification for the core funnel step transitions and fix only scroll/focus regressions without changing business logic.`

### 21. 12-week system can become visually crowded

- Affected files: `src/app/pages/12WeekSystem.tsx`, `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`, `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`, `src/app/components/twelve-week/TwelveWeekProgressTab.tsx`, `src/app/components/twelve-week/TwelveWeekDeviceDetailsSection.tsx`
- Risk level: medium
- Why it matters: MVP 1 must answer "what do I do today?" quickly. Too many panels, diagnostics, sync notices, or paywall surfaces can dilute the execution loop.
- Recommended fix: Keep Today primary, move secondary sync/device/billing details into Settings or collapsible sections, and verify mobile layout with screenshots.
- Should do before: MVP 1
- Suggested Codex prompt: `Review 12WeekSystem UX for public demo scanability and make only small layout/copy changes that keep Today primary and do not change storage or sync behavior.`

### 22. Plan generation caps are implicit

- Affected files: `src/app/pages/12WeekSetup/helpers.ts`, `src/features/plan12week/logic/taskConstraints.ts`, `src/app/pages/12WeekSetup/components/LeadIndicatorsStep.tsx`
- Risk level: low
- Why it matters: The setup now guards against overloaded schedules, but users may not understand why preview task counts differ from raw tactic targets.
- Recommended fix: Add small helper copy only if user testing shows confusion. Do not add a complex planner UI.
- Should do before: MVP 2
- Suggested Codex prompt: `Audit 12WeekSetup copy around weekly load caps and add minimal helper text if needed, without changing generation logic or layout structure.`

## Deployment / Ops Risk

### 23. Production env can accidentally switch demo into real mode

- Affected files: `.env.production`, `guidelines/MVP_1_RELEASE_CHECKLIST.md`, `scripts/check-runtime-env.mjs`, Vercel project env
- Risk level: high
- Why it matters: MVP 1 public demo must not require Firebase/backend. A Vercel env override to `VITE_APP_MODE=real` without full Firebase/API config can block or confuse the demo.
- Recommended fix: Treat demo-safe env review as a release gate. Run `npm run env:check` and deployed smoke before sharing the URL.
- Should do before: MVP 1
- Suggested Codex prompt: `Audit production env and release checklist for MVP 1 demo safety. Verify VITE_APP_MODE=demo, mock billing, analytics off, and no required Firebase/backend path.`

### 24. Production smoke depends on secrets and deployment state

- Affected files: `scripts/smoke-production-e2e.mjs`, `.github/workflows/production-smoke-e2e.yml`, `scripts/smoke-mvp1-local-demo.mjs`
- Risk level: medium
- Why it matters: Local tests can pass while deployed routes, env, service worker cache, or mock checkout return paths fail.
- Recommended fix: Run `npm run smoke:mvp1` locally and `npm run smoke:prod` or manual production QA before public sharing. Document skipped smoke with the exact reason.
- Should do before: MVP 1
- Suggested Codex prompt: `Run MVP 1 local smoke and production smoke against the candidate URL. If smoke cannot run, document the missing browser/env/secret blocker exactly.`

### 25. Backend health is optional for demo but risky for full-stack claims

- Affected files: `scripts/check-runtime-env.mjs`, `backend/src/app.ts`, `backend/src/config/env.ts`, `render.yaml`
- Risk level: low for MVP 1, medium for MVP 2
- Why it matters: Release status showed API health fetch failed. This does not block local-first demo, but it blocks claims that full-stack sync is verified.
- Recommended fix: Keep MVP 1 copy local-first. Before MVP 2 real-mode rollout, verify Render health, CORS, Firebase Admin, MongoDB, and frontend env together.
- Should do before: MVP 2
- Suggested Codex prompt: `Run full-stack runtime env checks and backend health verification for real mode, then document exact env or deployment blockers. Do not change product code.`

### 26. Service worker and cached assets can hide rollback state

- Affected files: `public/sw.js`, `guidelines/MVP_1_RELEASE_CHECKLIST.md`, deployment docs
- Risk level: medium
- Why it matters: A stale cached SPA can make a fixed deployment look broken or make rollback appear ineffective for testers.
- Recommended fix: Include hard refresh/unregister service worker in rollback notes, and review cache naming when asset behavior changes.
- Should do before: MVP 1
- Suggested Codex prompt: `Audit service worker caching and rollback instructions for Vercel demo deploys. Do not change code unless stale asset behavior is reproducible.`

## Practical Priority Summary

MVP 1 public demo priorities:

- Keep demo env local-first and not login-gated.
- Keep mock billing visibly simulated.
- Verify mobile core funnel and 12-week Today flow.
- Run local and deployed smoke before public sharing.

MVP 2 priorities:

- Explicit local-to-account migration.
- Auth-scoped link maps and account isolation.
- Durable sync contract with idempotency, revisions, tombstones, and pull cursor.
- Backend route/integration test coverage for planning APIs.

Paid MVP priorities:

- Real billing provider plan, webhook verification, and server-side entitlement authority.
- Verified production analytics with sensitive payload controls.
- Clear public pricing/plan copy with no mock/real ambiguity.
