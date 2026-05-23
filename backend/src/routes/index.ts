import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import {
  authProfileRateLimiter,
  generalApiRateLimiter,
  healthRateLimiter,
} from "../middleware/rateLimiters";
import { accountRoutes } from "./accountRoutes";
import { adminRoutes } from "./adminRoutes";
import { assistantRoutes } from "./assistantRoutes";
import { authRoutes } from "./authRoutes";
import { billingRoutes, publicBillingRoutes } from "./billingRoutes";
import { goalRoutes } from "./goalRoutes";
import { healthRoutes } from "./healthRoutes";
import { metricRoutes } from "./metricRoutes";
import { orderCatalogRoutes } from "./orderCatalogRoutes";
import { orderRoutes } from "./orderRoutes";
import { planBulkSyncRoutes } from "./planBulkSyncRoutes";
import { planRoutes } from "./planRoutes";
import { syncRoutes } from "./syncRoutes";
import { taskRoutes } from "./taskRoutes";
import { visionBoardRoutes } from "./visionBoardRoutes";
import { webhookRoutes } from "./webhookRoutes";
import { weekRoutes } from "./weekRoutes";

const apiRoutes = Router();

// Webhook routes BEFORE auth — providers use signature verification, not Firebase auth.
apiRoutes.use(healthRateLimiter, healthRoutes);
apiRoutes.use(webhookRoutes);
apiRoutes.use(publicBillingRoutes);
apiRoutes.use("/order-catalog", orderCatalogRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(generalApiRateLimiter);
apiRoutes.use(authProfileRateLimiter, authRoutes);
apiRoutes.use(accountRoutes);
apiRoutes.use(adminRoutes);
apiRoutes.use(billingRoutes);
apiRoutes.use(goalRoutes);
apiRoutes.use(orderRoutes);
apiRoutes.use(planRoutes);
apiRoutes.use(planBulkSyncRoutes);
apiRoutes.use(syncRoutes);
apiRoutes.use(weekRoutes);
apiRoutes.use(taskRoutes);
apiRoutes.use(metricRoutes);
apiRoutes.use(visionBoardRoutes);
apiRoutes.use(assistantRoutes);

export { apiRoutes };
