import { ApiError } from "../../utils/apiError";
import {
  twelveWeekImportValidationService,
  type TwelveWeekImportValidatedGoal,
  type TwelveWeekImportValidationService,
} from "../twelveWeekImportValidationService";
import { hashPayload, isDuplicateKeyError, requireImportId } from "./idempotency";
import {
  getDailyCheckInImportData,
  getGoalImportData,
  getLeadMetricImportData,
  getPlanImportData,
  getTaskImportData,
  getWeekImportData,
  getWeeklyReviewImportData,
} from "./payload-builders";
import {
  addLink,
  addOperationCount,
  createEmptyResult,
  createPartialImportError,
  hasImportSideEffects,
  toDuplicateResult,
} from "./result";
import { getRecords, requiredRecord, requiredString } from "./validators";
import type {
  ImportedWeekEntity,
  TwelveWeekImportRepository,
  TwelveWeekImportResult,
} from "./types";

export class TwelveWeekImportService {
  constructor(
    private readonly repository: TwelveWeekImportRepository,
    private readonly validator: TwelveWeekImportValidationService = twelveWeekImportValidationService,
  ) {}

  async importWorkspace(userId: string, payload: unknown): Promise<TwelveWeekImportResult> {
    const validationBundle = this.validator.validateAndExtractImportPayload(userId, payload);
    const importId = requireImportId(payload, validationBundle.report);
    const payloadHash = hashPayload(payload);
    const existingImport = await this.repository.findImportLog(userId, importId);

    if (existingImport) {
      if (existingImport.payloadHash !== payloadHash) {
        throw new ApiError(409, "Import idempotency conflict.", {
          importId,
          message: "The same importId was already used with a different payload for this user.",
        });
      }

      return toDuplicateResult(existingImport, importId, validationBundle.report);
    }

    const now = new Date();
    const result = createEmptyResult(importId, validationBundle.report);

    try {
      for (const goalPayload of validationBundle.goals) {
        await this.importGoal(userId, goalPayload, importId, now, result);
      }
    } catch (error) {
      if (hasImportSideEffects(result.summary)) {
        throw createPartialImportError(error, importId, result);
      }
      throw error;
    }

    try {
      await this.repository.createImportLog({
        userId,
        mutationId: importId,
        type: "12_week_import",
        payloadHash,
        status: "accepted",
        result,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        if (hasImportSideEffects(result.summary)) {
          throw createPartialImportError(error, importId, result);
        }
        throw error;
      }

      const duplicateLog = await this.repository.findImportLog(userId, importId);
      if (duplicateLog && duplicateLog.payloadHash === payloadHash) {
        return toDuplicateResult(duplicateLog, importId, validationBundle.report);
      }

      if (hasImportSideEffects(result.summary)) {
        throw createPartialImportError(error, importId, result);
      }
      throw error;
    }

    return result;
  }

  private async importGoal(
    userId: string,
    goalPayload: TwelveWeekImportValidatedGoal,
    importId: string,
    now: Date,
    result: TwelveWeekImportResult,
  ): Promise<void> {
    const goal = goalPayload.value;
    const plan = requiredRecord(goal.plan, `${goalPayload.path}.plan`);
    const goalData = getGoalImportData(userId, goal, plan, importId, now);
    const goalUpsert = await this.repository.upsertGoal(goalData);

    addOperationCount(result.summary, "goals", goalUpsert.operation);
    addLink(result.links.goals, goalData.clientGoalId, goalUpsert.entity.id, goalUpsert.operation);

    const planData = getPlanImportData(userId, goalData, plan, goalUpsert.entity.id, importId, now);
    const planUpsert = await this.repository.upsertPlan(planData);

    addOperationCount(result.summary, "plans", planUpsert.operation);
    addLink(result.links.plans, planData.clientPlanId, planUpsert.entity.id, planUpsert.operation);
    await this.repository.linkGoalToPlan(goalUpsert.entity.id, planUpsert.entity.id, importId, now);

    const weekByClientId = new Map<string, ImportedWeekEntity>();
    for (const week of getRecords(plan.weeks, `${goalPayload.path}.plan.weeks`)) {
      const weekData = getWeekImportData(plan, week, planUpsert.entity.id, importId, now);
      const weekUpsert = await this.repository.upsertWeek(weekData);
      addOperationCount(result.summary, "weeks", weekUpsert.operation);
      addLink(result.links.weeks, weekData.clientWeekId, weekUpsert.entity.id, weekUpsert.operation);
      weekByClientId.set(weekData.clientWeekId, weekUpsert.entity);
    }

    for (const task of getRecords(plan.tasks, `${goalPayload.path}.plan.tasks`)) {
      const clientWeekId = requiredString(task.clientWeekId, "task.clientWeekId");
      const week = weekByClientId.get(clientWeekId);
      if (!week) {
        throw new ApiError(400, "Task clientWeekId must reference an imported week.", { clientWeekId });
      }

      const taskData = getTaskImportData(plan, task, week, importId, now);
      const taskUpsert = await this.repository.upsertTask(taskData);
      addOperationCount(result.summary, "tasks", taskUpsert.operation);
      addLink(result.links.tasks, taskData.clientTaskId, taskUpsert.entity.id, taskUpsert.operation);
    }

    for (const metric of getRecords(plan.leadMetrics, `${goalPayload.path}.plan.leadMetrics`)) {
      const clientWeekId = requiredString(metric.clientWeekId, "leadMetric.clientWeekId");
      const week = weekByClientId.get(clientWeekId);
      if (!week) {
        throw new ApiError(400, "Lead metric clientWeekId must reference an imported week.", { clientWeekId });
      }

      const metricData = getLeadMetricImportData(userId, plan, metric, week, importId, now);
      const metricUpsert = await this.repository.upsertLeadMetric(metricData);
      addOperationCount(result.summary, "leadMetrics", metricUpsert.operation);
      addLink(result.links.leadMetrics, metricData.clientMetricId, metricUpsert.entity.id, metricUpsert.operation);
    }

    for (const checkIn of getRecords(plan.dailyCheckIns, `${goalPayload.path}.plan.dailyCheckIns`)) {
      const clientWeekId = requiredString(checkIn.clientWeekId, "dailyCheckIn.clientWeekId");
      const week = weekByClientId.get(clientWeekId);
      if (!week) {
        throw new ApiError(400, "Daily check-in clientWeekId must reference an imported week.", { clientWeekId });
      }

      const checkInData = getDailyCheckInImportData(
        userId,
        goalData,
        plan,
        checkIn,
        planUpsert.entity.id,
        week,
        importId,
        now,
      );
      const checkInUpsert = await this.repository.upsertDailyCheckIn(checkInData);
      addOperationCount(result.summary, "dailyCheckIns", checkInUpsert.operation);
      addLink(
        result.links.dailyCheckIns,
        checkInData.clientCheckInId,
        checkInUpsert.entity.id,
        checkInUpsert.operation,
      );
    }

    for (const review of getRecords(plan.weeklyReviews, `${goalPayload.path}.plan.weeklyReviews`)) {
      const clientWeekId = requiredString(review.clientWeekId, "weeklyReview.clientWeekId");
      const week = weekByClientId.get(clientWeekId);
      if (!week) {
        throw new ApiError(400, "Weekly review clientWeekId must reference an imported week.", { clientWeekId });
      }

      const reviewData = getWeeklyReviewImportData(
        userId,
        plan,
        review,
        planUpsert.entity.id,
        week,
        importId,
        now,
      );
      const reviewUpsert = await this.repository.upsertWeeklyReview(reviewData);
      addOperationCount(result.summary, "weeklyReviews", reviewUpsert.operation);
      addLink(
        result.links.weeklyReviews,
        reviewData.clientReviewId,
        reviewUpsert.entity.id,
        reviewUpsert.operation,
      );
    }
  }
}
