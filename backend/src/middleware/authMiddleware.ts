import type { NextFunction, Request, Response } from "express";

import { adminAuth } from "../config/firebase";
import { ApiError } from "../utils/apiError";

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, "Unauthorized: Missing or invalid bearer token.");
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, "Unauthorized: Token verification failed."));
  }
}
