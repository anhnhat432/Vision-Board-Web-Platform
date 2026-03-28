export interface WeekReview {
  id: string;
  weekId: string;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
  createdAt: string;
  updatedAt: string;
}
