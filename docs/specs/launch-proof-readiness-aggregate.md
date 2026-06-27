# Launch Proof Readiness Aggregate Spec

## 1. Context & Goal

- Feature / bug: launch proof readiness is currently split across secret and workflow audits, so operators can stop after the first failing command and miss the full blocker list.
- Why now: production readiness now depends on staged workflows reaching default branch, required GitHub secrets being configured, and production smoke being rerun after the staged mitigation.
- User impact: launch owner can run one safe local command and see every repository-controlled proof blocker before dispatching staging workflows.
- Modes affected: real-mode staging/production proof only. App runtime, localStorage, backend APIs, and customer data are out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch proof scripts, package scripts, ops tests, runbook, soft-launch checklist, current status docs.
- Existing invariants that must not break: do not read secret values; do not dispatch workflows; do not treat local metadata checks as launch proof.

## 3. Actors & Entry Points

- Primary actor: launch operator using a local shell with GitHub CLI access.
- Secondary actor(s): reviewer checking D-2 proof evidence.
- Entry point: `npm run proof:readiness`.
- Existing checks composed: `scripts/check-github-secret-readiness.mjs`, `scripts/check-github-workflow-readiness.mjs`, and `scripts/check-production-smoke-run-readiness.mjs`.

## 4. Functional Requirements

1. WHEN launch proof readiness is audited, THE repository SHALL provide one command that runs both secret-name readiness and default-branch workflow availability checks.
2. WHEN the secret check fails, THE aggregate command SHALL still run the workflow check so operators see both blocker groups in one run.
3. WHEN the production-smoke latest-run check is included, THE aggregate command SHALL still run it after secret or workflow blockers so operators see whether the latest deployed smoke evidence is pass/fail/pending.
4. WHEN any child check fails because proof is not ready, THE aggregate command SHALL exit non-zero and print a clear blocked summary.
5. WHEN a child check cannot run because GitHub CLI or JSON parsing fails, THE aggregate command SHALL exit with a tool-error status distinct from ordinary proof blockers.
6. WHERE output is printed, THE aggregate command SHALL not include secret values and SHALL state that it does not dispatch workflows.
7. WHERE launch docs tell operators to prepare proof, THE docs SHALL point to `npm run proof:readiness` before individual dispatch commands.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: none.

## 6. Non-functional Requirements

- security / privacy: inspect secret names only and never echo secret values.
- operability: continue after the first failed readiness category.
- auditability: output should preserve the child check evidence lines for copy/paste into launch notes.

## 7. Out of Scope

- Creating GitHub repository secrets.
- Publishing workflows to default branch.
- Dispatching staging or production workflows.
- Claiming launch proof without deployed workflow evidence.

## 8. Acceptance Criteria

- [x] `npm run proof:readiness` exists.
- [x] aggregate readiness runs both child checks even when the first one fails.
- [x] aggregate readiness exits `0` when both child checks pass.
- [x] aggregate readiness exits non-zero and prints blocked summary when required proof secrets or workflows are missing.
- [x] aggregate readiness exits with a distinct tool-error summary when a child check cannot parse/read required metadata.
- [x] aggregate readiness includes the latest production-smoke run status.
- [x] ops tests cover pass, blocker, and tool-error paths without live GitHub API access.
- [x] runbook, checklist, and current status docs name `npm run proof:readiness` as the first readiness command.

## 9. Verification Plan

```bash
node --check scripts/check-launch-proof-readiness.mjs
node --check scripts/check-production-smoke-run-readiness.mjs
npm.cmd run test:ops
npm.cmd run proof:readiness
git diff --check -- scripts/check-launch-proof-readiness.mjs scripts/check-launch-proof-readiness.test.mjs scripts/check-production-smoke-run-readiness.mjs scripts/check-production-smoke-run-readiness.test.mjs docs/specs/launch-proof-readiness-aggregate.md docs/ops/staging-proof-runbook.md guidelines/SOFT_LAUNCH_CHECKLIST.md guidelines/CURRENT_PROJECT_STATUS.md package.json
```

## 10. Batch Evidence - 2026-06-27

- `npm.cmd run proof:readiness` now runs the secret-name and workflow-availability audits in one command, continues after blocker categories, and prints a combined blocked summary.
- Current-state blocker evidence from `npm.cmd run proof:readiness`:
  - Production smoke secrets are ready.
  - Account-delete staging secrets are ready.
  - LWW staging secrets are ready.
  - Email-verification staging is ready through the generated disposable signup path if staging Firebase allows signup.
  - Core-funnel, email-verification, account-delete, and LWW proof workflows are present in the current worktree only and are not yet available on default branch.
  - Production smoke workflow is active on default branch.
  - Latest production smoke run `28218523067` is completed with conclusion `failure`.
  - The same readiness output now says the failed production-smoke run predates staged local mitigation in `.github/workflows/production-smoke-e2e.yml`, `scripts/smoke-production-e2e.mjs`, and `scripts/smoke-production-quick.mjs`.
- Focused verification passed:
  - `node --check scripts/check-launch-proof-readiness.mjs`.
  - `node --check scripts/check-production-smoke-run-readiness.mjs`.
  - `npm.cmd run test:ops` (37 tests passed).
  - `npm.cmd run proof:readiness` (expected blocked exit: proof workflows not yet on default branch and latest production smoke run failed; secret readiness passed; no secret values read and no workflow dispatched).
- Full aggregate verification passed:
  - `npm.cmd run test:production-core`.
  - ops: 37 tests passed.
  - unit: 40 tests passed.
  - UI: 102 tests passed.
  - sync: 152 tests passed.
  - slow 12-week write-safety: 5 tests passed.
  - backend billing: 56 tests passed.
  - backend account lifecycle: 4 tests passed.
  - backend sync: 23 tests passed.

## 11. Open Questions / Follow-ups

- After this staged batch is committed and pushed, rerun `npm run proof:readiness` from default-branch state before dispatching staging proof workflows.
