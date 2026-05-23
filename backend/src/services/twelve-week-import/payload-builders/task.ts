import {
  normalizeTaskStatus,
  normalizeWeekNumber,
  optionalBoolean,
  optionalDate,
  optionalString,
  requiredString,
} from "../validators";
import type { ImportTaskData, ImportedWeekEntity } from "../types";

export function getTaskImportData(
  plan: Record<string, unknown>,
  task: Record<string, unknown>,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportTaskData {
  const weekNumber = normalizeWeekNumber(task.weekNumber ?? week.weekNumber, "task.weekNumber");

  return {
    weekId: week.id,
    clientPlanId: requiredString(task.clientPlanId ?? plan.clientPlanId, "task.clientPlanId"),
    clientWeekId: requiredString(task.clientWeekId, "task.clientWeekId"),
    clientTaskId: requiredString(task.clientTaskId, "task.clientTaskId"),
    weekNumber,
    title: requiredString(task.title, "task.title"),
    status: normalizeTaskStatus(task.status, "task.status"),
    scheduledDate: optionalDate(task.scheduledDate, "task.scheduledDate"),
    completedAt: optionalDate(task.completedAt, "task.completedAt"),
    leadIndicatorName: optionalString(task.leadIndicatorName, "task.leadIndicatorName"),
    isCore: optionalBoolean(task.isCore, "task.isCore"),
    importId,
    syncUpdatedAt: now,
  };
}
