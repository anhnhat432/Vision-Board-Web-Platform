import { Router } from "express";

import { listActiveCatalog } from "../controllers/orderCatalogController";
import { asyncHandler } from "../utils/asyncHandler";

const orderCatalogRoutes = Router();

orderCatalogRoutes.get("/", asyncHandler(listActiveCatalog));

export { orderCatalogRoutes };
export default orderCatalogRoutes;
