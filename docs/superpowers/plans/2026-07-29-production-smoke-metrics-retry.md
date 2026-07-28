# Production Smoke Metrics Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the full production smoke retry and prove 12-week metrics hydration after a rate-limited response instead of failing at final aggregation.

**Architecture:** Keep the existing `waitForApiSuccessWithRateLimitRetry` helper as the single retry mechanism. Add one metrics-specific proof after a deliberate 12-week-system reload; its retry callback reloads the same route after the server-provided cooldown. The final aggregation sees the first 429 as handled, but only after the metrics route returns 2xx.

**Tech Stack:** Node.js 20, Playwright API in the production smoke harness, Vitest, Vite documentation.

## Global Constraints

- Do not modify backend rate-limit policy, Firebase credentials, billing behavior, or real user data.
- Respect `Retry-After` through `getRetryAfterMs`; never use a hard-coded metrics cooldown.
- Do not allowlist `/api/weeks/:weekId/metrics` in `isExpectedBackgroundRateLimit`.
- Preserve the existing full-smoke fail behavior for non-429 and 5xx metrics responses.
- Keep the real-mode Sentry requirement documented; no DSN or other secret may enter source control.

---

### Task 1: Add a regression contract for metrics hydration retry

**Files:**
- Modify: `scripts/production-smoke-harness.test.mjs:128-140`
- Test: `scripts/production-smoke-harness.test.mjs`

**Interfaces:**
- Consumes: source text from `scripts/smoke-production-e2e.mjs`.
- Produces: a static contract requiring a metric-specific retry label, metrics route pattern, and a reload callback after a rate limit.

- [ ] **Step 1: Write the failing test**

Add this test immediately after `tolerates only expected background rate-limited hydration calls at final aggregation`:

```js
  it("retries rate-limited 12-week metric hydration and never allowlists it", () => {
    expect(smokeScript).toContain('const metricsHydrationStartedAt = Date.now();');
    expect(smokeScript).toContain('/\\/api\\/weeks\\/[^/]+\\/metrics(?:\\?|$)/');
    expect(smokeScript).toContain('"12-week metric hydration"');
    expect(smokeScript).toContain('await page.reload({ waitUntil: "domcontentloaded" });');
    expect(smokeScript).not.toContain('pathname === "/api/weeks/:weekId/metrics"');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/production-smoke-harness.test.mjs`

Expected: FAIL because `metricsHydrationStartedAt` and the `12-week metric hydration` proof do not exist.

- [ ] **Step 3: Commit the red test only after observing the failure**

Do not commit the intentionally failing state; retain it in the worktree for the next task.

### Task 2: Prove metrics recovery after the server cooldown

**Files:**
- Modify: `scripts/smoke-production-e2e.mjs:1905-1933`
- Test: `scripts/production-smoke-harness.test.mjs`

**Interfaces:**
- Consumes: `waitForApiSuccessWithRateLimitRetry(page, apiEvents, pattern, label, options)` and `DEFAULT_TIMEOUT_MS`.
- Produces: a handled first metrics 429 only when a later `GET /api/weeks/:weekId/metrics` response is 2xx.

- [ ] **Step 1: Add the smallest metrics-specific retry proof**

Replace the final reload block in `exerciseTwelveWeekSaveReloadAndSync` with this sequence before the existing persisted-state assertion:

```js
  const metricsHydrationStartedAt = Date.now();
  await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSystemLoaded(page);
  await waitForApiSuccessWithRateLimitRetry(
    page,
    apiEvents,
    /\/api\/weeks\/[^/]+\/metrics(?:\?|$)/,
    "12-week metric hydration",
    {
      after: metricsHydrationStartedAt,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      onRateLimitRetry: async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForSystemLoaded(page);
      },
    },
  );
```

- [ ] **Step 2: Run the focused test to verify green**

Run: `npx vitest run scripts/production-smoke-harness.test.mjs`

Expected: PASS with the new regression contract included.

- [ ] **Step 3: Keep final failure semantics strict**

Do not change `isExpectedBackgroundRateLimit`. The existing final aggregation must continue to fail for unhandled 429s and all 5xx responses.

### Task 3: Align real-mode Sentry documentation

**Files:**
- Modify: `README.md:214-234`

**Interfaces:**
- Consumes: `src/app/utils/production-runtime-env.ts`, which reports a real-mode runtime error when `VITE_SENTRY_DSN` is absent.
- Produces: operator guidance that distinguishes local/demo optional monitoring from real-mode production requirements.

- [ ] **Step 1: Replace the outdated optional wording**

Change the heading to `### Production error monitoring with Sentry` and state:

```md
For `VITE_APP_MODE=real` production deployments, `VITE_SENTRY_DSN` is required so startup, auth bootstrap, and sync failures remain observable. A blank DSN is supported only for local or demo operation.
```

- [ ] **Step 2: Preserve secret guidance**

Keep the existing instruction not to put private Sentry auth tokens in source control and retain the frontend/backend environment-variable examples.

### Task 4: Verify, publish, and obtain deployment evidence

**Files:**
- Modify: `scripts/production-smoke-harness.test.mjs`
- Modify: `scripts/smoke-production-e2e.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: GitHub Actions `production-smoke-e2e.yml` with existing fixed QA secrets.
- Produces: a new default-branch production-smoke run that passes without creating another production QA account.

- [ ] **Step 1: Run release-gate checks**

Run:

```powershell
npm run test:ops
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0; lint may emit only the known non-blocking `AdminPagination` template suggestion.

- [ ] **Step 2: Inspect the complete diff and commit**

Run:

```powershell
git diff --check
git status --short
git add -- scripts/production-smoke-harness.test.mjs scripts/smoke-production-e2e.mjs README.md docs/superpowers/plans/2026-07-29-production-smoke-metrics-retry.md
git commit -m "fix: retry rate-limited production metrics smoke"
```

- [ ] **Step 3: Push and open a PR**

Run:

```powershell
git push -u origin codex/production-smoke-metrics-retry
gh pr create --base main --head codex/production-smoke-metrics-retry --title "fix: retry rate-limited production metrics smoke" --body "## Summary\n- require a successful retry for 12-week metrics hydration\n- preserve strict 429 and 5xx smoke failures\n- align real-mode Sentry documentation\n\n## Verification\n- npm run test:ops\n- npm run typecheck\n- npm run lint\n- npm run build"
```

- [ ] **Step 4: Merge only after checks pass, then verify production smoke**

After the PR is merged, inspect the new `production-smoke-e2e.yml` run on `main`. It must pass the metric-hydration retry proof; do not treat a green build alone as release proof.
