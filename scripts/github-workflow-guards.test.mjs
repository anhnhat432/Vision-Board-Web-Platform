import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readWorkflow(fileName) {
  return readFileSync(path.resolve(".github", "workflows", fileName), "utf8");
}

describe("GitHub workflow safety guards", () => {
  it("keeps email verification staging smoke opt-in and disposable", () => {
    const workflow = readWorkflow("email-verification-e2e-staging.yml");

    expect(workflow).toContain("Use a staging or production-like URL for email-verification proof, not localhost.");
    expect(workflow).toContain('EMAIL_VERIFICATION_E2E_ALLOW}" != "CREATE_TEST_ACCOUNT"');
    expect(workflow).toContain("Configure both EMAIL_VERIFICATION_E2E_EMAIL and EMAIL_VERIFICATION_E2E_PASSWORD");
    expect(workflow).toContain("EMAIL_VERIFICATION_E2E_EMAIL must be disposable");
    expect(workflow).toContain("npm run test:e2e:email-verification");
  });

  it("keeps account deletion staging smoke destructive opt-in and disposable", () => {
    const workflow = readWorkflow("account-delete-e2e-staging.yml");
    const harness = readFileSync(path.resolve("e2e", "account-delete.spec.ts"), "utf8");

    expect(workflow).toContain("Use a staging or production-like URL for account-delete proof, not localhost.");
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_ALLOW}" != "DELETE_TEST_ACCOUNT"');
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_AUTH_MODE}" != "signin"');
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_AUTH_MODE}" != "signup"');
    expect(workflow).toContain("ACCOUNT_DELETE_E2E_EMAIL must be a disposable address");
    expect(workflow).toContain("npm run test:e2e:account-delete");
    expect(harness).toContain("resolveAccountDeleteE2ECredentials");
  });

  it("marks the Settings guide seen before account-deletion navigation", () => {
    const harness = readFileSync(path.resolve("e2e", "account-delete.spec.ts"), "utf8");

    expect(harness).toContain("primeSettingsGuideSeenState");
    expect(harness).toContain('page.addInitScript((storageKey) =>');
    expect(harness).toContain('"visionboard_screen_guide_seen:settings"');
    expect(harness).toContain('"visionboard_new_user_guide_seen_at"');
    expect(harness).toContain('"visionboard_first_run_guidance_completed_at"');
    expect(harness).not.toContain("dismissSettingsScreenGuide");
  });

  it("keeps the account-deletion marker in the active auth-scoped snapshot across Settings reload", () => {
    const harness = readFileSync(path.resolve("e2e", "account-delete.spec.ts"), "utf8");

    expect(harness).toContain('const AUTH_OWNER_STORAGE_KEY = "visionboard_user_data:auth_owner_uid"');
    expect(harness).toContain("Authenticated local snapshot was not ready for account-delete proof.");
    expect(harness).toContain("`${userDataStorageKey}:auth:${encodeURIComponent(ownerUid)}`");
    expect(harness.match(/expect\(await localMarkerExists\(page\)\)\.toBe\(true\);/g)).toHaveLength(2);
  });

  it("accepts real-mode safe-start redirects after account deletion", () => {
    const harness = readFileSync(path.resolve("e2e", "account-delete.spec.ts"), "utf8");

    expect(harness).toContain("isSafePostDeleteUrl");
    expect(harness).toContain('url.pathname === "/onboarding"');
    expect(harness).toContain('url.pathname === "/login"');
    expect(harness).toContain('url.searchParams.get("next") === "/onboarding"');
    expect(harness).toContain('url.searchParams.get("next") === "/settings"');
    expect(harness).not.toContain("toHaveURL(/\\/$/");
  });

  it("bootstraps LWW proof data without the removed inline goal-creation UI", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");

    expect(harness).toContain("bootstrapLwwGoal");
    expect(harness).toContain("importLwwBaseline");
    expect(harness).toContain("pullProofGoal");
    expect(harness).toContain('"visionboard_user_data:auth_owner_uid"');
    expect(harness).toContain("reloadProofGoal");
    expect(harness).toContain('const PROOF_TASK_ID = "tw_task_1_lww_e2e_lead_0";');
    expect(harness).toContain("const leadIndicatorName = proofSeed.taskTitle;");
    expect(harness).toContain('getByRole("checkbox", {');
    expect(harness).toContain("`Hoàn thành việc: ${taskTitle}`");
    expect(harness).not.toContain("createGoalWithTask");
    expect(harness).not.toContain("getByText(/12 tuần|tactic|task/i)");
  });

  it("reloads the authenticated SPA after the LWW baseline import", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const bootstrapStart = harness.indexOf("async function bootstrapLwwGoal");
    const bootstrapEnd = harness.indexOf("async function openSystemTab", bootstrapStart);
    const bootstrap = harness.slice(bootstrapStart, bootstrapEnd);
    const openTabStart = harness.indexOf("async function openSystemTab");
    const openTabEnd = harness.indexOf("async function getProofTaskCheckbox", openTabStart);
    const openTab = harness.slice(openTabStart, openTabEnd);

    expect(bootstrapStart).toBeGreaterThan(-1);
    expect(openTabStart).toBeGreaterThan(-1);
    expect(bootstrap).toContain("localStorage.setItem(userDataStorageKey, serialized)");
    expect(harness).toContain("process.env.GITHUB_RUN_ID?.trim()");
    expect(bootstrap).toContain('createdAt: `${startDate}T00:00:00.000Z`');
    expect(bootstrap).toContain("await page.reload()");
    expect(openTab).toContain('getByRole("button", {');
    expect(openTab).toContain('name: "Hệ thống 12 tuần"');
    expect(openTab).toContain("exact: true");
    expect(openTab).not.toContain('locator(\'a[href="/12-week-system"]:visible\')');
    expect(openTab).not.toContain("page.goto(");
  });

  it("bootstraps LWW through authenticated import and keeps mutation diagnostics safe", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const prepareStart = harness.indexOf("async function prepareLwwScenario");
    const prepareEnd = harness.indexOf("// ── Tests", prepareStart);
    const prepareScenario = harness.slice(prepareStart, prepareEnd);
    const importStart = harness.indexOf("async function importLwwBaseline");
    const importEnd = harness.indexOf("async function reloadProofGoal", importStart);
    const importBootstrap = harness.slice(importStart, importEnd);
    const observerIndex = prepareScenario.indexOf("captureApiResponseDiagnostics(pageA)");
    const bootstrapIndex = prepareScenario.indexOf("bootstrapLwwGoal(pageA, scenarioTitle)");
    const loginPageAIndex = prepareScenario.indexOf("loginPage(pageA, EMAIL!, PASSWORD!)");
    const loginPageBIndex = prepareScenario.indexOf("loginPage(pageB, EMAIL!, PASSWORD!)");

    expect(prepareStart).toBeGreaterThan(-1);
    expect(importStart).toBeGreaterThan(-1);
    expect(observerIndex).toBeGreaterThan(-1);
    expect(bootstrapIndex).toBeGreaterThan(-1);
    expect(loginPageAIndex).toBeGreaterThan(-1);
    expect(loginPageBIndex).toBeGreaterThan(-1);
    expect(loginPageAIndex).toBeLessThan(bootstrapIndex);
    expect(bootstrapIndex).toBeLessThan(loginPageBIndex);
    expect(observerIndex).toBeLessThan(bootstrapIndex);
    expect(harness).toContain("initialPullResponsePromise");
    expect(importBootstrap).not.toContain("triggerManualCloudSync(page)");
    expect(importBootstrap).toContain("observedApiBaseUrl.get(page)");
    expect(importBootstrap).toContain('`${backendApiBaseUrl}/sync/12-week/import`');
    expect(importBootstrap).toContain('response.path === "/api/sync/12-week/import"');
    expect(harness).toContain("createTwelveWeekImportPayload");
    expect(harness).toContain("await toggleTask(pageA, seed.taskTitle, true)");
    expect(harness).toContain("await toggleTask(pageB, seed.taskTitle, true)");
    expect(harness).not.toContain("waitForPlanSnapshotBulkSync");
    expect(harness).not.toContain("/bulk-sync$");
    expect(harness).toContain("readPendingMutationQueueDiagnostics");
    expect(harness).toContain('key === "visionboard_data_mutation_queue:anonymous"');
    expect(harness).toContain('key.startsWith("visionboard_data_mutation_queue:auth:")');
    expect(harness).toContain("errorCode: item.error?.code");
    expect(harness).toContain("captureApiResponseDiagnostics");
    expect(harness).toContain("method: response.request().method()");
    expect(harness).toContain("path: url.pathname");
    expect(harness).toContain("status: response.status()");
    expect(harness).not.toContain("payload: item.payload");
    expect(harness).not.toContain("response.body()");
    expect(harness).not.toContain("response.headers()");
  });

  it("reports only safe proof-task metadata when the LWW bootstrap task is not visible", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const diagnosticsStart = harness.indexOf("async function readProofTaskDiagnostics");
    const diagnosticsEnd = harness.indexOf("async function waitForMutationQueueIdle", diagnosticsStart);
    const diagnostics = harness.slice(diagnosticsStart, diagnosticsEnd);

    expect(diagnosticsStart).toBeGreaterThan(-1);
    expect(diagnostics).toContain("route:");
    expect(diagnostics).toContain("goalPresent:");
    expect(diagnostics).toContain("taskPresent:");
    expect(diagnostics).toContain("taskCount:");
    expect(diagnostics).toContain("currentWeek:");
    expect(diagnostics).toContain("scheduledDateMatchesToday:");
    expect(diagnostics).toContain("latestGoalPointerMatches:");
    expect(diagnostics).toContain("authScopedSnapshotMatches:");
    expect(diagnostics).toContain("proofTitleTaskCount:");
    expect(diagnostics).toContain("visibleCheckboxCount:");
    expect(diagnostics).not.toContain("rawSnapshot");
    expect(diagnostics).not.toContain("payload");
    expect(diagnostics).not.toContain("headers");
  });

  it("waits for the real manual-sync floor instead of clicking during a rate-limited no-op window", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const triggerStart = harness.indexOf("async function triggerManualCloudSync");
    const triggerEnd = harness.indexOf("async function openProofGoal", triggerStart);
    const triggerManualSync = harness.slice(triggerStart, triggerEnd);

    expect(triggerStart).toBeGreaterThan(-1);
    expect(harness).toContain("const MANUAL_SYNC_MIN_INTERVAL_MS = 5_000");
    expect(harness).toContain("rememberCloudPull(page,");
    expect(triggerManualSync.indexOf("waitForManualSyncWindow(page)")).toBeLessThan(
      triggerManualSync.indexOf("const pullResponsePromise"),
    );
  });

  it("keeps LWW Settings routing inside the active auto-sync provider", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const guidanceStart = harness.indexOf("async function primeProofGuidanceState");
    const guidanceEnd = harness.indexOf("async function bootstrapLwwGoal", guidanceStart);
    const guidance = harness.slice(guidanceStart, guidanceEnd);
    const settingsNavigationStart = harness.indexOf("async function openSettingsWithoutReload");
    const settingsNavigationEnd = harness.indexOf("async function loginPage", settingsNavigationStart);
    const settingsNavigation = harness.slice(settingsNavigationStart, settingsNavigationEnd);
    const loginStart = harness.indexOf("async function loginPage");
    const loginEnd = harness.indexOf("async function primeProofGuidanceState", loginStart);
    const login = harness.slice(loginStart, loginEnd);
    const triggerStart = harness.indexOf("async function triggerManualCloudSync");
    const triggerEnd = harness.indexOf("async function openProofGoal", triggerStart);
    const triggerManualSync = harness.slice(triggerStart, triggerEnd);
    const openProofGoalStart = harness.indexOf("async function openProofGoal");
    const openProofGoalEnd = harness.indexOf("async function pullProofGoal", openProofGoalStart);
    const openProofGoal = harness.slice(openProofGoalStart, openProofGoalEnd);

    expect(loginStart).toBeGreaterThan(-1);
    expect(guidance).toContain('sessionStorage.setItem("onboarding-deferred", "1")');
    expect(settingsNavigation).toContain('window.history.pushState({}, "", "/settings")');
    expect(settingsNavigation).toContain('new PopStateEvent("popstate")');
    expect(settingsNavigation).not.toContain("Mở menu tài khoản");
    expect(settingsNavigation).not.toContain('a[href="/settings"]');
    expect(login).toContain("await expect(page).toHaveURL(/\\/settings");
    expect(login).not.toContain('await page.goto("/settings")');
    expect(triggerManualSync).toContain("await openSettingsWithoutReload(page)");
    expect(triggerManualSync).not.toContain('await page.goto("/settings")');
    expect(openProofGoal).toContain('await openSystemTab(page, "today")');
    expect(openProofGoal).not.toContain('await page.goto("/12-week-system?tab=today")');
  });

  it("keeps LWW staging smoke overwrite opt-in and dedicated marker guards", () => {
    const workflow = readWorkflow("lww-e2e-staging.yml");
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines", "SOFT_LAUNCH_CHECKLIST.md"), "utf8");

    expect(workflow).toContain("Use a staging or production-like URL for LWW proof, not localhost.");
    expect(workflow).toContain('LWW_E2E_ALLOW}" != "OVERWRITE_TEST_WORKSPACE"');
    expect(workflow).toContain("LWW_E2E_EMAIL must be a dedicated overwrite-safe address");
    expect(harness).toContain("page.getByPlaceholder(/email/i).or(");
    expect(harness).not.toContain("expect(page.getByPlaceholder(/email/i)).or(");
    expect(runbook).toContain("allow_overwrite=OVERWRITE_TEST_WORKSPACE");
    expect(runbook).toContain("Target rule: use staging/preview or production-like URL only; the workflow rejects `localhost` and `127.0.0.1`.");
    expect(runbook).toContain("Marker rule: `LWW_E2E_EMAIL` must include `+lww`");
    expect(checklist).toContain("LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE");
  });

  it("runs LWW scenarios once, sequentially, and always preserves artifacts", () => {
    const workflow = readWorkflow("lww-e2e-staging.yml");

    expect(workflow).toContain('--retries=0');
    expect(workflow).toContain('run_scenario "local-wins" "local wins when local mutation is newer"');
    expect(workflow).toContain('run_scenario "cloud-wins" "cloud wins when cloud is newer"');
    expect(workflow).toContain('run_scenario "tombstone" "tombstone wins over pending mutation"');
    expect(workflow.match(/sleep 65/g)).toHaveLength(2);
    expect(workflow).toContain('scenario_failed=0');
    expect(workflow).toContain('scenario_failed=1');
    expect(workflow).toContain('exit "${scenario_failed}"');
    expect(workflow).toContain('PLAYWRIGHT_HTML_OUTPUT_DIR="playwright-report/${scenario_slug}"');
    expect(workflow).toContain('--output="test-results/${scenario_slug}"');
    expect(workflow).toContain("uses: actions/upload-artifact@v4");
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain("playwright-report/");
    expect(workflow).toContain("test-results/");
  });

  it("keeps production smoke fixed-credential contract aligned", () => {
    const workflow = readWorkflow("production-smoke-e2e.yml");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines", "CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(workflow).toContain("default: https://dearourfuture.io.vn");
    expect(workflow).toContain("github.event.inputs.target_url || 'https://dearourfuture.io.vn'");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("PROD_SMOKE_EMAIL");
    expect(workflow).toContain("PROD_SMOKE_PASSWORD");
    expect(workflow).toContain('PROD_SMOKE_ALLOW_GENERATED_ACCOUNT: "0"');
    expect(workflow).toContain("npm run smoke:prod:quick");
    expect(workflow).not.toContain("PROD_SMOKE_FRESH_EMAIL");
    expect(workflow).not.toContain("PROD_SMOKE_FRESH_PASSWORD");
    expect(workflow.indexOf("npm run smoke:prod:quick")).toBeLessThan(workflow.lastIndexOf("npm run smoke:prod"));
    expect(runbook).toContain("- Required secret: `PROD_SMOKE_EMAIL`");
    expect(runbook).toContain("- Required secret: `PROD_SMOKE_PASSWORD`");
    expect(runbook).toContain("- Trigger(s): push to `main`, nightly schedule, and manual `workflow_dispatch`");
    expect(runbook).toContain("Fixed-account rule: the workflow and smoke scripts read only `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`.");
    expect(runbook).toContain("gh run list --workflow production-smoke-e2e.yml --event push --limit 1");
    expect(runbook).not.toContain("PROD_SMOKE_FRESH_EMAIL");
    expect(runbook).not.toContain("PROD_SMOKE_FRESH_PASSWORD");
    expect(currentStatus).toContain("auto-runs on `main` push plus scheduled/manual triggers");
    expect(currentStatus).toContain("runs `npm run smoke:prod:quick` before `npm run smoke:prod`");
  });

  it("keeps MVP2 sync staging smoke off localhost in GitHub Actions", () => {
    const workflow = readWorkflow("mvp2-sync-staging-smoke.yml");
    const script = readFileSync(path.resolve("scripts", "smoke-mvp2-sync-staging.mjs"), "utf8");

    expect(workflow).toContain("Use a staging or production-like URL for MVP2 sync proof, not localhost.");
    expect(workflow).toContain('normalized_url="${MVP2_SMOKE_URL%/}"');
    expect(workflow).toContain('"localhost"');
    expect(workflow).toContain('"127.0.0.1"');
    expect(script).toContain('const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";');
    expect(script).toContain("function assertTargetSafeForEnvironment()");
    expect(script).toContain("Refusing to run MVP2 sync staging smoke against localhost.");
    expect(script).toContain("assertTargetSafeForEnvironment();");
  });

  it("keeps CI frontend production-core scoped away from backend dependency install", () => {
    const workflow = readWorkflow("ci.yml");

    expect(workflow).toContain("npm run test:production-core:frontend");
    expect(workflow).not.toContain("- run: npm run test:production-core\n");
    expect(workflow).toContain("npm --prefix backend ci");
    expect(workflow).toContain("npm --prefix backend test");
  });

  it("keeps deployed core-funnel proof workflow aligned with runbook and checklist", () => {
    const workflow = readWorkflow("core-funnel-quality-staging.yml");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines", "SOFT_LAUNCH_CHECKLIST.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines", "CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(workflow).toContain("target_url:");
    expect(workflow).toContain('CORE_QUALITY_URL: ${{ github.event.inputs.target_url }}');
    expect(workflow).toContain("Use an accessible VITE_APP_MODE=demo staging/preview URL for deployed core-funnel proof, not localhost.");
    expect(workflow).toContain("Core quality smoke is local-first/demo-only; use production-smoke-e2e.yml for real-mode production proof.");
    expect(workflow).toContain("npm run smoke:core-quality");
    expect(runbook).toContain("Workflow: `.github/workflows/core-funnel-quality-staging.yml`");
    expect(runbook).toContain("Required secret: `VERCEL_AUTOMATION_BYPASS_SECRET`");
    expect(runbook).toContain(
      "Target rule: use the protected demo preview with `VITE_APP_MODE=demo`; keep Vercel Deployment Protection and `Require Log In` enabled.",
    );
    expect(runbook).toContain('$env:CORE_QUALITY_URL="https://your-accessible-demo-preview.example"');
    expect(runbook).toContain("gh workflow run core-funnel-quality-staging.yml --ref $env:PROOF_REF -f target_url=$env:CORE_QUALITY_URL");
    expect(runbook).toContain("gh run list --workflow core-funnel-quality-staging.yml --event workflow_dispatch --limit 1");
    expect(checklist).toContain(".github/workflows/core-funnel-quality-staging.yml");
    expect(checklist).toContain("VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(checklist).toContain("keep `Require Log In` enabled");
    expect(currentStatus).toContain("Deployed core-funnel proof workflow now exists at `.github/workflows/core-funnel-quality-staging.yml`");
    expect(currentStatus).toContain("Automation Bypass secret");
    expect(currentStatus).toContain("Deployment Protection remains enabled");
  });

  it("keeps staging proof docs aligned with email verification fixed-secret pair rule", () => {
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines", "SOFT_LAUNCH_CHECKLIST.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines", "CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(runbook).toContain("EMAIL_VERIFICATION_E2E_EMAIL");
    expect(runbook).toContain("EMAIL_VERIFICATION_E2E_PASSWORD");
    expect(runbook).toContain("Pair rule: fixed email/password secrets must both be set, or both unset.");
    expect(checklist).toContain("generated disposable signup path is available");
    expect(checklist).toContain("must be configured as a complete pair");
    expect(currentStatus).toContain("generated disposable signup path is used");
  });

  it("wires the Vercel automation bypass into all protected-preview proofs", () => {
    const workflowNames = [
      "core-funnel-quality-staging.yml",
      "email-verification-e2e-staging.yml",
      "account-delete-e2e-staging.yml",
      "lww-e2e-staging.yml",
    ];
    const playwrightConfig = readFileSync(path.resolve("playwright.config.ts"), "utf8");
    const protectedPlaywrightSpecs = [
      "email-verification.spec.ts",
      "account-delete.spec.ts",
      "sync-lww.spec.ts",
    ];

    for (const workflowName of workflowNames) {
      const workflow = readWorkflow(workflowName);
      expect(workflow).toContain("VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}");
      expect(workflow).toContain('if [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET}" ]; then');
      expect(workflow).toContain(
        "Set repository secret VERCEL_AUTOMATION_BYPASS_SECRET before running protected-preview proof.",
      );
    }

    expect(playwrightConfig).toContain(
      'import { getVercelAutomationBypassHeaders } from "./scripts/vercel-automation-bypass.mjs";',
    );
    expect(playwrightConfig).toContain(
      "const vercelAutomationBypassHeaders = getVercelAutomationBypassHeaders(process.env);",
    );
    expect(playwrightConfig).not.toContain("extraHTTPHeaders:");
    expect(playwrightConfig).toContain('trace: vercelAutomationBypassHeaders ? "off" : "on-first-retry"');

    for (const specName of protectedPlaywrightSpecs) {
      const spec = readFileSync(path.resolve("e2e", specName), "utf8");
      expect(spec).toContain('from "./fixtures"');
    }
  });

  it("prevents Playwright bypass headers from following redirects", () => {
    const fixture = readFileSync(path.resolve("e2e", "fixtures.ts"), "utf8");

    expect(fixture).toContain("await route.fetch({");
    expect(fixture).toContain("maxRedirects: 0");
    expect(fixture).toContain("await route.fulfill({ response });");
    expect(fixture).not.toContain("route.continue({");
  });

  it("installs the scoped Vercel bypass on every LWW browser context", () => {
    const fixture = readFileSync(path.resolve("e2e", "fixtures.ts"), "utf8");
    const lwwHarness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");

    expect(fixture).toContain("newProofContext");
    expect(fixture).toContain("installVercelAutomationBypassRoute");
    expect(lwwHarness).not.toContain("browser.newContext()");
    expect(lwwHarness.match(/await newProofContext\(\)/g)).toHaveLength(6);
  });

  it("isolates legacy plan execution without mocking LWW sync endpoints", () => {
    const fixture = readFileSync(path.resolve("e2e", "fixtures.ts"), "utf8");

    expect(fixture).toContain("installLegacyPlanExecutionIsolation");
    expect(fixture).toContain("isLegacyPlanExecutionPath");
    expect(fixture).toContain('/^\\/api\\/sync\\/12-week(?:\\/|$)/');
    expect(fixture).toContain('url.pathname === "/api/plans"');
    expect(fixture).toContain("\\/api\\/weeks");
    expect(fixture).toContain("\\/api\\/tasks");
    expect(fixture).toContain("\\/api\\/metrics");
    expect(fixture).toContain('JSON.stringify({ success: true, data: [] })');
    expect(fixture).toContain('JSON.stringify({ success: true, data })');
  });

  it("keeps LWW failure diagnostics limited to safe convergence fields", () => {
    const harness = readFileSync(path.resolve("e2e", "sync-lww.spec.ts"), "utf8");

    expect(harness).toContain("createSafePullDiagnostics");
    expect(harness).toContain("createSafeConvergenceDiagnostics");
    expect(harness).toContain("scenario: test.info().title");
    expect(harness).toContain("readMutationQueueCountDiagnostics");
    expect(harness).toContain("pendingCount:");
    expect(harness).toContain("retryScheduledCount:");
    expect(harness).toContain('headerValue("retry-after")');
    expect(harness).toContain("finalStateA:");
    expect(harness).toContain("finalStateB:");
    expect(harness).not.toContain("lww-safe-diagnostics");
    expect(harness).not.toContain("pullResponse.headers()");
  });
});
