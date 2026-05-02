export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly errorCode?: string;

  constructor(statusCode: number, message: string, details?: unknown, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode;
  }
}
