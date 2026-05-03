export type WeeklyExecutionLevel = "strong" | "okay" | "at_risk";

export interface WeeklyExecutionInterpretation {
  level: WeeklyExecutionLevel;
  /** Short Vietnamese headline for the score band, safe for analytics-free UI rendering. */
  headline: string;
  /** One-line advice tied to the level — always concrete, never raw user text. */
  advice: string;
  /** Suggested workload decision aligned with the score band. */
  suggestedWorkload: "keep same" | "reduce slightly" | "increase slightly";
}

const STRONG_THRESHOLD = 80;
const OKAY_THRESHOLD = 50;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/**
 * Map a weekly execution score (0-100) into a level + narrative the UI can render.
 * Pure function — no analytics, no I/O, never reads task text.
 */
export function interpretWeeklyExecutionScore(score: number): WeeklyExecutionInterpretation {
  const safeScore = clampScore(score);

  if (safeScore >= STRONG_THRESHOLD) {
    return {
      level: "strong",
      headline: `Tuần chạy mạnh (${safeScore}/100)`,
      advice: "Giữ nhịp, có thể đẩy nhẹ một việc cốt lõi nếu còn năng lượng.",
      suggestedWorkload: "keep same",
    };
  }

  if (safeScore >= OKAY_THRESHOLD) {
    return {
      level: "okay",
      headline: `Tuần đủ ổn (${safeScore}/100)`,
      advice: "Có chỗ chưa trơn — tuần sau giữ nguyên tải, ưu tiên rõ một việc.",
      suggestedWorkload: "keep same",
    };
  }

  return {
    level: "at_risk",
    headline: `Tuần đang đuối (${safeScore}/100)`,
    advice: "Tuần sau nên giảm tải, chỉ giữ 1-2 việc cốt lõi để khôi phục nhịp.",
    suggestedWorkload: "reduce slightly",
  };
}
