import { Router } from "express";

import { submitTwelveWeekMutations } from "../controllers/syncController";
import { asyncHandler } from "../utils/asyncHandler";

const syncRoutes = Router();

syncRoutes.post("/sync/12-week/mutations", asyncHandler(submitTwelveWeekMutations));

export { syncRoutes };
