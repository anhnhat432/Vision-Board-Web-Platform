import type { AssistantContext } from "./buildAssistantContext";
import type { SanitizedAssistantContext } from "./sanitizeContext";
import { sanitizeAssistantContext } from "./sanitizeContext";

export const ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY = "assistant.golden_examples";

export type AssistantFeedbackRating = "helpful" | "not_helpful";

export interface AssistantGoldenExample {
  id: string;
  userId: string | null;
  route: string;
  rating: AssistantFeedbackRating;
  createdAt: string;
  userMessage: string;
  assistantMessage: string;
  context: SanitizedAssistantContext | null;
}

interface CaptureAssistantFeedbackInput {
  userId: string | null;
  route: string;
  rating: AssistantFeedbackRating;
  userMessage: string;
  assistantMessage: string;
  context: (AssistantContext & { route: string }) | null;
}

const MAX_RECORDS = 200;
const MAX_MESSAGE_LENGTH = 2000;

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
    context: raw.context ?? null,
  };
}

function boundedText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function createFeedbackId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `assistant_feedback_${Date.now()}_${suffix}`;
}
