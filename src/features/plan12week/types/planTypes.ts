export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  weekId?: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: string;
};

export type LeadMetricLog = {
  id?: string;
  date: string;
  value: number;
  completed: boolean;
};

export type LeadMetric = {
  id?: string;
  weekId?: string;
  name: string;
  weeklyTarget: number;
  logs: LeadMetricLog[];
};

export type WeekReview = {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
};

export type Week = {
  id?: string;
  planId?: string;
  weekNumber: number;
  focus: string;
  expectedOutput: string;
  tasks: Task[];
  leadMetrics: LeadMetric[];
  review?: WeekReview;
};

export type Plan12Week = {
  id: string;
  userId?: string;
  vision: string;
  smartGoalId: string;
  startDate: string;
  createdAt?: string;
  updatedAt?: string;
  weeks: Week[];
};
