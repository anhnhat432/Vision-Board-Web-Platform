# Production Smoke Trust Surfaces Spec

## 1. Context & Goal

- Feature / bug: `scripts/smoke-production-e2e.mjs` now verifies several real-mode trust surfaces beyond weekly review and checkout lock, but the static ops guard only protects a subset of those checkpoints.
- Why now: deployed production smoke is one of the last repo-controlled launch gates. If these trust-surface checks disappear during refactors, the harness can regress quietly until a live run fails.
- User impact: launch operators get stronger deployed proof that real-mode auth, settings, and sync trust surfaces still exist before and after the core funnel flow.
- Modes affected: real-mode production smoke only. Demo runtime behavior is out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: production smoke harness, static ops regression guards, launch proof evidence.
- Existing invariants that must not break: smoke still requires explicit credentials unless generated signup is intentionally opted in; runtime app behavior stays unchanged; no localStorage shape changes.

## 3. Actors & Entry Points

- Primary actor: GitHub Actions production smoke runner.
- Secondary actor(s): launch operator rerunning smoke manually.
- Entry points: `scripts/smoke-production-e2e.mjs`, `scripts/production-smoke-harness.test.mjs`.

## 4. Functional Requirements

1. WHEN production smoke starts without `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`, THE harness SHALL fail unless `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` explicitly allows generated signup.
2. WHEN production smoke opens a direct mock-checkout URL in real mode, THE harness SHALL treat visible mock/demo copy as a failure.
3. WHEN production smoke inspects `/login`, THE harness SHALL prove sign-in recovery and sign-up legal trust surfaces are reachable before authentication.
4. WHEN production smoke reaches authenticated `/settings`, THE harness SHALL prove account export/delete actions and required legal/support links are reachable.
5. WHEN production smoke completes 12-week writes and remote sync, THE harness SHALL prove Settings account-sync shows synced evidence, zero pending account changes, local-safe synced copy, and no email-unverified blocker.
6. WHERE these trust-surface checks are implemented, THE static ops harness SHALL fail if the production smoke script stops asserting them.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: smoke still verifies auth, 12-week write/reload/sync, settings sync trust, and billing in the existing order.
- rollback / restore concerns: script-only rollback.

## 6. Non-functional Requirements

- observability: failures should name the missing trust surface clearly enough for operators to triage without live debugging.
- safety: static guards must catch missing trust-surface assertions without live credentials.
- maintainability: guards should prefer stable helper names, selectors, and step labels already owned by the harness.

## 7. Out of Scope

- Running the full production smoke from this local machine.
- Changing runtime auth, billing, or sync product behavior.
- Adding new staging credentials or reading secret values.

## 8. Acceptance Criteria

- [x] production smoke fails closed unless fixed credentials exist or generated signup is explicitly opted in.
- [x] production smoke still checks the direct mock-checkout route in real mode.
- [x] production smoke still checks login recovery and legal trust surfaces before authentication.
- [x] production smoke still checks Settings account lifecycle reachability after authentication.
- [x] production smoke still checks Settings account-sync trust after successful 12-week sync.
- [x] static ops verification covers all of the above trust-surface checkpoints.

## 9. Verification Plan

```bash
node --check scripts/smoke-production-e2e.mjs
npm.cmd run test:ops
git diff --check
```

## 10. Batch Evidence - 2026-06-27

- `scripts/production-smoke-harness.test.mjs` now statically guards the generated-account opt-in gate, direct mock-checkout proof, login recovery/legal surface, Settings account lifecycle surface, and Settings account-sync trust checkpoint in `scripts/smoke-production-e2e.mjs`.
- This keeps deployed production smoke aligned with the real/demo boundary, auth/account lifecycle, and sync trust specs even when live credentials are unavailable locally.
- Verification passed:
  - `node --check scripts/smoke-production-e2e.mjs`
  - `npm.cmd run test:ops`
  - `git diff --check`

## 11. Open Questions / Follow-ups

- After these guards reach `main`, rerun `.github/workflows/production-smoke-e2e.yml` to confirm the deployed proof still reaches the post-sync billing stages.
