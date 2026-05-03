import type { UniversalWeeklyReview } from "@/app/utils/storage-types";

export interface WeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  keepTactic: string;
  reduceTactic: string;
  nextWeekPriority: string;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
}
