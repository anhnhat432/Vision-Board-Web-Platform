import {
  getExecutionScore,
  normalizeWeekNumber,
  normalizeWorkloadDecision,
  optionalBoolean,
  optionalNumberRange,
  optionalString,
  requiredString,
} from "../validators";
import type { ImportWeeklyReviewData, ImportedWeekEntity } from "../types";

export function getWeeklyReviewImportData(
  userId: string,
  plan: Record<string, unknown>,
  review: Record<string, unknown>,
  backendPlanId: string,
  week: ImportedWeekEntity,
  importId: string,
  now: Date,
): ImportWeeklyReviewData {
  return {
    userId,
    planId: backendPlanId,
    weekId: week.id,
    clientPlanId: requiredString(review.clientPlanId ?? plan.clientPlanId, "weeklyReview.clientPlanId"),
    clientWeekId: requiredString(review.clientWeekId, "weeklyReview.clientWeekId"),
    clientReviewId: requiredString(review.clientReviewId, "weeklyReview.clientReviewId"),
    weekNumber: normalizeWeekNumber(review.weekNumber ?? week.weekNumber, "weeklyReview.weekNumber"),
    executionScore: getExecutionScore(review),
    leadCompletionPercent: optionalNumberRange(
      review.leadCompletionPercent,
      "weeklyReview.leadCompletionPercent",
      0,
      100,
    ),
    lagProgressValue: optionalString(review.lagProgressValue, "weeklyReview.lagProgressValue"),
    biggestOutputThisWeek: optionalString(review.biggestOutputThisWeek, "weeklyReview.biggestOutputThisWeek"),
    mainObstacle: optionalString(review.mainObstacle, "weeklyReview.mainObstacle"),
    nextWeekPriority: optionalString(review.nextWeekPriority, "weeklyReview.nextWeekPriority"),
    workloadDecision: normalizeWorkloadDecision(review.workloadDecision, "weeklyReview.workloadDecision"),
    reviewCompleted: optionalBoolean(review.reviewCompleted, "weeklyReview.reviewCompleted"),
    progressScore: optionalNumberRange(review.progressScore, "weeklyReview.progressScore", 0, 10),
    disciplineScore: optionalNumberRange(review.disciplineScore, "weeklyReview.disciplineScore", 0, 10),
    focusScore: optionalNumberRange(review.focusScore, "weeklyReview.focusScore", 0, 10),
    improvementScore: optionalNumberRange(review.improvementScore, "weeklyReview.improvementScore", 0, 10),
    outputQualityScore: optionalNumberRange(review.outputQualityScore, "weeklyReview.outputQualityScore", 0, 10),
    completedLeadIndicators: optionalNumberRange(
      review.completedLeadIndicators,
      "weeklyReview.completedLeadIndicators",
      0,
      100,
    ),
    importId,
    syncUpdatedAt: now,
  };
}
