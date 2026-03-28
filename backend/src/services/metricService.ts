import { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { requireMetricOwnership, requireWeekOwnership } from "./serviceGuards";

export interface LogLeadMetricPayload {
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
