import { Router } from "express";

import { bootstrapProfile, getProfile, updateProfile } from "../controllers/authController";
import { asyncHandler } from "../utils/asyncHandler";

const authRoutes = Router();

authRoutes.post("/auth/profile", asyncHandler(bootstrapProfile));
authRoutes.get("/auth/profile", asyncHandler(getProfile));
authRoutes.patch("/auth/profile", asyncHandler(updateProfile));

export { authRoutes };
