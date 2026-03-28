import { clampToUnitInterval } from "./normalizeQuestionScore";

export type DimensionStatus = "strong" | "moderate" | "weak";

export function getDimensionStatus(score: number): DimensionStatus {
  const normalized = clampToUnitInterval(score);

  if (normalized >= 0.7) return "strong";
  if (normalized >= 0.5) return "moderate";
  return "weak";
}
