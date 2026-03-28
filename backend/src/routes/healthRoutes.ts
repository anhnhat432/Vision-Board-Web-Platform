import { Router } from "express";

import { healthController } from "../controllers/healthController";

const healthRoutes = Router();

healthRoutes.get("/health", healthController);

export { healthRoutes };
