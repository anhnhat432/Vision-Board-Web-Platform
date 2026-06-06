import { redactSensitive } from "@shared/assistantRedaction";
import type { AssistantContext } from "./buildAssistantContext";
import type { SanitizedAssistantContext } from "./sanitizeContext";
import { sanitizeAssistantContext } from "./sanitizeContext";
import type { FeedbackEntry, FeedbackReason } from "./types";

export const ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY = "assistant.golden_examples";

export type AssistantFeedbackRating = "helpful" | "not_helpful";

interface AssistantActionExecutionFeedback {
  actionType: string;
  success: boolean;
  message: string;
}

export interface AssistantGoldenExample {
  id: string;
  userId: string | null;
  route: string;
  rating: AssistantFeedbackRating;
  createdAt: string;
  userMessage: string;
  assistantMessage: string;
  context: SanitizedAssistantContext | null;
  reason?: FeedbackReason;
  correction?: string;
  expectedActionType?: string;
  expectedTaskTitle?: string;
  actionExecution?: AssistantActionExecutionFeedback;
}

interface CaptureAssistantFeedbackInput {
  userId: string | null;
  route: string;
  rating: AssistantFeedbackRating;
  userMessage: string;
  assistantMessage: string;
  context: (AssistantContext & { route: string }) | null;
  reason?: FeedbackReason;
  correction?: string;
  expectedActionType?: string;
  expectedTaskTitle?: string;
  actionExecution?: AssistantActionExecutionFeedback;
}

const MAX_RECORDS = 200;
const MAX_MESSAGE_LENGTH = 2000;
const LEGACY_FEEDBACK_STORAGE_KEY = "assistant.feedback";
const FEEDBACK_STORAGE_PREFIX = "assistant.feedback:";
const FEEDBACK_MAP_STORAGE_PREFIX = "assistant.feedback.map:";

export function getAssistantGoldenExamples(): AssistantGoldenExample[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeRecord)
      .filter((record): record is AssistantGoldenExample => record !== null)
      .slice(-MAX_RECORDS);
  } catch {
    return [];
  }
}

export function captureAssistantFeedback(input: CaptureAssistantFeedbackInput): AssistantGoldenExample {
  const record: AssistantGoldenExample = {
    id: createFeedbackId(),
    userId: boundedText(input.userId, 120) || null,
    route: boundedText(input.route, 80) || "/",
    rating: input.rating,
    createdAt: new Date().toISOString(),
    userMessage: boundedText(input.userMessage, MAX_MESSAGE_LENGTH),
    assistantMessage: boundedText(input.assistantMessage, MAX_MESSAGE_LENGTH),
    context: input.context ? sanitizeAssistantContext(input.context) : null,
    reason: sanitizeFeedbackReason(input.reason),
    correction: input.correction ? boundedText(input.correction, 300) : undefined,
    expectedActionType: input.expectedActionType ? boundedText(input.expectedActionType, 80) : undefined,
    expectedTaskTitle: input.expectedTaskTitle ? boundedText(input.expectedTaskTitle, 150) : undefined,
    actionExecution: sanitizeActionExecution(input.actionExecution),
  };

  if (typeof localStorage === "undefined") return record;

  try {
    const nextRecords = [...getAssistantGoldenExamples(), record].slice(-MAX_RECORDS);
    localStorage.setItem(ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {}

  return record;
}

function normalizeRecord(value: unknown): AssistantGoldenExample | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Partial<AssistantGoldenExample>;
  if (raw.rating !== "helpful" && raw.rating !== "not_helpful") return null;

  return {
    id: boundedText(raw.id, 120) || createFeedbackId(),
    userId: boundedText(raw.userId, 120) || null,
    route: boundedText(raw.route, 80) || "/",
    rating: raw.rating,
    createdAt: boundedText(raw.createdAt, 40) || new Date(0).toISOString(),
    userMessage: boundedText(raw.userMessage, MAX_MESSAGE_LENGTH),
    assistantMessage: boundedText(raw.assistantMessage, MAX_MESSAGE_LENGTH),
    context: sanitizeStoredContext(raw.context),
    reason: sanitizeFeedbackReason(raw.reason),
    correction: raw.correction ? boundedText(raw.correction, 300) : undefined,
    expectedActionType: raw.expectedActionType ? boundedText(raw.expectedActionType, 80) : undefined,
    expectedTaskTitle: raw.expectedTaskTitle ? boundedText(raw.expectedTaskTitle, 150) : undefined,
    actionExecution: sanitizeActionExecution(raw.actionExecution),
  };
}

function boundedText(value: unknown, maxLength: number): string {
  return redactSensitive(String(value ?? ""))
    .trim()
    .slice(0, maxLength);
}

function sanitizeStoredContext(value: unknown): SanitizedAssistantContext | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SanitizedAssistantContext) : null;
}

function isFeedbackReason(value: unknown): value is FeedbackReason {
  return (
    value === "wrong_action" ||
    value === "wrong_context" ||
    value === "too_long" ||
    value === "too_generic" ||
    value === "unsafe" ||
    value === "other"
  );
}

function sanitizeFeedbackReason(value: unknown): FeedbackReason | undefined {
  return isFeedbackReason(value) ? value : undefined;
}

function sanitizeActionExecution(value: unknown): AssistantActionExecutionFeedback | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const raw = value as Record<string, unknown>;
  if (typeof raw.success !== "boolean") return undefined;

  const actionType = boundedText(raw.actionType, 80);
  if (!actionType) return undefined;

  return {
    actionType,
    success: raw.success,
    message: boundedText(raw.message, 300),
  };
}

function redactStructuredValue(value: unknown): unknown {
  if (typeof value === "string") return boundedText(value, MAX_MESSAGE_LENGTH);
  if (Array.isArray(value)) return value.map(redactStructuredValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [boundedText(key, 120), redactStructuredValue(item)]),
  );
}

function createFeedbackId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `assistant_feedback_${Date.now()}_${suffix}`;
}

function normalizeFeedbackEntry(value: unknown): FeedbackEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Partial<FeedbackEntry>;
  if (raw.rating !== "up" && raw.rating !== "down") return null;

  const messageId = boundedText(raw.messageId, 120);
  if (!messageId) return null;

  return {
    messageId,
    userText: boundedText(raw.userText, MAX_MESSAGE_LENGTH),
    replyText: boundedText(raw.replyText, MAX_MESSAGE_LENGTH),
    rating: raw.rating,
    timestamp: typeof raw.timestamp === "number" && Number.isFinite(raw.timestamp) ? raw.timestamp : 0,
    route: raw.route ? boundedText(raw.route, 80) : undefined,
    reason: sanitizeFeedbackReason(raw.reason),
    correction: raw.correction ? boundedText(raw.correction, 300) : undefined,
    expectedActionType: raw.expectedActionType ? boundedText(raw.expectedActionType, 80) : undefined,
    expectedTaskTitle: raw.expectedTaskTitle ? boundedText(raw.expectedTaskTitle, 150) : undefined,
    actionExecution: sanitizeActionExecution(raw.actionExecution),
  };
}

function readFeedbackEntriesForKey(key: string): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeFeedbackEntry)
      .filter((entry): entry is FeedbackEntry => entry !== null)
      .slice(-MAX_RECORDS);
  } catch {
    return [];
  }
}

function readAllFeedbackEntries(): FeedbackEntry[] {
  if (typeof localStorage === "undefined") return [];

  const keys = new Set<string>();
  if (localStorage.getItem(LEGACY_FEEDBACK_STORAGE_KEY)) {
    keys.add(LEGACY_FEEDBACK_STORAGE_KEY);
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (!key.startsWith(FEEDBACK_STORAGE_PREFIX)) continue;
    if (key.startsWith(FEEDBACK_MAP_STORAGE_PREFIX)) continue;
    keys.add(key);
  }

  return [...keys].flatMap(readFeedbackEntriesForKey).slice(-MAX_RECORDS);
}

function getRecordTime(record: { createdAt?: string; timestamp?: number }): number {
  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) return record.timestamp;
  const parsed = Date.parse(record.createdAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapGoldenExampleForExport(entry: AssistantGoldenExample) {
  return {
    source: "golden_example" as const,
    id: entry.id,
    userId: entry.userId,
    route: entry.route,
    rating: entry.rating,
    createdAt: entry.createdAt,
    userMessage: boundedText(entry.userMessage, MAX_MESSAGE_LENGTH),
    assistantMessage: boundedText(entry.assistantMessage, MAX_MESSAGE_LENGTH),
    context: redactStructuredValue(entry.context),
    reason: entry.reason,
    correction: entry.correction,
    expectedActionType: entry.expectedActionType,
    expectedTaskTitle: entry.expectedTaskTitle,
    actionExecution: entry.actionExecution,
  };
}

function mapFeedbackEntryForExport(entry: FeedbackEntry) {
  return {
    source: "feedback_entry" as const,
    messageId: entry.messageId,
    userText: boundedText(entry.userText, MAX_MESSAGE_LENGTH),
    replyText: boundedText(entry.replyText, MAX_MESSAGE_LENGTH),
    rating: entry.rating,
    timestamp: entry.timestamp,
    route: entry.route,
    reason: entry.reason,
    correction: entry.correction,
    expectedActionType: entry.expectedActionType,
    expectedTaskTitle: entry.expectedTaskTitle,
    actionExecution: entry.actionExecution,
  };
}

export function exportAssistantFeedbackDataset(): string {
  if (typeof localStorage === "undefined") return "[]";

  try {
    const dataset = [
      ...getAssistantGoldenExamples().map(mapGoldenExampleForExport),
      ...readAllFeedbackEntries().map(mapFeedbackEntryForExport),
    ]
      .sort((left, right) => getRecordTime(left) - getRecordTime(right))
      .slice(-MAX_RECORDS);

    return JSON.stringify(dataset, null, 2);
  } catch {
    return "[]";
  }
}
