import express, { Router } from "express";

import {
  importTwelveWeekWorkspace,
  pullTwelveWeekWorkspace,
  submitTwelveWeekMutations,
  validateTwelveWeekImport,
} from "../controllers/syncController";
import { asyncHandler } from "../utils/asyncHandler";

const syncRoutes = Router();

/**
 * Sync routes enforce a tighter body size limit (1 MB) than the global app
 * limit. This prevents oversized payloads on the sync API surface while
 * allowing other CRUD routes to accept larger bodies if needed.
 */
syncRoutes.use(express.json({ limit: "1mb" }));

syncRoutes.post("/sync/12-week/import", asyncHandler(importTwelveWeekWorkspace));
syncRoutes.post("/sync/12-week/import/validate", asyncHandler(validateTwelveWeekImport));
syncRoutes.post("/sync/12-week/mutations", asyncHandler(submitTwelveWeekMutations));
syncRoutes.get("/sync/12-week/pull", asyncHandler(pullTwelveWeekWorkspace));

export { syncRoutes };

