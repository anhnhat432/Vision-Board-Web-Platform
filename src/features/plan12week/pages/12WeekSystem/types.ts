import type { UniversalWeeklyReview } from "@/app/utils/storage-types";

export type WeeklyCommitmentStatus = "kept" | "missed" | "not_set" | "unanswered";

export interface WeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  keepTactic: string;
  reduceTactic: string;
  nextWeekPriority: string;
  commitmentStatuses: Record<string, WeeklyCommitmentStatus>;
  insights: string;
  nextWeekCommitments: string[];
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
}
