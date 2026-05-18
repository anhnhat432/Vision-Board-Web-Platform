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
const MAX_ROUTE_LENGTH = 80;

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

function sanitizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function sanitizeContext(context: unknown): AssistantContext {
  const raw = context && typeof context === "object" && !Array.isArray(context)
    ? context as Record<string, unknown>
    : {};

  const rawGoals = Array.isArray(raw.goals) ? raw.goals : [];
  const rawTasks = Array.isArray(raw.todayTasks) ? raw.todayTasks : [];
  const currentWeek = raw.currentWeek === null ? null : clampNumber(raw.currentWeek, 1, 52, 1);

  return {
    currentWeek,
    weeksTotal: clampNumber(raw.weeksTotal, 1, 52, 12),
    goals: rawGoals.slice(0, MAX_GOALS).map((goal) => {
      const g = goal && typeof goal === "object" ? goal as Record<string, unknown> : {};
      return {
        id: sanitizeText(g.id, 100),
        title: sanitizeText(g.title, 200),
        progress: clampNumber(g.progress, 0, 100, 0),
      };
    }),
    todayTasks: rawTasks.slice(0, MAX_TASKS).map((task) => {
      const t = task && typeof task === "object" ? task as Record<string, unknown> : {};
      return {
        id: sanitizeText(t.id, 100),
        title: sanitizeText(t.title, 200),
        done: t.done === true,
      };
    }),
    lastReflectionDate: typeof raw.lastReflectionDate === "string"
      ? raw.lastReflectionDate.trim().slice(0, 20)
      : null,
    route: sanitizeText(raw.route || "/", MAX_ROUTE_LENGTH) || "/",
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
