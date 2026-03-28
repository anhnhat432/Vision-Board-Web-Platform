import type { LeadMetric, LeadMetricLog } from "@/domain";

import { createEntityId, metricStore, nowIsoString } from "./inMemoryStore";

type CreateMetricInput = Omit<LeadMetric, "id" | "logs" | "createdAt" | "updatedAt">;
type UpdateMetricInput = Partial<Omit<LeadMetric, "id" | "weekId" | "logs" | "createdAt" | "updatedAt">>;
type LogMetricInput = Pick<LeadMetricLog, "date" | "value" | "completed">;

export class MetricRepository {
  async createMetric(input: CreateMetricInput): Promise<LeadMetric> {
    const timestamp = nowIsoString();
    const metric: LeadMetric = {
      id: createEntityId("metric"),
      weekId: input.weekId,
      name: input.name,
      weeklyTarget: input.weeklyTarget,
      logs: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    metricStore.set(metric.id, metric);
    return metric;
  }

  async getMetricById(metricId: string): Promise<LeadMetric | null> {
    return metricStore.get(metricId) ?? null;
  }

  async getMetricsByWeekId(weekId: string): Promise<LeadMetric[]> {
    return [...metricStore.values()].filter((metric) => metric.weekId === weekId);
  }

  async updateMetric(metricId: string, patch: UpdateMetricInput): Promise<LeadMetric | null> {
    const currentMetric = metricStore.get(metricId);
    if (!currentMetric) return null;

    const updatedMetric: LeadMetric = {
      ...currentMetric,
      ...patch,
      updatedAt: nowIsoString(),
    };

    metricStore.set(metricId, updatedMetric);
    return updatedMetric;
  }

  async logMetric(metricId: string, input: LogMetricInput): Promise<LeadMetricLog | null> {
    const currentMetric = metricStore.get(metricId);
    if (!currentMetric) return null;

    const log: LeadMetricLog = {
      id: createEntityId("metric_log"),
      metricId,
      date: input.date,
      value: input.value,
      completed: input.completed,
      createdAt: nowIsoString(),
    };

    const updatedMetric: LeadMetric = {
      ...currentMetric,
      logs: [...currentMetric.logs, log],
      updatedAt: nowIsoString(),
    };

    metricStore.set(metricId, updatedMetric);
    return log;
  }
}
