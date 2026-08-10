import { createHash } from "node:crypto";

import {
  ipKeyGenerator,
  rateLimit,
  type RateLimitInfo,
  type RateLimitExceededEventHandler,
  type ValueDeterminingMiddleware,
} from "express-rate-limit";
import type { Request, RequestHandler } from "express";

import { captureBackendException } from "../monitoring/sentry";
import { billingService } from "../services/billingServiceInstance";
import { errorResponse } from "../utils/apiResponse";

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;
const ASSISTANT_FREE_LIMIT = 20;
const ASSISTANT_PAID_LIMIT = 120;

function getHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getMerchantId(req: Request): string | undefined {
  return getHeaderValue(req, "x-casso-merchant-id") ?? getHeaderValue(req, "x-payos-merchant-id");
}

function getRetryAfterSeconds(req: Request, windowMs: number): number {
  const resetTime = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit?.resetTime;
  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  }

  return Math.max(1, Math.ceil(windowMs / 1000));
}

function sanitizeRoute(req: Request): string {
  return (req.route?.path ?? req.originalUrl ?? req.path).split("?", 1)[0] ?? req.path;
}

function hashRateLimitKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function createRateLimitHandler(limiter: string, errorCode = "rate_limited"): RateLimitExceededEventHandler {
  return (req, res, _next, options) => {
    const rateLimitInfo = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    const route = sanitizeRoute(req);
    const merchantId = getMerchantId(req);
    const retryAfter = getRetryAfterSeconds(req, options.windowMs);
    const context = {
      event: "rate_limit_hit",
      limiter,
      route,
      method: req.method,
      authenticated: Boolean(req.user?.uid),
      keyHash: hashRateLimitKey(rateLimitInfo?.key),
      limit: rateLimitInfo?.limit ?? (typeof options.limit === "number" ? options.limit : undefined),
      used: rateLimitInfo?.used,
      remaining: rateLimitInfo?.remaining,
      windowMs: options.windowMs,
      retryAfter,
      ip: req.ip,
      merchantId,
      statusCode: options.statusCode,
    };
    console.warn("[rate-limit]", context);
    captureBackendException(new Error("Rate limit exceeded."), {
      tags: {
        event: "rate_limit_hit",
        limiter,
        route: String(route),
      },
      extra: context,
    });
    res.setHeader("Retry-After", String(retryAfter));
    const payload = errorResponse("Too many requests. Please wait a moment and try again.");
    (payload as unknown as Record<string, unknown>).errorCode = errorCode;
    res.status(options.statusCode).json(payload);
  };
}

function userOrIpKey(req: Request): string {
  if (req.user?.uid) return `user:${req.user.uid}`;
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

function ipKey(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

async function getAssistantLimit(req: Request): Promise<number> {
  const userId = req.user?.uid;
  if (!userId) return ASSISTANT_FREE_LIMIT;

  try {
    const entitlement = await billingService.getCurrentEntitlementForUser(userId);
    return entitlement.planCode === "FREE" ? ASSISTANT_FREE_LIMIT : ASSISTANT_PAID_LIMIT;
  } catch (error) {
    const keyHash = hashRateLimitKey(`user:${userId}`);
    console.warn("[assistant-rate-limit] Entitlement lookup failed", {
      keyHash,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    captureBackendException(error, {
      tags: {
        event: "assistant_rate_limit_entitlement_lookup_failed",
      },
      extra: {
        keyHash,
      },
    });
    return ASSISTANT_FREE_LIMIT;
  }
}

function createLimiter({
  name,
  keyPrefix,
  limit,
  windowMs,
  keyGenerator,
  errorCode,
}: {
  name: string;
  keyPrefix: string;
  limit: number | ValueDeterminingMiddleware<number>;
  windowMs: number;
  keyGenerator: (req: Request) => string;
  errorCode?: string;
}) {
  return rateLimit({
    windowMs,
    limit,
    identifier: name,
    keyGenerator: (req) => `${keyPrefix}:${keyGenerator(req)}`,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: createRateLimitHandler(name, errorCode),
  });
}

export const healthRateLimiter = createLimiter({
  name: "health",
  keyPrefix: "health",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: ipKey,
});

function merchantOrIpKey(headerName: string): (req: Request) => string {
  return (req) => {
    const merchantId = getHeaderValue(req, headerName);
    if (merchantId) return `merchant:${merchantId}`;
    return ipKey(req);
  };
}

export const webhookRateLimiter = createLimiter({
  name: "webhook",
  keyPrefix: "webhook",
  windowMs: ONE_MINUTE_MS,
  limit: 300,
  keyGenerator: ipKey,
});

export const cassoWebhookLimiter = createLimiter({
  name: "webhook-casso",
  keyPrefix: "webhook:casso",
  windowMs: ONE_MINUTE_MS,
  limit: 600,
  keyGenerator: merchantOrIpKey("x-casso-merchant-id"),
});

export const payosWebhookLimiter = createLimiter({
  name: "webhook-payos",
  keyPrefix: "webhook:payos",
  windowMs: ONE_MINUTE_MS,
  limit: 600,
  keyGenerator: merchantOrIpKey("x-payos-merchant-id"),
});

export const webhookHealthRateLimiter = createLimiter({
  name: "webhook-health",
  keyPrefix: "webhook-health",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: ipKey,
});

export const publicCatalogRateLimiter = createLimiter({
  name: "public-catalog",
  keyPrefix: "public-catalog",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: ipKey,
});

// Bootstrap /api/auth/profile được trigger nhiều lần ngay sau login (auto-sync
// hydrate, navigation listener, retry on 429). P1 production audit 2026-05-24
// phát hiện cấu hình cũ (120/15min = 8 req/phút/user, sau đó là 30 req/phút/user)
// gây bounce về /onboarding khi fresh login do bootstrap profile bị 429.
// Nới lên 60 req/phút/user — đủ cho bootstrap + retry trong burst sau login,
// vẫn an toàn vì keyGenerator là per-user (Firebase UID), không phải per-IP,
// nên class demo nhiều người login đồng thời không share quota.
export const authProfileRateLimiter = createLimiter({
  name: "auth-profile",
  keyPrefix: "auth-profile",
  windowMs: ONE_MINUTE_MS,
  limit: 60,
  keyGenerator: userOrIpKey,
});

export const billingCheckoutRateLimiter = createLimiter({
  name: "billing-checkout",
  keyPrefix: "billing-checkout",
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  keyGenerator: userOrIpKey,
});

export const billingStatusRateLimiter = createLimiter({
  name: "billing-status",
  keyPrefix: "billing-status",
  windowMs: ONE_MINUTE_MS,
  limit: 40,
  keyGenerator: userOrIpKey,
});

export const billingHistoryRateLimiter = createLimiter({
  name: "billing-history",
  keyPrefix: "billing-history",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: userOrIpKey,
});

export const planBulkSyncRateLimiter = createLimiter({
  name: "plan-bulk-sync",
  keyPrefix: "plan-bulk-sync",
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  keyGenerator: userOrIpKey,
});

export const assistantRateLimiter = createLimiter({
  name: "assistant",
  keyPrefix: "assistant",
  windowMs: FIFTEEN_MINUTES_MS,
  limit: getAssistantLimit,
  keyGenerator: userOrIpKey,
  errorCode: "ASSISTANT_RATE_LIMITED",
});

export type AuthenticatedRateLimitPolicy =
  | "dedicated"
  | "auth-profile"
  | "planning-read"
  | "planning-write"
  | "sync-read"
  | "sync-write"
  | "account-export"
  | "account-destructive"
  | "admin-read"
  | "admin-write"
  | "order-read"
  | "order-write"
  | "authenticated-read-fallback"
  | "authenticated-write-fallback";

const PLANNING_ROUTE_PREFIX = /^\/(?:goals|plans|weeks|metrics|tasks|vision-boards)(?:\/|$)/;
const PLAN_BULK_SYNC_ROUTE = /^\/plans\/[^/]+\/bulk-sync$/;
const ADMIN_ASSISTANT_READ_ROUTES = new Set([
  "/ai/assistant/telemetry/overview",
  "/ai/assistant/alerts",
]);

export function getAuthenticatedRateLimitPolicy(method: string, path: string): AuthenticatedRateLimitPolicy {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split("?", 1)[0] || "/";
  const isRead = normalizedMethod === "GET";

  if (normalizedPath === "/auth/profile") return "auth-profile";
  if (normalizedPath === "/billing" || normalizedPath.startsWith("/billing/")) return "dedicated";
  if (ADMIN_ASSISTANT_READ_ROUTES.has(normalizedPath) && isRead) return "admin-read";
  if (normalizedPath === "/ai/personal-coach") return "dedicated";
  if (normalizedPath.startsWith("/assistant/") || normalizedPath === "/ai/assistant" || normalizedPath.startsWith("/ai/assistant/")) {
    return "dedicated";
  }
  if (normalizedMethod === "POST" && PLAN_BULK_SYNC_ROUTE.test(normalizedPath)) return "dedicated";
  if (normalizedPath.startsWith("/sync/12-week/")) return isRead ? "sync-read" : "sync-write";
  if (normalizedPath === "/account/export") return "account-export";
  if (normalizedPath === "/account" || normalizedPath === "/account/delete") return "account-destructive";
  if (normalizedPath.startsWith("/admin/")) return isRead ? "admin-read" : "admin-write";
  if (normalizedPath === "/orders" || normalizedPath.startsWith("/orders/")) {
    return isRead ? "order-read" : "order-write";
  }
  if (PLANNING_ROUTE_PREFIX.test(normalizedPath)) return isRead ? "planning-read" : "planning-write";
  return isRead ? "authenticated-read-fallback" : "authenticated-write-fallback";
}

const authenticatedPolicyLimiters = {
  "auth-profile": authProfileRateLimiter,
  "planning-read": createLimiter({
    name: "planning-read",
    keyPrefix: "planning-read",
    windowMs: ONE_MINUTE_MS,
    limit: 240,
    keyGenerator: userOrIpKey,
  }),
  "planning-write": createLimiter({
    name: "planning-write",
    keyPrefix: "planning-write",
    windowMs: ONE_MINUTE_MS,
    limit: 60,
    keyGenerator: userOrIpKey,
  }),
  "sync-read": createLimiter({
    name: "sync-read",
    keyPrefix: "sync-read",
    windowMs: ONE_MINUTE_MS,
    limit: 60,
    keyGenerator: userOrIpKey,
  }),
  "sync-write": createLimiter({
    name: "sync-write",
    keyPrefix: "sync-write",
    windowMs: ONE_MINUTE_MS,
    limit: 30,
    keyGenerator: userOrIpKey,
  }),
  "account-export": createLimiter({
    name: "account-export",
    keyPrefix: "account-export",
    windowMs: ONE_MINUTE_MS,
    limit: 10,
    keyGenerator: userOrIpKey,
  }),
  "account-destructive": createLimiter({
    name: "account-destructive",
    keyPrefix: "account-destructive",
    windowMs: ONE_MINUTE_MS,
    limit: 3,
    keyGenerator: userOrIpKey,
  }),
  "admin-read": createLimiter({
    name: "admin-read",
    keyPrefix: "admin-read",
    windowMs: ONE_MINUTE_MS,
    limit: 120,
    keyGenerator: userOrIpKey,
  }),
  "admin-write": createLimiter({
    name: "admin-write",
    keyPrefix: "admin-write",
    windowMs: ONE_MINUTE_MS,
    limit: 30,
    keyGenerator: userOrIpKey,
  }),
  "order-read": createLimiter({
    name: "order-read",
    keyPrefix: "order-read",
    windowMs: ONE_MINUTE_MS,
    limit: 120,
    keyGenerator: userOrIpKey,
  }),
  "order-write": createLimiter({
    name: "order-write",
    keyPrefix: "order-write",
    windowMs: ONE_MINUTE_MS,
    limit: 30,
    keyGenerator: userOrIpKey,
  }),
  "authenticated-read-fallback": createLimiter({
    name: "authenticated-read-fallback",
    keyPrefix: "authenticated-read-fallback",
    windowMs: ONE_MINUTE_MS,
    limit: 120,
    keyGenerator: userOrIpKey,
  }),
  "authenticated-write-fallback": createLimiter({
    name: "authenticated-write-fallback",
    keyPrefix: "authenticated-write-fallback",
    windowMs: ONE_MINUTE_MS,
    limit: 30,
    keyGenerator: userOrIpKey,
  }),
} satisfies Record<Exclude<AuthenticatedRateLimitPolicy, "dedicated">, RequestHandler>;

export const authenticatedApiRateLimiter: RequestHandler = (req, res, next) => {
  const policy = getAuthenticatedRateLimitPolicy(req.method, req.path);
  if (policy === "dedicated") {
    next();
    return;
  }

  authenticatedPolicyLimiters[policy](req, res, next);
};
