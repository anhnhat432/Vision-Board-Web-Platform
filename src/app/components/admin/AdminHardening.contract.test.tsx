import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const adminComponentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(adminComponentDir, "../..");

function collectAdminFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectAdminFiles(path);
    if (!entry.name.startsWith("Admin") || !entry.name.endsWith(".tsx")) return [];
    if (entry.name.includes(".test.")) return [];
    return [path];
  });
}

const files = [
  ...collectAdminFiles(resolve(appDir, "pages")),
  ...collectAdminFiles(adminComponentDir),
].sort();

function label(file: string): string {
  return relative(appDir, file).replace(/\\/g, "/");
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}

function findLineViolations(predicate: (line: string) => boolean): string[] {
  return files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .flatMap((line, index) =>
        predicate(line) ? [`${label(file)}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

function findTagViolations(pattern: RegExp, predicate: (tag: string) => boolean): string[] {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return Array.from(source.matchAll(pattern)).flatMap((match) => {
      const tag = match[0];
      return predicate(tag)
        ? [`${label(file)}:${lineNumber(source, match.index ?? 0)}: ${tag}`]
        : [];
    });
  });
}

describe("Admin hardening contract", () => {
  it("provides reduced-motion fallbacks for Admin animations and transitions", () => {
    const animationViolations = findLineViolations(
      (line) =>
        /animate-(?:spin|pulse)/.test(line) &&
        !line.includes("motion-reduce:animate-none"),
    );
    const transitionViolations = findLineViolations(
      (line) =>
        /transition-(?:colors|all|\[[^\]]+\])/.test(line) &&
        !line.includes("motion-reduce:transition-none"),
    );

    expect([...animationViolations, ...transitionViolations]).toEqual([]);
  });

  it("hides animated loader icons when visible copy already names the state", () => {
    const violations = findTagViolations(
      /<Loader2\b[^>]*>/g,
      (tag) => tag.includes("animate-spin") && !tag.includes('aria-hidden="true"'),
    );

    expect(violations).toEqual([]);
  });
});
