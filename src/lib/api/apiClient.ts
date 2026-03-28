import { getFirebaseToken, getStoredFirebaseToken, logoutFirebase } from "@/lib/auth/firebase";
import type { ApiErrorEnvelope, ApiSuccessEnvelope, AppError } from "@/types/api";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiRequestOptions extends Omit<RequestInit, "method" | "body" | "headers"> {
  headers?: HeadersInit;
}

export interface ApiClientError extends AppError {
  details?: unknown;
  isNetworkError?: boolean;
}

type ResponseErrorInterceptor = (
  error: ApiClientError,
) => void | Promise<void>;

const responseErrorInterceptors: ResponseErrorInterceptor[] = [];

function toApiClientError(error: unknown): ApiClientError {
  if (error && typeof error === "object" && "message" in error) {
    const withMessage = error as { message?: unknown; status?: unknown; details?: unknown; isNetworkError?: unknown };
    return {
      message:
        typeof withMessage.message === "string" && withMessage.message.trim().length > 0
          ? withMessage.message
          : "Request failed.",
      status: typeof withMessage.status === "number" ? withMessage.status : undefined,
      details: withMessage.details,
      isNetworkError:
        typeof withMessage.isNetworkError === "boolean" ? withMessage.isNetworkError : undefined,
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

async function handleUnauthorizedResponse(error: ApiClientError): Promise<void> {
  if (error.status !== 401) return;

  try {
    await logoutFirebase();
  } catch (logoutError) {
    console.error("Failed to logout after 401 response.", logoutError);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
  }
}

addResponseErrorInterceptor(handleUnauthorizedResponse);

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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

function getErrorMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (!("message" in payload)) return null;

  const message = (payload as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  if (message.trim().length === 0) return null;

  return message;
}

async function request<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  body?: TBody,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  const token = (await getFirebaseToken().catch(() => null)) ?? getStoredFirebaseToken();
  const headers = new Headers(options?.headers ?? {});

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && token.trim().length > 0) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    const apiError = createApiClientError({
      message: "Network error. Please check your connection and try again.",
      isNetworkError: true,
      details: networkError,
    });
    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const apiError = createApiClientError({
      message: getErrorMessageFromPayload(payload) ?? `Request failed with status ${response.status}.`,
      status: response.status,
      details: payload,
    });

    await runResponseErrorInterceptors(apiError);
    throw apiError;
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const apiPayload = payload as ApiSuccessEnvelope<TResponse> | ApiErrorEnvelope;
    if (apiPayload.success === false) {
      const apiError = createApiClientError({
        message: apiPayload.message || "API request failed.",
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

export function get<TResponse>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TResponse> {
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

async function deleteRequest<TResponse>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TResponse> {
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
  delete: deleteRequest,
};
