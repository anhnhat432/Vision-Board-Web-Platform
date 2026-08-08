import type {
  DataMutationItem,
  DataMutationKind,
  DataMutationPayload,
} from "@/features/plan12week/persistence/mutationQueue";
import type { TwelveWeekImportPayload } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import type { LagMetric, Milestones, TwelveWeekSystem } from "@/app/utils/storage-types";
import { delete as deleteRequest, get, post } from "@/lib/api/apiClient";

export type TwelveWeekMutationResultStatus =
  | "accepted"
  | "duplicate"
  | "applied"
  | "noop"
  | "conflict"
  | "failed"
  | "failed_validation"
  | "failed_dependency"
  | "failed_not_found";

export interface TwelveWeekMutationRequestItem {
  mutationId: string;
  idempotencyKey: string;
  type: DataMutationKind;
  clientTimestamp: string;
  entity: {
    clientGoalId: string;
    backendPlanId?: string | null;
    backendWeekId?: string | null;
    backendTaskId?: string | null;
    clientPlanId?: string | null;
    clientWeekId?: string | null;
    clientTaskId?: string | null;
    clientMetricId?: string | null;
  };
  baseRevision?: number;
  payload: DataMutationPayload;
}

export interface TwelveWeekMutationBatchRequest {
  batchId: string;
  clientGeneratedAt: string;
  mutations: TwelveWeekMutationRequestItem[];
}

export interface TwelveWeekMutationResult {
  mutationId: string;
  type?: DataMutationKind;
  status: TwelveWeekMutationResultStatus;
  syncErrorCode?: string;
  message?: string;
  reason?: string;
}

export interface TwelveWeekMutationBatchResponse {
  batchId?: string;
  status?: string;
  accepted?: TwelveWeekMutationResult[];
  duplicate?: TwelveWeekMutationResult[];
  failed?: TwelveWeekMutationResult[];
  results?: TwelveWeekMutationResult[];
  summary?: {
    accepted?: number;
    duplicate?: number;
    failed?: number;
    applied?: number;
    noop?: number;
    conflicts?: number;
  };
}

export interface TwelveWeekImportValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface TwelveWeekImportValidationEntityCounts {
  goals: number;
  plans: number;
  weeks: number;
  tasks: number;
  leadIndicators: number;
  leadMetrics: number;
  dailyCheckIns: number;
  weeklyReviews: number;
}

export interface TwelveWeekImportValidationReport {
  status: "valid" | "invalid";
  mode: "validate_only";
  dryRun: true;
  acceptedEntityCounts: TwelveWeekImportValidationEntityCounts;
  warnings: TwelveWeekImportValidationIssue[];
  errors: TwelveWeekImportValidationIssue[];
  normalizedClientIdsCount: number;
  idempotencyKey?: string;
  requestId?: string;
}

export interface TwelveWeekImportValidationRequest {
  requestId: string;
  idempotencyKey: string;
  source: "account_scope_import_dry_run";
  mode: "validate_only";
  workspace: {
    goals: TwelveWeekImportPayload[];
  };
}

export interface TwelveWeekPullOptions {
  cursor?: string | null;
  clientPlanId?: string | null;
}

export interface TwelveWeekPullWarning {
  code: string;
  message: string;
}

export interface TwelveWeekPullEntityBase {
  id: string;
  revision?: number;
  deletedAt?: string;
  lastMutationId?: string;
  syncUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TwelveWeekPulledGoal extends TwelveWeekPullEntityBase {
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

export interface TwelveWeekPulledPlan extends TwelveWeekPullEntityBase {
  clientPlanId?: string;
  clientGoalId?: string;
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  weekStartsOn?: TwelveWeekSystem["weekStartsOn"];
  totalWeeks?: number;
  status?: TwelveWeekSystem["status"];
  goalType?: string;
  templateId?: string;
  templateName?: string;
  lagMetric?: LagMetric;
  milestones?: Milestones;
  successEvidence?: string;
  reviewDay?: string;
  week12Outcome?: string;
  weeklyActions?: string[];
  successMetric?: string;
  dailyReminderTime?: string;
  tacticLoadPreference?: TwelveWeekSystem["tacticLoadPreference"];
  preferredDays?: number[];
  personalConstraint?: TwelveWeekSystem["personalConstraint"];
  reentryCount?: number;
}

export interface TwelveWeekPulledWeek extends TwelveWeekPullEntityBase {
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

export interface TwelveWeekPulledTask extends TwelveWeekPullEntityBase {
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

export interface TwelveWeekPulledLeadMetric extends TwelveWeekPullEntityBase {
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

export interface TwelveWeekPulledDailyCheckIn extends TwelveWeekPullEntityBase {
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

export interface TwelveWeekPulledWeeklyReview extends TwelveWeekPullEntityBase {
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
  commitmentsKept?: string[];
  commitmentsMissed?: string[];
  insights?: string;
  nextWeekCommitments?: string[];
  keepTactic?: string;
  reduceTactic?: string;
  lastReviewAt?: string;
  progressScore?: number;
  disciplineScore?: number;
  focusScore?: number;
  improvementScore?: number;
  outputQualityScore?: number;
  completedLeadIndicators?: number;
}

export interface TwelveWeekPulledWorkspace {
  goals: TwelveWeekPulledGoal[];
  plans: TwelveWeekPulledPlan[];
  weeks: TwelveWeekPulledWeek[];
  tasks: TwelveWeekPulledTask[];
  leadMetrics: TwelveWeekPulledLeadMetric[];
  dailyCheckIns: TwelveWeekPulledDailyCheckIn[];
  weeklyReviews: TwelveWeekPulledWeeklyReview[];
}

export interface TwelveWeekPullTombstone {
  id: string;
  clientId?: string;
  revision?: number;
  deletedAt: string;
  syncUpdatedAt?: string;
}

export interface TwelveWeekPullResponse {
  serverTime: string;
  mode: "full" | "delta";
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  cursorStatus?: "not_provided" | "reserved_ignored" | "applied" | "invalid";
  filters?: {
    clientPlanId?: string;
  };
  warnings: TwelveWeekPullWarning[];
  workspace: TwelveWeekPulledWorkspace;
  changes: TwelveWeekPulledWorkspace;
  tombstones: Record<keyof TwelveWeekPulledWorkspace, TwelveWeekPullTombstone[]>;
  counts: Record<keyof TwelveWeekPulledWorkspace, number>;
}

function getClientPlanId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientPlanId ?? item.planId;
  if (item.kind === "daily_check_in_upserted") return item.payload.clientPlanId ?? item.planId;
  if (item.kind === "weekly_review_upserted") return item.payload.clientPlanId ?? item.planId;
  if (item.kind === "plan_snapshot_updated") return item.payload.clientPlanId ?? item.planId;
  if (item.kind === "lead_metric_upserted") return item.payload.clientPlanId ?? item.planId;
  if (item.kind === "goal_deleted") return item.planId;
  if (item.kind === "plan_deleted") return item.payload.clientPlanId ?? item.planId;
  return undefined;
}

function getClientWeekId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientWeekId;
  if (item.kind === "daily_check_in_upserted") return item.payload.clientWeekId;
  if (item.kind === "weekly_review_upserted") return item.payload.clientWeekId;
  if (item.kind === "lead_metric_upserted") return item.payload.clientWeekId;
  return undefined;
}

function getClientTaskId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientTaskId ?? item.payload.taskId;
  return undefined;
}

function getClientMetricId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "lead_metric_upserted") return item.payload.clientMetricId;
  return undefined;
}

function getBackendPlanId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.backendPlanId ?? item.planId;
  if (item.kind === "daily_check_in_upserted") return item.payload.backendPlanId ?? item.planId;
  if (item.kind === "weekly_review_upserted") return item.payload.backendPlanId ?? item.planId;
  if (item.kind === "lead_metric_upserted") return item.payload.backendPlanId ?? item.planId;
  if (item.kind === "goal_deleted") return item.payload.backendPlanId ?? item.planId;
  if (item.kind === "plan_deleted") return item.payload.backendPlanId ?? item.planId;
  return undefined;
}

function getBackendWeekId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.backendWeekId;
  if (item.kind === "daily_check_in_upserted") return item.payload.backendWeekId;
  if (item.kind === "weekly_review_upserted") return item.payload.backendWeekId;
  if (item.kind === "lead_metric_upserted") return item.payload.backendWeekId;
  return undefined;
}

function getBackendTaskId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.backendTaskId;
  return undefined;
}

function withBackendPlanId<TPayload extends { backendPlanId?: string | null }>(
  payload: TPayload,
  backendPlanId: string | null | undefined,
): TPayload {
  if (payload.backendPlanId || !backendPlanId) return payload;
  return { ...payload, backendPlanId } as TPayload;
}

function getPayloadWithBackendIds(item: DataMutationItem): DataMutationPayload {
  switch (item.kind) {
    case "task_completed_changed":
    case "daily_check_in_upserted":
    case "weekly_review_upserted":
    case "lead_metric_upserted":
      return withBackendPlanId(item.payload, getBackendPlanId(item));
    default:
      return item.payload;
  }
}

export function toTwelveWeekMutationRequestItem(item: DataMutationItem): TwelveWeekMutationRequestItem {
  const payload = getPayloadWithBackendIds(item);

  return {
    mutationId: item.id,
    idempotencyKey: item.idempotencyKey,
    type: item.kind,
    clientTimestamp: item.createdAt,
    entity: {
      clientGoalId: item.goalId,
      backendPlanId: getBackendPlanId(item),
      backendWeekId: getBackendWeekId(item),
      backendTaskId: getBackendTaskId(item),
      clientPlanId: getClientPlanId(item),
      clientWeekId: getClientWeekId(item),
      clientTaskId: getClientTaskId(item),
      clientMetricId: getClientMetricId(item),
    },
    baseRevision: item.localRevision,
    payload,
  };
}

export function post12WeekMutations(payload: TwelveWeekMutationBatchRequest): Promise<TwelveWeekMutationBatchResponse> {
  return post<TwelveWeekMutationBatchResponse, TwelveWeekMutationBatchRequest>("/sync/12-week/mutations", payload);
}

export function post12WeekImportValidation(
  payload: TwelveWeekImportValidationRequest,
): Promise<TwelveWeekImportValidationReport> {
  return post<TwelveWeekImportValidationReport, TwelveWeekImportValidationRequest>(
    "/sync/12-week/import/validate",
    payload,
  );
}

export interface TwelveWeekImportRequest {
  importId: string;
  idempotencyKey: string;
  source: "account_scope_cloud_import";
  workspace: {
    goals: TwelveWeekImportPayload[];
  };
}

export interface TwelveWeekImportEntityLinks {
  goalId?: string;
  planId?: string;
  weekIds?: string[];
  taskIds?: string[];
  metricIds?: string[];
  checkInIds?: string[];
  reviewIds?: string[];
}

export interface TwelveWeekImportResponse {
  status: "applied" | "duplicate" | "partial" | "failed";
  importId?: string;
  message?: string;
  created?: Record<string, number>;
  updated?: Record<string, number>;
  links?: TwelveWeekImportEntityLinks[];
}

export function post12WeekImport(payload: TwelveWeekImportRequest): Promise<TwelveWeekImportResponse> {
  return post<TwelveWeekImportResponse, TwelveWeekImportRequest>("/sync/12-week/import", payload);
}

export function pullTwelveWeekWorkspace(options: TwelveWeekPullOptions = {}): Promise<TwelveWeekPullResponse> {
  const params = new URLSearchParams();
  if (options.cursor?.trim()) params.set("cursor", options.cursor.trim());
  if (options.clientPlanId?.trim()) params.set("clientPlanId", options.clientPlanId.trim());

  const query = params.toString();
  return get<TwelveWeekPullResponse>(`/sync/12-week/pull${query ? `?${query}` : ""}`);
}

// ---------------------------------------------------------------------------
// Cloud workspace export & delete
// ---------------------------------------------------------------------------

export interface CloudWorkspaceExportResponse {
  generatedAt: string;
  version: number;
  userId: string;
  workspace: {
    goals: unknown[];
    plans: unknown[];
    weeks: unknown[];
    tasks: unknown[];
    leadMetrics: unknown[];
    dailyCheckIns: unknown[];
    weeklyReviews: unknown[];
  };
  counts: {
    goals: number;
    plans: number;
    weeks: number;
    tasks: number;
    leadMetrics: number;
    dailyCheckIns: number;
    weeklyReviews: number;
  };
}

export interface CloudWorkspaceDeleteResponse {
  deletedAt: string;
  policy: string;
  counts: {
    goals: number;
    plans: number;
    weeks: number;
    tasks: number;
    leadMetrics: number;
    dailyCheckIns: number;
    weeklyReviews: number;
  };
}

export function exportCloudWorkspace(): Promise<CloudWorkspaceExportResponse> {
  return get<CloudWorkspaceExportResponse>("/sync/12-week/workspace/export");
}

export function deleteCloudWorkspace(): Promise<CloudWorkspaceDeleteResponse> {
  return deleteRequest<CloudWorkspaceDeleteResponse>("/sync/12-week/workspace");
}

export interface AccountDeleteResponse {
  deleted: boolean;
  deletedAt: string;
  firebaseAccountDeleted: boolean;
  counts: Record<string, number>;
}

export interface AccountExportResponse {
  generatedAt: string;
  version: number;
  userId: string;
  profile: unknown;
  data: Record<string, unknown[]>;
  counts: Record<string, number>;
}

export function exportAccountData(): Promise<AccountExportResponse> {
  return get<AccountExportResponse>("/account/export");
}

export function deleteAccount(): Promise<AccountDeleteResponse> {
  return deleteRequest<AccountDeleteResponse>("/account/delete");
}
