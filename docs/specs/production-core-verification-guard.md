# Production Core Verification Guard Spec

## 1. Context & Goal

- Feature / bug: the four launch-critical Core specs had focused tests, but no single CI guard ran the exact cross-config proof set.
- Why now: production readiness claims for auth, billing, sync trust, and real/demo boundaries must fail fast on PRs.
- User impact: safer launch path; regressions in paid access, account lifecycle, sync trust, or demo leakage are caught before merge.
- Modes affected: real and demo boundaries through tests only.

## 2. Surface Classification

- Type: Shell verification for Core specs.
- Touched domains: npm scripts, CI workflow, spec evidence.
- Existing invariants that must not break: runtime behavior unchanged; no localStorage shape/key changes; no secrets in CI.

## 3. Functional Requirements

1. WHEN a developer wants production-core proof, THE system SHALL provide one npm command that runs the focused ops, unit, UI, sync, slow Vitest, backend billing, backend account lifecycle, and backend sync suites named by the Core specs.
2. WHEN CI runs on pull request or main push, THE system SHALL run that production-core proof before the broad fast test suite.
3. WHERE backend Core proof is needed, THE root guard SHALL run focused backend suites without staging secrets or destructive account deletion.
4. WHILE staging credentials are absent, THE system SHALL keep E2E proof out of this guard and leave staging proof to opt-in workflows.
5. WHEN a developer needs focused backend proof, THE backend SHALL expose a targeted test command that builds once and passes explicit `dist/tests/*.test.js` files to `node --test`.

## 4. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no runtime change.
- rollback / restore concerns: removing the script only removes CI proof, not app behavior.

## 5. Acceptance Criteria

- [x] `npm run test:production-core` exists.
- [x] command includes focused evidence for ops readiness, real/demo boundary, billing entitlement authority, auth/account lifecycle, and 12-week sync trust.
- [x] command includes focused backend billing, account lifecycle, and sync proof through root scripts.
- [x] CI frontend job runs `npm run test:production-core`.
- [x] command runs without staging credentials or destructive account deletion.
- [x] backend targeted proof can run explicit dist test files without running the whole backend suite.

## 6. Verification Plan

```bash
npm.cmd run test:production-core
npm.cmd run test:production-core:backend
npm.cmd --prefix backend run test:run -- dist/tests/auth.requireEmailVerified.test.js
```

Optional broader checks:

```bash
npm.cmd run typecheck
npm.cmd run lint
```

## 7. Out of Scope

- Running Playwright staging E2E proof in default CI.
- Adding provider secrets or reading repository secret values.
- Changing app behavior.

## 8. Batch Evidence - 2026-06-26

- The production-core guard was verified locally as focused groups so failures could be isolated by surface:
  - `npm.cmd run test:ops` passed: 15 tests.
  - `npm.cmd run test:production-core:unit` passed: 29 tests.
  - `npm.cmd run test:production-core:ui` passed: 89 tests.
  - `npm.cmd run test:production-core:sync` passed: 65 tests.
  - `npm.cmd run test:production-core:slow` passed: 5 tests.
  - `npm.cmd run lint` passed.
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run build` passed with Vite chunk-size warnings only.
  - `npm.cmd --prefix backend run typecheck` passed.
  - `npm.cmd --prefix backend run build` passed.
  - `npm.cmd run test:production-core:backend` passed: 56 backend billing tests and 12 backend sync tests.
- The full aggregate guard `npm.cmd run test:production-core` also passed locally on 2026-06-26 after adding the core-funnel deployed URL harness guard: ops (17 tests), unit (29 tests), UI (89 tests), sync (65 tests), slow (5 tests), backend billing (56 tests), and backend sync (12 tests).
- This is local repo proof only. It does not replace deployed staging evidence for core-funnel, production smoke, email verification, account deletion, or LWW workflows.
- `src/test/ux-ui-upgrade/no-window-confirm-runtime.test.ts` now statically scans runtime source under `src/app`, `src/features`, `src/lib`, and `src/services`, so the production-core unit guard fails if `window.confirm(` reappears outside the narrower core-flow grep.
- Current ops guard coverage after production-smoke trust-surface guards were added: `npm.cmd run test:ops` passed 22 tests on 2026-06-27.
- `src/app/utils/billing-ui-monitoring.test.ts` now keeps billing UI monitoring metadata privacy inside `test:production-core:unit`: raw order ids and exact amounts are replaced with `hasOrderId` and coarse `amountBand` fields.
- `src/features/billing/useCheckoutReturn.test.tsx` now keeps unconfirmed checkout-return monitoring inside `test:production-core:ui`: exhausted entitlement polling records a safe billing monitoring event while leaving the checkout return pending.

## 8.1. Re-verification Evidence - 2026-06-27

- The full aggregate guard `npm.cmd run test:production-core` passed locally with the current staged production-core batch:
  - ops: 22 tests passed.
  - unit: 30 tests passed.
  - UI: 92 tests passed.
  - sync: 65 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 15 tests passed.
- The same run still counts as repo-local proof only; deployed production smoke, deployed core-funnel proof, account deletion staging, email verification staging, and LWW staging require actual workflow/staging evidence before launch.

## 8.2. Guard Tightening Evidence - 2026-06-27

- `test:production-core:unit` now includes `src/lib/auth/firebase.test.ts`, so signup verification email and signup-written resend cooldown are protected by the aggregate launch guard.
- `test:production-core:ui` now includes `src/app/components/UpgradePaywallDialog.unverified.test.tsx`, so unverified real-mode users cannot regain a paid-checkout path without failing the aggregate guard.
- `test:production-core:sync` now includes `src/app/utils/production/outboxSync.test.ts`, so the email-unverified local-only outbox pause remains part of sync trust proof.
- Focused re-verification passed:
  - `npm.cmd run test:run -- src/lib/auth/firebase.test.ts` (4 tests passed).
  - `npm.cmd run test:sync -- src/app/utils/production/outboxSync.test.ts` (1 test passed).
  - `npm.cmd run test:ui -- src/app/components/UpgradePaywallDialog.unverified.test.tsx` (2 tests passed).
  - `npm.cmd run test:production-core:unit` (34 tests passed).
  - `npm.cmd run test:production-core:ui` (94 tests passed).
  - `npm.cmd run test:production-core:sync` (66 tests passed).
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after the guard tightening:
  - ops: 22 tests passed.
  - unit: 34 tests passed.
  - UI: 94 tests passed.
  - sync: 66 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 15 tests passed.
- This remains repo-local proof only; staging/production workflow evidence is still required before launch.

## 8.3. Billing Guard Tightening Evidence - 2026-06-27

- `test:production-core:unit` now includes `src/app/utils/storage-billing-ops.gracePeriod.test.ts`, so Plus grace-period entitlement behavior is checked with the rest of the production-core billing proof.
- `test:production-core:ui` now includes `src/app/pages/billing-paid-checkout-disabled.test.tsx`, so paid-checkout kill-switch behavior is protected across the paywall, confirmation, checkout QR, billing plan CTA, and pending-order resume surfaces.
- Focused verification passed:
  - `npm.cmd run test:run -- src/app/utils/storage-billing-ops.gracePeriod.test.ts` (6 tests passed).
  - `npm.cmd run test:ui -- src/app/pages/billing-paid-checkout-disabled.test.tsx` (8 tests passed).
  - `npm.cmd run test:production-core:unit` (40 tests passed).
  - `npm.cmd run test:production-core:ui` (102 tests passed).
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after the billing guard tightening:
  - ops: 22 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 66 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 15 tests passed.

## 8.4. Sync Field-Complete Guard Tightening - 2026-06-27

- `test:production-core:sync` now includes the field-complete local proof set:
  - `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`
  - `src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts`
  - `src/features/plan12week/persistence/roundTripSync.test.ts`
  - `src/features/plan12week/persistence/twelveWeekImportPayload.test.ts`
  - `src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts`
  - `src/features/plan12week/hooks/usePlanSetupSync.test.tsx`
- This extends the aggregate sync guard beyond route/auth gating into local-first pull/apply/merge/manual-sync recovery, tombstones, supported plan metadata round-trip, and local-winning conflict handling.
- Focused verification passed:
  - `npm.cmd run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/pulledWorkspaceMergeReport.test.ts src/features/plan12week/persistence/roundTripSync.test.ts src/features/plan12week/persistence/twelveWeekImportPayload.test.ts` (59 tests passed).
  - `npm.cmd run test:sync -- src/features/plan12week/hooks/useTwelveWeekManualCloudSync.test.ts src/features/plan12week/hooks/usePlanSetupSync.test.tsx` (27 tests passed).
  - `npm.cmd run test:production-core:sync` (152 tests passed).
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after the sync field-complete guard tightening:
  - ops: 22 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 152 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 15 tests passed.

## 8.5. Backend Route Contract Guard Tightening - 2026-06-27

- `test:production-core:backend:sync` now also includes `dist/tests/routeIntegration.test.js`, so the aggregate backend sync proof covers owner happy-path 12-week routes plus structured HTTP 409 conflict metadata for plan, week review, and task updates.
- Focused verification passed:
  - `npm.cmd --prefix backend run test:run -- dist/tests/routeIntegration.test.js` (8 tests passed).
- `npm.cmd run test:production-core:backend:sync` now passes with 23 backend sync tests after adding `routeIntegration.test.js`.
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after the backend route-contract guard tightening:
  - ops: 22 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 152 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 23 tests passed.

## 8.6. Workflow Availability Ops Guard - 2026-06-27

- `test:ops` now includes `scripts/check-github-workflow-readiness.test.mjs`, so the production-core aggregate fails if repo-local proof docs drift away from default-branch workflow availability checks.
- `npm.cmd run proof:workflows` now audits GitHub default-branch workflow metadata without dispatching any workflow run and fails when a required proof workflow is missing from or disabled on the default branch.
- Current-state evidence on 2026-06-27:
  - `gh workflow list --limit 100` showed `.github/workflows/production-smoke-e2e.yml` active on default branch.
  - `npm.cmd run proof:workflows` reported `.github/workflows/core-funnel-quality-staging.yml`, `.github/workflows/email-verification-e2e-staging.yml`, `.github/workflows/account-delete-e2e-staging.yml`, and `.github/workflows/lww-e2e-staging.yml` as present in the current worktree only, not yet on default branch.
- Focused verification passed:
  - `npm.cmd run test:ops` (26 tests passed).
  - `node --check scripts/check-github-workflow-readiness.mjs`.
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after adding the workflow-availability ops guard:
  - ops: 26 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 152 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 23 tests passed.

## 8.7. Launch Proof Readiness Aggregate Guard - 2026-06-27

- `test:ops` now includes `scripts/check-launch-proof-readiness.test.mjs`, so the production-core aggregate fails if the one-command launch proof readiness gate stops composing secret-name and workflow-availability audits safely.
- `npm.cmd run proof:readiness` now runs secret-name, workflow-availability, and production-smoke latest-run audits, continues after the first blocker, and reports a combined pass/blocked/error result without reading secret values or dispatching workflows.
- Current-state evidence on 2026-06-27:
  - `npm.cmd run proof:readiness` exited blocked because the four staged proof workflows are present in the current worktree only, not yet on the default branch, and the latest production smoke run `28218523067` concluded `failure`.
  - The same command confirmed production smoke, account-delete staging, and LWW staging secrets are ready, while email-verification staging can still use generated disposable signup if fixed credentials stay absent.
  - The same output now says the failed production-smoke run predates staged local mitigation in `.github/workflows/production-smoke-e2e.yml`, `scripts/smoke-production-e2e.mjs`, and `scripts/smoke-production-quick.mjs`.
  - The same command confirmed production smoke workflow is active on default branch.
- Focused verification passed:
  - `node --check scripts/check-launch-proof-readiness.mjs`.
  - `node --check scripts/check-production-smoke-run-readiness.mjs`.
  - `npm.cmd run test:ops` (37 tests passed).
- The full aggregate guard `npm.cmd run test:production-core` also passed locally after adding the launch proof readiness aggregate guard:
  - ops: 37 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 152 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 23 tests passed.
