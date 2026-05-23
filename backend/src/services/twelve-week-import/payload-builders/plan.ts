import { ApiError } from "../../../utils/apiError";
import {
  getRequiredTextOrFallback,
  normalizeGoalStatus,
  normalizeWeekNumber,
  optionalDate,
  optionalString,
  requiredString,
} from "../validators";
import type { ImportGoalData, ImportPlanData, ImportWeekData } from "../types";

export function getGoalImportData(
  userId: string,
  goal: Record<string, unknown>,
  plan: Record<string, unknown>,
  importId: string,
  now: Date,
): ImportGoalData {
  const deadline = optionalDate(goal.deadline, "goal.deadline") ?? optionalDate(plan.endDate, "plan.endDate");
  if (!deadline) {
    throw new ApiError(400, "goal.deadline or plan.endDate is required.");
  }

  return {
    userId,
    clientGoalId: requiredString(goal.clientGoalId, "goal.clientGoalId"),
    title: requiredString(goal.title, "goal.title"),
    category: requiredString(goal.category, "goal.category"),
    description: requiredString(goal.description, "goal.description"),
    deadline,
    status: normalizeGoalStatus(goal.status),
    focusArea: optionalString(goal.focusArea, "goal.focusArea"),
    importId,
    syncUpdatedAt: now,
  };
}

export function getPlanImportData(
  userId: string,
  goalData: ImportGoalData,
  plan: Record<string, unknown>,
  backendGoalId: string,
  importId: string,
  now: Date,
): ImportPlanData {
  return {
    userId,
    clientGoalId: goalData.clientGoalId,
    clientPlanId: requiredString(plan.clientPlanId, "plan.clientPlanId"),
    smartGoalId: backendGoalId,
    vision: optionalString(plan.vision, "plan.vision") ?? "",
    startDate: optionalDate(plan.startDate, "plan.startDate") ?? now,
    importId,
    syncUpdatedAt: now,
  };
}

export function getWeekImportData(
  plan: Record<string, unknown>,
  week: Record<string, unknown>,
  backendPlanId: string,
  importId: string,
  now: Date,
): ImportWeekData {
  const weekNumber = normalizeWeekNumber(week.weekNumber, "week.weekNumber");

  return {
    planId: backendPlanId,
    clientPlanId: requiredString(plan.clientPlanId, "plan.clientPlanId"),
    clientWeekId: requiredString(week.clientWeekId, "week.clientWeekId"),
    weekNumber,
    focus: getRequiredTextOrFallback(week.focus, `Week ${weekNumber} focus`, "week.focus"),
    expectedOutput: getRequiredTextOrFallback(
      week.expectedOutput,
      `Week ${weekNumber} expected output`,
      "week.expectedOutput",
    ),
    importId,
    syncUpdatedAt: now,
  };
}
