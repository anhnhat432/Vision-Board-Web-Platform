import { get, post } from "@/lib/api/apiClient";
import type { Metric } from "@/types/plan";

export interface CreateMetricPayload {
  name: string;
  weeklyTarget?: number;
}

export interface LogMetricPayload {
  date?: string;
  value: number;
  completed?: boolean;
}

export function getMetrics(weekId: string): Promise<Metric[]> {
  return get<Metric[]>(`/weeks/${weekId}/metrics`);
}

export function createMetric(
  weekId: string,
  payload: CreateMetricPayload,
): Promise<Metric> {
  return post<Metric, CreateMetricPayload>(`/weeks/${weekId}/metrics`, payload);
}

export function logMetric(
  metricId: string,
  payload: LogMetricPayload,
): Promise<Metric> {
  return post<Metric, LogMetricPayload>(`/metrics/${metricId}/logs`, payload);
}
