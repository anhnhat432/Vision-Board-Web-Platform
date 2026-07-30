import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/audit-production-deps.mjs");

function runAudit(report, project = "frontend") {
  return spawnSync(process.execPath, [scriptPath, "--project", project], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NPM_AUDIT_JSON: typeof report === "string" ? report : JSON.stringify(report),
    },
  });
}

function reportWith(vulnerabilities) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: Object.keys(vulnerabilities).length,
      },
    },
  };
}

const rscOnlyReactRouter = {
  name: "react-router",
  severity: "high",
  isDirect: true,
  via: [
    {
      source: 1124282,
      name: "react-router",
      title: "React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response",
      url: "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
      severity: "high",
      range: ">=7.12.0 <8.3.0",
    },
  ],
  effects: [],
  range: "7.12.0 - 8.2.0",
  nodes: ["node_modules/react-router"],
};

describe("audit-production-deps", () => {
  it("passes a clean production dependency report", () => {
    const result = runAudit(reportWith({}));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS frontend production dependency audit");
  });

  it("allows only the documented frontend unstable-RSC advisory", () => {
    const result = runAudit(reportWith({ "react-router": rscOnlyReactRouter }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ALLOW GHSA-qwww-vcr4-c8h2");
    expect(result.stdout).toContain("unstable RSC APIs are not used");
  });

  it("still blocks any additional high or critical advisory", () => {
    const result = runAudit(
      reportWith({
        "react-router": rscOnlyReactRouter,
        "websocket-driver": {
          name: "websocket-driver",
          severity: "critical",
          isDirect: false,
          via: [
            {
              name: "websocket-driver",
              title: "Message corruption",
              url: "https://github.com/advisories/GHSA-xv26-6w52-cph6",
              severity: "critical",
            },
          ],
          effects: [],
          nodes: ["node_modules/websocket-driver"],
        },
      }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL websocket-driver GHSA-xv26-6w52-cph6 severity=critical");
  });

  it("does not apply the frontend RSC exception to the backend audit", () => {
    const result = runAudit(reportWith({ "react-router": rscOnlyReactRouter }), "backend");

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL react-router GHSA-qwww-vcr4-c8h2 severity=high");
  });

  it("returns a tool error when npm audit JSON is invalid", () => {
    const result = runAudit("not-json");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Could not parse npm audit JSON");
  });

  it("can execute the real frontend audit through npm_execpath", () => {
    const result = spawnSync(process.execPath, [scriptPath, "--project", "frontend"], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        npm_execpath: process.env.npm_execpath,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS frontend production dependency audit");
  });

  it("keeps the GitHub audit workflow on the scoped guard", () => {
    const workflow = readFileSync(path.resolve(".github/workflows/npm-audit.yml"), "utf8");

    expect(workflow).toContain("npm run audit:prod");
    expect(workflow).toContain("npm run audit:prod:backend");
    expect(workflow).not.toContain("npm audit --audit-level=high");
    expect(workflow).not.toContain("npm --prefix backend audit --audit-level=high");
  });
});
