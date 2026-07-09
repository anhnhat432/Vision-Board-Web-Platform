import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("core funnel quality harness guards", () => {
  it("requires an explicit deployed URL in GitHub Actions", () => {
    const script = readFileSync(path.resolve("scripts", "smoke-core-quality.mjs"), "utf8");

    expect(script).toContain('const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true"');
    expect(script).toContain("CORE_QUALITY_URL is required in GitHub Actions so deployed core-funnel proof cannot fall back to localhost.");
    expect(script).toContain("assertTargetSafeForEnvironment();");
  });

  it("refuses localhost deployed proof targets in GitHub Actions", () => {
    const script = readFileSync(path.resolve("scripts", "smoke-core-quality.mjs"), "utf8");

    expect(script).toContain('normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.1")');
    expect(script).toContain(
      "Refusing to run deployed core-funnel proof against localhost. Use an accessible VITE_APP_MODE=demo staging/preview URL.",
    );
  });

  it("refuses production real-mode URLs for the local-first core smoke", () => {
    const script = readFileSync(path.resolve("scripts", "smoke-core-quality.mjs"), "utf8");
    const workflow = readFileSync(path.resolve(".github", "workflows", "core-funnel-quality-staging.yml"), "utf8");

    expect(script).toContain('const PRODUCTION_REAL_MODE_URLS = new Set([');
    expect(script).toContain('"https://vision-board-web-platform.vercel.app"');
    expect(script).toContain('"https://dearourfuture.io.vn"');
    expect(script).toContain("PRODUCTION_REAL_MODE_URLS.has(normalizedUrl)");
    expect(script).toContain("Core quality smoke is local-first/demo-only; do not run it against the production real-mode URL.");
    expect(workflow).toContain("Accessible demo/staging URL to test");
    expect(workflow).toContain('production_real_mode_urls=("https://vision-board-web-platform.vercel.app" "https://dearourfuture.io.vn")');
    expect(workflow).toContain("Core quality smoke is local-first/demo-only; use production-smoke-e2e.yml for real-mode production proof.");
  });

  it("reports auth-gated and Vercel-protected targets instead of timing out", () => {
    const script = readFileSync(path.resolve("scripts", "smoke-core-quality.mjs"), "utf8");

    expect(script).toContain("function describeBlockedCoreQualityTarget(state)");
    expect(script).toContain("Target appears to be behind Vercel Deployment Protection.");
    expect(script).toContain("Target is real-mode auth-gated for /12-week-system.");
    expect(script).toContain("assertCoreQualityTargetAccessible");
  });
});
