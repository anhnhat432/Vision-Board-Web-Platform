# GitHub Actions Node Runtime Alignment Spec

## 1. Context & Goal

- Feature / bug: GitHub Actions workflows were split between hard-coded Node 22 and Node 20 / `.nvmrc`, so CI and operator automation could pass on a newer runtime than the repository production target.
- Why now: Vision Board is moving from demo-first to production-ready. Launch proof, CI, audit, and backup automation should exercise the same Node major that release uses.
- User impact: operators and developers get less drift between local expectations, release builds, backend engine policy, and GitHub workflow results.
- Modes affected: repository automation only. No runtime app behavior, localStorage shape, or route behavior changes.

## 2. Surface Classification

- Type: Core ops
- Touched domains: GitHub Actions workflow runtime setup, repo status docs.
- Existing invariants that must not break: `.nvmrc` remains authoritative, backend engine target stays `20.x`, no secret handling changes, no app logic changes.

## 3. Actors & Entry Points

- Primary actor: GitHub Actions runner.
- Secondary actor(s): maintainer reviewing CI/audit/backup results.
- Workflow(s): `.github/workflows/ci.yml`, `.github/workflows/npm-audit.yml`, `.github/workflows/mongodb-backup-r2.yml`.
- Supporting source(s): `.nvmrc`, `backend/package.json`, `package.json`.

## 4. Functional Requirements

1. WHEN a GitHub workflow installs Node for repository automation, THE workflow SHALL prefer `node-version-file: ".nvmrc"` over hard-coded `20` or `22`.
2. WHEN frontend CI or audit runs, THE workflow SHALL use the same Node major as release and staging/proof workflows.
3. WHEN backend CI, backend audit, or backup automation runs, THE workflow SHALL still honor the repository Node target while preserving existing cache and verification behavior.
4. WHERE project status documents describe runtime drift, THE docs SHALL distinguish remaining local-command drift from GitHub workflow drift.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none affected.
- rollback / restore concerns: revert workflow runtime setup only.

## 6. Non-functional Requirements

- operability: one runtime source of truth for GitHub automation.
- maintainability: updating `.nvmrc` updates release, proof, CI, audit, and backup workflows together.
- risk control: avoid "green on Node 22, fail on Node 20" drift for production-facing automation.

## 7. Out of Scope

- Changing local developer Node versions.
- Upgrading repository runtime beyond `.nvmrc`.
- Changing app dependencies, code, or deployment env vars.

## 8. Acceptance Criteria

- [x] `ci.yml` uses `node-version-file: ".nvmrc"` for frontend and backend jobs.
- [x] `npm-audit.yml` uses `node-version-file: ".nvmrc"` for frontend and backend jobs.
- [x] `mongodb-backup-r2.yml` uses `node-version-file: ".nvmrc"`.
- [x] docs no longer imply GitHub proof/CI drift remains once workflows are aligned.

## 9. Verification Plan

```bash
rg -n "node-version: 22|node-version: 20|node-version-file" .github/workflows
npm.cmd run lint
npm.cmd run typecheck
git diff --check
```

## 10. Batch Evidence - 2026-06-25

- `.github/workflows/ci.yml`, `.github/workflows/npm-audit.yml`, and `.github/workflows/mongodb-backup-r2.yml` now resolve Node from `.nvmrc`.
- Existing cache behavior is preserved, including `backend/package-lock.json` cache dependency paths.
- `rg -n "node-version: 22|node-version: 20" .github/workflows` returns no matches after alignment.

## 11. Open Questions / Follow-ups

- If frontend later needs Node >20 while backend stays on `20.x`, split `.nvmrc` strategy or add explicit documented exception per workflow instead of drifting silently.
