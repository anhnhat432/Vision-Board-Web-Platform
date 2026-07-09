# Staging Proof Runbook Spec

## 1. Context & Goal

- Feature / bug: staging proof gates now exist as separate workflows, but launch operators need one ordered runbook for required secrets, inputs, safety markers, and evidence capture.
- Why now: account deletion, email verification, and LWW sync are production-critical gates that remain unproven until run against staging/preview.
- Runtime alignment: `.nvmrc` is `20` and the backend engine target is `20.x`, so staging proof workflows should use the same repository runtime instead of a newer ad hoc Node version.
- User impact: launch owner can prove auth lifecycle and cross-device sync without guessing which workflow, secret, or safety input to use.
- Modes affected: real-mode staging/preview for auth/sync/destructive proof, accessible demo/staging for core-quality local-first proof, and production smoke.

## 2. Surface Classification

- Type: Core ops
- Touched domains: launch docs, staging workflow runbook, proof evidence checklist.
- Existing invariants that must not break: no secrets in repo; destructive account delete requires explicit allow input and disposable account marker; staging proof does not mutate localStorage schema.

## 3. Actors & Entry Points

- Primary actor: launch operator running staging/preview GitHub Actions.
- Secondary actor(s): reviewer checking proof before production launch.
- Workflow(s): `.github/workflows/email-verification-e2e-staging.yml`, `.github/workflows/account-delete-e2e-staging.yml`, `.github/workflows/lww-e2e-staging.yml`, `.github/workflows/mvp2-sync-staging-smoke.yml`, `.github/workflows/production-smoke-e2e.yml`.
- Workflow(s): `.github/workflows/email-verification-e2e-staging.yml`, `.github/workflows/account-delete-e2e-staging.yml`, `.github/workflows/lww-e2e-staging.yml`, `.github/workflows/mvp2-sync-staging-smoke.yml`, `.github/workflows/core-funnel-quality-staging.yml`, `.github/workflows/production-smoke-e2e.yml`.
- Docs touchpoints: `docs/ops/staging-proof-runbook.md`, `docs/PRODUCTION_ENV_CHECKLIST.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`.

## 4. Functional Requirements

1. WHEN a launch operator prepares staging proof, THE docs SHALL list every required repository secret and workflow input.
2. WHEN a destructive account-delete proof is run, THE docs SHALL require a disposable delete-marked account and `DELETE_TEST_ACCOUNT` input.
3. WHEN email-verification proof is run, THE docs SHALL require `CREATE_TEST_ACCOUNT` and a verify-marked disposable email when a fixed email is configured.
4. WHEN LWW proof is run, THE docs SHALL identify the fixed QA credentials and staging URL requirement.
5. WHERE proof succeeds or fails, THE docs SHALL tell the operator what evidence to record back into specs/status.
6. WHERE launch readiness is reviewed, THE docs SHALL separate configured secrets from executed proof so workflow presence is never treated as launch evidence.
7. WHERE a staging or production proof workflow installs Node, THE workflow SHALL use `node-version-file: ".nvmrc"` so proof runtime follows the repository production target.
8. WHERE soft launch go/no-go is reviewed, THE checklist SHALL require per-gate evidence fields instead of a single grouped "staging e2e pass" note.
9. WHEN code is pushed to `main`, THE production smoke workflow SHALL wait for the matching Vercel production deployment, then run `npm run smoke:prod:quick` before `npm run smoke:prod`.
10. WHEN D-2 deployed core-flow proof is requested, THE runbook SHALL provide a workflow command that runs `npm run smoke:core-quality` against a supplied accessible demo/staging URL and rejects local-only, production real-mode, or auth-gated targets.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: LWW proof verifies deployed sync behavior but this runbook does not change sync logic.
- rollback / restore concerns: account-delete proof must use disposable accounts only.

## 6. Non-functional Requirements

- security / privacy: never print or commit credentials; use GitHub repository secrets.
- operability: commands and workflow inputs must be copyable and unambiguous.
- auditability: evidence location must be explicit.
- runtime parity: GitHub proof workflows should use the same Node major as `.nvmrc` and the backend production engine target.

## 7. Out of Scope

- Running the staging workflows without credentials.
- Adding production secrets.
- Creating Firebase users outside the existing Playwright harnesses.

## 8. Acceptance Criteria

- [x] runbook lists required secrets for email verification, account delete, and LWW.
- [x] runbook lists production smoke secrets required for scheduled/manual smoke.
- [x] runbook gives an operator-facing secret readiness table with safety markers.
- [x] runbook lists exact workflow inputs and safe run order.
- [x] runbook explains what evidence to copy back into specs/status after a real staging run and provides a ledger template.
- [x] launch/pre-deploy docs link to the runbook.
- [x] staging/prod proof workflows use `node-version-file: ".nvmrc"` instead of hard-coded Node 22.
- [x] soft-launch checklist exposes per-gate evidence rows for email verification, account deletion, LWW sync, and production smoke.
- [x] production smoke workflow auto-runs on `main` push and sequences quick smoke before full smoke.
- [x] runbook includes a deployed core-funnel workflow path that rejects local-only and production real-mode targets.

## 9. Verification Plan

```bash
npm.cmd run lint
npm.cmd run typecheck
rg -n "staging-proof-runbook|ACCOUNT_DELETE_E2E|EMAIL_VERIFICATION_E2E|LWW_E2E" docs guidelines README.md
rg -n "node-version: 22" .github/workflows/account-delete-e2e-staging.yml .github/workflows/email-verification-e2e-staging.yml .github/workflows/lww-e2e-staging.yml .github/workflows/mvp2-sync-staging-smoke.yml .github/workflows/production-smoke-e2e.yml
npm.cmd run test:ops
```

## 10. Batch Evidence - 2026-06-25

- Runbook added at `docs/ops/staging-proof-runbook.md`.
- `docs/PRODUCTION_ENV_CHECKLIST.md` and `guidelines/SOFT_LAUNCH_CHECKLIST.md` link the runbook from the staging proof gates.
- Secret readiness and evidence ledger tables were added so missing credentials and missing execution proof stay visible before go/no-go.
- Account-delete, email-verification, LWW, MVP2 sync staging smoke, and production smoke workflows now install Node from `.nvmrc`.
- `guidelines/SOFT_LAUNCH_CHECKLIST.md` now requires a filled D-2 proof ledger before D-1 go/no-go review.

## 10.1. Batch Evidence - 2026-06-26

- `.github/workflows/production-smoke-e2e.yml` now triggers on `push` to `main`, so the existing Vercel-deploy wait step is reachable instead of dead.
- The same workflow now runs `npm run smoke:prod:quick` before `npm run smoke:prod`, aligning the workflow with the operator run order already documented in `docs/ops/staging-proof-runbook.md`.
- `scripts/github-workflow-guards.test.mjs` now locks that trigger and quick-before-full sequence in ops regression coverage.
- Verification passed:
  - `npm.cmd run test:ops`

## 11. Open Questions / Follow-ups

- Run the three workflows against staging/preview and paste run URLs, dates, target URL, and pass/fail result back into the relevant specs.
