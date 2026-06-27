// Di chuyển từ syncMutationService.ts — giữ nguyên toàn bộ interface

export interface DailyCheckInUpsertApplyInput {
  mutationId: string;
  clientGoalId?: string;
  backendPlanId?: string;
  backendWeekId?: string;
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
  backendPlanId?: string;
  backendWeekId?: string;
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
  backendPlanId?: string;
  backendWeekId?: string;
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