/**
 * Rescue Mode v1 — pure helper.
 *
 * Detects when a user has fallen off-pace on their 12-week plan and proposes
 * gentle, deterministic suggestions to nudge them back. No AI, no network,
 * no side effects.
 *
 * Scope (v1):
 *   - 5 deterministic rule-based triggers (overdue tasks, no-completion streak,
 *     missed daily check-ins, low-completion near end of week, weekly review
 *     missed).
 *   - 5 suggestion ids tied to triggers (pick one tiny task, reschedule
 *     non-core, 2-minute check-in, reduce week load, review-not-abandon).
 *   - Severity bucket (`none` / `gentle` / `active` / `urgent`).
 *   - Vietnamese, non-judgemental copy. No raw task / reflection text is read
 *     or returned, so the result is safe to bucket for analytics.
 *
 * Caller is responsible for actually applying any change — this module only
 * recommends, never mutates state.
 */

// ---- Public types -----------------------------------------------------------

export type RescueSeverity = "none" | "gentle" | "active" | "urgent";

export type RescueTriggerId =
  | "overdue-tasks"
  | "no-completion-streak"
  | "missed-checkins"
  | "low-week-completion-near-end"
  | "weekly-review-missed";

export type RescueSuggestionId =
  | "pick-one-tiny-task"
  | "reschedule-non-core"
  | "quick-check-in"
  | "reduce-week-load"
  | "review-plan";

export interface RescueSuggestion {
  id: RescueSuggestionId;
  title: string;
  hint: string;
}

export interface RescueModeStatus {
  severity: RescueSeverity;
  triggers: RescueTriggerId[];
  daysSinceLastCompletion: number | null;
  daysSinceLastCheckIn: number | null;
  daysRemainingInWeek: number | null;
}

export interface RescueModeMessage {
  headline: string;
  subtext: string;
}

/**
 * Light-weight input. Mirrors fields already exposed by
 * `useTwelveWeekSystemSnapshot` so the caller doesn't need to import storage
 * types directly.
 */
export interface RescueModeInput {
  /** Today's local date key in YYYY-MM-DD. */
  todayDateKey: string;
  /** Current week number 1..12 (matches `system.currentWeek`). */
  currentWeek: number;
  /** Current cycle week range. `null` when system is not active. */
  currentWeekRange: { start: string; end: string } | null;
  /** 0..100 — `weekCompletion.percent`. */
  weekCompletionPercent: number;
  /** Open overdue tasks count. */
  overdueOpenCount: number;
  /** Today's queue size (not used for triggers; reserved for callers). */
  todayQueueCount?: number;
  /** Whether weekly review is due today. */
  reviewDueToday: boolean;
  /** All daily check-ins on the system (id-free shape). */
  dailyCheckIns: ReadonlyArray<{ date: string }>;
  /** All weekly reviews on the system. */
  weeklyReviews: ReadonlyArray<{ weekNumber: number; reviewCompleted?: boolean }>;
  /** All task instances on the system (we read scheduledDate / completed / completedAt). */
  taskInstances: ReadonlyArray<{
    scheduledDate: string;
    completed: boolean;
    completedAt?: string;
  }>;
  /** Plan start date ISO string — used for cold-start guard. */
  startDate?: string;
}

// ---- Internal constants -----------------------------------------------------

const OVERDUE_GENTLE_THRESHOLD = 3;
const OVERDUE_ACTIVE_THRESHOLD = 5;
const NO_COMPLETION_GENTLE_DAYS = 3;
const NO_COMPLETION_ACTIVE_DAYS = 5;
const MISSED_CHECKIN_GENTLE_DAYS = 3;
const LOW_WEEK_COMPLETION_PERCENT = 50;
const LOW_WEEK_COMPLETION_DAYS_REMAINING = 2;
const COLD_START_DAYS = 3;

// ---- Pure date helpers ------------------------------------------------------

function isValidDateKey(value: string | undefined | null): value is string {
  if (!value) return false;
  // Accept YYYY-MM-DD prefix (full ISO timestamps also accepted).
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

function differenceInDays(later: string, earlier: string): number {
  const a = Date.parse(`${toDateKey(later)}T00:00:00Z`);
  const b = Date.parse(`${toDateKey(earlier)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86_400_000);
}

function maxDateKey(values: ReadonlyArray<string>): string | null {
  let max: string | null = null;
  for (const value of values) {
    if (!isValidDateKey(value)) continue;
    const key = toDateKey(value);
    if (max === null || key > max) max = key;
  }
  return max;
}

// ---- Trigger evaluators -----------------------------------------------------

interface TriggerContribution {
  id: RescueTriggerId;
  severity: Exclude<RescueSeverity, "none">;
}

function evaluateOverdueTasks(input: RescueModeInput): TriggerContribution | null {
  const count = input.overdueOpenCount;
  if (count >= OVERDUE_ACTIVE_THRESHOLD) {
    return { id: "overdue-tasks", severity: "active" };
  }
  if (count >= OVERDUE_GENTLE_THRESHOLD) {
    return { id: "overdue-tasks", severity: "gentle" };
  }
  return null;
}

function evaluateNoCompletionStreak(
  input: RescueModeInput,
  daysSinceLastCompletion: number | null,
  daysSincePlanStart: number | null,
): TriggerContribution | null {
  // If plan is fresh (cold start), don't penalise lack of completions.
  if (daysSincePlanStart !== null && daysSincePlanStart < COLD_START_DAYS) return null;

  if (daysSinceLastCompletion === null) {
    // No completion ever and plan has been around for ≥ COLD_START_DAYS.
    if (daysSincePlanStart !== null && daysSincePlanStart >= NO_COMPLETION_GENTLE_DAYS) {
      return { id: "no-completion-streak", severity: "gentle" };
    }
    return null;
  }

  if (daysSinceLastCompletion >= NO_COMPLETION_ACTIVE_DAYS) {
    return { id: "no-completion-streak", severity: "active" };
  }
  if (daysSinceLastCompletion >= NO_COMPLETION_GENTLE_DAYS) {
    return { id: "no-completion-streak", severity: "gentle" };
  }
  return null;
}

function evaluateMissedCheckIns(
  daysSinceLastCheckIn: number | null,
  daysSincePlanStart: number | null,
): TriggerContribution | null {
  if (daysSincePlanStart !== null && daysSincePlanStart < COLD_START_DAYS) return null;

  if (daysSinceLastCheckIn === null) {
    if (daysSincePlanStart !== null && daysSincePlanStart >= MISSED_CHECKIN_GENTLE_DAYS) {
      return { id: "missed-checkins", severity: "gentle" };
    }
    return null;
  }
  if (daysSinceLastCheckIn >= MISSED_CHECKIN_GENTLE_DAYS) {
    return { id: "missed-checkins", severity: "gentle" };
  }
  return null;
}

function evaluateLowWeekCompletion(
  input: RescueModeInput,
  daysRemainingInWeek: number | null,
): TriggerContribution | null {
  if (daysRemainingInWeek === null) return null;
  if (daysRemainingInWeek < 0 || daysRemainingInWeek > LOW_WEEK_COMPLETION_DAYS_REMAINING) {
    return null;
  }
  if (input.weekCompletionPercent < LOW_WEEK_COMPLETION_PERCENT) {
    return { id: "low-week-completion-near-end", severity: "active" };
  }
  return null;
}

function evaluateWeeklyReviewMissed(input: RescueModeInput): TriggerContribution | null {
  if (input.currentWeek < 2) return null;
  const previousWeek = input.currentWeek - 1;
  const review = input.weeklyReviews.find((entry) => entry.weekNumber === previousWeek);
  if (review && review.reviewCompleted === true) return null;
  return { id: "weekly-review-missed", severity: "gentle" };
}

// ---- Severity utilities -----------------------------------------------------

const SEVERITY_RANK: Record<RescueSeverity, number> = {
  none: 0,
  gentle: 1,
  active: 2,
  urgent: 3,
};

function escalate(current: RescueSeverity, next: RescueSeverity): RescueSeverity {
  return SEVERITY_RANK[next] > SEVERITY_RANK[current] ? next : current;
}

// ---- Public API -------------------------------------------------------------

export function getRescueModeStatus(input: RescueModeInput): RescueModeStatus {
  // --- Derived deltas
  const completedDates = input.taskInstances
    .filter((task) => task.completed)
    .map((task) => task.completedAt ?? task.scheduledDate)
    .filter(isValidDateKey)
    .map(toDateKey);
  const lastCompletionKey = maxDateKey(completedDates);
  const daysSinceLastCompletion =
    lastCompletionKey && isValidDateKey(input.todayDateKey)
      ? Math.max(0, differenceInDays(input.todayDateKey, lastCompletionKey))
      : null;

  const checkInDates = input.dailyCheckIns
    .map((entry) => entry.date)
    .filter(isValidDateKey)
    .map(toDateKey);
  const lastCheckInKey = maxDateKey(checkInDates);
  const daysSinceLastCheckIn =
    lastCheckInKey && isValidDateKey(input.todayDateKey)
      ? Math.max(0, differenceInDays(input.todayDateKey, lastCheckInKey))
      : null;

  const daysRemainingInWeek =
    input.currentWeekRange && isValidDateKey(input.currentWeekRange.end) && isValidDateKey(input.todayDateKey)
      ? differenceInDays(input.currentWeekRange.end, input.todayDateKey)
      : null;

  const daysSincePlanStart =
    input.startDate && isValidDateKey(input.startDate) && isValidDateKey(input.todayDateKey)
      ? Math.max(0, differenceInDays(input.todayDateKey, input.startDate))
      : null;

  // --- Run trigger evaluators
  const contributions: TriggerContribution[] = [];
  const overdue = evaluateOverdueTasks(input);
  if (overdue) contributions.push(overdue);
  const noCompletion = evaluateNoCompletionStreak(input, daysSinceLastCompletion, daysSincePlanStart);
  if (noCompletion) contributions.push(noCompletion);
  const missedCheckIns = evaluateMissedCheckIns(daysSinceLastCheckIn, daysSincePlanStart);
  if (missedCheckIns) contributions.push(missedCheckIns);
  const lowCompletion = evaluateLowWeekCompletion(input, daysRemainingInWeek);
  if (lowCompletion) contributions.push(lowCompletion);
  const reviewMissed = evaluateWeeklyReviewMissed(input);
  if (reviewMissed) contributions.push(reviewMissed);

  // --- Aggregate severity
  let severity: RescueSeverity = "none";
  for (const contrib of contributions) {
    severity = escalate(severity, contrib.severity);
  }
  // Escalate to urgent when 3+ active/gentle triggers fire together.
  if (contributions.length >= 3 && severity === "active") {
    severity = "urgent";
  }

  return {
    severity,
    triggers: contributions.map((c) => c.id),
    daysSinceLastCompletion,
    daysSinceLastCheckIn,
    daysRemainingInWeek,
  };
}

const HEADLINE_BY_SEVERITY: Record<RescueSeverity, string> = {
  none: "Bạn đang giữ nhịp tốt — không cần cứu nhịp.",
  gentle: "Có một vài tín hiệu nhỏ — chỉ cần một bước nhẹ là đủ.",
  active: "Tuần đang lệch nhịp một chút — cùng quay lại bằng việc nhỏ.",
  urgent: "Nhiều thứ đang dồn lại — đừng cố làm hết, chọn 1 việc nhỏ thôi.",
};

const TRIGGER_SUBTEXT: Record<RescueTriggerId, (status: RescueModeStatus) => string> = {
  "overdue-tasks": () => "Một số việc đang bị trễ — gọn nhẹ tuần này quan trọng hơn làm hết.",
  "no-completion-streak": (status) =>
    status.daysSinceLastCompletion !== null
      ? `${status.daysSinceLastCompletion} ngày chưa có việc nào được chốt — bắt đầu lại bằng việc 5 phút.`
      : "Chưa có việc nào được chốt — bắt đầu lại bằng việc 5 phút.",
  "missed-checkins": (status) =>
    status.daysSinceLastCheckIn !== null
      ? `${status.daysSinceLastCheckIn} ngày chưa có check-in — chỉ cần 30 giây để giữ nhịp ghi nhớ.`
      : "Chưa có check-in nào — chỉ cần 30 giây để giữ nhịp ghi nhớ.",
  "low-week-completion-near-end": (status) =>
    status.daysRemainingInWeek !== null
      ? `Tuần này còn ${status.daysRemainingInWeek} ngày, tiến độ chưa quá 50% — chốt 1 việc cốt lõi là đủ.`
      : "Tuần này tiến độ còn thấp — chốt 1 việc cốt lõi là đủ.",
  "weekly-review-missed": () =>
    "Bạn chưa chốt review tuần trước — 3 phút phản tư sẽ giúp tuần này nhẹ hơn.",
};

export function getRescueModeMessage(status: RescueModeStatus): RescueModeMessage {
  const headline = HEADLINE_BY_SEVERITY[status.severity];
  if (status.severity === "none" || status.triggers.length === 0) {
    return { headline, subtext: "" };
  }
  // Subtext = subtext of the first (highest priority) trigger.
  const firstTrigger = status.triggers[0];
  const subtext = TRIGGER_SUBTEXT[firstTrigger](status);
  return { headline, subtext };
}

const SUGGESTION_LIBRARY: Record<RescueSuggestionId, Omit<RescueSuggestion, "id">> = {
  "pick-one-tiny-task": {
    title: "Chọn 1 việc nhỏ làm hôm nay",
    hint: "Phiên bản 5-10 phút của 1 việc cốt lõi. Quan trọng là bắt đầu, không phải làm hết.",
  },
  "reschedule-non-core": {
    title: "Dời các việc tùy chọn sang sau",
    hint: "Giữ việc cốt lõi, dời nhẹ các việc tùy chọn xuống cuối tuần hoặc tuần sau.",
  },
  "quick-check-in": {
    title: "Check-in 30 giây",
    hint: "Chọn năng lượng + 1 dòng note. Không cần kết quả, chỉ cần giữ nhịp ghi nhớ.",
  },
  "reduce-week-load": {
    title: "Giảm tải tuần này",
    hint: "Chỉ giữ 1-2 việc cốt lõi cho phần còn lại. Tuần sau quay lại nhịp đầy đủ.",
  },
  "review-plan": {
    title: "Xem lại kế hoạch — đừng bỏ mục tiêu",
    hint: "Kế hoạch chệch không đồng nghĩa với mục tiêu sai. Mở Setup chỉnh nhịp, không reset từ đầu.",
  },
};

const TRIGGER_TO_SUGGESTIONS: Record<RescueTriggerId, RescueSuggestionId[]> = {
  "overdue-tasks": ["pick-one-tiny-task", "reschedule-non-core"],
  "no-completion-streak": ["pick-one-tiny-task", "reduce-week-load"],
  "missed-checkins": ["quick-check-in"],
  "low-week-completion-near-end": ["pick-one-tiny-task", "reduce-week-load"],
  "weekly-review-missed": ["review-plan", "quick-check-in"],
};

export function getRescueActionSuggestion(status: RescueModeStatus): RescueSuggestion[] {
  if (status.severity === "none" || status.triggers.length === 0) return [];

  // Build ordered suggestion list following trigger priority, dedup by id.
  const seen = new Set<RescueSuggestionId>();
  const ordered: RescueSuggestionId[] = [];
  for (const trigger of status.triggers) {
    for (const suggestionId of TRIGGER_TO_SUGGESTIONS[trigger]) {
      if (seen.has(suggestionId)) continue;
      seen.add(suggestionId);
      ordered.push(suggestionId);
    }
  }
  // V1: cap at 3 suggestions to avoid overwhelm.
  const MAX_SUGGESTIONS = 3;
  let final: RescueSuggestionId[] = ordered.slice(0, MAX_SUGGESTIONS);

  // Always anchor with `review-plan` for active/urgent severity so users see
  // an option to revisit their plan rather than abandon the goal. Reserve the
  // last slot if it hasn't already been suggested.
  const anchorReviewPlan = status.severity === "active" || status.severity === "urgent";
  if (anchorReviewPlan && !final.includes("review-plan")) {
    if (final.length >= MAX_SUGGESTIONS) {
      final = [...final.slice(0, MAX_SUGGESTIONS - 1), "review-plan"];
    } else {
      final.push("review-plan");
    }
  }

  return final.map((id) => ({ id, ...SUGGESTION_LIBRARY[id] }));
}
