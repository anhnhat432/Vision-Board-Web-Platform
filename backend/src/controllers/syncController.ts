import type { Request, Response } from "express";

import {
  MongoSyncMutationLogRepository,
} from "../repositories/mongo/MongoSyncMutationLogRepository";
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
} from "../services/sync-mutations";
import { twelveWeekPullService } from "../services/twelveWeekPullService";
import { twelveWeekImportService } from "../services/twelveWeekImportService";
import { twelveWeekImportValidationService } from "../services/twelveWeekImportValidationService";
import { twelveWeekWorkspaceService } from "../services/twelveWeekWorkspaceService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

// ─── Orchestrator instance (singleton) ──────────────────────────

const syncMutationOrchestrator = new SyncMutationOrchestrator(
  new MongoSyncMutationLogRepository(),
  new MongoSyncTaskMutationRepository(),
  new MongoSyncWorkspaceMutationRepository(),
);

syncMutationOrchestrator.registerAll([
  new TaskCompletedChangedHandler(),
  new DailyCheckInUpsertHandler(),
  new LeadMetricUpsertHandler(),
  new WeeklyReviewUpsertHandler(),
  new PlanSnapshotUpdatedHandler(),
  new PlanSnapshotUpsertHandler(),
  new TaskUpsertHandler(),
]);

// ─── Controller functions ───────────────────────────────────────

export async function submitTwelveWeekMutations(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await syncMutationOrchestrator.executeBatch(user.uid, req.body ?? {});
  res.status(200).json(successResponse(result));
}

export async function validateTwelveWeekImport(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = twelveWeekImportValidationService.validateImportPayload(user.uid, req.body ?? {});
  res.status(200).json(successResponse(result));
}

export async function importTwelveWeekWorkspace(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await twelveWeekImportService.importWorkspace(user.uid, req.body ?? {});
  res.status(200).json(successResponse(result));
}

export async function pullTwelveWeekWorkspace(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await twelveWeekPullService.pullWorkspace(user.uid, req.query ?? {});
  res.status(200).json(successResponse(result));
}

export async function exportTwelveWeekWorkspace(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await twelveWeekWorkspaceService.exportWorkspace(user.uid);
  res.status(200).json(successResponse(result));
}

export async function deleteTwelveWeekWorkspace(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await twelveWeekWorkspaceService.deleteWorkspace(user.uid);
  res.status(200).json(successResponse(result));
}