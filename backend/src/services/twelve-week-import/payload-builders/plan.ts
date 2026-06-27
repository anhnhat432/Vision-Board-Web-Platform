import { ApiError } from "../../../utils/apiError";
import {
  getRequiredTextOrFallback,
  isRecord,
  normalizeGoalStatus,
  normalizeSchedule,
  normalizeWeekNumber,
  optionalDate,
  optionalNumber,
  optionalString,
  requiredString,
} from "../validators";
import type { ImportGoalData, ImportPlanData, ImportWeekData } from "../types";

function optionalRecord(value: unknown, fieldPath: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldPath} must be an object.`);
  }

  return { ...value };
}

function optionalStringArray(value: unknown, fieldPath: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldPath} must be an array.`);
  }

  return value.map((item, index) => requiredString(item, `${fieldPath}[${index}]`));
}

function normalizeWeekStartsOn(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === 0) return "Sunday";
  if (value === 1) return "Monday";

  const text = optionalString(value, "plan.weekStartsOn");
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  if (normalized === "sunday") return "Sunday";
  if (normalized === "monday") return "Monday";

  throw new ApiError(400, "plan.weekStartsOn must be Sunday, Monday, 0, or 1.");
}

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
    endDate: optionalDate(plan.endDate, "plan.endDate"),
    timezone: optionalString(plan.timezone, "plan.timezone"),
    weekStartsOn: normalizeWeekStartsOn(plan.weekStartsOn),
    totalWeeks: optionalNumber(plan.totalWeeks, "plan.totalWeeks"),
    status: optionalString(plan.status, "plan.status"),
    goalType: optionalString(plan.goalType, "plan.goalType"),
    templateId: optionalString(plan.templateId, "plan.templateId"),
    templateName: optionalString(plan.templateName, "plan.templateName"),
    lagMetric: optionalRecord(plan.lagMetric, "plan.lagMetric"),
    milestones: optionalRecord(plan.milestones, "plan.milestones"),
    successEvidence: optionalString(plan.successEvidence, "plan.successEvidence"),
    reviewDay: optionalString(plan.reviewDay, "plan.reviewDay"),
    week12Outcome: optionalString(plan.week12Outcome, "plan.week12Outcome"),
    weeklyActions: optionalStringArray(plan.weeklyActions, "plan.weeklyActions"),
    successMetric: optionalString(plan.successMetric, "plan.successMetric"),
    dailyReminderTime: optionalString(plan.dailyReminderTime, "plan.dailyReminderTime"),
    tacticLoadPreference: optionalString(plan.tacticLoadPreference, "plan.tacticLoadPreference"),
    preferredDays: normalizeSchedule(plan.preferredDays, "plan.preferredDays"),
    personalConstraint: optionalString(plan.personalConstraint, "plan.personalConstraint"),
    reentryCount: optionalNumber(plan.reentryCount, "plan.reentryCount"),
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
