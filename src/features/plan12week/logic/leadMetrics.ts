import type { LeadMetric } from "../types/planTypes";

function sanitizeMetricValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function logLeadMetric(
  metric: LeadMetric,
  date: string,
  value: number,
  completed = value > 0,
): LeadMetric {
  return {
    ...metric,
    logs: [
      ...metric.logs,
      {
        date,
        value: sanitizeMetricValue(value),
        completed: Boolean(completed),
      },
    ],
  };
}

export function getWeeklyMetricProgress(metric: LeadMetric): number {
  return metric.logs.reduce((total, log) => total + sanitizeMetricValue(log.value), 0);
}
