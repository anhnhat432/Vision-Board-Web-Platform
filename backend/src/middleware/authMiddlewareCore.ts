import type { NextFunction, Request, Response } from "express";

import { captureBackendException } from "../monitoring/sentry";
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
        const context = {
          event: "auth_failed",
          reason: error.errorCode ?? "missing_or_invalid_bearer_token",
          path: req.path,
          method: req.method,
          ip: req.ip,
        };
        console.warn("[auth]", context);
        captureBackendException(error, {
          tags: {
            event: "auth_failed",
            reason: context.reason,
          },
          extra: context,
        });
        next(error);
        return;
      }

      const authError = new ApiError(401, "Unauthorized: Token verification failed.");
      const context = {
        event: "auth_failed",
        reason: "token_verification_failed",
        path: req.path,
        method: req.method,
        ip: req.ip,
      };
      console.warn("[auth]", context);
      captureBackendException(error, {
        tags: {
          event: "auth_failed",
          reason: context.reason,
        },
        extra: context,
      });
      next(authError);
    }
  };
}
