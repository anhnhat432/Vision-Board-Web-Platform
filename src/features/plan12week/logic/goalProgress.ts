import type { GoalProgress } from "../types/goalProgress";

function sanitizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function calculateGoalProgress(progress: GoalProgress): number {
  const baseline = sanitizeNumber(progress.baseline);
  const current = sanitizeNumber(progress.current);
  const target = sanitizeNumber(progress.target);
  const denominator = target - baseline;

  if (denominator === 0) {
    return 0;
  }

  const percent = ((current - baseline) / denominator) * 100;
  return clampPercentage(percent);
}
