import type { Request, Response } from "express";

import { syncMutationService } from "../services/syncMutationService";
import { twelveWeekPullService } from "../services/twelveWeekPullService";
import { twelveWeekImportService } from "../services/twelveWeekImportService";
import { twelveWeekImportValidationService } from "../services/twelveWeekImportValidationService";
import { twelveWeekWorkspaceService } from "../services/twelveWeekWorkspaceService";
import type { SyncMutationBatchResult, SyncMutationResult } from "../services/sync-mutations";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

// ─── Controller functions ───────────────────────────────────────

export async function submitTwelveWeekMutations(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await syncMutationService.submitMutationBatch(user.uid, req.body ?? {});
  throwIfTerminalMutationBatchError(result);
  res.status(200).json(successResponse(result));
}

function throwIfTerminalMutationBatchError(result: SyncMutationBatchResult): void {
  if (result.totalReceived === 0 || result.failedCount !== result.totalReceived) return;

  const firstFailure = result.failed[0];
  if (!firstFailure) return;

  if (result.failed.every(hasStatus("conflict"))) {
    throw new ApiError(
      409,
      `Idempotency conflict: ${firstFailure.reason ?? "mutation already exists with a different payload."}`,
      result,
      "idempotency_conflict",
    );
  }

  if (result.failed.every(hasStatus("failed_validation"))) {
    throw new ApiError(400, firstFailure.reason ?? "Invalid sync mutation payload.", result, "invalid_payload");
  }
}

function hasStatus(status: SyncMutationResult["status"]) {
  return (result: SyncMutationResult): boolean => result.status === status;
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
