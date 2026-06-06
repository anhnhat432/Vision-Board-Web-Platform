import type { AssistantGoldenExample } from "../assistantFeedback";
import type { FeedbackReason } from "../types";
import type { AssistantEvalCase, EvalCategory, EvalRoute } from "./assistantEvalCases";

export const DEFAULT_FEEDBACK_EVAL_REASONS: FeedbackReason[] = ["wrong_context", "wrong_action"];

export interface FeedbackToEvalOptions {
  reasons?: FeedbackReason[];
  maxCases?: number;
  requireUserMessage?: boolean;
  idPrefix?: string;
}

const DEFAULT_MAX_CASES = 50;
const MAX_INPUT_LENGTH = 600;

function redactSensitiveText(value: string): string {
  return value
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL_REDACTED]")
    .replace(
      /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|token|secret|password|private[_\s-]?key)\b\s*[:=]\s*["']?[^"'\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)[\w-]*\b/gi,
      "[REDACTED]",
    )
    .replace(/[\w-]{32,}/g, "[REDACTED]");
}

function boundedInput(value: string): string {
  return redactSensitiveText(String(value ?? ""))
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}

type EvalExpected = AssistantEvalCase["expected"];
type EvalContext = AssistantEvalCase["context"];

/** G5: map route string của feedback về EvalRoute core flow để báo cáo theo màn hình. */
function mapFeedbackRouteToEvalRoute(route: string | undefined): EvalRoute {
  const normalized = (route ?? "").toLowerCase();
  if (normalized.includes("life-insight") || normalized.includes("insight")) return "life_insight";
  if (normalized.includes("smart")) return "smart_goal";
  if (normalized.includes("feasibility")) return "feasibility";
  if (normalized.includes("12-week") || normalized.includes("twelve") || normalized.includes("12 week")) {
    return "twelve_week";
  }
  if (normalized.includes("reflection") || normalized.includes("review")) return "review";
  if (normalized.includes("today") || normalized.includes("12-week-system")) return "today";
  return "general";
}

/** G5: suy ra category từ reason của feedback (wrong_context -> missing_context, wrong_action -> invalid_action). */
function mapFeedbackReasonToCategory(reason: FeedbackReason | undefined): EvalCategory {
  if (reason === "wrong_context") return "missing_context";
  if (reason === "wrong_action") return "invalid_action";
  return "normal";
}

function hasAnyContextSignal(context: EvalContext): boolean {
  const goals = Array.isArray(context.goals) ? context.goals : [];
  const tasks = Array.isArray(context.todayTasks) ? context.todayTasks : [];
  const overdue = Array.isArray(context.stuckSignals?.overdueTasks) ? context.stuckSignals?.overdueTasks : [];
  return goals.length > 0 || tasks.length > 0 || (overdue?.length ?? 0) > 0;
}

function buildEvalContext(example: AssistantGoldenExample): EvalContext {
  const stored = example.context;
  if (!stored) {
    return { currentWeek: null, goals: [], todayTasks: [] } as EvalContext;
  }
  return { ...(stored as unknown as EvalContext), route: example.route };
}

function deriveExpected(example: AssistantGoldenExample, context: EvalContext): EvalExpected {
  const expected: EvalExpected = {};

  if (example.expectedActionType) {
    expected.expectedActionTypes = [example.expectedActionType];
  }

  if (example.reason === "wrong_action") {
    const badActionType = example.actionExecution?.actionType;
    if (badActionType && badActionType !== example.expectedActionType) {
      expected.forbiddenActionTypes = [badActionType];
    }
  }

  if (example.reason === "wrong_context" && !hasAnyContextSignal(context)) {
    expected.mustAskClarifyingQuestion = true;
    expected.forbiddenActionTypes = Array.from(
      new Set([...(expected.forbiddenActionTypes ?? []), "create_goal", "create_task", "mark_task_done"]),
    );
  }

  if (expected.expectedActionTypes && expected.expectedActionTypes.length > 0) {
    expected.mustUseExistingTaskId = true;
  }

  return expected;
}

function hasUsableExpectation(expected: EvalExpected): boolean {
  return Boolean(
    (expected.expectedActionTypes && expected.expectedActionTypes.length > 0) ||
      (expected.forbiddenActionTypes && expected.forbiddenActionTypes.length > 0) ||
      expected.mustAskClarifyingQuestion ||
      (expected.shouldContain && expected.shouldContain.length > 0) ||
      (expected.shouldNotContain && expected.shouldNotContain.length > 0),
  );
}

export function feedbackToEvalCases(
  examples: AssistantGoldenExample[],
  options: FeedbackToEvalOptions = {},
): AssistantEvalCase[] {
  const reasons = new Set(options.reasons ?? DEFAULT_FEEDBACK_EVAL_REASONS);
  const maxCases = options.maxCases ?? DEFAULT_MAX_CASES;
  const requireUserMessage = options.requireUserMessage ?? true;
  const idPrefix = options.idPrefix ?? "feedback";

  const cases: AssistantEvalCase[] = [];
  const seen = new Set<string>();

  for (const example of examples) {
    if (example.rating !== "not_helpful") continue;
    if (!example.reason || !reasons.has(example.reason)) continue;

    const input = boundedInput(example.userMessage);
    if (requireUserMessage && input.length === 0) continue;

    const dedupeKey = `${example.route}::${input.toLowerCase()}::${example.reason}`;
    if (seen.has(dedupeKey)) continue;

    const context = buildEvalContext(example);
    const expected = deriveExpected(example, context);
    if (!hasUsableExpectation(expected)) continue;

    seen.add(dedupeKey);
    cases.push({
      id: `${idPrefix}_${example.id}`,
      name: `Regression từ feedback (${example.reason}) tại ${example.route}`,
      category: mapFeedbackReasonToCategory(example.reason),
      route: mapFeedbackRouteToEvalRoute(example.route),
      input,
      context,
      expected,
    });

    if (cases.length >= maxCases) break;
  }

  return cases;
}

export function mergeFeedbackEvalCases(
  baseCases: AssistantEvalCase[],
  feedbackCases: AssistantEvalCase[],
): AssistantEvalCase[] {
  const existingIds = new Set(baseCases.map((evalCase) => evalCase.id));
  const merged = [...baseCases];
  for (const feedbackCase of feedbackCases) {
    if (existingIds.has(feedbackCase.id)) continue;
    existingIds.add(feedbackCase.id);
    merged.push(feedbackCase);
  }
  return merged;
}
