import { createHash } from "node:crypto";

import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel, type GoalStatus } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import {
  MongoSyncMutationLogRepository,
  type CreateSyncMutationLogData,
  type SyncMutationLogEntity,
} from "../repositories/mongo/MongoSyncMutationLogRepository";
import { ApiError } from "../utils/apiError";
import {
  twelveWeekImportValidationService,
  type TwelveWeekImportValidationReport,
  type TwelveWeekImportValidationService,
  type TwelveWeekImportValidatedGoal,
} from "./twelveWeekImportValidationService";

type ImportEntityOperation = "created" | "updated";
type TaskStatus = "todo" | "doing" | "done";

export interface TwelveWeekImportSummary {
  goalsCreated: number;
  goalsUpdated: number;
  plansCreated: number;
  plansUpdated: number;
  weeksCreated: number;
  weeksUpdated: number;
  tasksCreated: number;
  tasksUpdated: number;
  leadMetricsCreated: number;
  leadMetricsUpdated: number;
  dailyCheckInsCreated: number;
  dailyCheckInsUpdated: number;
  weeklyReviewsCreated: number;
  weeklyReviewsUpdated: number;
}

export interface TwelveWeekImportEntityLink {
  clientId: string;
  id: string;
  operation: ImportEntityOperation;
}

export interface TwelveWeekImportResult {
  status: "applied" | "duplicate";
  importId: string;
  duplicateOf?: string;
  validation: TwelveWeekImportValidationReport;
  summary: TwelveWeekImportSummary;
  links: {
    goals: TwelveWeekImportEntityLink[];
    plans: TwelveWeekImportEntityLink[];
    weeks: TwelveWeekImportEntityLink[];
    tasks: TwelveWeekImportEntityLink[];
    leadMetrics: TwelveWeekImportEntityLink[];
    dailyCheckIns: TwelveWeekImportEntityLink[];
    weeklyReviews: TwelveWeekImportEntityLink[];
  };
  skipped: {
    leadIndicators: number;
    leadMetrics: number;
    dailyCheckIns: number;
    weeklyReviews: number;
  };
  message: string;
}

export interface ImportedGoalEntity {
  id: string;
  userId: string;
  clientGoalId: string;
}

export interface ImportedPlanEntity {
  id: string;
  userId: string;
  clientPlanId: string;
}

export interface ImportedWeekEntity {
  id: string;
  planId: string;
  clientWeekId: string;
  weekNumber: number;
}

export interface ImportedTaskEntity {
  id: string;
  weekId: string;
  clientTaskId: string;
}

export interface ImportedLeadMetricEntity {
  id: string;
  weekId: string;
  clientMetricId: string;
}

export interface ImportedDailyCheckInEntity {
  id: string;
  planId: string;
  weekId: string;
  clientCheckInId: string;
}

export interface ImportedWeeklyReviewEntity {
  id: string;
  weekId: string;
  clientReviewId: string;
}

export interface UpsertResult<T> {
  entity: T;
  operation: ImportEntityOperation;
}

export interface ImportGoalData {
  userId: string;
  clientGoalId: string;
  title: string;
  category: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  focusArea?: string;
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportPlanData {
  userId: string;
  clientGoalId: string;
  clientPlanId: string;
  smartGoalId: string;
  vision: string;
  startDate: Date;
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportWeekData {
  planId: string;
  clientPlanId: string;
  clientWeekId: string;
  weekNumber: number;
  focus: string;
  expectedOutput: string;
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportTaskData {
  weekId: string;
  clientPlanId: string;
  clientWeekId: string;
  clientTaskId: string;
  weekNumber: number;
  title: string;
  status: TaskStatus;
  scheduledDate?: Date;
  completedAt?: Date;
  leadIndicatorName?: string;
  isCore?: boolean;
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportLeadMetricData {
  userId: string;
  weekId: string;
  clientPlanId: string;
  clientWeekId: string;
  clientMetricId: string;
  leadIndicatorId?: string;
  name: string;
  weeklyTarget: number;
  target?: string;
  unit?: string;
  type?: string;
  priority?: number;
  schedule?: number[];
  currentValue?: number;
  frequency?: string;
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportDailyCheckInData {
  userId: string;
  planId: string;
  weekId: string;
  clientGoalId?: string;
  clientPlanId: string;
  clientWeekId: string;
  clientCheckInId: string;
  weekNumber: number;
  localDate: string;
  didWorkToday: boolean;
  whichLeadIndicatorWorkedOn?: string;
  amountDone?: string;
  outputCreated?: string;
  obstacleOrIssue?: string;
  dailySelfRating?: number;
  optionalNote?: string;
  mood?: "low" | "steady" | "high";
  importId: string;
  syncUpdatedAt: Date;
}

export interface ImportWeeklyReviewData {
  userId: string;
  planId: string;
  weekId: string;
  clientPlanId: string;
  clientWeekId: string;
  clientReviewId: string;
  weekNumber: number;
  executionScore: number;
  leadCompletionPercent?: number;
  lagProgressValue?: string;
  biggestOutputThisWeek?: string;
  mainObstacle?: string;
  nextWeekPriority?: string;
  workloadDecision?: "keep same" | "reduce slightly" | "increase slightly" | "";
  reviewCompleted?: boolean;
  progressScore?: number;
  disciplineScore?: number;
  focusScore?: number;
  improvementScore?: number;
  outputQualityScore?: number;
  completedLeadIndicators?: number;
  importId: string;
  syncUpdatedAt: Date;
}

export interface TwelveWeekImportRepository {
  findImportLog(userId: string, importId: string): Promise<SyncMutationLogEntity | null>;
  createImportLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity>;
  upsertGoal(data: ImportGoalData): Promise<UpsertResult<ImportedGoalEntity>>;
  linkGoalToPlan(goalId: string, planId: string, importId: string, syncUpdatedAt: Date): Promise<void>;
  upsertPlan(data: ImportPlanData): Promise<UpsertResult<ImportedPlanEntity>>;
  upsertWeek(data: ImportWeekData): Promise<UpsertResult<ImportedWeekEntity>>;
  upsertTask(data: ImportTaskData): Promise<UpsertResult<ImportedTaskEntity>>;
  upsertLeadMetric(data: ImportLeadMetricData): Promise<UpsertResult<ImportedLeadMetricEntity>>;
  upsertDailyCheckIn(data: ImportDailyCheckInData): Promise<UpsertResult<ImportedDailyCheckInEntity>>;
  upsertWeeklyReview(data: ImportWeeklyReviewData): Promise<UpsertResult<ImportedWeeklyReviewEntity>>;
}

interface MongoDocWithId {
  _id: { toString(): string } | string;
}

interface MongoGoalDoc extends MongoDocWithId {
  userId: string;
  clientGoalId?: string | null;
}

interface MongoPlanDoc extends MongoDocWithId {
  userId: string;
  clientPlanId?: string | null;
}

interface MongoWeekDoc extends MongoDocWithId {
  planId: { toString(): string } | string;
  clientWeekId?: string | null;
  weekNumber: number;
}

interface MongoTaskDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientTaskId?: string | null;
}

interface MongoLeadMetricDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientMetricId?: string | null;
}

interface MongoDailyCheckInDoc extends MongoDocWithId {
  planId: { toString(): string } | string;
  weekId: { toString(): string } | string;
  clientCheckInId?: string | null;
}

interface MongoWeeklyReviewDoc extends MongoDocWithId {
  weekId: { toString(): string } | string;
  clientReviewId?: string | null;
}

function getDocId(doc: MongoDocWithId): string {
  return doc._id.toString();
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldPath} must be an object.`);
  }

  return value;
}

function requiredString(value: unknown, fieldPath: string): string {
  const text = toOptionalString(value);
  if (!text) {
    throw new ApiError(400, `${fieldPath} is required.`);
  }

  return text;
}

function optionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }

  return toOptionalString(value);
}

function optionalBoolean(value: unknown, fieldPath: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldPath} must be a boolean.`);
  }

  return value;
}

function optionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, `${fieldPath} must be a finite number.`);
  }

  return value;
}

function optionalNumberRange(value: unknown, fieldPath: string, min: number, max: number): number | undefined {
  const numberValue = optionalNumber(value, fieldPath);
  if (numberValue === undefined) return undefined;
  if (numberValue < min || numberValue > max) {
    throw new ApiError(400, `${fieldPath} must be between ${min} and ${max}.`);
  }

  return numberValue;
}

function optionalDate(value: unknown, fieldPath: string): Date | undefined {
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

function requiredDateKey(value: unknown, fieldPath: string): string {
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

function normalizeGoalStatus(value: unknown): GoalStatus {
  const status = optionalString(value, "goal.status") ?? "active";
  if (status !== "active" && status !== "completed" && status !== "archived") {
    throw new ApiError(400, "goal.status must be active, completed, or archived.");
  }

  return status;
}

function normalizeTaskStatus(value: unknown, fieldPath: string): TaskStatus {
  const status = optionalString(value, fieldPath) ?? "todo";
  if (status !== "todo" && status !== "doing" && status !== "done") {
    throw new ApiError(400, `${fieldPath} must be todo, doing, or done.`);
  }

  return status;
}

function normalizeWeekNumber(value: unknown, fieldPath: string): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 12) {
    throw new ApiError(400, `${fieldPath} must be an integer between 1 and 12.`);
  }

  return value as number;
}

function normalizeMood(value: unknown, fieldPath: string): "low" | "steady" | "high" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value !== "low" && value !== "steady" && value !== "high") {
    throw new ApiError(400, `${fieldPath} must be low, steady, or high.`);
  }

  return value;
}

function normalizeWorkloadDecision(
  value: unknown,
  fieldPath: string,
): "keep same" | "reduce slightly" | "increase slightly" | "" | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== "keep same" && value !== "reduce slightly" && value !== "increase slightly" && value !== "") {
    throw new ApiError(400, `${fieldPath} must be a supported workload decision.`);
  }

  return value;
}

function getRequiredTextOrFallback(value: unknown, fallback: string, fieldPath: string): string {
  const text = optionalString(value, fieldPath);
  return text ?? fallback;
}

function parseOptionalNumericText(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeSchedule(value: unknown, fieldPath: string): number[] | undefined {
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

function getExecutionScore(review: Record<string, unknown>): number {
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
    optionalNumberRange(review.progressScore, "weeklyReview.progressScore", 0, 10),
    optionalNumberRange(review.disciplineScore, "weeklyReview.disciplineScore", 0, 10),
    optionalNumberRange(review.focusScore, "weeklyReview.focusScore", 0, 10),
    optionalNumberRange(review.improvementScore, "weeklyReview.improvementScore", 0, 10),
    optionalNumberRange(review.outputQualityScore, "weeklyReview.outputQualityScore", 0, 10),
  ].filter((value): value is number => value !== undefined);

  if (scoreFields.length === 0) return 0;
  return Math.round((scoreFields.reduce((sum, value) => sum + value, 0) / scoreFields.length) * 10);
}

function getRecords(value: unknown, fieldPath: string): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldPath} must be an array.`);
  }

  return value.map((item, index) => requiredRecord(item, `${fieldPath}[${index}]`));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

function requireImportId(payload: unknown, report: TwelveWeekImportValidationReport): string {
  const root = requiredRecord(payload, "body");
  const importId =
    optionalString(root.importId, "importId") ??
    report.idempotencyKey ??
    report.requestId;

  if (!importId) {
    throw new ApiError(400, "importId or idempotencyKey is required for 12-week import.");
  }

  if (importId.length > 240) {
    throw new ApiError(400, "importId cannot exceed 240 characters.");
  }

  return importId;
}

function isImportResult(value: unknown): value is TwelveWeekImportResult {
  return isRecord(value) && value.importId !== undefined && value.summary !== undefined && value.links !== undefined;
}

function makeEmptySummary(): TwelveWeekImportSummary {
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

function createEmptyResult(
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
    message: "12-week import applied for Goal, Plan, Week, Task, lead metric, daily check-in, and weekly review records.",
  };
}

function hasImportSideEffects(summary: TwelveWeekImportSummary): boolean {
  return Object.values(summary).some((count) => count > 0);
}

function createPartialImportError(
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

function toDuplicateResult(
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

function mapGoalDoc(doc: MongoGoalDoc): ImportedGoalEntity {
  return {
    id: getDocId(doc),
    userId: doc.userId,
    clientGoalId: doc.clientGoalId ?? "",
  };
}

function mapPlanDoc(doc: MongoPlanDoc): ImportedPlanEntity {
  return {
    id: getDocId(doc),
    userId: doc.userId,
    clientPlanId: doc.clientPlanId ?? "",
  };
}

function mapWeekDoc(doc: MongoWeekDoc): ImportedWeekEntity {
  return {
    id: getDocId(doc),
    planId: doc.planId.toString(),
    clientWeekId: doc.clientWeekId ?? "",
    weekNumber: doc.weekNumber,
  };
}

function mapTaskDoc(doc: MongoTaskDoc): ImportedTaskEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientTaskId: doc.clientTaskId ?? "",
  };
}

function mapLeadMetricDoc(doc: MongoLeadMetricDoc): ImportedLeadMetricEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientMetricId: doc.clientMetricId ?? "",
  };
}

function mapDailyCheckInDoc(doc: MongoDailyCheckInDoc): ImportedDailyCheckInEntity {
  return {
    id: getDocId(doc),
    planId: doc.planId.toString(),
    weekId: doc.weekId.toString(),
    clientCheckInId: doc.clientCheckInId ?? "",
  };
}

function mapWeeklyReviewDoc(doc: MongoWeeklyReviewDoc): ImportedWeeklyReviewEntity {
  return {
    id: getDocId(doc),
    weekId: doc.weekId.toString(),
    clientReviewId: doc.clientReviewId ?? "",
  };
}

export class MongoTwelveWeekImportRepository implements TwelveWeekImportRepository {
  constructor(private readonly mutationLogRepository = new MongoSyncMutationLogRepository()) {}

  async findImportLog(userId: string, importId: string): Promise<SyncMutationLogEntity | null> {
    return this.mutationLogRepository.findByUserAndMutationId(userId, importId);
  }

  async createImportLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity> {
    return this.mutationLogRepository.createMutationLog(data);
  }

  async upsertGoal(data: ImportGoalData): Promise<UpsertResult<ImportedGoalEntity>> {
    const existing = await GoalModel.findOne({ userId: data.userId, clientGoalId: data.clientGoalId }).lean();
    const update = {
      title: data.title,
      category: data.category,
      description: data.description,
      deadline: data.deadline,
      status: data.status,
      clientGoalId: data.clientGoalId,
      focusArea: data.focusArea,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await GoalModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoGoalDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported goal could not be updated.");
      return { entity: mapGoalDoc(doc as unknown as MongoGoalDoc), operation: "updated" };
    }

    const doc = await GoalModel.create({
      userId: data.userId,
      ...update,
    });
    return { entity: mapGoalDoc(doc.toObject() as unknown as MongoGoalDoc), operation: "created" };
  }

  async linkGoalToPlan(goalId: string, planId: string, importId: string, syncUpdatedAt: Date): Promise<void> {
    await GoalModel.findByIdAndUpdate(goalId, {
      $set: {
        planId,
        lastMutationId: importId,
        syncUpdatedAt,
      },
    });
  }

  async upsertPlan(data: ImportPlanData): Promise<UpsertResult<ImportedPlanEntity>> {
    const existing = await PlanModel.findOne({ userId: data.userId, clientPlanId: data.clientPlanId }).lean();
    const update = {
      userId: data.userId,
      vision: data.vision,
      smartGoalId: data.smartGoalId,
      startDate: data.startDate,
      clientPlanId: data.clientPlanId,
      clientGoalId: data.clientGoalId,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await PlanModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoPlanDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported plan could not be updated.");
      return { entity: mapPlanDoc(doc as unknown as MongoPlanDoc), operation: "updated" };
    }

    const doc = await PlanModel.create(update);
    return { entity: mapPlanDoc(doc.toObject() as unknown as MongoPlanDoc), operation: "created" };
  }

  async upsertWeek(data: ImportWeekData): Promise<UpsertResult<ImportedWeekEntity>> {
    const existing = await WeekModel.findOne({
      planId: data.planId,
      $or: [{ clientWeekId: data.clientWeekId }, { weekNumber: data.weekNumber }],
    }).lean();
    const update = {
      planId: data.planId,
      weekNumber: data.weekNumber,
      focus: data.focus,
      expectedOutput: data.expectedOutput,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await WeekModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoWeekDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported week could not be updated.");
      return { entity: mapWeekDoc(doc as unknown as MongoWeekDoc), operation: "updated" };
    }

    const doc = await WeekModel.create(update);
    return { entity: mapWeekDoc(doc.toObject() as unknown as MongoWeekDoc), operation: "created" };
  }

  async upsertTask(data: ImportTaskData): Promise<UpsertResult<ImportedTaskEntity>> {
    const existing = await TaskModel.findOne({ weekId: data.weekId, clientTaskId: data.clientTaskId }).lean();
    const update = {
      weekId: data.weekId,
      title: data.title,
      status: data.status,
      scheduledDate: data.scheduledDate,
      completedAt: data.completedAt,
      clientTaskId: data.clientTaskId,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      weekNumber: data.weekNumber,
      leadIndicatorName: data.leadIndicatorName,
      isCore: data.isCore,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await TaskModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoTaskDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported task could not be updated.");
      return { entity: mapTaskDoc(doc as unknown as MongoTaskDoc), operation: "updated" };
    }

    const doc = await TaskModel.create(update);
    return { entity: mapTaskDoc(doc.toObject() as unknown as MongoTaskDoc), operation: "created" };
  }

  async upsertLeadMetric(data: ImportLeadMetricData): Promise<UpsertResult<ImportedLeadMetricEntity>> {
    const existing = await LeadMetricModel.findOne({
      $or: [
        {
          userId: data.userId,
          clientPlanId: data.clientPlanId,
          clientWeekId: data.clientWeekId,
          clientMetricId: data.clientMetricId,
        },
        {
          weekId: data.weekId,
          clientMetricId: data.clientMetricId,
        },
      ],
    }).lean();
    const update = {
      userId: data.userId,
      weekId: data.weekId,
      name: data.name,
      weeklyTarget: data.weeklyTarget,
      target: data.target,
      currentValue: data.currentValue,
      frequency: data.frequency,
      clientMetricId: data.clientMetricId,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      leadIndicatorId: data.leadIndicatorId,
      unit: data.unit,
      type: data.type,
      priority: data.priority,
      schedule: data.schedule,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await LeadMetricModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoLeadMetricDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported lead metric could not be updated.");
      return { entity: mapLeadMetricDoc(doc as unknown as MongoLeadMetricDoc), operation: "updated" };
    }

    const doc = await LeadMetricModel.create(update);
    return { entity: mapLeadMetricDoc(doc.toObject() as unknown as MongoLeadMetricDoc), operation: "created" };
  }

  async upsertDailyCheckIn(data: ImportDailyCheckInData): Promise<UpsertResult<ImportedDailyCheckInEntity>> {
    const existing = await DailyCheckInModel.findOne({
      userId: data.userId,
      clientPlanId: data.clientPlanId,
      localDate: data.localDate,
    }).lean();
    const update = {
      userId: data.userId,
      planId: data.planId,
      weekId: data.weekId,
      clientGoalId: data.clientGoalId,
      clientPlanId: data.clientPlanId,
      clientWeekId: data.clientWeekId,
      clientCheckInId: data.clientCheckInId,
      weekNumber: data.weekNumber,
      localDate: data.localDate,
      didWorkToday: data.didWorkToday,
      whichLeadIndicatorWorkedOn: data.whichLeadIndicatorWorkedOn,
      amountDone: data.amountDone,
      outputCreated: data.outputCreated,
      obstacleOrIssue: data.obstacleOrIssue,
      dailySelfRating: data.dailySelfRating,
      optionalNote: data.optionalNote,
      mood: data.mood,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await DailyCheckInModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoDailyCheckInDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported daily check-in could not be updated.");
      return { entity: mapDailyCheckInDoc(doc as unknown as MongoDailyCheckInDoc), operation: "updated" };
    }

    const doc = await DailyCheckInModel.create(update);
    return { entity: mapDailyCheckInDoc(doc.toObject() as unknown as MongoDailyCheckInDoc), operation: "created" };
  }

  async upsertWeeklyReview(data: ImportWeeklyReviewData): Promise<UpsertResult<ImportedWeeklyReviewEntity>> {
    const existing = await WeekReviewModel.findOne({
      userId: data.userId,
      clientPlanId: data.clientPlanId,
      weekNumber: data.weekNumber,
    }).lean();
    const update = {
      userId: data.userId,
      planId: data.planId,
      weekId: data.weekId,
      weekNumber: data.weekNumber,
      executionScore: data.executionScore,
      reflection: data.biggestOutputThisWeek,
      adjustments: data.nextWeekPriority,
      clientPlanId: data.clientPlanId,
      clientWeekId: data.clientWeekId,
      clientReviewId: data.clientReviewId,
      leadCompletionPercent: data.leadCompletionPercent,
      lagProgressValue: data.lagProgressValue,
      biggestOutputThisWeek: data.biggestOutputThisWeek,
      mainObstacle: data.mainObstacle,
      nextWeekPriority: data.nextWeekPriority,
      workloadDecision: data.workloadDecision,
      reviewCompleted: data.reviewCompleted,
      progressScore: data.progressScore,
      disciplineScore: data.disciplineScore,
      focusScore: data.focusScore,
      improvementScore: data.improvementScore,
      outputQualityScore: data.outputQualityScore,
      completedLeadIndicators: data.completedLeadIndicators,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    await WeekModel.findByIdAndUpdate(
      data.weekId,
      {
        $set: {
          review: {
            weekNumber: data.weekNumber,
            executionScore: data.executionScore,
            reflection: data.biggestOutputThisWeek,
            adjustments: data.nextWeekPriority,
          },
          lastMutationId: data.importId,
          syncUpdatedAt: data.syncUpdatedAt,
        },
      },
      { runValidators: true },
    );

    if (existing) {
      const doc = await WeekReviewModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoWeeklyReviewDoc),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported weekly review could not be updated.");
      return { entity: mapWeeklyReviewDoc(doc as unknown as MongoWeeklyReviewDoc), operation: "updated" };
    }

    const doc = await WeekReviewModel.create(update);
    return { entity: mapWeeklyReviewDoc(doc.toObject() as unknown as MongoWeeklyReviewDoc), operation: "created" };
  }
}

function getGoalImportData(
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

function getPlanImportData(
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

function getWeekImportData(
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

function getTaskImportData(
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

function getLeadMetricImportData(
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

function getDailyCheckInImportData(
  userId: string,
  goalData: ImportGoalData,
  plan: Record<string, unknown>,
  checkIn: Record<string, unknown>,
  backendPlanId: string,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportDailyCheckInData {
  const localDate = requiredDateKey(checkIn.localDate ?? checkIn.date, "dailyCheckIn.date");

  return {
    userId,
    planId: backendPlanId,
    weekId: week.id,
    clientGoalId: optionalString(checkIn.clientGoalId, "dailyCheckIn.clientGoalId") ?? goalData.clientGoalId,
    clientPlanId: requiredString(checkIn.clientPlanId ?? plan.clientPlanId, "dailyCheckIn.clientPlanId"),
    clientWeekId: requiredString(checkIn.clientWeekId, "dailyCheckIn.clientWeekId"),
    clientCheckInId: requiredString(checkIn.clientCheckInId, "dailyCheckIn.clientCheckInId"),
    weekNumber: normalizeWeekNumber(checkIn.weekNumber ?? week.weekNumber, "dailyCheckIn.weekNumber"),
    localDate,
    didWorkToday: optionalBoolean(checkIn.didWorkToday, "dailyCheckIn.didWorkToday") ?? false,
    whichLeadIndicatorWorkedOn: optionalString(
      checkIn.whichLeadIndicatorWorkedOn,
      "dailyCheckIn.whichLeadIndicatorWorkedOn",
    ),
    amountDone: optionalString(checkIn.amountDone, "dailyCheckIn.amountDone"),
    outputCreated: optionalString(checkIn.outputCreated, "dailyCheckIn.outputCreated"),
    obstacleOrIssue: optionalString(checkIn.obstacleOrIssue, "dailyCheckIn.obstacleOrIssue"),
    dailySelfRating: optionalNumberRange(checkIn.dailySelfRating, "dailyCheckIn.dailySelfRating", 0, 5),
    optionalNote: optionalString(checkIn.optionalNote, "dailyCheckIn.optionalNote"),
    mood: normalizeMood(checkIn.mood, "dailyCheckIn.mood"),
    importId,
    syncUpdatedAt: now,
  };
}

function getWeeklyReviewImportData(
  userId: string,
  plan: Record<string, unknown>,
  review: Record<string, unknown>,
  backendPlanId: string,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportWeeklyReviewData {
  return {
    userId,
    planId: backendPlanId,
    weekId: week.id,
    clientPlanId: requiredString(review.clientPlanId ?? plan.clientPlanId, "weeklyReview.clientPlanId"),
    clientWeekId: requiredString(review.clientWeekId, "weeklyReview.clientWeekId"),
    clientReviewId: requiredString(review.clientReviewId, "weeklyReview.clientReviewId"),
    weekNumber: normalizeWeekNumber(review.weekNumber ?? week.weekNumber, "weeklyReview.weekNumber"),
    executionScore: getExecutionScore(review),
    leadCompletionPercent: optionalNumberRange(
      review.leadCompletionPercent,
      "weeklyReview.leadCompletionPercent",
      0,
      100,
    ),
    lagProgressValue: optionalString(review.lagProgressValue, "weeklyReview.lagProgressValue"),
    biggestOutputThisWeek: optionalString(review.biggestOutputThisWeek, "weeklyReview.biggestOutputThisWeek"),
    mainObstacle: optionalString(review.mainObstacle, "weeklyReview.mainObstacle"),
    nextWeekPriority: optionalString(review.nextWeekPriority, "weeklyReview.nextWeekPriority"),
    workloadDecision: normalizeWorkloadDecision(review.workloadDecision, "weeklyReview.workloadDecision"),
    reviewCompleted: optionalBoolean(review.reviewCompleted, "weeklyReview.reviewCompleted"),
    progressScore: optionalNumberRange(review.progressScore, "weeklyReview.progressScore", 0, 10),
    disciplineScore: optionalNumberRange(review.disciplineScore, "weeklyReview.disciplineScore", 0, 10),
    focusScore: optionalNumberRange(review.focusScore, "weeklyReview.focusScore", 0, 10),
    improvementScore: optionalNumberRange(review.improvementScore, "weeklyReview.improvementScore", 0, 10),
    outputQualityScore: optionalNumberRange(review.outputQualityScore, "weeklyReview.outputQualityScore", 0, 10),
    completedLeadIndicators: optionalNumberRange(
      review.completedLeadIndicators,
      "weeklyReview.completedLeadIndicators",
      0,
      100,
    ),
    importId,
    syncUpdatedAt: now,
  };
}

function addLink(
  links: TwelveWeekImportEntityLink[],
  clientId: string,
  id: string,
  operation: ImportEntityOperation,
): void {
  links.push({ clientId, id, operation });
}

function addOperationCount(
  summary: TwelveWeekImportSummary,
  entity: "goals" | "plans" | "weeks" | "tasks" | "leadMetrics" | "dailyCheckIns" | "weeklyReviews",
  operation: ImportEntityOperation,
): void {
  const key = `${entity}${operation === "created" ? "Created" : "Updated"}` as keyof TwelveWeekImportSummary;
  summary[key] += 1;
}

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

export const twelveWeekImportService = new TwelveWeekImportService(new MongoTwelveWeekImportRepository());
