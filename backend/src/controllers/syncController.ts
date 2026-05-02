import type { Request, Response } from "express";

import { syncMutationService } from "../services/syncMutationService";
import { twelveWeekPullService } from "../services/twelveWeekPullService";
import { twelveWeekImportService } from "../services/twelveWeekImportService";
import { twelveWeekImportValidationService } from "../services/twelveWeekImportValidationService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function submitTwelveWeekMutations(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await syncMutationService.submitMutationBatch(user.uid, req.body ?? {});
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
