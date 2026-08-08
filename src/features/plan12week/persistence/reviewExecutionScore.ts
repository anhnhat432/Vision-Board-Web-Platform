import type { UniversalWeeklyReview } from "@/app/utils/storage-types";

export function getUniversalWeeklyReviewExecutionScore(review: UniversalWeeklyReview, fallback = 0): number {
  if (Number.isFinite(review.executionScore) && Number(review.executionScore) >= 0) {
    return Math.min(Math.round(Number(review.executionScore)), 100);
  }

  if (Number.isFinite(review.leadCompletionPercent) && review.leadCompletionPercent >= 0) {
    return Math.min(Math.round(review.leadCompletionPercent), 100);
  }

  const scores = [
    review.progressScore,
    review.disciplineScore,
    review.focusScore,
    review.improvementScore,
    review.outputQualityScore,
  ].filter((score): score is number => typeof score === "number" && Number.isFinite(score) && score > 0);

  if (scores.length === 0) return fallback;

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const scale = average <= 5 ? 20 : 10;
  return Math.round(average * scale);
}
