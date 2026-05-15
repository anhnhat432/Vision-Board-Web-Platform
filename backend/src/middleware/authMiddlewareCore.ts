import type { NextFunction, Request, Response } from "express";

import { captureBackendException } from "../monitoring/sentry";
import { ApiError } from "../utils/apiError";

export interface TokenVerifier {
  verifyIdToken(token: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
    emailVerified?: boolean;
    role?: string;
  }>;
}

export interface AuthMiddlewareOptions {
  requireEmailVerified?: boolean;
}

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function assertEmailVerified(emailVerified: boolean | undefined): void {
  if (emailVerified === true) return;
  throw new ApiError(
    403,
    "Email chưa được xác thực. Vui lòng xác thực email trước khi tiếp tục.",
    undefined,
    "EMAIL_NOT_VERIFIED",
  );
}

export function requireEmailVerified(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized: Missing authenticated user.");
    }
    assertEmailVerified(req.user.emailVerified);
    next();
  } catch (error) {
    next(error);
  }
}

export function createAuthMiddleware(tokenVerifier: TokenVerifier, options: AuthMiddlewareOptions = {}) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (req.user) {
        if (options.requireEmailVerified) assertEmailVerified(req.user.emailVerified);
        next();
        return;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        throw new ApiError(401, "Unauthorized: Missing or invalid bearer token.");
      }

      const decodedToken = await tokenVerifier.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        emailVerified: decodedToken.email_verified === true || decodedToken.emailVerified === true,
      };
      if (decodedToken.role !== undefined) req.user.role = decodedToken.role;
      req.firebaseToken = req.user;
      if (options.requireEmailVerified) assertEmailVerified(req.user.emailVerified);

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
