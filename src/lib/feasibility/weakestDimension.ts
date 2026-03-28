import type { DimensionKey, DimensionScores } from "./dimensionScore";

const DIMENSION_ORDER: readonly DimensionKey[] = [
  "capacity",
  "readiness",
  "risk",
  "context",
];

export function getWeakestDimension(scores: DimensionScores): DimensionKey {
  let weakestKey = DIMENSION_ORDER[0];
  let weakestScore = scores[weakestKey];

  for (const key of DIMENSION_ORDER.slice(1)) {
    if (scores[key] < weakestScore) {
      weakestKey = key;
      weakestScore = scores[key];
    }
  }

  return weakestKey;
}
