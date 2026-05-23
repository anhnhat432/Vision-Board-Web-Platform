import {
  getRequiredTextOrFallback,
  normalizeSchedule,
  optionalNumber,
  optionalString,
  parseOptionalNumericText,
  requiredString,
} from "../validators";
import type { ImportLeadMetricData, ImportedWeekEntity } from "../types";

export function getLeadMetricImportData(
  userId: string,
  plan: Record<string, unknown>,
  metric: Record<string, unknown>,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportLeadMetricData {
  const target = optionalString(metric.target, "leadMetric.target");
  const weeklyTarget =
    optionalNumber(metric.weeklyTarget, "leadMetric.weeklyTarget") ?? parseOptionalNumericText(target) ?? 0;

  return {
    userId,
    weekId: week.id,
    clientPlanId: requiredString(metric.clientPlanId ?? plan.clientPlanId, "leadMetric.clientPlanId"),
    clientWeekId: requiredString(metric.clientWeekId, "leadMetric.clientWeekId"),
    clientMetricId: requiredString(metric.clientMetricId, "leadMetric.clientMetricId"),
    leadIndicatorId:
      optionalString(metric.leadIndicatorId, "leadMetric.leadIndicatorId") ??
      optionalString(metric.id, "leadMetric.id"),
    name: getRequiredTextOrFallback(metric.name, `Week ${week.weekNumber} lead metric`, "leadMetric.name"),
    weeklyTarget,
    target,
    unit: optionalString(metric.unit, "leadMetric.unit"),
    type: optionalString(metric.type, "leadMetric.type"),
    priority: optionalNumber(metric.priority, "leadMetric.priority"),
    schedule: normalizeSchedule(metric.schedule, "leadMetric.schedule"),
    currentValue: optionalNumber(metric.currentValue ?? metric.current, "leadMetric.currentValue"),
    frequency: optionalString(metric.frequency, "leadMetric.frequency"),
    importId,
    syncUpdatedAt: now,
  };
}
