import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-runtime-env.mjs");
const packageJsonPath = path.resolve("package.json");

function runEnvCheck({ files = {}, args = [], skipHealth = true, env = {} } = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "vision-board-env-check-"));

  for (const [fileName, content] of Object.entries(files)) {
    const filePath = path.join(cwd, fileName);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }

  return spawnSync(process.execPath, [scriptPath, ...(skipHealth ? ["--skip-health"] : []), ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env.PATH, ...env },
  });
}

describe("check-runtime-env app mode boundary", () => {
  it("provides a production full-stack env check script", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    expect(packageJson.scripts["env:check:prod"]).toBe(
      "node scripts/check-runtime-env.mjs --full-stack --mode production",
    );
  });

  it("lets Node close health-check handles cleanly on failed full-stack checks", () => {
    const script = readFileSync(scriptPath, "utf8");

    expect(script).not.toContain("process.exit(1)");
    expect(script).toContain("process.exitCode = 1");
  });

  it("treats missing VITE_APP_MODE as real instead of silently downgrading to demo", () => {
    const result = runEnvCheck({ args: ["--mode", "production"] });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Resolved VITE_APP_MODE: real");
    expect(result.stdout).toContain("MISSING VITE_APP_MODE");
    expect(result.stdout).not.toContain("VITE_APP_MODE is demo");
  });

  it("fails full-stack checks when VITE_APP_MODE is malformed", () => {
    const result = runEnvCheck({
      files: {
        ".env.production": [
          "VITE_APP_MODE=staging",
          "VITE_API_BASE_URL=https://api.example.test",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('VITE_APP_MODE is invalid ("staging")');
    expect(result.stdout).toContain("frontend:VITE_APP_MODE(invalid:staging)");
    expect(result.stdout).not.toContain("VITE_APP_MODE is demo");
  });

  it("fails full-stack checks when real-mode frontend runtime env is incomplete", () => {
    const result = runEnvCheck({
      files: {
        ".env.production": [
          "VITE_APP_MODE=real",
          "VITE_API_BASE_URL=https://api.example.test",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("MISSING VITE_BILLING_PROVIDER_MODE");
    expect(result.stdout).toContain("MISSING VITE_BILLING_SUPPORT_EMAIL");
    expect(result.stdout).toContain("MISSING VITE_SENTRY_DSN");
    expect(result.stdout).toContain("frontend:VITE_BILLING_PROVIDER_MODE");
    expect(result.stdout).toContain("frontend:VITE_BILLING_SUPPORT_EMAIL");
    expect(result.stdout).toContain("frontend:VITE_SENTRY_DSN");
    expect(result.stdout).not.toContain("Report complete with warnings.");
  });

  it("prints PayOS billing requirements when PayOS is the configured provider", () => {
    const result = runEnvCheck({
      files: {
        ".env.production": [
          "VITE_APP_MODE=real",
          "VITE_API_BASE_URL=https://api.example.test",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
          "VITE_BILLING_PROVIDER_MODE=api_contract",
          "VITE_BILLING_SUPPORT_EMAIL=support@example.test",
          "VITE_SENTRY_DSN=https://public@sentry.example/1",
        ].join("\n"),
        "backend/.env": [
          "PORT=4000",
          "MONGODB_URI=mongodb://example.test/vision-board",
          "FIREBASE_PROJECT_ID=test",
          "FIREBASE_CLIENT_EMAIL=firebase@example.test",
          "FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----",
          "FRONTEND_ORIGIN=https://example.test",
          "BILLING_PROVIDER=payos",
          "BILLING_REPOSITORY=mongo",
          "PLUS_PRICE_VND=99000",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("PayOS billing requirements");
    expect(result.stdout).toContain("MISSING PAYOS_CLIENT_ID");
    expect(result.stdout).toContain("MISSING PAYOS_API_KEY");
    expect(result.stdout).toContain("MISSING PAYOS_CHECKSUM_KEY");
  });

  it("accepts a configured Casso webhook alias instead of hard-requiring CASSO_WEBHOOK_SECRET", () => {
    const result = runEnvCheck({
      files: {
        ".env.production": [
          "VITE_APP_MODE=real",
          "VITE_API_BASE_URL=https://api.example.test",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
          "VITE_BILLING_PROVIDER_MODE=api_contract",
          "VITE_BILLING_SUPPORT_EMAIL=support@example.test",
          "VITE_SENTRY_DSN=https://public@sentry.example/1",
        ].join("\n"),
        "backend/.env": [
          "PORT=4000",
          "MONGODB_URI=mongodb://example.test/vision-board",
          "FIREBASE_PROJECT_ID=test",
          "FIREBASE_CLIENT_EMAIL=firebase@example.test",
          "FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----",
          "FRONTEND_ORIGIN=https://example.test",
          "BILLING_PROVIDER=casso",
          "BILLING_REPOSITORY=mongo",
          "CASSO_WEBHOOK_CHECKSUM_KEY=checksum-key",
          "CASSO_BANK_ACCOUNT=0123456789",
          "CASSO_BANK_NAME=MB",
          "CASSO_ACCOUNT_NAME=NGUYEN VAN A",
          "PLUS_PRICE_VND=99000",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("MISSING CASSO_WEBHOOK_SECRET");
    expect(result.stdout).not.toContain("backend:CASSO_WEBHOOK_SECRET");
  });

  it("prints the API health URL and timeout hint when full-stack health fails", () => {
    const result = runEnvCheck({
      skipHealth: false,
      files: {
        ".env.production": [
          "VITE_APP_MODE=real",
          "VITE_API_BASE_URL=http://127.0.0.1:9/api",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
          "VITE_BILLING_PROVIDER_MODE=api_contract",
          "VITE_BILLING_SUPPORT_EMAIL=support@example.test",
          "VITE_SENTRY_DSN=https://public@sentry.example/1",
        ].join("\n"),
        "backend/.env": [
          "PORT=4000",
          "MONGODB_URI=mongodb://example.test/vision-board",
          "FIREBASE_PROJECT_ID=test",
          "FIREBASE_CLIENT_EMAIL=firebase@example.test",
          "FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----",
          "FRONTEND_ORIGIN=https://example.test",
          "BILLING_PROVIDER=casso",
          "BILLING_REPOSITORY=mongo",
          "CASSO_WEBHOOK_CHECKSUM_KEY=checksum-key",
          "CASSO_BANK_ACCOUNT=0123456789",
          "CASSO_BANK_NAME=MB",
          "CASSO_ACCOUNT_NAME=NGUYEN VAN A",
          "PLUS_PRICE_VND=99000",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
      env: {
        ENV_CHECK_HEALTH_TIMEOUT_MS: "250",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("API health: FAILED");
    expect(result.stdout).toContain("http://127.0.0.1:9/api/health");
    expect(result.stdout).toContain("ENV_CHECK_HEALTH_TIMEOUT_MS=250");
    expect(result.stdout).toContain("api:health");
  });

});
