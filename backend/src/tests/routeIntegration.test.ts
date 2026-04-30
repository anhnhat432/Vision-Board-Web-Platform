import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { goalRoutes } from "../routes/goalRoutes";
import { metricRoutes } from "../routes/metricRoutes";
import { planRoutes } from "../routes/planRoutes";
import { taskRoutes } from "../routes/taskRoutes";
import { weekRoutes } from "../routes/weekRoutes";
import { GoalService, goalService } from "../services/goalService";
import { MetricService, metricService } from "../services/metricService";
import { PlanService, planService } from "../services/planService";
import { TaskService, taskService } from "../services/taskService";
import { WeekService, weekService } from "../services/weekService";
import { ids, otherUserId, ownerUserId } from "./testHelpers";

const now = new Date("2026-01-01T00:00:00.000Z");

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

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): Restorer {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createGoalRepository() {
  const goals = new Map([
    [
      ids.goal,
      {
        id: ids.goal,
        userId: ownerUserId,
        title: "Owner goal",
        category: "Career",
        description: "Build product",
        deadline: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherGoal,
      {
        id: ids.otherGoal,
        userId: otherUserId,
        title: "Private other goal",
        category: "Health",
        description: "Should not leak",
        deadline: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  return {
    async createGoal(data: Record<string, unknown>) {
      const goal = {
        id: "507f1f77bcf86cd799439091",
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      goals.set(goal.id, goal as never);
      return goal;
    },
    async getGoalById(id: string) {
      return goals.get(id) ?? null;
    },
    async getGoalsByUserId(userId: string) {
      return [...goals.values()].filter((goal) => goal.userId === userId);
    },
    async updateGoal(id: string, updates: Record<string, unknown>) {
      const goal = goals.get(id);
      if (!goal) return null;
      const updated = { ...goal, ...updates, updatedAt: now };
      goals.set(id, updated as never);
      return updated;
    },
    async deleteGoal(id: string) {
      return goals.delete(id);
    },
  };
}

function createBackendFixture() {
  const plans = new Map([
    [
      ids.plan,
      {
        id: ids.plan,
        userId: ownerUserId,
        vision: "Owner plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherPlan,
      {
        id: ids.otherPlan,
        userId: otherUserId,
        vision: "Private other plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const weeks = new Map([
    [
      ids.week,
      {
        id: ids.week,
        planId: ids.plan,
        weekNumber: 1,
        focus: "Owner week",
        expectedOutput: "Owner output",
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherWeek,
      {
        id: ids.otherWeek,
        planId: ids.otherPlan,
        weekNumber: 1,
        focus: "Private other week",
        expectedOutput: "Should not leak",
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const tasks = new Map([
    [
      ids.task,
      {
        id: ids.task,
        weekId: ids.week,
        title: "Owner task",
        status: "todo" as const,
        scheduledDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherTask,
      {
        id: ids.otherTask,
        weekId: ids.otherWeek,
        title: "Private other task",
        status: "todo" as const,
        scheduledDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const metrics = new Map([
    [
      ids.metric,
      {
        id: ids.metric,
        weekId: ids.week,
        name: "Owner metric",
        weeklyTarget: 3,
        logs: [
          {
            id: ids.metricLog,
            date: now,
            value: 1,
            completed: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherMetric,
      {
        id: ids.otherMetric,
        weekId: ids.otherWeek,
        name: "Private other metric",
        weeklyTarget: 1,
        logs: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const planRepository = {
    async createPlan(data: Record<string, unknown>) {
      const plan = {
        id: "507f1f77bcf86cd799439092",
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      plans.set(plan.id, plan as never);
      return plan;
    },
    async getPlanById(id: string) {
      return plans.get(id) ?? null;
    },
    async getPlansByUserId(userId: string) {
      return [...plans.values()].filter((plan) => plan.userId === userId);
    },
    async updatePlan(id: string, updates: Record<string, unknown>) {
      const plan = plans.get(id);
      if (!plan) return null;
      const updated = { ...plan, ...updates, updatedAt: now };
      plans.set(id, updated as never);
      return updated;
    },
  };

  const weekRepository = {
    async createWeek(data: Record<string, unknown>) {
      const week = {
        id: `507f1f77bcf86cd7994390${weeks.size + 60}`,
        focus: "",
        expectedOutput: "",
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      weeks.set(week.id, week as never);
      return week;
    },
    async getWeekById(id: string) {
      return weeks.get(id) ?? null;
    },
    async getWeeksByPlanId(planId: string) {
      return [...weeks.values()].filter((week) => week.planId === planId);
    },
    async updateWeek(id: string, updates: Record<string, unknown>) {
      const week = weeks.get(id);
      if (!week) return null;
      const updated = { ...week, ...updates, updatedAt: now };
      weeks.set(id, updated as never);
      return updated;
    },
    async submitWeeklyReview(id: string, review: Record<string, unknown>) {
      const week = weeks.get(id);
      if (!week) return null;
      const updated = { ...week, review, updatedAt: now };
      weeks.set(id, updated as never);
      return updated;
    },
  };

  const taskRepository = {
    async addTask(data: Record<string, unknown>) {
      const task = {
        id: `507f1f77bcf86cd7994390${tasks.size + 70}`,
        status: "todo",
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      tasks.set(task.id, task as never);
      return task;
    },
    async getTaskById(id: string) {
      return tasks.get(id) ?? null;
    },
    async getTasksByWeekId(weekId: string) {
      return [...tasks.values()].filter((task) => task.weekId === weekId);
    },
    async updateTask(id: string, updates: Record<string, unknown>) {
      const task = tasks.get(id);
      if (!task) return null;
      const updated = { ...task, ...updates, updatedAt: now };
      tasks.set(id, updated as never);
      return updated;
    },
    async deleteTask(id: string) {
      return tasks.delete(id);
    },
  };

  const metricRepository = {
    async createMetric(data: Record<string, unknown>) {
      const metric = {
        id: `507f1f77bcf86cd7994390${metrics.size + 80}`,
        logs: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      metrics.set(metric.id, metric as never);
      return metric;
    },
    async getMetricById(id: string) {
      return metrics.get(id) ?? null;
    },
    async getMetricsByWeekId(weekId: string) {
      return [...metrics.values()].filter((metric) => metric.weekId === weekId);
    },
    async logMetric(metricId: string, log: Record<string, unknown>) {
      const metric = metrics.get(metricId);
      if (!metric) return null;
      const updated = {
        ...metric,
        logs: [...metric.logs, { id: "507f1f77bcf86cd799439099", ...log }],
        updatedAt: now,
      };
      metrics.set(metricId, updated as never);
      return updated;
    },
    async updateMetricLog(metricId: string, logId: string, updates: Record<string, unknown>) {
      const metric = metrics.get(metricId);
      if (!metric) return null;
      const logIndex = metric.logs.findIndex((log) => log.id === logId);
      if (logIndex === -1) return null;
      const updated = {
        ...metric,
        logs: metric.logs.map((log) => (log.id === logId ? { ...log, ...updates } : log)),
        updatedAt: now,
      };
      metrics.set(metricId, updated as never);
      return updated;
    },
  };

  return {
    goalRepository: createGoalRepository(),
    planRepository,
    weekRepository,
    taskRepository,
    metricRepository,
  };
}

function installServiceMocks(): Restorer {
  const fixture = createBackendFixture();
  const routedGoalService = new GoalService(fixture.goalRepository as never);
  const routedPlanService = new PlanService(
    fixture.planRepository as never,
    fixture.weekRepository as never,
    fixture.taskRepository as never,
    fixture.metricRepository as never,
  );
  const routedWeekService = new WeekService(fixture.planRepository as never, fixture.weekRepository as never);
  const routedTaskService = new TaskService(
    fixture.planRepository as never,
    fixture.weekRepository as never,
    fixture.taskRepository as never,
  );
  const routedMetricService = new MetricService(
    fixture.planRepository as never,
    fixture.weekRepository as never,
    fixture.metricRepository as never,
  );

  const restorers = [
    replaceMethod(goalService, "createGoal", routedGoalService.createGoal.bind(routedGoalService)),
    replaceMethod(goalService, "getUserGoals", routedGoalService.getUserGoals.bind(routedGoalService)),
    replaceMethod(goalService, "getGoal", routedGoalService.getGoal.bind(routedGoalService)),
    replaceMethod(goalService, "updateGoal", routedGoalService.updateGoal.bind(routedGoalService)),
    replaceMethod(goalService, "deleteGoal", routedGoalService.deleteGoal.bind(routedGoalService)),
    replaceMethod(planService, "createPlanForUser", routedPlanService.createPlanForUser.bind(routedPlanService)),
    replaceMethod(planService, "getUserPlans", routedPlanService.getUserPlans.bind(routedPlanService)),
    replaceMethod(planService, "getPlanDetails", routedPlanService.getPlanDetails.bind(routedPlanService)),
    replaceMethod(planService, "updatePlan", routedPlanService.updatePlan.bind(routedPlanService)),
    replaceMethod(weekService, "getWeeksForPlan", routedWeekService.getWeeksForPlan.bind(routedWeekService)),
    replaceMethod(weekService, "updateWeek", routedWeekService.updateWeek.bind(routedWeekService)),
    replaceMethod(weekService, "submitWeeklyReview", routedWeekService.submitWeeklyReview.bind(routedWeekService)),
    replaceMethod(taskService, "addTaskToWeek", routedTaskService.addTaskToWeek.bind(routedTaskService)),
    replaceMethod(taskService, "updateTask", routedTaskService.updateTask.bind(routedTaskService)),
    replaceMethod(taskService, "deleteTask", routedTaskService.deleteTask.bind(routedTaskService)),
    replaceMethod(metricService, "createWeekMetric", routedMetricService.createWeekMetric.bind(routedMetricService)),
    replaceMethod(metricService, "getWeekMetrics", routedMetricService.getWeekMetrics.bind(routedMetricService)),
    replaceMethod(metricService, "logLeadMetric", routedMetricService.logLeadMetric.bind(routedMetricService)),
    replaceMethod(metricService, "updateLeadMetricLog", routedMetricService.updateLeadMetricLog.bind(routedMetricService)),
  ];

  return () => {
    for (const restore of restorers.reverse()) {
      restore();
    }
  };
}

function createRouteTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@example.com" };
        if (token === "other-token") return { uid: otherUserId, email: "other@example.com" };
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", goalRoutes);
  app.use("/api", planRoutes);
  app.use("/api", weekRoutes);
  app.use("/api", taskRoutes);
  app.use("/api", metricRoutes);
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

function assertErrorResponse(response: JsonResponse, status: number, messagePattern: RegExp): void {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.match(response.body.message ?? "", messagePattern);
}

let restoreServices: Restorer | null = null;

beforeEach(() => {
  restoreServices = installServiceMocks();
});

afterEach(() => {
  restoreServices?.();
  restoreServices = null;
});

describe("backend route integration", () => {
  it("returns 401 for unauthorized protected routes", async () => {
    const response = await requestJson(createRouteTestApp(), "GET", "/api/goals", { token: null });

    assertErrorResponse(response, 401, /Unauthorized/i);
  });

  it("routes goal requests through auth, controller, validation, and ownership handling", async () => {
    const app = createRouteTestApp();

    const invalidId = await requestJson(app, "GET", "/api/goals/not-an-object-id");
    assertErrorResponse(invalidId, 400, /ObjectId/i);

    const badPayload = await requestJson(app, "POST", "/api/goals", {
      body: {
        category: "Career",
        description: "Missing title",
        deadline: "2026-02-01T00:00:00.000Z",
      },
    });
    assertErrorResponse(badPayload, 400, /title/i);

    const crossUser = await requestJson(app, "GET", `/api/goals/${ids.otherGoal}`);
    assertErrorResponse(crossUser, 403, /access/i);
    assert.doesNotMatch(JSON.stringify(crossUser.body), /Private other goal/);
  });

  it("routes plan requests through route-level validation and ownership handling", async () => {
    const app = createRouteTestApp();

    const invalidId = await requestJson(app, "GET", "/api/plans/not-an-object-id");
    assertErrorResponse(invalidId, 400, /ObjectId/i);

    const badPayload = await requestJson(app, "POST", "/api/plans", {
      body: {
        vision: "New plan",
        initializeWeeks: true,
        totalWeeks: 13,
      },
    });
    assertErrorResponse(badPayload, 400, /totalWeeks/i);

    const crossUser = await requestJson(app, "PATCH", `/api/plans/${ids.otherPlan}`, {
      body: { vision: "Nope" },
    });
    assertErrorResponse(crossUser, 403, /access/i);
    assert.doesNotMatch(JSON.stringify(crossUser.body), /Private other plan/);
  });

  it("routes week requests through route-level validation and ownership handling", async () => {
    const app = createRouteTestApp();

    const invalidId = await requestJson(app, "PATCH", "/api/weeks/not-an-object-id", {
      body: { focus: "Nope" },
    });
    assertErrorResponse(invalidId, 400, /ObjectId/i);

    const badPayload = await requestJson(app, "POST", `/api/weeks/${ids.week}/review`, {
      body: { executionScore: 101 },
    });
    assertErrorResponse(badPayload, 400, /between 0 and 100/i);

    const crossUser = await requestJson(app, "PATCH", `/api/weeks/${ids.otherWeek}`, {
      body: { focus: "Nope" },
    });
    assertErrorResponse(crossUser, 403, /access/i);
    assert.doesNotMatch(JSON.stringify(crossUser.body), /Private other week/);
  });

  it("routes task requests through controller payload validation and ownership handling", async () => {
    const app = createRouteTestApp();

    const invalidId = await requestJson(app, "PATCH", "/api/tasks/not-an-object-id", {
      body: { status: "done" },
    });
    assertErrorResponse(invalidId, 400, /ObjectId/i);

    const badPayload = await requestJson(app, "PATCH", `/api/tasks/${ids.task}`, {
      body: { status: "done-ish" },
    });
    assertErrorResponse(badPayload, 400, /Invalid task status/i);

    const crossUser = await requestJson(app, "PATCH", `/api/tasks/${ids.otherTask}`, {
      body: { status: "done" },
    });
    assertErrorResponse(crossUser, 403, /access/i);
    assert.doesNotMatch(JSON.stringify(crossUser.body), /Private other task/);
  });

  it("routes metric requests through route-level validation and ownership handling", async () => {
    const app = createRouteTestApp();

    const invalidId = await requestJson(app, "GET", "/api/weeks/not-an-object-id/metrics");
    assertErrorResponse(invalidId, 400, /ObjectId/i);

    const badPayload = await requestJson(app, "POST", `/api/weeks/${ids.week}/metrics`, {
      body: { name: "   " },
    });
    assertErrorResponse(badPayload, 400, /Metric name/i);

    const crossUser = await requestJson(app, "POST", `/api/metrics/${ids.otherMetric}/logs`, {
      body: { value: 1 },
    });
    assertErrorResponse(crossUser, 403, /access/i);
    assert.doesNotMatch(JSON.stringify(crossUser.body), /Private other metric/);
  });
});
