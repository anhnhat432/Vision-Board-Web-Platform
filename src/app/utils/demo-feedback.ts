import { type AnalyticsSource, trackAnalyticsEvent } from "./analytics";
import { DEMO_FEEDBACK_STORAGE_KEY } from "./storage-constants";

export type DemoFeedbackRating = 1 | 2 | 3 | 4 | 5;

export type DemoFeedbackContext = "dashboard" | "12_week_settings";

export type DemoFeedbackCategory =
  | "core_flow"
  | "life_balance"
  | "smart_goal"
  | "twelve_week_setup"
  | "today_tasks"
  | "weekly_review"
  | "mock_billing"
  | "local_data"
  | "other";

export interface DemoFeedbackInput {
  source: Extract<AnalyticsSource, "dashboard" | "settings" | "12_week_system">;
  context: DemoFeedbackContext;
  rating: DemoFeedbackRating;
  feedbackCategory: DemoFeedbackCategory;
  confusingText: string;
  nextHelpText?: string;
}

export interface DemoFeedbackRecord extends DemoFeedbackInput {
  id: string;
  createdAt: string;
  confusingTextLength: number;
  nextHelpTextLength: number;
}

export interface DemoFeedbackSubmitResult {
  record: DemoFeedbackRecord;
  savedLocally: boolean;
  trackedSafely: boolean;
}

const MAX_FEEDBACK_RECORDS = 50;
const MAX_FEEDBACK_TEXT_LENGTH = 500;

function createFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeDemoFeedbackText(value: string): string {
  return value
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FEEDBACK_TEXT_LENGTH);
}

function readStoredFeedback(): DemoFeedbackRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DEMO_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter(Boolean) as DemoFeedbackRecord[]) : [];
  } catch {
    return [];
  }
}

function persistFeedbackRecord(record: DemoFeedbackRecord): boolean {
  if (typeof window === "undefined") return false;

  try {
    const nextRecords = [record, ...readStoredFeedback()].slice(0, MAX_FEEDBACK_RECORDS);
    window.localStorage.setItem(DEMO_FEEDBACK_STORAGE_KEY, JSON.stringify(nextRecords));
    return true;
  } catch {
    return false;
  }
}

export function getLocalDemoFeedback(): DemoFeedbackRecord[] {
  return readStoredFeedback();
}

export function formatDemoFeedbackForCopy(record: DemoFeedbackRecord): string {
  return [
    `Rating: ${record.rating}/5`,
    `Category: ${record.feedbackCategory}`,
    `Confusing: ${record.confusingText}`,
    record.nextHelpText ? `Next help: ${record.nextHelpText}` : null,
    `Source: ${record.source}`,
    `Saved at: ${record.createdAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function submitDemoFeedback(input: DemoFeedbackInput): DemoFeedbackSubmitResult {
  const confusingText = sanitizeDemoFeedbackText(input.confusingText);
  const nextHelpText = sanitizeDemoFeedbackText(input.nextHelpText ?? "");
  const record: DemoFeedbackRecord = {
    ...input,
    id: createFeedbackId(),
    createdAt: new Date().toISOString(),
    confusingText,
    nextHelpText,
    confusingTextLength: confusingText.length,
    nextHelpTextLength: nextHelpText.length,
  };

  const savedLocally = persistFeedbackRecord(record);
  let trackedSafely = true;

  try {
    trackAnalyticsEvent(
      "feedback_submitted",
      {
        source: input.source,
        context: input.context,
        rating: input.rating,
        feedback_category: input.feedbackCategory,
        confusing_text_length: record.confusingTextLength,
        next_help_text_length: record.nextHelpTextLength,
        has_next_help_text: record.nextHelpTextLength > 0,
      },
      {
        area: input.context === "12_week_settings" ? "12_week" : "core_funnel",
        legacyEventName: "demo_feedback_submitted",
      },
    );
  } catch {
    trackedSafely = false;
  }

  return { record, savedLocally, trackedSafely };
}
