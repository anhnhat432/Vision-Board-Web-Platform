#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const REACT_ROUTER_ADVISORY = "GHSA-qwww-vcr4-c8h2";
const REVIEWED_REACT_ROUTER_VERSION = "7.18.2";
const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const RSC_DEPENDENCY_MARKERS = ["@vitejs/plugin-rsc", "react-server-dom-parcel", "react-server-dom-webpack"];
const RSC_SOURCE_MARKERS = ["unstable_reactRouterRSC", "unstable_RSCRouteConfig", "@vitejs/plugin-rsc"];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

function getAdvisoryId(item) {
  if (!item || typeof item !== "object") return "";
  const match = String(item.url ?? "").match(/GHSA-[a-z0-9-]+$/i);
  return match?.[0] ?? "";
}

function isAllowedReactRouterFinding(vulnerability, { scope, packageVersions, rscMarkers = [] }) {
  if (scope !== "frontend" || vulnerability.name !== "react-router") return false;
  if (packageVersions["react-router"] !== REVIEWED_REACT_ROUTER_VERSION) return false;
  if (rscMarkers.length > 0) return false;

  const advisories = Array.isArray(vulnerability.via) ? vulnerability.via.map(getAdvisoryId) : [];
  return advisories.length > 0 && advisories.every((advisory) => advisory === REACT_ROUTER_ADVISORY);
}

function collectSourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(entryPath);
  }

  return files;
}

export function detectReactRouterRscMarkers(repositoryRoot, packageJson) {
  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
  const markers = RSC_DEPENDENCY_MARKERS.filter((dependency) => dependencyNames.has(dependency));
  const sourceRoots = ["src", "app"]
    .map((directory) => path.join(repositoryRoot, directory))
    .filter((directory) => existsSync(directory));
  const rootConfigs = ["vite.config.js", "vite.config.mjs", "vite.config.ts", "vite.config.mts", "react-router.config.ts"]
    .map((file) => path.join(repositoryRoot, file));
  const sourceFiles = sourceRoots.flatMap(collectSourceFiles);

  for (const file of [...rootConfigs, ...sourceFiles]) {
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT" && rootConfigs.includes(file)) continue;
      throw error;
    }

    for (const marker of RSC_SOURCE_MARKERS) {
      if (source.includes(marker)) markers.push(`${path.relative(repositoryRoot, file)}:${marker}`);
    }
  }

  return [...new Set(markers)];
}

export function evaluateAuditReport(report, options) {
  const blocking = [];
  const allowed = [];

  for (const vulnerability of Object.values(report?.vulnerabilities ?? {})) {
    if (!BLOCKING_SEVERITIES.has(vulnerability.severity)) continue;

    if (isAllowedReactRouterFinding(vulnerability, options)) {
      allowed.push(`react-router:${REACT_ROUTER_ADVISORY}`);
      continue;
    }

    blocking.push(`${vulnerability.name} (${vulnerability.severity})`);
  }

  return { allowed, blocking };
}

function runAudit(scope) {
  if (scope !== "frontend" && scope !== "backend") {
    throw new Error("Usage: check-production-dependency-audit.mjs <frontend|backend>");
  }

  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const auditRoot = scope === "backend" ? path.join(repositoryRoot, "backend") : repositoryRoot;
  const packageJson = JSON.parse(readFileSync(path.join(auditRoot, "package.json"), "utf8"));
  const packageVersions = { ...packageJson.dependencies, ...packageJson.overrides };
  const rscMarkers = scope === "frontend" ? detectReactRouterRscMarkers(repositoryRoot, packageJson) : [];
  const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: auditRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (audit.error) throw audit.error;
  if (audit.status !== 0 && audit.status !== 1) {
    throw new Error(`npm audit failed with exit code ${audit.status}: ${audit.stderr.trim()}`);
  }

  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    throw new Error(`npm audit returned invalid JSON: ${audit.stdout.slice(0, 500)}`);
  }

  const result = evaluateAuditReport(report, { packageVersions, rscMarkers, scope });
  for (const finding of result.allowed) {
    console.warn(
      `::warning::Accepted non-applicable production audit advisory: ${finding}; React Router RSC markers were not detected and react-router is pinned to reviewed version ${REVIEWED_REACT_ROUTER_VERSION}.`,
    );
  }

  if (result.blocking.length > 0) {
    throw new Error(`Blocking production dependency findings: ${result.blocking.join(", ")}`);
  }

  console.log(`${scope} production dependency audit passed.`);
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  try {
    runAudit(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
