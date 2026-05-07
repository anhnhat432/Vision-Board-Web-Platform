import { Router } from "express";

import { bootstrapProfile, getProfile, updateProfile } from "../controllers/authController";
import { validateProfilePatchInput } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const authRoutes = Router();

authRoutes.post("/auth/profile", asyncHandler(bootstrapProfile));
authRoutes.get("/auth/profile", asyncHandler(getProfile));
authRoutes.patch("/auth/profile", validateProfilePatchInput, asyncHandler(updateProfile));

export { authRoutes };
