import type { Request } from "express";

import { ApiError } from "../utils/apiError";

export function getParam(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== "string") {
    throw new ApiError(400, "Missing or invalid parameter: " + key);
  }
  return value;
}

export function getQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (typeof value !== "string") return undefined;
  return value;
}

export function requireAuthUser(req: Request): { uid: string; email?: string; name?: string; emailVerified?: boolean } {
  if (!req.user?.uid) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user;
}
