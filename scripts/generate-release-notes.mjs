#!/usr/bin/env node
// Generate release notes from git log between the previous v* tag and the current tag.
// Designed for the soft-launch flow.
//
// Usage:
//   GITHUB_REF_NAME=v1.0.0 node scripts/generate-release-notes.mjs > notes.md

import { execFileSync } from "node:child_process";

const currentTag = process.env.GITHUB_REF_NAME || process.argv[2];
if (!currentTag) {
  console.error("Missing tag name. Set GITHUB_REF_NAME or pass as arg.");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

let previousTag = "";
try {
  previousTag = git([
    "describe",
    "--tags",
    "--abbrev=0",
    "--match",
    "v*",
    `${currentTag}^`,
  ]);
} catch {
  previousTag = git(["rev-list", "--max-parents=0", "HEAD"]);
}

const range = `${previousTag}..${currentTag}`;
const log = git(["log", range, "--pretty=format:%h%x09%s%x09%an"]);

const lines = log.split("\n").filter(Boolean);
const groups = {
  feat: { title: "\u{1F680} Features", items: [] },
  fix: { title: "\u{1F41B} Bug fixes", items: [] },
  perf: { title: "\u26A1 Performance", items: [] },
  refactor: { title: "\u267B\uFE0F Refactor", items: [] },
  docs: { title: "\u{1F4DA} Docs", items: [] },
  test: { title: "\u2705 Tests", items: [] },
  ci: { title: "\u{1F477} CI", items: [] },
  chore: { title: "\u{1F527} Chore", items: [] },
  build: { title: "\u{1F4E6} Build", items: [] },
  style: { title: "\u{1F484} Style", items: [] },
  revert: { title: "\u23EA Revert", items: [] },
  other: { title: "\u{1F4DD} Other", items: [] },
};

const conventionalRe =
  /^(feat|fix|chore|test|refactor|docs|ci|perf|style|build|revert)(\([^)]+\))?!?: (.+)$/i;

for (const line of lines) {
  const [hash, subject] = line.split("\t");
  const match = subject.match(conventionalRe);
  if (match) {
    const type = match[1].toLowerCase();
    const scope = match[2] || "";
    const desc = match[3];
    const target = groups[type] || groups.other;
    target.items.push(
      `- ${desc} ${scope ? `*(${scope.replace(/[()]/g, "")})*` : ""} (\`${hash}\`)`,
    );
  } else {
    groups.other.items.push(`- ${subject} (\`${hash}\`)`);
  }
}

let out = `## ${currentTag}\n\n`;
out += `_Released ${new Date().toISOString().slice(0, 10)} \u2022 compared to \`${previousTag.slice(0, 12)}\`_\n\n`;

for (const group of Object.values(groups)) {
  if (group.items.length === 0) continue;
  out += `### ${group.title}\n\n`;
  out += group.items.join("\n");
  out += "\n\n";
}

const totalCommits = lines.length;
const contributors = new Set(lines.map((line) => line.split("\t")[2]).filter(Boolean));
out += "---\n\n";
out += `**Stats**: ${totalCommits} commits \u2022 ${contributors.size} contributor(s)\n`;

process.stdout.write(out);
