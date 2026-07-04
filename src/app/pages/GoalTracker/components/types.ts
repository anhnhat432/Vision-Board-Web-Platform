import type { Goal, TwelveWeekSystem } from "@/app/utils/storage";

export interface GoalCompletionDetails {
  completedAtStr: string;
  completedTasks: number;
  totalTasks: number;
}

export interface HealthStatus {
  label: string;
  bgClass: string;
}

export interface FocusGoalData {
  goal: Goal;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  isTwelveWeek: boolean;
  type: "today_tasks" | "review_due" | "due_warning" | "first_active_12week";
}

export interface GoalMetadata {
  goal: Goal;
  progress: number;
  daysLeft: number | null;
  isOverdue: boolean;
  isNearDeadline: boolean;
  isAtRisk: boolean;
  isCompleted: boolean;
  isTwelveWeek: boolean;
  isSimple: boolean;
}

export interface WeeklyQuestDetails {
  completedDays: number;
  targetDays: number;
  hasSchedule: boolean;
}
