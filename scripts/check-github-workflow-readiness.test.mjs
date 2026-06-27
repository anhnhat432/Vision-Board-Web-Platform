import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-github-workflow-readiness.mjs");

function runWorkflowCheck(workflows) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_WORKFLOW_READINESS_JSON: JSON.stringify(workflows),
    },
  });
}

describe("check-github-workflow-readiness", () => {
  it("passes when all required proof workflows are active on default branch", () => {
    const result = runWorkflowCheck([
      { path: ".github/workflows/core-funnel-quality-staging.yml", name: "Core funnel quality staging", state: "active" },
      { path: ".github/workflows/email-verification-e2e-staging.yml", name: "Email verification staging", state: "active" },
      { path: ".github/workflows/account-delete-e2e-staging.yml", name: "Account deletion staging", state: "active" },
      { path: ".github/workflows/lww-e2e-staging.yml", name: "LWW sync staging", state: "active" },
      { path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" },
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Default-branch workflow metadata was inspected. No workflow was dispatched.");
    expect(result.stdout).toContain("PASS Production smoke: active (.github/workflows/production-smoke-e2e.yml)");
    expect(result.stdout).not.toContain("FAIL");
  });

  it("fails when new proof workflows are still missing from default branch", () => {
    const result = runWorkflowCheck([
      { path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" },
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Core funnel quality staging: missing on default branch (.github/workflows/core-funnel-quality-staging.yml; present in current worktree only)");
    expect(result.stdout).toContain("FAIL Email verification staging: missing on default branch (.github/workflows/email-verification-e2e-staging.yml; present in current worktree only)");
    expect(result.stdout).toContain("FAIL Account deletion staging: missing on default branch (.github/workflows/account-delete-e2e-staging.yml; present in current worktree only)");
    expect(result.stdout).toContain("FAIL LWW sync staging: missing on default branch (.github/workflows/lww-e2e-staging.yml; present in current worktree only)");
    expect(result.stdout).toContain("Missing or unavailable proof workflows:");
  });

  it("fails when a required workflow is present but not active", () => {
    const result = runWorkflowCheck([
      { path: ".github/workflows/core-funnel-quality-staging.yml", name: "Core funnel quality staging", state: "disabled_manually" },
      { path: ".github/workflows/email-verification-e2e-staging.yml", name: "Email verification staging", state: "active" },
      { path: ".github/workflows/account-delete-e2e-staging.yml", name: "Account deletion staging", state: "active" },
      { path: ".github/workflows/lww-e2e-staging.yml", name: "LWW sync staging", state: "active" },
      { path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" },
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Core funnel quality staging: expected active workflow but found state=disabled_manually (.github/workflows/core-funnel-quality-staging.yml)");
  });

  it("keeps runbook, checklist, and current status aligned with the workflow audit command", () => {
    const runbook = readFileSync(path.resolve("docs/ops/staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines/SOFT_LAUNCH_CHECKLIST.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines/CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(runbook).toContain("npm run proof:workflows");
    expect(runbook).toContain("Workflow Availability Snapshot");
    expect(checklist).toContain("npm run proof:workflows");
    expect(currentStatus).toContain("npm run proof:workflows");
    expect(currentStatus).toContain("not yet available on the default branch");
  });
});
