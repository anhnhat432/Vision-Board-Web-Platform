import { FEASIBILITY_WEIGHTS } from "./config";
import type { DimensionScores } from "./dimensionScore";
import { clampToUnitInterval } from "./normalizeQuestionScore";

export function calculateFeasibilityScore(scores: DimensionScores): number {
  return clampToUnitInterval(
    scores.capacity * FEASIBILITY_WEIGHTS.capacity +
      scores.readiness * FEASIBILITY_WEIGHTS.readiness +
      scores.risk * FEASIBILITY_WEIGHTS.risk +
      scores.context * FEASIBILITY_WEIGHTS.context,
  );
}
