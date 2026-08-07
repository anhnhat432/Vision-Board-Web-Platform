import { delete as deleteRequest, patch, post } from "@/lib/api/apiClient";
import { getPlanningResource } from "@/services/planningReadRequest";
import type { BulkSyncRequest, BulkSyncResponse } from "@/types/bulkSync";
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
  baseRevision?: number;
}

export function createPlan(payload: CreatePlanPayload): Promise<Plan> {
  return post<Plan, CreatePlanPayload>("/plans", payload);
}

export function getPlans(): Promise<Plan[]> {
  return getPlanningResource<Plan[]>("/plans");
}

export function getPlan(planId: string): Promise<PlanDetails> {
  return getPlanningResource<PlanDetails>(`/plans/${planId}`);
}

export function getPlanById(planId: string): Promise<PlanDetails> {
  return getPlan(planId);
}

export function updatePlan(planId: string, payload: UpdatePlanPayload): Promise<Plan> {
  return patch<Plan, UpdatePlanPayload>(`/plans/${planId}`, payload);
}

export function deletePlan(planId: string): Promise<{ deleted: boolean }> {
  return deleteRequest<{ deleted: boolean }>(`/plans/${planId}`);
}

export function bulkSyncPlan(planId: string, request: BulkSyncRequest): Promise<BulkSyncResponse> {
  return post<BulkSyncResponse, BulkSyncRequest>(`/plans/${planId}/bulk-sync`, request);
}
