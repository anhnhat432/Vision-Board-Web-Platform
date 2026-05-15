import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GoalService } from "../services/goalService";
import { PlanService } from "../services/planService";
import { VisionBoardService } from "../services/visionBoardService";
import { ApiError } from "../utils/apiError";

const now = new Date("2026-05-15T00:00:00.000Z");
const freeUserId = "free_user";

async function assertPlanLimitExceeded(action: Promise<unknown>) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.errorCode, "PLAN_LIMIT_EXCEEDED");
    return true;
  });
}

function createGoal(id: string) {
  return {
    id,
    userId: freeUserId,
    title: `Goal ${id}`,
    category: "Career",
    description: "Build product",
    deadline: now,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
}

function createGoalRepository(goalCount: number) {
  const goals = Array.from({ length: goalCount }, (_, index) => createGoal(`goal_${index + 1}`));
  return {
    async createGoal(data: Record<string, unknown>) {
      return { id: "new_goal", createdAt: now, updatedAt: now, ...data };
    },
    async getGoalById() {
      return null;
    },
    async getGoalsByUserId(userId: string) {
      return goals.filter((goal) => goal.userId === userId);
    },
    async updateGoal() {
      return null;
    },
    async deleteGoal() {
      return false;
    },
  };
}

function createPlanRepository(planCount: number) {
  const plans = Array.from({ length: planCount }, (_, index) => ({
    id: `plan_${index + 1}`,
    userId: freeUserId,
    vision: "Ship",
    startDate: now,
    createdAt: now,
    updatedAt: now,
  }));
  return {
    async createPlan(data: Record<string, unknown>) {
      return { id: "new_plan", createdAt: now, updatedAt: now, ...data };
    },
    async getPlanById() {
      return null;
    },
    async getPlansByUserId(userId: string) {
      return plans.filter((plan) => plan.userId === userId);
    },
    async updatePlan() {
      return null;
    },
    async deletePlan() {
      return true;
    },
  };
}

function createWeekRepository() {
  return {
    async createWeek() {
      return { id: "week_1", planId: "new_plan", weekNumber: 1, focus: "", expectedOutput: "", createdAt: now, updatedAt: now };
    },
    async getWeeksByPlanId() {
      return [];
    },
    async deleteWeeksByPlanId() {},
  };
}

function createEmptyRepository() {
  return {
    async getTasksByWeekId() {
      return [];
    },
    async getMetricsByWeekId() {
      return [];
    },
  };
}

function createVisionBoardRepository(boardCount: number) {
  const boards = Array.from({ length: boardCount }, (_, index) => ({
    id: `board_${index + 1}`,
    userId: freeUserId,
    name: "Board",
    year: "2026",
    items: [],
    createdAt: now,
    updatedAt: now,
  }));
  return {
    async createVisionBoard(data: Record<string, unknown>) {
      return { id: "new_board", createdAt: now, updatedAt: now, ...data };
    },
    async getVisionBoardById() {
      return null;
    },
    async getVisionBoardsByUserId(userId: string) {
      return boards.filter((board) => board.userId === userId);
    },
    async updateVisionBoard() {
      return null;
    },
    async deleteVisionBoard() {
      return false;
    },
  };
}

describe("free tier limits", () => {
  it("returns 403 PLAN_LIMIT_EXCEEDED when a free user creates the fourth goal", async () => {
    const service = new GoalService(createGoalRepository(3) as never, async () => false);

    await assertPlanLimitExceeded(
      service.createGoal(freeUserId, {
        title: "Fourth goal",
        category: "Career",
        description: "Build product",
        deadline: "2026-08-01T00:00:00.000Z",
      }),
    );
  });

  it("allows Plus users to create beyond free goal limits", async () => {
    const service = new GoalService(createGoalRepository(3) as never, async () => true);

    const created = await service.createGoal(freeUserId, {
      title: "Fourth goal",
      category: "Career",
      description: "Build product",
      deadline: "2026-08-01T00:00:00.000Z",
    });

    assert.equal(created.title, "Fourth goal");
  });

  it("returns 403 when a free user creates a second 12-week plan", async () => {
    const service = new PlanService(
      createPlanRepository(1) as never,
      createWeekRepository() as never,
      createEmptyRepository() as never,
      createEmptyRepository() as never,
      async () => false,
    );

    await assertPlanLimitExceeded(
      service.createPlanForUser(freeUserId, {
        vision: "Second cycle",
        startDate: "2026-08-01T00:00:00.000Z",
      }),
    );
  });

  it("returns 403 when a free user creates a second vision board", async () => {
    const service = new VisionBoardService(createVisionBoardRepository(1) as never, async () => false);

    await assertPlanLimitExceeded(
      service.createVisionBoard(freeUserId, {
        name: "Second board",
        year: "2026",
        items: [],
      }),
    );
  });
});
