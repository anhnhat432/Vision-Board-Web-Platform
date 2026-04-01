import type { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "../controllers/controllerHelpers";
import { UserModel } from "../models/UserModel";
import { ApiError } from "../utils/apiError";

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUser = requireAuthUser(req);
    const user = await UserModel.findOne({ firebaseUid: authUser.uid }).lean();

    if (!user || user.role !== "admin") {
      next(new ApiError(403, "Forbidden."));
      return;
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(500, "Internal server error."));
  }
}
