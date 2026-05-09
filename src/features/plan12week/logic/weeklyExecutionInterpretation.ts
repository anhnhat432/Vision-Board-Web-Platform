export type WeeklyExecutionLevel = "strong" | "okay" | "at_risk";

export interface WeeklyExecutionInterpretation {
  level: WeeklyExecutionLevel;
  /** Short Vietnamese headline for the score band, safe for analytics-free UI rendering. */
  headline: string;
  /** One-line advice tied to the level - always concrete, never raw user text. */
  advice: string;
  /** Suggested workload decision aligned with the score band. */
  suggestedWorkload: "keep same" | "reduce slightly" | "increase slightly";
}

export const WEEKLY_EXECUTION_TARGET = 85;

const STRONG_THRESHOLD = WEEKLY_EXECUTION_TARGET;
const OKAY_THRESHOLD = 65;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/**
 * Map a weekly lead score (0-100) into a level + narrative the UI can render.
 * Pure function - no analytics, no I/O, never reads task text.
 */
export function interpretWeeklyExecutionScore(score: number): WeeklyExecutionInterpretation {
  const safeScore = clampScore(score);

  if (safeScore >= STRONG_THRESHOLD) {
    return {
      level: "strong",
      headline: `Tuần đạt chuẩn 85% – đang trên đà về đích (${safeScore}/100)`,
      advice: "Giữ nhịp hiện tại; đừng tăng tải quá mạnh trước khi giữ được chuẩn này thêm một tuần.",
      suggestedWorkload: "keep same",
    };
  }

  if (safeScore >= OKAY_THRESHOLD) {
    return {
      level: "okay",
      headline: `Dưới chuẩn 85% – cần chỉnh nhỏ tuần sau (${safeScore}/100)`,
      advice: "Chọn 1-2 cam kết bị trượt, chỉnh lịch hoặc giảm việc phụ để kéo Lead Score lên 85%.",
      suggestedWorkload: "keep same",
    };
  }

  return {
    level: "at_risk",
    headline: `Đang trượt nhịp – tuần sau giảm tải, giữ 1-2 việc cốt lõi (${safeScore}/100)`,
    advice: "Giảm tải tuần sau, chỉ giữ 1-2 việc cốt lõi và khóa thời điểm làm cụ thể.",
    suggestedWorkload: "reduce slightly",
  };
}
