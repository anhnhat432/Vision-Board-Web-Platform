#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const injectedRunsJson = process.env.GITHUB_STAGING_PROOF_RUNS_JSON;

const REQUIRED_STAGING_RUNS = [
  {
    label: "Core funnel deployed proof",
    workflow: "core-funnel-quality-staging.yml",
  },
  {
    label: "Email verification staging",
    workflow: "email-verification-e2e-staging.yml",
  },
  {
    label: "Account deletion staging",
    workflow: "account-delete-e2e-staging.yml",
  },
  {
    label: "LWW sync staging",
    workflow: "lww-e2e-staging.yml",
  },
];

function parseInjectedRuns(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse staging proof run metadata JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Staging proof run metadata JSON must be an object keyed by workflow filename.");
  }

  const runsByWorkflow = new Map();
  for (const required of REQUIRED_STAGING_RUNS) {
    const runs = parsed[required.workflow];
    runsByWorkflow.set(required.workflow, Array.isArray(runs) ? runs : []);
  }
  return runsByWorkflow;
}

function parseRunList(rawJson, workflow) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(
      `Could not parse staging proof run metadata JSON for ${workflow}: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Staging proof run metadata for ${workflow} must be an array.`);
  }

  return parsed;
}

function readWorkflowRuns(workflow) {
  const ghCandidates = process.platform === "win32" ? ["gh", "gh.cmd", "gh.exe"] : ["gh"];
  let result = null;
  let commandNotFound = true;

  for (const candidate of ghCandidates) {
    const nextResult = spawnSync(
      candidate,
      [
        "run",
        "list",
        "--workflow",
        workflow,
        "--event",
        "workflow_dispatch",
        "--limit",
        "1",
        "--json",
        "databaseId,workflowName,status,conclusion,event,createdAt,url,headSha,displayTitle",
      ],
      {
        encoding: "utf8",
      },
    );

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
        `Could not read staging proof run metadata for ${workflow} with \`gh run list --workflow ${workflow} --event workflow_dispatch --limit 1 --json ...\`.`,
        "Run `gh auth login` and retry from the repository root.",
        stderr ? `gh stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return parseRunList(result.stdout, workflow);
}

function readRunsByWorkflow() {
  if (injectedRunsJson) {
    return parseInjectedRuns(injectedRunsJson);
  }

  const runsByWorkflow = new Map();
  for (const required of REQUIRED_STAGING_RUNS) {
    runsByWorkflow.set(required.workflow, readWorkflowRuns(required.workflow));
  }
  return runsByWorkflow;
}

function formatRunMetadata(run) {
  const id = run?.databaseId ?? "unknown";
  const event = run?.event ?? "unknown";
  const status = run?.status ?? "unknown";
  const conclusion = run?.conclusion ?? "unknown";
  const sha = run?.headSha ?? "unknown";
  const createdAt = run?.createdAt ?? "unknown";
  const url = run?.url ?? "unknown";

  return { id, event, status, conclusion, sha, createdAt, url };
}

function formatRunResult(required, runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      ready: false,
      line: `FAIL ${required.label}: no workflow_dispatch run found (${required.workflow})`,
    };
  }

  const latest = formatRunMetadata(runs[0]);
  if (latest.status !== "completed") {
    return {
      ready: false,
      line: `FAIL ${required.label}: latest run ${latest.id} is status=${latest.status} event=${latest.event} sha=${latest.sha} url=${latest.url}`,
    };
  }

  if (latest.conclusion !== "success") {
    return {
      ready: false,
      line: `FAIL ${required.label}: latest run ${latest.id} concluded ${latest.conclusion} event=${latest.event} sha=${latest.sha} createdAt=${latest.createdAt} url=${latest.url}`,
    };
  }

  return {
    ready: true,
    line: `PASS ${required.label}: latest run ${latest.id} concluded success event=${latest.event} sha=${latest.sha} createdAt=${latest.createdAt} url=${latest.url}`,
  };
}

function main() {
  const runsByWorkflow = readRunsByWorkflow();
  const results = REQUIRED_STAGING_RUNS.map((required) => formatRunResult(required, runsByWorkflow.get(required.workflow)));

  console.log("GitHub Actions staging proof latest runs");
  console.log("Workflow-dispatch run metadata was inspected. Secret values were not read, and no workflow was dispatched.");
  for (const result of results) {
    console.log(result.line);
  }

  if (results.some((result) => !result.ready)) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
