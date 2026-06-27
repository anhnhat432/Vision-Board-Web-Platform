# Production Smoke Latest Run Readiness Spec

## 1. Context & Goal

- Feature / bug: `npm run proof:readiness` can currently pass secret and workflow availability checks without noticing that the latest default-branch production smoke run is failed.
- Why now: launch readiness depends on deployed production smoke evidence, and the current latest run still fails before completing 12-week sync and billing proof.
- User impact: launch owner gets one readiness command that names the production-smoke evidence blocker before D-1 go/no-go.
- Modes affected: production proof metadata only. App runtime, localStorage, backend APIs, and smoke browser behavior are out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch proof readiness script, ops tests, production smoke evidence docs.
- Existing invariants that must not break: do not dispatch workflows; do not read secrets; do not claim a completed failed run is launch proof.

## 3. Actors & Entry Points

- Primary actor: launch operator running `npm run proof:readiness`.
- Secondary actor(s): reviewer checking production smoke evidence.
- Entry point: `scripts/check-launch-proof-readiness.mjs`.
- External metadata: `gh run list --workflow production-smoke-e2e.yml --limit 1 --json databaseId,headSha,status,conclusion,event,createdAt,url`.

## 4. Functional Requirements

1. WHEN launch proof readiness is audited, THE aggregate command SHALL inspect the latest production-smoke workflow run metadata.
2. WHEN the latest production-smoke run is completed with conclusion `success`, THE command SHALL report that production-smoke latest-run evidence is ready.
3. WHEN the latest production-smoke run is completed with any non-success conclusion, THE command SHALL report a blocked result with run id, conclusion, event, SHA, and URL.
4. WHEN the latest production-smoke run is in progress or queued, THE command SHALL report a blocked result that names the non-completed status.
5. WHEN no production-smoke run metadata is available, THE command SHALL report a blocked result, not a pass.
6. WHEN GitHub CLI metadata cannot be read or parsed, THE command SHALL report tool error distinct from ordinary proof blockers.
7. WHEN the latest failed production-smoke run matches local `HEAD` but relevant production-smoke files are currently staged, THE command SHALL say that unpublished local mitigation exists and the failed run predates those staged changes.
8. WHERE tests run, THE run metadata SHALL be injectable through environment JSON so tests do not depend on live GitHub API access.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: none.

## 6. Non-functional Requirements

- security / privacy: no secret values in commands or output.
- operability: output should include the run URL and commit SHA for the D-2 proof ledger.
- auditability: blocked output should be copyable into launch notes.

## 7. Out of Scope

- Dispatching or rerunning production smoke.
- Fixing the smoke harness or production environment.
- Replacing the D-2 proof ledger.

## 8. Acceptance Criteria

- [x] `npm run proof:readiness` reports latest production-smoke run status in addition to secrets and workflow availability.
- [x] latest successful completed run passes the production-smoke latest-run check.
- [x] latest failed completed run blocks readiness and prints run metadata.
- [x] latest queued/in-progress run blocks readiness.
- [x] missing or invalid run metadata returns blocked/tool-error status as appropriate.
- [x] failed latest run can report that relevant local mitigation is staged but not yet published.
- [x] ops tests cover success, failure, in-progress, and parse-error paths without live GitHub API access.

## 9. Verification Plan

```bash
node --check scripts/check-launch-proof-readiness.mjs
npm.cmd run test:ops
npm.cmd run proof:readiness
git diff --check -- scripts/check-launch-proof-readiness.mjs scripts/check-launch-proof-readiness.test.mjs docs/specs/production-smoke-latest-run-readiness.md docs/specs/launch-proof-readiness-aggregate.md docs/specs/production-core-verification-guard.md guidelines/CURRENT_PROJECT_STATUS.md
```

## 10. Batch Evidence - 2026-06-27

- `scripts/check-production-smoke-run-readiness.mjs` now inspects the latest `production-smoke-e2e.yml` run metadata with `gh run list --workflow production-smoke-e2e.yml --limit 1 --json databaseId,headSha,status,conclusion,event,createdAt,url`.
- `npm.cmd run proof:readiness` now includes production-smoke latest-run status after secret and workflow availability checks.
- Current-state blocker evidence:
  - Latest production smoke run is `28218523067`.
  - Status/conclusion: `completed` / `failure`.
  - Event: `schedule`.
  - SHA: `4fbdb3b6088e5c944554af90857b58c7205cf30d`.
  - URL: `https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067`.
  - The failed run SHA matches local `HEAD`, and current staged mitigation files include `.github/workflows/production-smoke-e2e.yml`, `scripts/smoke-production-e2e.mjs`, and `scripts/smoke-production-quick.mjs`, so the command now reports that the failed run predates unpublished local changes.
- Focused verification passed:
  - `node --check scripts/check-production-smoke-run-readiness.mjs`.
  - `node --check scripts/check-launch-proof-readiness.mjs`.
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

- After the staged production-smoke harness mitigation reaches `main`, rerun production smoke and then rerun `npm run proof:readiness` to confirm latest-run status becomes `success`.
