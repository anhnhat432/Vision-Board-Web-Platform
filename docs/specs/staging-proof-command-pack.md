# Staging Proof Command Pack Spec

## 1. Context & Goal

- Feature / bug: launch proof now has workflows and a D-2 evidence ledger, but operators still need exact `gh workflow run` commands and result-capture commands.
- Why now: production readiness depends on running email verification, account deletion, LWW sync, production smoke, and deployed core-flow proof against real-mode staging/production-like targets without guessing workflow inputs.
- User impact: launch owner can execute proof gates consistently and record evidence without pasting secrets or relying on memory.
- Modes affected: real-mode staging/preview and production smoke only. Demo/local app behavior is out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch runbook, soft-launch checklist, command-line evidence capture.
- Existing invariants that must not break: no secrets in repo; destructive delete requires `DELETE_TEST_ACCOUNT`; generated production accounts remain disabled by default; proof execution still requires explicit target URLs and configured repository secrets.

## 3. Actors & Entry Points

- Primary actor: launch operator with `gh` authenticated to the repository.
- Secondary actor(s): reviewer checking D-2 evidence ledger.
- Entry points: `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`.
- Workflow(s): `.github/workflows/email-verification-e2e-staging.yml`, `.github/workflows/account-delete-e2e-staging.yml`, `.github/workflows/lww-e2e-staging.yml`, `.github/workflows/core-funnel-quality-staging.yml`, `.github/workflows/production-smoke-e2e.yml`.

## 4. Functional Requirements

1. WHEN an operator has a staging URL, THE runbook SHALL provide copyable `gh workflow run` commands for email verification, account deletion, and LWW proof.
2. WHEN an operator has a production URL, THE runbook SHALL provide a copyable `gh workflow run` command for production smoke with fixed QA credentials.
3. WHERE a workflow is triggered, THE runbook SHALL show how to retrieve run URL, status, conclusion, head SHA, and workflow name for the D-2 ledger.
4. WHERE a command uses destructive account deletion, THE runbook SHALL keep the `DELETE_TEST_ACCOUNT` safety input explicit.
5. WHERE LWW staging proof can overwrite a QA workspace, THE runbook SHALL keep an explicit `OVERWRITE_TEST_WORKSPACE` opt-in visible.
6. WHERE secrets are required, THE docs SHALL reference secret names only and never include secret values.
7. WHEN an operator needs deployed core-flow proof, THE runbook SHALL provide a copyable `gh workflow run` command for `.github/workflows/core-funnel-quality-staging.yml` and an evidence-capture command for its run URL/status/SHA.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: command pack executes existing sync proof only.
- rollback / restore concerns: use disposable accounts only for destructive proof.

## 6. Non-functional Requirements

- security / privacy: commands must not echo secret values.
- operability: commands must use actual workflow file names and input names.
- auditability: result capture must include enough fields for the D-2 proof ledger.

## 7. Out of Scope

- Running workflows without configured secrets or target URLs.
- Creating or storing GitHub repository secrets.
- Filling the ledger with fake evidence.

## 8. Acceptance Criteria

- [x] command pack lists `gh workflow run` commands for email verification, account deletion, LWW, and production smoke.
- [x] command pack includes `gh run list` / `gh run view` evidence capture commands.
- [x] command pack tells operators which values to copy into the D-2 proof ledger.
- [x] destructive account deletion command keeps `allow_delete=DELETE_TEST_ACCOUNT` visible.
- [x] LWW command keeps `allow_overwrite=OVERWRITE_TEST_WORKSPACE` visible.
- [x] command pack lists the deployed core-funnel proof workflow command and evidence-capture command.

## 9. Verification Plan

```bash
gh workflow run --help
gh run list --help
gh run view --help
rg -n "gh workflow run|gh run list|DELETE_TEST_ACCOUNT|CREATE_TEST_ACCOUNT|D-2 proof ledger" docs/ops/staging-proof-runbook.md guidelines/SOFT_LAUNCH_CHECKLIST.md docs/specs/staging-proof-command-pack.md
npm.cmd run lint
npm.cmd run typecheck
git diff --check
```

## 10. Batch Evidence - 2026-06-25

- `gh` CLI v2.91.0 help confirmed `gh workflow run <workflow.yml> --ref <ref> -f key=value`, `gh run list --json`, and `gh run view --json`.
- `docs/ops/staging-proof-runbook.md` now includes GitHub Actions command pack and evidence capture commands.

## 11. Open Questions / Follow-ups

- Run the commands after staging URL, production URL, and repository secrets are confirmed.
