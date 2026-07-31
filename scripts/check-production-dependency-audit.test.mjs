import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const modulePath = path.resolve("scripts", "check-production-dependency-audit.mjs");
const workflow = readFileSync(path.resolve(".github", "workflows", "npm-audit.yml"), "utf8");

async function loadEvaluator() {
  expect(existsSync(modulePath)).toBe(true);
  if (!existsSync(modulePath)) return null;
  return import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);
}

const reactRouterFinding = {
  reactRouter: {
    name: "react-router",
    severity: "high",
    via: [
      {
        source: 1124282,
        url: "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
      },
    ],
  },
};

describe("production dependency audit policy", () => {
  it("accepts only the reviewed React Router advisory for the non-RSC frontend", async () => {
    const module = await loadEvaluator();
    if (!module) return;

    const result = module.evaluateAuditReport(
      { vulnerabilities: reactRouterFinding },
      { scope: "frontend", packageVersions: { "react-router": "7.18.2" }, rscMarkers: [] },
    );

    expect(result.blocking).toEqual([]);
    expect(result.allowed).toEqual(["react-router:GHSA-qwww-vcr4-c8h2"]);
  });

  it("blocks the React Router advisory when an RSC marker is detected", async () => {
    const module = await loadEvaluator();
    if (!module) return;

    const result = module.evaluateAuditReport(
      { vulnerabilities: reactRouterFinding },
      {
        scope: "frontend",
        packageVersions: { "react-router": "7.18.2" },
        rscMarkers: ["vite.config.ts:unstable_reactRouterRSC"],
      },
    );

    expect(result.blocking).toEqual(["react-router (high)"]);
    expect(result.allowed).toEqual([]);
  });

  it("fails an unknown critical production advisory", async () => {
    const module = await loadEvaluator();
    if (!module) return;

    const result = module.evaluateAuditReport(
      {
        vulnerabilities: {
          dangerous: {
            name: "dangerous",
            severity: "critical",
            via: [{ source: 9999999, url: "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz" }],
          },
        },
      },
      { scope: "frontend", packageVersions: {} },
    );

    expect(result.blocking).toEqual(["dangerous (critical)"]);
    expect(result.allowed).toEqual([]);
  });

  it("does not apply the React Router exception to backend", async () => {
    const module = await loadEvaluator();
    if (!module) return;

    const result = module.evaluateAuditReport(
      { vulnerabilities: reactRouterFinding },
      { scope: "backend", packageVersions: { "react-router": "7.18.2" } },
    );

    expect(result.blocking).toEqual(["react-router (high)"]);
    expect(result.allowed).toEqual([]);
  });

  it("routes both GitHub audit jobs through the fail-closed policy", () => {
    expect(workflow).toContain("node scripts/check-production-dependency-audit.mjs frontend");
    expect(workflow).toContain("node scripts/check-production-dependency-audit.mjs backend");
    expect(workflow).not.toContain("npm audit --audit-level=high");
  });
});
