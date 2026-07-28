import type { Request, Response } from "express";

import { goalService } from "../services/goalService";
import { successResponse } from "../utils/apiResponse";
import { getParam, requireAuthUser } from "./controllerHelpers";

export async function createGoal(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const goal = await goalService.createGoal(user.uid, req.body ?? {});
  res.status(201).json(successResponse(goal));
}

export async function getGoals(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const goals = await goalService.getUserGoals(user.uid);
  res.status(200).json(successResponse(goals));
}

export async function getGoalById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const goal = await goalService.getGoal(user.uid, getParam(req, "id"));
  res.status(200).json(successResponse(goal));
}

export async function updateGoal(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const goal = await goalService.updateGoal(user.uid, getParam(req, "id"), req.body ?? {});
  res.status(200).json(successResponse(goal));
}

export async function deleteGoal(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  await goalService.deleteGoal(user.uid, getParam(req, "id"));
  res.status(200).json(successResponse({ deleted: true }));
}
