import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlanService } from "../services/planService";
import {
  createTwelveWeekPullCursor,
  TwelveWeekPullService,
  type PullLeadMetricSource,
  type PullPlanSource,
  type PullTaskSource,
  type PullWeekSource,
  type TwelveWeekPullRepository,
} from "../services/twelveWeekPullService";
import { assertApiError, ids, ownerUserId } from "./testHelpers";

const baseNow = new Date("2026-04-30T00:00:00.000Z");

function createPlanEntity(plan: PullPlanSource) {
  return {
    id: plan._id.toString(),
    userId: plan.userId,
    vision: plan.vision ?? "",
    smartGoalId: plan.smartGoalId,
    startDate: plan.startDate ?? baseNow,
    clientPlanId: plan.clientPlanId,
    clientGoalId: plan.clientGoalId,
    revision: plan.revision,
    createdAt: baseNow,
    updatedAt: baseNow,
  };
}

function createWeekEntity(week: PullWeekSource) {
  return {
    id: week._id.toString(),
    planId: week.planId.toString(),
    weekNumber: week.weekNumber,
    focus: week.focus ?? "",
    expectedOutput: week.expectedOutput ?? "",
    revision: week.revision,
    createdAt: baseNow,
    updatedAt: baseNow,
  };
}

function createSoftDeletePlanFixture() {
  const plans: PullPlanSource[] = [
    {
      _id: ids.plan,
      userId: ownerUserId,
      smartGoalId: ids.goal,
      clientGoalId: "goal_local_delete",
      clientPlanId: "goal_local_delete:12-week-system",
      vision: "Delete plan",
      startDate: baseNow,
      revision: 1,
      syncUpdatedAt: baseNow,
    },
  ];
  const weeks: PullWeekSource[] = [
    {
      _id: ids.week,
      planId: ids.plan,
      clientPlanId: "goal_local_delete:12-week-system",
      clientWeekId: "goal_local_delete:week:1",
      weekNumber: 1,
      focus: "Week focus",
      expectedOutput: "Week output",
      revision: 1,
      syncUpdatedAt: baseNow,
    },
  ];
  const tasks: PullTaskSource[] = [
    {
      _id: ids.task,
      weekId: ids.week,
      clientPlanId: "goal_local_delete:12-week-system",
      clientWeekId: "goal_local_delete:week:1",
      clientTaskId: "task_local_delete",
      weekNumber: 1,
      title: "Delete task",
      status: "todo",
      revision: 1,
      syncUpdatedAt: baseNow,
    },
  ];
  const leadMetrics: PullLeadMetricSource[] = [
    {
      _id: ids.metric,
      weekId: ids.week,
      clientPlanId: "goal_local_delete:12-week-system",
      clientWeekId: "goal_local_delete:week:1",
      clientMetricId: "metric_local_delete",
      name: "Delete metric",
      weeklyTarget: 1,
      logs: [],
      revision: 1,
      syncUpdatedAt: baseNow,
    },
  ];

  const planRepository = {
    async createPlan() {
      throw new Error("Not used");
    },
    async getPlanById(id: string) {
      const plan = plans.find((item) => item._id.toString() === id && !item.deletedAt);
      return plan ? createPlanEntity(plan) : null;
    },
    async getPlansByUserId(userId: string) {
      return plans.filter((plan) => plan.userId === userId && !plan.deletedAt).map(createPlanEntity);
    },
    async updatePlan() {
      throw new Error("Not used");
    },
    async deletePlan(id: string, deletedAt = new Date()) {
      const plan = plans.find((item) => item._id.toString() === id && !item.deletedAt);
      if (!plan) return false;
      plan.deletedAt = deletedAt;
      plan.syncUpdatedAt = deletedAt;
      plan.revision = (plan.revision ?? 0) + 1;
      return true;
    },
  };

  const weekRepository = {
    async createWeek() {
      throw new Error("Not used");
    },
    async getWeekById(id: string) {
      const week = weeks.find((item) => item._id.toString() === id && !item.deletedAt);
      return week ? createWeekEntity(week) : null;
    },
    async getWeeksByPlanId(planId: string) {
      return weeks.filter((week) => week.planId.toString() === planId && !week.deletedAt).map(createWeekEntity);
    },
    async updateWeek() {
      throw new Error("Not used");
    },
    async submitWeeklyReview() {
      throw new Error("Not used");
    },
    async deleteWeeksByPlanId(planId: string, deletedAt = new Date()) {
      let count = 0;
      for (const week of weeks) {
        if (week.planId.toString() !== planId || week.deletedAt) continue;
        week.deletedAt = deletedAt;
        week.syncUpdatedAt = deletedAt;
        week.revision = (week.revision ?? 0) + 1;
        count += 1;
      }
      return count;
    },
  };

  const taskRepository = {
    async getTasksByWeekId(weekId: string) {
      return tasks.filter((task) => task.weekId.toString() === weekId && !task.deletedAt);
    },
    async deleteTasksByWeekIds(weekIds: string[], deletedAt = new Date()) {
      const weekIdSet = new Set(weekIds);
      let count = 0;
      for (const task of tasks) {
        if (!weekIdSet.has(task.weekId.toString()) || task.deletedAt) continue;
        task.deletedAt = deletedAt;
        task.syncUpdatedAt = deletedAt;
        task.revision = (task.revision ?? 0) + 1;
        count += 1;
      }
      return count;
    },
  };

  const metricRepository = {
    async getMetricsByWeekId(weekId: string) {
      return leadMetrics.filter((metric) => metric.weekId.toString() === weekId && !metric.deletedAt);
    },
    async deleteMetricsByWeekIds(weekIds: string[], deletedAt = new Date()) {
      const weekIdSet = new Set(weekIds);
      let count = 0;
      for (const metric of leadMetrics) {
        if (!weekIdSet.has(metric.weekId.toString()) || metric.deletedAt) continue;
        metric.deletedAt = deletedAt;
        metric.syncUpdatedAt = deletedAt;
        metric.revision = (metric.revision ?? 0) + 1;
        count += 1;
      }
      return count;
    },
  };

  const pullRepository: TwelveWeekPullRepository = {
    async listWorkspace(userId) {
      const userPlans = plans.filter((plan) => plan.userId === userId);
      const planIds = new Set(userPlans.map((plan) => plan._id.toString()));
      const userWeeks = weeks.filter((week) => planIds.has(week.planId.toString()));
      const weekIds = new Set(userWeeks.map((week) => week._id.toString()));
      return {
        goals: [],
        plans: userPlans,
        weeks: userWeeks,
        tasks: tasks.filter((task) => weekIds.has(task.weekId.toString())),
        leadMetrics: leadMetrics.filter((metric) => weekIds.has(metric.weekId.toString())),
        dailyCheckIns: [],
        weeklyReviews: [],
      };
    },
  };

  return { planRepository, weekRepository, taskRepository, metricRepository, pullRepository };
}

describe("plan soft delete tombstones", () => {
  it("hides a deleted plan and cascades tombstones to weeks, tasks, and lead metrics", async () => {
    const fixture = createSoftDeletePlanFixture();
    const service = new PlanService(
      fixture.planRepository as never,
      fixture.weekRepository as never,
      fixture.taskRepository as never,
      fixture.metricRepository as never,
      async () => true,
    );
    const pullService = new TwelveWeekPullService(fixture.pullRepository);

    await service.deletePlanForUser(ownerUserId, ids.plan);

    await assertApiError(service.getPlanDetails(ownerUserId, ids.plan), 404, "not found");
    assert.deepEqual(await fixture.weekRepository.getWeeksByPlanId(ids.plan), []);
    assert.deepEqual(await fixture.taskRepository.getTasksByWeekId(ids.week), []);
    assert.deepEqual(await fixture.metricRepository.getMetricsByWeekId(ids.week), []);

    const cursor = createTwelveWeekPullCursor("2026-04-30T00:00:00.000Z");
    const result = await pullService.pullWorkspace(ownerUserId, { cursor });

    assert.equal(result.workspace.plans.length, 0);
    assert.equal(result.workspace.weeks.length, 0);
    assert.equal(result.workspace.tasks.length, 0);
    assert.equal(result.workspace.leadMetrics.length, 0);
    assert.equal(result.tombstones.plans[0].clientId, "goal_local_delete:12-week-system");
    assert.equal(result.tombstones.weeks[0].clientId, "goal_local_delete:week:1");
    assert.equal(result.tombstones.tasks[0].clientId, "task_local_delete");
    assert.equal(result.tombstones.leadMetrics[0].clientId, "metric_local_delete");
  });
});
