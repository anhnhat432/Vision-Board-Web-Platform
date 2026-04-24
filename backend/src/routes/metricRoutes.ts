import { Router } from "express";

import {
  createMetricForWeek,
  createMetricLog,
  getMetricsForWeek,
  updateMetricLog,
} from "../controllers/metricController";
import { asyncHandler } from "../utils/asyncHandler";

const metricRoutes = Router();

metricRoutes.get("/weeks/:weekId/metrics", asyncHandler(getMetricsForWeek));
metricRoutes.post("/weeks/:weekId/metrics", asyncHandler(createMetricForWeek));
metricRoutes.post("/metrics/:metricId/logs", asyncHandler(createMetricLog));
metricRoutes.patch("/metrics/:metricId/logs/:logId", asyncHandler(updateMetricLog));

export { metricRoutes };
