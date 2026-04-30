import { post } from "@/lib/api/apiClient";
import type { DataMutationItem, DataMutationKind, DataMutationPayload } from "@/features/plan12week/persistence/mutationQueue";

export type TwelveWeekMutationResultStatus =
  | "accepted"
  | "duplicate"
  | "applied"
  | "noop"
  | "conflict"
  | "failed"
  | "failed_validation"
  | "failed_dependency"
  | "failed_not_found";

export interface TwelveWeekMutationRequestItem {
  mutationId: string;
  idempotencyKey: string;
  type: DataMutationKind;
  clientTimestamp: string;
  entity: {
    clientGoalId: string;
    clientPlanId?: string | null;
    clientWeekId?: string | null;
    clientTaskId?: string | null;
  };
  baseRevision?: number;
  payload: DataMutationPayload;
}

export interface TwelveWeekMutationBatchRequest {
  batchId: string;
  clientGeneratedAt: string;
  mutations: TwelveWeekMutationRequestItem[];
}

export interface TwelveWeekMutationResult {
  mutationId: string;
  type?: DataMutationKind;
  status: TwelveWeekMutationResultStatus;
  message?: string;
  reason?: string;
}

export interface TwelveWeekMutationBatchResponse {
  batchId?: string;
  status?: string;
  accepted?: TwelveWeekMutationResult[];
  duplicate?: TwelveWeekMutationResult[];
  failed?: TwelveWeekMutationResult[];
  results?: TwelveWeekMutationResult[];
  summary?: {
    accepted?: number;
    duplicate?: number;
    failed?: number;
    applied?: number;
    noop?: number;
    conflicts?: number;
  };
}

function getClientPlanId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientPlanId ?? item.planId;
  return item.planId;
}

function getClientWeekId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientWeekId;
  return undefined;
}

function getClientTaskId(item: DataMutationItem): string | null | undefined {
  if (item.kind === "task_completed_changed") return item.payload.clientTaskId ?? item.payload.taskId;
  return undefined;
}

export function toTwelveWeekMutationRequestItem(item: DataMutationItem): TwelveWeekMutationRequestItem {
  return {
    mutationId: item.id,
    idempotencyKey: item.idempotencyKey,
    type: item.kind,
    clientTimestamp: item.createdAt,
    entity: {
      clientGoalId: item.goalId,
      clientPlanId: getClientPlanId(item),
      clientWeekId: getClientWeekId(item),
      clientTaskId: getClientTaskId(item),
    },
    baseRevision: item.localRevision,
    payload: item.payload,
  };
}

export function post12WeekMutations(
  payload: TwelveWeekMutationBatchRequest,
): Promise<TwelveWeekMutationBatchResponse> {
  return post<TwelveWeekMutationBatchResponse, TwelveWeekMutationBatchRequest>("/sync/12-week/mutations", payload);
}
