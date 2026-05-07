// ─── Sync Mutation Type Definitions ────────────────────────────
// Dùng chung cho Frontend (React) và Backend (Express).
// Source of truth: shared-types/src/sync.ts

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

// ─── Result types ───────────────────────────────────────────────

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

// ─── Validated mutation (internal to orchestrator) ──────────────

export interface ValidatedMutation {
  mutationId: string;
  idempotencyKey?: string;
  type: SyncMutationType;
  clientTimestamp?: Date;
  entity?: Record<string, unknown>;
  baseRevision?: number;
  payload: Record<string, unknown>;
  payloadHash: string;
}

// ─── Mutation payload types (per mutation kind) ─────────────────

export interface TaskCompletedChangedPayload {
  clientTaskId?: string;
  backendTaskId?: string;
  clientWeekId?: string;
  clientPlanId?: string;
  completed: boolean;
  completedAt?: string;
}

export interface DailyCheckInUpsertPayload {
  clientPlanId: string;
  clientWeekId?: string;
  clientGoalId?: string;
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
}

export interface WeeklyReviewUpsertPayload {
  clientPlanId: string;
  clientWeekId?: string;
  clientReviewId?: string;
  weekNumber: number;
  executionScore: number;
  review?: {
    weekNumber?: number;
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
  };
  [key: string]: unknown;
}

export interface LeadMetricUpsertPayload {
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
}

export interface PlanSnapshotWeekPayload {
  clientWeekId?: string;
  weekNumber: number;
  focus?: string;
  expectedOutput?: string;
  milestone?: string;
}

export interface PlanSnapshotUpdatedPayload {
  clientPlanId: string;
  clientGoalId?: string;
  vision?: string;
  startDate?: string;
  system?: {
    vision12Week?: string;
    startDate?: string;
    status?: string;
    currentWeek?: number;
    totalWeeks?: number;
    weeklyPlans?: PlanSnapshotWeekPayload[];
    [key: string]: unknown;
  };
  weeks?: PlanSnapshotWeekPayload[];
}

export interface PlanSnapshotUpsertPayload extends PlanSnapshotUpdatedPayload {}

export interface TaskUpsertPayload {
  clientPlanId: string;
  clientWeekId?: string;
  clientTaskId?: string;
  title: string;
  status?: "todo" | "doing" | "done";
  completed?: boolean;
}

// ─── Union type for all mutation payloads ───────────────────────

export type SyncMutationPayload =
  | TaskCompletedChangedPayload
  | DailyCheckInUpsertPayload
  | WeeklyReviewUpsertPayload
  | LeadMetricUpsertPayload
  | PlanSnapshotUpdatedPayload
  | PlanSnapshotUpsertPayload
  | TaskUpsertPayload;