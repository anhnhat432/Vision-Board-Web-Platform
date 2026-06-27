# Production Smoke Weekly Review Harness Spec

## 1. Context & Goal

- Feature / bug: deployed `production-smoke-e2e.yml` currently fails before billing checks because the full smoke waits for a hidden weekly-review selector instead of opening the real review flow.
- Why now: production smoke is one of the last proof gates for launch readiness, so the harness must follow the real weekly execution flow instead of relying on hidden DOM.
- User impact: launch operators get a trustworthy production smoke signal for the 12-week execution loop instead of a false failure caused by stale harness assumptions.
- Modes affected: real-mode production smoke only. Demo/local app runtime behavior is out of scope.

## 2. Surface Classification

- Type: Core ops
- Touched domains: production smoke harness, launch proof evidence, weekly review flow reachability.
- Existing invariants that must not break: local-first 12-week behavior stays unchanged; smoke still requires explicit production credentials; runtime source still avoids `window.confirm`.

## 3. Actors & Entry Points

- Primary actor: GitHub Actions production smoke runner.
- Secondary actor(s): launch operator rerunning smoke manually.
- Entry points: `.github/workflows/production-smoke-e2e.yml`, `scripts/smoke-production-e2e.mjs`.

## 4. Functional Requirements

1. WHEN production smoke reaches `/12-week-system?tab=week` before the scheduled review day, THE harness SHALL open the real weekly-review flow before filling review inputs.
2. WHEN the review form is opened early, THE harness SHALL wait on a visible review marker instead of requiring hidden `wam-section-score` content to become visible.
3. WHERE the harness simulates weekly review completion, THE harness SHALL not inject `window.confirm` into the runtime page.
4. WHEN the review form is already visible, THE harness SHALL keep using the existing visible flow and not click extra controls unnecessarily.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none beyond existing smoke seeding.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: smoke must still verify local write, backend sync, reload persistence, and settings sync trust after the weekly review step.
- rollback / restore concerns: script-only rollback.

## 6. Non-functional Requirements

- observability: latest failed run id and failing selector should be recorded in docs/spec evidence.
- safety: static guards should catch reintroduction of hidden-selector waits or `window.confirm` injection without needing live credentials.
- maintainability: visible-marker checks should use stable `data-testid` selectors already owned by the week tab.

## 7. Out of Scope

- Running the full production smoke from this local machine.
- Fixing any production backend or deployment issue after the harness reaches later steps.
- Billing, email verification, account deletion, or LWW workflow changes.

## 8. Acceptance Criteria

- [x] production smoke opens weekly review early when the form is not yet visible.
- [x] production smoke waits for visible `weekly-score-interpretation` instead of hidden `wam-section-score`.
- [x] production smoke script no longer injects `window.confirm` during weekly review.
- [x] local ops/static verification covers these harness invariants without live credentials.

## 9. Verification Plan

```bash
node --check scripts/smoke-production-e2e.mjs
npm.cmd run test:ops
git diff --check
```

## 10. Batch Evidence - 2026-06-26

- GitHub Actions run `28218523067` failed on default branch before billing checks: the full production smoke timed out after 90s waiting for `[data-testid="wam-section-score"]` to become visible on `/12-week-system?tab=week`, while the matched node stayed hidden.
- `scripts/smoke-production-e2e.mjs` now opens the real weekly-review flow through `ensureWeeklyReviewFormVisible()` and waits for visible `weekly-score-interpretation` UI instead of the hidden `wam-section-score` container.
- Static ops regression coverage in `scripts/production-smoke-harness.test.mjs` now fails if the harness reintroduces the hidden selector wait or `window.confirm` injection.
- Verification passed:
  - `node --check scripts/smoke-production-e2e.mjs`
  - `node --check scripts/production-smoke-harness.test.mjs`
  - `npm.cmd run test:ops` (14 tests passed)

## 11. Open Questions / Follow-ups

- After this batch is committed and available on `main`, rerun `.github/workflows/production-smoke-e2e.yml` to confirm the harness now reaches the later proof stages.
