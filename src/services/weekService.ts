import { get, patch, post } from "@/lib/api/apiClient";
import type { Week } from "@/types/plan";

export interface UpdateWeekPayload {
  focus?: string;
  expectedOutput?: string;
}

export interface UpdateWeekReviewPayload {
  weekNumber?: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

export function getWeeks(planId: string): Promise<Week[]> {
  return get<Week[]>(`/plans/${planId}/weeks`);
}

export function updateWeek(weekId: string, payload: UpdateWeekPayload): Promise<Week> {
  return patch<Week, UpdateWeekPayload>(`/weeks/${weekId}`, payload);
}

export function updateWeekReview(
  weekId: string,
  payload: UpdateWeekReviewPayload,
): Promise<Week> {
  return post<Week, UpdateWeekReviewPayload>(`/weeks/${weekId}/review`, payload);
}

export function submitWeeklyReview(
  weekId: string,
  payload: UpdateWeekReviewPayload,
): Promise<Week> {
  return updateWeekReview(weekId, payload);
}
