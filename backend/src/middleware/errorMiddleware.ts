import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/apiError";
import { errorResponse } from "../utils/apiResponse";

/**
 * Maps HTTP status codes to standard error codes for frontend diagnostics.
 * Privacy constraint: this middleware must never log raw req.body
 * for sync endpoints because payloads contain user-generated text.
 */
function deriveErrorCode(statusCode: number, explicitCode?: string): string {
  if (explicitCode) return explicitCode;
  switch (statusCode) {
    case 400:
      return "invalid_payload";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    default:
      return "server_error";
  }
}

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (error instanceof ApiError) {
    const payload = errorResponse(
      error.message,
      error.details,
      isDevelopment ? error.stack : undefined,
    );
    (payload as unknown as Record<string, unknown>).errorCode = deriveErrorCode(error.statusCode, error.errorCode);
    res.status(error.statusCode).json(payload);
    return;
  }

  const fallbackMessage = "Internal server error";
  const payload = errorResponse(
    fallbackMessage,
    undefined,
    isDevelopment && error instanceof Error ? error.stack : undefined,
  );
  (payload as unknown as Record<string, unknown>).errorCode = "server_error";

  res.status(500).json(payload);
}

