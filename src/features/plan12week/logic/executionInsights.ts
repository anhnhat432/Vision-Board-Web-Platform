/**
 * Execution Insights v1 — pure helper.
 *
 * Surfaces 9 deterministic rule-based insights from a `TwelveWeekSystem`:
 *   - consistency_improving / consistency_dropping
 *   - overloaded_week / needs_scope_reduction
 *   - strong_lead_metric / ready_to_push
 *   - review_missing
 *   - task_completion_without_progress / progress_without_consistency
 *
 * Constraints (v1):
 *   - No AI, no free-text NLP, no network. Reads only structured fields.
 *   - Output is canned Vietnamese copy + enum reason markers (analytics-safe —
 *     no raw reflection / check-in note / task title is interpolated).
 *   - Pure: no side effects, never throws.
 *   - Backwards compatible: every required input is read-with-default.
 */

import { getCalendarDayDifference, parseCalendarDate } from "@/app/utils/storage-date-utils";
import type {
  TwelveWeekSystem,
  UniversalDailyCheckIn,
  UniversalScoreboardWeek,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";

// ---- Public types -----------------------------------------------------------

export type ExecutionInsightId =
  | "consistency_improving"
  | "consistency_dropping"
  | "overloaded_week"
  | "strong_lead_metric"
  | "review_missing"
  | "task_completion_without_progress"
  | "progress_without_consistency"
  | "ready_to_push"
  | "needs_scope_reduction"
  | "no_data";

export type ExecutionInsightSeverity = "positive" | "neutral" | "warning";

export type ExecutionInsightNextActionId =
  | "open_today"
  | "open_week_review"
  | "reduce_load"
  | "celebrate_keep_going"
  | "tighten_scope"
  | "reset_focus"
  | "open_setup"
  | "no_action";

export interface ExecutionInsight {
  id: ExecutionInsightId;
  severity: ExecutionInsightSeverity;
  /** Short, non-judgmental Vietnamese headline. */
  headline: string;
  /** Longer Vietnamese body — also non-judgmental. */
  body: string;
  /** Suggested category of next action. UI maps this to a real button. */
  nextActionId: ExecutionInsightNextActionId;
  /**
   * Numeric/enum markers used to derive the insight. Safe to ship to analytics.
   * Never contains user free text.
   */
  metrics: Record<string, number | null>;
}

export interface ExecutionInsightsContext {
  /**
   * If provided, scopes some heuristics (overloaded_week, ready_to_push) to a
   * specific week instead of the latest one. Defaults to `system.currentWeek`.
   */
  weekNumber?: number;
  /** Today's date key in YYYY-MM-DD. Defaults to local today. */
  todayDateKey?: string;
}

export interface ExecutionInsightNextAction {
  id: ExecutionInsightNextActionId;
  /** Short Vietnamese label suitable for a primary button. */
  label: string;
  /** One-line Vietnamese hint suitable for inline copy. */
  hint: string;
}

// ---- Constants --------------------------------------------------------------

const PRIORITY_ORDER: ExecutionInsightId[] = [
  "review_missing",
  "overloaded_week",
  "task_completion_without_progress",
  "consistency_dropping",
  "needs_scope_reduction",
  "strong_lead_metric",
  "consistency_improving",
  "progress_without_consistency",
  "ready_to_push",
  "no_data",
];

const MAX_INSIGHTS = 3;

const HIGH_COMPLETION_PERCENT = 70;
const STRONG_COMPLETION_PERCENT = 80;
const LOW_COMPLETION_PERCENT = 50;
const HIGH_LEAD_COMPLETION_PERCENT = 70;
const LOW_LEAD_COMPLETION_PERCENT = 30;
const HIGH_CHECK_IN_RATE = 70;
const TREND_DELTA_DROP = 15;
const TREND_DELTA_RISE = 10;
const OVERLOADED_TASK_COUNT = 11;

// ---- Internal helpers -------------------------------------------------------

function todayKeyDefault(input?: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const parsed = parseCalendarDate(input.slice(0, 10));
    if (parsed) return input.slice(0, 10);
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function differenceInDays(later: string, earlier: string): number {
  return getCalendarDayDifference(later.slice(0, 10), parseCalendarDate(earlier.slice(0, 10)) ?? new Date()) ?? 0;
}

function clampPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function nonEmpty(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

// ---- Aggregation ------------------------------------------------------------

interface AggregateMetrics {
  weekNumber: number;
  totalWeeks: number;
  scoreboardThroughCurrent: UniversalScoreboardWeek[];
  reviewsThroughCurrent: UniversalWeeklyReview[];
  currentWeekScore: number | null;
  previousWeekScore: number | null;
  averageScore: number | null;
  recentAverageScore: number | null;
  currentWeekTaskCount: number;
  currentWeekCompletionPercent: number | null;
  currentWeekLeadCompletionPercent: number | null;
  recentLeadCompletionPercent: number | null;
  previousWeekReviewCompleted: boolean | null;
  checkInRate7d: number | null;
  lagMetricMoving: boolean;
  hasAnyExecutionData: boolean;
}

function aggregate(system: TwelveWeekSystem, ctx: ExecutionInsightsContext): AggregateMetrics {
  const weekNumber = Math.max(1, Math.min(ctx.weekNumber ?? system.currentWeek ?? 1, system.totalWeeks));
  const totalWeeks = system.totalWeeks;
  const todayKey = todayKeyDefault(ctx.todayDateKey);

  const scoreboard = system.scoreboard ?? [];
  const reviews = system.weeklyReviews ?? [];
  const taskInstances = system.taskInstances ?? [];
  const dailyCheckIns: ReadonlyArray<UniversalDailyCheckIn> = system.dailyCheckIns ?? [];

  const scoreboardThroughCurrent = scoreboard.filter((entry) => entry.weekNumber <= weekNumber);
  const reviewsThroughCurrent = reviews.filter((entry) => entry.weekNumber <= weekNumber);

  const currentWeekEntry = scoreboard.find((entry) => entry.weekNumber === weekNumber);
  const previousWeekEntry = scoreboard.find((entry) => entry.weekNumber === weekNumber - 1);

  const currentWeekScore = currentWeekEntry && currentWeekEntry.weeklyScore > 0 ? currentWeekEntry.weeklyScore : null;
  const previousWeekScore =
    previousWeekEntry && previousWeekEntry.weeklyScore > 0 ? previousWeekEntry.weeklyScore : null;

  const scoredWeeks = scoreboardThroughCurrent.filter((entry) => entry.weeklyScore > 0);
  const averageScore =
    scoredWeeks.length > 0
      ? Math.round(scoredWeeks.reduce((sum, entry) => sum + entry.weeklyScore, 0) / scoredWeeks.length)
      : null;

  const recentScored = scoredWeeks.slice(-3);
  const recentAverageScore =
    recentScored.length > 0
      ? Math.round(recentScored.reduce((sum, entry) => sum + entry.weeklyScore, 0) / recentScored.length)
      : null;

  const currentWeekTasks = taskInstances.filter((task) => task.weekNumber === weekNumber && !task.skipped);
  const currentWeekTaskCount = currentWeekTasks.length;
  const currentWeekCompletedCount = currentWeekTasks.filter((task) => task.completed).length;
  const currentWeekCompletionPercent =
    currentWeekTaskCount > 0 ? Math.round((currentWeekCompletedCount / currentWeekTaskCount) * 100) : null;

  const currentWeekLeadCompletionPercent = clampPercent(currentWeekEntry?.leadCompletionPercent ?? null);
  const recentLeadCompletionPercent =
    scoredWeeks.length > 0
      ? clampPercent(
          scoredWeeks.slice(-3).reduce((sum, entry) => sum + (entry.leadCompletionPercent ?? 0), 0) /
            Math.max(1, scoredWeeks.slice(-3).length),
        )
      : null;

  const previousReview = reviews.find((entry) => entry.weekNumber === weekNumber - 1);
  const previousWeekReviewCompleted = weekNumber <= 1 ? null : Boolean(previousReview?.reviewCompleted);

  const checkInsLast7d = dailyCheckIns.filter((entry) => {
    const date = entry.date?.slice(0, 10) ?? "";
    if (!date) return false;
    const delta = differenceInDays(todayKey, date);
    return delta >= 0 && delta < 7 && entry.didWorkToday;
  }).length;
  const checkInRate7d =
    dailyCheckIns.length === 0 && taskInstances.length === 0 ? null : Math.round((checkInsLast7d / 7) * 100);

  const lagMetricMoving =
    nonEmpty(system.lagMetric?.currentValue) || reviewsThroughCurrent.some((entry) => nonEmpty(entry.lagProgressValue));

  const hasAnyExecutionData =
    scoredWeeks.length > 0 ||
    taskInstances.some((task) => task.completed) ||
    dailyCheckIns.length > 0 ||
    reviewsThroughCurrent.some((entry) => entry.reviewCompleted);

  return {
    weekNumber,
    totalWeeks,
    scoreboardThroughCurrent,
    reviewsThroughCurrent,
    currentWeekScore,
    previousWeekScore,
    averageScore,
    recentAverageScore,
    currentWeekTaskCount,
    currentWeekCompletionPercent,
    currentWeekLeadCompletionPercent,
    recentLeadCompletionPercent,
    previousWeekReviewCompleted,
    checkInRate7d,
    lagMetricMoving,
    hasAnyExecutionData,
  };
}

// ---- Insight builders -------------------------------------------------------

function makeInsight(
  id: ExecutionInsightId,
  severity: ExecutionInsightSeverity,
  headline: string,
  body: string,
  nextActionId: ExecutionInsightNextActionId,
  metrics: Record<string, number | null>,
): ExecutionInsight {
  return { id, severity, headline, body, nextActionId, metrics };
}

function detectInsights(metrics: AggregateMetrics): ExecutionInsight[] {
  const insights: ExecutionInsight[] = [];

  // No-data state — handle separately so the UI shows a helpful empty card.
  if (!metrics.hasAnyExecutionData) {
    insights.push(
      makeInsight(
        "no_data",
        "neutral",
        "Chưa có đủ dữ liệu để gợi ý",
        "Sau vài lần check-in hoặc một tuần đã chốt review, app sẽ bắt đầu thấy được pattern và đưa ra insight cụ thể.",
        "open_today",
        {
          weekNumber: metrics.weekNumber,
        },
      ),
    );
    return insights;
  }

  // 1. review_missing — week N-1 has no completed review.
  if (metrics.weekNumber >= 2 && metrics.previousWeekReviewCompleted === false) {
    insights.push(
      makeInsight(
        "review_missing",
        "warning",
        "Tuần trước chưa có review",
        "3 phút nhìn lại tuần trước sẽ giúp bạn quyết định nhịp tuần này nhẹ hơn — không cần dài, chỉ cần chốt.",
        "open_week_review",
        {
          weekNumber: metrics.weekNumber,
          previousWeekNumber: metrics.weekNumber - 1,
        },
      ),
    );
  }

  // 2. overloaded_week — current week has many tasks AND completion is low.
  if (
    metrics.currentWeekTaskCount >= OVERLOADED_TASK_COUNT &&
    (metrics.currentWeekCompletionPercent ?? 100) < LOW_COMPLETION_PERCENT
  ) {
    insights.push(
      makeInsight(
        "overloaded_week",
        "warning",
        "Tuần này có vẻ đang quá tải",
        "Số việc trong tuần khá lớn nhưng phần đã chốt còn thấp. Tuần sau cân nhắc giảm tải, chỉ giữ việc cốt lõi.",
        "reduce_load",
        {
          taskCount: metrics.currentWeekTaskCount,
          completionPercent: metrics.currentWeekCompletionPercent,
        },
      ),
    );
  }

  // 3. task_completion_without_progress — high task completion but lag metric is not moving.
  if ((metrics.currentWeekCompletionPercent ?? 0) >= HIGH_COMPLETION_PERCENT && !metrics.lagMetricMoving) {
    insights.push(
      makeInsight(
        "task_completion_without_progress",
        "warning",
        "Đang làm đều nhưng kim mục tiêu chưa di chuyển",
        "Bạn xong nhiều việc, nhưng chỉ số chính chưa được cập nhật. Tuần sau hãy gắn việc tuần với kết quả thực sự đẩy chỉ số.",
        "tighten_scope",
        {
          completionPercent: metrics.currentWeekCompletionPercent,
          lagMoving: 0,
        },
      ),
    );
  }

  // 4. consistency_dropping — most recent week dropped vs previous.
  if (
    metrics.previousWeekScore !== null &&
    metrics.currentWeekScore !== null &&
    metrics.previousWeekScore - metrics.currentWeekScore >= TREND_DELTA_DROP
  ) {
    insights.push(
      makeInsight(
        "consistency_dropping",
        "warning",
        "Nhịp tuần này đang chùng so với tuần trước",
        "Điểm tuần giảm rõ so với tuần trước. Không cần dồn việc — chọn 1 việc cốt lõi, làm xong là đã quay lại đúng hướng.",
        "reset_focus",
        {
          currentScore: metrics.currentWeekScore,
          previousScore: metrics.previousWeekScore,
          delta: metrics.currentWeekScore - metrics.previousWeekScore,
        },
      ),
    );
  }

  // 5. needs_scope_reduction — high completion but lead metric % low.
  if (
    (metrics.currentWeekCompletionPercent ?? 0) >= HIGH_COMPLETION_PERCENT &&
    metrics.currentWeekLeadCompletionPercent !== null &&
    metrics.currentWeekLeadCompletionPercent <= LOW_LEAD_COMPLETION_PERCENT
  ) {
    insights.push(
      makeInsight(
        "needs_scope_reduction",
        "warning",
        "Việc nhiều nhưng chưa đúng đòn bẩy",
        "Bạn đang chốt nhiều task nhưng các chỉ số dẫn dắt vẫn thấp. Tuần sau giảm số lượng và tập trung vào 2-3 việc thực sự đẩy chỉ số.",
        "tighten_scope",
        {
          completionPercent: metrics.currentWeekCompletionPercent,
          leadCompletionPercent: metrics.currentWeekLeadCompletionPercent,
        },
      ),
    );
  }

  // 6. strong_lead_metric — recent average lead completion is high.
  if (
    metrics.recentLeadCompletionPercent !== null &&
    metrics.recentLeadCompletionPercent >= HIGH_LEAD_COMPLETION_PERCENT
  ) {
    insights.push(
      makeInsight(
        "strong_lead_metric",
        "positive",
        "Chỉ số dẫn dắt đang chạy mạnh",
        "Các chỉ số chính đang được giữ nhịp tốt mấy tuần gần đây. Đây là điểm bạn nên giữ nguyên cho tuần sau.",
        "celebrate_keep_going",
        {
          recentLeadCompletionPercent: metrics.recentLeadCompletionPercent,
        },
      ),
    );
  }

  // 7. consistency_improving — most recent week rose vs previous.
  if (
    metrics.previousWeekScore !== null &&
    metrics.currentWeekScore !== null &&
    metrics.currentWeekScore - metrics.previousWeekScore >= TREND_DELTA_RISE
  ) {
    insights.push(
      makeInsight(
        "consistency_improving",
        "positive",
        "Nhịp đang được cải thiện rõ",
        "Điểm tuần này tăng so với tuần trước. Giữ nguyên cách bạn đang làm — đó là phần đáng giữ cho tuần sau.",
        "celebrate_keep_going",
        {
          currentScore: metrics.currentWeekScore,
          previousScore: metrics.previousWeekScore,
          delta: metrics.currentWeekScore - metrics.previousWeekScore,
        },
      ),
    );
  }

  // 8. progress_without_consistency — lag metric moved but completion % is low.
  if (
    metrics.lagMetricMoving &&
    metrics.currentWeekCompletionPercent !== null &&
    metrics.currentWeekCompletionPercent < LOW_COMPLETION_PERCENT
  ) {
    insights.push(
      makeInsight(
        "progress_without_consistency",
        "neutral",
        "Mục tiêu di chuyển dù tuần chưa đầy đặn",
        "Chỉ số chính có cập nhật, nhưng tuần này khá lệch nhịp. Có vẻ bạn đang dựa vào vài bước lớn hơn là nhịp đều — cần thêm consistency để giữ kết quả.",
        "open_today",
        {
          completionPercent: metrics.currentWeekCompletionPercent,
        },
      ),
    );
  }

  // 9. ready_to_push — recent average score strong + check-in consistency strong.
  if (
    metrics.recentAverageScore !== null &&
    metrics.recentAverageScore >= STRONG_COMPLETION_PERCENT &&
    metrics.checkInRate7d !== null &&
    metrics.checkInRate7d >= HIGH_CHECK_IN_RATE
  ) {
    insights.push(
      makeInsight(
        "ready_to_push",
        "positive",
        "Bạn đang sẵn sàng đẩy thêm một bậc",
        "Điểm trung bình mấy tuần gần đây cao và check-in đều. Có thể tăng nhẹ một việc cốt lõi tuần sau nếu năng lượng còn.",
        "open_today",
        {
          recentAverageScore: metrics.recentAverageScore,
          checkInRate7d: metrics.checkInRate7d,
        },
      ),
    );
  }

  return insights;
}

function sortAndCap(insights: ExecutionInsight[], cap = MAX_INSIGHTS): ExecutionInsight[] {
  const indexById = new Map(PRIORITY_ORDER.map((id, index) => [id, index] as const));
  return [...insights].sort((a, b) => (indexById.get(a.id) ?? 99) - (indexById.get(b.id) ?? 99)).slice(0, cap);
}

// ---- Public API -------------------------------------------------------------

/**
 * Return up to 3 most-relevant execution insights across the cycle.
 * Sorted by priority. Always returns at least one insight (`no_data` when the
 * system has no execution signals yet).
 */
export function getExecutionInsights(
  system: TwelveWeekSystem | null | undefined,
  context: ExecutionInsightsContext = {},
): ExecutionInsight[] {
  if (!system) {
    return [
      makeInsight(
        "no_data",
        "neutral",
        "Chưa có hệ thống 12 tuần đang chạy",
        "Tạo chu kỳ 12 tuần và bắt đầu check-in để app có thể đưa ra insight cụ thể.",
        "open_setup",
        {},
      ),
    ];
  }
  const metrics = aggregate(system, context);
  return sortAndCap(detectInsights(metrics));
}

/**
 * Return week-scoped insights, useful for the Weekly Review summary card.
 * Sorted by priority. Always returns at least one insight (`no_data` if the
 * given week has no signals).
 */
export function getWeeklyReflectionInsights(
  system: TwelveWeekSystem | null | undefined,
  weekNumber: number,
  context: Omit<ExecutionInsightsContext, "weekNumber"> = {},
): ExecutionInsight[] {
  if (!system) {
    return [
      makeInsight(
        "no_data",
        "neutral",
        "Chưa có dữ liệu cho tuần này",
        "Khi tuần có check-in hoặc review chốt, app sẽ tổng hợp nhanh điều đáng giữ và điều đáng điều chỉnh.",
        "open_today",
        { weekNumber },
      ),
    ];
  }
  return sortAndCap(detectInsights(aggregate(system, { ...context, weekNumber })));
}

const NEXT_ACTION_LIBRARY: Record<ExecutionInsightNextActionId, Omit<ExecutionInsightNextAction, "id">> = {
  open_today: {
    label: "Mở Hôm nay",
    hint: "Xem việc đầu tiên hôm nay và bắt đầu nhỏ.",
  },
  open_week_review: {
    label: "Mở review tuần",
    hint: "Chốt review tuần trước trong 3 phút để tuần này nhẹ đầu hơn.",
  },
  reduce_load: {
    label: "Giảm tải tuần sau",
    hint: "Xem lại tuần sau và chỉ giữ 2-3 việc cốt lõi.",
  },
  celebrate_keep_going: {
    label: "Giữ nguyên nhịp",
    hint: "Việc đang giúp bạn tiến bộ — giữ y nguyên cho tuần sau.",
  },
  tighten_scope: {
    label: "Thu hẹp phạm vi",
    hint: "Tuần sau chỉ giữ việc thực sự đẩy chỉ số chính.",
  },
  reset_focus: {
    label: "Restart nhẹ",
    hint: "Chốt 1 việc cốt lõi cho tuần sau để khởi động lại đúng hướng.",
  },
  open_setup: {
    label: "Mở Setup",
    hint: "Tạo chu kỳ 12 tuần để bắt đầu thu thập dữ liệu.",
  },
  no_action: {
    label: "Không cần hành động",
    hint: "Cứ giữ nhịp hiện tại.",
  },
};

/**
 * Pick the single most relevant next action from a list of insights. Returns
 * the action mapped to the highest-priority insight, or a no-action fallback
 * when the list is empty.
 */
export function getNextActionFromInsights(insights: ReadonlyArray<ExecutionInsight>): ExecutionInsightNextAction {
  if (insights.length === 0) {
    return { id: "no_action", ...NEXT_ACTION_LIBRARY.no_action };
  }
  const sorted = sortAndCap([...insights], insights.length);
  const top = sorted[0];
  const id = top.nextActionId;
  return { id, ...NEXT_ACTION_LIBRARY[id] };
}
