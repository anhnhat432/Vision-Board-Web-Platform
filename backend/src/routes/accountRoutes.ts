import { Router } from "express";

import { deleteAccount, exportAccount } from "../controllers/accountController";
import { asyncHandler } from "../utils/asyncHandler";

const accountRoutes = Router();

accountRoutes.get("/account/export", asyncHandler(exportAccount));
accountRoutes.delete("/account/delete", asyncHandler(deleteAccount));
accountRoutes.delete("/account", asyncHandler(deleteAccount));

export { accountRoutes };
