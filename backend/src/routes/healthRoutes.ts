import { Router } from "express";

import { billingHealthController, healthController } from "../controllers/healthController";

const healthRoutes = Router();

healthRoutes.get("/health", healthController);
healthRoutes.get("/health/billing", billingHealthController);

export { healthRoutes };
