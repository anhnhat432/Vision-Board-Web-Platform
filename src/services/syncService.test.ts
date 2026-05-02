import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  get: apiClientMock.get,
  post: apiClientMock.post,
}));

import { post12WeekImportValidation, post12WeekMutations, pullTwelveWeekWorkspace } from "./syncService";

describe("syncService", () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
  });

  it("posts queued 12-week mutations to the mutation endpoint", async () => {
    apiClientMock.post.mockResolvedValueOnce({ status: "accepted" });

    await post12WeekMutations({
      batchId: "batch_1",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [],
    });

    expect(apiClientMock.post).toHaveBeenCalledWith("/sync/12-week/mutations", {
      batchId: "batch_1",
      clientGeneratedAt: "2026-04-30T00:00:00.000Z",
      mutations: [],
    });
  });

  it("posts 12-week import dry-run payloads to the validate endpoint", async () => {
    apiClientMock.post.mockResolvedValueOnce({
      status: "valid",
      mode: "validate_only",
      dryRun: true,
      acceptedEntityCounts: {
        goals: 1,
        plans: 1,
        weeks: 1,
        tasks: 0,
        leadIndicators: 0,
        leadMetrics: 0,
        dailyCheckIns: 0,
        weeklyReviews: 0,
      },
      warnings: [],
      errors: [],
      normalizedClientIdsCount: 3,
    });

    const request = {
      requestId: "import_validate_test",
      idempotencyKey: "account_scope_import_dry_run:import_validate_test",
      source: "account_scope_import_dry_run" as const,
      mode: "validate_only" as const,
      workspace: {
        goals: [],
      },
    };
    const result = await post12WeekImportValidation(request);

    expect(result.status).toBe("valid");
    expect(apiClientMock.post).toHaveBeenCalledWith("/sync/12-week/import/validate", request);
  });

  it("pulls the 12-week workspace with encoded optional query params", async () => {
    apiClientMock.get.mockResolvedValueOnce({
      serverTime: "2026-05-01T00:00:00.000Z",
      mode: "full",
      cursor: null,
      nextCursor: null,
      hasMore: false,
      warnings: [],
      workspace: {
        goals: [],
        plans: [],
        weeks: [],
        tasks: [],
        leadMetrics: [],
        dailyCheckIns: [],
        weeklyReviews: [],
      },
      changes: {
        goals: [],
        plans: [],
        weeks: [],
        tasks: [],
        leadMetrics: [],
        dailyCheckIns: [],
        weeklyReviews: [],
      },
      tombstones: {
        goals: [],
        plans: [],
        weeks: [],
        tasks: [],
        leadMetrics: [],
        dailyCheckIns: [],
        weeklyReviews: [],
      },
      counts: {
        goals: 0,
        plans: 0,
        weeks: 0,
        tasks: 0,
        leadMetrics: 0,
        dailyCheckIns: 0,
        weeklyReviews: 0,
      },
    });

    const result = await pullTwelveWeekWorkspace({
      cursor: "sync cursor 1",
      clientPlanId: "goal_1:12-week-system",
    });

    expect(result.mode).toBe("full");
    expect(apiClientMock.get).toHaveBeenCalledWith(
      "/sync/12-week/pull?cursor=sync+cursor+1&clientPlanId=goal_1%3A12-week-system",
    );
  });
});
