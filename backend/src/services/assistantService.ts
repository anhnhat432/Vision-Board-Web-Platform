import { sendToGemini } from "./geminiAssistantProvider";

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
  route: string;
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
}

export interface AssistantRequest {
  message: string;
  context: AssistantContext;
}

export interface AssistantResponse {
  message: string;
}

export interface AssistantError {
  message: string;
  errorCode: string;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_GOALS = 5;
const MAX_TASKS = 8;
const MAX_OVERDUE_TASKS = 5;
const MAX_MISSED_COMMITMENTS = 3;
const MAX_ROUTE_LENGTH = 80;
const MAX_TEXT_LENGTH = 200;

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

export async function processAssistantRequest(
  request: AssistantRequest,
): Promise<AssistantResponse | AssistantError> {
  const sanitizedContext = sanitizeContext(request.context);
  const result = await sendToGemini(request.message.trim(), sanitizedContext);

  if ("errorCode" in result) {
    return result;
  }

  return { message: result.message };
}
