import { isValidObjectId } from "mongoose";

import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import { ApiError } from "../utils/apiError";

type IdLike = { toString(): string } | string;
type NullableDate = Date | string | null | undefined;

interface SyncEntityBase {
  _id: IdLike;
  revision?: number | null;
  deletedAt?: NullableDate;
  lastMutationId?: string | null;
  syncUpdatedAt?: NullableDate;
  createdAt?: NullableDate;
  updatedAt?: NullableDate;
}

export interface PullGoalSource extends SyncEntityBase {
  userId: string;
  title?: string | null;
  category?: string | null;
  description?: string | null;
  deadline?: NullableDate;
  status?: string | null;
  focusArea?: string | null;
  readinessScore?: number | null;
  tasks?: Array<{ title?: string | null; completed?: boolean | null }> | null;
  planId?: string | null;
  clientGoalId?: string | null;
}

export interface PullPlanSource extends SyncEntityBase {
  userId: string;
  vision?: string | null;
  smartGoalId?: string | null;
  startDate?: NullableDate;
  clientPlanId?: string | null;
  clientGoalId?: string | null;
}

export interface PullWeekSource extends SyncEntityBase {
  planId: IdLike;
  weekNumber?: number | null;
  focus?: string | null;
  expectedOutput?: string | null;
  review?: {
    weekNumber?: number | null;
    executionScore?: number | null;
    reflection?: string | null;
    adjustments?: string | null;
  } | null;
  clientWeekId?: string | null;
  clientPlanId?: string | null;
}

export interface PullTaskSource extends SyncEntityBase {
  weekId: IdLike;
  title?: string | null;
  status?: "todo" | "doing" | "done" | string | null;
  scheduledDate?: NullableDate;
  clientTaskId?: string | null;
  clientWeekId?: string | null;
  clientPlanId?: string | null;
  weekNumber?: number | null;
  leadIndicatorName?: string | null;
  isCore?: boolean | null;
  completedAt?: NullableDate;
  tacticId?: string | null;
  rescheduledFrom?: NullableDate;
}

export interface PullLeadMetricSource extends SyncEntityBase {
  weekId: IdLike;
  name?: string | null;
  weeklyTarget?: number | null;
  logs?: Array<{
    _id?: IdLike;
    date?: NullableDate;
    value?: number | null;
    completed?: boolean | null;
  }> | null;
  clientMetricId?: string | null;
  clientWeekId?: string | null;
  clientPlanId?: string | null;
  leadIndicatorId?: string | null;
  unit?: string | null;
  type?: string | null;
  priority?: number | null;
  schedule?: number[] | null;
}

export interface PullDailyCheckInSource extends SyncEntityBase {
  userId: string;
  planId: IdLike;
  weekId: IdLike;
  clientGoalId?: string | null;
  clientPlanId?: string | null;
  clientWeekId?: string | null;
  clientCheckInId?: string | null;
  weekNumber?: number | null;
  localDate?: string | null;
  didWorkToday?: boolean | null;
  whichLeadIndicatorWorkedOn?: string | null;
  amountDone?: string | null;
  outputCreated?: string | null;
  obstacleOrIssue?: string | null;
  dailySelfRating?: number | null;
  optionalNote?: string | null;
  mood?: "low" | "steady" | "high" | string | null;
}

export interface PullWeeklyReviewSource extends SyncEntityBase {
  userId?: string | null;
  planId?: IdLike | null;
  weekId: IdLike;
  weekNumber?: number | null;
  executionScore?: number | null;
  reflection?: string | null;
  adjustments?: string | null;
  clientPlanId?: string | null;
  clientWeekId?: string | null;
  clientReviewId?: string | null;
  leadCompletionPercent?: number | null;
  lagProgressValue?: string | null;
  biggestOutputThisWeek?: string | null;
  mainObstacle?: string | null;
  nextWeekPriority?: string | null;
  workloadDecision?: string | null;
  reviewCompleted?: boolean | null;
  progressScore?: number | null;
  disciplineScore?: number | null;
  focusScore?: number | null;
  improvementScore?: number | null;
  outputQualityScore?: number | null;
  completedLeadIndicators?: number | null;
}

export interface TwelveWeekPullFilters {
  clientPlanId?: string;
}

export interface TwelveWeekPullRepositoryData {
  goals: PullGoalSource[];
  plans: PullPlanSource[];
  weeks: PullWeekSource[];
  tasks: PullTaskSource[];
  leadMetrics: PullLeadMetricSource[];
  dailyCheckIns: PullDailyCheckInSource[];
  weeklyReviews: PullWeeklyReviewSource[];
}

export interface TwelveWeekPullRepository {
  listWorkspace(userId: string, filters: TwelveWeekPullFilters): Promise<TwelveWeekPullRepositoryData>;
}

interface PullEntityBase {
  id: string;
  revision?: number;
  deletedAt?: string;
  lastMutationId?: string;
  syncUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TwelveWeekPullWarning {
  code: string;
  message: string;
}

export interface TwelveWeekPullWorkspace {
  goals: Array<
    PullEntityBase & {
      clientGoalId?: string;
      title?: string;
      category?: string;
      description?: string;
      deadline?: string;
      status?: string;
      focusArea?: string;
      readinessScore?: number;
      tasks?: Array<{ title: string; completed: boolean }>;
      planId?: string;
    }
  >;
  plans: Array<
    PullEntityBase & {
      clientPlanId?: string;
      clientGoalId?: string;
      vision?: string;
      smartGoalId?: string;
      startDate?: string;
    }
  >;
  weeks: Array<
    PullEntityBase & {
      planId: string;
      clientWeekId?: string;
      clientPlanId?: string;
      weekNumber?: number;
      focus?: string;
      expectedOutput?: string;
      review?: {
        weekNumber?: number;
        executionScore?: number;
        reflection?: string;
        adjustments?: string;
      };
    }
  >;
  tasks: Array<
    PullEntityBase & {
      weekId: string;
      clientTaskId?: string;
      clientWeekId?: string;
      clientPlanId?: string;
      weekNumber?: number;
      title?: string;
      status?: string;
      scheduledDate?: string;
      leadIndicatorName?: string;
      isCore?: boolean;
      completedAt?: string;
      tacticId?: string;
      rescheduledFrom?: string;
    }
  >;
  leadMetrics: Array<
    PullEntityBase & {
      weekId: string;
      clientMetricId?: string;
      clientWeekId?: string;
      clientPlanId?: string;
      leadIndicatorId?: string;
      name?: string;
      weeklyTarget?: number;
      unit?: string;
      type?: string;
      priority?: number;
      schedule?: number[];
      logs: Array<{
        id?: string;
        date?: string;
        value?: number;
        completed?: boolean;
      }>;
    }
  >;
  dailyCheckIns: Array<
    PullEntityBase & {
      planId: string;
      weekId: string;
      clientGoalId?: string;
      clientPlanId?: string;
      clientWeekId?: string;
      clientCheckInId?: string;
      weekNumber?: number;
      localDate?: string;
      didWorkToday?: boolean;
      whichLeadIndicatorWorkedOn?: string;
      amountDone?: string;
      outputCreated?: string;
      obstacleOrIssue?: string;
      dailySelfRating?: number;
      optionalNote?: string;
      mood?: string;
    }
  >;
  weeklyReviews: Array<
    PullEntityBase & {
      planId?: string;
      weekId: string;
      clientPlanId?: string;
      clientWeekId?: string;
      clientReviewId?: string;
      weekNumber?: number;
      executionScore?: number;
      reflection?: string;
      adjustments?: string;
      leadCompletionPercent?: number;
      lagProgressValue?: string;
      biggestOutputThisWeek?: string;
      mainObstacle?: string;
      nextWeekPriority?: string;
      workloadDecision?: string;
      reviewCompleted?: boolean;
      progressScore?: number;
      disciplineScore?: number;
      focusScore?: number;
      improvementScore?: number;
      outputQualityScore?: number;
      completedLeadIndicators?: number;
    }
  >;
}

export interface TwelveWeekPullTombstone {
  id: string;
  clientId?: string;
  revision?: number;
  deletedAt: string;
  syncUpdatedAt?: string;
}

export interface TwelveWeekPullResult {
  serverTime: string;
  mode: "full";
  cursor: string | null;
  nextCursor: string | null;
  hasMore: false;
  cursorStatus: "not_provided" | "reserved_ignored";
  filters: TwelveWeekPullFilters;
  warnings: TwelveWeekPullWarning[];
  workspace: TwelveWeekPullWorkspace;
  changes: TwelveWeekPullWorkspace;
  tombstones: Record<keyof TwelveWeekPullWorkspace, TwelveWeekPullTombstone[]>;
  counts: Record<keyof TwelveWeekPullWorkspace, number>;
}

class MongoTwelveWeekPullRepository implements TwelveWeekPullRepository {
  async listWorkspace(userId: string, filters: TwelveWeekPullFilters): Promise<TwelveWeekPullRepositoryData> {
    const planQuery: Record<string, unknown> = { userId };
    if (filters.clientPlanId) planQuery.clientPlanId = filters.clientPlanId;

    const plans = (await PlanModel.find(planQuery).sort({ startDate: 1, _id: 1 }).lean()) as unknown as PullPlanSource[];
    const planIds = plans.map((plan) => toId(plan._id));
    const weeks =
      planIds.length > 0
        ? ((await WeekModel.find({ planId: { $in: planIds } })
            .sort({ weekNumber: 1, _id: 1 })
            .lean()) as unknown as PullWeekSource[])
        : [];
    const weekIds = weeks.map((week) => toId(week._id));

    const [goals, tasks, leadMetrics, dailyCheckIns, weeklyReviews] = await Promise.all([
      this.listGoals(userId, filters, plans, planIds),
      weekIds.length > 0
        ? (TaskModel.find({ weekId: { $in: weekIds } }).sort({ scheduledDate: 1, _id: 1 }).lean() as Promise<
            unknown[]
          >)
        : Promise.resolve([]),
      weekIds.length > 0
        ? (LeadMetricModel.find({ weekId: { $in: weekIds } }).sort({ name: 1, _id: 1 }).lean() as Promise<
            unknown[]
          >)
        : Promise.resolve([]),
      planIds.length > 0
        ? (DailyCheckInModel.find({ userId, planId: { $in: planIds } })
            .sort({ localDate: 1, _id: 1 })
            .lean() as Promise<unknown[]>)
        : Promise.resolve([]),
      weekIds.length > 0
        ? (WeekReviewModel.find({
            $or: [
              { userId, planId: { $in: planIds } },
              { userId: { $exists: false }, weekId: { $in: weekIds } },
              { userId: null, weekId: { $in: weekIds } },
            ],
          })
            .sort({ weekNumber: 1, _id: 1 })
            .lean() as Promise<unknown[]>)
        : Promise.resolve([]),
    ]);

    return {
      goals,
      plans,
      weeks,
      tasks: tasks as PullTaskSource[],
      leadMetrics: leadMetrics as PullLeadMetricSource[],
      dailyCheckIns: dailyCheckIns as PullDailyCheckInSource[],
      weeklyReviews: weeklyReviews as PullWeeklyReviewSource[],
    };
  }

  private async listGoals(
    userId: string,
    filters: TwelveWeekPullFilters,
    plans: PullPlanSource[],
    planIds: string[],
  ): Promise<PullGoalSource[]> {
    if (!filters.clientPlanId) {
      return (await GoalModel.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean()) as unknown as PullGoalSource[];
    }

    if (plans.length === 0) return [];

    const clientGoalIds = plans.map((plan) => optionalString(plan.clientGoalId)).filter(isString);
    const backendGoalIds = plans
      .map((plan) => optionalString(plan.smartGoalId))
      .filter((id): id is string => Boolean(id) && isValidObjectId(id));
    const or: Record<string, unknown>[] = [
      { planId: { $in: planIds } },
    ];
    if (clientGoalIds.length > 0) or.push({ clientGoalId: { $in: clientGoalIds } });
    if (backendGoalIds.length > 0) or.push({ _id: { $in: backendGoalIds } });

    return (await GoalModel.find({ userId, $or: or }).sort({ createdAt: 1, _id: 1 }).lean()) as unknown as PullGoalSource[];
  }
}

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function toId(value: IdLike | null | undefined): string {
  return value?.toString() ?? "";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toIsoString(value: NullableDate): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined;
}

function toDateKey(value: NullableDate): string | undefined {
  return toIsoString(value)?.slice(0, 10);
}

function baseEntity(doc: SyncEntityBase): PullEntityBase {
  return {
    id: toId(doc._id),
    revision: optionalNumber(doc.revision),
    deletedAt: toIsoString(doc.deletedAt),
    lastMutationId: optionalString(doc.lastMutationId),
    syncUpdatedAt: toIsoString(doc.syncUpdatedAt),
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}

function mapGoal(doc: PullGoalSource): TwelveWeekPullWorkspace["goals"][number] {
  return {
    ...baseEntity(doc),
    clientGoalId: optionalString(doc.clientGoalId),
    title: optionalString(doc.title),
    category: optionalString(doc.category),
    description: optionalString(doc.description),
    deadline: toDateKey(doc.deadline),
    status: optionalString(doc.status),
    focusArea: optionalString(doc.focusArea),
    readinessScore: optionalNumber(doc.readinessScore),
    tasks: Array.isArray(doc.tasks)
      ? doc.tasks.map((task) => ({
          title: optionalString(task.title) ?? "",
          completed: optionalBoolean(task.completed) ?? false,
        }))
      : undefined,
    planId: optionalString(doc.planId),
  };
}

function mapPlan(doc: PullPlanSource): TwelveWeekPullWorkspace["plans"][number] {
  return {
    ...baseEntity(doc),
    clientPlanId: optionalString(doc.clientPlanId),
    clientGoalId: optionalString(doc.clientGoalId),
    vision: optionalString(doc.vision),
    smartGoalId: optionalString(doc.smartGoalId),
    startDate: toDateKey(doc.startDate),
  };
}

function mapWeek(doc: PullWeekSource): TwelveWeekPullWorkspace["weeks"][number] {
  return {
    ...baseEntity(doc),
    planId: toId(doc.planId),
    clientWeekId: optionalString(doc.clientWeekId),
    clientPlanId: optionalString(doc.clientPlanId),
    weekNumber: optionalNumber(doc.weekNumber),
    focus: optionalString(doc.focus),
    expectedOutput: optionalString(doc.expectedOutput),
    review: doc.review
      ? {
          weekNumber: optionalNumber(doc.review.weekNumber),
          executionScore: optionalNumber(doc.review.executionScore),
          reflection: optionalString(doc.review.reflection),
          adjustments: optionalString(doc.review.adjustments),
        }
      : undefined,
  };
}

function mapTask(doc: PullTaskSource): TwelveWeekPullWorkspace["tasks"][number] {
  return {
    ...baseEntity(doc),
    weekId: toId(doc.weekId),
    clientTaskId: optionalString(doc.clientTaskId),
    clientWeekId: optionalString(doc.clientWeekId),
    clientPlanId: optionalString(doc.clientPlanId),
    weekNumber: optionalNumber(doc.weekNumber),
    title: optionalString(doc.title),
    status: optionalString(doc.status),
    scheduledDate: toDateKey(doc.scheduledDate),
    leadIndicatorName: optionalString(doc.leadIndicatorName),
    isCore: optionalBoolean(doc.isCore),
    completedAt: toIsoString(doc.completedAt),
    tacticId: optionalString(doc.tacticId),
    rescheduledFrom: toDateKey(doc.rescheduledFrom),
  };
}

function mapLeadMetric(doc: PullLeadMetricSource): TwelveWeekPullWorkspace["leadMetrics"][number] {
  return {
    ...baseEntity(doc),
    weekId: toId(doc.weekId),
    clientMetricId: optionalString(doc.clientMetricId),
    clientWeekId: optionalString(doc.clientWeekId),
    clientPlanId: optionalString(doc.clientPlanId),
    leadIndicatorId: optionalString(doc.leadIndicatorId),
    name: optionalString(doc.name),
    weeklyTarget: optionalNumber(doc.weeklyTarget),
    unit: optionalString(doc.unit),
    type: optionalString(doc.type),
    priority: optionalNumber(doc.priority),
    schedule: Array.isArray(doc.schedule) ? doc.schedule.filter((day) => Number.isInteger(day)) : undefined,
    logs: Array.isArray(doc.logs)
      ? doc.logs.map((log) => ({
          id: log._id ? toId(log._id) : undefined,
          date: toDateKey(log.date),
          value: optionalNumber(log.value),
          completed: optionalBoolean(log.completed),
        }))
      : [],
  };
}

function mapDailyCheckIn(doc: PullDailyCheckInSource): TwelveWeekPullWorkspace["dailyCheckIns"][number] {
  return {
    ...baseEntity(doc),
    planId: toId(doc.planId),
    weekId: toId(doc.weekId),
    clientGoalId: optionalString(doc.clientGoalId),
    clientPlanId: optionalString(doc.clientPlanId),
    clientWeekId: optionalString(doc.clientWeekId),
    clientCheckInId: optionalString(doc.clientCheckInId),
    weekNumber: optionalNumber(doc.weekNumber),
    localDate: optionalString(doc.localDate),
    didWorkToday: optionalBoolean(doc.didWorkToday),
    whichLeadIndicatorWorkedOn: optionalString(doc.whichLeadIndicatorWorkedOn),
    amountDone: optionalString(doc.amountDone),
    outputCreated: optionalString(doc.outputCreated),
    obstacleOrIssue: optionalString(doc.obstacleOrIssue),
    dailySelfRating: optionalNumber(doc.dailySelfRating),
    optionalNote: optionalString(doc.optionalNote),
    mood: optionalString(doc.mood),
  };
}

function mapWeeklyReview(doc: PullWeeklyReviewSource): TwelveWeekPullWorkspace["weeklyReviews"][number] {
  return {
    ...baseEntity(doc),
    planId: doc.planId ? toId(doc.planId) : undefined,
    weekId: toId(doc.weekId),
    clientPlanId: optionalString(doc.clientPlanId),
    clientWeekId: optionalString(doc.clientWeekId),
    clientReviewId: optionalString(doc.clientReviewId),
    weekNumber: optionalNumber(doc.weekNumber),
    executionScore: optionalNumber(doc.executionScore),
    reflection: optionalString(doc.reflection),
    adjustments: optionalString(doc.adjustments),
    leadCompletionPercent: optionalNumber(doc.leadCompletionPercent),
    lagProgressValue: optionalString(doc.lagProgressValue),
    biggestOutputThisWeek: optionalString(doc.biggestOutputThisWeek),
    mainObstacle: optionalString(doc.mainObstacle),
    nextWeekPriority: optionalString(doc.nextWeekPriority),
    workloadDecision: optionalString(doc.workloadDecision),
    reviewCompleted: optionalBoolean(doc.reviewCompleted),
    progressScore: optionalNumber(doc.progressScore),
    disciplineScore: optionalNumber(doc.disciplineScore),
    focusScore: optionalNumber(doc.focusScore),
    improvementScore: optionalNumber(doc.improvementScore),
    outputQualityScore: optionalNumber(doc.outputQualityScore),
    completedLeadIndicators: optionalNumber(doc.completedLeadIndicators),
  };
}

function normalizeOptionalQueryString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }

  const trimmed = raw.trim();
  return trimmed || undefined;
}

function parsePullQuery(query: unknown): { cursor?: string; filters: TwelveWeekPullFilters } {
  const record = query && typeof query === "object" && !Array.isArray(query) ? (query as Record<string, unknown>) : {};
  const cursor = normalizeOptionalQueryString(record.cursor, "cursor");
  const clientPlanId = normalizeOptionalQueryString(record.clientPlanId, "clientPlanId");

  return {
    cursor,
    filters: clientPlanId ? { clientPlanId } : {},
  };
}

function entityCounts(workspace: TwelveWeekPullWorkspace): Record<keyof TwelveWeekPullWorkspace, number> {
  return {
    goals: workspace.goals.length,
    plans: workspace.plans.length,
    weeks: workspace.weeks.length,
    tasks: workspace.tasks.length,
    leadMetrics: workspace.leadMetrics.length,
    dailyCheckIns: workspace.dailyCheckIns.length,
    weeklyReviews: workspace.weeklyReviews.length,
  };
}

function createTombstone(entity: PullEntityBase, clientId?: string): TwelveWeekPullTombstone | null {
  if (!entity.deletedAt) return null;
  return {
    id: entity.id,
    clientId,
    revision: entity.revision,
    deletedAt: entity.deletedAt,
    syncUpdatedAt: entity.syncUpdatedAt,
  };
}

function splitActiveAndTombstones(workspace: TwelveWeekPullWorkspace): {
  workspace: TwelveWeekPullWorkspace;
  tombstones: Record<keyof TwelveWeekPullWorkspace, TwelveWeekPullTombstone[]>;
} {
  const tombstones = {
    goals: workspace.goals
      .map((entity) => createTombstone(entity, entity.clientGoalId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    plans: workspace.plans
      .map((entity) => createTombstone(entity, entity.clientPlanId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    weeks: workspace.weeks
      .map((entity) => createTombstone(entity, entity.clientWeekId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    tasks: workspace.tasks
      .map((entity) => createTombstone(entity, entity.clientTaskId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    leadMetrics: workspace.leadMetrics
      .map((entity) => createTombstone(entity, entity.clientMetricId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    dailyCheckIns: workspace.dailyCheckIns
      .map((entity) => createTombstone(entity, entity.clientCheckInId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
    weeklyReviews: workspace.weeklyReviews
      .map((entity) => createTombstone(entity, entity.clientReviewId))
      .filter((value): value is TwelveWeekPullTombstone => Boolean(value)),
  };

  return {
    workspace: {
      goals: workspace.goals.filter((entity) => !entity.deletedAt),
      plans: workspace.plans.filter((entity) => !entity.deletedAt),
      weeks: workspace.weeks.filter((entity) => !entity.deletedAt),
      tasks: workspace.tasks.filter((entity) => !entity.deletedAt),
      leadMetrics: workspace.leadMetrics.filter((entity) => !entity.deletedAt),
      dailyCheckIns: workspace.dailyCheckIns.filter((entity) => !entity.deletedAt),
      weeklyReviews: workspace.weeklyReviews.filter((entity) => !entity.deletedAt),
    },
    tombstones,
  };
}

export class TwelveWeekPullService {
  constructor(private readonly repository: TwelveWeekPullRepository = new MongoTwelveWeekPullRepository()) {}

  async pullWorkspace(userId: string, query: unknown): Promise<TwelveWeekPullResult> {
    const { cursor, filters } = parsePullQuery(query);
    const warnings: TwelveWeekPullWarning[] = [];
    if (cursor) {
      warnings.push({
        code: "cursor_reserved",
        message: "Cursor support is reserved in pull v1; returning a full workspace snapshot.",
      });
    }

    const data = await this.repository.listWorkspace(userId, filters);
    const mappedWorkspace: TwelveWeekPullWorkspace = {
      goals: data.goals.map(mapGoal),
      plans: data.plans.map(mapPlan),
      weeks: data.weeks.map(mapWeek),
      tasks: data.tasks.map(mapTask),
      leadMetrics: data.leadMetrics.map(mapLeadMetric),
      dailyCheckIns: data.dailyCheckIns.map(mapDailyCheckIn),
      weeklyReviews: data.weeklyReviews.map(mapWeeklyReview),
    };
    const split = splitActiveAndTombstones(mappedWorkspace);

    if (filters.clientPlanId && split.workspace.plans.length === 0) {
      warnings.push({
        code: "plan_not_found",
        message: "No 12-week plan was found for this authenticated user and clientPlanId.",
      });
    }
    if (split.workspace.plans.length > 0) {
      warnings.push({
        code: "plan_metadata_partial",
        message: "Pull v1 returns current backend fields only; some local setup metadata is not yet persisted.",
      });
    }

    const result: TwelveWeekPullResult = {
      serverTime: new Date().toISOString(),
      mode: "full",
      cursor: null,
      nextCursor: null,
      hasMore: false,
      cursorStatus: cursor ? "reserved_ignored" : "not_provided",
      filters,
      warnings,
      workspace: split.workspace,
      changes: split.workspace,
      tombstones: split.tombstones,
      counts: entityCounts(split.workspace),
    };

    const approximateBytes = Buffer.byteLength(JSON.stringify(result), "utf8");
    if (approximateBytes > 512 * 1024) {
      result.warnings.push({
        code: "payload_size_warning",
        message: "Pull v1 response is larger than the recommended 512 KB target; pagination is not implemented yet.",
      });
    }

    return result;
  }
}

export const twelveWeekPullService = new TwelveWeekPullService();
