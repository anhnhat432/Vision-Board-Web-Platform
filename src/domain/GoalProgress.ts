export interface GoalProgress {
  id: string;
  planId: string;
  baseline: number;
  current: number;
  target: number;
  createdAt: string;
  updatedAt: string;
}
