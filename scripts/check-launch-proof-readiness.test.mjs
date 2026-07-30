import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-launch-proof-readiness.mjs");

const requiredSecretNames = [
  "PROD_SMOKE_EMAIL",
  "PROD_SMOKE_PASSWORD",
  "ACCOUNT_DELETE_E2E_EMAIL",
  "ACCOUNT_DELETE_E2E_PASSWORD",
  "LWW_E2E_EMAIL",
  "LWW_E2E_PASSWORD",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
];

const activeWorkflows = [
  { path: ".github/workflows/core-funnel-quality-staging.yml", name: "Core funnel quality staging", state: "active" },
  { path: ".github/workflows/email-verification-e2e-staging.yml", name: "Email verification staging", state: "active" },
  { path: ".github/workflows/account-delete-e2e-staging.yml", name: "Account deletion staging", state: "active" },
  { path: ".github/workflows/lww-e2e-staging.yml", name: "LWW sync staging", state: "active" },
  { path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" },
];

const successfulProductionSmokeRun = JSON.stringify([
  {
    databaseId: 30000000001,
    status: "completed",
    conclusion: "success",
    event: "workflow_dispatch",
    headSha: "abc123",
    createdAt: "2026-06-27T10:00:00Z",
    url: "https://github.com/example/repo/actions/runs/30000000001",
  },
]);

const successfulStagingRuns = JSON.stringify({
  "core-funnel-quality-staging.yml": [
    {
      databaseId: 31000000001,
      status: "completed",
      conclusion: "success",
      event: "workflow_dispatch",
      headSha: "abc123",
      createdAt: "2026-07-09T05:00:00Z",
      url: "https://github.com/example/repo/actions/runs/31000000001",
    },
  ],
  "email-verification-e2e-staging.yml": [
    {
      databaseId: 31000000002,
      status: "completed",
      conclusion: "success",
      event: "workflow_dispatch",
      headSha: "abc123",
      createdAt: "2026-07-09T05:00:00Z",
      url: "https://github.com/example/repo/actions/runs/31000000002",
    },
  ],
  "account-delete-e2e-staging.yml": [
    {
      databaseId: 31000000003,
      status: "completed",
      conclusion: "success",
      event: "workflow_dispatch",
      headSha: "abc123",
      createdAt: "2026-07-09T05:00:00Z",
      url: "https://github.com/example/repo/actions/runs/31000000003",
    },
  ],
  "lww-e2e-staging.yml": [
    {
      databaseId: 31000000004,
      status: "completed",
      conclusion: "success",
      event: "workflow_dispatch",
      headSha: "abc123",
      createdAt: "2026-07-09T05:00:00Z",
      url: "https://github.com/example/repo/actions/runs/31000000004",
    },
  ],
});

function runReadinessCheck({ secretJson, workflowJson, smokeRunJson, smokeLocalStateJson, stagingRunsJson = successfulStagingRuns }) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_SECRET_READINESS_JSON: secretJson,
      GITHUB_WORKFLOW_READINESS_JSON: workflowJson,
      GITHUB_PRODUCTION_SMOKE_RUN_JSON: smokeRunJson,
      GITHUB_PRODUCTION_SMOKE_LOCAL_STATE_JSON: smokeLocalStateJson,
      GITHUB_STAGING_PROOF_RUNS_JSON: stagingRunsJson,
    },
  });
}

describe("check-launch-proof-readiness", () => {
  it("passes when required secrets and default-branch workflows are ready", () => {
    const result = runReadinessCheck({
      secretJson: JSON.stringify(requiredSecretNames.map((name) => ({ name, updatedAt: "2026-06-27T00:00:00Z" }))),
      workflowJson: JSON.stringify(activeWorkflows),
      smokeRunJson: successfulProductionSmokeRun,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GitHub metadata and local git state only. Secret values are not read, and no workflow is dispatched.");
    expect(result.stdout).toContain("RESULT GitHub Actions secret readiness: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions workflow availability: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions production smoke latest run: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions staging proof latest runs: PASS");
    expect(result.stdout).toContain("Launch proof readiness: PASS");
  });

  it("runs both child checks and reports every blocker when proof is not ready", () => {
    const result = runReadinessCheck({
      secretJson: JSON.stringify([
        { name: "PROD_SMOKE_EMAIL", updatedAt: "2026-06-27T00:00:00Z" },
        { name: "PROD_SMOKE_PASSWORD", updatedAt: "2026-06-27T00:00:00Z" },
      ]),
      workflowJson: JSON.stringify([{ path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" }]),
      smokeRunJson: JSON.stringify([
        {
          databaseId: 28218523067,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
          createdAt: "2026-06-26T05:09:31Z",
          url: "https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067",
        },
      ]),
      smokeLocalStateJson: JSON.stringify({
        headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
        cachedFiles: ["scripts/smoke-production-e2e.mjs"],
      }),
      stagingRunsJson: JSON.stringify({
        "core-funnel-quality-staging.yml": [],
        "email-verification-e2e-staging.yml": [],
        "account-delete-e2e-staging.yml": [],
        "lww-e2e-staging.yml": [],
      }),
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Account deletion staging: missing ACCOUNT_DELETE_E2E_EMAIL, ACCOUNT_DELETE_E2E_PASSWORD");
    expect(result.stdout).toContain("FAIL LWW sync staging: missing LWW_E2E_EMAIL, LWW_E2E_PASSWORD");
    expect(result.stdout).toContain("FAIL Core funnel quality staging: missing on default branch");
    expect(result.stdout).toContain("FAIL Email verification staging: missing on default branch");
    expect(result.stdout).toContain("RESULT GitHub Actions secret readiness: BLOCKED");
    expect(result.stdout).toContain("RESULT GitHub Actions workflow availability: BLOCKED");
    expect(result.stdout).toContain("RESULT GitHub Actions production smoke latest run: BLOCKED");
    expect(result.stdout).toContain("RESULT GitHub Actions staging proof latest runs: BLOCKED");
    expect(result.stdout).toContain("FAIL Production smoke latest run: latest run 28218523067 concluded failure");
    expect(result.stdout).toContain("NOTE Production smoke local mitigation is staged but unpublished");
    expect(result.stdout).toContain("FAIL Core funnel deployed proof: no workflow_dispatch run found");
    expect(result.stdout).toContain("Launch proof readiness: BLOCKED");
    expect(result.stdout).toContain(
      "Resolve the missing required proof secrets, default-branch workflow availability blockers, latest production-smoke run blocker, or staging proof latest-run blockers before dispatching staging proof workflows.",
    );
  });

  it("keeps the blocked summary focused on the remaining blocker categories", () => {
    const result = runReadinessCheck({
      secretJson: JSON.stringify(requiredSecretNames.map((name) => ({ name, updatedAt: "2026-06-27T00:00:00Z" }))),
      workflowJson: JSON.stringify([{ path: ".github/workflows/production-smoke-e2e.yml", name: "Production smoke", state: "active" }]),
      smokeRunJson: JSON.stringify([
        {
          databaseId: 28218523067,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
          createdAt: "2026-06-26T05:09:31Z",
          url: "https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067",
        },
      ]),
      smokeLocalStateJson: JSON.stringify({
        headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
        cachedFiles: ["scripts/smoke-production-e2e.mjs"],
      }),
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("RESULT GitHub Actions secret readiness: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions workflow availability: BLOCKED");
    expect(result.stdout).toContain("RESULT GitHub Actions production smoke latest run: BLOCKED");
    expect(result.stdout).toContain("RESULT GitHub Actions staging proof latest runs: PASS");
    expect(result.stdout).toContain(
      "Resolve the default-branch workflow availability blockers or latest production-smoke run blocker before dispatching staging proof workflows.",
    );
    expect(result.stdout).not.toContain("Resolve the missing required proof secrets");
  });

  it("uses a distinct tool-error result when metadata cannot be parsed", () => {
    const result = runReadinessCheck({
      secretJson: "not-json",
      workflowJson: JSON.stringify(activeWorkflows),
      smokeRunJson: successfulProductionSmokeRun,
    });

    expect(result.status).toBe(2);
    expect(result.stdout).toContain("RESULT GitHub Actions secret readiness: ERROR");
    expect(result.stdout).toContain("RESULT GitHub Actions workflow availability: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions production smoke latest run: PASS");
    expect(result.stdout).toContain("RESULT GitHub Actions staging proof latest runs: PASS");
    expect(result.stdout).toContain("Launch proof readiness: ERROR");
  });

  it("keeps package scripts and operator docs aligned with the aggregate readiness command", () => {
    const packageJson = JSON.parse(readFileSync(path.resolve("package.json"), "utf8"));
    const runbook = readFileSync(path.resolve("docs/ops/staging-proof-runbook.md"), "utf8");
    const checklist = readFileSync(path.resolve("guidelines/SOFT_LAUNCH_CHECKLIST.md"), "utf8");
    const currentStatus = readFileSync(path.resolve("guidelines/CURRENT_PROJECT_STATUS.md"), "utf8");

    expect(packageJson.scripts["proof:readiness"]).toBe("node scripts/check-launch-proof-readiness.mjs");
    expect(runbook).toContain("npm run proof:readiness");
    expect(checklist).toContain("npm run proof:readiness");
    expect(currentStatus).toContain("npm run proof:readiness");
  });
});
