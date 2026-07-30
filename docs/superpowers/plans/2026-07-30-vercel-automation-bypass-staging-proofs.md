# Vercel Automation Bypass Staging Proofs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the four GitHub Actions launch-proof workflows reach Vercel-protected preview deployments without weakening `Require Log In` or exposing the Automation Bypass secret.

**Architecture:** A pure shared helper converts `VERCEL_AUTOMATION_BYPASS_SECRET` into the two Vercel-approved request headers. Playwright consumes the headers in memory and disables traces while they are active; the `agent-browser` core-funnel harness consumes them through an owner-only temporary config that is removed after the run. GitHub Actions injects and validates the repository secret, while release docs and guard tests keep the protected-preview contract explicit.

**Tech Stack:** Node.js 20.x, ECMAScript modules, TypeScript, Playwright, `agent-browser`, Vitest, GitHub Actions, Vercel Deployment Protection, PowerShell, GitHub CLI.

## Global Constraints

- Keep Vercel Standard Protection and `Require Log In` enabled.
- Do not add dependencies.
- Never put the bypass secret in source, command-line arguments, URLs, logs, screenshots, videos, traces, reports, or committed artifacts.
- Preserve demo/real app-mode routing, Firebase behavior, localStorage schemas, backend APIs, billing, entitlements, and sync semantics.
- Keep local proof commands working against unprotected targets when `VERCEL_AUTOMATION_BYPASS_SECRET` is absent.
- Keep Node compatibility at `20.x` on Windows and Ubuntu.
- Do not modify or stage `src/test/ux-ui-upgrade/_scan-report.txt`.
- Do not merge PR #129 or trigger production deployment until all four preview proofs and `npm run proof:readiness` pass.

---

## File Structure

- Create `scripts/vercel-automation-bypass.mjs`: pure environment-to-header conversion with no I/O or logging.
- Create `scripts/vercel-automation-bypass.test.mjs`: unit coverage for absent and present secret behavior.
- Create `scripts/agent-browser-bypass-config.mjs`: create and remove the secure temporary `agent-browser` config.
- Create `scripts/agent-browser-bypass-config.test.mjs`: filesystem-level permission, content, and cleanup tests.
- Modify `playwright.config.ts`: apply bypass headers and disable traces only when the secret exists.
- Modify `scripts/smoke-core-quality.mjs`: install the temporary config path into the child environment, remove the raw secret from the child environment, and clean up reliably.
- Modify `scripts/core-funnel-quality-harness.test.mjs`: lock the no-CLI-secret and cleanup integration contract.
- Modify `scripts/github-workflow-guards.test.mjs`: lock all four workflow env/validation blocks and protected-preview docs.
- Modify `.github/workflows/core-funnel-quality-staging.yml`: require the repository bypass secret for the demo preview.
- Modify `.github/workflows/email-verification-e2e-staging.yml`: require the repository bypass secret for the real preview.
- Modify `.github/workflows/account-delete-e2e-staging.yml`: require the repository bypass secret for the real preview.
- Modify `.github/workflows/lww-e2e-staging.yml`: require the repository bypass secret for the real preview.
- Modify `package.json`: include both new unit files in `npm run test:ops`.
- Modify `docs/ops/staging-proof-runbook.md`: document protected-preview operation and secret-name handling.
- Modify `guidelines/SOFT_LAUNCH_CHECKLIST.md`: replace the obsolete unprotected-target requirement.
- Modify `guidelines/CURRENT_PROJECT_STATUS.md`: record that Deployment Protection remains enabled and automation uses the bypass secret.
- Modify `docs/specs/vercel-automation-bypass-staging-proofs.md`: record local and deployed evidence only after the corresponding commands pass.

---

### Task 1: Pure Vercel Header Helper

**Files:**

- Create: `scripts/vercel-automation-bypass.mjs`
- Create: `scripts/vercel-automation-bypass.test.mjs`

**Interfaces:**

- Consumes: `env.VERCEL_AUTOMATION_BYPASS_SECRET`
- Produces: `getVercelAutomationBypassHeaders(env = process.env): Record<string, string> | undefined`

- [ ] **Step 1: Write the failing unit test**

Create `scripts/vercel-automation-bypass.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import { getVercelAutomationBypassHeaders } from "./vercel-automation-bypass.mjs";

describe("getVercelAutomationBypassHeaders", () => {
  it("returns undefined when the bypass secret is absent", () => {
    expect(getVercelAutomationBypassHeaders({})).toBeUndefined();
    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "" })).toBeUndefined();
  });

  it("returns exactly the Vercel bypass and cookie headers", () => {
    const secret = "test-bypass-secret";

    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: secret })).toEqual({
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("preserves the secret value without trimming or rewriting it", () => {
    const secret = " test-secret-with-spaces ";

    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: secret })).toEqual({
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the Red state**

Run:

```powershell
npx vitest run scripts/vercel-automation-bypass.test.mjs
```

Expected: FAIL because `scripts/vercel-automation-bypass.mjs` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Create `scripts/vercel-automation-bypass.mjs`:

```js
/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {Record<string, string> | undefined}
 */
export function getVercelAutomationBypassHeaders(env = process.env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return undefined;

  return {
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  };
}
```

- [ ] **Step 4: Run the focused test and verify the Green state**

Run:

```powershell
npx vitest run scripts/vercel-automation-bypass.test.mjs
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit the helper**

```powershell
git add -- scripts/vercel-automation-bypass.mjs scripts/vercel-automation-bypass.test.mjs
git commit -m "test: define Vercel bypass header contract"
```

---

### Task 2: Playwright and Workflow Bypass Wiring

**Files:**

- Modify: `playwright.config.ts:1-15`
- Modify: `.github/workflows/core-funnel-quality-staging.yml:18-52`
- Modify: `.github/workflows/email-verification-e2e-staging.yml:21-61`
- Modify: `.github/workflows/account-delete-e2e-staging.yml:25-69`
- Modify: `.github/workflows/lww-e2e-staging.yml:21-60`
- Modify: `scripts/github-workflow-guards.test.mjs:8-132`

**Interfaces:**

- Consumes: `getVercelAutomationBypassHeaders(process.env)` and GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET`
- Produces: Playwright `use.extraHTTPHeaders`; four workflows that fail clearly when the secret is missing

- [ ] **Step 1: Add failing workflow/config guards**

Add this test to `scripts/github-workflow-guards.test.mjs`:

```js
it("wires the Vercel automation bypass into all protected-preview proofs", () => {
  const workflowNames = [
    "core-funnel-quality-staging.yml",
    "email-verification-e2e-staging.yml",
    "account-delete-e2e-staging.yml",
    "lww-e2e-staging.yml",
  ];
  const playwrightConfig = readFileSync(path.resolve("playwright.config.ts"), "utf8");

  for (const workflowName of workflowNames) {
    const workflow = readWorkflow(workflowName);
    expect(workflow).toContain("VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}");
    expect(workflow).toContain('if [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET}" ]; then');
    expect(workflow).toContain("Set repository secret VERCEL_AUTOMATION_BYPASS_SECRET before running protected-preview proof.");
  }

  expect(playwrightConfig).toContain(
    'import { getVercelAutomationBypassHeaders } from "./scripts/vercel-automation-bypass.mjs";',
  );
  expect(playwrightConfig).toContain("const vercelAutomationBypassHeaders = getVercelAutomationBypassHeaders(process.env);");
  expect(playwrightConfig).toContain("extraHTTPHeaders: vercelAutomationBypassHeaders");
  expect(playwrightConfig).toContain('trace: vercelAutomationBypassHeaders ? "off" : "on-first-retry"');
});
```

- [ ] **Step 2: Run the guard and verify the Red state**

Run:

```powershell
npx vitest run scripts/github-workflow-guards.test.mjs
```

Expected: FAIL because the four workflows and Playwright config do not reference the bypass secret.

- [ ] **Step 3: Apply the helper in Playwright**

Update `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { getVercelAutomationBypassHeaders } from "./scripts/vercel-automation-bypass.mjs";

const vercelAutomationBypassHeaders = getVercelAutomationBypassHeaders(process.env);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.LWW_E2E_URL || "http://localhost:5173",
    extraHTTPHeaders: vercelAutomationBypassHeaders,
    trace: vercelAutomationBypassHeaders ? "off" : "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
});
```

- [ ] **Step 4: Inject and validate the secret in every workflow**

Add this job-level env entry to all four workflow files:

```yaml
VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
```

In `.github/workflows/core-funnel-quality-staging.yml`, add it after `CORE_QUALITY_SESSION`.

In `.github/workflows/email-verification-e2e-staging.yml`, add it after `EMAIL_VERIFICATION_E2E_PASSWORD`.

In `.github/workflows/account-delete-e2e-staging.yml`, add it after `ACCOUNT_DELETE_E2E_PASSWORD`.

In `.github/workflows/lww-e2e-staging.yml`, add it after `LWW_E2E_PASSWORD`.

Add this exact validation at the start of each workflow's existing validation shell block:

```bash
if [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET}" ]; then
  echo "::error::Set repository secret VERCEL_AUTOMATION_BYPASS_SECRET before running protected-preview proof."
  exit 1
fi
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npx vitest run scripts/vercel-automation-bypass.test.mjs scripts/github-workflow-guards.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Playwright and workflow wiring**

```powershell
git add -- playwright.config.ts scripts/github-workflow-guards.test.mjs .github/workflows/core-funnel-quality-staging.yml .github/workflows/email-verification-e2e-staging.yml .github/workflows/account-delete-e2e-staging.yml .github/workflows/lww-e2e-staging.yml
git commit -m "ci: authorize protected preview proofs"
```

---

### Task 3: Secure Temporary Config for `agent-browser`

**Files:**

- Create: `scripts/agent-browser-bypass-config.mjs`
- Create: `scripts/agent-browser-bypass-config.test.mjs`
- Modify: `scripts/smoke-core-quality.mjs:23-150`
- Modify: `scripts/smoke-core-quality.mjs:792-841`
- Modify: `scripts/core-funnel-quality-harness.test.mjs:1-45`
- Modify: `package.json`

**Interfaces:**

- Consumes: `getVercelAutomationBypassHeaders(env)`
- Produces:
  - `createAgentBrowserBypassConfig({ env, tempRoot }): Promise<{ directoryPath: string, configPath: string } | undefined>`
  - `removeAgentBrowserBypassConfig(config): Promise<void>`
  - child `AGENT_BROWSER_CONFIG` path without raw secret inheritance

- [ ] **Step 1: Write failing filesystem tests**

Create `scripts/agent-browser-bypass-config.test.mjs`:

```js
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentBrowserBypassConfig, removeAgentBrowserBypassConfig } from "./agent-browser-bypass-config.mjs";

let testRoot;

beforeEach(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), "agent-browser-bypass-test-"));
});

afterEach(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

describe("agent-browser bypass config", () => {
  it("does not create a config when the secret is absent", async () => {
    await expect(createAgentBrowserBypassConfig({ env: {}, tempRoot: testRoot })).resolves.toBeUndefined();
  });

  it("writes only the approved headers and removes the temporary directory", async () => {
    const config = await createAgentBrowserBypassConfig({
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-bypass-secret" },
      tempRoot: testRoot,
    });

    expect(config).toBeDefined();
    const rawConfig = await readFile(config.configPath, "utf8");
    expect(JSON.parse(rawConfig)).toEqual({
      headers: {
        "x-vercel-protection-bypass": "test-bypass-secret",
        "x-vercel-set-bypass-cookie": "true",
      },
    });

    if (process.platform !== "win32") {
      expect((await stat(config.directoryPath)).mode & 0o777).toBe(0o700);
      expect((await stat(config.configPath)).mode & 0o777).toBe(0o600);
    }

    await removeAgentBrowserBypassConfig(config);
    await expect(access(config.directoryPath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
```

- [ ] **Step 2: Add failing core-harness integration guards**

Add this test to `scripts/core-funnel-quality-harness.test.mjs`:

```js
it("uses a temporary agent-browser config without exposing the secret on the command line", () => {
  const script = readFileSync(path.resolve("scripts", "smoke-core-quality.mjs"), "utf8");

  expect(script).toContain("createAgentBrowserBypassConfig");
  expect(script).toContain("removeAgentBrowserBypassConfig");
  expect(script).toContain("delete childEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET");
  expect(script).toContain("childEnvironment.AGENT_BROWSER_CONFIG = agentBrowserBypassConfig.configPath");
  expect(script).not.toContain('["--headers"');
  expect(script).not.toContain('"--headers", process.env.VERCEL_AUTOMATION_BYPASS_SECRET');
  expect(script).toContain("Failed to remove temporary agent-browser bypass configuration.");
});
```

- [ ] **Step 3: Run both tests and verify the Red state**

Run:

```powershell
npx vitest run scripts/agent-browser-bypass-config.test.mjs scripts/core-funnel-quality-harness.test.mjs
```

Expected: FAIL because the config module and harness integration do not exist.

- [ ] **Step 4: Implement secure config creation and removal**

Create `scripts/agent-browser-bypass-config.mjs`:

```js
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getVercelAutomationBypassHeaders } from "./vercel-automation-bypass.mjs";

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
 *   tempRoot?: string,
 * }} [options]
 */
export async function createAgentBrowserBypassConfig({ env = process.env, tempRoot = os.tmpdir() } = {}) {
  const headers = getVercelAutomationBypassHeaders(env);
  if (!headers) return undefined;

  const directoryPath = await mkdtemp(path.join(tempRoot, "vision-board-core-quality-"));
  const configPath = path.join(directoryPath, "agent-browser.json");

  try {
    await writeFile(configPath, `${JSON.stringify({ headers })}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    if (process.platform !== "win32") {
      await chmod(directoryPath, 0o700);
      await chmod(configPath, 0o600);
    }

    return { directoryPath, configPath };
  } catch (error) {
    await rm(directoryPath, { recursive: true, force: true });
    throw error;
  }
}

/**
 * @param {{ directoryPath: string } | undefined} config
 */
export async function removeAgentBrowserBypassConfig(config) {
  if (!config) return;
  await rm(config.directoryPath, { recursive: true, force: true });
}
```

- [ ] **Step 5: Integrate the temporary config into the smoke harness**

Add the import and module state near the top of `scripts/smoke-core-quality.mjs`:

```js
import { spawn } from "node:child_process";
import {
  createAgentBrowserBypassConfig,
  removeAgentBrowserBypassConfig,
} from "./agent-browser-bypass-config.mjs";

let agentBrowserBypassConfig;
```

Add this environment builder before `runAgentBrowser`:

```js
function buildAgentBrowserEnvironment() {
  const childEnvironment = {
    ...process.env,
    AGENT_BROWSER_DEFAULT_TIMEOUT: process.env.AGENT_BROWSER_DEFAULT_TIMEOUT ?? AGENT_BROWSER_DEFAULT_TIMEOUT_MS,
  };
  delete childEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (agentBrowserBypassConfig) {
    childEnvironment.AGENT_BROWSER_CONFIG = agentBrowserBypassConfig.configPath;
  }

  return childEnvironment;
}
```

Replace the current inline child `env` object in `runAgentBrowser` with:

```js
env: buildAgentBrowserEnvironment(),
```

At the start of `main`, create the config before the first browser process and track proof failure:

```js
async function main() {
  assertTargetSafeForEnvironment();
  agentBrowserBypassConfig = await createAgentBrowserBypassConfig();
  let proofError;
  log(`Target: ${BASE_URL}`);
  log(`Browser session: ${SESSION}`);

  try {
```

Add this catch immediately before the existing `finally`:

```js
  } catch (error) {
    proofError = error;
    throw error;
  } finally {
```

After the existing browser close in `finally`, add cleanup that preserves an earlier proof error:

```js
    try {
      await removeAgentBrowserBypassConfig(agentBrowserBypassConfig);
    } catch {
      if (proofError) {
        console.error("[core-quality] Failed to remove temporary agent-browser bypass configuration.");
      } else {
        throw new Error("Failed to remove temporary agent-browser bypass configuration.");
      }
    } finally {
      agentBrowserBypassConfig = undefined;
    }
```

- [ ] **Step 6: Add the new tests to the ops aggregate**

In `package.json`, include these paths in the existing `test:ops` command:

```text
scripts/vercel-automation-bypass.test.mjs
scripts/agent-browser-bypass-config.test.mjs
```

Keep every existing `test:ops` file in the command.

- [ ] **Step 7: Run focused and aggregate tests**

Run:

```powershell
npx vitest run scripts/vercel-automation-bypass.test.mjs scripts/agent-browser-bypass-config.test.mjs scripts/core-funnel-quality-harness.test.mjs scripts/github-workflow-guards.test.mjs
npm run test:ops
```

Expected: both commands PASS; no temp directory remains from the filesystem test.

- [ ] **Step 8: Commit the agent-browser integration**

```powershell
git add -- scripts/agent-browser-bypass-config.mjs scripts/agent-browser-bypass-config.test.mjs scripts/smoke-core-quality.mjs scripts/core-funnel-quality-harness.test.mjs package.json
git commit -m "test: secure core proof bypass config"
```

---

### Task 4: Protected-Preview Runbook and Status Contract

**Files:**

- Modify: `scripts/github-workflow-guards.test.mjs:101-132`
- Modify: `docs/ops/staging-proof-runbook.md:17-44`
- Modify: `docs/ops/staging-proof-runbook.md:111-183`
- Modify: `docs/ops/staging-proof-runbook.md:295-302`
- Modify: `guidelines/SOFT_LAUNCH_CHECKLIST.md:5-12`
- Modify: `guidelines/SOFT_LAUNCH_CHECKLIST.md:72-109`
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md:166-179`
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md:204-208`

**Interfaces:**

- Consumes: the four workflow env/validation contracts from Task 2
- Produces: operator instructions that keep Deployment Protection enabled and require only the GitHub secret name

- [ ] **Step 1: Change doc guard expectations first**

In the deployed core-funnel guard in `scripts/github-workflow-guards.test.mjs`, replace the obsolete unprotected-target assertions with:

```js
expect(runbook).toContain("Required secret: `VERCEL_AUTOMATION_BYPASS_SECRET`");
expect(runbook).toContain(
  "Target rule: use the protected demo preview with `VITE_APP_MODE=demo`; keep Vercel Deployment Protection and `Require Log In` enabled.",
);
expect(checklist).toContain("VERCEL_AUTOMATION_BYPASS_SECRET");
expect(checklist).toContain("keep `Require Log In` enabled");
expect(currentStatus).toContain("Automation Bypass secret");
expect(currentStatus).toContain("Deployment Protection remains enabled");
```

Remove the expectations for:

```js
"no Vercel Deployment Protection"
"accessible demo/staging target"
```

- [ ] **Step 2: Run the doc guard and verify the Red state**

Run:

```powershell
npx vitest run scripts/github-workflow-guards.test.mjs
```

Expected: FAIL because the docs still require an unprotected target.

- [ ] **Step 3: Update the runbook**

Add this row to the secret table in `docs/ops/staging-proof-runbook.md`:

```markdown
| All four protected-preview proofs | `VERCEL_AUTOMATION_BYPASS_SECRET` | Yes | Copy the existing Vercel Automation Bypass secret into GitHub Actions; never expose its value in commands, docs, screenshots, or logs | Secret name exists in GitHub and Vercel Deployment Protection remains enabled |
```

Replace the core-funnel target rule with:

```markdown
- Required secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
- Target rule: use the protected demo preview with `VITE_APP_MODE=demo`; keep Vercel Deployment Protection and `Require Log In` enabled.
- Security rule: GitHub Actions sends the Vercel bypass headers from the repository secret. Do not use query-string bypass links or `--headers` command arguments.
```

Add the required bypass secret bullet under email verification, account deletion, and LWW workflow sections:

```markdown
- Required protection secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
```

Replace the deployed core-funnel warning at the local command section with:

```markdown
Do not point this workflow at the production main domain. The protected demo preview is supported through `VERCEL_AUTOMATION_BYPASS_SECRET`; real-mode production proof remains in `production-smoke-e2e.yml`.
```

- [ ] **Step 4: Update checklist and current status**

Add this checklist item before the four workflow dispatch items:

```markdown
- [ ] Confirm GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` exists by name. Keep `Require Log In` enabled; do not publish a protection-bypass URL.
```

Change the deployed core-funnel checklist target to:

```markdown
- [ ] Run GitHub Actions workflow `.github/workflows/core-funnel-quality-staging.yml` against the protected demo preview (`VITE_APP_MODE=demo`) with `VERCEL_AUTOMATION_BYPASS_SECRET`. Keep `Require Log In` enabled and do not point this workflow at the production real-mode domain.
```

In `guidelines/CURRENT_PROJECT_STATUS.md`, replace the claim that core-funnel needs no protection with:

```markdown
- Deployed core-funnel proof uses the protected demo preview with GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET`; Vercel Deployment Protection remains enabled. Playwright proofs use in-memory headers with traces disabled, while `agent-browser` uses an owner-only temporary config removed after the run.
```

Update the remaining blocker text to say the four workflows require successful protected-preview runs and recorded evidence, not a public preview.

- [ ] **Step 5: Run docs/workflow regression tests**

Run:

```powershell
npx vitest run scripts/github-workflow-guards.test.mjs
npm run test:ops
```

Expected: PASS.

- [ ] **Step 6: Commit the docs contract**

```powershell
git add -- scripts/github-workflow-guards.test.mjs docs/ops/staging-proof-runbook.md guidelines/SOFT_LAUNCH_CHECKLIST.md guidelines/CURRENT_PROJECT_STATUS.md
git commit -m "docs: document protected preview proofs"
```

---

### Task 5: Full Local Verification

**Files:**

- Verify only; do not modify generated reports or snapshots.

**Interfaces:**

- Consumes: Tasks 1-4
- Produces: local evidence that the focused implementation is safe to push

- [ ] **Step 1: Run focused security and workflow tests**

```powershell
npx vitest run scripts/vercel-automation-bypass.test.mjs scripts/agent-browser-bypass-config.test.mjs scripts/core-funnel-quality-harness.test.mjs scripts/github-workflow-guards.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run required frontend gates**

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run test:ops
npm run build
```

Expected: every command exits 0.

- [ ] **Step 3: Run repository hygiene checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors. `src/test/ux-ui-upgrade/_scan-report.txt` may remain modified as the user's pre-existing change and must not be staged.

- [ ] **Step 4: Confirm commit scope**

```powershell
git log --oneline origin/codex/12-week-release-gates..HEAD
git diff --name-only origin/codex/12-week-release-gates...HEAD
```

Expected: only the approved spec, plan, helper, tests, workflow, config, runbook, checklist, and status files appear.

---

### Task 6: Transfer Secret, Push, and Refresh Both Previews

**Files:**

- No repository file changes.

**Interfaces:**

- Consumes: existing Vercel Automation Bypass secret and locally verified commits
- Produces: GitHub repository secret by name; updated real and demo branch previews at the verified commit

- [ ] **Step 1: Copy the existing Vercel secret without revealing it**

In the Vercel project dashboard, use the Automation Bypass entry's **Copy secret** control. Do not use **Reveal**, do not paste it into chat, and do not capture it in a screenshot.

- [ ] **Step 2: Send clipboard content directly to GitHub Secrets**

```powershell
Get-Clipboard -Raw | gh secret set VERCEL_AUTOMATION_BYPASS_SECRET
```

Expected: GitHub CLI confirms the repository secret update without printing the value.

- [ ] **Step 3: Verify only the secret name**

```powershell
gh secret list --json name,updatedAt --jq '.[] | select(.name == "VERCEL_AUTOMATION_BYPASS_SECRET")'
```

Expected: one metadata row named `VERCEL_AUTOMATION_BYPASS_SECRET`; no value is returned.

- [ ] **Step 4: Push the real-preview branch**

```powershell
git push origin codex/12-week-release-gates
```

Expected: `origin/codex/12-week-release-gates` advances to local `HEAD`.

- [ ] **Step 5: Fast-forward the demo-preview branch to the same commit**

```powershell
git push origin codex/12-week-release-gates:codex/12-week-release-gates-demo
```

Expected: `origin/codex/12-week-release-gates-demo` advances by fast-forward to the same commit; do not force-push.

- [ ] **Step 6: Wait for branch checks and verify protected targets**

```powershell
gh pr checks 129 --watch
```

Expected: all PR checks pass.

Use these branch URLs:

```text
Demo preview: https://vision-board-web-platform-git-codex-e17daa-anhnhat432s-projects.vercel.app
Real preview: https://vision-board-web-platform-git-codex-3263d1-anhnhat432s-projects.vercel.app
```

Expected: anonymous navigation still receives Vercel protection; an HTTP request with the two bypass headers reaches the app. `/` renders the demo landing page and `/login` renders the real-mode login page.

---

### Task 7: Execute Four Preview Proofs

**Files:**

- No repository file changes until all four runs complete.

**Interfaces:**

- Consumes: protected preview URLs, pushed branch, GitHub repository secrets
- Produces: four successful workflow run URLs and a passing aggregate readiness result

- [ ] **Step 1: Dispatch all four workflows against the correct modes**

```powershell
$proofRef = "codex/12-week-release-gates"
$demoPreviewUrl = "https://vision-board-web-platform-git-codex-e17daa-anhnhat432s-projects.vercel.app"
$realPreviewUrl = "https://vision-board-web-platform-git-codex-3263d1-anhnhat432s-projects.vercel.app"

gh workflow run core-funnel-quality-staging.yml --ref $proofRef -f target_url=$demoPreviewUrl
gh workflow run email-verification-e2e-staging.yml --ref $proofRef -f target_url=$realPreviewUrl -f allow_create=CREATE_TEST_ACCOUNT
gh workflow run account-delete-e2e-staging.yml --ref $proofRef -f target_url=$realPreviewUrl -f allow_delete=DELETE_TEST_ACCOUNT -f auth_mode=signin
gh workflow run lww-e2e-staging.yml --ref $proofRef -f target_url=$realPreviewUrl -f allow_overwrite=OVERWRITE_TEST_WORKSPACE
```

Expected: all dispatch commands succeed.

- [ ] **Step 2: Capture the newest run metadata**

```powershell
$implementationSha = (git rev-parse HEAD).Trim()

function Get-ProofRun {
  param(
    [Parameter(Mandatory = $true)][string]$Workflow,
    [Parameter(Mandatory = $true)][string]$ExpectedSha
  )

  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    $runs = gh run list --workflow $Workflow --branch $proofRef --event workflow_dispatch --limit 10 --json databaseId,status,conclusion,headSha,url,createdAt | ConvertFrom-Json
    $matchingRun = $runs | Where-Object { $_.headSha -eq $ExpectedSha } | Select-Object -First 1
    if ($matchingRun) {
      return $matchingRun
    }
    Start-Sleep -Seconds 5
  }

  throw "No workflow_dispatch run for $Workflow reached GitHub metadata with SHA $ExpectedSha."
}

$coreRun = Get-ProofRun -Workflow "core-funnel-quality-staging.yml" -ExpectedSha $implementationSha
$emailRun = Get-ProofRun -Workflow "email-verification-e2e-staging.yml" -ExpectedSha $implementationSha
$deleteRun = Get-ProofRun -Workflow "account-delete-e2e-staging.yml" -ExpectedSha $implementationSha
$lwwRun = Get-ProofRun -Workflow "lww-e2e-staging.yml" -ExpectedSha $implementationSha

@($coreRun, $emailRun, $deleteRun, $lwwRun) | Format-Table databaseId,status,conclusion,headSha,url,createdAt
```

Expected: each newest run has `headSha` equal to the pushed implementation commit.

- [ ] **Step 3: Watch each captured run**

```powershell
foreach ($proofRun in @($coreRun, $emailRun, $deleteRun, $lwwRun)) {
  gh run watch $proofRun.databaseId --exit-status
  if ($LASTEXITCODE -ne 0) {
    gh run view $proofRun.databaseId --log-failed
    throw "Preview proof run $($proofRun.databaseId) failed."
  }
}
```

Expected: all four runs complete with `success`. If a run fails, the loop prints only that run's failed log and stops; fix the root cause through a new TDD commit, refresh both preview branches, and rerun all affected proofs.

- [ ] **Step 4: Run aggregate readiness**

```powershell
npm run proof:readiness
```

Expected: `Launch proof readiness: PASS`.

---

### Task 8: Record Evidence, Ready PR, Merge, and Verify Production

**Files:**

- Modify: `docs/specs/vercel-automation-bypass-staging-proofs.md`
- Modify: `guidelines/SOFT_LAUNCH_CHECKLIST.md`
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md`

**Interfaces:**

- Consumes: four successful run metadata records and passing `proof:readiness`
- Produces: auditable release evidence, ready PR #129, merged `main`, and verified Vercel production deployment

- [ ] **Step 1: Record exact proof evidence**

Use the successful `gh run list` JSON to update the four D-2 ledger rows with:

- exact target URL
- exact implementation commit SHA
- exact GitHub Actions run URL
- `pass`
- exact UTC run date

Mark the corresponding deployed-proof acceptance criteria in `docs/specs/vercel-automation-bypass-staging-proofs.md` only after the evidence exists. Do not record secret values.

- [ ] **Step 2: Verify and commit evidence-only docs**

```powershell
npx vitest run scripts/github-workflow-guards.test.mjs
git diff --check
git add -- docs/specs/vercel-automation-bypass-staging-proofs.md guidelines/SOFT_LAUNCH_CHECKLIST.md guidelines/CURRENT_PROJECT_STATUS.md
git commit -m "docs: record protected preview proof"
git push origin codex/12-week-release-gates
```

Expected: guard passes and only the three evidence files are committed.

- [ ] **Step 3: Wait for final PR checks and mark ready**

```powershell
gh pr checks 129 --watch
gh pr ready 129
gh pr view 129 --json isDraft,mergeable,mergeStateStatus,headRefOid,url
```

Expected: `isDraft=false`, `mergeable=MERGEABLE`, and checks are green.

- [ ] **Step 4: Merge with the repository's merge-commit convention**

```powershell
gh pr merge 129 --merge
```

Expected: PR #129 reports merged. Do not delete the branches until production verification finishes.

- [ ] **Step 5: Refresh and verify `main`**

```powershell
git fetch origin main
git log -1 --oneline origin/main
gh pr view 129 --json state,mergedAt,mergeCommit,url
```

Expected: `origin/main` contains the PR merge commit and PR state is `MERGED`.

- [ ] **Step 6: Watch the automatic production smoke**

```powershell
$mergeSha = (gh pr view 129 --json mergeCommit --jq '.mergeCommit.oid').Trim()
$productionRun = $null

for ($attempt = 0; $attempt -lt 12; $attempt++) {
  $runs = gh run list --workflow production-smoke-e2e.yml --event push --limit 10 --json databaseId,status,conclusion,headSha,url,createdAt | ConvertFrom-Json
  $productionRun = $runs | Where-Object { $_.headSha -eq $mergeSha } | Select-Object -First 1
  if ($productionRun) {
    break
  }
  Start-Sleep -Seconds 5
}

if (-not $productionRun) {
  throw "No production-smoke push run reached GitHub metadata for merge SHA $mergeSha."
}

gh run watch $productionRun.databaseId --exit-status
if ($LASTEXITCODE -ne 0) {
  gh run view $productionRun.databaseId --log-failed
  throw "Production smoke run $($productionRun.databaseId) failed."
}
```

Expected: the run targets the merged `main` SHA, waits for the matching Vercel production deployment, and completes with `success`.

- [ ] **Step 7: Verify production routes without bypass**

Check:

```text
https://dearourfuture.io.vn/
https://dearourfuture.io.vn/login
https://vision-board-web-platform.vercel.app/
```

Expected: production remains `VITE_APP_MODE=real`, public routes load, protected app routes require Firebase authentication, and no demo-only copy or mock billing route is exposed.

- [ ] **Step 8: Report release result and remaining billing decision**

Report the merge commit, production URL, production smoke run URL, four preview proof URLs, and exact gate outcomes. Keep PayOS versus Casso as a separate unresolved provider decision; do not change billing provider configuration in this implementation.
