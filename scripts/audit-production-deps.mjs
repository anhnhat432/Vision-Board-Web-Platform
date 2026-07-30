#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const injectedAuditJson = process.env.NPM_AUDIT_JSON;
const blockingSeverities = new Set(["high", "critical"]);
const frontendAllowlist = new Map([
  ["react-router", new Set(["GHSA-qwww-vcr4-c8h2"])],
]);

function readProject() {
  const projectIndex = process.argv.indexOf("--project");
  const project = projectIndex >= 0 ? process.argv[projectIndex + 1] : "frontend";

  if (project !== "frontend" && project !== "backend") {
    throw new Error('Expected `--project frontend` or `--project backend`.');
  }

  return project;
}

function readAuditJson(project) {
  if (injectedAuditJson) return injectedAuditJson;

  const args = project === "backend"
    ? ["--prefix", "backend", "audit", "--omit=dev", "--json"]
    : ["audit", "--omit=dev", "--json"];

  const result = process.env.npm_execpath
    ? spawnSync(process.execPath, [process.env.npm_execpath, ...args], { encoding: "utf8" })
    : spawnSync("npm", args, { encoding: "utf8", shell: process.platform === "win32" });

  if (result.error?.code === "ENOENT") throw new Error("Could not find npm in PATH.");

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`npm audit could not complete for ${project}.`);
  }

  return result.stdout;
}

function parseAuditReport(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse npm audit JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!parsed?.vulnerabilities || typeof parsed.vulnerabilities !== "object" || Array.isArray(parsed.vulnerabilities)) {
    throw new Error("npm audit JSON must contain a vulnerabilities object.");
  }

  return parsed;
}

function extractAdvisoryId(url) {
  if (typeof url !== "string") return "unknown-advisory";
  return url.match(/GHSA-[a-z0-9-]+/i)?.[0] ?? "unknown-advisory";
}

function isAllowed(project, packageName, advisoryId) {
  if (project !== "frontend") return false;
  return frontendAllowlist.get(packageName)?.has(advisoryId) ?? false;
}

function evaluateAudit(project, report) {
  const allowed = [];
  const blocked = [];

  for (const [packageKey, vulnerability] of Object.entries(report.vulnerabilities)) {
    const packageName = vulnerability?.name || packageKey;
    if (!blockingSeverities.has(vulnerability?.severity)) continue;

    const directAdvisories = Array.isArray(vulnerability.via)
      ? vulnerability.via.filter((entry) => entry && typeof entry === "object" && blockingSeverities.has(entry.severity))
      : [];

    if (directAdvisories.length === 0) {
      blocked.push({ packageName, advisoryId: "unknown-advisory", severity: vulnerability.severity });
      continue;
    }

    for (const advisory of directAdvisories) {
      const advisoryId = extractAdvisoryId(advisory.url);
      const item = { packageName, advisoryId, severity: advisory.severity };
      if (isAllowed(project, packageName, advisoryId)) {
        allowed.push(item);
      } else {
        blocked.push(item);
      }
    }
  }

  return { allowed, blocked };
}

function main() {
  const project = readProject();
  const report = parseAuditReport(readAuditJson(project));
  const { allowed, blocked } = evaluateAudit(project, report);

  for (const item of allowed) {
    console.log(
      `ALLOW ${item.advisoryId} package=${item.packageName}: unstable RSC APIs are not used by this Vite SPA.`,
    );
  }

  for (const item of blocked) {
    console.log(`FAIL ${item.packageName} ${item.advisoryId} severity=${item.severity}`);
  }

  if (blocked.length > 0) {
    console.log(`FAIL ${project} production dependency audit: ${blocked.length} blocking advisory item(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS ${project} production dependency audit${allowed.length > 0 ? ` with ${allowed.length} documented non-applicable advisory exception` : ""}.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
