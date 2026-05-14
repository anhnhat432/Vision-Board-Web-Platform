import type { TaskStatus } from "./plan";

// ── Request types ──────────────────────────────────────────────────────

export interface BulkSyncWeekInput {
  weekId: string;
  focus?: string;
  expectedOutput?: string;
  baseRevision?: number;
}

export interface BulkSyncTaskInput {
  taskId?: string;
  weekId: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: string;
  baseRevision?: number;
}

export interface BulkSyncMetricLogInput {
  weekId: string;
  metricName: string;
  date: string;
  value: number;
  completed: boolean;
}

export interface BulkSyncReviewInput {
  weekId: string;
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
  baseRevision?: number;
}

export interface BulkSyncRequest {
  weeks?: BulkSyncWeekInput[];
  tasks?: BulkSyncTaskInput[];
  metricLogs?: BulkSyncMetricLogInput[];
  reviews?: BulkSyncReviewInput[];
}

// ── Response types ─────────────────────────────────────────────────────

export interface BulkSyncWeekResult {
  weekId: string;
  ok: boolean;
  conflict?: boolean;
  revision?: number;
  error?: string;
}

export interface BulkSyncTaskResult {
  clientTaskId?: string;
  taskId: string;
  weekId: string;
  ok: boolean;
  conflict?: boolean;
  revision?: number;
  error?: string;
}

export interface BulkSyncMetricLogResult {
  weekId: string;
  metricName: string;
  ok: boolean;
  metricId?: string;
  error?: string;
}

export interface BulkSyncReviewResult {
  weekId: string;
  ok: boolean;
  conflict?: boolean;
  revision?: number;
  error?: string;
}

export interface BulkSyncResponse {
  weeks: BulkSyncWeekResult[];
  tasks: BulkSyncTaskResult[];
  metricLogs: BulkSyncMetricLogResult[];
  reviews: BulkSyncReviewResult[];
  errors: string[];
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
}
