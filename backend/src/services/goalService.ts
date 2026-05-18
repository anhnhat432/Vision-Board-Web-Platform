import {
  MongoGoalRepository,
  type OnboardingTask,
} from "../repositories/mongo/MongoGoalRepository";
import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoTaskRepository } from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";
import type { GoalStatus } from "../models/GoalModel";
import { assertFreeTierLimit, hasPlusAccess } from "./freeTierLimits";
import {
  MongoPlanDeletionSideEffectRepository,
  softDeletePlanTree,
  type PlanDeletionSideEffectRepository,
} from "./planService";
import { assertValidObjectId } from "./serviceGuards";

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
const EDITABLE_GOAL_FIELDS = new Set([
  "title",
  "category",
  "description",
  "deadline",
  "status",
  "focusArea",
  "feasibilityResult",
  "readinessScore",
  "tasks",
  "planId",
]);

function isPayloadRecord(payload: unknown): payload is Record<string, unknown> {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function validateRequiredString(payload: Record<string, unknown>, fieldName: string): string {
  const value = payload[fieldName];
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return trimmed;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function validateDateString(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  return parsed;
}

function validateGoalStatus(value: unknown): GoalStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !VALID_STATUSES.includes(value as GoalStatus)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(", ")}.`);
  }

  return value as GoalStatus;
}

function validateReadinessScore(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ApiError(400, "readinessScore must be a number between 0 and 100.");
  }

  return value;
}

function validateOnboardingTasks(value: unknown): OnboardingTask[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new ApiError(400, "tasks must be an array.");
  }

  return value.map((item, index) => {
    if (!isPayloadRecord(item)) {
      throw new ApiError(400, `tasks[${index}] must be an object.`);
    }
    if (typeof item.title !== "string" || !item.title.trim()) {
      throw new ApiError(400, `tasks[${index}].title is required.`);
    }
    if (item.completed !== undefined && typeof item.completed !== "boolean") {
      throw new ApiError(400, `tasks[${index}].completed must be a boolean.`);
    }

    return {
      title: item.title.trim(),
      completed: item.completed ?? false,
    };
  });
}

function assertNoUnknownGoalFields(payload: Record<string, unknown>): void {
  const unknownFields = Object.keys(payload).filter((field) => !EDITABLE_GOAL_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, "Unsupported goal fields.", { unknownFields });
  }
}

function validateCreateGoalPayload(payload: unknown): Omit<CreateGoalPayload, "deadline"> & { deadline: Date } {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }
  assertNoUnknownGoalFields(payload);

  return {
    title: validateRequiredString(payload, "title"),
    category: validateRequiredString(payload, "category"),
    description: validateRequiredString(payload, "description"),
    deadline: validateDateString(payload.deadline, "deadline"),
    status: validateGoalStatus(payload.status),
    focusArea: validateOptionalString(payload.focusArea, "focusArea"),
    feasibilityResult: payload.feasibilityResult,
    readinessScore: validateReadinessScore(payload.readinessScore),
    tasks: validateOnboardingTasks(payload.tasks),
    planId: validateOptionalString(payload.planId, "planId"),
  };
}

function validateUpdateGoalPayload(payload: unknown): Parameters<MongoGoalRepository["updateGoal"]>[1] {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }
  assertNoUnknownGoalFields(payload);

  const updates: Parameters<MongoGoalRepository["updateGoal"]>[1] = {};

  if ("title" in payload) updates.title = validateRequiredString(payload, "title");
  if ("category" in payload) updates.category = validateRequiredString(payload, "category");
  if ("description" in payload) updates.description = validateRequiredString(payload, "description");
  if ("deadline" in payload) updates.deadline = validateDateString(payload.deadline, "deadline");

  if ("status" in payload) {
    const status = validateGoalStatus(payload.status);
    if (status) updates.status = status;
  }
  if ("focusArea" in payload) updates.focusArea = validateOptionalString(payload.focusArea, "focusArea");
  if ("feasibilityResult" in payload) updates.feasibilityResult = payload.feasibilityResult;
  if ("readinessScore" in payload) updates.readinessScore = validateReadinessScore(payload.readinessScore);
  if ("tasks" in payload) updates.tasks = validateOnboardingTasks(payload.tasks);
  if ("planId" in payload) updates.planId = validateOptionalString(payload.planId, "planId");

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Provide at least one goal field to update.");
  }

  return updates;
}

interface GoalDeletionDependencies {
  planRepository: MongoPlanRepository;
  weekRepository: MongoWeekRepository;
  taskRepository: MongoTaskRepository;
  metricRepository: MongoMetricRepository;
  sideEffects?: PlanDeletionSideEffectRepository;
}

export class GoalService {
  constructor(
    private readonly goalRepository: MongoGoalRepository,
    private readonly hasPlusAccessForUser: (userId: string) => Promise<boolean> = hasPlusAccess,
    private readonly deletionDependencies?: GoalDeletionDependencies,
  ) {}

  async createGoal(userId: string, payload: unknown) {
    const validated = validateCreateGoalPayload(payload);
    const existingGoals = await this.goalRepository.getGoalsByUserId(userId);
    const activeGoalCount = existingGoals.filter((goal) => goal.status === "active").length;
    await assertFreeTierLimit({
      userId,
      limitName: "maxActiveGoals",
      currentCount: activeGoalCount,
      hasPlusAccess: this.hasPlusAccessForUser,
    });

    return this.goalRepository.createGoal({
      userId,
      title: validated.title,
      category: validated.category,
      description: validated.description,
      deadline: validated.deadline,
      status: validated.status ?? "active",
      focusArea: validated.focusArea,
      feasibilityResult: validated.feasibilityResult,
      readinessScore: validated.readinessScore,
      tasks: validated.tasks,
      planId: validated.planId,
    });
  }

  async getUserGoals(userId: string) {
    return this.goalRepository.getGoalsByUserId(userId);
  }

  async getGoal(userId: string, goalId: string) {
    assertValidObjectId(goalId, "goalId");

    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }
    return goal;
  }

  async updateGoal(userId: string, goalId: string, payload: unknown) {
    assertValidObjectId(goalId, "goalId");

    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }

    const updates = validateUpdateGoalPayload(payload);

    const updated = await this.goalRepository.updateGoal(goalId, updates);
    if (!updated) {
      throw new ApiError(404, "Goal not found.");
    }
    return updated;
  }

  async deleteGoal(userId: string, goalId: string) {
    assertValidObjectId(goalId, "goalId");

    const goal = await this.goalRepository.getGoalById(goalId);
    if (!goal) {
      throw new ApiError(404, "Goal not found.");
    }
    if (goal.userId !== userId) {
      throw new ApiError(403, "You do not have access to this goal.");
    }

    const deletedAt = new Date();
    if (this.deletionDependencies) {
      const linkedPlans = await this.deletionDependencies.planRepository.getPlansByGoalReference({
        userId,
        goalId: goal.id,
        clientGoalId: goal.clientGoalId,
        planId: goal.planId,
      });

      for (const plan of linkedPlans) {
        await softDeletePlanTree({
          userId,
          plan,
          deletedAt,
          weekRepository: this.deletionDependencies.weekRepository,
          taskRepository: this.deletionDependencies.taskRepository,
          metricRepository: this.deletionDependencies.metricRepository,
          sideEffects: this.deletionDependencies.sideEffects,
        });
        await this.deletionDependencies.planRepository.deletePlan(plan.id, deletedAt);
      }
    }

    await this.goalRepository.deleteGoal(goalId, deletedAt);
  }
}

const goalRepository = new MongoGoalRepository();
const goalPlanRepository = new MongoPlanRepository();
const goalWeekRepository = new MongoWeekRepository();
const goalTaskRepository = new MongoTaskRepository();
const goalMetricRepository = new MongoMetricRepository();
const goalDeletionSideEffects = new MongoPlanDeletionSideEffectRepository();

export const goalService = new GoalService(goalRepository, hasPlusAccess, {
  planRepository: goalPlanRepository,
  weekRepository: goalWeekRepository,
  taskRepository: goalTaskRepository,
  metricRepository: goalMetricRepository,
  sideEffects: goalDeletionSideEffects,
});
