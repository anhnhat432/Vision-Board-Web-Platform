import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT } from "./token-scan";

const RUNTIME_ROOTS = ["src/app", "src/features", "src/lib", "src/services"] as const;

function isRuntimeSourceFile(filePath: string) {
  if (!/\.(ts|tsx)$/.test(filePath)) return false;
  return !/\.(test|spec|stories)\.(ts|tsx)$/.test(filePath);
}

function collectRuntimeSourceFiles(dirPath: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectRuntimeSourceFiles(fullPath));
      continue;
    }
    if (isRuntimeSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

describe("runtime source does not use window.confirm", () => {
  it("keeps production runtime on in-app confirmations only", () => {
    const files = RUNTIME_ROOTS.flatMap((relativeRoot) =>
      collectRuntimeSourceFiles(path.join(DEFAULT_REPO_ROOT, relativeRoot)),
    );
    expect(files.length).toBeGreaterThan(0);

    const violations: Array<{ relativePath: string; snippet: string }> = [];

    for (const filePath of files) {
      const source = stripComments(readFileSync(filePath, "utf8"));
      const lines = source.split(/\r?\n/);

      for (const line of lines) {
        if (!line.includes("window.confirm(")) continue;
        violations.push({
          relativePath: path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/"),
          snippet: line.trim(),
        });
      }
    }

    expect(
      violations,
      `Runtime source must use AlertDialog instead of window.confirm: ${JSON.stringify(violations)}`,
    ).toEqual([]);
  });
});
