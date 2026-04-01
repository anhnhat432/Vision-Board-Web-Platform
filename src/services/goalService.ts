import { delete as del, get, patch, post } from "@/lib/api/apiClient";

export interface OnboardingTask {
  title: string;
  completed: boolean;
}

export type GoalStatus = "active" | "completed" | "archived";

export interface ApiGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  deadline: string;
  status: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  title: string;
  category: string;
  description: string;
  deadline: string;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

export interface UpdateGoalPayload {
  title?: string;
  category?: string;
  description?: string;
  deadline?: string;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

export function createGoal(payload: CreateGoalPayload): Promise<ApiGoal> {
  return post<ApiGoal, CreateGoalPayload>("/goals", payload);
}

export function getGoals(): Promise<ApiGoal[]> {
  return get<ApiGoal[]>("/goals");
}

export function getGoal(goalId: string): Promise<ApiGoal> {
  return get<ApiGoal>(`/goals/${goalId}`);
}

export function updateGoal(goalId: string, payload: UpdateGoalPayload): Promise<ApiGoal> {
  return patch<ApiGoal, UpdateGoalPayload>(`/goals/${goalId}`, payload);
}

export function deleteGoal(goalId: string): Promise<{ deleted: boolean }> {
  return del<{ deleted: boolean }>(`/goals/${goalId}`);
}
