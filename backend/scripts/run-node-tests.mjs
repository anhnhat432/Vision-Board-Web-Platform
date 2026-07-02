#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(scriptDir, "..");
const requestedFiles = process.argv.slice(2);

function getDefaultTestFiles() {
  return readdirSync(join(backendRoot, "dist", "tests"))
    .filter((fileName) => fileName.endsWith(".test.js"))
    .sort()
    .map((fileName) => join("dist", "tests", fileName));
}

const testFiles = requestedFiles.length > 0 ? requestedFiles : getDefaultTestFiles();

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: backendRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
