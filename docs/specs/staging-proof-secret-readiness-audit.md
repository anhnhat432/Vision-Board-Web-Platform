# Staging Proof Secret Readiness Audit Spec

## 1. Context & Goal

- Feature / bug: staging proof commands exist, but operators need to know which GitHub repository secrets are already configured before triggering workflows.
- Why now: account deletion and LWW workflows fail fast when required secrets are missing. Production smoke requires fixed QA credentials and is already wired through repository secrets.
- User impact: launch owner can resolve missing credentials before spending time on failed workflow runs.
- Modes affected: GitHub Actions proof workflows only. App runtime, localStorage, backend API contracts, and route behavior are out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch proof runbook, soft-launch checklist, current status docs, GitHub secret-name audit script.
- Existing invariants that must not break: never record secret values; email/delete/LWW accounts must remain disposable or dedicated QA users; workflow presence is not launch evidence.

## 3. Actors & Entry Points

- Primary actor: launch operator checking GitHub repository secrets.
- Secondary actor(s): reviewer deciding whether D-2 proof can be run.
- Entry points: `gh secret list`, `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`.

## 4. Functional Requirements

1. WHEN secret readiness is audited, THE docs SHALL record only secret names and presence/absence, never values.
2. WHEN `ACCOUNT_DELETE_E2E_EMAIL` or `ACCOUNT_DELETE_E2E_PASSWORD` is missing, THE checklist SHALL keep account deletion proof blocked.
3. WHEN `LWW_E2E_EMAIL` or `LWW_E2E_PASSWORD` is missing, THE checklist SHALL keep LWW proof blocked.
4. WHEN `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` exist, THE checklist SHALL mark production smoke credentials as configured but still require an actual run.
5. WHERE email verification fixed secrets are absent, THE docs SHALL state the generated disposable-account path is available if the staging Firebase project allows signup.
6. WHERE email verification fixed secrets are partially configured, THE docs and local audit SHALL treat the gate as blocked until both email and password are configured or both are removed.
7. WHERE production smoke docs or workflow list fixed credentials, THE contract SHALL not declare additional production-smoke secret names that the smoke scripts ignore.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none affected.
- rollback / restore concerns: docs-only change.

## 6. Non-functional Requirements

- security / privacy: no raw secret values, emails, passwords, tokens, or keys in committed docs.
- operability: missing secret names must be explicit.
- auditability: record repo, timestamp, command, and current readiness status.

## 7. Out of Scope

- Creating GitHub secrets.
- Running proof workflows.
- Validating whether secret values are correct.

## 8. Acceptance Criteria

- [x] runbook includes a 2026-06-27 secret readiness snapshot.
- [x] snapshot names proof-secret readiness states without values, including refreshed configured state after secret updates.
- [x] soft-launch checklist surfaces account-delete and LWW secret readiness before D-1.
- [x] current status says proof remains blocked until default-branch workflows are published and proof runs pass, even after secrets are configured.
- [x] repo exposes a local command that audits GitHub Actions secret names without reading secret values.
- [x] runbook and checklist document that email-verification fixed secrets must be configured as a complete pair or omitted for generated disposable signup.
- [x] production smoke workflow/runbook list only `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` as fixed secrets.

## 9. Verification Plan

```bash
gh secret list --json name,updatedAt
npm.cmd run proof:secrets
npm.cmd run test:ops
rg -n "ACCOUNT_DELETE_E2E|LWW_E2E|PROD_SMOKE|Secret readiness snapshot|configured|generated disposable signup|workflow-unpublished" docs/ops/staging-proof-runbook.md guidelines/SOFT_LAUNCH_CHECKLIST.md guidelines/CURRENT_PROJECT_STATUS.md docs/specs/staging-proof-secret-readiness-audit.md
npm.cmd run lint
npm.cmd run typecheck
git diff --check
```

## 10. Batch Evidence - 2026-06-25

- `gh auth status` confirmed authenticated GitHub account `anhnhat432`.
- `gh repo view --json nameWithOwner,defaultBranchRef,url` confirmed repo `anhnhat432/Vision-Board-Web-Platform`, default branch `main`.
- `gh secret list --json name,updatedAt` returned configured secret names only; values were not read.
- `npm run proof:secrets` now provides the same audit in a repo-local command and fails when required staging proof secrets are missing or partial.

## 10.1. Batch Evidence - 2026-06-26

- `npm.cmd run proof:secrets` inspected GitHub secret names only and confirmed the state at that time: production smoke credentials configured; account deletion and LWW staging credentials missing; email-verification staging ready through generated disposable signup path.
- `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`, and `guidelines/CURRENT_PROJECT_STATUS.md` now document the email-verification pair rule: fixed `EMAIL_VERIFICATION_E2E_EMAIL` / `EMAIL_VERIFICATION_E2E_PASSWORD` must both be present, or both omitted so the generated disposable signup path is used.
- Ops regression coverage in `scripts/github-workflow-guards.test.mjs` keeps the workflow and docs aligned with that pair rule.
- Verification passed:
  - `npm.cmd run proof:secrets` (expected failure: missing `ACCOUNT_DELETE_E2E_*` and `LWW_E2E_*`; no secret values read)
  - `npm.cmd run test:ops` (17 tests passed after the production-smoke and core-funnel deployed URL harness guards were added)

## 10.2. Batch Evidence - 2026-06-26

- `.github/workflows/production-smoke-e2e.yml` dropped unused `PROD_SMOKE_FRESH_*` secret wiring so the workflow no longer implies extra fixed credentials beyond the ones `npm run smoke:prod` reads.
- `docs/ops/staging-proof-runbook.md` now matches that contract and keeps generated-account signup behind explicit operator opt-in instead of a phantom optional-secret path.
- Ops regression coverage in `scripts/github-workflow-guards.test.mjs` now fails if unused production-smoke secret names reappear in workflow or runbook docs.

## 10.3. Batch Evidence - 2026-06-26

- `npm.cmd run proof:secrets` re-confirmed the GitHub secret-name state at that time without reading values: production smoke credentials were configured; account deletion and LWW staging credentials were missing; email-verification staging could use generated disposable signup.
- `gh run list --limit 20 --json databaseId,workflowName,headBranch,headSha,status,conclusion,createdAt,updatedAt,event,url` confirmed the latest default-branch production smoke run is still `28218523067`, failed on `main` SHA `4fbdb3b6088e5c944554af90857b58c7205cf30d`.
- `gh run view 28218523067 --log-failed` confirmed that deployed run still failed in `12-week save, reload, and backend sync` while waiting for hidden `[data-testid="wam-section-score"]`; the staged local harness mitigation has not reached `main` yet.
- The same failed-run log showed the default-branch workflow was still on the pre-fix contract at that SHA: `actions/setup-node` used `node-version: 22`, and the workflow still exported unused `PROD_SMOKE_FRESH_EMAIL` / `PROD_SMOKE_FRESH_PASSWORD` env vars. The `.nvmrc` runtime alignment and fixed-secret cleanup now exist only in the staged local worktree until those changes are committed and pushed.

## 10.4. Re-verification Evidence - 2026-06-27

- `npm.cmd run proof:secrets` now passes, confirming that the required production smoke, account-delete staging, and LWW staging repository secret names are configured, while email-verification fixed secrets remain optional because generated disposable signup is allowed.
- `npm.cmd run proof:readiness` re-confirmed the current GitHub secret-name state without reading values: production smoke credentials, account deletion staging credentials, and LWW staging credentials are configured; email-verification staging can keep using generated disposable signup.
- The same aggregate readiness output shows that secret readiness is now `PASS`, while launch proof remains blocked by unpublished default-branch proof workflows and the failed latest production-smoke run.
- `npm.cmd run test:ops` passed 37 tests, covering runtime env checks, secret-readiness behavior, workflow guardrails, production-smoke latest-run reporting, aggregate launch-proof summary behavior, production-smoke harness helpers, and core-funnel deployed URL guardrails.
- The broader `npm.cmd run test:production-core` aggregate also passed locally after the ops guard, so secret-readiness and proof-harness regressions remain covered by the staged production-core batch.

## 11. Open Questions / Follow-ups

- Publish the staged proof workflows to default branch, then trigger the command pack workflows and fill the D-2 proof ledger with real run evidence.
