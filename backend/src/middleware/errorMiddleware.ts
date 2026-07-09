import type { NextFunction, Request, Response } from "express";

import { captureBackendException } from "../monitoring/sentry";
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

function isSafeBusinessError(error: ApiError): boolean {
  return error.errorCode === "checkout_disabled";
}

function shouldCaptureApiError(error: ApiError): boolean {
  return error.statusCode >= 500 && !isSafeBusinessError(error);
}

function getSafeApiErrorPayload(error: ApiError, isDevelopment: boolean): { message: string; details?: unknown } {
  if (isDevelopment || error.statusCode < 500 || isSafeBusinessError(error)) {
    return {
      message: error.message,
      details: error.details,
    };
  }

  if (error.statusCode === 503) {
    return {
      message: "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
    };
  }

  return {
    message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
  };
}

function captureSafeApiError(error: ApiError, req: Request, errorCode: string): void {
  captureBackendException(new Error(`ApiError ${error.statusCode} ${errorCode}`), {
    tags: {
      event: "api_error",
      errorCode,
    },
    extra: {
      method: req.method,
      path: req.path,
      statusCode: error.statusCode,
      errorCode,
    },
  });
}

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (error instanceof ApiError) {
    const errorCode = deriveErrorCode(error.statusCode, error.errorCode);
    if (shouldCaptureApiError(error)) {
      captureSafeApiError(error, req, errorCode);
    }

    const safePayload = getSafeApiErrorPayload(error, isDevelopment);
    const payload = errorResponse(
      safePayload.message,
      safePayload.details,
      isDevelopment ? error.stack : undefined,
    );
    (payload as unknown as Record<string, unknown>).errorCode = errorCode;
    res.status(error.statusCode).json(payload);
    return;
  }

  // Log unexpected (non-ApiError) failures for observability. Privacy: never
  // log req.body for sync endpoints (user-generated text) — only method/path.
  const context = {
    event: "unhandled_error",
    method: req.method,
    path: req.path,
    message: error instanceof Error ? error.message : String(error),
  };
  console.error("[error]", context, error instanceof Error ? error.stack : "");
  captureBackendException(error, {
    tags: { event: "unhandled_error" },
    extra: { method: req.method, path: req.path },
  });

  const fallbackMessage = "Internal server error";
  const payload = errorResponse(
    fallbackMessage,
    undefined,
    isDevelopment && error instanceof Error ? error.stack : undefined,
  );
  (payload as unknown as Record<string, unknown>).errorCode = "server_error";

  res.status(500).json(payload);
}
