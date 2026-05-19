export type ProgressTrendLevel = "no_data" | "early" | "on_track" | "slowing" | "at_risk";

export type ProgressTrendDirection = "up" | "flat" | "down" | "n/a";

export interface ProgressTrendInterpretation {
  level: ProgressTrendLevel;
  /** Short Vietnamese headline summarizing where the user is right now. */
  headline: string;
  /** One-line advice — never judgmental, never references raw user task text. */
  advice: string;
  /** Concrete next step the user can take from here. */
  nextAction: string;
  /** Week-over-week trend signal compared to the previous reviewed week. */
  trendDirection: ProgressTrendDirection;
  /** Numeric delta between current and previous week scores. `null` when no previous week. */
  weekOverWeekDelta: number | null;
}

export interface ProgressTrendInput {
  /** 1-indexed current week number within the cycle. */
  currentWeek: number;
  totalWeeks: number;
  /** Score (0-100) for the current active week. */
  currentWeekScore: number;
  /** Score for the most recent previous week, or null when there is no previous week. */
  previousWeekScore: number | null;
  /** Average score across the cycle so far (0-100). */
  averageScore: number;
  /** Number of weeks with completed reviews (0..totalWeeks). */
  reviewDoneCount: number;
  /** Whether today is the planned review day. */
  reviewDueToday: boolean;
  /** False only when the cycle has no tasks at all (no plan / no lead indicators). */
  hasAnyTasks: boolean;
}

const TREND_DELTA_THRESHOLD = 5;
const AT_RISK_SCORE_THRESHOLD = 30;
const SLOWING_SCORE_THRESHOLD = 60;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function classifyDirection(delta: number | null): ProgressTrendDirection {
  if (delta === null) return "n/a";
  if (delta >= TREND_DELTA_THRESHOLD) return "up";
  if (delta <= -TREND_DELTA_THRESHOLD) return "down";
  return "flat";
}

/**
 * Map progress signals into a friendly narrative the Progress tab can render.
 * Pure function — no analytics, no I/O, never reads task or review text.
 */
export function interpretProgressTrend(input: ProgressTrendInput): ProgressTrendInterpretation {
  const currentScore = clampScore(input.currentWeekScore);
  const previousScore = input.previousWeekScore === null ? null : clampScore(input.previousWeekScore);
  const delta = previousScore === null ? null : currentScore - previousScore;
  const direction = classifyDirection(delta);

  // 1. No data at all (no plan / no tasks) → guide to setup
  if (!input.hasAnyTasks) {
    return {
      level: "no_data",
      headline: "Chưa có dữ liệu tiến độ",
      advice: "Chu kỳ chưa có việc lặp lại nào, nên hệ thống chưa thể tính nhịp.",
      nextAction: "Vào Setup để thêm việc lặp lại trước.",
      trendDirection: "n/a",
      weekOverWeekDelta: null,
    };
  }

  // 2. Very early in the cycle and no review yet → reassure, don't shame
  if (input.currentWeek <= 1 && input.reviewDoneCount === 0) {
    return {
      level: "early",
      headline: "Mới bắt đầu — cứ tập trung tuần này",
      advice: "Tuần 1 chưa có gì để so sánh. Cứ làm đều, dữ liệu sẽ rõ dần từ tuần 2.",
      nextAction: "Mở tab Hôm nay và làm việc quan trọng nhất.",
      trendDirection: direction,
      weekOverWeekDelta: delta,
    };
  }

  // 3. Score under at-risk threshold → rescue (no judgment)
  if (currentScore < AT_RISK_SCORE_THRESHOLD) {
    return {
      level: "at_risk",
      headline: "Tuần này đang đuối",
      advice: "Đừng ép làm hết — chốt được 1 việc cốt lõi đã là khôi phục nhịp.",
      nextAction: input.reviewDueToday
        ? "Chốt review để chọn cách giảm tải cho tuần sau."
        : "Mở tab Hôm nay và tick 1 việc cốt lõi.",
      trendDirection: direction,
      weekOverWeekDelta: delta,
    };
  }

  // 4. Slowing down or below mid threshold → encourage rescue
  if (currentScore < SLOWING_SCORE_THRESHOLD || direction === "down") {
    return {
      level: "slowing",
      headline: direction === "down" ? "Nhịp đang chậm hơn tuần trước" : "Tuần này còn chỗ để cải thiện",
      advice: "Việc đang dồn — chia nhỏ hoặc cân nhắc giảm tải nhẹ tuần sau.",
      nextAction: input.reviewDueToday
        ? "Chốt review tuần để khóa hướng cho tuần sau."
        : "Mở tab Hôm nay và làm việc cốt lõi trước.",
      trendDirection: direction,
      weekOverWeekDelta: delta,
    };
  }

  // 5. On track or improving → reinforce
  const improving = direction === "up";
  return {
    level: "on_track",
    headline: improving ? "Tuần này khá hơn tuần trước" : "Đang giữ nhịp tốt",
    advice: improving
      ? "Giữ chính xác cách làm tuần này, đó là phần đang chạy đúng."
      : "Cấu hình hiện tại đang hợp với bạn, giữ nguyên là đủ.",
    nextAction: input.reviewDueToday ? "Chốt review để khóa nhịp cho tuần sau." : "Mở tab Hôm nay tiếp tục giữ nhịp.",
    trendDirection: direction,
    weekOverWeekDelta: delta,
  };
}
