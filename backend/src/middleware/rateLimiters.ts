import { ipKeyGenerator, rateLimit, type RateLimitExceededEventHandler } from "express-rate-limit";
import type { Request } from "express";

import { captureBackendException } from "../monitoring/sentry";
import { errorResponse } from "../utils/apiResponse";

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

function getHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getMerchantId(req: Request): string | undefined {
  return getHeaderValue(req, "x-casso-merchant-id") ?? getHeaderValue(req, "x-payos-merchant-id");
}

function getRetryAfterSeconds(req: Request, windowMs: number): number {
  const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  }

  return Math.max(1, Math.ceil(windowMs / 1000));
}

const rateLimitHandler: RateLimitExceededEventHandler = (req, res, _next, options) => {
  const route = req.route?.path ?? req.originalUrl ?? req.path;
  const merchantId = getMerchantId(req);
  const context = {
    event: "rate_limit_hit",
    route,
    path: req.path,
    method: req.method,
    ip: req.ip,
    merchantId,
    userId: req.user?.uid,
    statusCode: options.statusCode,
  };
  console.warn("[rate-limit]", context);
  captureBackendException(new Error("Rate limit exceeded."), {
    tags: {
      event: "rate_limit_hit",
      route: String(route),
    },
    extra: context,
  });
  res.setHeader("Retry-After", String(getRetryAfterSeconds(req, options.windowMs)));
  const payload = errorResponse("Too many requests. Please wait a moment and try again.");
  (payload as unknown as Record<string, unknown>).errorCode = "rate_limited";
  res.status(options.statusCode).json(payload);
};

function userOrIpKey(req: Request): string {
  if (req.user?.uid) return `user:${req.user.uid}`;
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

function ipKey(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

function createLimiter({
  keyPrefix,
  limit,
  windowMs,
  keyGenerator,
}: {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  keyGenerator: (req: Request) => string;
}) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: (req) => `${keyPrefix}:${keyGenerator(req)}`,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
}

export const healthRateLimiter = createLimiter({
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
  keyPrefix: "webhook",
  windowMs: ONE_MINUTE_MS,
  limit: 300,
  keyGenerator: ipKey,
});

export const cassoWebhookLimiter = createLimiter({
  keyPrefix: "webhook:casso",
  windowMs: ONE_MINUTE_MS,
  limit: 600,
  keyGenerator: merchantOrIpKey("x-casso-merchant-id"),
});

export const payosWebhookLimiter = createLimiter({
  keyPrefix: "webhook:payos",
  windowMs: ONE_MINUTE_MS,
  limit: 600,
  keyGenerator: merchantOrIpKey("x-payos-merchant-id"),
});

export const generalApiRateLimiter = createLimiter({
  keyPrefix: "api",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: userOrIpKey,
});

export const authProfileRateLimiter = createLimiter({
  keyPrefix: "auth-profile",
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 120,
  keyGenerator: userOrIpKey,
});

export const billingCheckoutRateLimiter = createLimiter({
  keyPrefix: "billing-checkout",
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  keyGenerator: userOrIpKey,
});

export const billingStatusRateLimiter = createLimiter({
  keyPrefix: "billing-status",
  windowMs: ONE_MINUTE_MS,
  limit: 40,
  keyGenerator: userOrIpKey,
});

export const billingHistoryRateLimiter = createLimiter({
  keyPrefix: "billing-history",
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  keyGenerator: userOrIpKey,
});

export const planBulkSyncRateLimiter = createLimiter({
  keyPrefix: "plan-bulk-sync",
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  keyGenerator: userOrIpKey,
});
