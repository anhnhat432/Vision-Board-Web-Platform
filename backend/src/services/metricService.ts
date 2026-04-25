import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";
import { assertValidObjectId, requireMetricOwnership, requireWeekOwnership } from "./serviceGuards";

export interface LogLeadMetricPayload {
  date?: string;
  value: number;
  completed?: boolean;
}

export interface UpdateLeadMetricLogPayload {
  date?: string;
  value: number;
  completed?: boolean;
}

export interface CreateWeekMetricPayload {
  name: string;
  weeklyTarget?: number;
}

function isPayloadRecord(payload: unknown): payload is Record<string, unknown> {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function validateMetricName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "Metric name is required.");
  }

  const name = value.trim();
  if (!name) {
    throw new ApiError(400, "Metric name cannot be empty.");
  }

  return name;
}

function validateOptionalNonNegativeNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative number.`);
  }

  return value;
}

function validateMetricValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, "Metric value must be a valid number.");
  }

  return value;
}

function validateOptionalDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  return parsed;
}

function validateOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldName} must be a boolean.`);
  }

  return value;
}

function validateCreateMetricPayload(payload: unknown): { name: string; weeklyTarget?: number } {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  return {
    name: validateMetricName(payload.name),
    weeklyTarget: validateOptionalNonNegativeNumber(payload.weeklyTarget, "weeklyTarget"),
  };
}

function validateMetricLogPayload(payload: unknown): { date?: Date; value: number; completed?: boolean } {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  return {
    date: validateOptionalDate(payload.date, "date"),
    value: validateMetricValue(payload.value),
    completed: validateOptionalBoolean(payload.completed, "completed"),
  };
}

class MetricService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
    private readonly metricRepository: MongoMetricRepository,
  ) {}

  async createWeekMetric(
    userId: string,
    weekId: string,
    payload: CreateWeekMetricPayload,
  ) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);
    const metric = validateCreateMetricPayload(payload);

    return this.metricRepository.createMetric({
      weekId,
      name: metric.name,
      weeklyTarget: metric.weeklyTarget ?? 0,
    });
  }

  async logLeadMetric(userId: string, metricId: string, payload: LogLeadMetricPayload) {
    await requireMetricOwnership(
      this.planRepository,
      this.weekRepository,
      this.metricRepository,
      userId,
      metricId,
    );
    const log = validateMetricLogPayload(payload);

    const metric = await this.metricRepository.logMetric(metricId, {
      date: log.date ?? new Date(),
      value: log.value,
      completed: log.completed ?? log.value > 0,
    });
    if (!metric) {
      throw new ApiError(404, "Metric not found.");
    }

    return metric;
  }

  async updateLeadMetricLog(
    userId: string,
    metricId: string,
    logId: string,
    payload: UpdateLeadMetricLogPayload,
  ) {
    await requireMetricOwnership(
      this.planRepository,
      this.weekRepository,
      this.metricRepository,
      userId,
      metricId,
    );
    assertValidObjectId(logId, "logId");
    const log = validateMetricLogPayload(payload);

    const metric = await this.metricRepository.updateMetricLog(metricId, logId, {
      date: log.date,
      value: log.value,
      completed: log.completed ?? log.value > 0,
    });

    if (!metric) {
      throw new ApiError(404, "Metric log not found.");
    }

    return metric;
  }

  async getWeekMetrics(userId: string, weekId: string) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);
    return this.metricRepository.getMetricsByWeekId(weekId);
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const metricRepository = new MongoMetricRepository();

export const metricService = new MetricService(
  planRepository,
  weekRepository,
  metricRepository,
);
