/**
 * Sanitize assistant context for backend.
 *
 * Limits:
 *   - goals: max 5
 *   - todayTasks: max 8
 *   - overdueTasks: max 5
 *   - missedCommitments: max 3
 *   - route: string max 50 chars
 */

import type { AssistantContext } from "./buildAssistantContext";

export interface SanitizedAssistantContext extends AssistantContext {
  route: string;
}

const MAX_TEXT = 200;
const MAX_DEADLINES = 3;
const MAX_STREAK_DAYS = 365;
const MAX_DAYS_UNTIL = 365;
const MAX_MISSING_FIELDS = 8;

type RetrievedKnowledgeSource = NonNullable<AssistantContext["retrievedKnowledge"]>[number]["source"];

export function sanitizeAssistantContext(ctx: AssistantContext & { route: string }): SanitizedAssistantContext {
  return {
    currentWeek: ctx.currentWeek,
    weeksTotal: ctx.weeksTotal,
    goals: (ctx.goals || []).slice(0, 5).map((goal) => ({
      id: text(goal.id, 100),
      title: text(goal.title, MAX_TEXT),
      progress: clamp(goal.progress, 0, 100, 0),
    })),
    todayTasks: (ctx.todayTasks || []).slice(0, 8).map((task) => ({
      id: text(task.id, 100),
      title: text(task.title, MAX_TEXT),
      done: !!task.done,
    })),
    lastReflectionDate: ctx.lastReflectionDate,
    feasibility: sanitizeFeasibility(ctx.feasibility),
    latestWeeklyReview: sanitizeLatestWeeklyReview(ctx.latestWeeklyReview),
    stuckSignals: sanitizeStuckSignals(ctx.stuckSignals),
    trend: sanitizeTrend(ctx.trend),
    streak: sanitizeStreak(ctx.streak),
    upcomingDeadlines: sanitizeUpcomingDeadlines(ctx.upcomingDeadlines),
    pageContext: sanitizePageContext(ctx.pageContext),
    pageContextHint: sanitizePageContextHint(ctx.pageContextHint),
    route: text(ctx.route || "", 50),
    authSyncMode: sanitizeAuthSyncMode(ctx.authSyncMode),
    assistantMemory: sanitizeAssistantMemory(ctx.assistantMemory),
    retrievedKnowledge: sanitizeRetrievedKnowledge(ctx.retrievedKnowledge),
    pendingClarification: sanitizePendingClarification(ctx.pendingClarification),
  };
}

function sanitizeAuthSyncMode(authSyncMode: AssistantContext["authSyncMode"]): AssistantContext["authSyncMode"] {
  if (!authSyncMode) return undefined;
  return {
    authState: authSyncMode.authState === "signed_in" ? "signed_in" : "anonymous",
    syncState: ["synced", "syncing", "error", "offline", "disabled"].includes(authSyncMode.syncState)
      ? authSyncMode.syncState
      : "disabled",
  };
}

function text(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function nullableText(value: unknown, maxLength = MAX_TEXT): string | null {
  const sanitized = text(value, maxLength);
  return sanitized || null;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function nullableNumber(value: unknown, min: number, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, numeric));
}

function sanitizeFeasibility(feasibility: AssistantContext["feasibility"]): AssistantContext["feasibility"] {
  if (!feasibility) return null;
  return {
    readinessScore: nullableNumber(feasibility.readinessScore, 0, 20),
    bottleneckLabel: nullableText(feasibility.bottleneckLabel),
    bottleneckAction: nullableText(feasibility.bottleneckAction),
  };
}

function sanitizeLatestWeeklyReview(
  review: AssistantContext["latestWeeklyReview"],
): AssistantContext["latestWeeklyReview"] {
  if (!review) return null;
  return {
    weekNumber: clamp(review.weekNumber, 1, 52, 1),
    leadCompletionPercent: nullableNumber(review.leadCompletionPercent, 0, 100),
    mainObstacle: nullableText(review.mainObstacle),
    nextWeekPriority: nullableText(review.nextWeekPriority),
    workloadDecision: nullableText(review.workloadDecision, 80),
    reviewedAt: nullableText(review.reviewedAt, 40),
  };
}

function sanitizeStuckSignals(stuckSignals: AssistantContext["stuckSignals"]): AssistantContext["stuckSignals"] {
  return {
    latestObstacle: nullableText(stuckSignals?.latestObstacle),
    missedCommitments: (stuckSignals?.missedCommitments || []).slice(0, 3).map((item) => text(item, MAX_TEXT)),
    overdueOpenCount: clamp(stuckSignals?.overdueOpenCount, 0, 100, 0),
    overdueTasks: (stuckSignals?.overdueTasks || []).slice(0, 5).map((task) => ({
      id: text(task.id, 100),
      title: text(task.title, MAX_TEXT),
      scheduledDate: text(task.scheduledDate, 40),
      isCore: !!task.isCore,
    })),
  };
}

function sanitizeTrend(trend: AssistantContext["trend"]): AssistantContext["trend"] {
  if (!trend) {
    return { completionLast4Weeks: [], direction: "unknown" };
  }

  const completions = (trend.completionLast4Weeks || []).slice(0, 4).map((val) => clamp(val, 0, 100, 0));

  const direction =
    trend.direction === "up" || trend.direction === "down" || trend.direction === "flat" ? trend.direction : "unknown";

  return { completionLast4Weeks: completions, direction };
}

function sanitizeStreak(streak: AssistantContext["streak"]): AssistantContext["streak"] {
  if (!streak) {
    return { daysWithCompletedTask: 0 };
  }

  return { daysWithCompletedTask: clamp(streak.daysWithCompletedTask, 0, MAX_STREAK_DAYS, 0) };
}

function sanitizeUpcomingDeadlines(
  deadlines: AssistantContext["upcomingDeadlines"],
): AssistantContext["upcomingDeadlines"] {
  if (!Array.isArray(deadlines)) {
    return [];
  }

  return deadlines
    .slice(0, MAX_DEADLINES)
    .map((d) => ({
      goalId: text(d.goalId, 100),
      title: text(d.title, MAX_TEXT),
      daysUntil: clamp(d.daysUntil, -MAX_DAYS_UNTIL, MAX_DAYS_UNTIL, 0),
    }))
    .slice(0, MAX_DEADLINES);
}

function sanitizePageContext(pageContext: AssistantContext["pageContext"]): AssistantContext["pageContext"] {
  return {
    route: text(pageContext?.route || "", 80),
    currentStep: nullableText(pageContext?.currentStep, 80),
    nextSuggestedStep: nullableText(pageContext?.nextSuggestedStep),
    formDraft: sanitizePageFormDraft(pageContext?.formDraft),
  };
}

function sanitizePageFormDraft(
  formDraft: AssistantContext["pageContext"]["formDraft"] | undefined,
): AssistantContext["pageContext"]["formDraft"] {
  return {
    focusArea: nullableText(formDraft?.focusArea),
    smartGoalTitle: nullableText(formDraft?.smartGoalTitle),
    smartGoalMetric: nullableText(formDraft?.smartGoalMetric),
    missingSmartGoalFields: (formDraft?.missingSmartGoalFields || [])
      .slice(0, MAX_MISSING_FIELDS)
      .map((item) => text(item, 80))
      .filter(Boolean),
    feasibilityAnsweredCount: clamp(formDraft?.feasibilityAnsweredCount, 0, 50, 0),
    feasibilityBottleneck: nullableText(formDraft?.feasibilityBottleneck),
    goalCount: clamp(formDraft?.goalCount, 0, 100, 0),
    goalsWithoutTwelveWeekPlan: clamp(formDraft?.goalsWithoutTwelveWeekPlan, 0, 100, 0),
    activeGoalTitle: nullableText(formDraft?.activeGoalTitle),
    twelveWeekDraftSummary: formDraft?.twelveWeekDraftSummary
      ? {
          leadIndicatorCount: clamp(formDraft.twelveWeekDraftSummary.leadIndicatorCount, 0, 20, 0),
          hasReviewDay: !!formDraft.twelveWeekDraftSummary.hasReviewDay,
          hasWeek12Outcome: !!formDraft.twelveWeekDraftSummary.hasWeek12Outcome,
          hasLagMetric: !!formDraft.twelveWeekDraftSummary.hasLagMetric,
          tacticLoadPreference: nullableText(formDraft.twelveWeekDraftSummary.tacticLoadPreference, 80),
          personalConstraint: nullableText(formDraft.twelveWeekDraftSummary.personalConstraint),
        }
      : undefined,
  };
}

export function sanitizePageContextHint(
  pageContextHint: AssistantContext["pageContextHint"],
): AssistantContext["pageContextHint"] | undefined {
  if (!pageContextHint) return undefined;
  return {
    pageType: text(pageContextHint.pageType, 40),
    currentStep: pageContextHint.currentStep ? text(pageContextHint.currentStep, 40) : undefined,
    hint: pageContextHint.hint ? text(pageContextHint.hint, 200) : undefined,
  };
}

function sanitizeAssistantMemory(
  memory: AssistantContext["assistantMemory"],
): AssistantContext["assistantMemory"] {
  if (!memory) return undefined;
  return {
    preferredCoachingStyle: ["direct", "gentle", "structured", "brief"].includes(String(memory.preferredCoachingStyle))
      ? memory.preferredCoachingStyle
      : undefined,
    recurringObstacles: (memory.recurringObstacles || []).slice(0, 3).map((item) => text(item, 100)),
    userPreferences: (memory.userPreferences || []).slice(0, 3).map((item) => text(item, 100)),
    rejectedPatterns: (memory.rejectedPatterns || []).slice(0, 3).map((item) => text(item, 100)),
    recentCorrections: (memory.recentCorrections || []).slice(0, 3).map((item) => text(item, 100)),
    oftenMissedTasks: (memory.oftenMissedTasks || []).slice(0, 3).map((item) => text(item, 100)),
  };
}

function redactSensitive(textVal: string): string {
  return textVal
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL_REDACTED]")
    .replace(/[\w\-]{20,}/g, "[REDACTED]")
    .replace(/(api[_-]?key|secret|password|token|private[_-]?key|credentials)\s*:\s*[^\s,]+/gi, "$1: [REDACTED]")
    .replace(/\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key)[\w-]*\b/gi, "[REDACTED]")
    .replace(/(api[_-]?key|secret|password|token|private[_-]?key|credentials)/gi, "[REDACTED]");
}

function isRetrievedKnowledgeSource(value: unknown): value is RetrievedKnowledgeSource {
  return (
    value === "goal" ||
    value === "reflection" ||
    value === "weekly_review" ||
    value === "task" ||
    value === "assistant_memory"
  );
}

function sanitizeRetrievedKnowledge(
  items: AssistantContext["retrievedKnowledge"],
): AssistantContext["retrievedKnowledge"] {
  if (!items) return undefined;
  const sanitized: NonNullable<AssistantContext["retrievedKnowledge"]> = [];

  for (const item of items.slice(0, 5)) {
    if (!isRetrievedKnowledgeSource(item.source)) continue;

    sanitized.push({
      source: item.source,
      title: text(redactSensitive(item.title), 160),
      snippet: text(redactSensitive(item.snippet), 220),
      score: clamp(item.score, 0, 100, 0),
      date: item.date ? text(item.date, 40) : undefined,
      goalId: item.goalId ? text(item.goalId, 100) : undefined,
      taskId: item.taskId ? text(item.taskId, 100) : undefined,
    });
  }

  return sanitized;
}

function sanitizePendingClarification(
  pending: AssistantContext["pendingClarification"],
): AssistantContext["pendingClarification"] {
  if (!pending) return undefined;
  if (pending.kind !== "task_selection") return undefined;
  if (pending.intent !== "mark_task_done" && pending.intent !== "update_task_status") return undefined;

  const candidates = (pending.candidates || [])
    .slice(0, 7)
    .map((candidate) => ({
      id: text(candidate.id, 100),
      label: text(redactSensitive(candidate.label), 160),
      goalId: candidate.goalId ? text(candidate.goalId, 100) : undefined,
      weekId: candidate.weekId ? text(candidate.weekId, 100) : undefined,
      dayKey: candidate.dayKey ? text(candidate.dayKey, 40) : undefined,
    }))
    .filter((candidate) => candidate.id && candidate.label);

  if (candidates.length === 0) return undefined;

  return {
    kind: "task_selection",
    intent: pending.intent,
    question: text(redactSensitive(pending.question), 500),
    candidates,
    createdAt: text(pending.createdAt, 40),
    expiresAt: text(pending.expiresAt, 40),
  };
}
