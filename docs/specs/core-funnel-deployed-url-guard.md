# Core Funnel Deployed URL Guard Spec

## 1. Context & Goal

- Feature / bug: the deployed core-funnel workflow rejects `localhost` and `127.0.0.1`, but the shared `scripts/smoke-core-quality.mjs` script still has a localhost fallback for local preflight.
- Why now: if workflow wiring drifts or `CORE_QUALITY_URL` is omitted in GitHub Actions, deployed proof could accidentally fall back to localhost semantics instead of failing fast.
- User impact: launch operators get a trustworthy deployed core-funnel proof gate that refuses local fallback in GitHub Actions.
- Modes affected: GitHub Actions deployed proof path; local preflight remains allowed.

## 2. Surface Classification

- Type: Core ops verification
- Touched domains: `scripts/smoke-core-quality.mjs`, ops regression tests, core-funnel proof docs.
- Existing invariants that must not break: local preflight still works with localhost; no app runtime/localStorage/backend contract changes.

## 3. Actors & Entry Points

- Primary actor: launch operator running `.github/workflows/core-funnel-quality-staging.yml`.
- Secondary actor(s): reviewer checking D-2 deployed core-funnel evidence.
- Entry points: `npm run smoke:core-quality`, GitHub Actions env `GITHUB_ACTIONS`, `CORE_QUALITY_URL`.

## 4. Functional Requirements

1. WHEN `scripts/smoke-core-quality.mjs` runs inside GitHub Actions, THE script SHALL require an explicit deployed target URL instead of silently falling back to localhost.
2. WHERE `GITHUB_ACTIONS=true` and the resolved target URL contains `localhost` or `127.0.0.1`, THE script SHALL fail before launching the browser.
3. WHILE local operators run the script outside GitHub Actions, THE existing localhost preflight fallback SHALL remain allowed.
4. WHEN ops regression tests run, THE repository SHALL statically guard this GitHub Actions target-safety contract.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: script/test/docs only.

## 6. Non-functional Requirements

- safety: fail before browser launch when deployed proof target is unsafe or missing in GitHub Actions.
- operability: error text must say why localhost fallback is refused.
- auditability: ops tests must fail if the guard is removed.

## 7. Out of Scope

- Changing local preflight behavior outside GitHub Actions.
- Running the deployed workflow.
- Editing staging credentials or secrets.

## 8. Acceptance Criteria

- [x] `scripts/smoke-core-quality.mjs` fails fast in GitHub Actions when `CORE_QUALITY_URL` is missing.
- [x] the same script fails fast in GitHub Actions when the resolved target is `localhost` or `127.0.0.1`.
- [x] local non-GitHub-Actions runs still retain localhost fallback.
- [x] `test:ops` includes regression coverage for the new guard.

## 9. Verification Plan

```bash
npm.cmd run test:ops
node --check scripts/smoke-core-quality.mjs
rg -n "GITHUB_ACTIONS|CORE_QUALITY_URL is required in GitHub Actions|Refusing to run deployed core-funnel proof against localhost" scripts/smoke-core-quality.mjs scripts/core-funnel-quality-harness.test.mjs package.json docs/specs/core-funnel-deployed-url-guard.md
git diff --check
```

## 10. Batch Evidence - 2026-06-26

- Added GitHub Actions target-safety guard to `scripts/smoke-core-quality.mjs`: deployed proof now fails before browser launch if `CORE_QUALITY_URL` is missing or resolves to `localhost` / `127.0.0.1`.
- Added `scripts/core-funnel-quality-harness.test.mjs` and wired it into `npm.cmd run test:ops` so the repo fails if that guard is removed.

## 11. Open Questions / Follow-ups

- After staged changes reach `main`, rerun `.github/workflows/core-funnel-quality-staging.yml` and record a real deployed pass in the D-2 proof ledger.
