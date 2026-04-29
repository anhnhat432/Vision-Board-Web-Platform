import {
  MongoGoalRepository,
  type OnboardingTask,
} from "../repositories/mongo/MongoGoalRepository";
import { ApiError } from "../utils/apiError";
import type { GoalStatus } from "../models/GoalModel";

export interface CreateGoalPayload {
  title: string;
  category: string;
  description: string;
  deadline: string;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

export interface UpdateGoalPayload {
  title?: string;
  category?: string;
  description?: string;
  deadline?: string;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

const VALID_STATUSES: GoalStatus[] = ["active", "completed", "archived"];

export class GoalService {
  constructor(private readonly goalRepository: MongoGoalRepository) {}

  async createGoal(userId: string, payload: CreateGoalPayload) {
    if (!payload.title?.trim()) {
      throw new ApiError(400, "title is required.");
    }
    if (!payload.category?.trim()) {
      throw new ApiError(400, "category is required.");
    }
    if (!payload.description?.trim()) {
      throw new ApiError(400, "description is required.");
    }
    if (!payload.deadline) {
      throw new ApiError(400, "deadline is required.");
    }

    const deadline = new Date(payload.deadline);
    if (Number.isNaN(deadline.getTime())) {
      throw new ApiError(400, "deadline must be a valid ISO date string.");
    }

    if (payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
      throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(", ")}.`);
    }

    if (
      payload.readinessScore !== undefined &&
      (typeof payload.readinessScore !== "number" ||
        payload.readinessScore < 0 ||
        payload.readinessScore > 100)
    ) {
      throw new ApiError(400, "readinessScore must be a number between 0 and 100.");
    }

    return this.goalRepository.createGoal({
      userId,
      title: payload.title.trim(),
      category: payload.category.trim(),
      description: payload.description.trim(),
      deadline,
      status: payload.status ?? "active",
      focusArea: payload.focusArea?.trim(),
      feasibilityResult: payload.feasibilityResult,
      readinessScore: payload.readinessScore,
      tasks: payload.tasks,
      planId: payload.planId?.trim(),
    });
  }

  async getUserGoals(userId: string) {
    return this.goalRepository.getGoalsByUserId(userId);
  }

  async getGoal(userId: string, goalId: string) {
    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }
    return goal;
  }

  async updateGoal(userId: string, goalId: string, payload: UpdateGoalPayload) {
    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }

    const updates: Parameters<MongoGoalRepository["updateGoal"]>[1] = {};

    if (payload.title !== undefined) {
      if (!payload.title.trim()) {
        throw new ApiError(400, "title cannot be empty.");
      }
      updates.title = payload.title.trim();
    }
    if (payload.category !== undefined) {
      if (!payload.category.trim()) {
        throw new ApiError(400, "category cannot be empty.");
      }
      updates.category = payload.category.trim();
    }
    if (payload.description !== undefined) {
      if (!payload.description.trim()) {
        throw new ApiError(400, "description cannot be empty.");
      }
      updates.description = payload.description.trim();
    }
    if (payload.deadline !== undefined) {
      const deadline = new Date(payload.deadline);
      if (Number.isNaN(deadline.getTime())) {
        throw new ApiError(400, "deadline must be a valid ISO date string.");
      }
      updates.deadline = deadline;
    }
    if (payload.status !== undefined) {
      if (!VALID_STATUSES.includes(payload.status)) {
        throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(", ")}.`);
      }
      updates.status = payload.status;
    }
    if (payload.focusArea !== undefined) {
      updates.focusArea = payload.focusArea?.trim();
    }
    if (payload.feasibilityResult !== undefined) {
      updates.feasibilityResult = payload.feasibilityResult;
    }
    if (payload.readinessScore !== undefined) {
      if (
        typeof payload.readinessScore !== "number" ||
        payload.readinessScore < 0 ||
        payload.readinessScore > 100
      ) {
        throw new ApiError(400, "readinessScore must be a number between 0 and 100.");
      }
      updates.readinessScore = payload.readinessScore;
    }
    if (payload.tasks !== undefined) {
      updates.tasks = payload.tasks;
    }
    if (payload.planId !== undefined) {
      updates.planId = payload.planId?.trim();
    }

    const updated = await this.goalRepository.updateGoal(goalId, updates);
    if (!updated) {
      throw new ApiError(404, "Goal not found.");
    }
    return updated;
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }
    await this.goalRepository.deleteGoal(goalId);
  }
}

const goalRepository = new MongoGoalRepository();

export const goalService = new GoalService(goalRepository);
