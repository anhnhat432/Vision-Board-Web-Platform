import type { Request, Response } from "express";

import { syncMutationService } from "../services/syncMutationService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function submitTwelveWeekMutations(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await syncMutationService.submitMutationBatch(user.uid, req.body ?? {});
  res.status(200).json(successResponse(result));
}
