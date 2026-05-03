import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { syncRoutes } from "../routes/syncRoutes";
import {
  createTwelveWeekPullCursor,
  TwelveWeekPullService,
  twelveWeekPullService,
  type PullDailyCheckInSource,
  type PullGoalSource,
  type PullLeadMetricSource,
  type PullPlanSource,
  type PullTaskSource,
  type PullWeekSource,
  type PullWeeklyReviewSource,
  type TwelveWeekPullRepository,
  type TwelveWeekPullResult,
} from "../services/twelveWeekPullService";
import { otherUserId, ownerUserId } from "./testHelpers";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: unknown;
    details?: unknown;
  };
}

type Restorer = () => void;

const ownerPlanClientId = "goal_local_1:12-week-system";
const ownerWeekClientId = "goal_local_1:week:1";

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): Restorer {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createPullRepository(): TwelveWeekPullRepository {
  const baseSyncTime = new Date("2026-04-30T01:00:00.000Z");
  const deletedTaskSyncTime = new Date("2026-04-30T01:20:00.000Z");
  const taskSyncTime = new Date("2026-04-30T02:00:00.000Z");
  const goals: PullGoalSource[] = [
    {
      _id: "goal_owner_1",
      userId: ownerUserId,
      clientGoalId: "goal_local_1",
      title: "Launch portfolio",
      category: "Career",
      description: "Ship the MVP 1 demo.",
      deadline: new Date("2026-07-22T00:00:00.000Z"),
      status: "active",
      focusArea: "Career",
      readinessScore: 82,
      planId: "plan_owner_1",
      revision: 2,
      syncUpdatedAt: baseSyncTime,
    },
    {
      _id: "goal_other_1",
      userId: otherUserId,
      clientGoalId: "goal_local_1",
      title: "Other user private goal",
      category: "Career",
      description: "Must not leak.",
      deadline: new Date("2026-07-22T00:00:00.000Z"),
      status: "active",
      planId: "plan_other_1",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const plans: PullPlanSource[] = [
    {
      _id: "plan_owner_1",
      userId: ownerUserId,
      smartGoalId: "goal_owner_1",
      clientGoalId: "goal_local_1",
      clientPlanId: ownerPlanClientId,
      vision: "A clear public demo loop.",
      startDate: new Date("2026-04-30T00:00:00.000Z"),
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
    {
      _id: "plan_other_1",
      userId: otherUserId,
      smartGoalId: "goal_other_1",
      clientGoalId: "goal_local_1",
      clientPlanId: ownerPlanClientId,
      vision: "Other user plan",
      startDate: new Date("2026-04-30T00:00:00.000Z"),
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const weeks: PullWeekSource[] = [
    {
      _id: "week_owner_1",
      planId: "plan_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      weekNumber: 1,
      focus: "Validate demo clarity",
      expectedOutput: "Three tester notes",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
    {
      _id: "week_other_1",
      planId: "plan_other_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      weekNumber: 1,
      focus: "Other user focus",
      expectedOutput: "Other output",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const tasks: PullTaskSource[] = [
    {
      _id: "task_owner_1",
      weekId: "week_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientTaskId: "task_local_1",
      weekNumber: 1,
      title: "Run one user test",
      status: "done",
      completedAt: new Date("2026-04-30T02:00:00.000Z"),
      isCore: true,
      revision: 3,
      syncUpdatedAt: taskSyncTime,
    },
    {
      _id: "task_deleted_1",
      weekId: "week_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientTaskId: "task_deleted_1",
      weekNumber: 1,
      title: "Deleted task",
      status: "todo",
      revision: 4,
      deletedAt: deletedTaskSyncTime,
      syncUpdatedAt: deletedTaskSyncTime,
    },
    {
      _id: "task_other_1",
      weekId: "week_other_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientTaskId: "task_local_1",
      weekNumber: 1,
      title: "Other private task",
      status: "todo",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const leadMetrics: PullLeadMetricSource[] = [
    {
      _id: "metric_owner_1",
      weekId: "week_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientMetricId: "metric_owner_1",
      leadIndicatorId: "lead_1",
      name: "User tests",
      weeklyTarget: 3,
      unit: "tests/week",
      logs: [{ _id: "metric_log_1", date: new Date("2026-04-30T00:00:00.000Z"), value: 1, completed: true }],
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const dailyCheckIns: PullDailyCheckInSource[] = [
    {
      _id: "checkin_owner_1",
      userId: ownerUserId,
      planId: "plan_owner_1",
      weekId: "week_owner_1",
      clientGoalId: "goal_local_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientCheckInId: `${ownerPlanClientId}:checkin:2026-04-30`,
      weekNumber: 1,
      localDate: "2026-04-30",
      didWorkToday: true,
      amountDone: "One user test",
      outputCreated: "Interview notes",
      mood: "steady",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];
  const weeklyReviews: PullWeeklyReviewSource[] = [
    {
      _id: "review_owner_1",
      userId: ownerUserId,
      planId: "plan_owner_1",
      weekId: "week_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientReviewId: `${ownerPlanClientId}:review:1`,
      weekNumber: 1,
      executionScore: 82,
      leadCompletionPercent: 75,
      biggestOutputThisWeek: "One tester completed the loop",
      nextWeekPriority: "Shorten setup copy",
      reviewCompleted: true,
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
    {
      _id: "review_mismatched_user_1",
      userId: otherUserId,
      planId: "plan_other_1",
      weekId: "week_owner_1",
      clientPlanId: ownerPlanClientId,
      clientWeekId: ownerWeekClientId,
      clientReviewId: `${ownerPlanClientId}:review:mismatched`,
      weekNumber: 1,
      executionScore: 10,
      biggestOutputThisWeek: "Mismatched user review must not leak",
      revision: 1,
      syncUpdatedAt: baseSyncTime,
    },
  ];

  return {
    async listWorkspace(userId, filters) {
      const userPlans = plans.filter((plan) => {
        if (plan.userId !== userId) return false;
        if (filters.clientPlanId && plan.clientPlanId !== filters.clientPlanId) return false;
        return true;
      });
      const planIds = new Set(userPlans.map((plan) => plan._id.toString()));
      const userWeeks = weeks.filter((week) => planIds.has(week.planId.toString()));
      const weekIds = new Set(userWeeks.map((week) => week._id.toString()));
      const clientGoalIds = new Set(userPlans.map((plan) => plan.clientGoalId).filter(Boolean));

      return {
        goals: goals.filter((goal) => {
          if (goal.userId !== userId) return false;
          if (!filters.clientPlanId) return true;
          return planIds.has(goal.planId ?? "") || clientGoalIds.has(goal.clientGoalId);
        }),
        plans: userPlans,
        weeks: userWeeks,
        tasks: tasks.filter((task) => weekIds.has(task.weekId.toString())),
        leadMetrics: leadMetrics.filter((metric) => weekIds.has(metric.weekId.toString())),
        dailyCheckIns: dailyCheckIns.filter((checkIn) => checkIn.userId === userId && planIds.has(checkIn.planId.toString())),
        weeklyReviews: weeklyReviews.filter((review) => {
          if (review.userId !== userId) return false;
          return weekIds.has(review.weekId.toString());
        }),
      };
    },
  };
}

function installPullServiceMock(): Restorer {
  const routedService = new TwelveWeekPullService(createPullRepository());
  return replaceMethod(
    twelveWeekPullService,
    "pullWorkspace",
    routedService.pullWorkspace.bind(routedService),
  );
}

function createRouteTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@example.com" };
        if (token === "other-token") return { uid: otherUserId, email: "other@example.com" };
        if (token === "fresh-token") return { uid: "user_fresh", email: "fresh@example.com" };
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
  options: { token?: string | null } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "owner-token"}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
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

function getPullResult(response: JsonResponse): TwelveWeekPullResult {
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  return response.body.data as TwelveWeekPullResult;
}

describe("12-week pull route", () => {
  let restorePullService: Restorer;

  beforeEach(() => {
    restorePullService = installPullServiceMock();
  });

  afterEach(() => {
    restorePullService();
  });

  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull", {
      token: null,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /Unauthorized/i);
  });

  it("returns an empty workspace for a fresh authenticated user", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull", {
      token: "fresh-token",
    });
    const data = getPullResult(response);

    assert.deepEqual(data.counts, {
      goals: 0,
      plans: 0,
      weeks: 0,
      tasks: 0,
      leadMetrics: 0,
      dailyCheckIns: 0,
      weeklyReviews: 0,
    });
    assert.deepEqual(data.workspace.goals, []);
    assert.equal(data.cursorStatus, "not_provided");
  });

  it("returns imported goal, plan, weeks, tasks, metrics, check-ins, and reviews", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull");
    const data = getPullResult(response);

    assert.equal(data.workspace.goals[0].clientGoalId, "goal_local_1");
    assert.equal(data.workspace.plans[0].clientPlanId, ownerPlanClientId);
    assert.equal(data.workspace.weeks[0].clientWeekId, ownerWeekClientId);
    assert.equal(data.workspace.tasks[0].clientTaskId, "task_local_1");
    assert.equal(data.workspace.tasks[0].completedAt, "2026-04-30T02:00:00.000Z");
    assert.equal(data.workspace.leadMetrics[0].clientMetricId, "metric_owner_1");
    assert.equal(data.workspace.dailyCheckIns[0].amountDone, "One user test");
    assert.equal(data.workspace.weeklyReviews[0].leadCompletionPercent, 75);
    assert.deepEqual(data.workspace, data.changes);
    assert.equal(data.hasMore, false);
    assert.match(data.nextCursor, /^twpc_v1_/);
    assert.equal(data.cursorStatus, "not_provided");
  });

  it("returns only changed task records for an incremental pull cursor", async () => {
    const cursor = createTwelveWeekPullCursor("2026-04-30T01:30:00.000Z");
    const response = await requestJson(
      createRouteTestApp(),
      "GET",
      `/api/sync/12-week/pull?cursor=${encodeURIComponent(cursor)}`,
    );
    const data = getPullResult(response);

    assert.equal(data.mode, "delta");
    assert.equal(data.cursor, cursor);
    assert.match(data.nextCursor, /^twpc_v1_/);
    assert.equal(data.cursorStatus, "applied");
    assert.deepEqual(data.workspace.goals, []);
    assert.deepEqual(data.workspace.plans, []);
    assert.deepEqual(data.workspace.weeks, []);
    assert.equal(data.workspace.tasks.length, 1);
    assert.equal(data.workspace.tasks[0].clientTaskId, "task_local_1");
    assert.deepEqual(data.workspace.dailyCheckIns, []);
    assert.deepEqual(data.workspace.weeklyReviews, []);
    assert.deepEqual(data.tombstones.tasks, []);
  });

  it("includes supported daily check-in and weekly review changes in incremental pulls", async () => {
    const dailyReviewSyncTime = new Date("2026-04-30T02:05:00.000Z");
    const repository = createPullRepository();
    const service = new TwelveWeekPullService({
      async listWorkspace(userId, filters) {
        const workspace = await repository.listWorkspace(userId, filters);
        return {
          ...workspace,
          tasks: [],
          dailyCheckIns: workspace.dailyCheckIns.map((checkIn) => ({
            ...checkIn,
            syncUpdatedAt: dailyReviewSyncTime,
          })),
          weeklyReviews: workspace.weeklyReviews.map((review) => ({
            ...review,
            syncUpdatedAt: dailyReviewSyncTime,
          })),
        };
      },
    });
    const cursor = createTwelveWeekPullCursor("2026-04-30T02:00:00.000Z");
    const data = await service.pullWorkspace(ownerUserId, { cursor });

    assert.equal(data.mode, "delta");
    assert.equal(data.workspace.dailyCheckIns.length, 1);
    assert.equal(data.workspace.dailyCheckIns[0].clientCheckInId, `${ownerPlanClientId}:checkin:2026-04-30`);
    assert.equal(data.workspace.weeklyReviews.length, 1);
    assert.equal(data.workspace.weeklyReviews[0].clientReviewId, `${ownerPlanClientId}:review:1`);
  });

  it("includes tombstones for deleted records changed since the cursor", async () => {
    const cursor = createTwelveWeekPullCursor("2026-04-30T01:10:00.000Z");
    const response = await requestJson(
      createRouteTestApp(),
      "GET",
      `/api/sync/12-week/pull?cursor=${encodeURIComponent(cursor)}`,
    );
    const data = getPullResult(response);

    assert.equal(data.mode, "delta");
    assert.equal(data.tombstones.tasks.length, 1);
    assert.equal(data.tombstones.tasks[0].clientId, "task_deleted_1");
    assert.equal(data.tombstones.tasks[0].deletedAt, "2026-04-30T01:20:00.000Z");
    assert.equal(JSON.stringify(data.workspace.tasks).includes("task_deleted_1"), false);
  });

  it("does not leak another user's workspace, even with the same clientPlanId", async () => {
    const ownerResponse = await requestJson(
      createRouteTestApp(),
      "GET",
      `/api/sync/12-week/pull?clientPlanId=${encodeURIComponent(ownerPlanClientId)}`,
      { token: "owner-token" },
    );
    const otherResponse = await requestJson(
      createRouteTestApp(),
      "GET",
      `/api/sync/12-week/pull?clientPlanId=${encodeURIComponent(ownerPlanClientId)}`,
      { token: "other-token" },
    );
    const ownerData = getPullResult(ownerResponse);
    const otherData = getPullResult(otherResponse);
    const ownerSerialized = JSON.stringify(ownerData.workspace);
    const otherSerialized = JSON.stringify(otherData.workspace);

    assert.equal(ownerData.workspace.plans[0].id, "plan_owner_1");
    assert.equal(otherData.workspace.plans[0].id, "plan_other_1");
    assert.equal(ownerSerialized.includes("goal_other_1"), false);
    assert.equal(ownerSerialized.includes("Other user private goal"), false);
    assert.equal(otherSerialized.includes("goal_owner_1"), false);
    assert.equal(otherSerialized.includes("Run one user test"), false);
  });

  it("does not leak weekly reviews that have another userId even if weekId matches", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull", {
      token: "owner-token",
    });
    const data = getPullResult(response);
    const serialized = JSON.stringify(data.workspace.weeklyReviews);

    assert.equal(data.workspace.weeklyReviews.length, 1);
    assert.equal(serialized.includes("Mismatched user review must not leak"), false);
    assert.equal(serialized.includes("review_mismatched_user_1"), false);
  });

  it("reports invalid cursors so clients can retry with a full pull", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull?cursor=sync_cursor_old");

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal((response.body as { errorCode?: string }).errorCode, "invalid_cursor");
    assert.deepEqual(response.body.details, {
      code: "cursor_invalid",
      message: "Cursor prefix is not recognized.",
    });
  });

  it("does not include analytics, billing, entitlement, or mock checkout fields", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/sync/12-week/pull");
    const data = getPullResult(response);
    const serialized = JSON.stringify(data);

    assert.equal(serialized.includes("eventLog"), false);
    assert.equal(serialized.includes("syncOutbox"), false);
    assert.equal(serialized.includes("billing"), false);
    assert.equal(serialized.includes("subscription"), false);
    assert.equal(serialized.includes("entitlement"), false);
    assert.equal(serialized.includes("mockCheckout"), false);
  });
});
