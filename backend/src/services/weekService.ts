import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";
import { requirePlanOwnership, requireWeekOwnership } from "./serviceGuards";

export interface UpdateWeekPayload {
  focus?: string;
  expectedOutput?: string;
}

export interface SubmitWeeklyReviewPayload {
  weekNumber?: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

const EDITABLE_WEEK_FIELDS = new Set(["focus", "expectedOutput"]);
const WEEK_REVIEW_FIELDS = new Set(["weekNumber", "executionScore", "reflection", "adjustments"]);

function isPayloadRecord(payload: unknown): payload is Record<string, unknown> {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function validateWeekNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) {
    throw new ApiError(400, "weekNumber must be an integer between 1 and 12.");
  }

  return value;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  return value.trim();
}

function validateUpdateWeekPayload(payload: unknown): UpdateWeekPayload {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const unknownFields = Object.keys(payload).filter((field) => !EDITABLE_WEEK_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, "Only focus and expectedOutput can be updated.", { unknownFields });
  }

  const updates: UpdateWeekPayload = {};
  if ("focus" in payload) updates.focus = validateOptionalString(payload.focus, "focus");
  if ("expectedOutput" in payload) {
    updates.expectedOutput = validateOptionalString(payload.expectedOutput, "expectedOutput");
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Provide at least one week field to update.");
  }

  return updates;
}

function validateWeeklyReviewPayload(payload: unknown, fallbackWeekNumber: number): Required<SubmitWeeklyReviewPayload> {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const unknownFields = Object.keys(payload).filter((field) => !WEEK_REVIEW_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, "Only weekNumber, executionScore, reflection, and adjustments are accepted.", {
      unknownFields,
    });
  }

  if (typeof payload.executionScore !== "number" || !Number.isFinite(payload.executionScore)) {
    throw new ApiError(400, "executionScore must be a valid number.");
  }
  if (payload.executionScore < 0 || payload.executionScore > 100) {
    throw new ApiError(400, "executionScore must be between 0 and 100.");
  }

  return {
    weekNumber: payload.weekNumber === undefined ? fallbackWeekNumber : validateWeekNumber(payload.weekNumber),
    executionScore: payload.executionScore,
    reflection: validateOptionalString(payload.reflection, "reflection") ?? "",
    adjustments: validateOptionalString(payload.adjustments, "adjustments") ?? "",
  };
}

export class WeekService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
  ) {}

  async getWeeksForPlan(userId: string, planId: string) {
    await requirePlanOwnership(this.planRepository, userId, planId);
    return this.weekRepository.getWeeksByPlanId(planId);
  }

  async updateWeek(userId: string, weekId: string, payload: UpdateWeekPayload) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);
    return this.weekRepository.updateWeek(weekId, validateUpdateWeekPayload(payload));
  }

  async submitWeeklyReview(
    userId: string,
    weekId: string,
    payload: SubmitWeeklyReviewPayload,
  ) {
    const week = await requireWeekOwnership(
      this.planRepository,
      this.weekRepository,
      userId,
      weekId,
    );
    const review = validateWeeklyReviewPayload(payload, week.weekNumber);

    return this.weekRepository.submitWeeklyReview(weekId, {
      weekNumber: review.weekNumber,
      executionScore: review.executionScore,
      reflection: review.reflection,
      adjustments: review.adjustments,
    });
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();

export const weekService = new WeekService(planRepository, weekRepository);
