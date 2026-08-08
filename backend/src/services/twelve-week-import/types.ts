import type { GoalStatus } from "../../models/GoalModel";
import type {
  CreateSyncMutationLogData,
  SyncMutationLogEntity,
} from "../../repositories/mongo/MongoSyncMutationLogRepository";
import type { TwelveWeekImportValidationReport } from "../twelveWeekImportValidationService";

export type ImportEntityOperation = "created" | "updated";
export type TaskStatus = "todo" | "doing" | "done";

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
  endDate?: Date;
  timezone?: string;
  weekStartsOn?: string;
  totalWeeks?: number;
  status?: string;
  goalType?: string;
  templateId?: string;
  templateName?: string;
  lagMetric?: unknown;
  milestones?: unknown;
  successEvidence?: string;
  reviewDay?: string;
  week12Outcome?: string;
  weeklyActions?: string[];
  successMetric?: string;
  dailyReminderTime?: string;
  tacticLoadPreference?: string;
  preferredDays?: number[];
  personalConstraint?: string;
  reentryCount?: number;
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
  commitmentsKept?: string[];
  commitmentsMissed?: string[];
  insights?: string;
  nextWeekCommitments?: string[];
  keepTactic?: string;
  reduceTactic?: string;
  reflection?: string;
  adjustments?: string;
  lastReviewAt?: Date;
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
