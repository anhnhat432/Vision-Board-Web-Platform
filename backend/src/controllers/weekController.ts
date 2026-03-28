import type { Request, Response } from "express";

import { weekService } from "../services/weekService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function getWeeksForPlan(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const weeks = await weekService.getWeeksForPlan(user.uid, req.params.planId);
  res.status(200).json(successResponse(weeks));
}

export async function patchWeek(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const week = await weekService.updateWeek(user.uid, req.params.weekId, req.body ?? {});
  res.status(200).json(successResponse(week));
}

export async function submitWeekReview(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const week = await weekService.submitWeeklyReview(user.uid, req.params.weekId, req.body ?? {});
  res.status(200).json(successResponse(week));
}
