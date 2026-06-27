#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const injectedWorkflowJson = process.env.GITHUB_WORKFLOW_READINESS_JSON;

const REQUIRED_WORKFLOWS = [
  {
    gate: "core_funnel",
    label: "Core funnel quality staging",
    path: ".github/workflows/core-funnel-quality-staging.yml",
  },
  {
    gate: "email_verification",
    label: "Email verification staging",
    path: ".github/workflows/email-verification-e2e-staging.yml",
  },
  {
    gate: "account_delete",
    label: "Account deletion staging",
    path: ".github/workflows/account-delete-e2e-staging.yml",
  },
  {
    gate: "lww_sync",
    label: "LWW sync staging",
    path: ".github/workflows/lww-e2e-staging.yml",
  },
  {
    gate: "production_smoke",
    label: "Production smoke",
    path: ".github/workflows/production-smoke-e2e.yml",
  },
];

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/").trim();
}

function readWorkflowListJson() {
  if (injectedWorkflowJson) return injectedWorkflowJson;

  const ghCandidates = process.platform === "win32" ? ["gh", "gh.cmd", "gh.exe"] : ["gh"];
  let result = null;
  let commandNotFound = true;

  for (const candidate of ghCandidates) {
    const nextResult = spawnSync(candidate, [
      "api",
      "repos/:owner/:repo/actions/workflows",
      "--method",
      "GET",
      "-F",
      "per_page=100",
      "--jq",
      ".workflows",
    ], {
      encoding: "utf8",
    });

    if (nextResult.error?.code === "ENOENT") {
      continue;
    }

    commandNotFound = false;
    result = nextResult;
    break;
  }

  if (commandNotFound || !result) {
    throw new Error("Could not find GitHub CLI (`gh`) in PATH. Install GitHub CLI or run from a shell where `gh` is available.");
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(
      [
        "Could not read GitHub workflow metadata with `gh api repos/:owner/:repo/actions/workflows`.",
        "Run `gh auth login` and retry from the repository root.",
        stderr ? `gh stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
}

function parseWorkflowList(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse GitHub workflow list JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("GitHub workflow list JSON must be an array.");
  }

  const workflowsByPath = new Map();
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const path = normalizePath(entry.path);
    if (!path) continue;
    workflowsByPath.set(path, {
      name: typeof entry.name === "string" ? entry.name : path,
      path,
      state: typeof entry.state === "string" ? entry.state : "unknown",
    });
  }

  return workflowsByPath;
}

function inspectWorkflow(required, workflowsByPath) {
  const workflow = workflowsByPath.get(required.path);
  const existsLocally = existsSync(required.path);

  if (!workflow) {
    return {
      ...required,
      ready: false,
      reason: existsLocally ? "missing_on_default_branch_local_only" : "missing_on_default_branch",
      state: "missing",
      existsLocally,
    };
  }

  if (workflow.state !== "active") {
    return {
      ...required,
      ready: false,
      reason: "not_active",
      state: workflow.state,
      workflow,
      existsLocally,
    };
  }

  return {
    ...required,
    ready: true,
    state: workflow.state,
    workflow,
    existsLocally,
  };
}

function formatWorkflowResult(result) {
  if (result.ready) {
    return `PASS ${result.label}: active (${result.path})`;
  }

  if (result.reason === "missing_on_default_branch_local_only") {
    return `FAIL ${result.label}: missing on default branch (${result.path}; present in current worktree only)`;
  }

  if (result.reason === "missing_on_default_branch") {
    return `FAIL ${result.label}: missing on default branch (${result.path})`;
  }

  return `FAIL ${result.label}: expected active workflow but found state=${result.state} (${result.path})`;
}

function main() {
  const workflowsByPath = parseWorkflowList(readWorkflowListJson());
  const results = REQUIRED_WORKFLOWS.map((workflow) => inspectWorkflow(workflow, workflowsByPath));
  const failures = results.filter((result) => !result.ready);

  console.log("GitHub Actions workflow availability");
  console.log("Default-branch workflow metadata was inspected. No workflow was dispatched.");
  for (const result of results) {
    console.log(formatWorkflowResult(result));
  }

  if (failures.length > 0) {
    console.log("");
    console.log("Missing or unavailable proof workflows:");
    for (const failure of failures) {
      const localNote = failure.existsLocally ? " (present in current worktree only)" : "";
      console.log(`- ${failure.label}: ${failure.path}${localNote}`);
    }
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
