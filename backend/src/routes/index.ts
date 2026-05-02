import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import { authRoutes } from "./authRoutes";
import { billingRoutes } from "./billingRoutes";
import { goalRoutes } from "./goalRoutes";
import { healthRoutes } from "./healthRoutes";
import { metricRoutes } from "./metricRoutes";
import { orderRoutes } from "./orderRoutes";
import { planRoutes } from "./planRoutes";
import { syncRoutes } from "./syncRoutes";
import { taskRoutes } from "./taskRoutes";
import { visionBoardRoutes } from "./visionBoardRoutes";
import { webhookRoutes } from "./webhookRoutes";
import { weekRoutes } from "./weekRoutes";

const apiRoutes = Router();

// Webhook routes BEFORE auth — providers use signature verification, not Firebase auth.
apiRoutes.use(healthRoutes);
apiRoutes.use(webhookRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(authRoutes);
apiRoutes.use(billingRoutes);
apiRoutes.use(goalRoutes);
apiRoutes.use(orderRoutes);
apiRoutes.use(planRoutes);
apiRoutes.use(syncRoutes);
apiRoutes.use(weekRoutes);
apiRoutes.use(taskRoutes);
apiRoutes.use(metricRoutes);
apiRoutes.use(visionBoardRoutes);

export { apiRoutes };
