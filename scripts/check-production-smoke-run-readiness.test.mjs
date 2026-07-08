import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-production-smoke-run-readiness.mjs");

function runSmokeReadiness(runJson, localStateJson) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_PRODUCTION_SMOKE_RUN_JSON: runJson,
      GITHUB_PRODUCTION_SMOKE_LOCAL_STATE_JSON: localStateJson,
    },
  });
}

describe("check-production-smoke-run-readiness", () => {
  it("passes when the latest production smoke run completed successfully", () => {
    const result = runSmokeReadiness(
      JSON.stringify([
        {
          databaseId: 30000000001,
          status: "completed",
          conclusion: "success",
          event: "workflow_dispatch",
          headSha: "abc123",
          createdAt: "2026-06-27T10:00:00Z",
          url: "https://github.com/example/repo/actions/runs/30000000001",
        },
      ]),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Default-branch run metadata and local git state were inspected. No workflow was dispatched.");
    expect(result.stdout).toContain("PASS Production smoke latest run: run 30000000001 concluded success");
  });

  it("blocks when the latest production smoke run failed", () => {
    const result = runSmokeReadiness(
      JSON.stringify([
        {
          databaseId: 28218523067,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
          createdAt: "2026-06-26T05:09:31Z",
          url: "https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067",
        },
      ]),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Production smoke latest run: latest run 28218523067 concluded failure");
    expect(result.stdout).toContain("https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067");
  });

  it("notes unpublished staged mitigation when the failed run matches HEAD", () => {
    const result = runSmokeReadiness(
      JSON.stringify([
        {
          databaseId: 28218523067,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
          createdAt: "2026-06-26T05:09:31Z",
          url: "https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28218523067",
        },
      ]),
      JSON.stringify({
        headSha: "4fbdb3b6088e5c944554af90857b58c7205cf30d",
        cachedFiles: ["scripts/smoke-production-e2e.mjs", ".github/workflows/production-smoke-e2e.yml"],
      }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("NOTE Production smoke local mitigation is staged but unpublished");
    expect(result.stdout).toContain("scripts/smoke-production-e2e.mjs");
    expect(result.stdout).toContain(".github/workflows/production-smoke-e2e.yml");
  });

  it("notes unpublished working-tree mitigation when the failed run matches HEAD", () => {
    const result = runSmokeReadiness(
      JSON.stringify([
        {
          databaseId: 28842465390,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          headSha: "f6b4f94f8add78a30e95dedeb38fee63f82cdc10",
          createdAt: "2026-07-07T04:52:52Z",
          url: "https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/28842465390",
        },
      ]),
      JSON.stringify({
        headSha: "f6b4f94f8add78a30e95dedeb38fee63f82cdc10",
        cachedFiles: [],
        workingFiles: ["src/app/components/twelve-week/TwelveWeekTodayTab.tsx"],
        untrackedFiles: ["docs/specs/2026-07-06-production-smoke-today-task-toggle.md"],
      }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("NOTE Production smoke local mitigation exists in the working tree but is unpublished");
    expect(result.stdout).toContain("src/app/components/twelve-week/TwelveWeekTodayTab.tsx");
    expect(result.stdout).toContain("docs/specs/2026-07-06-production-smoke-today-task-toggle.md");
  });

  it("blocks when the latest production smoke run is still in progress", () => {
    const result = runSmokeReadiness(
      JSON.stringify([
        {
          databaseId: 30000000002,
          status: "in_progress",
          conclusion: "",
          event: "workflow_dispatch",
          headSha: "def456",
          createdAt: "2026-06-27T11:00:00Z",
          url: "https://github.com/example/repo/actions/runs/30000000002",
        },
      ]),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Production smoke latest run: latest run 30000000002 is status=in_progress");
  });

  it("blocks when there is no run metadata", () => {
    const result = runSmokeReadiness(JSON.stringify([]));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL Production smoke latest run: no run metadata found");
  });

  it("returns tool error when run metadata JSON is invalid", () => {
    const result = runSmokeReadiness("not-json");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Could not parse production smoke run list JSON");
  });
});
