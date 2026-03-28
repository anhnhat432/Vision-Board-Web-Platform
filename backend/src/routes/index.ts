import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import { healthRoutes } from "./healthRoutes";
import { metricRoutes } from "./metricRoutes";
import { planRoutes } from "./planRoutes";
import { taskRoutes } from "./taskRoutes";
import { weekRoutes } from "./weekRoutes";

const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(planRoutes);
apiRoutes.use(weekRoutes);
apiRoutes.use(taskRoutes);
apiRoutes.use(metricRoutes);

export { apiRoutes };
