import { Router } from "express";

import { deleteAccount } from "../controllers/accountController";
import { asyncHandler } from "../utils/asyncHandler";

const accountRoutes = Router();

accountRoutes.delete("/account/delete", asyncHandler(deleteAccount));
accountRoutes.delete("/account", asyncHandler(deleteAccount));

export { accountRoutes };
