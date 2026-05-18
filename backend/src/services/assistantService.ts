import { sendToGemini } from "./geminiAssistantProvider";
import { sendToGroq, sendToGroqStream } from "./groqAssistantProvider";
import { env } from "../config/env";

export interface AssistantContext {
  currentWeek: number | null;
  weeksTotal: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
  lastReflectionDate: string | null;
  feasibility: {
    readinessScore: number | null;
    bottleneckLabel: string | null;
    bottleneckAction: string | null;
  } | null;
  latestWeeklyReview: {
    weekNumber: number;
    leadCompletionPercent: number | null;
    mainObstacle: string | null;
    nextWeekPriority: string | null;
    workloadDecision: string | null;
    reviewedAt: string | null;
  } | null;
  stuckSignals: {
    latestObstacle: string | null;
    missedCommitments: string[];
    overdueOpenCount: number;
    overdueTasks: Array<{
      id: string;
      title: string;
      scheduledDate: string;
      isCore: boolean;
    }>;
  };
  trend: {
    completionLast4Weeks: number[];
    direction: "up" | "down" | "flat" | "unknown";
  };
  streak: {
    daysWithCompletedTask: number;
  };
  upcomingDeadlines: Array<{
    goalId: string;
    title: string;
    daysUntil: number;
  }>;
  pageContext: {
    route: string;
    currentStep: string | null;
    nextSuggestedStep: string | null;
    formDraft: {
      focusArea?: string | null;
      smartGoalTitle?: string | null;
      smartGoalMetric?: string | null;
      missingSmartGoalFields?: string[];
      feasibilityAnsweredCount?: number;
      feasibilityBottleneck?: string | null;
      goalCount?: number;
      goalsWithoutTwelveWeekPlan?: number;
      activeGoalTitle?: string | null;
      twelveWeekDraftSummary?: {
        leadIndicatorCount: number;
        hasReviewDay: boolean;
        hasWeek12Outcome: boolean;
        hasLagMetric: boolean;
        tacticLoadPreference: string | null;
        personalConstraint: string | null;
      };
    };
  };
  route: string;
}

export interface AssistantRequest {
  message: string;
  context: AssistantContext;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AssistantResponse {
  message: string;
}

export interface AssistantError {
  message: string;
  errorCode: string;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 6;
const MAX_HISTORY_CONTENT = 500;
const MAX_GOALS = 5;
const MAX_TASKS = 8;
const MAX_OVERDUE_TASKS = 5;
const MAX_MISSED_COMMITMENTS = 3;
const MAX_ROUTE_LENGTH = 80;
const MAX_TEXT_LENGTH = 200;
const MAX_DEADLINES = 3;
const MAX_STREAK_DAYS = 365;
const MAX_DAYS_UNTIL = 365;
const MAX_MISSING_FIELDS = 8;

export function validateAssistantRequest(request: unknown): {
  valid: boolean;
  error?: AssistantError;
} {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return {
      valid: false,
      error: { message: "Yêu cầu không hợp lệ.", errorCode: "ASSISTANT_INVALID_REQUEST" },
    };
  }

  const req = request as Record<string, unknown>;
  const message = typeof req.message === "string" ? req.message.trim() : "";

  if (!message) {
    return {
      valid: false,
      error: { message: "Tin nhắn không được để trống.", errorCode: "ASSISTANT_EMPTY_MESSAGE" },
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: {
        message: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).`,
        errorCode: "ASSISTANT_MESSAGE_TOO_LONG",
      },
    };
  }

  if (!req.context || typeof req.context !== "object" || Array.isArray(req.context)) {
    return {
      valid: false,
      error: { message: "Context không hợp lệ.", errorCode: "ASSISTANT_INVALID_CONTEXT" },
    };
  }

  // Validate history if provided
  if (req.history !== undefined && req.history !== null) {
    if (!Array.isArray(req.history)) {
      return {
        valid: false,
        error: { message: "Lịch sử chat không hợp lệ.", errorCode: "ASSISTANT_INVALID_HISTORY" },
      };
    }

    const invalidHistory = req.history.some((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return true;
      const historyItem = item as Record<string, unknown>;
      const role = historyItem.role;
      const content = historyItem.content;
      if (role !== "user" && role !== "assistant") return true;
      if (typeof content !== "string") return true;
      return false;
    });

    if (invalidHistory) {
      return {
        valid: false,
        error: { message: "Định dạng lịch sử chat không đúng.", errorCode: "ASSISTANT_INVALID_HISTORY" },
      };
    }
  }

  return { valid: true };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function nullableNumber(value: unknown, min: number, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, numeric));
}

function sanitizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function nullableText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  const text = sanitizeText(value, maxLength);
  return text || null;
}

export function sanitizeHistory(
  history: unknown,
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item): item is { role: unknown; content: unknown } =>
      item && typeof item === "object" && !Array.isArray(item) && "role" in item && "content" in item
    )
    .filter((item) => item.role === "user" || item.role === "assistant")
    .filter((item) => typeof item.content === "string" && item.content.trim())
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role as "user" | "assistant",
      content: sanitizeText(item.content, MAX_HISTORY_CONTENT),
    }));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function sanitizeContext(context: unknown): AssistantContext {
  const raw = record(context);

  const rawGoals = Array.isArray(raw.goals) ? raw.goals : [];
  const rawTasks = Array.isArray(raw.todayTasks) ? raw.todayTasks : [];
  const currentWeek = raw.currentWeek === null ? null : clampNumber(raw.currentWeek, 1, 52, 1);

  return {
    currentWeek,
    weeksTotal: clampNumber(raw.weeksTotal, 1, 52, 12),
    goals: rawGoals.slice(0, MAX_GOALS).map((goal) => {
      const g = record(goal);
      return {
        id: sanitizeText(g.id, 100),
        title: sanitizeText(g.title, MAX_TEXT_LENGTH),
        progress: clampNumber(g.progress, 0, 100, 0),
      };
    }),
    todayTasks: rawTasks.slice(0, MAX_TASKS).map((task) => {
      const t = record(task);
      return {
        id: sanitizeText(t.id, 100),
        title: sanitizeText(t.title, MAX_TEXT_LENGTH),
        done: t.done === true,
      };
    }),
    lastReflectionDate: typeof raw.lastReflectionDate === "string"
      ? raw.lastReflectionDate.trim().slice(0, 20)
      : null,
    route: sanitizeText(raw.route || "/", MAX_ROUTE_LENGTH) || "/",
    feasibility: sanitizeFeasibility(raw.feasibility),
    latestWeeklyReview: sanitizeLatestWeeklyReview(raw.latestWeeklyReview),
    stuckSignals: sanitizeStuckSignals(raw.stuckSignals),
    trend: sanitizeTrend(raw.trend),
    streak: sanitizeStreak(raw.streak),
    upcomingDeadlines: sanitizeUpcomingDeadlines(raw.upcomingDeadlines),
    pageContext: sanitizePageContext(raw.pageContext, sanitizeText(raw.route || "/", MAX_ROUTE_LENGTH) || "/"),
  };
}

function sanitizeFeasibility(value: unknown): AssistantContext["feasibility"] {
  const raw = record(value);
  if (Object.keys(raw).length === 0) return null;

  return {
    readinessScore: nullableNumber(raw.readinessScore, 0, 20),
    bottleneckLabel: nullableText(raw.bottleneckLabel),
    bottleneckAction: nullableText(raw.bottleneckAction),
  };
}

function sanitizeLatestWeeklyReview(value: unknown): AssistantContext["latestWeeklyReview"] {
  const raw = record(value);
  if (Object.keys(raw).length === 0) return null;

  return {
    weekNumber: clampNumber(raw.weekNumber, 1, 52, 1),
    leadCompletionPercent: nullableNumber(raw.leadCompletionPercent, 0, 100),
    mainObstacle: nullableText(raw.mainObstacle),
    nextWeekPriority: nullableText(raw.nextWeekPriority),
    workloadDecision: nullableText(raw.workloadDecision, 80),
    reviewedAt: nullableText(raw.reviewedAt, 40),
  };
}

function sanitizeStuckSignals(value: unknown): AssistantContext["stuckSignals"] {
  const raw = record(value);
  const rawMissedCommitments = Array.isArray(raw.missedCommitments) ? raw.missedCommitments : [];
  const rawOverdueTasks = Array.isArray(raw.overdueTasks) ? raw.overdueTasks : [];

  return {
    latestObstacle: nullableText(raw.latestObstacle),
    missedCommitments: rawMissedCommitments
      .slice(0, MAX_MISSED_COMMITMENTS)
      .map((item) => sanitizeText(item, MAX_TEXT_LENGTH))
      .filter(Boolean),
    overdueOpenCount: clampNumber(raw.overdueOpenCount, 0, 100, 0),
    overdueTasks: rawOverdueTasks.slice(0, MAX_OVERDUE_TASKS).map((task) => {
      const t = record(task);
      return {
        id: sanitizeText(t.id, 100),
        title: sanitizeText(t.title, MAX_TEXT_LENGTH),
        scheduledDate: sanitizeText(t.scheduledDate, 40),
        isCore: t.isCore === true,
      };
    }),
  };
}

function sanitizeTrend(value: unknown): AssistantContext["trend"] {
  const raw = record(value);
  const rawCompletions = Array.isArray(raw.completionLast4Weeks) ? raw.completionLast4Weeks : [];

  const direction =
    raw.direction === "up" || raw.direction === "down" || raw.direction === "flat"
      ? raw.direction
      : "unknown";

  return {
    completionLast4Weeks: rawCompletions.slice(0, 4).map((val) => clampNumber(val, 0, 100, 0)),
    direction: direction as "up" | "down" | "flat" | "unknown",
  };
}

function sanitizeStreak(value: unknown): AssistantContext["streak"] {
  const raw = record(value);
  return {
    daysWithCompletedTask: clampNumber(raw.daysWithCompletedTask, 0, MAX_STREAK_DAYS, 0),
  };
}

function sanitizeUpcomingDeadlines(value: unknown): AssistantContext["upcomingDeadlines"] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_DEADLINES)
    .map((item) => {
      const raw = record(item);
      return {
        goalId: sanitizeText(raw.goalId, 100),
        title: sanitizeText(raw.title, MAX_TEXT_LENGTH),
        daysUntil: clampNumber(raw.daysUntil, -MAX_DAYS_UNTIL, MAX_DAYS_UNTIL, 0),
      };
    })
    .slice(0, MAX_DEADLINES);
}

function sanitizePageContext(value: unknown, fallbackRoute: string): AssistantContext["pageContext"] {
  const raw = record(value);
  const route = sanitizeText(raw.route || fallbackRoute, MAX_ROUTE_LENGTH) || fallbackRoute;

  return {
    route,
    currentStep: nullableText(raw.currentStep, 80),
    nextSuggestedStep: nullableText(raw.nextSuggestedStep),
    formDraft: sanitizePageFormDraft(raw.formDraft),
  };
}

function sanitizePageFormDraft(value: unknown): AssistantContext["pageContext"]["formDraft"] {
  const raw = record(value);
  const draftSummary = record(raw.twelveWeekDraftSummary);
  const rawMissingFields = Array.isArray(raw.missingSmartGoalFields) ? raw.missingSmartGoalFields : [];

  return {
    focusArea: nullableText(raw.focusArea),
    smartGoalTitle: nullableText(raw.smartGoalTitle),
    smartGoalMetric: nullableText(raw.smartGoalMetric),
    missingSmartGoalFields: rawMissingFields
      .slice(0, MAX_MISSING_FIELDS)
      .map((item) => sanitizeText(item, 80))
      .filter(Boolean),
    feasibilityAnsweredCount: clampNumber(raw.feasibilityAnsweredCount, 0, 50, 0),
    feasibilityBottleneck: nullableText(raw.feasibilityBottleneck),
    goalCount: clampNumber(raw.goalCount, 0, 100, 0),
    goalsWithoutTwelveWeekPlan: clampNumber(raw.goalsWithoutTwelveWeekPlan, 0, 100, 0),
    activeGoalTitle: nullableText(raw.activeGoalTitle),
    twelveWeekDraftSummary: Object.keys(draftSummary).length === 0
      ? undefined
      : {
        leadIndicatorCount: clampNumber(draftSummary.leadIndicatorCount, 0, 20, 0),
        hasReviewDay: draftSummary.hasReviewDay === true,
        hasWeek12Outcome: draftSummary.hasWeek12Outcome === true,
        hasLagMetric: draftSummary.hasLagMetric === true,
        tacticLoadPreference: nullableText(draftSummary.tacticLoadPreference, 80),
        personalConstraint: nullableText(draftSummary.personalConstraint),
      },
  };
}

export async function processAssistantRequest(
  request: AssistantRequest,
): Promise<AssistantResponse | AssistantError> {
  const sanitizedContext = sanitizeContext(request.context);
  const sanitizedHistory = sanitizeHistory(request.history);
  const result = env.ASSISTANT_PROVIDER === "gemini"
    ? await sendToGemini(request.message.trim(), sanitizedContext, sanitizedHistory)
    : await sendToGroq(request.message.trim(), sanitizedContext, sanitizedHistory);

  if ("errorCode" in result) {
    return result;
  }

  return { message: result.message };
}

export async function processAssistantRequestStream(
  request: AssistantRequest,
  onDelta: (text: string) => void,
): Promise<void | AssistantError> {
  const sanitizedContext = sanitizeContext(request.context);
  const sanitizedHistory = sanitizeHistory(request.history);

  if (env.ASSISTANT_PROVIDER === "gemini") {
    // Gemini stream not implemented yet - fallback to non-streaming
    const result = await sendToGemini(request.message.trim(), sanitizedContext, sanitizedHistory);
    if ("errorCode" in result) {
      return result;
    }
    onDelta(result.message);
    return;
  }

  // Groq streaming
  try {
    await sendToGroqStream(
      request.message.trim(),
      sanitizedContext,
      sanitizedHistory,
      onDelta,
    );
  } catch (error) {
    if (error && typeof error === "object" && "errorCode" in error) {
      return error as AssistantError;
    }
    return {
      message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_ERROR",
    };
  }
}
