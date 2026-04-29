import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GoalService } from "../services/goalService";
import { PlanService } from "../services/planService";
import { assertApiError, ids, otherUserId, ownerUserId } from "./testHelpers";

const now = new Date("2026-01-01T00:00:00.000Z");

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
        title: "Other goal",
        category: "Health",
        description: "Private goal",
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
        id: "507f1f77bcf86cd799439099",
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

function createPlanFixture() {
  const plans = new Map([
    [
      ids.plan,
      {
        id: ids.plan,
        userId: ownerUserId,
        vision: "Owner vision",
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
        vision: "Other vision",
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
        focus: "Week focus",
        expectedOutput: "Output",
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
        title: "Task",
        status: "todo" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  return {
    planRepository: {
      async createPlan(data: Record<string, unknown>) {
        const plan = {
          id: "507f1f77bcf86cd799439098",
          vision: "",
          startDate: now,
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
    },
    weekRepository: {
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
      async getWeeksByPlanId(planId: string) {
        return [...weeks.values()].filter((week) => week.planId === planId);
      },
    },
    taskRepository: {
      async getTasksByWeekId(weekId: string) {
        return [...tasks.values()].filter((task) => task.weekId === weekId);
      },
    },
    metricRepository: {
      async getMetricsByWeekId() {
        return [];
      },
    },
  };
}

describe("goal ownership", () => {
  it("allows owners and rejects cross-user goal access", async () => {
    const service = new GoalService(createGoalRepository() as never);

    const goal = await service.getGoal(ownerUserId, ids.goal);
    assert.equal(goal.id, ids.goal);

    await assertApiError(service.getGoal(ownerUserId, ids.otherGoal), 403, "access");
    await assertApiError(service.getGoal(ownerUserId, "507f1f77bcf86cd799439099"), 404, "not found");
  });

  it("validates goal updates before persisting owner changes", async () => {
    const service = new GoalService(createGoalRepository() as never);

    const updated = await service.updateGoal(ownerUserId, ids.goal, {
      title: "  Updated title  ",
      readinessScore: 80,
    });

    assert.equal(updated.title, "Updated title");
    assert.equal(updated.readinessScore, 80);
    await assertApiError(service.updateGoal(ownerUserId, ids.goal, { readinessScore: 101 }), 400, "readinessScore");
  });
});

describe("plan ownership", () => {
  it("allows owners to read plan details with weeks, tasks, and metrics", async () => {
    const fixture = createPlanFixture();
    const service = new PlanService(
      fixture.planRepository as never,
      fixture.weekRepository as never,
      fixture.taskRepository as never,
      fixture.metricRepository as never,
    );

    const details = await service.getPlanDetails(ownerUserId, ids.plan);

    assert.equal(details.plan.id, ids.plan);
    assert.equal(details.weeks.length, 1);
    assert.equal(details.weeks[0].tasks.length, 1);
    assert.deepEqual(details.weeks[0].metrics, []);
  });

  it("rejects cross-user and invalid plan access", async () => {
    const fixture = createPlanFixture();
    const service = new PlanService(
      fixture.planRepository as never,
      fixture.weekRepository as never,
      fixture.taskRepository as never,
      fixture.metricRepository as never,
    );

    await assertApiError(service.updatePlan(ownerUserId, ids.otherPlan, { vision: "Nope" }), 403, "access");
    await assertApiError(service.updatePlan(ownerUserId, "not-an-object-id", { vision: "Nope" }), 400, "ObjectId");
  });

  it("initializes requested weeks when creating a plan", async () => {
    const fixture = createPlanFixture();
    const service = new PlanService(
      fixture.planRepository as never,
      fixture.weekRepository as never,
      fixture.taskRepository as never,
      fixture.metricRepository as never,
    );

    const plan = await service.createPlanForUser(ownerUserId, {
      vision: "  New cycle  ",
      startDate: "2026-02-01T00:00:00.000Z",
      initializeWeeks: true,
      totalWeeks: 3,
    });
    const weeks = await fixture.weekRepository.getWeeksByPlanId(plan.id);

    assert.equal(plan.vision, "New cycle");
    assert.equal(weeks.length, 3);
  });
});
