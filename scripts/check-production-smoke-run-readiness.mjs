#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const injectedRunJson = process.env.GITHUB_PRODUCTION_SMOKE_RUN_JSON;
const injectedLocalStateJson = process.env.GITHUB_PRODUCTION_SMOKE_LOCAL_STATE_JSON;

const RELEVANT_LOCAL_FILES = [
  "scripts/smoke-production-e2e.mjs",
  "scripts/smoke-production-quick.mjs",
  ".github/workflows/production-smoke-e2e.yml",
];

function readRunListJson() {
  if (injectedRunJson) return injectedRunJson;

  const ghCandidates = process.platform === "win32" ? ["gh", "gh.cmd", "gh.exe"] : ["gh"];
  let result = null;
  let commandNotFound = true;

  for (const candidate of ghCandidates) {
    const nextResult = spawnSync(
      candidate,
      ["run", "list", "--workflow", "production-smoke-e2e.yml", "--limit", "1", "--json", "databaseId,headSha,status,conclusion,event,createdAt,url"],
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
        "Could not read production smoke run metadata with `gh run list --workflow production-smoke-e2e.yml --limit 1 --json ...`.",
        "Run `gh auth login` and retry from the repository root.",
        stderr ? `gh stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
}

function parseRunList(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse production smoke run list JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Production smoke run list JSON must be an array.");
  }

  return parsed;
}

function readGitText(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return (result.stdout ?? "").trim();
}

function parseLocalState(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse production smoke local state JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Production smoke local state JSON must be an object.");
  }

  return {
    headSha: typeof parsed.headSha === "string" && parsed.headSha.trim() ? parsed.headSha.trim() : "unknown",
    cachedFiles: Array.isArray(parsed.cachedFiles)
      ? parsed.cachedFiles.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())
      : [],
    changedFiles: Array.isArray(parsed.changedFiles)
      ? parsed.changedFiles.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())
      : [],
  };
}

function readLocalState() {
  if (injectedLocalStateJson) {
    return parseLocalState(injectedLocalStateJson);
  }

  const headSha = readGitText(["rev-parse", "HEAD"]) ?? "unknown";
  const cachedOutput = readGitText(["diff", "--cached", "--name-only", "--", ...RELEVANT_LOCAL_FILES]) ?? "";
  const changedOutput = readGitText(["diff", "--name-only", "--", ...RELEVANT_LOCAL_FILES]) ?? "";

  return {
    headSha,
    cachedFiles: cachedOutput
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    changedFiles: changedOutput
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function formatRunMetadata(run) {
  const id = run.databaseId ?? "unknown";
  const event = run.event ?? "unknown";
  const status = run.status ?? "unknown";
  const conclusion = run.conclusion ?? "unknown";
  const sha = run.headSha ?? "unknown";
  const createdAt = run.createdAt ?? "unknown";
  const url = run.url ?? "unknown";

  return { id, event, status, conclusion, sha, createdAt, url };
}

function main() {
  const runs = parseRunList(readRunListJson());
  const localState = readLocalState();

  console.log("GitHub Actions production smoke latest run");
  console.log("Default-branch run metadata and local git state were inspected. No workflow was dispatched.");

  if (runs.length === 0) {
    console.log("FAIL Production smoke latest run: no run metadata found for production-smoke-e2e.yml");
    process.exitCode = 1;
    return;
  }

  const latest = formatRunMetadata(runs[0]);

  if (latest.status !== "completed") {
    console.log(
      `FAIL Production smoke latest run: latest run ${latest.id} is status=${latest.status} event=${latest.event} sha=${latest.sha} url=${latest.url}`,
    );
    process.exitCode = 1;
    return;
  }

  if (latest.conclusion !== "success") {
    console.log(
      `FAIL Production smoke latest run: latest run ${latest.id} concluded ${latest.conclusion} event=${latest.event} sha=${latest.sha} createdAt=${latest.createdAt} url=${latest.url}`,
    );
    const localMitigationFiles = uniqueValues([...localState.cachedFiles, ...localState.changedFiles]);
    if (localMitigationFiles.length > 0 && latest.sha === localState.headSha) {
      const stateLabel = localState.changedFiles.length > 0 ? "present but unpublished" : "staged but unpublished";
      console.log(
        `NOTE Production smoke local mitigation is ${stateLabel}: ${localMitigationFiles.join(", ")}. The failed run was on HEAD before these local changes reached default branch.`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS Production smoke latest run: run ${latest.id} concluded success event=${latest.event} sha=${latest.sha} createdAt=${latest.createdAt} url=${latest.url}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
