import { useEffect, useMemo, useRef, useState } from "react";

import { isDailyCheckInMetric } from "@/features/plan12week/constants/progressMetrics";
import {
  detectBackendPlanConflicts,
  type BackendPlanConflict,
} from "@/features/plan12week/persistence/backendConflictDetector";
import {
  getPlanLink,
  savePlanDetailsLink,
  setRemoteTaskIdForGoal,
} from "@/features/plan12week/persistence/planLinkStore";
import { saveGoalLink } from "@/lib/api/goalLinkStore";
import { getGoals, type ApiGoal } from "@/services/goalService";
import { getPlan, getPlans } from "@/services/planService";
import type { Plan, PlanDetails, Task as ApiTask, WeekDetails } from "@/types/plan";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "../utils/storage";
import {
  formatDateInputValue,
  getCalendarDateKey,
  getCalendarDayIndex,
  parseCalendarDate,
} from "../utils/storage-date-utils";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  normalizeGoal,
} from "../utils/storage-twelve-week";
import type {
  Goal,
  LeadIndicator,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalWeeklyReview,
  WeeklyPlanEntry,
} from "../utils/storage-types";
import { applyBackendProgressOverlay } from "./useBackendProgressOverlay";

const HYDRATION_EVENT_NAME = "visionboard:backend-hydrated";
const DEFAULT_TOTAL_WEEKS = 12;
const MAX_TOTAL_WEEKS = 12;

type HydrationStatus = "idle" | "success" | "partial" | "error";

interface BuildHydratedGoalOptions {
  goalId?: string;
}

interface HydratedGoalBuildResult {
  goal: Goal;
  taskIdByRemoteTaskId: Record<string, string>;
}

export interface BackendPlanHydrationResult {
  status: HydrationStatus;
  hydratedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  conflictCount: number;
  conflicts: BackendPlanHydrationConflict[];
  latestGoalId: string | null;
  message: string;
}

export interface BackendPlanHydrationConflict extends BackendPlanConflict {
  goalId: string;
  goalTitle: string;
  planId: string;
  planVision: string;
}

interface UseBackendPlanHydrationOptions {
  enabled: boolean;
  scopeKey?: string | null;
}

interface UseBackendPlanHydrationResult {
  loading: boolean;
  result: BackendPlanHydrationResult | null;
  error: Error | null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPhaseName(weekNumber: number): string {
  if (weekNumber <= 4) return "Foundation";
  if (weekNumber <= 8) return "Build / Acceleration";
  return "Finish / Execution";
}

function getDefaultWeeklyFocus(weekNumber: number): string {
  if (weekNumber <= 4) return "Build the foundation and keep the core actions moving.";
  if (weekNumber <= 8) return "Increase output and reinforce what is already working.";
  return "Finish the highest-value outputs and close the cycle deliberately.";
}

function getDateKey(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return getCalendarDateKey(value) ?? fallback;
}

function getPlanStartDate(plan: Plan): Date {
  return parseCalendarDate(plan.startDate) ?? parseCalendarDate(plan.createdAt) ?? new Date();
}

function getWeekStartDate(planStartDate: Date, weekNumber: number): Date {
  return addCalendarDays(planStartDate, (weekNumber - 1) * 7);
}

function getTotalWeeks(details: PlanDetails): number {
  const maxWeekNumber = details.weeks.reduce((max, week) => Math.max(max, week.weekNumber), 0);
  return clampNumber(maxWeekNumber || DEFAULT_TOTAL_WEEKS, 1, MAX_TOTAL_WEEKS);
}

function slugify(value: string, fallback: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || fallback;
}

function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getTaskBaseTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  const numberedMatch = trimmed.match(/^(.*\D)\s+([1-7])$/);
  return numberedMatch?.[1]?.trim() || trimmed;
}

function taskTitleMatchesIndicator(taskTitle: string, indicatorName: string): boolean {
  const taskTitleKey = normalizeComparableText(taskTitle);
  const indicatorKey = normalizeComparableText(indicatorName);
  if (!taskTitleKey || !indicatorKey) return false;
  return taskTitleKey === indicatorKey || normalizeComparableText(getTaskBaseTitle(taskTitle)) === indicatorKey;
}

function getWeekByNumber(details: PlanDetails): Map<number, WeekDetails> {
  return new Map(details.weeks.map((week) => [week.weekNumber, week]));
}

function getTaskDateKey(task: ApiTask | TwelveWeekTaskInstance): string {
  return getCalendarDateKey(task.scheduledDate ?? "") ?? "";
}

function getTaskOffset(planStartDate: Date, task: ApiTask, weekNumber: number): number | null {
  const dateKey = getTaskDateKey(task);
  const taskDate = dateKey ? parseCalendarDate(dateKey) : null;
  if (!taskDate) return null;

  const weekStartDate = getWeekStartDate(planStartDate, weekNumber);
  return clampNumber(getCalendarDayIndex(taskDate) - getCalendarDayIndex(weekStartDate), 0, 6);
}

function getMatchingTasksByWeek(details: PlanDetails, indicatorName: string): Map<number, ApiTask[]> {
  const matchingTasksByWeek = new Map<number, ApiTask[]>();

  details.weeks.forEach((week) => {
    const tasks = week.tasks.filter((task) => taskTitleMatchesIndicator(task.title, indicatorName));
    if (tasks.length > 0) {
      matchingTasksByWeek.set(week.weekNumber, tasks);
    }
  });

  return matchingTasksByWeek;
}

function getIndicatorTargetCount(details: PlanDetails, indicatorName: string, weeklyTarget = 0): number {
  const matchingTasksByWeek = getMatchingTasksByWeek(details, indicatorName);
  const maxTaskCount = Array.from(matchingTasksByWeek.values()).reduce(
    (max, tasks) => Math.max(max, getUniqueTaskSlotCount(tasks)),
    0,
  );

  return clampNumber(maxTaskCount || Math.round(weeklyTarget) || 1, 1, 7);
}

function getUniqueTaskSlotCount(tasks: ApiTask[]): number {
  return new Set(
    tasks.map((task) => {
      const dateKey = getTaskDateKey(task);
      return `${normalizeComparableText(task.title)}::${dateKey || task.id}`;
    }),
  ).size;
}

function getIndicatorSchedule(details: PlanDetails, indicatorName: string): number[] | undefined {
  const planStartDate = getPlanStartDate(details.plan);
  const matchingTasksByWeek = getMatchingTasksByWeek(details, indicatorName);
  const densestEntry = Array.from(matchingTasksByWeek.entries()).sort(
    ([leftWeek, leftTasks], [rightWeek, rightTasks]) =>
      rightTasks.length - leftTasks.length || leftWeek - rightWeek,
  )[0];

  if (!densestEntry) return undefined;

  const [weekNumber, tasks] = densestEntry;
  const offsets = tasks
    .map((task) => getTaskOffset(planStartDate, task, weekNumber))
    .filter((offset): offset is number => offset !== null);

  if (offsets.length === 0) return undefined;
  return Array.from(new Set(offsets)).sort((left, right) => left - right);
}

function createLeadIndicator(details: PlanDetails, name: string, index: number, weeklyTarget = 0): LeadIndicator {
  const normalizedName = name.trim() || `Backend tactic ${index + 1}`;
  return {
    id: `tactic_backend_${slugify(normalizedName, String(index + 1))}_${index + 1}`,
    name: normalizedName,
    target: String(getIndicatorTargetCount(details, normalizedName, weeklyTarget)),
    unit: "times/week",
    type: "core",
    priority: index + 1,
    schedule: getIndicatorSchedule(details, normalizedName),
  };
}

function deriveMetricIndicators(details: PlanDetails): LeadIndicator[] {
  const metricByName = new Map<string, { name: string; weeklyTarget: number; firstIndex: number }>();
  let metricIndex = 0;

  details.weeks.forEach((week) => {
    week.metrics.forEach((metric) => {
      const name = metric.name.trim();
      if (!name || isDailyCheckInMetric(name)) return;

      const key = normalizeComparableText(name);
      if (!metricByName.has(key)) {
        metricByName.set(key, {
          name,
          weeklyTarget: metric.weeklyTarget,
          firstIndex: metricIndex,
        });
        metricIndex += 1;
      }
    });
  });

  return Array.from(metricByName.values())
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .slice(0, 7)
    .map((metric, index) => createLeadIndicator(details, metric.name, index, metric.weeklyTarget));
}

function deriveTaskIndicators(details: PlanDetails): LeadIndicator[] {
  const taskBaseByName = new Map<string, { name: string; firstIndex: number }>();
  let taskIndex = 0;

  details.weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      const name = getTaskBaseTitle(task.title);
      if (!name) return;

      const key = normalizeComparableText(name);
      if (!taskBaseByName.has(key)) {
        taskBaseByName.set(key, { name, firstIndex: taskIndex });
        taskIndex += 1;
      }
    });
  });

  return Array.from(taskBaseByName.values())
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .slice(0, 7)
    .map((taskBase, index) => createLeadIndicator(details, taskBase.name, index));
}

function deriveLeadIndicators(details: PlanDetails): LeadIndicator[] {
  const metricIndicators = deriveMetricIndicators(details);
  if (metricIndicators.length > 0) return metricIndicators;

  const taskIndicators = deriveTaskIndicators(details);
  if (taskIndicators.length > 0) return taskIndicators;

  return [
    {
      id: "tactic_backend_execution_1",
      name: "Keep weekly execution rhythm",
      target: "1",
      unit: "times/week",
      type: "core",
      priority: 1,
      schedule: [1],
    },
  ];
}

function getWeekOutput(weekByNumber: ReadonlyMap<number, WeekDetails>, weekNumber: number): string {
  return weekByNumber.get(weekNumber)?.expectedOutput?.trim() ?? "";
}

function buildWeeklyPlans(
  details: PlanDetails,
  totalWeeks: number,
  week12Outcome: string,
): WeeklyPlanEntry[] {
  const weekByNumber = getWeekByNumber(details);

  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const week = weekByNumber.get(weekNumber);
    return {
      weekNumber,
      phaseName: getPhaseName(weekNumber),
      focus: week?.focus?.trim() || getDefaultWeeklyFocus(weekNumber),
      milestone: week?.expectedOutput?.trim() || (weekNumber === totalWeeks ? week12Outcome : ""),
      completed: Boolean(week?.review),
    };
  });
}

function buildWeeklyReviews(details: PlanDetails, normalizedSystem: TwelveWeekSystem): UniversalWeeklyReview[] {
  return details.weeks
    .filter((week) => week.review)
    .map((week) => {
      const completedTasks = normalizedSystem.taskInstances.filter(
        (task) => task.weekNumber === week.weekNumber && task.completed,
      ).length;
      const totalTasks = normalizedSystem.taskInstances.filter((task) => task.weekNumber === week.weekNumber).length;
      const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
      const score = clampNumber(Math.round((week.review?.executionScore ?? 0) / 20), 0, 5);

      return {
        weekNumber: week.weekNumber,
        leadCompletionPercent: completionPercent,
        lagProgressValue: "",
        biggestOutputThisWeek: week.review?.reflection?.trim() ?? "",
        mainObstacle: "",
        nextWeekPriority: week.review?.adjustments?.trim() ?? "",
        workloadDecision: "",
        reviewCompleted: true,
        progressScore: score,
        disciplineScore: score,
        focusScore: score,
        improvementScore: score,
        outputQualityScore: score,
        completedLeadIndicators: completedTasks,
      };
    });
}

function buildGoalTasks(apiGoal: ApiGoal | null): Goal["tasks"] {
  return (apiGoal?.tasks ?? []).map((task, index) => ({
    id: `task_backend_${apiGoal?.id ?? "goal"}_${index + 1}`,
    title: task.title,
    completed: task.completed,
  }));
}

function mapGoalStatus(apiGoal: ApiGoal | null): TwelveWeekSystem["status"] {
  if (apiGoal?.status === "completed") return "completed";
  if (apiGoal?.status === "archived") return "paused";
  return "active";
}

function getHydratedGoalId(apiGoal: ApiGoal | null, plan: Plan, options?: BuildHydratedGoalOptions): string {
  if (options?.goalId) return options.goalId;

  const smartGoalId = plan.smartGoalId?.trim();
  if (smartGoalId) return smartGoalId;

  if (apiGoal?.id) return `backend_goal_${apiGoal.id}`;
  return `backend_plan_${plan.id}`;
}

function findRemoteTaskForLocalTask(
  week: WeekDetails,
  localTask: TwelveWeekTaskInstance,
  usedRemoteTaskIds: ReadonlySet<string>,
): ApiTask | null {
  const localTitle = normalizeComparableText(localTask.title);
  const localDateKey = getTaskDateKey(localTask);
  const sameTitleTasks = week.tasks.filter(
    (task) => normalizeComparableText(task.title) === localTitle && !usedRemoteTaskIds.has(task.id),
  );
  const sameTitleAndDateTask = pickBestRemoteTask(
    sameTitleTasks.filter((task) => getTaskDateKey(task) === localDateKey),
  );

  return sameTitleAndDateTask ?? (sameTitleTasks.length === 1 ? sameTitleTasks[0] : null);
}

function pickBestRemoteTask(tasks: ApiTask[]): ApiTask | null {
  return [...tasks].sort((left, right) => {
    const completionPriority = Number(right.status === "done") - Number(left.status === "done");
    if (completionPriority !== 0) return completionPriority;
    return left.createdAt.localeCompare(right.createdAt);
  })[0] ?? null;
}

function buildTaskLinkMap(
  system: TwelveWeekSystem,
  details: PlanDetails,
): Record<string, string> {
  const weekByNumber = getWeekByNumber(details);
  const usedRemoteTaskIds = new Set<string>();
  const taskIdByRemoteTaskId: Record<string, string> = {};

  system.taskInstances.forEach((localTask) => {
    const week = weekByNumber.get(localTask.weekNumber);
    if (!week) return;

    const remoteTask = findRemoteTaskForLocalTask(week, localTask, usedRemoteTaskIds);
    if (!remoteTask) return;

    usedRemoteTaskIds.add(remoteTask.id);
    taskIdByRemoteTaskId[remoteTask.id] = localTask.id;
  });

  return taskIdByRemoteTaskId;
}

function invertTaskLinkMap(taskIdByRemoteTaskId: Record<string, string>): Record<string, string> {
  return Object.entries(taskIdByRemoteTaskId).reduce<Record<string, string>>(
    (accumulator, [remoteTaskId, localTaskId]) => {
      accumulator[localTaskId] = remoteTaskId;
      return accumulator;
    },
    {},
  );
}

export function buildHydratedGoalFromPlanDetails(
  apiGoal: ApiGoal | null,
  details: PlanDetails,
  options?: BuildHydratedGoalOptions,
): HydratedGoalBuildResult {
  const totalWeeks = getTotalWeeks(details);
  const planStartDate = getPlanStartDate(details.plan);
  const startDate = formatDateInputValue(planStartDate);
  const endDate = formatDateInputValue(addCalendarDays(planStartDate, totalWeeks * 7 - 1));
  const weekByNumber = getWeekByNumber(details);
  const week12Outcome =
    getWeekOutput(weekByNumber, totalWeeks) ||
    details.plan.vision?.trim() ||
    apiGoal?.title?.trim() ||
    "Restored backend cycle";
  const leadIndicators = deriveLeadIndicators(details);

  const baseSystem: TwelveWeekSystem = {
    goalType: apiGoal?.focusArea || apiGoal?.category || "backend-plan",
    vision12Week: details.plan.vision?.trim() || apiGoal?.description?.trim() || apiGoal?.title?.trim() || week12Outcome,
    lagMetric: {
      name: leadIndicators[0]?.name ?? "Main progress",
      unit: "",
      target: "",
      currentValue: "",
    },
    leadIndicators,
    milestones: {
      week4: getWeekOutput(weekByNumber, 4),
      week8: getWeekOutput(weekByNumber, 8),
      week12: getWeekOutput(weekByNumber, totalWeeks),
    },
    successEvidence: details.plan.vision?.trim() || week12Outcome,
    reviewDay: "Sunday",
    week12Outcome,
    startDate,
    endDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: mapGoalStatus(apiGoal),
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    reentryCount: 0,
    currentWeek: 1,
    totalWeeks,
    weeklyPlans: buildWeeklyPlans(details, totalWeeks, week12Outcome),
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: getDefaultScoreboard(totalWeeks),
  };

  const goal: Goal = {
    id: getHydratedGoalId(apiGoal, details.plan, options),
    category: apiGoal?.category || apiGoal?.focusArea || "Personal Growth",
    title: apiGoal?.title?.trim() || details.plan.vision?.trim() || week12Outcome,
    description: apiGoal?.description?.trim() || details.plan.vision?.trim() || week12Outcome,
    deadline: getDateKey(apiGoal?.deadline, endDate),
    tasks: buildGoalTasks(apiGoal),
    feasibilityResult: typeof apiGoal?.feasibilityResult === "string" ? apiGoal.feasibilityResult : undefined,
    readinessScore: apiGoal?.readinessScore,
    focusArea: apiGoal?.focusArea,
    twelveWeekSystem: baseSystem,
    createdAt: apiGoal?.createdAt ?? details.plan.createdAt ?? new Date().toISOString(),
  };

  const normalizedGoal = normalizeGoal(goal);
  const normalizedSystem = normalizedGoal.twelveWeekSystem ?? baseSystem;
  const taskIdByRemoteTaskId = buildTaskLinkMap(normalizedSystem, details);
  const overlaidSystem = applyBackendProgressOverlay(normalizedSystem, details, invertTaskLinkMap(taskIdByRemoteTaskId));
  const systemWithReviews: TwelveWeekSystem = {
    ...overlaidSystem,
    weeklyReviews: overlaidSystem.weeklyReviews.length > 0
      ? overlaidSystem.weeklyReviews
      : buildWeeklyReviews(details, overlaidSystem),
  };
  const currentWeek = getTwelveWeekCurrentWeek(systemWithReviews);
  const hydratedSystem: TwelveWeekSystem = {
    ...systemWithReviews,
    currentWeek,
    scoreboard: preserveBackendReviewScores(
      buildDerivedScoreboard(systemWithReviews, getDefaultScoreboard(systemWithReviews.totalWeeks)),
      details,
    ),
  };

  return {
    goal: {
      ...normalizedGoal,
      twelveWeekSystem: hydratedSystem,
    },
    taskIdByRemoteTaskId,
  };
}

function findRelatedApiGoal(apiGoals: ApiGoal[], plan: Plan): ApiGoal | null {
  const directGoal = apiGoals.find((goal) => goal.planId === plan.id);
  if (directGoal) return directGoal;

  const smartGoalId = plan.smartGoalId?.trim();
  if (!smartGoalId) return null;

  return apiGoals.find((goal) => goal.id === smartGoalId) ?? null;
}

function getExistingGoalIndexForPlan(goals: Goal[], plan: Plan): number {
  const linkedIndex = goals.findIndex((goal) => getPlanLink(goal.id)?.planId === plan.id);
  if (linkedIndex >= 0) return linkedIndex;

  const smartGoalId = plan.smartGoalId?.trim();
  if (!smartGoalId) return -1;
  const smartGoalIndex = goals.findIndex((goal) => goal.id === smartGoalId);
  if (smartGoalIndex < 0) return -1;

  const existingLink = getPlanLink(goals[smartGoalIndex]?.id ?? "");
  if (existingLink?.planId && existingLink.planId !== plan.id) return -1;
  return smartGoalIndex;
}

function persistHydratedGoalLinks(
  goalId: string,
  details: PlanDetails,
  taskIdByRemoteTaskId: Record<string, string>,
  apiGoal: ApiGoal | null,
): void {
  savePlanDetailsLink(goalId, details);

  Object.entries(taskIdByRemoteTaskId).forEach(([remoteTaskId, localTaskId]) => {
    setRemoteTaskIdForGoal(goalId, localTaskId, remoteTaskId);
  });

  if (apiGoal?.id) {
    saveGoalLink(goalId, apiGoal.id);
  }
}

function buildHydrationConflicts(
  goal: Goal,
  plan: Plan,
  conflicts: BackendPlanConflict[],
): BackendPlanHydrationConflict[] {
  return conflicts.map((conflict) => ({
    ...conflict,
    goalId: goal.id,
    goalTitle: goal.title,
    planId: plan.id,
    planVision: plan.vision?.trim() ?? "",
  }));
}

function preserveBackendReviewScores(
  scoreboard: TwelveWeekSystem["scoreboard"],
  details: PlanDetails,
): TwelveWeekSystem["scoreboard"] {
  const backendWeekByNumber = getWeekByNumber(details);

  return scoreboard.map((week) => {
    const backendReview = backendWeekByNumber.get(week.weekNumber)?.review;
    if (!backendReview) return week;

    return {
      ...week,
      outputDone: backendReview.reflection?.trim() || week.outputDone,
      reviewDone: true,
      weeklyScore: backendReview.executionScore,
    };
  });
}

function createHydrationResult(
  result: Omit<BackendPlanHydrationResult, "status" | "message">,
): BackendPlanHydrationResult {
  const status: HydrationStatus =
    result.failedCount > 0
      ? result.hydratedCount + result.updatedCount > 0
        ? "partial"
        : "error"
      : result.hydratedCount + result.updatedCount > 0
        ? "success"
        : "idle";

  const message =
    status === "success"
      ? "Backend plans were restored to this device."
      : status === "partial"
        ? "Some backend plans were restored, but a few could not be loaded."
        : status === "error"
          ? "Backend plans could not be restored to this device."
          : result.conflictCount > 0
            ? `${result.conflictCount} local/backend differences need review.`
          : "No backend plans needed local hydration.";

  return {
    ...result,
    status,
    message,
  };
}

function getPlanRecencyKey(plan: Plan): string {
  return plan.updatedAt?.trim() || plan.createdAt?.trim() || plan.startDate?.trim() || "";
}

function sortPlansByRecency(plans: Plan[]): Plan[] {
  return [...plans].sort((left, right) => {
    const recencySort = getPlanRecencyKey(right).localeCompare(getPlanRecencyKey(left));
    if (recencySort !== 0) return recencySort;
    return right.id.localeCompare(left.id);
  });
}

export async function hydrateTwelveWeekPlansFromBackend(): Promise<BackendPlanHydrationResult> {
  if (typeof window === "undefined") {
    return createHydrationResult({
      hydratedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      conflicts: [],
      latestGoalId: null,
    });
  }

  const [apiGoals, plans] = await Promise.all([
    getGoals().catch(() => [] as ApiGoal[]),
    getPlans(),
  ]);

  if (plans.length === 0) {
    return createHydrationResult({
      hydratedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      conflicts: [],
      latestGoalId: null,
    });
  }

  const plansByRecency = sortPlansByRecency(plans);
  const detailsResults = await Promise.allSettled(plansByRecency.map((plan) => getPlan(plan.id)));
  const data = getUserData();
  const knownGoalIds = new Set(data.goals.map((goal) => goal.id));
  let hydratedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let conflictCount = 0;
  const conflicts: BackendPlanHydrationConflict[] = [];
  let latestGoalId: string | null = null;

  detailsResults.forEach((detailsResult, index) => {
    if (detailsResult.status !== "fulfilled") {
      failedCount += 1;
      return;
    }

    const details = detailsResult.value;
    const plan = plansByRecency[index];
    if (!plan) {
      failedCount += 1;
      return;
    }

    const existingGoalIndex = getExistingGoalIndexForPlan(data.goals, plan);
    const existingGoal = existingGoalIndex >= 0 ? data.goals[existingGoalIndex] : null;
    const existingPlanLink = existingGoal ? getPlanLink(existingGoal.id) : null;

    if (existingGoal?.twelveWeekSystem && existingPlanLink?.planId === plan.id) {
      const conflictReport = detectBackendPlanConflicts(
        existingGoal.twelveWeekSystem,
        details,
        existingPlanLink.taskIdByLocalTaskId,
      );
      conflictCount += conflictReport.conflicts.length;
      conflicts.push(...buildHydrationConflicts(existingGoal, plan, conflictReport.conflicts));
      skippedCount += 1;
      latestGoalId ??= existingGoal.id;
      return;
    }

    const apiGoal = findRelatedApiGoal(apiGoals, plan);
    const preferredGoalId =
      existingGoal?.id ??
      (knownGoalIds.has(plan.smartGoalId?.trim() ?? "") ? `backend_plan_${plan.id}` : undefined);
    const buildResult = buildHydratedGoalFromPlanDetails(apiGoal, details, {
      goalId: preferredGoalId,
    });
    const hydratedGoal = buildResult.goal;
    let hydratedGoalId = hydratedGoal.id;

    if (existingGoalIndex >= 0) {
      data.goals[existingGoalIndex] = {
        ...hydratedGoal,
        id: existingGoal?.id ?? hydratedGoal.id,
        createdAt: existingGoal?.createdAt ?? hydratedGoal.createdAt,
        tasks: existingGoal?.tasks.length ? existingGoal.tasks : hydratedGoal.tasks,
      };
      hydratedGoalId = data.goals[existingGoalIndex]?.id ?? hydratedGoal.id;
      updatedCount += 1;
      latestGoalId ??= hydratedGoalId;
    } else {
      data.goals.push(hydratedGoal);
      knownGoalIds.add(hydratedGoal.id);
      hydratedCount += 1;
      latestGoalId ??= hydratedGoalId;
    }

    persistHydratedGoalLinks(hydratedGoalId, details, buildResult.taskIdByRemoteTaskId, apiGoal);
  });

  if (hydratedCount + updatedCount > 0) {
    data.onboardingCompleted = true;
    saveUserData(data);

    if (latestGoalId) {
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, latestGoalId);
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, latestGoalId);
    }

    window.dispatchEvent(new CustomEvent(HYDRATION_EVENT_NAME));
  }

  return createHydrationResult({
    hydratedCount,
    updatedCount,
    skippedCount,
    failedCount,
    conflictCount,
    conflicts,
    latestGoalId,
  });
}

export async function applyBackendPlanSnapshotToLocal(goalId: string): Promise<BackendPlanHydrationResult> {
  const failedResult = () =>
    createHydrationResult({
      hydratedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      conflictCount: 0,
      conflicts: [],
      latestGoalId: goalId,
    });

  if (typeof window === "undefined") return failedResult();

  const data = getUserData();
  const existingGoalIndex = data.goals.findIndex((goal) => goal.id === goalId);
  const existingGoal = existingGoalIndex >= 0 ? data.goals[existingGoalIndex] : null;
  const existingPlanLink = getPlanLink(goalId);
  if (!existingGoal?.twelveWeekSystem || !existingPlanLink?.planId) return failedResult();

  try {
    const [apiGoals, details] = await Promise.all([
      getGoals().catch(() => [] as ApiGoal[]),
      getPlan(existingPlanLink.planId),
    ]);
    const apiGoal = findRelatedApiGoal(apiGoals, details.plan);
    const buildResult = buildHydratedGoalFromPlanDetails(apiGoal, details, {
      goalId: existingGoal.id,
    });
    const backendSystem = buildResult.goal.twelveWeekSystem;
    if (!backendSystem) return failedResult();

    const nextGoal: Goal = {
      ...existingGoal,
      twelveWeekSystem: backendSystem,
    };

    data.goals[existingGoalIndex] = nextGoal;
    if (!saveUserData(data)) return failedResult();

    persistHydratedGoalLinks(existingGoal.id, details, buildResult.taskIdByRemoteTaskId, apiGoal);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, existingGoal.id);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, existingGoal.id);
    window.dispatchEvent(new CustomEvent(HYDRATION_EVENT_NAME));

    const latestPlanLink = getPlanLink(existingGoal.id);
    const conflictReport = detectBackendPlanConflicts(
      backendSystem,
      details,
      latestPlanLink?.taskIdByLocalTaskId ?? {},
    );

    return createHydrationResult({
      hydratedCount: 0,
      updatedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      conflictCount: conflictReport.conflicts.length,
      conflicts: buildHydrationConflicts(nextGoal, details.plan, conflictReport.conflicts),
      latestGoalId: existingGoal.id,
    });
  } catch {
    return failedResult();
  }
}

export function useBackendPlanHydration(
  options: UseBackendPlanHydrationOptions,
): UseBackendPlanHydrationResult {
  const [result, setResult] = useState<BackendPlanHydrationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const lastHydratedScopeRef = useRef<string | null>(null);
  const scopeKey = options.scopeKey ?? "default";

  useEffect(() => {
    if (!options.enabled) {
      setStatus("idle");
      setError(null);
      setResult(null);
      lastHydratedScopeRef.current = null;
      return;
    }

    if (lastHydratedScopeRef.current === scopeKey) return;
    lastHydratedScopeRef.current = scopeKey;

    let cancelled = false;
    setStatus("loading");
    setError(null);

    hydrateTwelveWeekPlansFromBackend()
      .then((nextResult) => {
        if (cancelled) return;
        setResult(nextResult);
        setStatus("done");
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        const parsedError = nextError instanceof Error ? nextError : new Error("Backend hydration failed.");
        console.error("Failed to hydrate backend 12-week plans.", nextError);
        setError(parsedError);
        setStatus("done");
      });

    return () => {
      cancelled = true;
    };
  }, [options.enabled, scopeKey]);

  return useMemo(
    () => ({
      loading: options.enabled && (status === "idle" || status === "loading"),
      result,
      error,
    }),
    [error, options.enabled, result, status],
  );
}

export { HYDRATION_EVENT_NAME as BACKEND_PLAN_HYDRATION_EVENT_NAME };
