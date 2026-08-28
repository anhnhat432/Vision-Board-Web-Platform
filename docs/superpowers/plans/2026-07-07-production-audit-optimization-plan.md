# Production Audit Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the production product from locally verified improvements to deployed, user-safe launch readiness without disrupting existing users, storage, billing, auth, or core flows.

**Architecture:** Treat production readiness as a sequence of small, independently verifiable bundles. Ship the launch-blocking 12-week execution fix first, then publish already-verified core safety bundles, then run deployed proof workflows before broader UX/performance work.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest, Playwright, Express, MongoDB/Mongoose, Firebase Auth/Admin, Vercel, Render, GitHub Actions.

---

## Evidence Snapshot

- Repo: `D:\Projects\Vision Board Web Platform`
- Branch: `main`, tracking `origin/main`
- Current dirty state after the latest verification pass: 44 tracked modified files and 34 untracked files by `git diff --name-only` / `git ls-files --others --exclude-standard`; nothing staged.
- Latest production smoke: GitHub Actions run `28842465390`, status `completed`, conclusion `failure`, SHA `f6b4f94f8add78a30e95dedeb38fee63f82cdc10`, created `2026-07-07T04:52:52Z`.
- Readiness guard: `npm.cmd run proof:readiness` is blocked because the latest production smoke failed and the Today task mitigation is still unpublished.
- Continuation refresh on `2026-07-08`: `gh run list --workflow production-smoke-e2e.yml --limit 5 --json databaseId,status,conclusion,headSha,createdAt,displayTitle,url` still reports run `28842465390` as the latest completed failure, and `npm.cmd run proof:readiness` still exits 1 with the unpublished Today mitigation note.
- Local verification already run in this working tree:
  - `npm.cmd run check`: typecheck, Biome lint, 122 fast test files / 1286 tests, production build. One earlier Node 24 local run exited after build with a native `src\win\async.c` assertion, then the exact command was rerun and exited 0; CI uses Node 20.20.2 from `.nvmrc`.
  - `npm.cmd --prefix backend run check`: backend typecheck and build.
  - `npm.cmd --prefix backend test`: backend build and default guarded Node test runner, 596/596 tests passed, including continuation refresh.
  - `npm.cmd --prefix backend run test:run -- dist/tests/authRoutes.test.js`: 6/6 pass.
  - `npm.cmd --prefix backend run test:run -- dist/tests/planBulkSyncRoutes.test.js`: 5/5 pass.
  - `npm.cmd --prefix backend run test:run -- dist/tests/healthRoutes.test.js`: 3/3 pass.
  - `npm.cmd --prefix backend run test:run -- dist/tests/authRoutes.test.js dist/tests/planBulkSyncRoutes.test.js dist/tests/healthRoutes.test.js`: 14/14 pass on continuation refresh.
  - `npm.cmd --prefix backend run check`: pass on continuation refresh.
  - `npm.cmd run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`: 57/57 pass on continuation refresh.
  - `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx"`: 57/57 pass on Bundle A preflight.
  - `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:flows -- src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx"`: 22/22 pass on Bundle A preflight.
  - `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:production-core:slow"`: 5/5 pass on Bundle A preflight.
  - `npx -y -p node@20 -p npm@11.13.0 -c "npm run typecheck && npm run lint && npm run test:production-core:frontend && npm run test:run && npm run build"`: pass on continuation refresh. This covered Biome lint over 950 files, production-core frontend suites (`test:ops` 59/59, unit 41/41, UI 106/106, sync 155/155, slow 5/5), fast tests 122 files / 1286 tests, and Vite production build.
  - `npm.cmd --prefix backend run test:run -- dist/tests/accountRoutes.test.js dist/tests/billingRoutes.test.js dist/tests/receiptEmail.test.js dist/tests/runNodeTestsScript.test.js`: 55/55 pass.
  - `npm.cmd run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx src/app/pages/OrderStatusPage.polling.test.tsx src/app/pages/Dashboard.active-system.test.tsx src/app/pages/DashboardEntry.performance.test.tsx src/app/features/assistant/__tests__/useProactiveNudge.test.tsx src/app/pages/billing-production-surfaces.test.tsx`: 112/112 pass.
  - `npm.cmd run test:run -- src/app/hooks/useNetworkStatus.test.ts src/lib/auth/firebase.test.ts src/lib/auth/useAuth.logout.test.ts src/lib/auth/authedFetch.test.ts src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts src/app/features/assistant/__tests__/proactiveNudgePhase9.test.ts`: 31/31 pass.
  - `npm.cmd run test:ops`: 59/59 pass.
  - `npx vitest run --config vitest.flows.config.ts --silent=true src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`: 22/22 pass.
  - `npm.cmd run smoke:core-quality`: pass, including Today task toggle persisted to localStorage; refreshed on continuation against `http://localhost:5173`.
  - Bundle A hygiene preflight: `git diff --check -- src/app/components/twelve-week/TwelveWeekTodayTab.tsx src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx` passed, and `docs/specs/2026-07-06-production-smoke-today-task-toggle.md` had no trailing whitespace.
  - `npm.cmd run env:check`: pass in local report-only mode; local env resolves `VITE_APP_MODE=demo`.
  - `npm.cmd run env:check:full`: blocked locally because full-stack expects `VITE_APP_MODE=real`, real billing env, and API health. Current local missing/failing checks: `BILLING_PROVIDER`, `BILLING_REPOSITORY`, `VITE_APP_MODE`, and API health.
  - `npm.cmd run proof:readiness`: blocked because production smoke run `28842465390` failed and the local Today mitigation is unpublished; GitHub secret readiness and workflow availability passed.
- Manual Playwright spot-check against production preview `http://127.0.0.1:4177` on desktop and mobile for `/` and `/12-week-system`: HTTP 200, expected content present, no console/page errors, no horizontal overflow. The unauthenticated real-mode `/12-week-system` check redirected to `/login?next=%2F12-week-system`, as expected.

## Continuation Progress Snapshot

Updated on `2026-07-08` after the audit bundles were separated into production-safe PRs:

- PR #102 `fix: persist Today task toggles before unmount`: open against `main`; local and PR verification previously recorded.
- PR #103 `fix: explain unpublished smoke mitigations in readiness proof`: open against `main`; local and PR verification previously recorded.
- PR #104 `fix: harden account and billing safety paths`: open against `main`; updated with frontend regression tests for redacted terminal public order responses.
- PR #105 `fix: avoid storing firebase bearer tokens in localStorage`: open against `main`; PR checks previously green.
- PR #106 `fix: add public metadata and analytics csp boundary`: open against `main`; PR checks previously green after CodeQL-safe hostname assertions.
- PR #107 `perf: reduce background work without visual changes`: open against `main`; PR checks previously green.
- PR #108 `fix: route assistant nudges to supported flows`: open against `main`; PR checks previously green.
- PR #109 `fix: polish mobile public and login surfaces`: open against `main`; PR checks green on `2026-07-08`.
- PR #110 `fix: flush assistant telemetry on page lifecycle`: opened from `codex/assistant-telemetry-lifecycle-flush`; local verification passed before push.

Additional local verification run during the continuation:

- `npm.cmd run test:ui -- src/app/pages/OrderStatusPage.polling.test.tsx src/app/pages/billing-production-surfaces.test.tsx`: 32/32 pass.
- `npm.cmd run test:run -- src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts`: 2/2 pass.
- `npm.cmd run typecheck`: pass for both the billing-test continuation and telemetry continuation.
- `npm.cmd run lint`: pass for both the billing-test continuation and telemetry continuation.
- `npm.cmd run build`: pass for both the billing-test continuation and telemetry continuation.

Launch readiness is still intentionally **not claimed**. These PRs must be merged/deployed in the intended order, production smoke must become green on `main`, `npm.cmd run proof:readiness` must exit 0, and required staging proof workflows must be recorded before treating the product as launch-ready.

## Dirty Worktree Release Bundle Manifest

This manifest is a staging guardrail for the current dirty tree. Re-run `git status --porcelain=v1 -uall`, `git diff --name-only`, and `git ls-files --others --exclude-standard` before staging. Use explicit pathspecs only; do not use `git add .`.

### Bundle A: Launch-blocking Today task persistence

Purpose: unblock the failed production smoke without mixing unrelated UI, backend, billing, SEO, or analytics changes.

Stage only:
- `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
- `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
- `docs/specs/2026-07-06-production-smoke-today-task-toggle.md`

Fresh verification available:
- `npm.cmd run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`: 57/57 pass.
- `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx"`: 57/57 pass.
- `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:flows -- src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx"`: 22/22 pass.
- `npx -y -p node@20 -p npm@11.13.0 -c "npm run test:production-core:slow"`: 5/5 pass.
- `npm.cmd run smoke:core-quality`: pass, including Today task toggle persisted to `localStorage`.
- Node 20 frontend CI-like command: pass.
- Diff hygiene: tracked Bundle A diff passes `git diff --check`; spec file has no trailing whitespace.

Nuance before staging: the two Today component/test files also include a small mobile action-bar style hunk (`bg-app-surface` and shadow instead of translucent surface/backdrop blur). Staging the whole files includes that polish. If the first production unblock commit must be pure persistence logic, split or review that hunk before staging.

Do not stage with this bundle:
- `src/app/pages/Dashboard.tsx`
- `src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`
- Any backend, auth, billing, SEO, analytics, or output artifact files.

### Bundle B: Launch proof/readiness harness

Purpose: make `proof:readiness` explain unpublished local mitigation files while keeping workflow dispatch behavior unchanged.

Stage only:
- `scripts/check-production-smoke-run-readiness.mjs`
- `scripts/check-production-smoke-run-readiness.test.mjs`

Fresh verification available:
- `npm.cmd run test:ops`: 59/59 pass.
- Node 20 frontend CI-like command: pass.

### Bundle C: Backend safety and controller coverage

Purpose: improve account deletion ordering, public order redaction, billing support copy, backend test runner safety, and route/controller coverage without changing storage formats.

Stage only after Bundle A is deployed or in a separate backend-safety commit:
- `backend/package.json`
- `backend/src/scripts/runNodeTests.ts`
- `backend/src/controllers/accountController.ts`
- `backend/src/controllers/billingController.ts`
- `backend/src/controllers/orderStatusController.ts`
- `backend/src/services/receiptEmailService.ts`
- `backend/src/tests/accountRoutes.test.ts`
- `backend/src/tests/authRoutes.test.ts`
- `backend/src/tests/billingRoutes.test.ts`
- `backend/src/tests/healthRoutes.test.ts`
- `backend/src/tests/planBulkSyncRoutes.test.ts`
- `backend/src/tests/receiptEmail.test.ts`
- `backend/src/tests/runNodeTestsScript.test.ts`
- `docs/specs/2026-07-07-account-deletion-ordering.md`
- `docs/specs/2026-07-07-billing-portal-support-email.md`
- `docs/specs/2026-07-07-public-order-status-redaction.md`

Fresh verification available:
- `npm.cmd --prefix backend run test:run -- dist/tests/authRoutes.test.js dist/tests/planBulkSyncRoutes.test.js dist/tests/healthRoutes.test.js`: 14/14 pass.
- `npm.cmd --prefix backend run check`: pass.
- `npm.cmd --prefix backend test`: 596/596 pass.

### Bundle D: Firebase token storage hardening

Purpose: stop mirroring Firebase bearer tokens into `localStorage` while preserving the legacy session hint behavior.

Stage only:
- `src/lib/auth/firebase.ts`
- `src/lib/auth/firebase.test.ts`
- `src/lib/auth/useAuth.ts`
- `src/lib/auth/useAuth.logout.test.ts`
- `docs/specs/2026-07-07-firebase-token-storage-hardening.md`

Fresh verification available:
- Node 20 frontend CI-like command: pass.

### Bundle E: Public metadata, CSP, and analytics boundary

Purpose: improve SEO/social sharing metadata, mobile browser chrome color, and CSP analytics allowlist without changing payment or auth behavior.

Stage only:
- `index.html`
- `vercel.json`
- `scripts/check-runtime-env.test.mjs`

Fresh verification available:
- `npm.cmd run test:ops`: 59/59 pass.
- Node 20 frontend CI-like command: pass.

### Bundle F: No-visual performance reductions

Purpose: reduce background work and preconnect/prefetch cost without changing visible product UI.

Stage only:
- `src/app/components/root-layout/AppShellLayout.tsx`
- `src/app/components/root-layout/hooks/useUiBootstrap.ts`
- `src/app/components/root-layout/hooks/useUiBootstrap.test.ts`
- `src/app/hooks/useNetworkStatus.ts`
- `src/app/hooks/useNetworkStatus.test.ts`
- `src/features/plan12week/hooks/useAutoCloudSync.ts`
- `src/app/pages/DashboardEntry.tsx`
- `src/app/pages/DashboardEntry.performance.test.tsx`
- `docs/superpowers/specs/2026-07-07-no-visual-performance-optimization-design.md`
- `docs/superpowers/plans/2026-07-07-no-visual-performance-optimization.md`

Fresh verification available:
- Node 20 frontend CI-like command: pass.
- Manual desktop/mobile browser spot-check previously recorded.

### Bundle G: Assistant and dashboard route alignment

Purpose: keep assistant actions and dashboard CTAs pointed at routes that exist and match the current 12-week workflow.

Stage only:
- `backend/src/services/aiAssistantService.ts`
- `backend/src/shared/assistantActionSchema.ts`
- `backend/src/tests/aiAssistantService.test.ts`
- `backend/src/tests/assistantActionContract.test.ts`
- `src/app/features/assistant/__tests__/assistantActionContract.test.ts`
- `src/app/features/assistant/__tests__/proactiveNudgePhase9.test.ts`
- `src/app/features/assistant/__tests__/useProactiveNudge.test.tsx`
- `src/app/features/assistant/useProactiveNudge.ts`
- `src/app/pages/Dashboard.active-system.test.tsx`
- `src/app/pages/Dashboard.fresh-state.test.tsx`
- `src/app/pages/Dashboard.test.tsx`
- `src/app/pages/Dashboard.tsx`
- `src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`
- `docs/specs/2026-07-08-assistant-route-whitelist-alignment.md`

Fresh verification available:
- Node 20 frontend CI-like command: pass.
- `npm.cmd --prefix backend test`: 596/596 pass.

### Bundle H: Mobile/public polish and auth-route polish

Purpose: low-risk UI polish that should not be mixed with launch-blocking or security-sensitive commits.

Stage only after re-reviewing the visual diff:
- `src/features/dashboard/v2/PublicVisitorView.tsx`
- `src/features/dashboard/v2/PublicVisitorView.css`
- `src/app/pages/LoginPage.tsx`

Fresh verification available:
- Node 20 frontend CI-like command: pass.

### Bundle I: Audit documentation

Purpose: record the audit plan, evidence, and release sequencing.

Stage only:
- `docs/superpowers/plans/2026-07-07-production-audit-optimization-plan.md`

### Files not to stage by default

These are QA/evidence artifacts and temporary files. Keep them out of code commits unless a dedicated evidence artifact is requested:
- `output/playwright/**`
- `tmp/**`

Also keep `src/app/features/assistant/assistantTelemetryClient.ts` and `src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts` out of the first launch-unblock commit; they belong to a separate analytics/telemetry proof pass after route and billing safety commits are separated.

## Critical Issues That May Hurt Users Or Revenue

### Critical 1: Production smoke fails on Today task persistence

**User impact:** A real signed-in user may click a Today task and fail to persist local progress during rerender, hydration, unmount, or sync churn. This undermines the core product promise.

**Current local fix bundle:**
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
- Create: `docs/specs/2026-07-06-production-smoke-today-task-toggle.md`

**Production-safe path:**
- [ ] Stage only the three files above.
- [ ] Commit with a narrow message such as `fix: persist today task toggle before unmount`.
- [ ] Push to `origin/main` only after explicit user authorization.
- [ ] Wait for Vercel production deployment and GitHub Actions production smoke.
- [ ] Run `npm.cmd run proof:readiness` after the deployed smoke completes.

**Verification required before treating this as resolved:**
- `npm.cmd run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
- `npm.cmd run test:flows -- src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`
- `npm.cmd run smoke:core-quality`
- Latest `production-smoke-e2e.yml` run on `main` must conclude `success`.
- `npm.cmd run proof:readiness` must report production smoke ready.

### Critical 2: Launch proof cannot advance while production smoke is red

**User impact:** Account deletion, LWW sync, email verification, and core funnel proof should not be dispatched as final launch evidence while the default production smoke is failing.

**Relevant files:**
- `.github/workflows/production-smoke-e2e.yml`
- `scripts/check-launch-proof-readiness.mjs`
- `scripts/check-production-smoke-run-readiness.mjs`
- `scripts/check-production-smoke-run-readiness.test.mjs`

**Production-safe path:**
- [ ] Resolve Critical 1 first.
- [ ] Re-run `npm.cmd run proof:readiness`.
- [ ] If production smoke is green, dispatch staging proof workflows in this order: core funnel, account deletion, email verification, LWW sync.
- [ ] Record run ids, target URLs, and pass/fail evidence in the soft-launch proof ledger before go/no-go.

## High-Impact Quick Wins Already Implemented Locally

### Quick Win 1: Account deletion ordering

**Why it helps users:** Prevents cloud app data from being deleted before Firebase account deletion succeeds. If Firebase deletion fails, users can retry without cloud data already being removed.

**Files:**
- `backend/src/controllers/accountController.ts`
- `backend/src/tests/accountRoutes.test.ts`
- `docs/specs/2026-07-07-account-deletion-ordering.md`

**Verification already run:**
- `npm.cmd --prefix backend run test:run -- dist/tests/accountRoutes.test.js dist/tests/billingRoutes.test.js dist/tests/runNodeTestsScript.test.js`
- `npm.cmd --prefix backend run check`

**Publish guidance:** Ship after the Today task blocker or in a separate core-safety commit. Do not mix with visual artifacts.

### Quick Win 2: Public order status redaction for terminal orders

**Why it helps users:** Keeps pending anonymous checkout usable while reducing exposure of payment instructions after an order is completed, expired, or failed.

**Files:**
- `backend/src/controllers/orderStatusController.ts`
- `backend/src/tests/billingRoutes.test.ts`
- `src/app/pages/OrderStatusPage.polling.test.tsx`
- `docs/specs/2026-07-07-public-order-status-redaction.md`

**Verification already run:**
- `npm.cmd --prefix backend run test:run -- dist/tests/accountRoutes.test.js dist/tests/billingRoutes.test.js dist/tests/runNodeTestsScript.test.js`
- `npm.cmd run test:ui -- src/app/pages/OrderStatusPage.polling.test.tsx`

**Publish guidance:** Ship as a billing/privacy safety commit after checking that support staff can still use authenticated order status for terminal orders.

### Quick Win 3: Billing portal and receipt support email fallback

**Why it helps users:** Replaces outdated support copy in unsupported customer-portal states and payment receipts with the configured or branded support email.

**Files:**
- `backend/src/controllers/billingController.ts`
- `backend/src/tests/billingRoutes.test.ts`
- `backend/src/services/receiptEmailService.ts`
- `backend/src/tests/receiptEmail.test.ts`
- `docs/specs/2026-07-07-billing-portal-support-email.md`

**Verification already run:**
- `npm.cmd --prefix backend run test:run -- dist/tests/accountRoutes.test.js dist/tests/billingRoutes.test.js dist/tests/runNodeTestsScript.test.js`
- `npm.cmd --prefix backend run test:run -- dist/tests/billingRoutes.test.js dist/tests/receiptEmail.test.js`
- `npm.cmd --prefix backend run check`

**Publish guidance:** Ship with backend env review for `SUPPORT_EMAIL`, `VITE_BILLING_SUPPORT_EMAIL`, and `BILLING_SUPPORT_EMAIL`.

### Quick Win 4: Firebase token storage hardening

**Why it helps users:** Stops mirroring Firebase bearer tokens into `localStorage`; keeps only a non-sensitive session hint under the legacy key.

**Files:**
- `src/lib/auth/firebase.ts`
- `src/lib/auth/firebase.test.ts`
- `src/lib/auth/useAuth.ts`
- `src/lib/auth/useAuth.logout.test.ts`
- `docs/specs/2026-07-07-firebase-token-storage-hardening.md`

**Verification already run:**
- `npm.cmd run test:run -- src/lib/auth/firebase.test.ts src/lib/auth/useAuth.logout.test.ts src/lib/auth/authedFetch.test.ts`
- Covered again by `npm.cmd run check`.

**Publish guidance:** Ship as a separate auth-security commit and monitor sign-in/session-restore behavior after deploy.

### Quick Win 5: No-visual performance reductions

**Why it helps users:** Reduces background prefetch and network listener work without changing visible UI, layout, storage, billing, or auth contracts.

**Files:**
- `src/app/components/root-layout/AppShellLayout.tsx`
- `src/app/components/root-layout/hooks/useUiBootstrap.ts`
- `src/app/components/root-layout/hooks/useUiBootstrap.test.ts`
- `src/app/hooks/useNetworkStatus.ts`
- `src/app/hooks/useNetworkStatus.test.ts`
- `src/features/plan12week/hooks/useAutoCloudSync.ts`
- `src/app/pages/DashboardEntry.tsx`
- `src/app/pages/DashboardEntry.performance.test.tsx`
- `docs/superpowers/specs/2026-07-07-no-visual-performance-optimization-design.md`
- `docs/superpowers/plans/2026-07-07-no-visual-performance-optimization.md`

**Verification already run:**
- `npm.cmd run test:run -- src/app/components/root-layout/hooks/useUiBootstrap.test.ts src/app/hooks/useNetworkStatus.test.ts`
- `npm.cmd run test:ui -- src/app/pages/DashboardEntry.performance.test.tsx`
- `npm.cmd run check`
- Manual desktop/mobile browser spot-check.

**Publish guidance:** Keep this separate from core safety commits so performance behavior can be isolated if a regression appears.

### Quick Win 6: Assistant and dashboard route clarity

**Why it helps users:** Sends nudges and dashboard review CTAs to routes that exist and fit the current 12-week workflow.

**Files:**
- `src/app/features/assistant/useProactiveNudge.ts`
- `src/app/features/assistant/__tests__/useProactiveNudge.test.tsx`
- `src/app/features/assistant/__tests__/proactiveNudgePhase9.test.ts`
- `src/app/pages/Dashboard.tsx`
- `src/app/pages/Dashboard.active-system.test.tsx`
- `src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`

**Verification already run:**
- `npm.cmd run test:ui -- src/app/pages/Dashboard.active-system.test.tsx src/app/features/assistant/__tests__/useProactiveNudge.test.tsx`
- `npm.cmd run test:run -- src/app/features/assistant/__tests__/proactiveNudgePhase9.test.ts`
- `npx vitest run --config vitest.flows.config.ts --silent=true src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`

**Publish guidance:** Ship after Critical 1, or bundle with the no-visual UX/performance commit if the final diff remains small and isolated.

## Medium-Term Improvements

### Medium 1: Deployed proof workflow evidence

**Files and commands:**
- `.github/workflows/core-funnel-quality-staging.yml`
- `.github/workflows/account-delete-e2e-staging.yml`
- `.github/workflows/email-verification-e2e-staging.yml`
- `.github/workflows/lww-e2e-staging.yml`
- `npm.cmd run proof:readiness`

**Execution plan:**
- [ ] Wait until Critical 1 production smoke passes.
- [ ] Dispatch core funnel quality staging against a non-local staging or production-like URL.
- [ ] Dispatch account deletion staging only with destructive opt-in and disposable account credentials.
- [ ] Dispatch email verification staging using either generated disposable signup or complete fixed credentials.
- [ ] Dispatch LWW staging only with an overwrite-safe account and explicit overwrite opt-in.

### Medium 2: Production analytics proof

**Files to inspect before implementation:**
- `index.html`
- `vercel.json`
- `src/app/utils/analytics.ts`
- `src/app/features/assistant/assistantTelemetryClient.ts`
- `src/app/features/assistant/__tests__/assistantTelemetryClient.test.ts`

**Execution plan:**
- [ ] Confirm production GA4 measurement ownership and env setup outside the repo.
- [ ] Verify CSP allows only the analytics endpoints actually used.
- [ ] Capture a browser/network proof that page view and key core-flow events are emitted without exposing user data.

### Medium 3: Bundle and main-thread performance measurement

**Files to inspect before implementation:**
- `dist` build output from `npm.cmd run build`
- `src/app/pages/DashboardEntry.tsx`
- `src/app/components/root-layout/AppShellLayout.tsx`
- `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
- `src/features/plan12week/hooks/useAutoCloudSync.ts`

**Execution plan:**
- [ ] Capture before/after route load metrics for `/`, `/12-week-system`, and `/billing/plan`.
- [ ] Classify bottlenecks as network, JavaScript long task, render/layout, animation, backend/API, or React data flow.
- [ ] Only then choose a scoped optimization.

### Medium 4: Backend controller coverage expansion

**Files to inspect before implementation:**
- `backend/src/controllers`
- `backend/src/routes`
- `backend/src/services`
- `backend/src/tests`

**Progress added locally:**
- `backend/src/tests/authRoutes.test.ts` covers protected profile bootstrap/read/update behavior, protected-field rejection, allowed-field normalization, and invalid date rejection.
- `backend/src/tests/planBulkSyncRoutes.test.ts` covers auth and verified-email guards, invalid plan id/body rejection, and valid bulk-sync delegation with authenticated `uid`, `planId`, and normalized payload.
- `backend/src/tests/healthRoutes.test.ts` covers backend health payload stability and billing health cache/database status behavior.
- Latest backend verification: targeted test runs above, `npm.cmd --prefix backend run check`, and `npm.cmd --prefix backend test` with 596/596 passing.

**Execution plan:**
- [x] Identify untested production controllers that touch sync, billing, auth/profile, account lifecycle, or orders.
- [x] Add focused backend route/service test bundles for auth/profile, plan bulk sync, and health/billing health risk surfaces.
- [x] Run targeted compiled backend tests and `npm.cmd --prefix backend run check`.

## Things That Should Not Be Changed Yet

- Do not change localStorage keys or persisted shapes for `UserData`, goals, billing, entitlement, outbox, or `TwelveWeekSystem` unless a migration spec is written first.
- Do not change checkout-session entitlement authority; Plus must not unlock from checkout-session response alone.
- Do not change provider-specific payment assumptions unless the task targets Casso, PayOS, VNPay, MoMo, or another named provider.
- Do not redesign branding, main navigation, or the core loop while production smoke is red.
- Do not stage `output/playwright/*` or `tmp/*` QA screenshots unless an explicit evidence artifact is requested.
- Do not mix the launch-blocking Today task fix with broad UX, SEO, analytics, or backend safety commits.

## Recommended Commit Order

1. `fix: persist today task toggle before unmount`
   - `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
   - `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
   - `docs/specs/2026-07-06-production-smoke-today-task-toggle.md`
2. `fix: harden account and billing safety paths`
   - Account deletion ordering, billing portal support email, public order terminal redaction, backend test runner guard.
3. `fix: avoid storing firebase bearer tokens in localStorage`
   - Firebase token storage hardening bundle.
4. `perf: reduce background work without visual changes`
   - Warm prefetch gate, network listener gate, signed-out route warm removal, no-visual plan/spec.
5. `fix: route dashboard and assistant nudges to supported flows`
   - Dashboard weekly review CTA, assistant nudge route corrections, flow test hardening.
6. `docs: record production audit optimization plan`
   - This plan file.

## Verification Gate Before Launch Claim

- [ ] `npm.cmd run check`
- [ ] `npm.cmd --prefix backend run check`
- [ ] `npm.cmd run smoke:core-quality`
- [ ] Desktop/mobile browser spot-check for `/` and `/12-week-system`
- [ ] Latest `production-smoke-e2e.yml` run on `main` concludes `success`
- [ ] `npm.cmd run proof:readiness` concludes ready
- [ ] Staging proof workflows have recorded pass evidence for core funnel, account deletion, email verification, and LWW sync where required
