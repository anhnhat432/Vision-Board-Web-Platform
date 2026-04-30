import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import { authRoutes } from "./authRoutes";
import { goalRoutes } from "./goalRoutes";
import { healthRoutes } from "./healthRoutes";
import { metricRoutes } from "./metricRoutes";
import { orderRoutes } from "./orderRoutes";
import { planRoutes } from "./planRoutes";
import { syncRoutes } from "./syncRoutes";
import { taskRoutes } from "./taskRoutes";
import { visionBoardRoutes } from "./visionBoardRoutes";
import { weekRoutes } from "./weekRoutes";

const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(authRoutes);
apiRoutes.use(goalRoutes);
apiRoutes.use(orderRoutes);
apiRoutes.use(planRoutes);
apiRoutes.use(syncRoutes);
apiRoutes.use(weekRoutes);
apiRoutes.use(taskRoutes);
apiRoutes.use(metricRoutes);
apiRoutes.use(visionBoardRoutes);

export { apiRoutes };
