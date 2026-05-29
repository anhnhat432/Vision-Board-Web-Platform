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
const isSourceFile = (file) => {
  const normalized = normalizePath(file);
  const extension = path.extname(normalized);

  return normalized.startsWith("src/") && [".ts", ".tsx"].includes(extension) && !normalized.endsWith(".d.ts");
};

const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(normalizePath(file));

const changedFiles = new Set();

collectGitFiles(["diff", "--name-only", "--diff-filter=ACMRTUB", "HEAD", "--"], changedFiles);
collectGitFiles(["ls-files", "--others", "--exclude-standard"], changedFiles);

const changedSourceFiles = [...changedFiles].filter(isSourceFile);
const changedTestFiles = changedSourceFiles.filter(isTestFile);
const relatedSourceFiles = changedSourceFiles.filter((file) => !isTestFile(file));

const vitestEntry = path.join("node_modules", "vitest", "vitest.mjs");

const runVitest = (label, args) => {
  console.log(label);
  const result = spawnSync(process.execPath, [vitestEntry, ...args], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (changedTestFiles.length === 0 && relatedSourceFiles.length === 0) {
  console.log("No changed src test/source files. Skipping Vitest.");
  process.exit(0);
}

if (changedTestFiles.length > 0) {
  runVitest(
    `Running ${changedTestFiles.length} changed test file(s).`,
    ["run", ...changedTestFiles, "--passWithNoTests"],
  );
}

if (relatedSourceFiles.length > 0) {
  runVitest(
    `Running fast related tests for ${relatedSourceFiles.length} changed source file(s).`,
    ["related", ...relatedSourceFiles, "--config", "vitest.fast.config.ts", "--run", "--passWithNoTests"],
  );
}
