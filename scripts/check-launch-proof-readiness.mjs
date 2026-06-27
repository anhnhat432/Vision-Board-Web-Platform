#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const CHECKS = [
  {
    key: "secrets",
    label: "GitHub Actions secret readiness",
    script: "check-github-secret-readiness.mjs",
  },
  {
    key: "workflows",
    label: "GitHub Actions workflow availability",
    script: "check-github-workflow-readiness.mjs",
  },
  {
    key: "smoke",
    label: "GitHub Actions production smoke latest run",
    script: "check-production-smoke-run-readiness.mjs",
  },
];

function splitLines(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trimEnd()
    .split("\n")
    .filter((line) => line.length > 0);
}

function printOutput(text, writeLine = console.log) {
  for (const line of splitLines(text)) {
    writeLine(line);
  }
}

function runCheck(check) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, check.script)], {
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    return {
      ...check,
      status: 2,
      stdout: "",
      stderr: result.error.message,
    };
  }

  return {
    ...check,
    status: result.status ?? 2,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function summarizeStatus(status) {
  if (status === 0) return "PASS";
  if (status === 1) return "BLOCKED";
  return "ERROR";
}

function joinPhrases(phrases) {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} or ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(", ")}, or ${phrases.at(-1)}`;
}

function summarizeBlockers(results) {
  const blockedKeys = new Set(results.filter((result) => result.status === 1).map((result) => result.key));
  const phrases = [];

  if (blockedKeys.has("secrets")) {
    phrases.push("missing required proof secrets");
  }

  if (blockedKeys.has("workflows")) {
    phrases.push("default-branch workflow availability blockers");
  }

  if (blockedKeys.has("smoke")) {
    phrases.push("latest production-smoke run blocker");
  }

  return joinPhrases(phrases);
}

function main() {
  console.log("Launch proof readiness");
  console.log("This command inspects GitHub metadata and local git state only. Secret values are not read, and no workflow is dispatched.");

  const results = CHECKS.map(runCheck);

  for (const result of results) {
    console.log("");
    console.log(`## ${result.label}`);
    printOutput(result.stdout);
    printOutput(result.stderr, console.error);
    console.log(`RESULT ${result.label}: ${summarizeStatus(result.status)}`);
  }

  const hasToolError = results.some((result) => result.status !== 0 && result.status !== 1);
  const hasBlocker = results.some((result) => result.status === 1);

  console.log("");
  if (hasToolError) {
    console.log("Launch proof readiness: ERROR");
    console.log("At least one readiness check could not inspect GitHub metadata. Fix the tool/auth/JSON issue, then rerun.");
    process.exitCode = 2;
    return;
  }

  if (hasBlocker) {
    console.log("Launch proof readiness: BLOCKED");
    const blockerSummary = summarizeBlockers(results);
    console.log(`Resolve the ${blockerSummary} before dispatching staging proof workflows.`);
    process.exitCode = 1;
    return;
  }

  console.log("Launch proof readiness: PASS");
  console.log("Secret names, default-branch workflow availability, and latest production-smoke run metadata are ready. This is still not launch proof until the deployed workflows pass and evidence is recorded.");
}

main();
