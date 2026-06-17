import { isDemoMode } from "@/app/utils/app-mode";
import { AuthError, authedFetch } from "@/lib/auth/authedFetch";
import type { ApiErrorEnvelope, ApiSuccessEnvelope, AppError } from "@/types/api";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const API_BASE_URL = (CONFIGURED_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiRequestOptions extends Omit<RequestInit, "method" | "body" | "headers"> {
  headers?: HeadersInit;
}

export interface ApiClientError extends AppError {
  details?: unknown;
  isNetworkError?: boolean;
  conflict?: true;
  rateLimited?: true;
  /** Server-suggested retry delay in ms (from Retry-After header), or a default */
  retryAfterMs?: number;
  errorCode?: string;
  currentRevision?: number;
  serverUpdatedAt?: string;
}

type ResponseErrorInterceptor = (error: ApiClientError) => void | Promise<void>;

const responseErrorInterceptors: ResponseErrorInterceptor[] = [];

function toApiClientError(error: unknown): ApiClientError {
  if (error && typeof error === "object" && "message" in error) {
    const withMessage = error as {
      message?: unknown;
      status?: unknown;
      details?: unknown;
      isNetworkError?: unknown;
      conflict?: unknown;
      rateLimited?: unknown;
      retryAfterMs?: unknown;
      errorCode?: unknown;
      currentRevision?: unknown;
      serverUpdatedAt?: unknown;
    };
    return {
      message:
        typeof withMessage.message === "string" && withMessage.message.trim().length > 0
          ? withMessage.message
          : "Request failed.",
      status: typeof withMessage.status === "number" ? withMessage.status : undefined,
      details: withMessage.details,
      isNetworkError: typeof withMessage.isNetworkError === "boolean" ? withMessage.isNetworkError : undefined,
      conflict: withMessage.conflict === true ? true : undefined,
      rateLimited: withMessage.rateLimited === true || withMessage.status === 429 ? true : undefined,
      retryAfterMs: typeof withMessage.retryAfterMs === "number" ? withMessage.retryAfterMs : undefined,
      errorCode: typeof withMessage.errorCode === "string" ? withMessage.errorCode : undefined,
      currentRevision: typeof withMessage.currentRevision === "number" ? withMessage.currentRevision : undefined,
      serverUpdatedAt: typeof withMessage.serverUpdatedAt === "string" ? withMessage.serverUpdatedAt : undefined,
    };
  }

  return {
    message: "Request failed.",
  };
}

function createApiClientError(payload: ApiClientError): ApiClientError {
  return {
    message: payload.message,
    status: payload.status,
    details: payload.details,
    isNetworkError: payload.isNetworkError,
    conflict: payload.conflict,
    rateLimited: payload.rateLimited,
    retryAfterMs: payload.retryAfterMs,
    errorCode: payload.errorCode,
    currentRevision: payload.currentRevision,
    serverUpdatedAt: payload.serverUpdatedAt,
  };
}

async function runResponseErrorInterceptors(error: ApiClientError): Promise<void> {
  await Promise.allSettled(responseErrorInterceptors.map((interceptor) => interceptor(error)));
}

export function addResponseErrorInterceptor(interceptor: ResponseErrorInterceptor): () => void {
  responseErrorInterceptors.push(interceptor);

  return () => {
    const index = responseErrorInterceptors.indexOf(interceptor);
    if (index >= 0) {
      responseErrorInterceptors.splice(index, 1);
    }
  };
}

function handleUnauthorizedResponse(error: ApiClientError): void {
  if (error.status !== 401) return;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
  }
}

addResponseErrorInterceptor(handleUnauthorizedResponse);

addResponseErrorInterceptor((error) => {
  if (error.status !== 403 || error.errorCode !== "EMAIL_NOT_VERIFIED") return;
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    "emailVerification:returnTo",
    `${window.location.pathname || "/"}${window.location.search || ""}`,
  );
  window.dispatchEvent(new CustomEvent("email-verification:required"));
});

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function isApiBaseUrlConfigured(): boolean {
  return CONFIGURED_API_BASE_URL.length > 0;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class RateLimitError extends Error {
  public readonly status = 429;
  public readonly rateLimited = true;
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message = "Máy chủ đang giới hạn tốc độ đồng bộ. Hệ thống sẽ tự thử lại.") {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 5_000;

function parseRetryAfterMs(response: Response): number {
  const header = response.headers.get("Retry-After");
  if (!header) return DEFAULT_RATE_LIMIT_RETRY_MS;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 120_000);
  }

  // Try HTTP-date format
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    const delayMs = dateMs - Date.now();
    return delayMs > 0 ? Math.min(delayMs, 120_000) : DEFAULT_RATE_LIMIT_RETRY_MS;
  }

  return DEFAULT_RATE_LIMIT_RETRY_MS;
}

export function isRateLimitError(error: unknown): error is (ApiClientError & { rateLimited: true }) | RateLimitError {
  if (error instanceof RateLimitError) return true;
  if (!error || typeof error !== "object") return false;
  return (error as ApiClientError).rateLimited === true || (error as ApiClientError).status === 429;
}

function getErrorMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (!("message" in payload)) return null;

  const message = (payload as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  if (message.trim().length === 0) return null;

  return message;
}

function getErrorCodeFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const errorCode = (payload as { errorCode?: unknown }).errorCode;
  return typeof errorCode === "string" ? errorCode : undefined;
}

async function request<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  body?: TBody,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  if (isDemoMode()) {
    throw new Error("Các yêu cầu máy chủ bị tắt trong chế độ thử.");
  }

  const headers = new Headers(options?.headers ?? {});
  const isFormData = body instanceof FormData;

  if (body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await authedFetch(buildApiUrl(path), {
      ...options,
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  } catch (networkError) {
    const apiError =
      networkError instanceof AuthError
        ? createApiClientError({
            message: networkError.message,
            status: networkError.status,
            errorCode: networkError.code,
            details: networkError,
          })
        : createApiClientError({
            message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.",
            isNetworkError: true,
            details: networkError,
          });
    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const isConflict = response.status === 409;
    const isRateLimit = response.status === 429;
    const retryAfterMs = isRateLimit ? parseRetryAfterMs(response) : undefined;
    const apiError = createApiClientError({
      message: getErrorMessageFromPayload(payload) ?? `Yêu cầu không thành công (mã ${response.status}).`,
      status: response.status,
      details: payload,
      conflict: isConflict || undefined,
      rateLimited: isRateLimit || undefined,
      retryAfterMs,
      errorCode: getErrorCodeFromPayload(payload),
      currentRevision:
        isConflict && payload && typeof payload === "object" && "currentRevision" in payload
          ? (payload as { currentRevision?: number }).currentRevision
          : undefined,
      serverUpdatedAt:
        isConflict && payload && typeof payload === "object" && "serverUpdatedAt" in payload
          ? String((payload as { serverUpdatedAt?: unknown }).serverUpdatedAt ?? "")
          : undefined,
    });

    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const apiPayload = payload as ApiSuccessEnvelope<TResponse> | ApiErrorEnvelope;
    if (apiPayload.success === false) {
      const apiError = createApiClientError({
        message: apiPayload.message || "Không gửi được yêu cầu. Thử lại sau.",
        status: response.status,
        details: apiPayload.details,
      });

      await runResponseErrorInterceptors(apiError);
      throw apiError;
    }

    return (apiPayload as ApiSuccessEnvelope<TResponse>).data;
  }

  return payload as TResponse;
}

export function get<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse> {
  return request<TResponse>("GET", path, undefined, options);
}

export function post<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  return request<TResponse, TBody>("POST", path, body, options);
}

export function patch<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  return request<TResponse, TBody>("PATCH", path, body, options);
}

export function put<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  return request<TResponse, TBody>("PUT", path, body, options);
}

async function deleteRequest<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse> {
  return request<TResponse>("DELETE", path, undefined, options);
}

export { deleteRequest as delete };

export function toAppError(error: unknown): AppError {
  return toApiClientError(error);
}

export const apiClient = {
  get,
  post,
  patch,
  put,
  delete: deleteRequest,
};
