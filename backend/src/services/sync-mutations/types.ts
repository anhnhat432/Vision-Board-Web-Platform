import { createHash } from "node:crypto";

export const SYNC_MUTATION_TYPES = [
  "task_completed_changed",
  "daily_check_in_upserted",
  "weekly_review_upserted",
  "plan_snapshot_updated",
  "lead_metric_upserted",
  "task_upsert",
  "daily_checkin_upsert",
  "weekly_review_upsert",
  "plan_snapshot_upsert",
] as const;

export type SyncMutationType = (typeof SYNC_MUTATION_TYPES)[number];

export interface SyncMutationResult {
  mutationId: string;
  type: SyncMutationType;
  status:
    | "accepted"
    | "applied"
    | "duplicate"
    | "failed"
    | "failed_not_found"
    | "failed_validation"
    | "conflict";
  acceptedAt?: string;
  duplicateOf?: string;
  entityType?: "task" | "daily_check_in" | "weekly_review" | "plan" | "lead_metric";
  clientId?: string;
  serverId?: string;
  revision?: number;
  syncUpdatedAt?: string;
  reason?: string;
  message?: string;
  syncErrorCode?: string;
}

export interface SyncMutationBatchResult {
  batchId?: string;
  status: "accepted" | "applied" | "partial" | "duplicate" | "failed";
  totalReceived: number;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  results: SyncMutationResult[];
  accepted: SyncMutationResult[];
  duplicate: SyncMutationResult[];
  failed: SyncMutationResult[];
  summary: {
    accepted: number;
    duplicate: number;
    failed: number;
    applied: number;
    skipped: number;
    totalReceived: number;
  };
}

export interface ValidatedMutation {
  mutationId: string;
  idempotencyKey?: string;
  type: SyncMutationType;
  clientTimestamp?: Date;
  entity?: Record<string, unknown>;
  baseRevision?: number;
  payload: Record<string, unknown>;
  payloadHash: string;
}

export type HandlerResult = SyncMutationResult | null;

export function hashPayload(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}