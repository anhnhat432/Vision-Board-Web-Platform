import { Router } from "express";

import { billingHealthController, healthController } from "../controllers/healthController";
import { healthRateLimiter } from "../middleware/rateLimiters";

const healthRoutes = Router();

healthRoutes.get("/health", healthRateLimiter, healthController);
healthRoutes.get("/health/billing", healthRateLimiter, billingHealthController);

export { healthRoutes };
