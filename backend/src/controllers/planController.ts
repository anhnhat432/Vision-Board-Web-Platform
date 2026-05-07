import type { Request, Response } from "express";

import { planService } from "../services/planService";
import { successResponse } from "../utils/apiResponse";
import { ConflictError } from "../utils/conflictError";
import { requireAuthUser } from "./controllerHelpers";

export async function createPlan(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const plan = await planService.createPlanForUser(user.uid, req.body ?? {});
  res.status(201).json(successResponse(plan));
}

export async function getPlans(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const plans = await planService.getUserPlans(user.uid);
  res.status(200).json(successResponse(plans));
}

export async function getPlanById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const details = await planService.getPlanDetails(user.uid, req.params.id);
  res.status(200).json(successResponse(details));
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);

  try {
    const plan = await planService.updatePlan(user.uid, req.params.id, req.body ?? {});
    res.status(200).json(successResponse(plan));
  } catch (error) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        success: false,
        conflict: true,
        message: error.message,
        currentRevision: error.currentRevision,
        serverUpdatedAt: error.serverUpdatedAt.toISOString(),
      });
      return;
    }
    throw error;
  }
}
