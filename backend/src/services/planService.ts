import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository, type PlanEntity } from "../repositories/mongo/MongoPlanRepository";
import { MongoTaskRepository } from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { softDeleteUpdate, withoutTombstones } from "../utils/tombstone";
import { ApiError } from "../utils/apiError";
import { requirePlanOwnership } from "./serviceGuards";
import { assertFreeTierLimit, hasPlusAccess } from "./freeTierLimits";

export interface CreatePlanPayload {
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
  initializeWeeks?: boolean;
  totalWeeks?: number;
}

export interface UpdatePlanPayload {
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
  baseRevision?: number;
}

interface ValidatedCreatePlanPayload {
  vision: string;
  smartGoalId?: string;
  startDate: Date;
  initializeWeeks: boolean;
  totalWeeks: number;
}

const EDITABLE_PLAN_FIELDS = new Set(["vision", "smartGoalId", "startDate", "baseRevision"]);
const PLAN_CREATE_FIELDS = new Set(["vision", "smartGoalId", "startDate", "initializeWeeks", "totalWeeks"]);
const MIN_PLAN_WEEKS = 1;
const MAX_PLAN_WEEKS = 12;

export interface PlanDeletionSideEffectRepository {
  softDeleteDailyCheckInsForPlan(userId: string, planId: string, deletedAt: Date): Promise<number>;
  softDeleteWeekReviewsForPlan(input: {
    userId: string;
    planId: string;
    weekIds: string[];
    deletedAt: Date;
  }): Promise<number>;
}

class NoopPlanDeletionSideEffectRepository implements PlanDeletionSideEffectRepository {
  async softDeleteDailyCheckInsForPlan(): Promise<number> {
    return 0;
  }

  async softDeleteWeekReviewsForPlan(): Promise<number> {
    return 0;
  }
}

export class MongoPlanDeletionSideEffectRepository implements PlanDeletionSideEffectRepository {
  async softDeleteDailyCheckInsForPlan(userId: string, planId: string, deletedAt: Date): Promise<number> {
    const result = await DailyCheckInModel.updateMany(
      withoutTombstones({ userId, planId }),
      softDeleteUpdate(deletedAt),
    );
    return result.modifiedCount ?? 0;
  }

  async softDeleteWeekReviewsForPlan(input: {
    userId: string;
    planId: string;
    weekIds: string[];
    deletedAt: Date;
  }): Promise<number> {
    const result = await WeekReviewModel.updateMany(
      withoutTombstones({
        $or: [
          { userId: input.userId, planId: input.planId },
          ...(input.weekIds.length > 0
            ? [
                { userId: input.userId, weekId: { $in: input.weekIds } },
                { userId: { $exists: false }, weekId: { $in: input.weekIds } },
                { userId: null, weekId: { $in: input.weekIds } },
              ]
            : []),
        ],
      }),
      softDeleteUpdate(input.deletedAt),
    );
    return result.modifiedCount ?? 0;
  }
}

const noopPlanDeletionSideEffects = new NoopPlanDeletionSideEffectRepository();

function isPayloadRecord(payload: unknown): payload is Record<string, unknown> {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function validateTotalWeeks(value: unknown): number {
  if (value === undefined) return MAX_PLAN_WEEKS;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, "totalWeeks must be an integer between 1 and 12.");
  }
  if (value < MIN_PLAN_WEEKS || value > MAX_PLAN_WEEKS) {
    throw new ApiError(400, "totalWeeks must be between 1 and 12.");
  }
  return value;
}

function validateIsoDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  return parsed;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${fieldName} cannot be empty.`);
  }

  return trimmed;
}

function validateCreatePlanPayload(payload: unknown): ValidatedCreatePlanPayload {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const unknownFields = Object.keys(payload).filter((field) => !PLAN_CREATE_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, "Only vision, smartGoalId, startDate, initializeWeeks, and totalWeeks are accepted.", {
      unknownFields,
    });
  }

  if (payload.initializeWeeks !== undefined && typeof payload.initializeWeeks !== "boolean") {
    throw new ApiError(400, "initializeWeeks must be a boolean.");
  }
  if (payload.vision !== undefined && typeof payload.vision !== "string") {
    throw new ApiError(400, "vision must be a string.");
  }

  return {
    vision: typeof payload.vision === "string" ? payload.vision.trim() : "",
    smartGoalId: validateOptionalString(payload.smartGoalId, "smartGoalId"),
    startDate: payload.startDate === undefined ? new Date() : validateIsoDate(payload.startDate, "startDate"),
    initializeWeeks: payload.initializeWeeks === true,
    totalWeeks: validateTotalWeeks(payload.totalWeeks),
  };
}

function validateUpdatePlanPayload(payload: unknown): UpdatePlanPayload {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const unknownFields = Object.keys(payload).filter((field) => !EDITABLE_PLAN_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, "Only vision, smartGoalId, and startDate can be updated.", {
      unknownFields,
    });
  }

  const updates: UpdatePlanPayload = {};

  if ("vision" in payload) {
    if (typeof payload.vision !== "string") {
      throw new ApiError(400, "vision must be a string.");
    }
    updates.vision = payload.vision.trim();
  }

  if ("smartGoalId" in payload) {
    if (typeof payload.smartGoalId !== "string") {
      throw new ApiError(400, "smartGoalId must be a string.");
    }

    const smartGoalId = payload.smartGoalId.trim();
    if (!smartGoalId) {
      throw new ApiError(400, "smartGoalId cannot be empty.");
    }
    updates.smartGoalId = smartGoalId;
  }

  if ("startDate" in payload) {
    updates.startDate = validateIsoDate(payload.startDate, "startDate").toISOString();
  }

  if ("baseRevision" in payload) {
    if (typeof payload.baseRevision !== "number" || !Number.isInteger(payload.baseRevision) || payload.baseRevision < 0) {
      throw new ApiError(400, "baseRevision must be a non-negative integer.");
    }
    updates.baseRevision = payload.baseRevision;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Provide at least one plan field to update.");
  }

  return updates;
}

export async function softDeletePlanTree(input: {
  userId: string;
  plan: PlanEntity;
  deletedAt: Date;
  weekRepository: MongoWeekRepository;
  taskRepository: MongoTaskRepository;
  metricRepository: MongoMetricRepository;
  sideEffects?: PlanDeletionSideEffectRepository;
}): Promise<void> {
  const weeks = await input.weekRepository.getWeeksByPlanId(input.plan.id);
  const weekIds = weeks.map((week) => week.id);
  const sideEffects = input.sideEffects ?? noopPlanDeletionSideEffects;

  await Promise.all([
    input.taskRepository.deleteTasksByWeekIds(weekIds, input.deletedAt),
    input.metricRepository.deleteMetricsByWeekIds(weekIds, input.deletedAt),
    sideEffects.softDeleteDailyCheckInsForPlan(input.userId, input.plan.id, input.deletedAt),
    sideEffects.softDeleteWeekReviewsForPlan({
      userId: input.userId,
      planId: input.plan.id,
      weekIds,
      deletedAt: input.deletedAt,
    }),
  ]);

  await input.weekRepository.deleteWeeksByPlanId(input.plan.id, input.deletedAt);
}

export class PlanService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
    private readonly taskRepository: MongoTaskRepository,
    private readonly metricRepository: MongoMetricRepository,
    private readonly hasPlusAccessForUser: (userId: string) => Promise<boolean> = hasPlusAccess,
    private readonly deletionSideEffects: PlanDeletionSideEffectRepository = noopPlanDeletionSideEffects,
  ) {}

  async createPlanForUser(userId: string, payload: CreatePlanPayload) {
    const validatedPayload = validateCreatePlanPayload(payload);
    const existingPlans = await this.planRepository.getPlansByUserId(userId);
    await assertFreeTierLimit({
      userId,
      limitName: "max12WeekCycles",
      currentCount: existingPlans.length,
      hasPlusAccess: this.hasPlusAccessForUser,
    });
    const plan = await this.planRepository.createPlan({
      userId,
      vision: validatedPayload.vision,
      smartGoalId: validatedPayload.smartGoalId,
      startDate: validatedPayload.startDate,
    });

    if (validatedPayload.initializeWeeks) {
      try {
        for (let index = 0; index < validatedPayload.totalWeeks; index += 1) {
          await this.weekRepository.createWeek({
            planId: plan.id,
            weekNumber: index + 1,
            focus: "",
            expectedOutput: "",
          });
        }
      } catch (error) {
        await this.weekRepository.deleteWeeksByPlanId(plan.id);
        await this.planRepository.deletePlan(plan.id);
        throw error;
      }
    }

    return plan;
  }

  async getUserPlans(userId: string) {
    return this.planRepository.getPlansByUserId(userId);
  }

  async updatePlan(userId: string, planId: string, payload: unknown) {
    await requirePlanOwnership(this.planRepository, userId, planId);
    const updates = validateUpdatePlanPayload(payload);

    const updated = await this.planRepository.updatePlan(planId, {
      vision: updates.vision,
      smartGoalId: updates.smartGoalId,
      startDate: updates.startDate ? new Date(updates.startDate) : undefined,
      baseRevision: updates.baseRevision,
    });
    if (!updated) {
      throw new ApiError(404, "Plan not found.");
    }

    return updated;
  }

  async deletePlanForUser(userId: string, planId: string) {
    const plan = await requirePlanOwnership(this.planRepository, userId, planId);
    const deletedAt = new Date();

    await softDeletePlanTree({
      userId,
      plan,
      deletedAt,
      weekRepository: this.weekRepository,
      taskRepository: this.taskRepository,
      metricRepository: this.metricRepository,
      sideEffects: this.deletionSideEffects,
    });

    const deleted = await this.planRepository.deletePlan(plan.id, deletedAt);
    if (!deleted) {
      throw new ApiError(404, "Plan not found.");
    }
  }

  async getPlanDetails(userId: string, planId: string) {
    const plan = await requirePlanOwnership(this.planRepository, userId, planId);
    const weeks = await this.weekRepository.getWeeksByPlanId(plan.id);

    const details = await Promise.all(
      weeks.map(async (week) => {
        const [tasks, metrics] = await Promise.all([
          this.taskRepository.getTasksByWeekId(week.id),
          this.metricRepository.getMetricsByWeekId(week.id),
        ]);

        return {
          ...week,
          tasks,
          metrics,
        };
      }),
    );

    return {
      plan,
      weeks: details,
    };
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const taskRepository = new MongoTaskRepository();
const metricRepository = new MongoMetricRepository();
const planDeletionSideEffects = new MongoPlanDeletionSideEffectRepository();

export const planService = new PlanService(
  planRepository,
  weekRepository,
  taskRepository,
  metricRepository,
  hasPlusAccess,
  planDeletionSideEffects,
);
