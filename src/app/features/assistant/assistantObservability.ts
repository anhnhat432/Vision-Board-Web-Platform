export type AssistantEventType =
  | "assistant_message_sent"
  | "assistant_message_received"
  | "assistant_action_proposed"
  | "assistant_action_executed"
  | "assistant_action_verified"
  | "assistant_action_failed"
  | "assistant_clarification_created"
  | "assistant_clarification_resolved"
  | "assistant_workflow_created"
  | "assistant_workflow_confirmed"
  | "assistant_workflow_completed"
  | "assistant_workflow_failed"
  | "assistant_memory_captured"
  | "assistant_nudge_shown"
  | "assistant_nudge_dismissed"
  | "assistant_feedback_submitted";

export interface AssistantEvent {
  id: string;
  type: AssistantEventType;
  createdAt: string;
  userId: string;
  sessionId: string;
  route: string;
  messageId?: string;
  actionType?: string;
  workflowType?: string;
  nudgeType?: string;
  success?: boolean;
  latencyMs?: number;
  errorCode?: string;
  metadata?: AssistantEventMetadata;
}

export type AssistantEventMetadataValue =
  | string
  | number
  | boolean
  | null
  | AssistantEventMetadataValue[]
  | { [key: string]: AssistantEventMetadataValue };

export type AssistantEventMetadata = Record<string, AssistantEventMetadataValue>;

export interface AssistantMetrics {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  actionsProposed: number;
  actionsExecuted: number;
  actionsFailed: number;
  actionSuccessRate: number; // percentage (0-100)
  clarificationsCount: number;
  workflowsConfirmed: number;
  workflowsCompleted: number;
  workflowsFailed: number;
  nudgesShown: number;
  nudgesDismissed: number;
  feedbackHelpful: number;
  feedbackNotHelpful: number;
}

const STORAGE_PREFIX = "assistant.observability";
const MAX_EVENTS_LIMIT = 500;

// Session ID logic (keeps a single session ID per browser session)
let currentSessionId = "";
export function getSessionId(): string {
  if (currentSessionId) return currentSessionId;
  if (typeof sessionStorage !== "undefined") {
    try {
      let id = sessionStorage.getItem("assistant.session_id");
      if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem("assistant.session_id", id);
      }
      currentSessionId = id;
      return id;
    } catch {
      // Fallback if sessionStorage is not available
    }
  }
  currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return currentSessionId;
}

function getStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function redactSensitive(value: string): string {
  return value
    .replace(/[\w-]{24,}/g, "[REDACTED]")
    .replace(
      /(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)\s*[:=]\s*[^\s,]+/gi,
      "$1: [REDACTED]",
    )
    .replace(
      /\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)[\w-]*\b/gi,
      "[REDACTED]",
    );
}

function sanitizeRecord(record: Record<string, unknown>): AssistantEventMetadata {
  const sanitizedObj: AssistantEventMetadata = {};
  for (const key of Object.keys(record).slice(0, 15)) {
    const sanitizedKey = redactSensitive(key).slice(0, 100);
    sanitizedObj[sanitizedKey] = sanitizeValue(record[key]);
  }
  return sanitizedObj;
}

function sanitizeValue(val: unknown): AssistantEventMetadataValue {
  if (typeof val === "string") {
    // Redact sensitive text and limit length to 200 chars to avoid storing raw long chat
    return redactSensitive(val).slice(0, 200);
  }
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === "boolean" || val === null) {
    return val;
  }
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      return val.slice(0, 10).map(sanitizeValue);
    }
    return sanitizeRecord(val as Record<string, unknown>);
  }
  return null;
}

export function recordAssistantEvent(input: {
  type: AssistantEventType;
  userId: string | null;
  route?: string;
  messageId?: string;
  actionType?: string;
  workflowType?: string;
  nudgeType?: string;
  success?: boolean;
  latencyMs?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}): void {
  if (typeof localStorage === "undefined") return;

  const resolvedUserId = input.userId ?? "anon";
  const key = getStorageKey(resolvedUserId);
  const route = input.route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const sessionId = getSessionId();

  // Sanitize metadata
  const sanitizedMetadata = input.metadata ? sanitizeRecord(input.metadata) : undefined;

  const newEvent: AssistantEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    createdAt: new Date().toISOString(),
    userId: resolvedUserId,
    sessionId,
    route,
    messageId: input.messageId,
    actionType: input.actionType,
    workflowType: input.workflowType,
    nudgeType: input.nudgeType,
    success: input.success,
    latencyMs: input.latencyMs,
    errorCode: input.errorCode,
    metadata: sanitizedMetadata,
  };

  try {
    const raw = localStorage.getItem(key);
    const events: AssistantEvent[] = raw ? JSON.parse(raw) : [];

    // Add to beginning of array
    events.unshift(newEvent);

    // Limit to 500 events
    const capped = events.slice(0, MAX_EVENTS_LIMIT);

    localStorage.setItem(key, JSON.stringify(capped));
  } catch {
    // Avoid crashing if localStorage is full or disabled
  }
}

export function getAssistantEvents(userId: string | null): AssistantEvent[] {
  if (typeof localStorage === "undefined") return [];
  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAssistantEvents(userId: string | null): void {
  if (typeof localStorage === "undefined") return;
  const key = getStorageKey(userId);
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function summarizeAssistantMetrics(userId: string | null): AssistantMetrics {
  const events = getAssistantEvents(userId);

  let totalMessagesSent = 0;
  let totalMessagesReceived = 0;
  let actionsProposed = 0;
  let actionsExecuted = 0;
  let actionsFailed = 0;
  let actionsSuccessCount = 0;
  let clarificationsCount = 0;
  let workflowsConfirmed = 0;
  let workflowsCompleted = 0;
  let workflowsFailed = 0;
  let nudgesShown = 0;
  let nudgesDismissed = 0;
  let feedbackHelpful = 0;
  let feedbackNotHelpful = 0;

  for (const ev of events) {
    switch (ev.type) {
      case "assistant_message_sent":
        totalMessagesSent++;
        break;
      case "assistant_message_received":
        totalMessagesReceived++;
        break;
      case "assistant_action_proposed":
        actionsProposed++;
        break;
      case "assistant_action_executed":
        actionsExecuted++;
        break;
      case "assistant_action_verified":
        actionsSuccessCount++;
        break;
      case "assistant_action_failed":
        actionsFailed++;
        break;
      case "assistant_clarification_created":
        clarificationsCount++;
        break;
      case "assistant_workflow_confirmed":
        workflowsConfirmed++;
        break;
      case "assistant_workflow_completed":
        workflowsCompleted++;
        break;
      case "assistant_workflow_failed":
        workflowsFailed++;
        break;
      case "assistant_nudge_shown":
        nudgesShown++;
        break;
      case "assistant_nudge_dismissed":
        nudgesDismissed++;
        break;
      case "assistant_feedback_submitted":
        if (ev.metadata?.rating === "up") {
          feedbackHelpful++;
        } else if (ev.metadata?.rating === "down") {
          feedbackNotHelpful++;
        }
        break;
    }
  }

  const successRate = actionsExecuted > 0 ? Math.round((actionsSuccessCount / actionsExecuted) * 100) : 100;

  return {
    totalMessagesSent,
    totalMessagesReceived,
    actionsProposed,
    actionsExecuted,
    actionsFailed,
    actionSuccessRate: successRate,
    clarificationsCount,
    workflowsConfirmed,
    workflowsCompleted,
    workflowsFailed,
    nudgesShown,
    nudgesDismissed,
    feedbackHelpful,
    feedbackNotHelpful,
  };
}

export function exportAssistantEvents(userId: string | null): string {
  const events = getAssistantEvents(userId);
  try {
    return JSON.stringify(events, null, 2);
  } catch {
    return "[]";
  }
}
