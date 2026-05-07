export interface SuccessApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorApiResponse {
  success: false;
  message: string;
  details?: unknown;
  stack?: string;
}

export function successResponse<T>(data: T, message?: string): SuccessApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export interface ConflictApiResponse {
  success: false;
  conflict: true;
  message: string;
  currentRevision: number;
  serverUpdatedAt: string;
}

export function conflictResponse(currentRevision: number, serverUpdatedAt: Date): ConflictApiResponse {
  return {
    success: false,
    conflict: true,
    message: "Document was modified on another device. Latest version loaded.",
    currentRevision,
    serverUpdatedAt: serverUpdatedAt.toISOString(),
  };
}

export function errorResponse(
  message: string,
  details?: unknown,
  stack?: string,
): ErrorApiResponse {
  return {
    success: false,
    message,
    details,
    stack,
  };
}
