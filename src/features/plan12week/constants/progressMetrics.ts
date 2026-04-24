export const DAILY_CHECKIN_METRIC_NAME = "__daily_checkin__";

export function isDailyCheckInMetric(metricName: string): boolean {
  return metricName.trim().toLowerCase() === DAILY_CHECKIN_METRIC_NAME;
}
