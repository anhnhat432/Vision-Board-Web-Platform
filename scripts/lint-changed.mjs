import { spawnSync } from "node:child_process";
import path from "node:path";

const runGit = (args) =>
  spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const collectGitFiles = (args, files) => {
  const result = runGit(args);

  if (result.status !== 0) {
    process.stderr.write(result.stderr || `git ${args.join(" ")} failed\n`);
    process.exit(result.status ?? 1);
  }

  for (const file of result.stdout.split(/\r?\n/)) {
    if (file.trim()) {
      files.add(file.trim());
    }
  }
};

const normalizePath = (file) => file.replaceAll("\\", "/");

const lintableRootFiles = new Set(["package.json", "tsconfig.json", "vitest.config.ts", "biome.json"]);

const isLintable = (file) => {
  const normalized = normalizePath(file);
  const extension = path.extname(normalized);

  if (normalized.startsWith("src/") && [".ts", ".tsx"].includes(extension)) {
    return true;
  }

  if (lintableRootFiles.has(normalized)) {
    return true;
  }

  return /^vitest\..*\.config\.ts$/.test(normalized);
};

const changedFiles = new Set();

collectGitFiles(["diff", "--name-only", "--diff-filter=ACMRTUB", "HEAD", "--"], changedFiles);
collectGitFiles(["ls-files", "--others", "--exclude-standard"], changedFiles);

const lintTargets = [...changedFiles].filter(isLintable);

if (lintTargets.length === 0) {
  console.log("No changed frontend files matched Biome lint inputs.");
  process.exit(0);
}

console.log(`Linting ${lintTargets.length} changed file(s):`);
for (const file of lintTargets) {
  console.log(`- ${file}`);
}

const biomeEntry = path.join("node_modules", "@biomejs", "biome", "bin", "biome");
const lintResult = spawnSync(
  process.execPath,
  [biomeEntry, "lint", "--no-errors-on-unmatched", ...lintTargets],
  {
    stdio: "inherit",
  },
);

process.exit(lintResult.status ?? 1);
