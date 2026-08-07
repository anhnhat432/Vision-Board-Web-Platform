# Production Smoke Weekly Review Click Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production smoke weekly-review commitment click resilient to React node replacement without weakening any UI completion or HTTP 429 assertions.

**Architecture:** Keep the change local to `classifyVisiblePreviousCommitments`. Resolve and click the current pending commitment atomically inside `Locator.evaluate`, bound attempts by the initial accessible button count, then wait for an observable pending-count decrease or `data-done="true"` before continuing.

**Tech Stack:** Node.js 20.x, Playwright locator/page evaluation APIs, Vitest source-contract tests, PowerShell-compatible npm commands.

## Global Constraints

- Treat this as Hybrid SDD/ADD Shell work with a frozen behavioral contract from `docs/superpowers/specs/2026-08-07-production-smoke-weekly-review-click-design.md`.
- Modify only `scripts/smoke-production-e2e.mjs` and `scripts/production-smoke-harness.test.mjs` during implementation.
- Do not change weekly-review UI, business logic, localStorage data, backend sync, billing, rate-limit behavior, or 429 failure detection.
- Do not use `force: true`, direct localStorage classification seeding, production-account allowlists, or generic retry abstractions.
- Keep the loop bounded by the initial accessible `Đã giữ` button count.
- Keep the final visible `data-done="true"` assertion authoritative.
- Use TDD: observe the new regression test fail for the missing atomic re-resolution contract before changing implementation.

---

## File Structure

- `scripts/production-smoke-harness.test.mjs`: adds one focused source-contract regression for atomic DOM click, re-resolution, bounded iteration, state-based progress, and removal of the stale fixed-index click pattern.
- `scripts/smoke-production-e2e.mjs`: changes only `classifyVisiblePreviousCommitments` to implement the approved interaction contract.
- No new runtime modules or shared helpers are introduced; this keeps the production smoke diff narrow and reversible.

### Task 1: Lock the React replacement regression with a failing source-contract test

**Files:**
- Modify: `scripts/production-smoke-harness.test.mjs:52`
- Reference: `docs/superpowers/specs/2026-08-07-production-smoke-weekly-review-click-design.md`

**Interfaces:**
- Consumes: the text of `scripts/smoke-production-e2e.mjs` loaded into `smokeScript`.
- Produces: a regression contract for the body of `classifyVisiblePreviousCommitments(page)`.

- [ ] **Step 1: Add the failing regression after the existing commitment-order test**

```javascript
  it("re-resolves weekly review commitments before bounded atomic DOM clicks", () => {
    const helperStart = smokeScript.indexOf("async function classifyVisiblePreviousCommitments(page)");
    const helperEnd = smokeScript.indexOf("\nasync function readWeeklyReviewSurface(page)", helperStart);
    const helperSource = smokeScript.slice(helperStart, helperEnd);

    expect(helperStart).toBeGreaterThan(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helperSource).toContain(
      'const buttonCount = await step.getByRole("button", { name: "Đã giữ", exact: true }).count();',
    );
    expect(helperSource).toContain("for (let attempt = 0; attempt < buttonCount; attempt += 1)");
    expect(helperSource).toContain("const clickResult = await step.evaluate((container) => {");
    expect(helperSource).toContain('button.getAttribute("aria-pressed") !== "true"');

    const atomicClickStart = helperSource.indexOf("const clickResult = await step.evaluate");
    const atomicClickEnd = helperSource.indexOf("if (!clickResult.clicked)", atomicClickStart);
    const atomicClickSource = helperSource.slice(atomicClickStart, atomicClickEnd);
    expect(atomicClickSource).toContain("pendingButton.click();");

    expect(helperSource).toContain("await waitForCondition(");
    expect(helperSource).toContain("const state = await step.evaluate((container) => {");
    expect(helperSource).toContain("state.done || state.pendingCount < clickResult.pendingCount");
    expect(helperSource).toContain(
      '[data-testid="weekly-review-step-commitments"][data-done="true"]:visible',
    );
    expect(helperSource).not.toContain("keptButtons.nth(index)");
    expect(helperSource).not.toContain("await button.click()");
  });
```

- [ ] **Step 2: Run the focused harness test and verify RED**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run scripts/production-smoke-harness.test.mjs --reporter=dot
```

Expected: exit code `1`; the new test fails because the current helper does not contain `const clickResult = await step.evaluate((container) => {` and still contains `keptButtons.nth(index)` / `await button.click()`; the existing 30 tests remain green.

- [ ] **Step 3: Inspect the RED failure before implementation**

Confirm the failure is an assertion against the missing approved contract, not a syntax error, missing dependency, or unrelated baseline failure. Do not edit `scripts/smoke-production-e2e.mjs` until this condition is met.

### Task 2: Implement the bounded atomic click and prove GREEN

**Files:**
- Modify: `scripts/smoke-production-e2e.mjs:1231`
- Test: `scripts/production-smoke-harness.test.mjs`

**Interfaces:**
- Consumes: Playwright `page`, the visible commitments-step locator, and existing `waitForCondition(label, predicate, timeoutMs?, intervalMs?)`.
- Produces: `Promise<number>` returning the number of successful pending commitment clicks while preserving the existing final completion wait.

- [ ] **Step 1: Replace only `classifyVisiblePreviousCommitments` with the minimal implementation**

```javascript
async function classifyVisiblePreviousCommitments(page) {
  const step = page.locator('[data-testid="weekly-review-step-commitments"]:visible').first();
  if (!(await step.isVisible().catch(() => false))) return 0;

  const buttonCount = await step.getByRole("button", { name: "Đã giữ", exact: true }).count();
  let classifiedCount = 0;

  for (let attempt = 0; attempt < buttonCount; attempt += 1) {
    const clickResult = await step.evaluate((container) => {
      const isPendingCommitment = (button) =>
        button.textContent?.replace(/\s+/g, " ").trim() === "Đã giữ" &&
        !button.disabled &&
        button.getAttribute("aria-pressed") !== "true";
      const pendingButtons = Array.from(container.querySelectorAll("button")).filter(isPendingCommitment);
      const pendingButton = pendingButtons[0];
      if (!pendingButton) return { clicked: false, pendingCount: 0 };

      pendingButton.click();
      return { clicked: true, pendingCount: pendingButtons.length };
    });

    if (!clickResult.clicked) break;
    classifiedCount += 1;

    await waitForCondition(
      `weekly review commitment classification ${classifiedCount}`,
      async () => {
        const state = await step.evaluate((container) => {
          const pendingCount = Array.from(container.querySelectorAll("button")).filter(
            (button) =>
              button.textContent?.replace(/\s+/g, " ").trim() === "Đã giữ" &&
              !button.disabled &&
              button.getAttribute("aria-pressed") !== "true",
          ).length;
          return {
            done: container.getAttribute("data-done") === "true",
            pendingCount,
          };
        });
        return state.done || state.pendingCount < clickResult.pendingCount;
      },
    );
  }

  await page
    .locator('[data-testid="weekly-review-step-commitments"][data-done="true"]:visible')
    .waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  return classifiedCount;
}
```

- [ ] **Step 2: Run the focused harness test and verify GREEN**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run scripts/production-smoke-harness.test.mjs --reporter=dot
```

Expected: exit code `0`; `31/31` tests pass, including the regression that failed in Task 1.

- [ ] **Step 3: Review the implementation diff against the approved design**

Run:

```powershell
git diff -- scripts/production-smoke-harness.test.mjs scripts/smoke-production-e2e.mjs
```

Expected: only the new regression and the body of `classifyVisiblePreviousCommitments` change. Confirm there is no `force: true`, localStorage write, route change, 429 filtering change, or shared helper refactor.

- [ ] **Step 4: Commit the tested hotfix**

```powershell
git add scripts/production-smoke-harness.test.mjs scripts/smoke-production-e2e.mjs
git commit -m "fix: stabilize weekly review smoke clicks"
```

Expected: one implementation commit containing only the two script files.

### Task 3: Run repository verification and prepare the draft pull request

**Files:**
- Verify: `scripts/production-smoke-harness.test.mjs`
- Verify: `scripts/smoke-production-e2e.mjs`
- No additional file changes expected.

**Interfaces:**
- Consumes: the committed hotfix from Task 2 and the existing repository verification scripts.
- Produces: fresh local evidence plus a pushed branch and draft PR for human merge approval.

- [ ] **Step 1: Run the operations test suite**

Run:

```powershell
npm run test:ops
```

Expected: exit code `0`; all operations and production smoke harness Vitest tests pass.

- [ ] **Step 2: Run the fast repository verification**

Run:

```powershell
npm run check:fast
```

Expected: exit code `0`; frontend typecheck, Biome lint, fast Vitest suite, and Vite production build all pass.

- [ ] **Step 3: Check whitespace and worktree scope**

Run:

```powershell
git diff --check origin/main...HEAD
git status --short --branch
git diff --stat origin/main...HEAD
```

Expected: `git diff --check` produces no output; status is clean and ahead of `origin/main`; the branch contains only the approved design spec, this implementation plan, the regression test, and the localized smoke helper change.

- [ ] **Step 4: Perform the Hybrid SDD/ADD completion review**

Verify all four layers explicitly:

1. Automated checks: focused test, `test:ops`, `check:fast`, and `git diff --check` are green.
2. Spec compliance: atomic current-node click, bounded iteration, state progress wait, and final `data-done` wait are present.
3. Safety compliance: no app/runtime contract, secret, localStorage, rate-limit, billing, auth, or backend change.
4. Acceptance verification: the stale `keptButtons.nth(index)` + `button.click()` pattern is absent; live production proof remains pending until the workflow runs after an approved merge.

- [ ] **Step 5: Push the branch and open a draft PR without merging**

Run:

```powershell
git push -u origin fix/production-smoke-weekly-review-click
gh pr create --draft --base main --head fix/production-smoke-weekly-review-click --title "fix: stabilize weekly review production smoke clicks" --body "## Root cause`nThe weekly review smoke helper retained indexed locators while React replaced commitment buttons after each classification click, causing Playwright to wait on detached nodes.`n`n## Change`nRe-resolve and click the current pending commitment atomically in page evaluation, bound iterations by the initial button count, and wait for pending-count or data-done progress.`n`n## Verification`n- focused production smoke harness test`n- npm run test:ops`n- npm run check:fast`n- git diff --check`n`n## Deployment evidence`nLive production smoke remains required after human-approved merge. This PR does not weaken HTTP 429 detection."
```

Expected: push succeeds and GitHub returns the URL of a new draft PR. Do not merge the PR and do not deploy production.

- [ ] **Step 6: Watch required PR checks and report evidence**

Run:

```powershell
gh pr checks fix/production-smoke-weekly-review-click --watch
```

Expected: all required PR checks finish successfully. If any check fails, inspect and fix only failures caused by this branch; report unrelated baseline or environment failures exactly.

## Plan Self-Review Record

- [x] Spec coverage: every selected-design requirement maps to Task 1 source-contract assertions and Task 2 implementation code; post-merge live proof is explicitly deferred to human-approved merge.
- [x] Placeholder scan: no `TBD`, `TODO`, “implement later”, generic error-handling instruction, or undefined helper remains.
- [x] Type consistency: `clickResult` consistently exposes `{ clicked, pendingCount }`; `state` consistently exposes `{ done, pendingCount }`; the helper continues returning `Promise<number>` by behavior.
- [x] Scope consistency: the plan changes only the two approved script files and keeps documentation commits separate from the implementation commit.
