import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-staging-proof-run-readiness.mjs");

const successfulRun = {
  databaseId: 31000000001,
  status: "completed",
  conclusion: "success",
  event: "workflow_dispatch",
  headSha: "abc123",
  createdAt: "2026-07-09T05:00:00Z",
  url: "https://github.com/example/repo/actions/runs/31000000001",
};

const successfulStagingRuns = {
  "core-funnel-quality-staging.yml": [successfulRun],
  "email-verification-e2e-staging.yml": [{ ...successfulRun, databaseId: 31000000002 }],
  "account-delete-e2e-staging.yml": [{ ...successfulRun, databaseId: 31000000003 }],
  "lww-e2e-staging.yml": [{ ...successfulRun, databaseId: 31000000004 }],
};

function runStagingReadiness(runsJson) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_STAGING_PROOF_RUNS_JSON: runsJson,
    },
  });
}

describe("check-staging-proof-run-readiness", () => {
  it("passes when every required staging proof latest run completed successfully", () => {
    const result = runStagingReadiness(JSON.stringify(successfulStagingRuns));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GitHub Actions staging proof latest runs");
    expect(result.stdout).toContain("PASS Core funnel deployed proof: latest run 31000000001 concluded success");
    expect(result.stdout).toContain("PASS Email verification staging: latest run 31000000002 concluded success");
    expect(result.stdout).toContain("PASS Account deletion staging: latest run 31000000003 concluded success");
    expect(result.stdout).toContain("PASS LWW sync staging: latest run 31000000004 concluded success");
  });

  it("blocks when staging proof workflows have no workflow_dispatch run evidence", () => {
    const result = runStagingReadiness(
      JSON.stringify({
        "core-funnel-quality-staging.yml": [],
        "email-verification-e2e-staging.yml": [],
        "account-delete-e2e-staging.yml": [],
        "lww-e2e-staging.yml": [],
      }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Core funnel deployed proof: no workflow_dispatch run found");
    expect(result.stdout).toContain("FAIL Email verification staging: no workflow_dispatch run found");
    expect(result.stdout).toContain("FAIL Account deletion staging: no workflow_dispatch run found");
    expect(result.stdout).toContain("FAIL LWW sync staging: no workflow_dispatch run found");
  });

  it("blocks when the latest staging proof run failed or is still running", () => {
    const result = runStagingReadiness(
      JSON.stringify({
        "core-funnel-quality-staging.yml": [
          { ...successfulRun, databaseId: 31000001001, conclusion: "failure" },
        ],
        "email-verification-e2e-staging.yml": [{ ...successfulRun, databaseId: 31000001002 }],
        "account-delete-e2e-staging.yml": [
          { ...successfulRun, databaseId: 31000001003, status: "in_progress", conclusion: "" },
        ],
        "lww-e2e-staging.yml": [{ ...successfulRun, databaseId: 31000001004 }],
      }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Core funnel deployed proof: latest run 31000001001 concluded failure");
    expect(result.stdout).toContain("FAIL Account deletion staging: latest run 31000001003 is status=in_progress");
  });

  it("returns tool error when staging run metadata JSON is invalid", () => {
    const result = runStagingReadiness("not-json");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Could not parse staging proof run metadata JSON");
  });
});
