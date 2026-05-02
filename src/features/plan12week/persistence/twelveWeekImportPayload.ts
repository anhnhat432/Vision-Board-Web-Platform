import type {
  Goal,
  LeadIndicator,
  Milestones,
  Task,
  TwelveWeekSystem,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";
import { getUniversalWeeklyReviewExecutionScore } from "./reviewExecutionScore";

export type TwelveWeekImportTaskStatus = "todo" | "done";

export interface TwelveWeekImportGoalTaskPayload {
  title: string;
  completed: boolean;
}

export interface TwelveWeekImportLeadIndicatorPayload {
  id: string;
  leadIndicatorId: string;
  name: string;
  target: string;
  unit: string;
  type?: LeadIndicator["type"];
  priority?: number;
  schedule?: number[];
}

export interface TwelveWeekImportWeekPayload {
  clientWeekId: string;
  clientPlanId: string;
  weekNumber: number;
  phaseName: string;
  focus: string;
  expectedOutput: string;
  completed: boolean;
}

export interface TwelveWeekImportTaskPayload {
  clientTaskId: string;
  clientPlanId: string;
  clientWeekId: string;
  weekNumber: number;
  title: string;
  status: TwelveWeekImportTaskStatus;
  scheduledDate: string;
  leadIndicatorName: string;
  isCore: boolean;
  completedAt?: string;
  tacticId?: string;
  rescheduledFrom?: string;
}

export interface TwelveWeekImportLeadMetricPayload {
  clientMetricId: string;
  clientPlanId: string;
  clientWeekId: string;
  leadIndicatorId: string;
  weekNumber: number;
  name: string;
  weeklyTarget: number;
  target: string;
  unit: string;
  type?: LeadIndicator["type"];
  priority?: number;
  schedule?: number[];
}

export interface TwelveWeekImportDailyCheckInPayload extends UniversalDailyCheckIn {
  clientCheckInId: string;
  clientGoalId: string;
  clientPlanId: string;
  clientWeekId: string;
  localDate: string;
  weekNumber: number;
}

export interface TwelveWeekImportWeeklyReviewPayload extends UniversalWeeklyReview {
  clientReviewId: string;
  clientGoalId: string;
  clientPlanId: string;
  clientWeekId: string;
  executionScore: number;
}

export interface TwelveWeekImportPlanPayload {
  clientPlanId: string;
  clientGoalId: string;
  vision: string;
  startDate: string;
  endDate: string;
  timezone: string;
  weekStartsOn: TwelveWeekSystem["weekStartsOn"];
  totalWeeks: number;
  status: TwelveWeekSystem["status"];
  goalType: string;
  templateId?: string;
  templateName?: string;
  lagMetric: TwelveWeekSystem["lagMetric"];
  leadIndicators: TwelveWeekImportLeadIndicatorPayload[];
  milestones: Milestones;
  successEvidence: string;
  reviewDay: string;
  week12Outcome: string;
  weeklyActions?: string[];
  successMetric?: string;
  dailyReminderTime?: string;
  tacticLoadPreference?: TwelveWeekSystem["tacticLoadPreference"];
  preferredDays?: number[];
  personalConstraint?: TwelveWeekSystem["personalConstraint"];
  reentryCount?: number;
  currentWeek: number;
  weeks: TwelveWeekImportWeekPayload[];
  tasks: TwelveWeekImportTaskPayload[];
  leadMetrics: TwelveWeekImportLeadMetricPayload[];
  dailyCheckIns: TwelveWeekImportDailyCheckInPayload[];
  weeklyReviews: TwelveWeekImportWeeklyReviewPayload[];
}

export interface TwelveWeekImportPayload {
  clientGoalId: string;
  title: string;
  category: string;
  description: string;
  deadline: string;
  status: "active" | "completed";
  focusArea?: string;
  readinessScore?: number;
  tasks: TwelveWeekImportGoalTaskPayload[];
  plan: TwelveWeekImportPlanPayload;
}

const DAY_IN_MS = 86_400_000;

export function getTwelveWeekClientPlanId(goalId: string): string {
  return `${goalId}:12-week-system`;
}

export function getTwelveWeekClientWeekId(goalId: string, weekNumber: number): string {
  return `${goalId}:week:${weekNumber}`;
}

function getTwelveWeekClientCheckInId(clientPlanId: string, localDate: string): string {
  return `${clientPlanId}:checkin:${localDate}`;
}

function getTwelveWeekClientReviewId(clientPlanId: string, weekNumber: number): string {
  return `${clientPlanId}:review:${weekNumber}`;
}

function normalizeClientIdPart(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function getLeadIndicatorId(indicator: LeadIndicator, index: number): string {
  return indicator.id?.trim() || `lead_${index + 1}_${normalizeClientIdPart(indicator.name, "indicator")}`;
}

function getTwelveWeekClientMetricId(clientWeekId: string, leadIndicatorId: string): string {
  return `${clientWeekId}:metric:${leadIndicatorId}`;
}

function normalizeDateKey(value: string): string {
  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (dateOnlyMatch?.[1]) return dateOnlyMatch[1];

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.valueOf())) return trimmed;
  return parsed.toISOString().slice(0, 10);
}

function getCalendarDayIndex(dateKey: string): number | null {
  const normalized = normalizeDateKey(dateKey);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_IN_MS);
}

function clampWeekNumber(value: number, totalWeeks: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), Math.max(totalWeeks, 1));
}

function getWeekNumberForDate(system: TwelveWeekSystem, date: string): number {
  const dateIndex = getCalendarDayIndex(date);
  const startIndex = getCalendarDayIndex(system.startDate);
  if (dateIndex === null || startIndex === null) return clampWeekNumber(system.currentWeek || 1, system.totalWeeks);
  return clampWeekNumber(Math.floor((dateIndex - startIndex) / 7) + 1, system.totalWeeks);
}

function parseWeeklyTarget(target: string): number {
  const parsed = Number.parseFloat(target.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function mapGoalTask(task: Task): TwelveWeekImportGoalTaskPayload {
  return {
    title: task.title,
    completed: task.completed,
  };
}

function mapLeadIndicator(indicator: LeadIndicator, index: number): TwelveWeekImportLeadIndicatorPayload {
  const leadIndicatorId = getLeadIndicatorId(indicator, index);
  return {
    id: leadIndicatorId,
    leadIndicatorId,
    name: indicator.name,
    target: indicator.target,
    unit: indicator.unit,
    type: indicator.type,
    priority: indicator.priority,
    schedule: indicator.schedule ? [...indicator.schedule] : undefined,
  };
}

function mapWeeks(goalId: string, clientPlanId: string, system: TwelveWeekSystem): TwelveWeekImportWeekPayload[] {
  return system.weeklyPlans.map((week) => ({
    clientWeekId: getTwelveWeekClientWeekId(goalId, week.weekNumber),
    clientPlanId,
    weekNumber: week.weekNumber,
    phaseName: week.phaseName,
    focus: week.focus,
    expectedOutput: week.milestone,
    completed: week.completed,
  }));
}

function mapTasks(goalId: string, clientPlanId: string, system: TwelveWeekSystem): TwelveWeekImportTaskPayload[] {
  return system.taskInstances.map((task) => ({
    clientTaskId: task.id,
    clientPlanId,
    clientWeekId: getTwelveWeekClientWeekId(goalId, task.weekNumber),
    weekNumber: task.weekNumber,
    title: task.title,
    status: task.completed ? "done" : "todo",
    scheduledDate: normalizeDateKey(task.scheduledDate),
    leadIndicatorName: task.leadIndicatorName,
    isCore: task.isCore,
    completedAt: task.completedAt,
    tacticId: task.tacticId,
    rescheduledFrom: task.rescheduledFrom,
  }));
}

function mapLeadMetrics(
  goalId: string,
  clientPlanId: string,
  system: TwelveWeekSystem,
  leadIndicators: TwelveWeekImportLeadIndicatorPayload[],
): TwelveWeekImportLeadMetricPayload[] {
  return system.weeklyPlans.flatMap((week) => {
    const clientWeekId = getTwelveWeekClientWeekId(goalId, week.weekNumber);
    return leadIndicators.map((indicator) => ({
      clientMetricId: getTwelveWeekClientMetricId(clientWeekId, indicator.leadIndicatorId),
      clientPlanId,
      clientWeekId,
      leadIndicatorId: indicator.leadIndicatorId,
      weekNumber: week.weekNumber,
      name: indicator.name,
      weeklyTarget: parseWeeklyTarget(indicator.target),
      target: indicator.target,
      unit: indicator.unit,
      type: indicator.type,
      priority: indicator.priority,
      schedule: indicator.schedule ? [...indicator.schedule] : undefined,
    }));
  });
}

function mapDailyCheckIns(
  goalId: string,
  clientGoalId: string,
  clientPlanId: string,
  system: TwelveWeekSystem,
): TwelveWeekImportDailyCheckInPayload[] {
  return system.dailyCheckIns.map((checkIn) => {
    const localDate = normalizeDateKey(checkIn.date);
    const weekNumber = getWeekNumberForDate(system, localDate);
    return {
      ...checkIn,
      date: localDate,
      clientCheckInId: getTwelveWeekClientCheckInId(clientPlanId, localDate),
      clientGoalId,
      clientPlanId,
      clientWeekId: getTwelveWeekClientWeekId(goalId, weekNumber),
      localDate,
      weekNumber,
    };
  });
}

function mapWeeklyReviews(
  goalId: string,
  clientGoalId: string,
  clientPlanId: string,
  system: TwelveWeekSystem,
): TwelveWeekImportWeeklyReviewPayload[] {
  return system.weeklyReviews.map((review) => ({
    ...review,
    clientReviewId: getTwelveWeekClientReviewId(clientPlanId, review.weekNumber),
    clientGoalId,
    clientPlanId,
    clientWeekId: getTwelveWeekClientWeekId(goalId, review.weekNumber),
    executionScore: getUniversalWeeklyReviewExecutionScore(review, review.leadCompletionPercent),
  }));
}

export function createTwelveWeekImportPayload(goal: Goal): TwelveWeekImportPayload | null {
  const system = goal.twelveWeekSystem;
  if (!system) return null;

  const clientGoalId = goal.id;
  const clientPlanId = getTwelveWeekClientPlanId(goal.id);
  const leadIndicators = system.leadIndicators.map(mapLeadIndicator);

  return {
    clientGoalId,
    title: goal.title,
    category: goal.category,
    description: goal.description,
    deadline: goal.deadline,
    status: system.status === "completed" ? "completed" : "active",
    focusArea: goal.focusArea,
    readinessScore: goal.readinessScore,
    tasks: goal.tasks.map(mapGoalTask),
    plan: {
      clientPlanId,
      clientGoalId,
      vision: system.vision12Week,
      startDate: normalizeDateKey(system.startDate),
      endDate: normalizeDateKey(system.endDate),
      timezone: system.timezone,
      weekStartsOn: system.weekStartsOn,
      totalWeeks: system.totalWeeks,
      status: system.status,
      goalType: system.goalType,
      templateId: system.templateId,
      templateName: system.templateName,
      lagMetric: { ...system.lagMetric },
      leadIndicators,
      milestones: { ...system.milestones },
      successEvidence: system.successEvidence,
      reviewDay: system.reviewDay,
      week12Outcome: system.week12Outcome,
      weeklyActions: system.weeklyActions ? [...system.weeklyActions] : undefined,
      successMetric: system.successMetric,
      dailyReminderTime: system.dailyReminderTime,
      tacticLoadPreference: system.tacticLoadPreference,
      preferredDays: system.preferredDays ? [...system.preferredDays] : undefined,
      personalConstraint: system.personalConstraint,
      reentryCount: system.reentryCount,
      currentWeek: system.currentWeek,
      weeks: mapWeeks(goal.id, clientPlanId, system),
      tasks: mapTasks(goal.id, clientPlanId, system),
      leadMetrics: mapLeadMetrics(goal.id, clientPlanId, system, leadIndicators),
      dailyCheckIns: mapDailyCheckIns(goal.id, clientGoalId, clientPlanId, system),
      weeklyReviews: mapWeeklyReviews(goal.id, clientGoalId, clientPlanId, system),
    },
  };
}
