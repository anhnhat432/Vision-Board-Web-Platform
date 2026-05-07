// ─── Types ──────────────────────────────────────────────────────
export {
  SYNC_MUTATION_TYPES,
  hashPayload,
  type SyncMutationType,
  type SyncMutationResult,
  type SyncMutationBatchResult,
  type ValidatedMutation,
  type HandlerResult,
} from "./types";

// ─── Strategy Interface ─────────────────────────────────────────
export {
  MutationHandlerStrategy,
  type HandlerApplyContext,
} from "./MutationHandlerStrategy";

// ─── Orchestrator ───────────────────────────────────────────────
export {
  SyncMutationOrchestrator,
  type SyncMutationLogAdapter,
} from "./SyncMutationOrchestrator";

// ─── Handlers ───────────────────────────────────────────────────
export { TaskCompletedChangedHandler } from "./handlers/TaskCompletedChangedHandler";
export { DailyCheckInUpsertHandler } from "./handlers/DailyCheckInUpsertHandler";
export { LeadMetricUpsertHandler } from "./handlers/LeadMetricUpsertHandler";
export { WeeklyReviewUpsertHandler } from "./handlers/WeeklyReviewUpsertHandler";
export { PlanSnapshotUpdatedHandler } from "./handlers/PlanSnapshotUpdatedHandler";
export { PlanSnapshotUpsertHandler } from "./handlers/PlanSnapshotUpsertHandler";
export { TaskUpsertHandler } from "./handlers/TaskUpsertHandler";

// ─── Mongo Repositories ─────────────────────────────────────────
export { MongoSyncTaskMutationRepository } from "./repositories/MongoSyncTaskMutationRepository";
export { MongoSyncWorkspaceMutationRepository } from "./repositories/MongoSyncWorkspaceMutationRepository";

// ─── Repositories ───────────────────────────────────────────────
export type {
  SyncTaskMutationRepository,
  TaskCompletedChangedApplyInput,
  AppliedTaskMutationEntity,
} from "./repositories/SyncTaskMutationRepository";

export type {
  SyncWorkspaceMutationRepository,
  DailyCheckInUpsertApplyInput,
  WeeklyReviewUpsertApplyInput,
  PlanSnapshotWeekUpdateInput,
  PlanSnapshotUpdatedApplyInput,
  LeadMetricUpsertApplyInput,
  AppliedWorkspaceMutationEntity,
} from "./repositories/SyncWorkspaceMutationRepository";