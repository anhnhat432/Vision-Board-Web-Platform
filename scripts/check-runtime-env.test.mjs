import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-runtime-env.mjs");

function runEnvCheck({ files = {}, args = [] } = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "vision-board-env-check-"));

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(path.join(cwd, fileName), content);
  }

  return spawnSync(process.execPath, [scriptPath, "--skip-health", ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
}

describe("check-runtime-env app mode boundary", () => {
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
});
