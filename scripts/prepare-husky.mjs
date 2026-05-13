#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.CI === "true" || process.env.HUSKY === "0") {
  process.exit(0);
}

if (!existsSync(".git")) {
  process.exit(0);
}

if (
  process.env.npm_config_local_prefix &&
  resolve(process.env.npm_config_local_prefix) !== process.cwd()
) {
  process.exit(0);
}

const huskyBin =
  process.platform === "win32"
    ? "node_modules/.bin/husky.cmd"
    : "node_modules/.bin/husky";

if (!existsSync(huskyBin)) {
  console.log("husky install skipped: local husky binary not found");
  process.exit(0);
}

if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/d", "/s", "/c", "npx --no-install husky"], {
    stdio: "inherit",
  });
} else {
  execFileSync("npx", ["--no-install", "husky"], { stdio: "inherit" });
}
