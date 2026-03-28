export type TaskStatus = "todo" | "doing" | "done";

export interface WeekReview {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

export interface Task {
  id: string;
  weekId: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricLog {
  id: string;
  date: string;
  value: number;
  completed: boolean;
}

export interface Metric {
  id: string;
  weekId: string;
  name: string;
  weeklyTarget: number;
  logs: MetricLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Week {
  id: string;
  planId: string;
  weekNumber: number;
  focus: string;
  expectedOutput: string;
  review?: WeekReview;
  createdAt: string;
  updatedAt: string;
}

export interface WeekDetails extends Week {
  tasks: Task[];
  metrics: Metric[];
}

export interface Plan {
  id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetails {
  plan: Plan;
  weeks: WeekDetails[];
}
