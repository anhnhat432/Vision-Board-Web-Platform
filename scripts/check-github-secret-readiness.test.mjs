import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-github-secret-readiness.mjs");

function runSecretCheck(secretNames) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_SECRET_READINESS_JSON: JSON.stringify(secretNames.map((name) => ({ name, updatedAt: "2026-06-25T00:00:00Z" }))),
    },
  });
}

describe("check-github-secret-readiness", () => {
  it("passes when required proof secrets exist and email verification uses generated signup", () => {
    const result = runSecretCheck([
      "PROD_SMOKE_EMAIL",
      "PROD_SMOKE_PASSWORD",
      "ACCOUNT_DELETE_E2E_EMAIL",
      "ACCOUNT_DELETE_E2E_PASSWORD",
      "LWW_E2E_EMAIL",
      "LWW_E2E_PASSWORD",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Only secret names were inspected. Secret values were not read.");
    expect(result.stdout).toContain("PASS Production smoke: ready");
    expect(result.stdout).toContain("PASS Email verification staging: ready");
    expect(result.stdout).not.toContain("FAIL");
  });

  it("fails when account-delete or LWW proof secrets are missing", () => {
    const result = runSecretCheck(["PROD_SMOKE_EMAIL", "PROD_SMOKE_PASSWORD"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Account deletion staging: missing ACCOUNT_DELETE_E2E_EMAIL, ACCOUNT_DELETE_E2E_PASSWORD");
    expect(result.stdout).toContain("FAIL LWW sync staging: missing LWW_E2E_EMAIL, LWW_E2E_PASSWORD");
    expect(result.stdout).toContain("Missing required proof secrets:");
  });

  it("fails when only one fixed email-verification secret is configured", () => {
    const result = runSecretCheck([
      "PROD_SMOKE_EMAIL",
      "PROD_SMOKE_PASSWORD",
      "ACCOUNT_DELETE_E2E_EMAIL",
      "ACCOUNT_DELETE_E2E_PASSWORD",
      "LWW_E2E_EMAIL",
      "LWW_E2E_PASSWORD",
      "EMAIL_VERIFICATION_E2E_EMAIL",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Email verification staging: missing EMAIL_VERIFICATION_E2E_PASSWORD");
  });
});
