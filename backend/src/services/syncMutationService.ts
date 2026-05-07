// ─── Compatibility re-exports ───────────────────────────────────
// Toàn bộ logic đã được chuyển sang sync-mutations/ module.
// File này giữ lại để test và các file khác không bị gãy import.

export {
  SYNC_MUTATION_TYPES,
  hashPayload,
  SyncMutationOrchestrator as SyncMutationService,
  MongoSyncTaskMutationRepository,
  MongoSyncWorkspaceMutationRepository,
  type SyncMutationType,
  type SyncMutationResult,
  type SyncMutationBatchResult,
  type ValidatedMutation,
  type HandlerResult,
  type SyncTaskMutationRepository,
  type TaskCompletedChangedApplyInput,
  type AppliedTaskMutationEntity,
  type SyncWorkspaceMutationRepository,
  type DailyCheckInUpsertApplyInput,
  type WeeklyReviewUpsertApplyInput,
  type PlanSnapshotWeekUpdateInput,
  type PlanSnapshotUpdatedApplyInput,
  type LeadMetricUpsertApplyInput,
  type AppliedWorkspaceMutationEntity,
} from "./sync-mutations";

import {
  SyncMutationOrchestrator,
  MongoSyncTaskMutationRepository,
  MongoSyncWorkspaceMutationRepository,
  TaskCompletedChangedHandler,
  DailyCheckInUpsertHandler,
  LeadMetricUpsertHandler,
  WeeklyReviewUpsertHandler,
  PlanSnapshotUpdatedHandler,
  PlanSnapshotUpsertHandler,
  TaskUpsertHandler,
} from "./sync-mutations";
import { MongoSyncMutationLogRepository } from "../repositories/mongo/MongoSyncMutationLogRepository";

// ─── Deprecated singleton (for test compatibility) ───────────────
export const syncMutationService = new SyncMutationOrchestrator(
  new MongoSyncMutationLogRepository(),
  new MongoSyncTaskMutationRepository(),
  new MongoSyncWorkspaceMutationRepository(),
);

syncMutationService.registerAll([
  new TaskCompletedChangedHandler(),
  new DailyCheckInUpsertHandler(),
  new LeadMetricUpsertHandler(),
  new WeeklyReviewUpsertHandler(),
  new PlanSnapshotUpdatedHandler(),
  new PlanSnapshotUpsertHandler(),
  new TaskUpsertHandler(),
]);
