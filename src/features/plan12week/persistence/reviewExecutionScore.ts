import type { UniversalWeeklyReview } from "@/app/utils/storage-types";

export function getUniversalWeeklyReviewExecutionScore(
  review: UniversalWeeklyReview,
  fallback = 0,
): number {
  const scores = [
    review.progressScore,
    review.disciplineScore,
    review.focusScore,
    review.improvementScore,
    review.outputQualityScore,
  ].filter((score) => Number.isFinite(score) && score > 0);

  if (scores.length === 0) return fallback;

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const scale = average <= 5 ? 20 : 10;
  return Math.round(average * scale);
}
