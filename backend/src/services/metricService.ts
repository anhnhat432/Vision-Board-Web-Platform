import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";
import { requireMetricOwnership, requireWeekOwnership } from "./serviceGuards";

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

    return this.metricRepository.createMetric({
      weekId,
      name: payload.name?.trim() || "Lead Metric",
      weeklyTarget: payload.weeklyTarget ?? 0,
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

    const metric = await this.metricRepository.logMetric(metricId, {
      date: payload.date ? new Date(payload.date) : new Date(),
      value: payload.value,
      completed: payload.completed ?? payload.value > 0,
    });

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

    if (!Number.isFinite(payload.value)) {
      throw new ApiError(400, "Invalid metric log value.");
    }

    const metric = await this.metricRepository.updateMetricLog(metricId, logId, {
      date: payload.date ? new Date(payload.date) : undefined,
      value: payload.value,
      completed: payload.completed ?? payload.value > 0,
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
