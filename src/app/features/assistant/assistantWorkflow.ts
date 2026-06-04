import type { AssistantAction } from "./parseActions";

export type AssistantWorkflowType =
  | "create_goal_workflow"
  | "create_task_workflow"
  | "create_12_week_plan_workflow"
  | "weekly_review_workflow"
  | "reflection_workflow";

export type AssistantWorkflowStatus =
  | "draft"
  | "needs_clarification"
  | "ready_for_confirmation"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowExecutionResult {
  actionId: string;
  status: "success" | "failed" | "alreadyDone";
  message: string;
}

export interface AssistantWorkflow {
  id: string;
  type: AssistantWorkflowType;
  status: AssistantWorkflowStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // 30 minutes TTL
  userId: string | null;
  summary: string;
  missingFields: string[];
  proposedActions: AssistantAction[];
  executionResults: WorkflowExecutionResult[];
  sourceUserText: string;
  metadata?: Record<string, unknown>;
}

const VALID_WORKFLOW_TYPES = new Set<AssistantWorkflowType>([
  "create_goal_workflow",
  "create_task_workflow",
  "create_12_week_plan_workflow",
  "weekly_review_workflow",
  "reflection_workflow",
]);

const VALID_WORKFLOW_STATUS = new Set<AssistantWorkflowStatus>([
  "draft",
  "needs_clarification",
  "ready_for_confirmation",
  "executing",
  "completed",
  "failed",
  "cancelled",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isWorkflowType(value: unknown): value is AssistantWorkflowType {
  return typeof value === "string" && VALID_WORKFLOW_TYPES.has(value as AssistantWorkflowType);
}

function isWorkflowStatus(value: unknown): value is AssistantWorkflowStatus {
  return typeof value === "string" && VALID_WORKFLOW_STATUS.has(value as AssistantWorkflowStatus);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 20)) {
    const safeKey = sanitizeText(key, 80);
    if (!safeKey) continue;
    if (typeof item === "string") {
      sanitized[safeKey] = sanitizeText(item, 300);
    } else if (typeof item === "number" || typeof item === "boolean" || item === null) {
      sanitized[safeKey] = item;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeActionPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 30)) {
    const safeKey = sanitizeText(key, 80);
    if (!safeKey) continue;
    if (typeof item === "string") sanitized[safeKey] = sanitizeText(item, 300);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) sanitized[safeKey] = item;
    else if (Array.isArray(item)) {
      sanitized[safeKey] = item.slice(0, 10).map((nested) => {
        if (!isRecord(nested)) return typeof nested === "string" ? sanitizeText(nested, 200) : nested;
        const nestedRecord: Record<string, unknown> = {};
        for (const [nestedKey, nestedValue] of Object.entries(nested).slice(0, 10)) {
          const safeNestedKey = sanitizeText(nestedKey, 80);
          if (!safeNestedKey) continue;
          if (typeof nestedValue === "string") nestedRecord[safeNestedKey] = sanitizeText(nestedValue, 200);
          else if (typeof nestedValue === "number" || typeof nestedValue === "boolean" || nestedValue === null) {
            nestedRecord[safeNestedKey] = nestedValue;
          }
        }
        return nestedRecord;
      });
    }
  }
  return sanitized;
}

function sanitizeProposedAction(value: unknown): AssistantAction | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (typeof type !== "string") return null;
  const id = sanitizeText(value.id, 100);
  const label = sanitizeText(value.label, 200);
  if (!id || !label) return null;
  return {
    id,
    type: type as AssistantAction["type"],
    label,
    payload: sanitizeActionPayload(value.payload),
    autoExecute: value.autoExecute === true,
  };
}

const STORAGE_PREFIX = "assistant.pending_workflow";
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function redactSensitive(text: string): string {
  return text
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

function sanitizeText(value: unknown, maxLength: number): string {
  return redactSensitive(String(value ?? "").trim()).slice(0, maxLength);
}

export function isWorkflowExpired(workflow: AssistantWorkflow, referenceDate = new Date()): boolean {
  if (!workflow.expiresAt) return true;
  return Date.parse(workflow.expiresAt) <= referenceDate.getTime();
}

export function normalizeWorkflow(value: unknown): AssistantWorkflow | null {
  if (!isRecord(value)) return null;
  const raw: Record<string, unknown> = value;

  const type = raw.type;
  if (!isWorkflowType(type)) return null;

  const status = raw.status;
  if (!isWorkflowStatus(status)) return null;

  const id = sanitizeText(raw.id, 100);
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : "";
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : "";
  const expiresAt = typeof raw.expiresAt === "string" ? raw.expiresAt : "";

  if (!id || !createdAt || !updatedAt || !expiresAt) return null;

  const summary = sanitizeText(raw.summary, 1000);
  const missingFields = Array.isArray(raw.missingFields)
    ? raw.missingFields.map((item) => sanitizeText(item, 100))
    : [];

  const proposedActions = Array.isArray(raw.proposedActions)
    ? raw.proposedActions.map(sanitizeProposedAction).filter((action): action is AssistantAction => action !== null)
    : [];
  const executionResults = Array.isArray(raw.executionResults)
    ? raw.executionResults.map((item): WorkflowExecutionResult => {
        const result = isRecord(item) ? item : {};
        return {
          actionId: sanitizeText(result.actionId, 100),
          status:
            result.status === "success" || result.status === "failed" || result.status === "alreadyDone"
              ? result.status
              : "failed",
          message: sanitizeText(result.message, 1000),
        };
      })
    : [];

  const sourceUserText = sanitizeText(raw.sourceUserText, 1000);

  return {
    id,
    type,
    status,
    createdAt,
    updatedAt,
    expiresAt,
    userId: raw.userId ? sanitizeText(raw.userId, 100) : null,
    summary,
    missingFields,
    proposedActions,
    executionResults,
    sourceUserText,
    metadata: sanitizeMetadata(raw.metadata),
  };
}

export function getPendingWorkflow(
  userId: string | null,
  referenceDate = new Date(),
  ignoreExpiration = false,
): AssistantWorkflow | null {
  if (typeof localStorage === "undefined") return null;
  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const workflow = normalizeWorkflow(JSON.parse(raw));
    if (!workflow) {
      localStorage.removeItem(key);
      return null;
    }

    if (!ignoreExpiration && isWorkflowExpired(workflow, referenceDate)) {
      localStorage.removeItem(key);
      return null;
    }

    return workflow;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function setPendingWorkflow(userId: string | null, workflow: AssistantWorkflow): void {
  if (typeof localStorage === "undefined") return;
  const normalized = normalizeWorkflow(workflow);
  if (!normalized) return;

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
  } catch {}
}

export function clearPendingWorkflow(userId: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {}
}

export function isConfirmReply(reply: string): boolean {
  const normalized = reply
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .trim();

  if (/\b(khong|chua|huy|thoi|bo|bo qua|cancel)\b/.test(normalized)) {
    return false;
  }

  // Xác nhận bằng các câu như: “ok tạo đi”, “xác nhận”, “làm đi”, “đồng ý”, "ok", "yes"
  return (
    /^(ok|okay|yes|dong y|xac nhan|lam di|chay di|tao di|thuc hien|dung roi|chuan|confirm|luu di|luu)$/.test(
      normalized,
    ) || /\b(dong y|xac nhan|lam di|tao di|confirm|chay di|thuc hien)\b/.test(normalized)
  );
}

export function isCancelReply(reply: string): boolean {
  const normalized = reply
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .trim();

  return (
    /^(huy|thoi|bo qua|cancel|khong can|bo di|huy di)$/.test(normalized) ||
    /\b(huy|bo qua|bo di|cancel)\b/.test(normalized)
  );
}

export function createWorkflow(input: {
  type: AssistantWorkflowType;
  userId: string | null;
  summary: string;
  sourceUserText: string;
  missingFields?: string[];
  proposedActions?: AssistantAction[];
  metadata?: Record<string, unknown>;
  now?: Date;
}): AssistantWorkflow {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MS).toISOString();

  return {
    id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    status: input.missingFields && input.missingFields.length > 0 ? "needs_clarification" : "ready_for_confirmation",
    createdAt,
    updatedAt: createdAt,
    expiresAt,
    userId: input.userId,
    summary: input.summary,
    missingFields: input.missingFields || [],
    proposedActions: input.proposedActions || [],
    executionResults: [],
    sourceUserText: input.sourceUserText,
    metadata: input.metadata,
  };
}
