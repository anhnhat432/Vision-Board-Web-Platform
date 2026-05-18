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

export function sanitizeAssistantContext(
  ctx: AssistantContext & { route: string },
): SanitizedAssistantContext {
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
    route: text(ctx.route || "", 50),
  };
}

function text(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
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
