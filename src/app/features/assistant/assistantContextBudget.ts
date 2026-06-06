/**
 * G6: Context budget report cho assistant.
 *
 * Mục tiêu: đo được "bao nhiêu dữ liệu thực sự đưa vào prompt" và "bao nhiêu bị trim",
 * để theo dõi token và giảm hallucination khi context lớn.
 *
 * Report KHÔNG được đưa vào prompt (tránh bloat token); nó là dữ liệu phụ trợ cho
 * observability/dev. Các giới hạn dưới đây phải khớp với backend `summarizeContext`:
 * - goals.slice(0, 3)
 * - todayTasks.slice(0, 5)
 * - stuckSignals.overdueTasks.slice(0, 5)
 * - stuckSignals.missedCommitments.slice(0, 3)
 * - retrievedKnowledge.slice(0, 5)
 */

import type { AssistantContext } from "./buildAssistantContext";

/** Giới hạn số item đưa vào prompt (đồng bộ với backend summarizeContext). */
export const CONTEXT_PROMPT_LIMITS = {
  goals: 3,
  todayTasks: 5,
  overdueTasks: 5,
  missedCommitments: 3,
  retrievedKnowledge: 5,
} as const;

export interface ContextBudgetField {
  total: number;
  included: number;
  trimmed: number;
}

export interface ContextBudgetReport {
  goals: ContextBudgetField;
  todayTasks: ContextBudgetField;
  overdueTasks: ContextBudgetField;
  missedCommitments: ContextBudgetField;
  retrievedKnowledge: ContextBudgetField;
  weeklyReviewIncluded: boolean;
  memoryIncluded: boolean;
  /** Tổng số item bị trim trên tất cả nhóm (proxy cho mất mát context). */
  totalTrimmed: number;
}

function field(total: number, limit: number): ContextBudgetField {
  const included = Math.min(total, limit);
  return { total, included, trimmed: Math.max(0, total - included) };
}

/**
 * Tính report từ một AssistantContext đã build. Pure, không đọc storage, không throw.
 */
export function buildContextBudgetReport(context: AssistantContext): ContextBudgetReport {
  const goals = field(context.goals?.length ?? 0, CONTEXT_PROMPT_LIMITS.goals);
  const todayTasks = field(context.todayTasks?.length ?? 0, CONTEXT_PROMPT_LIMITS.todayTasks);
  const overdueTasks = field(
    context.stuckSignals?.overdueTasks?.length ?? 0,
    CONTEXT_PROMPT_LIMITS.overdueTasks,
  );
  const missedCommitments = field(
    context.stuckSignals?.missedCommitments?.length ?? 0,
    CONTEXT_PROMPT_LIMITS.missedCommitments,
  );
  const retrievedKnowledge = field(
    context.retrievedKnowledge?.length ?? 0,
    CONTEXT_PROMPT_LIMITS.retrievedKnowledge,
  );

  const totalTrimmed =
    goals.trimmed +
    todayTasks.trimmed +
    overdueTasks.trimmed +
    missedCommitments.trimmed +
    retrievedKnowledge.trimmed;

  return {
    goals,
    todayTasks,
    overdueTasks,
    missedCommitments,
    retrievedKnowledge,
    weeklyReviewIncluded: context.latestWeeklyReview !== null && context.latestWeeklyReview !== undefined,
    memoryIncluded: context.assistantMemory !== undefined,
    totalTrimmed,
  };
}
