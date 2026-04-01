import type { Request } from "express";

import { ApiError } from "../utils/apiError";

export function requireAuthUser(req: Request): { uid: string; email?: string; name?: string } {
  if (!req.user?.uid) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user;
}
