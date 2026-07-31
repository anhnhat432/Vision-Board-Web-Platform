import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { syncRoutes } from "../routes/syncRoutes";
import {
  TwelveWeekWorkspaceService,
  twelveWeekWorkspaceService,
  type TwelveWeekWorkspaceRepository,
  type WorkspaceDeleteResult,
  type WorkspaceExportResult,
} from "../services/twelveWeekWorkspaceService";
import { otherUserId, ownerUserId } from "./testHelpers";

// ---------------------------------------------------------------------------
// In-memory repository for tests
// ---------------------------------------------------------------------------

interface FakeRecord {
  id: string;
  userId: string;
  deletedAt?: string;
  title?: string;
  clientPlanId?: string;
  clientGoalId?: string;
}

function createInMemoryWorkspaceRepository() {
  const goals: FakeRecord[] = [];
  const plans: FakeRecord[] = [];
  const weeks: FakeRecord[] = [];
  const tasks: FakeRecord[] = [];
  const leadMetrics: FakeRecord[] = [];
  const dailyCheckIns: FakeRecord[] = [];
  const weeklyReviews: FakeRecord[] = [];

  function seedOwnerData(): void {
    goals.push({ id: "g1", userId: ownerUserId, title: "Owner goal", clientGoalId: "cg1" });
    plans.push({ id: "p1", userId: ownerUserId, clientPlanId: "cp1", clientGoalId: "cg1" });
    weeks.push({ id: "w1", userId: ownerUserId, clientPlanId: "cp1" });
    tasks.push({ id: "t1", userId: ownerUserId, clientPlanId: "cp1" });
    tasks.push({ id: "t2", userId: ownerUserId, clientPlanId: "cp1" });
    leadMetrics.push({ id: "lm1", userId: ownerUserId, clientPlanId: "cp1" });
    dailyCheckIns.push({ id: "dc1", userId: ownerUserId, clientPlanId: "cp1" });
    weeklyReviews.push({ id: "wr1", userId: ownerUserId, clientPlanId: "cp1" });
  }

  function seedOtherUserData(): void {
    goals.push({ id: "g2", userId: otherUserId, title: "Other goal", clientGoalId: "cg2" });
    plans.push({ id: "p2", userId: otherUserId, clientPlanId: "cp2", clientGoalId: "cg2" });
    weeks.push({ id: "w2", userId: otherUserId, clientPlanId: "cp2" });
    tasks.push({ id: "t3", userId: otherUserId, clientPlanId: "cp2" });
    dailyCheckIns.push({ id: "dc2", userId: otherUserId, clientPlanId: "cp2" });
    weeklyReviews.push({ id: "wr2", userId: otherUserId, clientPlanId: "cp2" });
  }

  const repository: TwelveWeekWorkspaceRepository = {
    async exportWorkspace(userId: string): Promise<WorkspaceExportResult> {
      const isActiveForUser = (record: FakeRecord) => record.userId === userId && !record.deletedAt;
      const userGoals = goals.filter(isActiveForUser);
      const userPlans = plans.filter(isActiveForUser);
      const userWeeks = weeks.filter(isActiveForUser);
      const userTasks = tasks.filter(isActiveForUser);
      const userLeadMetrics = leadMetrics.filter(isActiveForUser);
      const userDailyCheckIns = dailyCheckIns.filter(isActiveForUser);
      const userWeeklyReviews = weeklyReviews.filter(isActiveForUser);

      return {
        generatedAt: new Date().toISOString(),
        version: 1,
        userId,
        workspace: {
          goals: userGoals,
          plans: userPlans,
          weeks: userWeeks,
          tasks: userTasks,
          leadMetrics: userLeadMetrics,
          dailyCheckIns: userDailyCheckIns,
          weeklyReviews: userWeeklyReviews,
        },
        counts: {
          goals: userGoals.length,
          plans: userPlans.length,
          weeks: userWeeks.length,
          tasks: userTasks.length,
          leadMetrics: userLeadMetrics.length,
          dailyCheckIns: userDailyCheckIns.length,
          weeklyReviews: userWeeklyReviews.length,
        },
      };
    },
    async deleteWorkspace(userId: string): Promise<WorkspaceDeleteResult> {
      const countBefore = {
        goals: goals.filter((r) => r.userId === userId && !r.deletedAt).length,
        plans: plans.filter((r) => r.userId === userId && !r.deletedAt).length,
        weeks: weeks.filter((r) => r.userId === userId && !r.deletedAt).length,
        tasks: tasks.filter((r) => r.userId === userId && !r.deletedAt).length,
        leadMetrics: leadMetrics.filter((r) => r.userId === userId && !r.deletedAt).length,
        dailyCheckIns: dailyCheckIns.filter((r) => r.userId === userId && !r.deletedAt).length,
        weeklyReviews: weeklyReviews.filter((r) => r.userId === userId && !r.deletedAt).length,
      };

      const deletedAt = new Date().toISOString();
      const softDelete = (records: FakeRecord[]) => {
        records.forEach((record) => {
          if (record.userId === userId && !record.deletedAt) record.deletedAt = deletedAt;
        });
      };

      softDelete(tasks);
      softDelete(leadMetrics);
      softDelete(dailyCheckIns);
      softDelete(weeklyReviews);
      softDelete(weeks);
      softDelete(plans);
      softDelete(goals);

      return {
        deletedAt,
        policy: "soft_delete",
        counts: countBefore,
      };
    },
  };

  return { repository, goals, plans, weeks, tasks, leadMetrics, dailyCheckIns, weeklyReviews, seedOwnerData, seedOtherUserData };
}

// ---------------------------------------------------------------------------
// HTTP test helpers
// ---------------------------------------------------------------------------

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
    details?: unknown;
  };
}

function createRouteTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@example.com", emailVerified: true };
        if (token === "other-token") return { uid: otherUserId, email: "other@example.com", emailVerified: true };
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", syncRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  method: string,
  path: string,
  options: { body?: unknown; token?: string | null } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "owner-token"}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

type Restorer = () => void;

function replaceServiceRepo(repo: TwelveWeekWorkspaceRepository): Restorer {
  const original = (twelveWeekWorkspaceService as unknown as { repo: TwelveWeekWorkspaceRepository }).repo;
  (twelveWeekWorkspaceService as unknown as { repo: TwelveWeekWorkspaceRepository }).repo = repo;
  return () => {
    (twelveWeekWorkspaceService as unknown as { repo: TwelveWeekWorkspaceRepository }).repo = original;
  };
}

describe("GET /api/sync/12-week/workspace/export", () => {
  let app: Express;
  let restorer: Restorer;
  let store: ReturnType<typeof createInMemoryWorkspaceRepository>;

  beforeEach(() => {
    store = createInMemoryWorkspaceRepository();
    store.seedOwnerData();
    store.seedOtherUserData();
    restorer = replaceServiceRepo(store.repository);
    app = createRouteTestApp();
  });

  afterEach(() => {
    restorer();
  });

  it("returns 401 without auth token", async () => {
    const res = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: null });
    assert.equal(res.status, 401);
  });

  it("returns workspace for authenticated user only", async () => {
    const res = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "owner-token" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data as unknown as WorkspaceExportResult;
    assert.equal(data.version, 1);
    assert.equal(data.userId, ownerUserId);
    assert.ok(data.generatedAt);
    assert.equal(data.counts.goals, 1);
    assert.equal(data.counts.plans, 1);
    assert.equal(data.counts.weeks, 1);
    assert.equal(data.counts.tasks, 2);
    assert.equal(data.counts.leadMetrics, 1);
    assert.equal(data.counts.dailyCheckIns, 1);
    assert.equal(data.counts.weeklyReviews, 1);

    // Verify user isolation: no other user data in export
    const allGoalIds = (data.workspace.goals as Array<{ id: string }>).map((g) => g.id);
    assert.ok(!allGoalIds.includes("g2"), "Other user goal should not be in export");
  });

  it("user B export does not contain user A data", async () => {
    const res = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "other-token" });
    assert.equal(res.status, 200);

    const data = res.body.data as unknown as WorkspaceExportResult;
    assert.equal(data.userId, otherUserId);
    assert.equal(data.counts.goals, 1);
    assert.equal(data.counts.tasks, 1);

    const allGoalIds = (data.workspace.goals as Array<{ id: string }>).map((g) => g.id);
    assert.ok(!allGoalIds.includes("g1"), "Owner goal should not be in other user export");
  });

  it("returns empty workspace for user with no data", async () => {
    const emptyStore = createInMemoryWorkspaceRepository();
    restorer();
    restorer = replaceServiceRepo(emptyStore.repository);
    app = createRouteTestApp();

    const res = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "owner-token" });
    assert.equal(res.status, 200);

    const data = res.body.data as unknown as WorkspaceExportResult;
    assert.equal(data.counts.goals, 0);
    assert.equal(data.counts.plans, 0);
    assert.equal(data.counts.tasks, 0);
  });

  it("export excludes billing/subscription data", async () => {
    const res = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "owner-token" });
    const data = res.body.data as unknown as WorkspaceExportResult;
    const workspace = data.workspace as Record<string, unknown>;

    assert.equal(workspace.billing, undefined, "Export should not contain billing");
    assert.equal(workspace.subscription, undefined, "Export should not contain subscription");
    assert.equal(workspace.entitlements, undefined, "Export should not contain entitlements");
    assert.equal(workspace.analytics, undefined, "Export should not contain analytics");
  });
});

describe("DELETE /api/sync/12-week/workspace", () => {
  let app: Express;
  let restorer: Restorer;
  let store: ReturnType<typeof createInMemoryWorkspaceRepository>;

  beforeEach(() => {
    store = createInMemoryWorkspaceRepository();
    store.seedOwnerData();
    store.seedOtherUserData();
    restorer = replaceServiceRepo(store.repository);
    app = createRouteTestApp();
  });

  afterEach(() => {
    restorer();
  });

  it("returns 401 without auth token", async () => {
    const res = await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: null });
    assert.equal(res.status, 401);
  });

  it("deletes workspace for authenticated user", async () => {
    const res = await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: "owner-token" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data as unknown as WorkspaceDeleteResult;
    assert.equal(data.policy, "soft_delete");
    assert.ok(data.deletedAt);
    assert.equal(data.counts.goals, 1);
    assert.equal(data.counts.plans, 1);
    assert.equal(data.counts.weeks, 1);
    assert.equal(data.counts.tasks, 2);
    assert.equal(data.counts.leadMetrics, 1);
    assert.equal(data.counts.dailyCheckIns, 1);
    assert.equal(data.counts.weeklyReviews, 1);
    assert.equal(store.goals.filter((record) => record.userId === ownerUserId && Boolean(record.deletedAt)).length, 1);
  });

  it("user A delete does not affect user B workspace", async () => {
    // Delete owner's workspace
    await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: "owner-token" });

    // Verify owner data is gone
    assert.equal(store.goals.filter((r) => r.userId === ownerUserId && !r.deletedAt).length, 0);
    assert.equal(store.tasks.filter((r) => r.userId === ownerUserId && !r.deletedAt).length, 0);

    // Verify other user data is untouched
    assert.equal(store.goals.filter((r) => r.userId === otherUserId && !r.deletedAt).length, 1);
    assert.equal(store.plans.filter((r) => r.userId === otherUserId && !r.deletedAt).length, 1);
    assert.equal(store.tasks.filter((r) => r.userId === otherUserId && !r.deletedAt).length, 1);
    assert.equal(store.dailyCheckIns.filter((r) => r.userId === otherUserId && !r.deletedAt).length, 1);
    assert.equal(store.weeklyReviews.filter((r) => r.userId === otherUserId && !r.deletedAt).length, 1);
  });

  it("user A cannot delete user B workspace via their own token", async () => {
    // Owner deletes their own workspace
    await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: "owner-token" });

    // Other user workspace still exists
    const exportRes = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "other-token" });
    const data = exportRes.body.data as unknown as WorkspaceExportResult;
    assert.equal(data.counts.goals, 1, "Other user data should be untouched");
    assert.equal(data.counts.tasks, 1, "Other user tasks should be untouched");
  });

  it("delete returns zero counts when user has no data", async () => {
    const emptyStore = createInMemoryWorkspaceRepository();
    restorer();
    restorer = replaceServiceRepo(emptyStore.repository);
    app = createRouteTestApp();

    const res = await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: "owner-token" });
    assert.equal(res.status, 200);

    const data = res.body.data as unknown as WorkspaceDeleteResult;
    assert.equal(data.counts.goals, 0);
    assert.equal(data.counts.plans, 0);
    assert.equal(data.counts.tasks, 0);
  });

  it("export after delete returns empty workspace", async () => {
    await requestJson(app, "DELETE", "/api/sync/12-week/workspace", { token: "owner-token" });

    const exportRes = await requestJson(app, "GET", "/api/sync/12-week/workspace/export", { token: "owner-token" });
    const data = exportRes.body.data as unknown as WorkspaceExportResult;
    assert.equal(data.counts.goals, 0);
    assert.equal(data.counts.plans, 0);
    assert.equal(data.counts.tasks, 0);
  });
});
