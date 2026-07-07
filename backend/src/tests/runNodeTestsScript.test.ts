import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { buildNodeTestArgs } from "../scripts/runNodeTests";

describe("backend node test runner script", () => {
  it("uses only compiled backend route/service test files by default", () => {
    const args = buildNodeTestArgs([]);

    assert.equal(args[0], "--test");
    assert.ok(args.length > 1);
    assert.ok(args.includes("dist/tests/accountRoutes.test.js"));
    assert.ok(!args.includes("dist/tests/*.test.js"));
    assert.ok(args.slice(1).every((arg) => arg.startsWith("dist/tests/") && arg.endsWith(".test.js")));
  });

  it("preserves targeted node --test arguments", () => {
    assert.deepEqual(buildNodeTestArgs(["dist/tests/accountRoutes.test.js"]), [
      "--test",
      "dist/tests/accountRoutes.test.js",
    ]);
  });

  it("expands the default compiled test glob to concrete files for Node 20 on Windows", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "backend-node-test-runner-"));
    const testsDir = path.join(cwd, "dist", "tests");
    mkdirSync(testsDir, { recursive: true });
    writeFileSync(path.join(testsDir, "zeta.test.js"), "");
    writeFileSync(path.join(testsDir, "alpha.test.js"), "");
    writeFileSync(path.join(testsDir, "helper.js"), "");

    try {
      assert.deepEqual(buildNodeTestArgs([], { cwd }), [
        "--test",
        "dist/tests/alpha.test.js",
        "dist/tests/zeta.test.js",
      ]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("keeps package test scripts on the guarded runner", () => {
    const packageJson = JSON.parse(readFileSync(path.resolve("package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    assert.equal(packageJson.scripts?.test, "npm run build && node dist/scripts/runNodeTests.js");
    assert.equal(packageJson.scripts?.["test:run"], "npm run build && node dist/scripts/runNodeTests.js");
  });
});
