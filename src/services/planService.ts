import { get, patch, post } from "@/lib/api/apiClient";
import type { Plan, PlanDetails } from "@/types/plan";

export interface CreatePlanPayload {
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
  initializeWeeks?: boolean;
  totalWeeks?: number;
}

export interface UpdatePlanPayload {
  vision?: string;
  smartGoalId?: string;
  startDate?: string;
}

export function createPlan(payload: CreatePlanPayload): Promise<Plan> {
  return post<Plan, CreatePlanPayload>("/plans", payload);
}

export function getPlans(): Promise<Plan[]> {
  return get<Plan[]>("/plans");
}

export function getPlan(planId: string): Promise<PlanDetails> {
  return get<PlanDetails>(`/plans/${planId}`);
}

export function getPlanById(planId: string): Promise<PlanDetails> {
  return getPlan(planId);
}

export function updatePlan(planId: string, payload: UpdatePlanPayload): Promise<Plan> {
  return patch<Plan, UpdatePlanPayload>(`/plans/${planId}`, payload);
}
