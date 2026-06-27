# Soft Launch Checklist Current Gates Spec

## 1. Context & Goal

- Feature / bug: the soft-launch checklist still had historical launch assumptions near the top, while current proof evidence shows production smoke and deployed staging gates are not complete.
- Why now: launch operators must not treat old tags or old phase checkmarks as current production readiness proof.
- User impact: the owner sees the current blocking gates before entering D-1 go/no-go.
- Modes affected: launch docs only; app runtime, localStorage, backend APIs, and deployed behavior are out of scope.

## 2. Surface Classification

- Type: Core ops docs
- Touched domains: soft-launch checklist and proof evidence language.
- Existing invariants that must not break: no secrets in docs; workflow presence is not proof; local proof does not replace deployed proof.

## 3. Actors & Entry Points

- Primary actor: launch operator reviewing `guidelines/SOFT_LAUNCH_CHECKLIST.md`.
- Secondary actor(s): reviewer checking D-2 proof evidence before D-1.
- Docs touchpoints: `guidelines/SOFT_LAUNCH_CHECKLIST.md`, `guidelines/CURRENT_PROJECT_STATUS.md`, `docs/ops/staging-proof-runbook.md`.

## 4. Functional Requirements

1. WHEN the checklist is opened, THE docs SHALL show that current blockers override old phase/tag assumptions.
2. WHERE historical tags are mentioned, THE docs SHALL not treat them as current launch proof for `main`.
3. WHERE production smoke, account-delete staging, LWW staging, or deployed core-funnel proof are incomplete, THE docs SHALL state that clearly without secret values.
4. WHERE launch readiness is reviewed, THE docs SHALL point reviewers to the D-2 proof ledger and current status as authority.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: docs-only change.

## 6. Non-functional Requirements

- security / privacy: mention only secret names and workflow/run ids, never values.
- auditability: include date and current known blockers.
- operability: place status note near the top of the checklist before older assumptions.

## 7. Out of Scope

- Running staging workflows.
- Creating GitHub secrets.
- Editing historical phase notes beyond adding an overriding current-state note.

## 8. Acceptance Criteria

- [x] checklist `Last updated` is refreshed to 2026-06-27.
- [x] checklist top section states old checkmarks are not current proof.
- [x] checklist top section names the current production smoke failure, unpublished staging proof workflows, and pending deployed core-funnel proof.
- [x] D-2 proof ledger records that account-delete and LWW secrets are configured while their workflows remain unpublished on default branch.
- [x] checklist points readers to the D-2 proof ledger and `guidelines/CURRENT_PROJECT_STATUS.md`.

## 9. Verification Plan

```bash
rg -n "Status note 2026-06-27|28218523067|blocked-workflow-unpublished|configured as of 2026-06-27|Deployed core-funnel proof" guidelines/SOFT_LAUNCH_CHECKLIST.md
npm.cmd run test:ops
git diff --check -- guidelines/SOFT_LAUNCH_CHECKLIST.md docs/specs/soft-launch-checklist-current-gates.md
```

## 10. Batch Evidence - 2026-06-26

- Added a current-state status note at the top of `guidelines/SOFT_LAUNCH_CHECKLIST.md` so launch reviewers see the active proof blockers before old historical phase assumptions.
- Verification passed:
  - `rg -n "Status note 2026-06-27|28218523067|blocked-workflow-unpublished|configured as of 2026-06-27|Deployed core-funnel proof" guidelines/SOFT_LAUNCH_CHECKLIST.md`
  - `npm.cmd run test:ops`
  - `git diff --check -- guidelines/SOFT_LAUNCH_CHECKLIST.md docs/specs/soft-launch-checklist-current-gates.md`

## 10.1. Re-verification Evidence - 2026-06-27

- `guidelines/SOFT_LAUNCH_CHECKLIST.md` now reflects the refreshed secret readiness state: account-delete and LWW credentials are configured, but their D-2 proof rows remain blocked because the workflows are still present in the staged worktree only, not on default branch.
- The top status note now focuses on the two live blocker families: the failed latest production-smoke run and unpublished default-branch proof workflows, while the D-2 ledger preserves the per-gate secret/workflow details.

## 11. Open Questions / Follow-ups

- After staged changes reach `main`, update the D-2 proof ledger with new workflow evidence instead of carrying this blocker note forward.
