import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GoalService } from "../services/goalService";
import {
  createTwelveWeekPullCursor,
  TwelveWeekPullService,
  type PullGoalSource,
  type TwelveWeekPullRepository,
} from "../services/twelveWeekPullService";
import { assertApiError, ids, ownerUserId } from "./testHelpers";

const baseNow = new Date("2026-04-30T00:00:00.000Z");

function createSoftDeleteGoalFixture() {
  const goals: PullGoalSource[] = [
    {
      _id: ids.goal,
      userId: ownerUserId,
      clientGoalId: "goal_local_delete",
      title: "Delete me",
      category: "Career",
      description: "Soft-delete goal fixture.",
      deadline: new Date("2026-07-22T00:00:00.000Z"),
      status: "active",
      revision: 1,
      syncUpdatedAt: baseNow,
    },
  ];

  const goalRepository = {
    async getGoalById(id: string) {
      const goal = goals.find((item) => item._id.toString() === id && !item.deletedAt);
      return goal
        ? {
            id: goal._id.toString(),
            userId: goal.userId,
            title: goal.title ?? "",
            category: goal.category ?? "",
            description: goal.description ?? "",
            deadline: goal.deadline ?? baseNow,
            status: "active" as const,
            clientGoalId: goal.clientGoalId,
            createdAt: baseNow,
            updatedAt: baseNow,
          }
        : null;
    },
    async getGoalsByUserId(userId: string) {
      return goals
        .filter((goal) => goal.userId === userId && !goal.deletedAt)
        .map((goal) => ({
          id: goal._id.toString(),
          userId: goal.userId,
          title: goal.title ?? "",
          category: goal.category ?? "",
          description: goal.description ?? "",
          deadline: goal.deadline ?? baseNow,
          status: "active" as const,
          clientGoalId: goal.clientGoalId,
          createdAt: baseNow,
          updatedAt: baseNow,
        }));
    },
    async createGoal() {
      throw new Error("Not used");
    },
    async updateGoal() {
      throw new Error("Not used");
    },
    async deleteGoal(id: string, deletedAt = new Date()) {
      const goal = goals.find((item) => item._id.toString() === id && !item.deletedAt);
      if (!goal) return false;
      goal.deletedAt = deletedAt;
      goal.syncUpdatedAt = deletedAt;
      goal.revision = (goal.revision ?? 0) + 1;
      return true;
    },
  };

  const pullRepository: TwelveWeekPullRepository = {
    async listWorkspace(userId) {
      return {
        goals: goals.filter((goal) => goal.userId === userId),
        plans: [],
        weeks: [],
        tasks: [],
        leadMetrics: [],
        dailyCheckIns: [],
        weeklyReviews: [],
      };
    },
  };

  return { goalRepository, pullRepository };
}

describe("goal soft delete tombstones", () => {
  it("hides a deleted goal from normal reads and exposes a pull tombstone", async () => {
    const fixture = createSoftDeleteGoalFixture();
    const service = new GoalService(fixture.goalRepository as never, async () => true);
    const pullService = new TwelveWeekPullService(fixture.pullRepository);

    await service.deleteGoal(ownerUserId, ids.goal);

    await assertApiError(service.getGoal(ownerUserId, ids.goal), 404, "not found");
    assert.deepEqual(await service.getUserGoals(ownerUserId), []);

    const cursor = createTwelveWeekPullCursor("2026-04-30T00:00:00.000Z");
    const result = await pullService.pullWorkspace(ownerUserId, { cursor });

    assert.equal(result.workspace.goals.length, 0);
    assert.equal(result.tombstones.goals.length, 1);
    assert.equal(result.tombstones.goals[0].clientId, "goal_local_delete");
    assert.match(result.tombstones.goals[0].deletedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});
