import { ApiError } from "../../utils/apiError";
import type { GoalStatus } from "../../models/GoalModel";
import type { TaskStatus } from "./types";

export function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function requiredRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldPath} must be an object.`);
  }

  return value;
}

export function requiredString(value: unknown, fieldPath: string): string {
  const text = toOptionalString(value);
  if (!text) {
    throw new ApiError(400, `${fieldPath} is required.`);
  }

  return text;
}

export function optionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }

  return toOptionalString(value);
}

export function optionalBoolean(value: unknown, fieldPath: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldPath} must be a boolean.`);
  }

  return value;
}

export function optionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, `${fieldPath} must be a finite number.`);
  }

  return value;
}

export function optionalNumberRange(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
): number | undefined {
  const numberValue = optionalNumber(value, fieldPath);
  if (numberValue === undefined) return undefined;
  if (numberValue < min || numberValue > max) {
    throw new ApiError(400, `${fieldPath} must be between ${min} and ${max}.`);
  }

  return numberValue;
}

export function optionalDate(value: unknown, fieldPath: string): Date | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO date string.`);
  }

  return parsed;
}

export function requiredDateKey(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a valid date string.`);
  }

  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (dateOnlyMatch?.[1]) return dateOnlyMatch[1];

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid date string.`);
  }

  return parsed.toISOString().slice(0, 10);
}

export function getRecords(value: unknown, fieldPath: string): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldPath} must be an array.`);
  }

  return value.map((item, index) => requiredRecord(item, `${fieldPath}[${index}]`));
}

export function normalizeGoalStatus(value: unknown): GoalStatus {
  const status = optionalString(value, "goal.status") ?? "active";
  if (status !== "active" && status !== "completed" && status !== "archived") {
    throw new ApiError(400, "goal.status must be active, completed, or archived.");
  }

  return status;
}

export function normalizeTaskStatus(value: unknown, fieldPath: string): TaskStatus {
  const status = optionalString(value, fieldPath) ?? "todo";
  if (status !== "todo" && status !== "doing" && status !== "done") {
    throw new ApiError(400, `${fieldPath} must be todo, doing, or done.`);
  }

  return status;
}

export function normalizeWeekNumber(value: unknown, fieldPath: string): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 12) {
    throw new ApiError(400, `${fieldPath} must be an integer between 1 and 12.`);
  }

  return value as number;
}

export function normalizeMood(
  value: unknown,
  fieldPath: string,
): "low" | "steady" | "high" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value !== "low" && value !== "steady" && value !== "high") {
    throw new ApiError(400, `${fieldPath} must be low, steady, or high.`);
  }

  return value;
}

export function normalizeWorkloadDecision(
  value: unknown,
  fieldPath: string,
): "keep same" | "reduce slightly" | "increase slightly" | "" | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    value !== "keep same" &&
    value !== "reduce slightly" &&
    value !== "increase slightly" &&
    value !== ""
  ) {
    throw new ApiError(400, `${fieldPath} must be a supported workload decision.`);
  }

  return value;
}

export function getRequiredTextOrFallback(
  value: unknown,
  fallback: string,
  fieldPath: string,
): string {
  const text = optionalString(value, fieldPath);
  return text ?? fallback;
}

export function parseOptionalNumericText(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizeSchedule(value: unknown, fieldPath: string): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldPath} must be an array.`);
  }

  return value.map((day, index) => {
    if (!Number.isInteger(day)) {
      throw new ApiError(400, `${fieldPath}[${index}] must be an integer.`);
    }
    return day;
  });
}

export function getExecutionScore(review: Record<string, unknown>): number {
  const explicitScore = optionalNumberRange(review.executionScore, "weeklyReview.executionScore", 0, 100);
  if (explicitScore !== undefined) return explicitScore;

  const leadCompletionPercent = optionalNumberRange(
    review.leadCompletionPercent,
    "weeklyReview.leadCompletionPercent",
    0,
    100,
  );
  if (leadCompletionPercent !== undefined) return leadCompletionPercent;

  const scoreFields = [
    "progressScore",
    "disciplineScore",
    "focusScore",
    "improvementScore",
    "outputQualityScore",
  ] as const;

  let total = 0;
  let count = 0;
  for (const field of scoreFields) {
    const score = optionalNumberRange(review[field], `weeklyReview.${field}`, 0, 10);
    if (score !== undefined) {
      total += score;
      count += 1;
    }
  }

  if (count === 0) return 0;
  return Math.round(((total / count) / 10) * 100);
}
