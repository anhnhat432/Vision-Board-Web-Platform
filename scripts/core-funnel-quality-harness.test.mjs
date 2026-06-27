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
    expect(script).toContain("Refusing to run deployed core-funnel proof against localhost. Use a staging or production-like target URL.");
  });
});
