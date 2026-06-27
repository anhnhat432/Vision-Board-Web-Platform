# Staging Proof Workflow Availability Audit Spec

## 1. Context & Goal

- Feature / bug: local proof workflows can exist in the current worktree before they exist on the default branch, so `gh workflow run` or `gh run list` can still fail with `404`.
- Why now: launch proof now depends on several manual GitHub Actions workflows, and operators need a fast preflight that distinguishes "workflow file staged locally" from "workflow is actually available on default branch".
- User impact: launch operators can detect missing default-branch workflow publication before spending time on failed dispatch commands or misreading local docs as deployed proof capability.
- Modes affected: GitHub Actions proof workflows only. App runtime, localStorage, billing, auth, and sync behavior are unchanged.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch proof runbook, soft-launch checklist, current status docs, repo-local workflow availability audit script.
- Existing invariants that must not break: no workflow dispatch from the audit itself; no secret values or workflow inputs logged; workflow presence is not launch evidence.

## 3. Actors & Entry Points

- Primary actor: launch operator checking whether proof workflows are available on the default branch.
- Secondary actor(s): reviewer deciding whether D-2 proof commands can be run yet.
- Entry points: `gh api repos/:owner/:repo/actions/workflows`, `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`.

## 4. Functional Requirements

1. WHEN workflow availability is audited, THE repository SHALL provide a local command that inspects default-branch workflow metadata without dispatching any workflow run.
2. WHEN a required proof workflow is missing from default branch, THE audit SHALL fail and name the missing workflow path explicitly.
3. WHEN a required proof workflow is missing from default branch but exists in the current worktree, THE audit SHALL say that the file is present locally only.
4. WHEN a required proof workflow exists on default branch but is not `active`, THE audit SHALL fail and report the unexpected state.
5. WHERE the staging proof runbook and D-2 checklist tell operators to trigger manual workflows, THE docs SHALL tell operators to run the workflow-availability audit first.
6. WHERE current status summarizes proof blockers, THE docs SHALL record the current availability result with a date and clarify that unpublished local workflows are not yet runnable from default branch.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none affected.
- rollback / restore concerns: docs/script only.

## 6. Non-functional Requirements

- security / privacy: audit reads workflow metadata only and must not dispatch runs or log secret values.
- operability: failure output must be actionable for a launch operator.
- auditability: output should state that default-branch workflow metadata was inspected and that no run was triggered.

## 7. Out of Scope

- Pushing workflows to `main`.
- Creating GitHub Actions workflows.
- Running proof workflows or validating their runtime results.

## 8. Acceptance Criteria

- [x] `npm run proof:workflows` exists.
- [x] the audit fails closed when required proof workflows are missing or disabled on default branch.
- [x] the audit can report that a missing workflow exists only in the current worktree.
- [x] ops tests cover pass/fail output without needing live GitHub API access.
- [x] runbook and soft-launch checklist tell operators to run `npm run proof:workflows` before dispatching proof workflows.
- [x] current status records the 2026-06-27 availability result and clarifies that unpublished local workflows are not yet runnable from default branch.

## 9. Verification Plan

```bash
npm.cmd run proof:workflows
npm.cmd run test:ops
npm.cmd run lint
git diff --check
```

Expected current-state result on 2026-06-27: `production-smoke-e2e.yml` is available on default branch; `core-funnel-quality-staging.yml`, `email-verification-e2e-staging.yml`, `account-delete-e2e-staging.yml`, and `lww-e2e-staging.yml` are still missing from default branch because the current staged batch has not been published yet.

## 10. Batch Evidence - 2026-06-27

- `gh workflow list --limit 100` confirmed default branch currently exposes `Production smoke e2e`, but not the newly added manual proof workflows for core-funnel, email verification, account deletion, or LWW sync.
- `gh run list --workflow production-smoke-e2e.yml --limit 5` confirmed the latest visible default-branch production-smoke runs still end at the failing scheduled `main` run `28218523067`.
- `gh run list --workflow core-funnel-quality-staging.yml --limit 5`, `gh run list --workflow email-verification-e2e-staging.yml --limit 5`, and `gh run list --workflow account-delete-e2e-staging.yml --limit 5` each returned `404 workflow not found on the default branch`, proving the current local workflow files are not yet available remotely.
- `npm.cmd run proof:workflows` now reports the same result in one repo-local command: production smoke is active on default branch, while the four manual proof workflows are present in the current worktree only.
- `npm.cmd run test:ops` passed with 26 tests after adding `scripts/check-github-workflow-readiness.test.mjs`, so workflow-availability regressions are now covered with the rest of the repo-local ops guard set.

## 10.1. Re-verification Evidence - 2026-06-27

- `npm.cmd run proof:workflows` still blocks exactly on the four unpublished manual proof workflows: `core-funnel-quality-staging.yml`, `email-verification-e2e-staging.yml`, `account-delete-e2e-staging.yml`, and `lww-e2e-staging.yml` remain present in the current staged worktree only, while `production-smoke-e2e.yml` is active on default branch.
- `npm.cmd run proof:secrets` now passes, which isolates workflow publication as the remaining GitHub Actions metadata blocker separate from secret readiness.
- `npm.cmd run test:ops` now passes with 37 tests, so the workflow-availability guard remains covered inside the broader launch-readiness ops suite after the later aggregate-readiness summary tightening.

## 11. Open Questions / Follow-ups

- After this staged batch is committed and pushed, rerun `npm run proof:workflows` to confirm all proof workflows are available on default branch before dispatching them.
