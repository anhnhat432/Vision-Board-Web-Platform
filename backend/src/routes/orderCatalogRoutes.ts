import { Router } from "express";

import { listActiveCatalog } from "../controllers/orderCatalogController";
import { publicCatalogRateLimiter } from "../middleware/rateLimiters";
import { asyncHandler } from "../utils/asyncHandler";

const orderCatalogRoutes = Router();

orderCatalogRoutes.get("/", publicCatalogRateLimiter, asyncHandler(listActiveCatalog));

export { orderCatalogRoutes };
export default orderCatalogRoutes;
