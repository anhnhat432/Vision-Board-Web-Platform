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

    expect(workflow).toContain("Use a staging or production-like URL for account-delete proof, not localhost.");
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_ALLOW}" != "DELETE_TEST_ACCOUNT"');
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_AUTH_MODE}" != "signin"');
    expect(workflow).toContain('ACCOUNT_DELETE_E2E_AUTH_MODE}" != "signup"');
    expect(workflow).toContain("ACCOUNT_DELETE_E2E_EMAIL must be a disposable address");
    expect(workflow).toContain("npm run test:e2e:account-delete");
  });

  it("keeps LWW staging smoke overwrite opt-in and dedicated marker guards", () => {
    const workflow = readWorkflow("lww-e2e-staging.yml");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines", "SOFT_LAUNCH_CHECKLIST.md"), "utf8");

    expect(workflow).toContain("Use a staging or production-like URL for LWW proof, not localhost.");
    expect(workflow).toContain('LWW_E2E_ALLOW}" != "OVERWRITE_TEST_WORKSPACE"');
    expect(workflow).toContain("LWW_E2E_EMAIL must be a dedicated overwrite-safe address");
    expect(runbook).toContain("allow_overwrite=OVERWRITE_TEST_WORKSPACE");
    expect(runbook).toContain("Target rule: use staging/preview or production-like URL only; the workflow rejects `localhost` and `127.0.0.1`.");
    expect(runbook).toContain("Marker rule: `LWW_E2E_EMAIL` must include `+lww`");
    expect(checklist).toContain("LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE");
  });

  it("keeps production smoke fixed-credential contract aligned", () => {
    const workflow = readWorkflow("production-smoke-e2e.yml");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines", "CURRENT_PROJECT_STATUS.md"), "utf8");

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

  it("keeps deployed core-funnel proof workflow aligned with runbook and checklist", () => {
    const workflow = readWorkflow("core-funnel-quality-staging.yml");
    const runbook = readFileSync(path.resolve("docs", "ops", "staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines", "SOFT_LAUNCH_CHECKLIST.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines", "CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(workflow).toContain("target_url:");
    expect(workflow).toContain('CORE_QUALITY_URL: ${{ github.event.inputs.target_url }}');
    expect(workflow).toContain("Use a staging or production-like URL for deployed core-funnel proof, not localhost.");
    expect(workflow).toContain("npm run smoke:core-quality");
    expect(runbook).toContain("Workflow: `.github/workflows/core-funnel-quality-staging.yml`");
    expect(runbook).toContain("gh workflow run core-funnel-quality-staging.yml --ref $env:PROOF_REF -f target_url=$env:STAGING_URL");
    expect(runbook).toContain("gh run list --workflow core-funnel-quality-staging.yml --event workflow_dispatch --limit 1");
    expect(checklist).toContain(".github/workflows/core-funnel-quality-staging.yml");
    expect(currentStatus).toContain("Deployed core-funnel proof workflow now exists at `.github/workflows/core-funnel-quality-staging.yml`");
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
});
