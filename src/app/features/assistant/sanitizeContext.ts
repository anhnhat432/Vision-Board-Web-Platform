/**
 * Sanitize assistant context for backend.
 *
 * Limits:
 *   - goals: max 5
 *   - todayTasks: max 8
 *   - route: string max 50 chars
 */

import type { AssistantContext } from "./buildAssistantContext";

export interface SanitizedAssistantContext extends AssistantContext {
  route: string;
}

export function sanitizeAssistantContext(
  ctx: AssistantContext & { route: string },
): SanitizedAssistantContext {
  return {
    currentWeek: ctx.currentWeek,
    weeksTotal: ctx.weeksTotal,
    goals: (ctx.goals || []).slice(0, 5).map((g) => ({
      id: g.id,
      title: g.title?.slice(0, 200) || "",
      progress: Math.max(0, Math.min(100, g.progress)),
    })),
    todayTasks: (ctx.todayTasks || []).slice(0, 8).map((t) => ({
      id: t.id,
      title: t.title?.slice(0, 200) || "",
      done: !!t.done,
    })),
    lastReflectionDate: ctx.lastReflectionDate,
    route: (ctx.route || "").slice(0, 50),
  };
}