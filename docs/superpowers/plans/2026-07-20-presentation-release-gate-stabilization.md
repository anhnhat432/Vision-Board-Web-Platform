# Presentation Release-Gate Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore deterministic local-demo and production release gates for the 2026-07-21 presentation without changing application runtime behavior.

**Architecture:** Keep the Core product contract frozen and modify only test/smoke surfaces. Add one Playwright helper for previous weekly commitments, freeze Vitest time for the date-sensitive sync fixture, refresh the local landing smoke signals, and produce a presentation-day runbook from verified commands.

**Tech Stack:** Node.js 20, Vitest, Playwright smoke scripts, PowerShell, React/Vite application under test.

## Global Constraints

- Do not change runtime UI, storage keys/shapes, migrations, API contracts, auth, billing, entitlement, or sync merge semantics.
- `VITE_APP_MODE` fallback remains `real`; `/billing/mock-checkout` remains demo-only.
- Preserve local-first behavior and never clear or overwrite real user data during local verification.
- Do not add dependencies.
- Do not dispatch GitHub Actions or push/deploy as part of this plan.

---

### Task 1: Make Production Weekly-Review Smoke Satisfy Existing Validation

**Files:**
- Modify: `scripts/production-smoke-harness.test.mjs`
- Modify: `scripts/smoke-production-e2e.mjs`

**Interfaces:**
- Consumes: Playwright `page`, existing weekly-review DOM test ids and button accessible names.
- Produces: `classifyVisiblePreviousCommitments(page): Promise<number>` and an invocation before weekly-review submit.

- [ ] **Step 1: Write the failing harness contract test**

Add this assertion to `scripts/production-smoke-harness.test.mjs`:

```js
it("classifies unanswered previous commitments before weekly review submit", () => {
  expect(smokeScript).toContain("async function classifyVisiblePreviousCommitments(page)");
  expect(smokeScript).toContain('[data-testid="weekly-review-step-commitments"]:visible');
  expect(smokeScript).toContain('getByRole("button", { name: "Đã giữ", exact: true })');

  const classifyIndex = smokeScript.indexOf("await classifyVisiblePreviousCommitments(page);");
  const submitIndex = smokeScript.indexOf('await clickButtonByNormalizedText(page, "chot review tuan nay");');
  expect(classifyIndex).toBeGreaterThan(0);
  expect(submitIndex).toBeGreaterThan(classifyIndex);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx vitest run scripts/production-smoke-harness.test.mjs
```

Expected: FAIL because `classifyVisiblePreviousCommitments` is absent.

- [ ] **Step 3: Implement the bounded Playwright helper**

Add near the existing weekly-review helpers in `scripts/smoke-production-e2e.mjs`:

```js
async function classifyVisiblePreviousCommitments(page) {
  const step = page.locator('[data-testid="weekly-review-step-commitments"]:visible').first();
  if (!(await step.isVisible().catch(() => false))) return 0;

  const keptButtons = step.getByRole("button", { name: "Đã giữ", exact: true });
  const buttonCount = await keptButtons.count();
  let classifiedCount = 0;

  for (let index = 0; index < buttonCount; index += 1) {
    const button = keptButtons.nth(index);
    const alreadyPressed = (await button.getAttribute("aria-pressed")) === "true";
    if (alreadyPressed || !(await button.isEnabled())) continue;
    await button.click();
    classifiedCount += 1;
  }

  await page
    .locator('[data-testid="weekly-review-step-commitments"][data-done="true"]:visible')
    .waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  return classifiedCount;
}
```

Invoke it immediately after the form is visible:

```js
await classifyVisiblePreviousCommitments(page);
await page.locator("#weekly-insights").fill(WEEKLY_REVIEW_OUTPUT);
```

- [ ] **Step 4: Run the harness test and verify GREEN**

Run:

```powershell
npx vitest run scripts/production-smoke-harness.test.mjs
```

Expected: PASS with all production smoke harness tests green.

---

### Task 2: Freeze the Pulled-Workspace Fixture Clock

**Files:**
- Modify: `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`

**Interfaces:**
- Consumes: existing `baseNow` test scenario and Vitest fake timers.
- Produces: deterministic date-derived status/current-week assertions independent of wall-clock date.

- [ ] **Step 1: Confirm the existing RED failure**

Run:

```powershell
npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/pulledWorkspaceApply.test.ts
```

Expected: FAIL because the real date is after the fixture cycle end and status becomes `completed` instead of `paused`.

- [ ] **Step 2: Pin and restore the test clock**

Change the import and add hooks after `baseNow`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseNow = "2026-04-30T00:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(baseNow));
});

afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/pulledWorkspaceApply.test.ts
```

Expected: 12 tests PASS with no production implementation change.

---

### Task 3: Align Local MVP1 Smoke With Current Landing Semantics

**Files:**
- Modify: `scripts/smoke-mvp1-local-demo.mjs`

**Interfaces:**
- Consumes: existing accent-insensitive `assertTextIncludesAny` and `clickButton` helpers.
- Produces: landing assertions and start CTA candidates aligned with the current Dear Our Future landing.

- [ ] **Step 1: Preserve the observed RED evidence**

The baseline run already failed with:

```text
signed-out dashboard is missing expected text
```

because the script required retired strings such as `trai nghiem demo mien phi`.

- [ ] **Step 2: Replace retired landing text candidates**

Use current semantic signals:

```js
assertTextIncludesAny(
  state,
  [
    "bien uoc mo thanh ke hoach",
    "lo trinh 12 tuan co co so khoa hoc",
    "hanh trinh 4 buoc gat hai ket qua",
  ],
  "signed-out dashboard",
);
assertTextIncludesAny(
  state,
  [
    "thiet lap chu ky 12 tuan ngay",
    "thiet lap trong 3 phut",
    "nhan ngay banh xe cuoc song",
    "xem lo trinh",
  ],
  "signed-out dashboard onboarding promise",
);
```

Update the start CTA candidates:

```js
await clickButton([
  "thiet lap chu ky 12 tuan ngay",
  "bat dau life balance",
]);
```

- [ ] **Step 3: Run the full local demo smoke and verify GREEN**

Run:

```powershell
$env:VITE_APP_MODE='demo'; python 'C:/Users/admin/.agents/skills/webapp-testing/scripts/with_server.py' --server "npm run dev -- --host 127.0.0.1" --port 5173 --timeout 60 -- npm.cmd run smoke:mvp1
```

Expected: PASS through the complete local-first demo flow with no browser errors.

---

### Task 4: Create the Presentation-Day Runbook

**Files:**
- Create: `docs/ops/presentation-day-checklist-2026-07-21.md`

**Interfaces:**
- Consumes: verified demo commands, current route order, known production proof results, and local-first fallback behavior.
- Produces: a concise operator checklist for the presentation team.

- [ ] **Step 1: Write the runbook**

Include these exact sections:

```markdown
# Presentation Day Checklist — 2026-07-21

## Recommended Mode
## Tonight
## 30 Minutes Before
## 7-Minute Route Narrative
## Offline Fallback
## Stop/Skip Rules
## Known Risks and Owners
## Verified Evidence
```

The primary command must be:

```powershell
$env:VITE_APP_MODE='demo'; npm run dev -- --host 127.0.0.1
```

The narrative route order must be:

```text
/ -> /onboarding -> /life-balance -> /life-insight -> /smart-goal-setup -> /feasibility -> /12-week-setup -> /12-week-system?tab=today -> /12-week-system?tab=week -> /12-week-system?tab=progress -> /journal
```

State explicitly that billing, account deletion, sync conflict resolution, and admin surfaces are not part of the live presentation path.

- [ ] **Step 2: Check the runbook for stale secrets and placeholders**

Run:

```powershell
rg -n "PLACEHOLDER|UNRESOLVED|password|secret|token|demo\+.*@" docs/ops/presentation-day-checklist-2026-07-21.md
```

Expected: no credentials or unresolved placeholders.

---

### Task 5: Run the Release Verification Gate

**Files:**
- Verify only; no new production files.

**Interfaces:**
- Consumes: Tasks 1-4 outputs.
- Produces: current evidence for automated checks, spec compliance, safety compliance, and presentation acceptance.

- [ ] **Step 1: Run focused checks**

```powershell
npx vitest run scripts/production-smoke-harness.test.mjs
npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/pulledWorkspaceApply.test.ts
```

Expected: both commands PASS.

- [ ] **Step 2: Run browser acceptance checks**

```powershell
$env:VITE_APP_MODE='demo'; python 'C:/Users/admin/.agents/skills/webapp-testing/scripts/with_server.py' --server "npm run dev -- --host 127.0.0.1" --port 5173 --timeout 60 -- npm.cmd run smoke:mvp1
$env:VITE_APP_MODE='demo'; python 'C:/Users/admin/.agents/skills/webapp-testing/scripts/with_server.py' --server "npm run dev -- --host 127.0.0.1" --port 5173 --timeout 60 -- npm.cmd run smoke:core-quality
```

Expected: both smoke commands PASS.

- [ ] **Step 3: Run broad frontend and backend gates**

```powershell
npm run test:production-core:frontend
npm run check
npm --prefix backend run check
npm run env:check
```

Expected: code/test/build gates PASS. `env:check` may report missing real-mode-only monitoring/billing values while still passing because the configured local mode is demo; record those items as deployment risks rather than hiding them.

- [ ] **Step 4: Audit the final diff and requirements**

```powershell
git diff --check HEAD~1
git status --short
git diff --stat HEAD~1
```

Confirm every spec `SHALL` maps to a changed script/test or verification result, and confirm no runtime source file changed.

- [ ] **Step 5: Commit the bounded implementation**

```powershell
git add scripts/production-smoke-harness.test.mjs scripts/smoke-production-e2e.mjs scripts/smoke-mvp1-local-demo.mjs src/features/plan12week/persistence/pulledWorkspaceApply.test.ts docs/ops/presentation-day-checklist-2026-07-21.md docs/superpowers/plans/2026-07-20-presentation-release-gate-stabilization.md
git commit -m "test: stabilize presentation release gates"
```

Expected: one focused implementation commit after all verification passes.
