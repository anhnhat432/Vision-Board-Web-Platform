import { ApiError } from "../../utils/apiError";
import type { SyncMutationLogEntity } from "../../repositories/mongo/MongoSyncMutationLogRepository";
import type { TwelveWeekImportValidationReport } from "../twelveWeekImportValidationService";
import { isRecord } from "./validators";
import type {
  ImportEntityOperation,
  TwelveWeekImportEntityLink,
  TwelveWeekImportResult,
  TwelveWeekImportSummary,
} from "./types";

export function isImportResult(value: unknown): value is TwelveWeekImportResult {
  return (
    isRecord(value) &&
    value.importId !== undefined &&
    value.summary !== undefined &&
    value.links !== undefined
  );
}

export function makeEmptySummary(): TwelveWeekImportSummary {
  return {
    goalsCreated: 0,
    goalsUpdated: 0,
    plansCreated: 0,
    plansUpdated: 0,
    weeksCreated: 0,
    weeksUpdated: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
    leadMetricsCreated: 0,
    leadMetricsUpdated: 0,
    dailyCheckInsCreated: 0,
    dailyCheckInsUpdated: 0,
    weeklyReviewsCreated: 0,
    weeklyReviewsUpdated: 0,
  };
}

export function createEmptyResult(
  importId: string,
  validation: TwelveWeekImportValidationReport,
): TwelveWeekImportResult {
  return {
    status: "applied",
    importId,
    validation,
    summary: makeEmptySummary(),
    links: {
      goals: [],
      plans: [],
      weeks: [],
      tasks: [],
      leadMetrics: [],
      dailyCheckIns: [],
      weeklyReviews: [],
    },
    skipped: {
      leadIndicators: validation.acceptedEntityCounts.leadIndicators,
      leadMetrics: 0,
      dailyCheckIns: 0,
      weeklyReviews: 0,
    },
    message:
      "12-week import applied for Goal, Plan, Week, Task, lead metric, daily check-in, and weekly review records.",
  };
}

export function hasImportSideEffects(summary: TwelveWeekImportSummary): boolean {
  return Object.values(summary).some((count) => count > 0);
}

export function createPartialImportError(
  error: unknown,
  importId: string,
  result: TwelveWeekImportResult,
): ApiError {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  return new ApiError(statusCode, "12-week import stopped after partial writes.", {
    importId,
    status: "partial",
    message:
      "Some records may already have been written. Retry the same importId and payload after resolving the failure; synced records are upserted by client IDs.",
    summary: result.summary,
    links: result.links,
    skipped: result.skipped,
    validation: result.validation,
    cause: error instanceof Error ? error.message : "Unknown import failure.",
  });
}

export function toDuplicateResult(
  log: SyncMutationLogEntity,
  importId: string,
  validation: TwelveWeekImportValidationReport,
): TwelveWeekImportResult {
  if (isImportResult(log.result)) {
    return {
      ...log.result,
      status: "duplicate",
      importId,
      duplicateOf: log.id,
      validation,
      message: "12-week import was already applied for this user.",
    };
  }

  return {
    ...createEmptyResult(importId, validation),
    status: "duplicate",
    duplicateOf: log.id,
    message: "12-week import was already accepted for this user.",
  };
}

export function addLink(
  links: TwelveWeekImportEntityLink[],
  clientId: string,
  id: string,
  operation: ImportEntityOperation,
): void {
  links.push({ clientId, id, operation });
}

export function addOperationCount(
  summary: TwelveWeekImportSummary,
  entity: "goals" | "plans" | "weeks" | "tasks" | "leadMetrics" | "dailyCheckIns" | "weeklyReviews",
  operation: ImportEntityOperation,
): void {
  const key = `${entity}${operation === "created" ? "Created" : "Updated"}` as keyof TwelveWeekImportSummary;
  summary[key] += 1;
}
