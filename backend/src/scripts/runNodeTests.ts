import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const DEFAULT_NODE_TEST_TARGETS = ["dist/tests/*.test.js"];
const DEFAULT_NODE_TEST_DIR = path.join("dist", "tests");

interface BuildNodeTestArgsOptions {
  cwd?: string;
}

function toNodeTestPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function resolveDefaultNodeTestTargets(cwd = process.cwd()): string[] {
  try {
    const testDir = path.join(cwd, DEFAULT_NODE_TEST_DIR);
    const testFiles = readdirSync(testDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
      .map((entry) => toNodeTestPath(path.join(DEFAULT_NODE_TEST_DIR, entry.name)))
      .sort();

    return testFiles.length > 0 ? testFiles : DEFAULT_NODE_TEST_TARGETS;
  } catch {
    return DEFAULT_NODE_TEST_TARGETS;
  }
}

export function buildNodeTestArgs(rawArgs: readonly string[], options: BuildNodeTestArgsOptions = {}): string[] {
  const testArgs = rawArgs.filter((arg) => arg.trim().length > 0);
  return ["--test", ...(testArgs.length > 0 ? testArgs : resolveDefaultNodeTestTargets(options.cwd))];
}

export function runNodeTests(rawArgs = process.argv.slice(2)): number {
  const result = spawnSync(process.execPath, buildNodeTestArgs(rawArgs), {
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`[backend-test] Node test runner exited from signal ${result.signal}.`);
    return 1;
  }

  return typeof result.status === "number" ? result.status : 1;
}

if (require.main === module) {
  try {
    process.exitCode = runNodeTests();
  } catch (error) {
    console.error("[backend-test] Failed to start Node test runner.", error);
    process.exitCode = 1;
  }
}
