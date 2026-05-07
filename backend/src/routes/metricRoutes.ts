import { Router } from "express";

import {
  createMetricForWeek,
  createMetricLog,
  getMetricsForWeek,
  updateMetricLog,
} from "../controllers/metricController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const metricRoutes = Router();

metricRoutes.get(
  "/weeks/:weekId/metrics",
  validateObjectIdParam("weekId"),
  asyncHandler(getMetricsForWeek),
);
metricRoutes.post(
  "/weeks/:weekId/metrics",
  validateObjectIdParam("weekId"),
  validateJsonObjectBody,
  asyncHandler(createMetricForWeek),
);
metricRoutes.post(
  "/metrics/:metricId/logs",
  validateObjectIdParam("metricId"),
  validateJsonObjectBody,
  asyncHandler(createMetricLog),
);
metricRoutes.patch(
  "/metrics/:metricId/logs/:logId",
  validateObjectIdParam("metricId"),
  validateObjectIdParam("logId"),
  validateJsonObjectBody,
  asyncHandler(updateMetricLog),
);

export { metricRoutes };
