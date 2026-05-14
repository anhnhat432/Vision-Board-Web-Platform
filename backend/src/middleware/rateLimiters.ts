import { ipKeyGenerator, rateLimit, type RateLimitExceededEventHandler } from "express-rate-limit";
import type { Request } from "express";

import { captureBackendException } from "../monitoring/sentry";
import { errorResponse } from "../utils/apiResponse";

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

const rateLimitHandler: RateLimitExceededEventHandler = (req, res, _next, options) => {
  const context = {
    event: "rate_limit_hit",
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.uid,
    statusCode: options.statusCode,
  };
  console.warn("[rate-limit]", context);
  captureBackendException(new Error("Rate limit exceeded."), {
    tags: {
      event: "rate_limit_hit",
    },
    extra: context,
  });
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

export const webhookRateLimiter = createLimiter({
  keyPrefix: "webhook",
  windowMs: ONE_MINUTE_MS,
  limit: 60,
  keyGenerator: ipKey,
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

export const planBulkSyncRateLimiter = createLimiter({
  keyPrefix: "plan-bulk-sync",
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  keyGenerator: userOrIpKey,
});
