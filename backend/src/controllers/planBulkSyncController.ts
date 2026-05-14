import type { Request, Response } from "express";

import { validateBulkSyncRequest } from "../middleware/bulkSyncValidator";
import { bulkSyncPlanSnapshot } from "../services/planBulkSyncService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function bulkSyncPlan(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const planId = req.params.planId;

  const validation = validateBulkSyncRequest(req.body);
  if (!validation.ok) {
    throw new ApiError(400, validation.message, undefined, "invalid_bulk_sync_payload");
  }

  const result = await bulkSyncPlanSnapshot(user.uid, planId, validation.data);
  res.status(200).json(successResponse(result));
}
