# Production Smoke Weekly Review Click Stabilization

## Context

PR `#151` merged as `766dc66e5b4c5f0c34abe1a0cc712e9b3915d5a7`. Post-merge CI passed, and the
production smoke workflow passed its quick warmup. The full smoke then failed in the 12-week weekly
review step after 90 seconds:

```text
locator('[data-testid="weekly-review-step-commitments"]:visible')
  .getByRole('button', { name: 'Đã giữ', exact: true })
  .click()

element was detached from the DOM, retrying
```

The failure was not HTTP 429. The current smoke helper captures a collection, iterates by fixed
index, and performs an actionability click. Selecting a commitment updates React state and replaces
the button node, so Playwright can keep waiting for stability on a node that is repeatedly detached.

## Goal

Make weekly commitment classification resilient to expected React node replacement while still
verifying the real UI state transition and preserving all production 429 failure rules.

## Non-goals

- Do not change weekly review UI or business logic.
- Do not seed commitment classification directly into localStorage.
- Do not use a production account, route, IP, or 429 allowlist.
- Do not weaken final API-error, page-error, sync, or persistence assertions.
- Do not add generic Playwright retry abstractions outside this one unstable interaction.

## Considered approaches

### 1. Re-resolve and atomically dispatch the current UI click (selected)

On each bounded iteration, query the currently rendered enabled `Đã giữ` button whose
`aria-pressed` value is not `true`, invoke its DOM `click()` in the same page evaluation, then wait
for observable progress: the pending-button count decreases or the step reports `data-done="true"`.

This avoids holding a stale element handle across React replacement. It still exercises the button's
real event handler and verifies the resulting UI contract.

### 2. Playwright `click({ force: true })`

This is smaller, but it bypasses actionability checks and can conceal an overlay, disabled state, or
layout defect. It also does not fully remove the stale-node race between locator resolution and click.

### 3. Seed classification state directly

This would be stable but would stop testing the user-facing commitment classification control. It is
inconsistent with the smoke workflow's purpose.

## Design

Only `classifyVisiblePreviousCommitments` in `scripts/smoke-production-e2e.mjs` changes.

1. Resolve the visible commitments step and read the initial number of `Đã giữ` buttons.
2. Bound the loop by that initial count so malformed UI state cannot create an infinite loop.
3. For each iteration, evaluate against the current step DOM and click the first enabled button with
   exact normalized text `Đã giữ` and `aria-pressed != "true"`.
4. If no pending button exists, stop normally.
5. After a click, use the existing `waitForCondition` helper to require progress before continuing.
6. Retain the final wait for
   `[data-testid="weekly-review-step-commitments"][data-done="true"]:visible`.
7. Return the number of successful classifications for the existing diagnostic log.

The atomic page evaluation is limited to this control because the production failure proves its node
identity is intentionally unstable during state updates.

## Error handling

- A click that produces no pending-count reduction and no `data-done` state fails through the bounded
  `waitForCondition` timeout.
- Missing or disabled controls do not count as successful classifications.
- The existing final `data-done` assertion remains authoritative.
- No exception or API response is reclassified as expected.

## Test strategy

Add a source-contract regression to `scripts/production-smoke-harness.test.mjs` that proves the smoke
script:

- resolves and clicks a pending commitment inside page evaluation;
- waits for state-based classification progress;
- keeps a bounded iteration count and the final `data-done` assertion;
- no longer uses the stale fixed-index `keptButtons.nth(index).click()` pattern.

TDD sequence:

1. Add the regression and run the focused harness test to observe RED.
2. Implement the minimal helper change.
3. Run the focused harness test to GREEN.
4. Run `npm run test:ops`, `npm run check:fast`, and `git diff --check`.
5. Push a separate hotfix PR and rerun the post-merge production smoke workflow after merge approval.

## Rollback

Revert the single hotfix commit. This restores the previous locator-based interaction without
affecting the rate-limit dispatcher, planning request controls, production data, or weekly review UI.
