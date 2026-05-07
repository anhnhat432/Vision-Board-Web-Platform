import type { CorsOptions } from "cors";

import { ApiError } from "../utils/apiError";

interface ParseCorsOriginOptions {
  nodeEnv?: string;
}

function isLocalhostOrigin(origin: string): boolean {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function parseAllowedCorsOrigins(
  rawOrigins: string,
  options: ParseCorsOriginOptions = {},
): string[] {
  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("FRONTEND_ORIGIN must include at least one origin.");
  }

  return origins.map((origin) => {
    if (origin === "*") {
      throw new Error("FRONTEND_ORIGIN cannot use wildcard '*' in production API mode.");
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`FRONTEND_ORIGIN contains an invalid origin: ${origin}`);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`FRONTEND_ORIGIN must use http or https: ${origin}`);
    }

    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error(`FRONTEND_ORIGIN must be an origin only, without path/query/hash: ${origin}`);
    }

    const normalizedOrigin = parsed.origin;
    if (options.nodeEnv === "production" && parsed.protocol !== "https:" && !isLocalhostOrigin(normalizedOrigin)) {
      throw new Error(`Production FRONTEND_ORIGIN must use https: ${origin}`);
    }

    return normalizedOrigin;
  });
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export function createCorsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, "CORS origin is not allowed.", undefined, "cors_origin_not_allowed"));
    },
    credentials: true,
  };
}
