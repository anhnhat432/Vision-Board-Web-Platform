import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/apiError";
import { errorResponse } from "../utils/apiResponse";

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
    res.status(error.statusCode).json(payload);
    return;
  }

  const fallbackMessage = "Internal server error";
  const payload = errorResponse(
    fallbackMessage,
    undefined,
    isDevelopment && error instanceof Error ? error.stack : undefined,
  );

  res.status(500).json(payload);
}
