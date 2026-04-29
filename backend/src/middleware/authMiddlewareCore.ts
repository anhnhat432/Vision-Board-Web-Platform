import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/apiError";

export interface TokenVerifier {
  verifyIdToken(token: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
  }>;
}

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

export function createAuthMiddleware(tokenVerifier: TokenVerifier) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        throw new ApiError(401, "Unauthorized: Missing or invalid bearer token.");
      }

      const decodedToken = await tokenVerifier.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
      };

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
        return;
      }

      next(new ApiError(401, "Unauthorized: Token verification failed."));
    }
  };
}
