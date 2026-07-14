import type { Request, Response } from "express";

import { metricService } from "../services/metricService";
import { successResponse } from "../utils/apiResponse";
import { getParam, requireAuthUser } from "./controllerHelpers";

export async function createMetricForWeek(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metric = await metricService.createWeekMetric(user.uid, getParam(req, "weekId"), req.body ?? {});
  res.status(201).json(successResponse(metric));
}

export async function getMetricsForWeek(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metrics = await metricService.getWeekMetrics(user.uid, getParam(req, "weekId"));
  res.status(200).json(successResponse(metrics));
}

export async function createMetricLog(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metric = await metricService.logLeadMetric(user.uid, getParam(req, "metricId"), req.body ?? {});
  res.status(200).json(successResponse(metric));
}

export async function updateMetricLog(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const metric = await metricService.updateLeadMetricLog(
    user.uid,
    getParam(req, "metricId"),
    getParam(req, "logId"),
    req.body ?? {},
  );
  res.status(200).json(successResponse(metric));
}
