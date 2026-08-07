# LWW E2E Memory-Only Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the deployed LWW proof harness by reusing the Firebase-signed pull request's bearer header without restoring credential persistence.

**Architecture:** `rememberCloudPull` observes the full `Authorization` header from the pull request and stores only valid `Bearer` values in a `WeakMap<Page, string>` owned by the Playwright worker. `importLwwBaseline` passes that transient header directly into its browser-side import fetch, while static workflow guards prevent legacy storage reads, unawaited capture, and unsafe diagnostics from returning.

**Tech Stack:** TypeScript, Playwright `^1.59.1`, Vitest source-contract tests, GitHub Actions LWW workflow.

## Global Constraints

- Never read, write, restore, migrate, or depend on `firebase_id_token` or another application-controlled credential store.
- Never print or attach the authorization header or token value in logs, assertion messages, diagnostics, screenshots, videos, traces, or reports.
- Keep the full bearer header only in `WeakMap<Page, string>` and as a transient `page.evaluate` argument.
- Preserve application auth code, backend auth middleware, API contracts, LWW rules, workflow credentials, overwrite guards, scenario sequencing, and storage schemas.
- Await every `rememberCloudPull` call before later logic can use the captured authorization value.
- Keep diagnostics limited to the existing safe metadata, including boolean `tokenPresent`.
- Do not claim production LWW success until a post-merge workflow run passes local-wins, cloud-wins, and tombstone-wins.

---

### Task 1: Add the failing memory-only harness contract

**Files:**
- Modify: `scripts/github-workflow-guards.test.mjs`
- Test: `scripts/github-workflow-guards.test.mjs`

**Interfaces:**
- Consumes: the source text of `e2e/sync-lww.spec.ts`.
- Produces: a regression contract requiring memory-only bearer capture and forbidding the retired storage key.

- [ ] **Step 1: Extend the authenticated-import guard with memory-only assertions**

In `bootstraps LWW through authenticated import and keeps mutation diagnostics safe`, add these assertions after the existing `observedApiBaseUrl.get(page)` assertion:

```js
expect(harness).toContain("const observedAuthorizationHeader = new WeakMap<Page, string>();");
expect(harness).toContain('await response.request().headerValue("authorization")');
expect(harness).toContain("observedAuthorizationHeader.set(page, authorizationHeader)");
expect(harness).toContain("observedAuthorizationHeader.delete(page)");
expect(importBootstrap).toContain("observedAuthorizationHeader.get(page)");
expect(importBootstrap).toContain("Authorization: authorizationHeader");
expect(harness).toContain("await rememberCloudPull(page, initialPullResponse)");
expect(harness).toContain("await rememberCloudPull(page, pullResponse)");
expect(harness).not.toContain("firebase_id_token");
expect(harness).not.toContain("console.log(authorizationHeader)");
expect(harness).not.toContain("console.error(authorizationHeader)");
```

- [ ] **Step 2: Run the focused guard and verify RED**

Run:

```bash
npx vitest run scripts/github-workflow-guards.test.mjs
```

Expected: FAIL in the authenticated-import guard because the source has no `observedAuthorizationHeader`, does not await `headerValue`, and still contains `firebase_id_token`.

- [ ] **Step 3: Commit the red regression test**

```bash
git add -- scripts/github-workflow-guards.test.mjs
git commit -m "test: require memory-only LWW authorization"
```

---

### Task 2: Capture and consume the observed bearer header

**Files:**
- Modify: `e2e/sync-lww.spec.ts`
- Test: `scripts/github-workflow-guards.test.mjs`

**Interfaces:**
- Consumes: Playwright `Response.request().headerValue(name): Promise<string | null>` from successful 12-week pull responses.
- Produces: `observedAuthorizationHeader: WeakMap<Page, string>` and an async `rememberCloudPull(page, response): Promise<void>`.
- Preserves: `importLwwBaseline(page, seed, readApiDiagnostics): Promise<void>` and its safe result diagnostics.

- [ ] **Step 1: Add the page-scoped authorization map**

Beside `observedApiBaseUrl`, add:

```ts
const observedAuthorizationHeader = new WeakMap<Page, string>();
```

- [ ] **Step 2: Make pull observation capture only valid bearer headers**

Replace `rememberCloudPull` with:

```ts
async function rememberCloudPull(page: Page, response: Response) {
  lastObservedCloudPullAt.set(page, Date.now());
  const url = new URL(response.url());
  observedApiBaseUrl.set(
    page,
    `${url.origin}${url.pathname.replace(/\/sync\/12-week\/pull$/, "")}`,
  );

  const authorizationHeader = (
    await response.request().headerValue("authorization")
  )?.trim();
  if (authorizationHeader && /^Bearer\s+\S+$/i.test(authorizationHeader)) {
    observedAuthorizationHeader.set(page, authorizationHeader);
  } else {
    observedAuthorizationHeader.delete(page);
  }
}
```

- [ ] **Step 3: Await all authorization capture call sites**

Change the three call patterns to:

```ts
await rememberCloudPull(page, initialPullResponse);
await rememberCloudPull(page, pullResponse);
```

There is one initial-login call and two `pullResponse` call sites: reload and manual sync.

- [ ] **Step 4: Replace the legacy storage read in import bootstrap**

Read the header before `page.evaluate`:

```ts
const authorizationHeader = observedAuthorizationHeader.get(page);
```

Add `authorizationHeader` to the evaluated argument and callback destructuring:

```ts
async ({
  apiBaseUrl: backendApiBaseUrl,
  authorizationHeader,
  importId,
  importPayload,
  proofIds,
}) => {
```

Delete:

```ts
const token = localStorage.getItem("firebase_id_token")?.trim();
```

Change the missing-credential guard to:

```ts
if (!authorizationHeader) {
```

Change the import header to:

```ts
Authorization: authorizationHeader,
```

Pass the transient value into `page.evaluate`:

```ts
{
  apiBaseUrl,
  authorizationHeader,
  importId: seed.importId,
  importPayload: seed.importPayload,
  proofIds: {
    goalId: seed.goalId,
    planId: seed.importPayload.plan.clientPlanId,
    taskId: seed.taskId,
  },
}
```

- [ ] **Step 5: Run the focused guard and verify GREEN**

Run:

```bash
npx vitest run scripts/github-workflow-guards.test.mjs
```

Expected: PASS with all workflow/source-contract tests green.

- [ ] **Step 6: Run TypeScript verification for the async API change**

Run:

```bash
npm run typecheck
```

Expected: exit code 0 with no unawaited or argument-shape type errors.

- [ ] **Step 7: Commit the minimal harness fix**

```bash
git add -- e2e/sync-lww.spec.ts
git commit -m "fix: keep LWW authorization in memory"
```

---

### Task 3: Verify the branch and publish for review

**Files:**
- Verify: `docs/specs/2026-08-07-lww-e2e-memory-token.md`
- Verify: `docs/superpowers/plans/2026-08-07-lww-e2e-memory-token.md`
- Verify: `scripts/github-workflow-guards.test.mjs`
- Verify: `e2e/sync-lww.spec.ts`

**Interfaces:**
- Consumes: the approved spec and the two implementation commits.
- Produces: branch-level automated evidence and a small draft PR against `main`.

- [ ] **Step 1: Run operations contracts**

```bash
npm run test:ops
```

Expected: all operations tests pass with zero failures.

- [ ] **Step 2: Run the frontend quality gates**

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Expected: every command exits 0.

- [ ] **Step 3: Audit the security-sensitive diff**

```bash
git diff origin/main...HEAD --check
git diff origin/main...HEAD -- e2e/sync-lww.spec.ts scripts/github-workflow-guards.test.mjs docs/specs/2026-08-07-lww-e2e-memory-token.md docs/superpowers/plans/2026-08-07-lww-e2e-memory-token.md
rg -n "firebase_id_token|console\.(log|error).*authorizationHeader|response\.headers\(\)|response\.body\(\)" e2e/sync-lww.spec.ts scripts/github-workflow-guards.test.mjs
```

Expected: no diff errors; no legacy-token read or credential-value logging in the harness; only negative guard-test literals may match the audit patterns.

- [ ] **Step 4: Push the feature branch and open one draft PR**

```powershell
git push -u origin codex/lww-token-memory-harness
$body = @'
## What changed
- capture the Firebase-signed pull request authorization header in a page-scoped WeakMap
- reuse the transient header for LWW bootstrap import without localStorage token persistence
- add source-contract coverage for awaited capture and safe diagnostics

## Verification
- npm run test:ops
- npm run typecheck
- npm run lint
- npm run test:run
- npm run build

## Production acceptance
- rerun LWW e2e against https://dearourfuture.io.vn after merge
'@
gh pr create `
  --repo anhnhat432/Vision-Board-Web-Platform `
  --base main `
  --head codex/lww-token-memory-harness `
  --draft `
  --title "fix: keep LWW E2E authorization in memory" `
  --body $body
```

Expected: one draft PR containing only the approved harness, guard, spec, and plan changes.

- [ ] **Step 5: Review CI before merge approval**

Resolve the current branch's PR and watch its checks:

```powershell
$prNumber = gh pr view --repo anhnhat432/Vision-Board-Web-Platform --json number --jq '.number'
gh pr checks $prNumber --repo anhnhat432/Vision-Board-Web-Platform --watch
```

Inspect the final diff. Do not merge without user approval.

---

### Task 4: Establish deployed LWW evidence after merge

**Files:**
- Runtime verification only; no source file change expected.

**Interfaces:**
- Consumes: merged `main`, GitHub Actions secrets, and `https://dearourfuture.io.vn`.
- Produces: authoritative pass/fail evidence for all three LWW scenarios.

- [ ] **Step 1: Trigger the production-target LWW workflow**

```powershell
$previousRunId = gh run list `
  --repo anhnhat432/Vision-Board-Web-Platform `
  --workflow lww-e2e-staging.yml `
  --branch main `
  --event workflow_dispatch `
  --limit 1 `
  --json databaseId `
  --jq '.[0].databaseId'
gh workflow run lww-e2e-staging.yml `
  --repo anhnhat432/Vision-Board-Web-Platform `
  --ref main `
  -f target_url=https://dearourfuture.io.vn `
  -f allow_overwrite=OVERWRITE_TEST_WORKSPACE
```

- [ ] **Step 2: Watch the exact run to completion**

```powershell
do {
  Start-Sleep -Seconds 3
  $runId = gh run list `
    --repo anhnhat432/Vision-Board-Web-Platform `
    --workflow lww-e2e-staging.yml `
    --branch main `
    --event workflow_dispatch `
    --limit 1 `
    --json databaseId `
    --jq '.[0].databaseId'
} while (-not $runId -or $runId -eq $previousRunId)

gh run watch $runId --repo anhnhat432/Vision-Board-Web-Platform --exit-status
```

- [ ] **Step 3: Record scenario-level evidence**

Confirm local-wins, cloud-wins, and tombstone-wins individually. If any scenario fails after import succeeds, begin a new systematic-debugging cycle and do not classify that failure as part of this harness patch.
