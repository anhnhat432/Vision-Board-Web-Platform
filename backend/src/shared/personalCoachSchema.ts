import { redactSensitive } from "./assistantRedaction";

export const COACH_ACTION_TYPES = [
  "open_today",
  "open_task",
  "open_week_review",
  "open_week_plan",
  "none",
] as const;

export type CoachActionType = (typeof COACH_ACTION_TYPES)[number];
export type CoachInsightSeverity = "positive" | "neutral" | "warning";
export type CoachCyclePhase = "active" | "final_week";
export type CoachWorkloadDecision = "keep same" | "reduce slightly" | "increase slightly";

export interface CoachTask {
  id: string;
  title: string;
  scheduledDate: string;
  isCore: boolean;
}

export interface CoachInsight {
  id: string;
  severity: CoachInsightSeverity;
  headline: string;
  metrics: Record<string, number | null>;
}

export interface PersonalCoachContext {
  goal: {
    id: string;
    title: string;
    outcome?: string;
  };
  cycle: {
    currentWeek: number;
    totalWeeks: number;
    phase: CoachCyclePhase;
  };
  today: {
    date: string;
    primaryTask?: CoachTask;
    openTasks: CoachTask[];
    scheduledCount: number;
    completedCount: number;
    allScheduledComplete: boolean;
  };
  week: {
    focus?: string;
    completionToDate?: number;
    wholeWeekCompletion?: number;
    coreCompletionToDate?: number;
    overdueCount: number;
    overdueTasks: CoachTask[];
    carryOverCount: number;
    checkInDays: number;
    possibleCheckInDays: number;
    reviewDueToday: boolean;
  };
  reflection?: {
    weekNumber: number;
    keepTactic?: string;
    mainObstacle?: string;
    nextWeekPriority?: string;
    nextWeekCommitments?: string[];
    reduceTactic?: string;
    workloadDecision?: CoachWorkloadDecision;
  };
  deterministicInsights: CoachInsight[];
  lagMetric?: {
    name: string;
    unit: string;
    target: string;
    currentValue: string;
  };
}

export interface CoachRecommendation {
  title: string;
  recommendation: string;
  rationale: string[];
  primaryAction: {
    type: CoachActionType;
    taskId?: string;
  };
  caution?: string;
}

export type CoachValidationResult<T> =
  | { ok: true; value: T; issues: string[] }
  | { ok: false; errorCode: string };

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TODAY_TASKS = 8;
const MAX_OVERDUE_TASKS = 3;
const MAX_COMMITMENTS = 3;
const MAX_INSIGHTS = 3;
const MAX_METRICS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeId(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function sanitizeContextText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = redactSensitive(value.trim()).slice(0, maxLength).trim();
  return normalized || undefined;
}

function sanitizeDateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return DATE_KEY_PATTERN.test(normalized) ? normalized : null;
}

function sanitizeInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function sanitizePercent(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return undefined;
  return Math.round(value);
}

function sanitizeTask(value: unknown): CoachTask | null {
  if (!isRecord(value)) return null;
  const id = sanitizeId(value.id);
  const title = sanitizeContextText(value.title, 160);
  const scheduledDate = sanitizeDateKey(value.scheduledDate);
  if (!id || !title || !scheduledDate || typeof value.isCore !== "boolean") return null;
  return { id, title, scheduledDate, isCore: value.isCore };
}

function sanitizeTaskArray(value: unknown, maxItems: number): CoachTask[] | null {
  if (!Array.isArray(value)) return null;
  const tasks: CoachTask[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, maxItems)) {
    const task = sanitizeTask(item);
    if (!task) return null;
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    tasks.push(task);
  }
  return tasks;
}

function sanitizeMetrics(value: unknown): Record<string, number | null> | null {
  if (!isRecord(value)) return null;
  const metrics: Record<string, number | null> = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, MAX_METRICS)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,47}$/.test(key)) continue;
    if (rawValue === null) {
      metrics[key] = null;
      continue;
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      metrics[key] = rawValue;
    }
  }
  return metrics;
}

function sanitizeInsights(value: unknown): CoachInsight[] | null {
  if (!Array.isArray(value)) return null;
  const insights: CoachInsight[] = [];
  for (const item of value.slice(0, MAX_INSIGHTS)) {
    if (!isRecord(item)) return null;
    const id = sanitizeId(item.id, 80);
    const headline = sanitizeContextText(item.headline, 160);
    const metrics = sanitizeMetrics(item.metrics);
    const severity = item.severity;
    if (
      !id ||
      !headline ||
      !metrics ||
      (severity !== "positive" && severity !== "neutral" && severity !== "warning")
    ) {
      return null;
    }
    insights.push({ id, headline, metrics, severity });
  }
  return insights;
}

function sanitizeStringArray(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const values = value
    .slice(0, maxItems)
    .map((item) => sanitizeContextText(item, maxLength))
    .filter((item): item is string => Boolean(item));
  return values.length > 0 ? values : undefined;
}

function sanitizeContext(value: unknown): PersonalCoachContext | null {
  if (!isRecord(value) || !isRecord(value.goal) || !isRecord(value.cycle)) return null;
  if (!isRecord(value.today) || !isRecord(value.week) || !Array.isArray(value.deterministicInsights)) return null;

  const goalId = sanitizeId(value.goal.id);
  const goalTitle = sanitizeContextText(value.goal.title, 160);
  const currentWeek = sanitizeInteger(value.cycle.currentWeek, 1, 104);
  const totalWeeks = sanitizeInteger(value.cycle.totalWeeks, 1, 104);
  const cyclePhase = value.cycle.phase;
  if (
    !goalId ||
    !goalTitle ||
    currentWeek === null ||
    totalWeeks === null ||
    currentWeek > totalWeeks ||
    (cyclePhase !== "active" && cyclePhase !== "final_week")
  ) {
    return null;
  }

  const date = sanitizeDateKey(value.today.date);
  const openTasks = sanitizeTaskArray(value.today.openTasks, MAX_TODAY_TASKS);
  const scheduledCount = sanitizeInteger(value.today.scheduledCount, 0, 500);
  const completedCount = sanitizeInteger(value.today.completedCount, 0, 500);
  const primaryTaskCandidate =
    value.today.primaryTask === undefined ? undefined : sanitizeTask(value.today.primaryTask);
  if (
    !date ||
    !openTasks ||
    scheduledCount === null ||
    completedCount === null ||
    completedCount > scheduledCount ||
    typeof value.today.allScheduledComplete !== "boolean" ||
    (value.today.primaryTask !== undefined && !primaryTaskCandidate)
  ) {
    return null;
  }
  const primaryTask = primaryTaskCandidate ?? undefined;
  if (primaryTask && !openTasks.some((task) => task.id === primaryTask.id)) return null;

  const overdueTasks = sanitizeTaskArray(value.week.overdueTasks, MAX_OVERDUE_TASKS);
  const overdueCount = sanitizeInteger(value.week.overdueCount, 0, 500);
  const carryOverCount = sanitizeInteger(value.week.carryOverCount, 0, 500);
  const checkInDays = sanitizeInteger(value.week.checkInDays, 0, 7);
  const possibleCheckInDays = sanitizeInteger(value.week.possibleCheckInDays, 0, 7);
  if (
    !overdueTasks ||
    overdueCount === null ||
    carryOverCount === null ||
    checkInDays === null ||
    possibleCheckInDays === null ||
    checkInDays > possibleCheckInDays ||
    typeof value.week.reviewDueToday !== "boolean"
  ) {
    return null;
  }

  const deterministicInsights = sanitizeInsights(value.deterministicInsights);
  if (!deterministicInsights) return null;

  let reflection: PersonalCoachContext["reflection"];
  if (value.reflection !== undefined) {
    if (!isRecord(value.reflection)) return null;
    const weekNumber = sanitizeInteger(value.reflection.weekNumber, 1, totalWeeks);
    if (weekNumber === null) return null;
    const workloadDecision = value.reflection.workloadDecision;
    reflection = {
      weekNumber,
      keepTactic: sanitizeContextText(value.reflection.keepTactic, 240),
      mainObstacle: sanitizeContextText(value.reflection.mainObstacle, 240),
      nextWeekPriority: sanitizeContextText(value.reflection.nextWeekPriority, 240),
      nextWeekCommitments: sanitizeStringArray(
        value.reflection.nextWeekCommitments,
        MAX_COMMITMENTS,
        180,
      ),
      reduceTactic: sanitizeContextText(value.reflection.reduceTactic, 240),
      workloadDecision:
        workloadDecision === "keep same" ||
        workloadDecision === "reduce slightly" ||
        workloadDecision === "increase slightly"
          ? workloadDecision
          : undefined,
    };
  }

  let lagMetric: PersonalCoachContext["lagMetric"];
  if (value.lagMetric !== undefined) {
    if (!isRecord(value.lagMetric)) return null;
    const name = sanitizeContextText(value.lagMetric.name, 120);
    const unit = sanitizeContextText(value.lagMetric.unit, 40);
    const target = sanitizeContextText(value.lagMetric.target, 60);
    const currentValue = sanitizeContextText(value.lagMetric.currentValue, 60);
    if (!name || !unit || !target || !currentValue) return null;
    lagMetric = { name, unit, target, currentValue };
  }

  return {
    goal: {
      id: goalId,
      title: goalTitle,
      outcome: sanitizeContextText(value.goal.outcome, 320),
    },
    cycle: { currentWeek, totalWeeks, phase: cyclePhase },
    today: {
      date,
      primaryTask,
      openTasks,
      scheduledCount,
      completedCount,
      allScheduledComplete: value.today.allScheduledComplete,
    },
    week: {
      focus: sanitizeContextText(value.week.focus, 240),
      completionToDate: sanitizePercent(value.week.completionToDate),
      wholeWeekCompletion: sanitizePercent(value.week.wholeWeekCompletion),
      coreCompletionToDate: sanitizePercent(value.week.coreCompletionToDate),
      overdueCount,
      overdueTasks,
      carryOverCount,
      checkInDays,
      possibleCheckInDays,
      reviewDueToday: value.week.reviewDueToday,
    },
    reflection,
    deterministicInsights,
    lagMetric,
  };
}

function readOutputText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return redactSensitive(normalized);
}

export function isCoachActionType(value: unknown): value is CoachActionType {
  return typeof value === "string" && (COACH_ACTION_TYPES as readonly string[]).includes(value);
}

export function sanitizePersonalCoachRequest(input: unknown): CoachValidationResult<PersonalCoachContext> {
  if (!isRecord(input)) return { ok: false, errorCode: "COACH_INVALID_REQUEST" };
  const context = sanitizeContext(input.context);
  if (!context) return { ok: false, errorCode: "COACH_INVALID_CONTEXT" };
  return { ok: true, value: context, issues: [] };
}

export function validateCoachRecommendation(
  input: unknown,
  context: PersonalCoachContext,
): CoachValidationResult<CoachRecommendation> {
  if (!isRecord(input)) return { ok: false, errorCode: "COACH_INVALID_RECOMMENDATION" };
  const title = readOutputText(input.title, 80);
  const recommendation = readOutputText(input.recommendation, 320);
  if (!title || !recommendation) return { ok: false, errorCode: "COACH_INVALID_RECOMMENDATION" };

  if (!Array.isArray(input.rationale) || input.rationale.length < 1 || input.rationale.length > 3) {
    return { ok: false, errorCode: "COACH_INVALID_RATIONALE" };
  }
  const rationale = input.rationale.map((item) => readOutputText(item, 180));
  if (rationale.some((item) => !item)) return { ok: false, errorCode: "COACH_INVALID_RATIONALE" };

  if (!isRecord(input.primaryAction) || !isCoachActionType(input.primaryAction.type)) {
    return { ok: false, errorCode: "COACH_INVALID_ACTION" };
  }

  const issues: string[] = [];
  let primaryAction: CoachRecommendation["primaryAction"];
  if (input.primaryAction.type === "open_task") {
    const taskId = sanitizeId(input.primaryAction.taskId);
    const openTaskIds = new Set([
      ...context.today.openTasks.map((task) => task.id),
      ...context.week.overdueTasks.map((task) => task.id),
    ]);
    if (!taskId || !openTaskIds.has(taskId)) {
      issues.push("COACH_INVALID_TASK_ACTION");
      primaryAction = { type: "open_today" };
    } else {
      primaryAction = { type: "open_task", taskId };
    }
  } else {
    primaryAction = { type: input.primaryAction.type };
  }

  const cautionCandidate = input.caution === undefined ? undefined : readOutputText(input.caution, 180);
  if (input.caution !== undefined && !cautionCandidate) {
    return { ok: false, errorCode: "COACH_INVALID_RECOMMENDATION" };
  }
  const caution = cautionCandidate ?? undefined;

  return {
    ok: true,
    value: {
      title,
      recommendation,
      rationale: rationale as string[],
      primaryAction,
      caution,
    },
    issues,
  };
}
