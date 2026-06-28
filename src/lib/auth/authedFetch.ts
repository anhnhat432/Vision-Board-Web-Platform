type FirebaseAuthModule = typeof import("./firebase");

const AUTH_FORCE_LOGOUT_EVENT = "auth:force-logout";
const AUTHED_FETCH_TIMEOUT_MS = 10_000;

let firebaseAuthModulePromise: Promise<FirebaseAuthModule> | null = null;

function loadFirebaseAuthModule(): Promise<FirebaseAuthModule> {
  firebaseAuthModulePromise ??= import("./firebase");
  return firebaseAuthModulePromise;
}

export class AuthError extends Error {
  public readonly status = 401;
  public readonly code = "AUTH_FORCE_LOGOUT";

  constructor(message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.") {
    super(message);
    this.name = "AuthError";
  }
}

function dispatchForceLogout(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_FORCE_LOGOUT_EVENT));
}

function createHeaders(initHeaders: HeadersInit | undefined, token: string | null): Headers {
  const headers = new Headers(initHeaders ?? {});
  if (token?.trim()) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }
  return headers;
}

function throwIfAborted(signal: AbortSignal | null | undefined): void {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted.", "AbortError");
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit): Promise<Response> {
  throwIfAborted(init.signal);

  const timeoutController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    timeoutController.abort(new DOMException("The operation timed out.", "AbortError"));
  }, AUTHED_FETCH_TIMEOUT_MS);

  const handleAbort = () => {
    timeoutController.abort(init.signal?.reason ?? new DOMException("The operation was aborted.", "AbortError"));
  };

  init.signal?.addEventListener("abort", handleAbort, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: timeoutController.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", handleAbort);
  }
}

async function fetchWithToken(
  input: RequestInfo,
  init: RequestInit | undefined,
  token: string | null,
): Promise<Response> {
  return fetchWithTimeout(input, {
    ...init,
    headers: createHeaders(init?.headers, token),
  });
}

export async function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const { getFirebaseToken } = await loadFirebaseAuthModule();
  const token = await getFirebaseToken(false);
  const response = await fetchWithToken(input, init, token);

  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await getFirebaseToken(true);
  const retryResponse = await fetchWithToken(input, init, refreshedToken);

  if (retryResponse.status !== 401) {
    return retryResponse;
  }

  dispatchForceLogout();
  throw new AuthError();
}
