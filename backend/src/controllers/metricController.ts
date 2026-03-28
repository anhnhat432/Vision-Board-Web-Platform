import type { Request, Response } from "express";

import { metricService } from "../services/metricService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function createMetricForWeek(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metric = await metricService.createWeekMetric(user.uid, req.params.weekId, req.body ?? {});
  res.status(201).json(successResponse(metric));
}

export async function getMetricsForWeek(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metrics = await metricService.getWeekMetrics(user.uid, req.params.weekId);
  res.status(200).json(successResponse(metrics));
}

export async function createMetricLog(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metric = await metricService.logLeadMetric(user.uid, req.params.metricId, req.body ?? {});
  res.status(200).json(successResponse(metric));
}
