import { createHash } from "node:crypto";
import { isValidObjectId } from "mongoose";

import { DailyCheckInModel } from "../models/DailyCheckInModel";
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

export const SYNC_MUTATION_TYPES = [
  "task_completed_changed",
  "daily_check_in_upserted",
  "weekly_review_upserted",
  "plan_snapshot_updated",
  "lead_metric_upserted",
  "task_upsert",
  "daily_checkin_upsert",
  "weekly_review_upsert",
  "plan_snapshot_upsert",
] as const;

export type SyncMutationType = (typeof SYNC_MUTATION_TYPES)[number];

export interface SyncMutationResult {
  mutationId: string;
  type: SyncMutationType;
  status:
    | "accepted"
    | "applied"
    | "duplicate"
    | "failed"
    | "failed_not_found"
    | "failed_validation"
    | "conflict";
  acceptedAt?: string;
  duplicateOf?: string;
  entityType?: "task" | "daily_check_in" | "weekly_review" | "plan" | "lead_metric";
  clientId?: string;
  serverId?: string;
  revision?: number;
  syncUpdatedAt?: string;
  reason?: string;
  message?: string;
  /** Structured error code for frontend diagnostics (e.g., ownership_denied, unsupported_mutation). */
  syncErrorCode?: string;
}

export interface SyncMutationBatchResult {
  batchId?: string;
  status: "accepted" | "applied" | "partial" | "duplicate" | "failed";
  totalReceived: number;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SyncMutationResult[];
  accepted: SyncMutationResult[];
  duplicate: SyncMutationResult[];
  failed: SyncMutationResult[];
  summary: {
    accepted: number;
    duplicate: number;
    failed: number;
    applied: number;
    skipped: number;
    totalReceived: number;
  };
}

interface ValidatedMutation {
  mutationId: string;
  idempotencyKey?: string;
  type: SyncMutationType;
  clientTimestamp?: Date;
  entity?: Record<string, unknown>;
  baseRevision?: number;
  payload: Record<string, unknown>;
  payloadHash: string;
}

interface ValidatedBatch {
  batchId?: string;
  mutations: ValidatedMutation[];
}

interface SyncMutationLogRepository {
  findByUserAndMutationId(userId: string, mutationId: string): Promise<SyncMutationLogEntity | null>;
  createMutationLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity>;
}

export interface TaskCompletedChangedApplyInput {
  mutationId: string;
  backendTaskId?: string;
  clientTaskId?: string;
  clientWeekId?: string;
  clientPlanId?: string;
  completed: boolean;
  completedAt?: Date;
  syncUpdatedAt: Date;
}

export interface AppliedTaskMutationEntity {
  id: string;
  clientTaskId?: string;
  status: "todo" | "doing" | "done";
  completedAt?: Date;
  revision?: number;
  syncUpdatedAt?: Date;
}

export interface SyncTaskMutationRepository {
  applyTaskCompletedChanged(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null>;
}

export interface DailyCheckInUpsertApplyInput {
  mutationId: string;
  clientGoalId?: string;
  clientPlanId: string;
  clientWeekId?: string;
  clientCheckInId?: string;
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
  syncUpdatedAt: Date;
}

export interface WeeklyReviewUpsertApplyInput {
  mutationId: string;
  clientPlanId: string;
  clientWeekId?: string;
  clientReviewId?: string;
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
  syncUpdatedAt: Date;
}

export interface PlanSnapshotWeekUpdateInput {
  clientWeekId?: string;
  weekNumber: number;
  focus?: string;
  expectedOutput?: string;
}

export interface PlanSnapshotUpdatedApplyInput {
  mutationId: string;
  clientGoalId?: string;
  clientPlanId: string;
  vision?: string;
  startDate?: Date;
  weeks: PlanSnapshotWeekUpdateInput[];
  syncUpdatedAt: Date;
}

export interface LeadMetricUpsertApplyInput {
  mutationId: string;
  clientPlanId: string;
  clientWeekId?: string;
  clientMetricId: string;
  leadIndicatorId?: string;
  weekNumber: number;
  name: string;
  weeklyTarget?: number;
  target?: string;
  currentValue?: number;
  unit?: string;
  frequency?: string;
  type?: string;
  priority?: number;
  schedule?: number[];
  syncUpdatedAt: Date;
}

export interface AppliedWorkspaceMutationEntity {
  id: string;
  clientId?: string;
  revision?: number;
  syncUpdatedAt?: Date;
}

export interface SyncWorkspaceMutationRepository {
  applyDailyCheckInUpserted(
    userId: string,
    input: DailyCheckInUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null>;
  applyWeeklyReviewUpserted(
    userId: string,
    input: WeeklyReviewUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null>;
  applyPlanSnapshotUpdated(
    userId: string,
    input: PlanSnapshotUpdatedApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null>;
  applyLeadMetricUpserted(
    userId: string,
    input: LeadMetricUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null>;
}

interface MongoTaskDoc {
  _id: { toString(): string } | string;
  weekId: { toString(): string } | string;
  clientTaskId?: string | null;
  status: "todo" | "doing" | "done";
  completedAt?: Date | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoWeekDoc {
  _id: { toString(): string } | string;
  planId: { toString(): string } | string;
  weekNumber: number;
  clientWeekId?: string | null;
}

interface MongoPlanDoc {
  _id: { toString(): string } | string;
  userId: string;
  vision?: string | null;
  startDate?: Date | null;
  clientPlanId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface OwnedWeekRef {
  planId: string;
  weekId: string;
  clientPlanId: string;
  clientWeekId?: string;
  weekNumber: number;
}

interface MongoDailyCheckInDoc {
  _id: { toString(): string } | string;
  clientCheckInId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoWeekReviewDoc {
  _id: { toString(): string } | string;
  clientReviewId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoLeadMetricDoc {
  _id: { toString(): string } | string;
  clientMetricId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

const MAX_MUTATIONS_PER_BATCH = 100;
const MAX_CLIENT_ID_LENGTH = 120;
const MAX_MUTATION_ID_LENGTH = 240;
const MAX_IDEMPOTENCY_KEY_LENGTH = 240;
const MAX_BATCH_ID_LENGTH = 240;
const ALLOWED_MUTATION_TYPES = new Set<string>(SYNC_MUTATION_TYPES);

/**
 * Privacy guarantee: this service never logs raw mutation payloads.
 * Only payloadHash (SHA-256) is stored in SyncMutationLog.
 * Raw user text (goal titles, check-in notes, review content) must
 * never appear in server logs or error details.
 */

function validateStringLength(value: string, fieldPath: string, maxLength: number): void {
  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldPath} cannot exceed ${maxLength} characters.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateOptionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${fieldPath} cannot be empty.`);
  }

  return trimmed;
}

function validateRequiredString(value: unknown, fieldPath: string): string {
  const validated = validateOptionalString(value, fieldPath);
  if (!validated) {
    throw new ApiError(400, `${fieldPath} is required.`);
  }

  return validated;
}

function validateOptionalDate(value: unknown, fieldPath: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO timestamp.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO timestamp.`);
  }

  return parsed;
}

function validateOptionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, `${fieldPath} must be a number.`);
  }

  return value;
}

function validateOptionalBoolean(value: unknown, fieldPath: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldPath} must be a boolean.`);
  }

  return value;
}

function validateOptionalText(value: unknown, fieldPath: string, maxLength = 5_000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldPath} cannot exceed ${maxLength} characters.`);
  }

  return value.trim();
}

function validateOptionalNumberRange(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
): number | undefined {
  const numberValue = validateOptionalNumber(value, fieldPath);
  if (numberValue === undefined) return undefined;
  if (numberValue < min || numberValue > max) {
    throw new ApiError(400, `${fieldPath} must be between ${min} and ${max}.`);
  }

  return numberValue;
}

function validateWeekNumber(value: unknown, fieldPath: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) {
    throw new ApiError(400, `${fieldPath} must be an integer between 1 and 12.`);
  }

  return value;
}

function validateDateKey(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a valid date.`);
  }

  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (dateOnlyMatch?.[1]) {
    const [year, month, day] = dateOnlyMatch[1].split("-").map(Number);
    const parsedDateOnly = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isFinite(parsedDateOnly.valueOf()) &&
      parsedDateOnly.getUTCFullYear() === year &&
      parsedDateOnly.getUTCMonth() === month - 1 &&
      parsedDateOnly.getUTCDate() === day
    ) {
      return dateOnlyMatch[1];
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid date.`);
  }

  return parsed.toISOString().slice(0, 10);
}

function validateOptionalMood(value: unknown, fieldPath: string): "low" | "steady" | "high" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value !== "low" && value !== "steady" && value !== "high") {
    throw new ApiError(400, `${fieldPath} must be low, steady, or high.`);
  }

  return value;
}

function validateOptionalWorkloadDecision(
  value: unknown,
  fieldPath: string,
): "keep same" | "reduce slightly" | "increase slightly" | "" | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== "keep same" && value !== "reduce slightly" && value !== "increase slightly" && value !== "") {
    throw new ApiError(400, `${fieldPath} must be a supported workload decision.`);
  }

  return value;
}

function validateMutationType(value: unknown, fieldPath: string): SyncMutationType {
  const type = validateRequiredString(value, fieldPath);
  if (!ALLOWED_MUTATION_TYPES.has(type)) {
    throw new ApiError(400, `${fieldPath} must be one of the supported sync mutation types.`, {
      allowedTypes: SYNC_MUTATION_TYPES,
    });
  }

  return type as SyncMutationType;
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

function hashMutationPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function validateMutation(value: unknown, index: number): ValidatedMutation {
  const path = `mutations[${index}]`;
  if (!isRecord(value)) {
    throw new ApiError(400, `${path} must be an object.`);
  }

  const type = validateMutationType(value.type ?? value.kind, `${path}.type`);
  if (!isRecord(value.payload)) {
    throw new ApiError(400, `${path}.payload must be an object.`);
  }
  if (value.entity !== undefined && !isRecord(value.entity)) {
    throw new ApiError(400, `${path}.entity must be an object.`);
  }

  const clientTimestamp = validateOptionalDate(
    value.clientTimestamp ?? value.clientGeneratedAt,
    `${path}.clientTimestamp`,
  );
  const idempotencyKey = validateOptionalString(value.idempotencyKey, `${path}.idempotencyKey`);
  if (idempotencyKey) validateStringLength(idempotencyKey, `${path}.idempotencyKey`, MAX_IDEMPOTENCY_KEY_LENGTH);
  const baseRevision = validateOptionalNumber(value.baseRevision, `${path}.baseRevision`);
  const payloadHash = hashMutationPayload({
    type,
    entity: value.entity,
    baseRevision,
    clientTimestamp: clientTimestamp?.toISOString(),
    payload: value.payload,
  });

  const mutationId = validateRequiredString(value.mutationId, `${path}.mutationId`);
  validateStringLength(mutationId, `${path}.mutationId`, MAX_MUTATION_ID_LENGTH);

  // Enforce client ID length limits on entity references
  if (isRecord(value.entity)) {
    for (const [key, val] of Object.entries(value.entity)) {
      if (typeof val === "string" && val.length > MAX_CLIENT_ID_LENGTH) {
        throw new ApiError(400, `${path}.entity.${key} cannot exceed ${MAX_CLIENT_ID_LENGTH} characters.`);
      }
    }
  }

  return {
    mutationId,
    idempotencyKey,
    type,
    clientTimestamp,
    entity: value.entity,
    baseRevision,
    payload: value.payload,
    payloadHash,
  };
}

function validateBatch(payload: unknown): ValidatedBatch {
  if (!isRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  validateOptionalDate(payload.clientGeneratedAt, "clientGeneratedAt");
  const batchId = validateOptionalString(payload.batchId, "batchId");
  if (batchId) validateStringLength(batchId, "batchId", MAX_BATCH_ID_LENGTH);

  if (!Array.isArray(payload.mutations)) {
    throw new ApiError(400, "mutations must be an array.");
  }
  if (payload.mutations.length === 0) {
    throw new ApiError(400, "mutations must contain at least one item.");
  }
  if (payload.mutations.length > MAX_MUTATIONS_PER_BATCH) {
    throw new ApiError(400, `mutations cannot contain more than ${MAX_MUTATIONS_PER_BATCH} items.`);
  }

  return {
    batchId,
    mutations: payload.mutations.map((mutation, index) => validateMutation(mutation, index)),
  };
}

function toDuplicateResult(log: SyncMutationLogEntity): SyncMutationResult {
  const previousResult = isRecord(log.result) ? log.result : {};

  return {
    ...previousResult,
    mutationId: log.mutationId,
    type: log.type as SyncMutationType,
    status: "duplicate",
    duplicateOf: log.id,
    acceptedAt: log.createdAt.toISOString(),
    message: "Mutation was already processed for this user.",
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

function getDocId(doc: { _id: { toString(): string } | string }): string {
  return doc._id.toString();
}

function mapTaskDoc(doc: MongoTaskDoc): AppliedTaskMutationEntity {
  return {
    id: getDocId(doc),
    clientTaskId: doc.clientTaskId ?? undefined,
    status: doc.status,
    completedAt: doc.completedAt ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function getTaskIdCandidate(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text && isValidObjectId(text) ? text : undefined;
}

export class MongoSyncTaskMutationRepository implements SyncTaskMutationRepository {
  async applyTaskCompletedChanged(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null> {
    const existingTask = await this.findOwnedTask(userId, input);
    if (!existingTask) return null;

    const update =
      input.completed
        ? {
            $set: {
              status: "done",
              completedAt: input.completedAt ?? input.syncUpdatedAt,
              lastMutationId: input.mutationId,
              syncUpdatedAt: input.syncUpdatedAt,
            },
            $inc: { revision: 1 },
          }
        : {
            $set: {
              status: "todo",
              lastMutationId: input.mutationId,
              syncUpdatedAt: input.syncUpdatedAt,
            },
            $unset: { completedAt: "" },
            $inc: { revision: 1 },
          };

    const updatedTask = await TaskModel.findByIdAndUpdate(existingTask.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    return updatedTask ? mapTaskDoc(updatedTask as unknown as MongoTaskDoc) : null;
  }

  private async findOwnedTask(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null> {
    if (input.backendTaskId) {
      const task = await TaskModel.findById(input.backendTaskId).lean();
      return task ? this.toOwnedTask(userId, task as unknown as MongoTaskDoc, input) : null;
    }

    if (!input.clientTaskId) return null;

    if (input.clientPlanId && input.clientWeekId) {
      const plan = await PlanModel.findOne({ userId, clientPlanId: input.clientPlanId }).lean();
      if (!plan) return null;

      const week = await WeekModel.findOne({
        planId: getDocId(plan as unknown as MongoPlanDoc),
        clientWeekId: input.clientWeekId,
      }).lean();
      if (!week) return null;

      const task = await TaskModel.findOne({
        weekId: getDocId(week as unknown as MongoWeekDoc),
        clientTaskId: input.clientTaskId,
      }).lean();
      return task ? this.toOwnedTask(userId, task as unknown as MongoTaskDoc, input) : null;
    }

    const candidates = await TaskModel.find({ clientTaskId: input.clientTaskId }).limit(10).lean();
    const ownedTasks: AppliedTaskMutationEntity[] = [];
    for (const candidate of candidates) {
      const ownedTask = await this.toOwnedTask(userId, candidate as unknown as MongoTaskDoc, input);
      if (ownedTask) ownedTasks.push(ownedTask);
    }

    return ownedTasks.length === 1 ? ownedTasks[0] : null;
  }

  private async toOwnedTask(
    userId: string,
    task: MongoTaskDoc,
    input: Pick<TaskCompletedChangedApplyInput, "clientPlanId" | "clientWeekId">,
  ): Promise<AppliedTaskMutationEntity | null> {
    const week = await WeekModel.findById(task.weekId).lean();
    if (!week) return null;

    const mappedWeek = week as unknown as MongoWeekDoc;
    if (input.clientWeekId && mappedWeek.clientWeekId !== input.clientWeekId) return null;

    const plan = await PlanModel.findById(mappedWeek.planId).lean();
    if (!plan) return null;

    const mappedPlan = plan as unknown as MongoPlanDoc;
    if (mappedPlan.userId !== userId) return null;
    if (input.clientPlanId && mappedPlan.clientPlanId !== input.clientPlanId) return null;

    return mapTaskDoc(task);
  }
}

function mapDailyCheckInDoc(doc: MongoDailyCheckInDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientCheckInId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapWeekReviewDoc(doc: MongoWeekReviewDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientReviewId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapPlanDoc(doc: MongoPlanDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientPlanId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapLeadMetricDoc(doc: MongoLeadMetricDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientMetricId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

export class MongoSyncWorkspaceMutationRepository implements SyncWorkspaceMutationRepository {
  async applyPlanSnapshotUpdated(
    userId: string,
    input: PlanSnapshotUpdatedApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const existingPlan = await PlanModel.findOne({ userId, clientPlanId: input.clientPlanId }).lean();
    if (!existingPlan) return null;

    const mappedPlan = existingPlan as unknown as MongoPlanDoc;
    const planId = getDocId(mappedPlan);
    const planSet: Record<string, unknown> = {
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };
    if (input.clientGoalId) planSet.clientGoalId = input.clientGoalId;
    if (input.vision !== undefined) planSet.vision = input.vision;
    if (input.startDate !== undefined) planSet.startDate = input.startDate;

    const updatedPlan = await PlanModel.findByIdAndUpdate(
      planId,
      { $set: planSet, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();
    if (!updatedPlan) return null;

    for (const week of input.weeks) {
      const weekQuery: Record<string, unknown> = { planId };
      if (week.clientWeekId) weekQuery.clientWeekId = week.clientWeekId;
      else weekQuery.weekNumber = week.weekNumber;

      const weekSet: Record<string, unknown> = {
        clientPlanId: input.clientPlanId,
        lastMutationId: input.mutationId,
        syncUpdatedAt: input.syncUpdatedAt,
      };
      if (week.focus !== undefined) weekSet.focus = week.focus;
      if (week.expectedOutput !== undefined) weekSet.expectedOutput = week.expectedOutput;

      await WeekModel.findOneAndUpdate(
        weekQuery,
        { $set: weekSet, $inc: { revision: 1 } },
        { runValidators: true },
      ).lean();
    }

    return mapPlanDoc(updatedPlan as unknown as MongoPlanDoc);
  }

  async applyLeadMetricUpserted(
    userId: string,
    input: LeadMetricUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await LeadMetricModel.findOne({
      $or: [
        {
          userId,
          clientPlanId: ownedWeek.clientPlanId,
          clientWeekId: ownedWeek.clientWeekId,
          clientMetricId: input.clientMetricId,
        },
        {
          weekId: ownedWeek.weekId,
          clientMetricId: input.clientMetricId,
        },
      ],
    }).lean();
    const update = {
      userId,
      weekId: ownedWeek.weekId,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientMetricId: input.clientMetricId,
      leadIndicatorId: input.leadIndicatorId,
      name: input.name,
      weeklyTarget: input.weeklyTarget ?? 0,
      target: input.target,
      currentValue: input.currentValue,
      unit: input.unit,
      frequency: input.frequency,
      type: input.type,
      priority: input.priority,
      schedule: input.schedule,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    if (existing) {
      const doc = await LeadMetricModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoLeadMetricDoc),
        { $set: update, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      ).lean();

      return doc ? mapLeadMetricDoc(doc as unknown as MongoLeadMetricDoc) : null;
    }

    const doc = await LeadMetricModel.create(update);
    return mapLeadMetricDoc(doc.toObject() as unknown as MongoLeadMetricDoc);
  }

  async applyDailyCheckInUpserted(
    userId: string,
    input: DailyCheckInUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await DailyCheckInModel.findOne({
      userId,
      clientPlanId: ownedWeek.clientPlanId,
      localDate: input.localDate,
    }).lean();
    const update = {
      userId,
      planId: ownedWeek.planId,
      weekId: ownedWeek.weekId,
      clientGoalId: input.clientGoalId,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientCheckInId: input.clientCheckInId ?? `${ownedWeek.clientPlanId}:checkin:${input.localDate}`,
      weekNumber: ownedWeek.weekNumber,
      localDate: input.localDate,
      didWorkToday: input.didWorkToday,
      whichLeadIndicatorWorkedOn: input.whichLeadIndicatorWorkedOn,
      amountDone: input.amountDone,
      outputCreated: input.outputCreated,
      obstacleOrIssue: input.obstacleOrIssue,
      dailySelfRating: input.dailySelfRating,
      optionalNote: input.optionalNote,
      mood: input.mood,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    if (existing) {
      const doc = await DailyCheckInModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoDailyCheckInDoc),
        { $set: update, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      ).lean();

      return doc ? mapDailyCheckInDoc(doc as unknown as MongoDailyCheckInDoc) : null;
    }

    const doc = await DailyCheckInModel.create(update);
    return mapDailyCheckInDoc(doc.toObject() as unknown as MongoDailyCheckInDoc);
  }

  async applyWeeklyReviewUpserted(
    userId: string,
    input: WeeklyReviewUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await WeekReviewModel.findOne({
      userId,
      clientPlanId: ownedWeek.clientPlanId,
      weekNumber: ownedWeek.weekNumber,
    }).lean();
    const update = {
      userId,
      planId: ownedWeek.planId,
      weekId: ownedWeek.weekId,
      weekNumber: ownedWeek.weekNumber,
      executionScore: input.executionScore,
      reflection: input.biggestOutputThisWeek,
      adjustments: input.nextWeekPriority,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientReviewId: input.clientReviewId ?? `${ownedWeek.clientPlanId}:review:${ownedWeek.weekNumber}`,
      leadCompletionPercent: input.leadCompletionPercent,
      lagProgressValue: input.lagProgressValue,
      biggestOutputThisWeek: input.biggestOutputThisWeek,
      mainObstacle: input.mainObstacle,
      nextWeekPriority: input.nextWeekPriority,
      workloadDecision: input.workloadDecision,
      reviewCompleted: input.reviewCompleted,
      progressScore: input.progressScore,
      disciplineScore: input.disciplineScore,
      focusScore: input.focusScore,
      improvementScore: input.improvementScore,
      outputQualityScore: input.outputQualityScore,
      completedLeadIndicators: input.completedLeadIndicators,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    const updatedWeek = await WeekModel.findByIdAndUpdate(
      ownedWeek.weekId,
      {
        $set: {
          review: {
            weekNumber: ownedWeek.weekNumber,
            executionScore: input.executionScore,
            reflection: input.biggestOutputThisWeek,
            adjustments: input.nextWeekPriority,
          },
          lastMutationId: input.mutationId,
          syncUpdatedAt: input.syncUpdatedAt,
        },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true },
    ).lean();
    if (!updatedWeek) return null;

    if (existing) {
      const doc = await WeekReviewModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoWeekReviewDoc),
        { $set: update, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      ).lean();

      return doc ? mapWeekReviewDoc(doc as unknown as MongoWeekReviewDoc) : null;
    }

    const doc = await WeekReviewModel.create(update);
    return mapWeekReviewDoc(doc.toObject() as unknown as MongoWeekReviewDoc);
  }

  private async findOwnedWeek(
    userId: string,
    input: { clientPlanId: string; clientWeekId?: string; weekNumber: number },
  ): Promise<OwnedWeekRef | null> {
    const plan = await PlanModel.findOne({ userId, clientPlanId: input.clientPlanId }).lean();
    if (!plan) return null;

    const mappedPlan = plan as unknown as MongoPlanDoc;
    const weekQuery: Record<string, unknown> = {
      planId: getDocId(mappedPlan),
    };
    if (input.clientWeekId) weekQuery.clientWeekId = input.clientWeekId;
    else weekQuery.weekNumber = input.weekNumber;

    const week = await WeekModel.findOne(weekQuery).lean();
    if (!week) return null;

    const mappedWeek = week as unknown as MongoWeekDoc;
    if (mappedWeek.weekNumber !== input.weekNumber) return null;
    if (input.clientWeekId && mappedWeek.clientWeekId !== input.clientWeekId) return null;

    return {
      planId: getDocId(mappedPlan),
      weekId: getDocId(mappedWeek),
      clientPlanId: input.clientPlanId,
      clientWeekId: mappedWeek.clientWeekId ?? input.clientWeekId,
      weekNumber: mappedWeek.weekNumber,
    };
  }
}

function validateTaskCompletedChangedMutation(
  mutation: ValidatedMutation,
): Omit<TaskCompletedChangedApplyInput, "mutationId" | "syncUpdatedAt"> {
  const payload = mutation.payload;
  const entity = mutation.entity ?? {};
  const backendTaskId =
    getTaskIdCandidate(entity.taskId) ??
    getTaskIdCandidate(entity.backendTaskId) ??
    getTaskIdCandidate(entity.serverTaskId) ??
    getTaskIdCandidate(payload.backendTaskId) ??
    getTaskIdCandidate(payload.serverTaskId) ??
    getTaskIdCandidate(payload.taskId);
  const clientTaskId =
    validateOptionalString(entity.clientTaskId, "entity.clientTaskId") ??
    validateOptionalString(payload.clientTaskId, "payload.clientTaskId") ??
    validateOptionalString(payload.taskId, "payload.taskId");
  const clientWeekId =
    validateOptionalString(entity.clientWeekId, "entity.clientWeekId") ??
    validateOptionalString(payload.clientWeekId, "payload.clientWeekId");
  const clientPlanId =
    validateOptionalString(entity.clientPlanId, "entity.clientPlanId") ??
    validateOptionalString(payload.clientPlanId, "payload.clientPlanId");

  if (!backendTaskId && !clientTaskId) {
    throw new ApiError(400, "task_completed_changed requires clientTaskId or backend task id.");
  }
  if (typeof payload.completed !== "boolean") {
    throw new ApiError(400, "payload.completed must be a boolean.");
  }

  const occurredAt = validateOptionalDate(
    payload.occurredAt ?? payload.clientUpdatedAt ?? payload.completedAt,
    "payload.occurredAt",
  );

  return {
    backendTaskId,
    clientTaskId,
    clientWeekId,
    clientPlanId,
    completed: payload.completed,
    completedAt: payload.completed ? occurredAt ?? mutation.clientTimestamp : undefined,
  };
}

function getNestedPayloadRecord(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const nested = payload[key];
  return isRecord(nested) ? nested : payload;
}

function getClientPlanId(mutation: ValidatedMutation, nestedPayload: Record<string, unknown>): string {
  return validateRequiredString(
    mutation.entity?.clientPlanId ?? mutation.payload.clientPlanId ?? nestedPayload.clientPlanId,
    "payload.clientPlanId",
  );
}

function getClientWeekId(mutation: ValidatedMutation, nestedPayload: Record<string, unknown>): string | undefined {
  return (
    validateOptionalString(mutation.entity?.clientWeekId, "entity.clientWeekId") ??
    validateOptionalString(mutation.payload.clientWeekId, "payload.clientWeekId") ??
    validateOptionalString(nestedPayload.clientWeekId, "payload.clientWeekId")
  );
}

function validateDailyCheckInUpsertedMutation(
  mutation: ValidatedMutation,
): Omit<DailyCheckInUpsertApplyInput, "mutationId" | "syncUpdatedAt"> {
  const checkIn = getNestedPayloadRecord(mutation.payload, "checkIn");
  const clientPlanId = getClientPlanId(mutation, checkIn);
  const localDate = validateDateKey(
    mutation.payload.date ?? mutation.payload.localDate ?? checkIn.localDate ?? checkIn.date,
    "payload.date",
  );

  return {
    clientGoalId: validateOptionalString(mutation.entity?.clientGoalId, "entity.clientGoalId"),
    clientPlanId,
    clientWeekId: getClientWeekId(mutation, checkIn),
    clientCheckInId:
      validateOptionalString(mutation.entity?.clientCheckInId, "entity.clientCheckInId") ??
      validateOptionalString(mutation.payload.clientCheckInId, "payload.clientCheckInId") ??
      validateOptionalString(checkIn.clientCheckInId, "payload.checkIn.clientCheckInId"),
    weekNumber: validateWeekNumber(mutation.payload.weekNumber ?? checkIn.weekNumber, "payload.weekNumber"),
    localDate,
    didWorkToday: validateOptionalBoolean(checkIn.didWorkToday, "payload.checkIn.didWorkToday") ?? false,
    whichLeadIndicatorWorkedOn: validateOptionalText(
      checkIn.whichLeadIndicatorWorkedOn,
      "payload.checkIn.whichLeadIndicatorWorkedOn",
    ),
    amountDone: validateOptionalText(checkIn.amountDone, "payload.checkIn.amountDone"),
    outputCreated: validateOptionalText(checkIn.outputCreated, "payload.checkIn.outputCreated"),
    obstacleOrIssue: validateOptionalText(checkIn.obstacleOrIssue, "payload.checkIn.obstacleOrIssue"),
    dailySelfRating: validateOptionalNumberRange(checkIn.dailySelfRating, "payload.checkIn.dailySelfRating", 0, 5),
    optionalNote: validateOptionalText(checkIn.optionalNote, "payload.checkIn.optionalNote"),
    mood: validateOptionalMood(checkIn.mood, "payload.checkIn.mood"),
  };
}

function getExecutionScore(review: Record<string, unknown>, payload: Record<string, unknown>): number {
  const explicitScore = validateOptionalNumberRange(
    payload.executionScore ?? review.executionScore,
    "payload.executionScore",
    0,
    100,
  );
  if (explicitScore !== undefined) return explicitScore;

  const leadCompletionPercent = validateOptionalNumberRange(
    review.leadCompletionPercent,
    "payload.review.leadCompletionPercent",
    0,
    100,
  );
  if (leadCompletionPercent !== undefined) return leadCompletionPercent;

  const scoreFields = [
    validateOptionalNumberRange(review.progressScore, "payload.review.progressScore", 0, 10),
    validateOptionalNumberRange(review.disciplineScore, "payload.review.disciplineScore", 0, 10),
    validateOptionalNumberRange(review.focusScore, "payload.review.focusScore", 0, 10),
    validateOptionalNumberRange(review.improvementScore, "payload.review.improvementScore", 0, 10),
    validateOptionalNumberRange(review.outputQualityScore, "payload.review.outputQualityScore", 0, 10),
  ].filter((value): value is number => value !== undefined);

  if (scoreFields.length === 0) return 0;
  return Math.round((scoreFields.reduce((sum, value) => sum + value, 0) / scoreFields.length) * 10);
}

function validateWeeklyReviewUpsertedMutation(
  mutation: ValidatedMutation,
): Omit<WeeklyReviewUpsertApplyInput, "mutationId" | "syncUpdatedAt"> {
  const review = getNestedPayloadRecord(mutation.payload, "review");
  const clientPlanId = getClientPlanId(mutation, review);

  return {
    clientPlanId,
    clientWeekId: getClientWeekId(mutation, review),
    clientReviewId:
      validateOptionalString(mutation.entity?.clientReviewId, "entity.clientReviewId") ??
      validateOptionalString(mutation.payload.clientReviewId, "payload.clientReviewId") ??
      validateOptionalString(review.clientReviewId, "payload.review.clientReviewId"),
    weekNumber: validateWeekNumber(mutation.payload.weekNumber ?? review.weekNumber, "payload.weekNumber"),
    executionScore: getExecutionScore(review, mutation.payload),
    leadCompletionPercent: validateOptionalNumberRange(
      review.leadCompletionPercent,
      "payload.review.leadCompletionPercent",
      0,
      100,
    ),
    lagProgressValue: validateOptionalText(review.lagProgressValue, "payload.review.lagProgressValue"),
    biggestOutputThisWeek: validateOptionalText(
      review.biggestOutputThisWeek,
      "payload.review.biggestOutputThisWeek",
    ),
    mainObstacle: validateOptionalText(review.mainObstacle, "payload.review.mainObstacle"),
    nextWeekPriority: validateOptionalText(review.nextWeekPriority, "payload.review.nextWeekPriority"),
    workloadDecision: validateOptionalWorkloadDecision(
      review.workloadDecision,
      "payload.review.workloadDecision",
    ),
    reviewCompleted: validateOptionalBoolean(review.reviewCompleted, "payload.review.reviewCompleted"),
    progressScore: validateOptionalNumberRange(review.progressScore, "payload.review.progressScore", 0, 10),
    disciplineScore: validateOptionalNumberRange(review.disciplineScore, "payload.review.disciplineScore", 0, 10),
    focusScore: validateOptionalNumberRange(review.focusScore, "payload.review.focusScore", 0, 10),
    improvementScore: validateOptionalNumberRange(review.improvementScore, "payload.review.improvementScore", 0, 10),
    outputQualityScore: validateOptionalNumberRange(
      review.outputQualityScore,
      "payload.review.outputQualityScore",
      0,
      10,
    ),
    completedLeadIndicators: validateOptionalNumberRange(
      review.completedLeadIndicators,
      "payload.review.completedLeadIndicators",
      0,
      100,
    ),
  };
}

function validateOptionalSchedule(value: unknown, fieldPath: string): number[] | undefined {
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

function validateLeadMetricUpsertedMutation(
  mutation: ValidatedMutation,
): Omit<LeadMetricUpsertApplyInput, "mutationId" | "syncUpdatedAt"> {
  const metric = getNestedPayloadRecord(mutation.payload, "metric");
  const clientPlanId = getClientPlanId(mutation, metric);
  const clientWeekId = getClientWeekId(mutation, metric);
  const clientMetricId =
    validateOptionalString(mutation.entity?.clientMetricId, "entity.clientMetricId") ??
    validateOptionalString(mutation.payload.clientMetricId, "payload.clientMetricId") ??
    validateOptionalString(metric.clientMetricId, "payload.metric.clientMetricId");
  if (!clientMetricId) {
    throw new ApiError(400, "lead_metric_upserted requires clientMetricId.");
  }
  validateStringLength(clientMetricId, "payload.clientMetricId", MAX_CLIENT_ID_LENGTH);

  const name = validateRequiredString(metric.name ?? mutation.payload.name, "payload.metric.name");
  validateStringLength(name, "payload.metric.name", 200);

  return {
    clientPlanId,
    clientWeekId,
    clientMetricId,
    leadIndicatorId:
      validateOptionalString(metric.leadIndicatorId, "payload.metric.leadIndicatorId") ??
      validateOptionalString(mutation.payload.leadIndicatorId, "payload.leadIndicatorId"),
    weekNumber: validateWeekNumber(mutation.payload.weekNumber ?? metric.weekNumber, "payload.weekNumber"),
    name,
    weeklyTarget: validateOptionalNumberRange(
      metric.weeklyTarget ?? mutation.payload.weeklyTarget,
      "payload.metric.weeklyTarget",
      0,
      10_000,
    ),
    target: validateOptionalText(metric.target ?? mutation.payload.target, "payload.metric.target", 200),
    currentValue: validateOptionalNumberRange(
      metric.currentValue ?? mutation.payload.currentValue,
      "payload.metric.currentValue",
      0,
      10_000,
    ),
    unit: validateOptionalText(metric.unit ?? mutation.payload.unit, "payload.metric.unit", 120),
    frequency: validateOptionalText(metric.frequency ?? mutation.payload.frequency, "payload.metric.frequency", 120),
    type: validateOptionalText(metric.type ?? mutation.payload.type, "payload.metric.type", 120),
    priority: validateOptionalNumberRange(
      metric.priority ?? mutation.payload.priority,
      "payload.metric.priority",
      0,
      1_000,
    ),
    schedule: validateOptionalSchedule(metric.schedule ?? mutation.payload.schedule, "payload.metric.schedule"),
  };
}

function validatePlanSnapshotUpdatedMutation(
  mutation: ValidatedMutation,
): Omit<PlanSnapshotUpdatedApplyInput, "mutationId" | "syncUpdatedAt"> {
  const system = getNestedPayloadRecord(mutation.payload, "system");
  const clientPlanId = getClientPlanId(mutation, system);
  validateStringLength(clientPlanId, "payload.clientPlanId", MAX_CLIENT_ID_LENGTH);
  const clientGoalId =
    validateOptionalString(mutation.entity?.clientGoalId, "entity.clientGoalId") ??
    validateOptionalString(mutation.payload.clientGoalId, "payload.clientGoalId");
  if (clientGoalId) validateStringLength(clientGoalId, "payload.clientGoalId", MAX_CLIENT_ID_LENGTH);

  const vision = validateOptionalText(
    mutation.payload.vision ?? system.vision ?? system.vision12Week,
    "payload.system.vision12Week",
  );
  const startDate = validateOptionalDate(
    mutation.payload.startDate ?? system.startDate,
    "payload.system.startDate",
  );
  const rawWeeks = Array.isArray(system.weeklyPlans)
    ? system.weeklyPlans
    : Array.isArray(mutation.payload.weeks)
      ? mutation.payload.weeks
      : [];
  if (rawWeeks.length > 12) {
    throw new ApiError(400, "payload.system.weeklyPlans cannot contain more than 12 weeks.");
  }

  const seenWeekNumbers = new Set<number>();
  const weeks = rawWeeks.map((rawWeek, index): PlanSnapshotWeekUpdateInput => {
    if (!isRecord(rawWeek)) {
      throw new ApiError(400, `payload.system.weeklyPlans[${index}] must be an object.`);
    }

    const weekNumber = validateWeekNumber(rawWeek.weekNumber, `payload.system.weeklyPlans[${index}].weekNumber`);
    if (seenWeekNumbers.has(weekNumber)) {
      throw new ApiError(400, `payload.system.weeklyPlans[${index}].weekNumber must be unique.`);
    }
    seenWeekNumbers.add(weekNumber);

    const clientWeekId = validateOptionalString(
      rawWeek.clientWeekId,
      `payload.system.weeklyPlans[${index}].clientWeekId`,
    );
    if (clientWeekId) validateStringLength(clientWeekId, `payload.system.weeklyPlans[${index}].clientWeekId`, MAX_CLIENT_ID_LENGTH);

    return {
      clientWeekId,
      weekNumber,
      focus: validateOptionalText(rawWeek.focus, `payload.system.weeklyPlans[${index}].focus`),
      expectedOutput: validateOptionalText(
        rawWeek.expectedOutput ?? rawWeek.milestone,
        `payload.system.weeklyPlans[${index}].expectedOutput`,
      ),
    };
  });

  return {
    clientGoalId,
    clientPlanId,
    vision,
    startDate,
    weeks,
  };
}

function createUnsupportedMutationResult(mutation: ValidatedMutation): SyncMutationResult {
  return {
    mutationId: mutation.mutationId,
    type: mutation.type,
    status: "accepted",
    reason: "unsupported_not_applied",
    message: "Mutation kind was logged but is not applied by this backend version.",
    syncErrorCode: "unsupported_mutation",
  };
}

export class SyncMutationService {
  constructor(
    private readonly mutationLogRepository: SyncMutationLogRepository,
    private readonly taskMutationRepository: SyncTaskMutationRepository = new MongoSyncTaskMutationRepository(),
    private readonly workspaceMutationRepository: SyncWorkspaceMutationRepository = new MongoSyncWorkspaceMutationRepository(),
  ) {}

  async submitMutationBatch(userId: string, payload: unknown): Promise<SyncMutationBatchResult> {
    const batch = validateBatch(payload);
    const results: SyncMutationResult[] = [];
    const accepted: SyncMutationResult[] = [];
    const duplicate: SyncMutationResult[] = [];
    const failed: SyncMutationResult[] = [];
    let appliedCount = 0;
    let skippedCount = 0;

    for (const mutation of batch.mutations) {
      const existing = await this.mutationLogRepository.findByUserAndMutationId(userId, mutation.mutationId);
      if (existing) {
        if (existing.payloadHash !== mutation.payloadHash) {
          throw new ApiError(409, "Mutation idempotency conflict.", {
            mutationId: mutation.mutationId,
            message: "The same mutationId was already used with a different payload for this user.",
          });
        }

        const duplicateResult = toDuplicateResult(existing);
        duplicate.push(duplicateResult);
        results.push(duplicateResult);
        continue;
      }

      const processedAt = new Date();
      let logStatus: CreateSyncMutationLogData["status"] = "skipped";
      let result: SyncMutationResult;

      if (mutation.type === "task_completed_changed") {
        const applyInput = validateTaskCompletedChangedMutation(mutation);
        const updatedTask = await this.taskMutationRepository.applyTaskCompletedChanged(userId, {
          ...applyInput,
          mutationId: mutation.mutationId,
          syncUpdatedAt: processedAt,
        });

        if (updatedTask) {
          logStatus = "applied";
          appliedCount += 1;
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "applied",
            entityType: "task",
            clientId: updatedTask.clientTaskId ?? applyInput.clientTaskId,
            serverId: updatedTask.id,
            revision: updatedTask.revision,
            syncUpdatedAt: (updatedTask.syncUpdatedAt ?? processedAt).toISOString(),
            message: "Task completion mutation applied.",
          };
        } else {
          logStatus = "failed";
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "failed_not_found",
            entityType: "task",
            clientId: applyInput.clientTaskId,
            reason: "task_not_found_or_not_owned",
            message: "Task was not found for this authenticated user.",
            syncErrorCode: "ownership_denied",
          };
        }
      } else if (mutation.type === "daily_check_in_upserted") {
        const applyInput = validateDailyCheckInUpsertedMutation(mutation);
        const updatedCheckIn = await this.workspaceMutationRepository.applyDailyCheckInUpserted(userId, {
          ...applyInput,
          mutationId: mutation.mutationId,
          syncUpdatedAt: processedAt,
        });

        if (updatedCheckIn) {
          logStatus = "applied";
          appliedCount += 1;
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "applied",
            entityType: "daily_check_in",
            clientId: updatedCheckIn.clientId ?? applyInput.clientCheckInId,
            serverId: updatedCheckIn.id,
            revision: updatedCheckIn.revision,
            syncUpdatedAt: (updatedCheckIn.syncUpdatedAt ?? processedAt).toISOString(),
            message: "Daily check-in mutation applied.",
          };
        } else {
          logStatus = "failed";
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "failed_not_found",
            entityType: "daily_check_in",
            clientId: applyInput.clientCheckInId,
            reason: "week_not_found_or_not_owned",
            message: "Daily check-in parent week was not found for this authenticated user.",
            syncErrorCode: "ownership_denied",
          };
        }
      } else if (mutation.type === "weekly_review_upserted") {
        const applyInput = validateWeeklyReviewUpsertedMutation(mutation);
        const updatedReview = await this.workspaceMutationRepository.applyWeeklyReviewUpserted(userId, {
          ...applyInput,
          mutationId: mutation.mutationId,
          syncUpdatedAt: processedAt,
        });

        if (updatedReview) {
          logStatus = "applied";
          appliedCount += 1;
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "applied",
            entityType: "weekly_review",
            clientId: updatedReview.clientId ?? applyInput.clientReviewId,
            serverId: updatedReview.id,
            revision: updatedReview.revision,
            syncUpdatedAt: (updatedReview.syncUpdatedAt ?? processedAt).toISOString(),
            message: "Weekly review mutation applied.",
          };
        } else {
          logStatus = "failed";
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "failed_not_found",
            entityType: "weekly_review",
            clientId: applyInput.clientReviewId,
            reason: "week_not_found_or_not_owned",
            message: "Weekly review parent week was not found for this authenticated user.",
            syncErrorCode: "ownership_denied",
          };
        }
      } else if (mutation.type === "lead_metric_upserted") {
        const applyInput = validateLeadMetricUpsertedMutation(mutation);
        const updatedMetric = await this.workspaceMutationRepository.applyLeadMetricUpserted(userId, {
          ...applyInput,
          mutationId: mutation.mutationId,
          syncUpdatedAt: processedAt,
        });

        if (updatedMetric) {
          logStatus = "applied";
          appliedCount += 1;
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "applied",
            entityType: "lead_metric",
            clientId: updatedMetric.clientId ?? applyInput.clientMetricId,
            serverId: updatedMetric.id,
            revision: updatedMetric.revision,
            syncUpdatedAt: (updatedMetric.syncUpdatedAt ?? processedAt).toISOString(),
            message: "Lead metric mutation applied.",
          };
        } else {
          logStatus = "failed";
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "failed_not_found",
            entityType: "lead_metric",
            clientId: applyInput.clientMetricId,
            reason: "week_not_found_or_not_owned",
            message: "Lead metric parent week was not found for this authenticated user.",
            syncErrorCode: "ownership_denied",
          };
        }
      } else if (mutation.type === "plan_snapshot_updated") {
        const applyInput = validatePlanSnapshotUpdatedMutation(mutation);
        const updatedPlan = await this.workspaceMutationRepository.applyPlanSnapshotUpdated(userId, {
          ...applyInput,
          mutationId: mutation.mutationId,
          syncUpdatedAt: processedAt,
        });

        if (updatedPlan) {
          logStatus = "applied";
          appliedCount += 1;
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "applied",
            entityType: "plan",
            clientId: updatedPlan.clientId ?? applyInput.clientPlanId,
            serverId: updatedPlan.id,
            revision: updatedPlan.revision,
            syncUpdatedAt: (updatedPlan.syncUpdatedAt ?? processedAt).toISOString(),
            message: "Plan snapshot mutation applied.",
          };
        } else {
          logStatus = "failed";
          result = {
            mutationId: mutation.mutationId,
            type: mutation.type,
            status: "failed_not_found",
            entityType: "plan",
            clientId: applyInput.clientPlanId,
            reason: "plan_not_found_or_not_owned",
            message: "Plan was not found for this authenticated user.",
            syncErrorCode: "ownership_denied",
          };
        }
      } else {
        skippedCount += 1;
        result = createUnsupportedMutationResult(mutation);
      }

      try {
        const createdLog = await this.mutationLogRepository.createMutationLog({
          userId,
          mutationId: mutation.mutationId,
          idempotencyKey: mutation.idempotencyKey,
          type: mutation.type,
          payloadHash: mutation.payloadHash,
          status: logStatus,
          clientTimestamp: mutation.clientTimestamp,
          result,
        });

        const createdResult = {
          ...result,
          acceptedAt: createdLog.createdAt.toISOString(),
        };
        results.push(createdResult);
        if (createdResult.status === "failed_not_found" || createdResult.status === "failed") {
          failed.push(createdResult);
        } else {
          accepted.push(createdResult);
        }
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        const duplicateLog = await this.mutationLogRepository.findByUserAndMutationId(userId, mutation.mutationId);
        if (duplicateLog) {
          if (duplicateLog.payloadHash !== mutation.payloadHash) {
            throw new ApiError(409, "Mutation idempotency conflict.", {
              mutationId: mutation.mutationId,
              message: "The same mutationId was already used with a different payload for this user.",
            });
          }

          const duplicateResult = toDuplicateResult(duplicateLog);
          duplicate.push(duplicateResult);
          results.push(duplicateResult);
          continue;
        }

        const failedResult: SyncMutationResult = {
          mutationId: mutation.mutationId,
          type: mutation.type,
          status: "failed",
          message: "Mutation could not be logged idempotently.",
        };
        failed.push(failedResult);
        results.push(failedResult);
      }
    }

    const failedCount = failed.length;
    const status =
      failedCount > 0 && (accepted.length > 0 || duplicate.length > 0)
        ? "partial"
        : failedCount > 0
          ? "failed"
          : appliedCount > 0
            ? "applied"
            : accepted.length > 0
              ? "accepted"
              : "duplicate";

    return {
      batchId: batch.batchId,
      status,
      totalReceived: batch.mutations.length,
      appliedCount,
      skippedCount,
      failedCount,
      results,
      accepted,
      duplicate,
      failed,
      summary: {
        accepted: accepted.length,
        duplicate: duplicate.length,
        failed: failedCount,
        applied: appliedCount,
        skipped: skippedCount,
        totalReceived: batch.mutations.length,
      },
    };
  }
}

export const syncMutationService = new SyncMutationService(
  new MongoSyncMutationLogRepository(),
  new MongoSyncTaskMutationRepository(),
  new MongoSyncWorkspaceMutationRepository(),
);
