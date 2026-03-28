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
