# Production API Rate-Limit Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate production API quotas by route family, remove accidental limiter stacking and duplicate 12-week sync traffic, and make planning GET recovery bounded and observable.

**Architecture:** Replace the shared authenticated quota with one dispatcher that selects exactly one named limiter family after Firebase auth, while exact billing, assistant, bulk-sync, webhook, health, and public-catalog routes keep dedicated middleware. Add a planning-only single-flight GET controller with one `Retry-After` retry, cap backend plan hydration at four concurrent detail reads, and make the legacy execution sync actions no-op when the production mutation queue is enabled.

**Tech Stack:** Express 4.21, express-rate-limit 8.5, TypeScript 5.7 backend, React 18, TypeScript 6 frontend, Vitest 3, Node test runner, Playwright smoke harness.

## Global Constraints

- Start from `origin/main@28e4ae370abbc4ef85fff9d91110f59d20f2f984` on `fix/production-api-rate-limit`.
- Preserve Firebase auth, PayOS billing, webhook signature verification, local-first saves, and explicit manual sync.
- Keep `errorCode: "rate_limited"` for normal limiter responses and `ASSISTANT_RATE_LIMITED` for assistant responses.
- Never log raw Firebase UID, full email, authorization headers, secrets, request bodies, or user content.
- Do not allowlist the production smoke account or ignore unrecovered HTTP 429 responses.
- Do not add dependencies or upgrade TypeScript.
- Write each behavioral test first and verify the expected failure before changing production code.
- Keep smoke harness edits localized; do not refactor the recorder or unrelated retry helpers.

## Spec Coverage Map

| Requirement | Planned evidence |
| --- | --- |
| `RL-001` | Task 2 health-route composition regression; Task 3 exact health middleware placement |
| `RL-002` | Task 2 planning burst followed by auth-profile request; Task 3 policy dispatcher |
| `RL-003` | Task 2 billing-status exhaustion followed by successful planning read |
| `RL-004` | Task 2 mixed valid burst plus Task 9 production-core aggregate |
| `RL-005` | Task 2 account-destructive 429 header/body assertions |
| `RL-006` | Task 2 captured warning context; Task 3 safe named handler |
| `RL-007` | Task 4 shared in-flight planning GET test |
| `RL-008` | Task 5 maximum-concurrency hydration test |
| `RL-009` | Task 4 fake-timer `Retry-After` test and exhausted second 429 test |
| `RL-010` | Task 4 parameterized non-retryable 4xx tests |
| `RL-011` | Task 6 mutation-sync-enabled no-legacy-call tests |
| `RL-012` | Task 6 existing legacy tests with mutation sync disabled |
| `RL-013` | Task 2 eleven-request checkout regression |
| `RL-014` | Task 2 unauthenticated assistant free-limit regression |
| `RL-015` | Task 2 241-request planning abuse regression |
| `RL-016` | Task 7 unrecovered 429 smoke source-contract test |

---

### Task 1: Establish The Clean Baseline

**Files:**
- Inspect: `docs/specs/2026-08-07-production-api-rate-limit.md`
- Inspect: `docs/superpowers/plans/2026-08-07-production-api-rate-limit.md`

**Interfaces:**
- Consumes: approved spec commit `b197e274`.
- Produces: installed worktree dependencies and baseline evidence before production-code edits.

- [ ] **Step 1: Confirm the approved spec and branch state**

Run:

```powershell
git status --short --branch
git log -2 --oneline
Select-String -Path docs/specs/2026-08-07-production-api-rate-limit.md -Pattern '^Status:'
```

Expected: branch `fix/production-api-rate-limit`, the approved spec and implementation plan commit is present, the working tree is clean, and `Status: Approved` is present.

- [ ] **Step 2: Install exact frontend and backend dependencies**

Run:

```powershell
npm ci
npm --prefix backend ci
```

Expected: both commands exit 0; `package-lock.json` and `backend/package-lock.json` remain unchanged.

- [ ] **Step 3: Run the smallest baseline checks covering touched surfaces**

Run:

```powershell
npm run test:ops -- scripts/production-smoke-harness.test.mjs
npm run test:sync -- src/app/hooks/useBackendPlanHydration.test.ts src/features/plan12week/hooks/usePlanExecutionSync.test.tsx
npm --prefix backend run check
```

Expected: current baseline passes before implementation. If a command fails, record the exact baseline failure and stop before production-code changes.

---

### Task 2: Add Failing Backend Limiter Isolation Tests

**Files:**
- Create: `backend/src/tests/rateLimiters.test.ts`
- Modify later: `backend/src/middleware/rateLimiters.ts`
- Modify later: `backend/src/routes/index.ts`
- Modify later: `backend/src/routes/healthRoutes.ts`
- Modify later: `backend/src/routes/webhookRoutes.ts`
- Modify later: `backend/src/routes/orderCatalogRoutes.ts`

**Interfaces:**
- Consumes: existing `billingCheckoutRateLimiter`, `billingStatusRateLimiter`, and `assistantRateLimiter`.
- Produces: expected exports `authenticatedApiRateLimiter` and `getAuthenticatedRateLimitPolicy(method, path)` plus integration coverage for named 429 responses.

- [ ] **Step 1: Create the backend test harness without importing missing named exports statically**

Create `backend/src/tests/rateLimiters.test.ts` with these helpers:

```ts
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";

import * as rateLimiters from "../middleware/rateLimiters";

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

async function startTestServer(app: Express): Promise<TestServer> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function setTestUser(req: express.Request, uid: string): void {
  req.user = { uid, emailVerified: true };
}

async function request(baseUrl: string, path: string, uid: string, method = "GET"): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "x-test-user": uid },
  });
}

afterEach(() => {
  mock.restoreAll();
});
```

- [ ] **Step 2: Write a failing export and policy-classification test**

Add:

```ts
it("exports one authenticated dispatcher and classifies current route families", () => {
  const module = rateLimiters as Record<string, unknown>;
  assert.equal(typeof module.authenticatedApiRateLimiter, "function");
  assert.equal(typeof module.getAuthenticatedRateLimitPolicy, "function");

  const classify = module.getAuthenticatedRateLimitPolicy as (method: string, path: string) => string;
  assert.equal(classify("GET", "/plans/507f1f77bcf86cd799439011"), "planning-read");
  assert.equal(classify("PATCH", "/weeks/507f1f77bcf86cd799439012"), "planning-write");
  assert.equal(classify("GET", "/sync/12-week/pull"), "sync-read");
  assert.equal(classify("POST", "/sync/12-week/mutations"), "sync-write");
  assert.equal(classify("DELETE", "/account/delete"), "account-destructive");
  assert.equal(classify("GET", "/admin/overview"), "admin-read");
  assert.equal(classify("POST", "/assistant/chat"), "dedicated");
  assert.equal(classify("POST", "/plans/507f1f77bcf86cd799439011/bulk-sync"), "dedicated");
});
```

- [ ] **Step 3: Run the new backend test and verify RED**

Run:

```powershell
npm --prefix backend run build
node --test backend/dist/tests/rateLimiters.test.js
```

Expected: build succeeds and the test fails because the dispatcher and classifier exports do not exist.

- [ ] **Step 4: Add failing integration cases for isolated authenticated keys and named 429 logs**

Build a test app after dynamically asserting the dispatcher exists:

```ts
function createAuthenticatedLimiterApp(): Express {
  const dispatcher = (rateLimiters as Record<string, unknown>).authenticatedApiRateLimiter;
  assert.equal(typeof dispatcher, "function");

  const app = express();
  app.use((req, _res, next) => {
    setTestUser(req, req.header("x-test-user") ?? "anonymous-test-user");
    next();
  });
  app.use(dispatcher as express.RequestHandler);
  app.all("*", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}
```

Add tests that:

```ts
it("does not let planning reads consume auth-profile quota", async () => {
  const server = await startTestServer(createAuthenticatedLimiterApp());
  try {
    for (let index = 0; index < 61; index += 1) {
      const response = await request(server.baseUrl, `/plans/507f1f77bcf86cd799439${String(index).padStart(3, "0")}`, "plan-user");
      assert.equal(response.status, 200);
    }
    assert.equal((await request(server.baseUrl, "/auth/profile", "plan-user")).status, 200);
  } finally {
    await server.close();
  }
});

it("keys destructive-account quota per authenticated user and logs a safe named context", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  const server = await startTestServer(createAuthenticatedLimiterApp());
  try {
    for (const uid of ["user-a", "user-b"]) {
      for (let index = 0; index < 3; index += 1) {
        assert.equal((await request(server.baseUrl, "/account/delete", uid, "DELETE")).status, 200);
      }
    }

    const blocked = await request(server.baseUrl, "/account/delete", "user-a", "DELETE");
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get("retry-after"));
    const body = (await blocked.json()) as { errorCode?: string };
    assert.equal(body.errorCode, "rate_limited");

    const context = warn.mock.calls
      .map((call) => call.arguments[1])
      .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
    assert.equal(context?.limiter, "account-destructive");
    assert.equal(context?.authenticated, true);
    assert.equal(typeof context?.keyHash, "string");
    assert.equal(context?.userId, undefined);
    assert.equal(context?.limit, 3);
    assert.equal(context?.windowMs, 60_000);
  } finally {
    await server.close();
  }
});
```

Add a billing/planning isolation test using the dispatcher plus the existing exact billing limiter:

```ts
it("keeps planning-read quota independent from billing-status traffic", async () => {
  const dispatcher = (rateLimiters as Record<string, unknown>).authenticatedApiRateLimiter;
  assert.equal(typeof dispatcher, "function");
  const app = express();
  app.use((req, _res, next) => {
    setTestUser(req, "billing-plan-user");
    next();
  });
  app.use(dispatcher as express.RequestHandler);
  app.get("/billing/entitlement", rateLimiters.billingStatusRateLimiter, (_req, res) => res.json({ ok: true }));
  app.get("/plans/:id", (_req, res) => res.json({ ok: true }));
  const server = await startTestServer(app);
  try {
    for (let index = 0; index < 40; index += 1) {
      assert.equal((await request(server.baseUrl, "/billing/entitlement", "billing-plan-user")).status, 200);
    }
    assert.equal((await request(server.baseUrl, "/billing/entitlement", "billing-plan-user")).status, 429);
    assert.equal((await request(server.baseUrl, "/plans/507f1f77bcf86cd799439011", "billing-plan-user")).status, 200);
  } finally {
    await server.close();
  }
});
```

Add an abuse test that sends 240 planning reads successfully and requires the 241st to return 429. Use one unique UID and one stable plan path so the test exercises the actual limiter store rather than controller behavior.

Add exact sensitive-limit regressions:

```ts
it("keeps checkout limited to ten requests per minute", async () => {
  const app = express();
  app.use((req, _res, next) => {
    setTestUser(req, "checkout-limit-user");
    next();
  });
  app.post("/billing/checkout-session", rateLimiters.billingCheckoutRateLimiter, (_req, res) => res.json({ ok: true }));
  const server = await startTestServer(app);
  try {
    for (let index = 0; index < 10; index += 1) {
      assert.equal((await request(server.baseUrl, "/billing/checkout-session", "checkout-limit-user", "POST")).status, 200);
    }
    assert.equal((await request(server.baseUrl, "/billing/checkout-session", "checkout-limit-user", "POST")).status, 429);
  } finally {
    await server.close();
  }
});

it("keeps the unauthenticated assistant free limit and error code", async () => {
  const app = express();
  app.post("/assistant/chat", rateLimiters.assistantRateLimiter, (_req, res) => res.json({ ok: true }));
  const server = await startTestServer(app);
  try {
    for (let index = 0; index < 20; index += 1) {
      assert.equal((await fetch(`${server.baseUrl}/assistant/chat`, { method: "POST" })).status, 200);
    }
    const blocked = await fetch(`${server.baseUrl}/assistant/chat`, { method: "POST" });
    assert.equal(blocked.status, 429);
    assert.equal(((await blocked.json()) as { errorCode?: string }).errorCode, "ASSISTANT_RATE_LIMITED");
  } finally {
    await server.close();
  }
});
```

Add a health-route composition regression by mounting `healthRoutes`, issuing 121 requests to an unrelated catch-all route, and then asserting the first `GET /health` still succeeds. This proves unrelated public traffic no longer increments the health bucket.

- [ ] **Step 5: Run the test and verify RED for missing behavior**

Run the same build and test commands. Expected: assertions fail because current middleware still stacks global/auth-profile quotas and logs raw `userId` without a limiter name.

---

### Task 3: Implement Named Route-Family Limiters

**Files:**
- Modify: `backend/src/middleware/rateLimiters.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/src/routes/healthRoutes.ts`
- Modify: `backend/src/routes/webhookRoutes.ts`
- Modify: `backend/src/routes/orderCatalogRoutes.ts`
- Test: `backend/src/tests/rateLimiters.test.ts`
- Test: `backend/src/tests/webhookRateLimit.test.ts`

**Interfaces:**
- Consumes: Firebase `req.user.uid`, `express-rate-limit` request metadata, existing exact billing/assistant/webhook/bulk-sync limiters.
- Produces: `getAuthenticatedRateLimitPolicy(method, path): AuthenticatedRateLimitPolicy` and `authenticatedApiRateLimiter: RequestHandler`.

- [ ] **Step 1: Make limiter names mandatory and sanitize observability fields**

Update the limiter factory shape:

```ts
import { createHash } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { RateLimitInfo } from "express-rate-limit";

function sanitizeRoute(req: Request): string {
  return (req.route?.path ?? req.originalUrl ?? req.path).split("?", 1)[0] ?? req.path;
}

function hashRateLimitKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function createRateLimitHandler(limiter: string, errorCode = "rate_limited"): RateLimitExceededEventHandler {
  return (req, res, _next, options) => {
    const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    const retryAfter = getRetryAfterSeconds(req, options.windowMs);
    const context = {
      event: "rate_limit_hit",
      limiter,
      route: sanitizeRoute(req),
      method: req.method,
      authenticated: Boolean(req.user?.uid),
      keyHash: hashRateLimitKey(info?.key),
      limit: info?.limit ?? (typeof options.limit === "number" ? options.limit : undefined),
      used: info?.used,
      remaining: info?.remaining,
      windowMs: options.windowMs,
      retryAfter,
      ip: req.ip,
      merchantId: getMerchantId(req),
      statusCode: options.statusCode,
    };
    console.warn("[rate-limit]", context);
    captureBackendException(new Error("Rate limit exceeded."), {
      tags: { event: "rate_limit_hit", limiter },
      extra: context,
    });
    res.setHeader("Retry-After", String(retryAfter));
    const payload = errorResponse("Too many requests. Please wait a moment and try again.");
    (payload as unknown as Record<string, unknown>).errorCode = errorCode;
    res.status(options.statusCode).json(payload);
  };
}
```

Change `createLimiter` to require `name`, use `identifier: name`, and call `createRateLimitHandler(name, errorCode)`.

- [ ] **Step 2: Define the authenticated policy selector in precedence order**

Add:

```ts
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

const PLANNING_PREFIX = /^\/(?:goals|plans|weeks|metrics|tasks|vision-boards)(?:\/|$)/;
const PLAN_BULK_SYNC = /^\/plans\/[^/]+\/bulk-sync$/;

export function getAuthenticatedRateLimitPolicy(method: string, path: string): AuthenticatedRateLimitPolicy {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split("?", 1)[0] || "/";
  const read = normalizedMethod === "GET";

  if (normalizedPath === "/auth/profile") return "auth-profile";
  if (normalizedPath.startsWith("/billing/")) return "dedicated";
  if (normalizedPath === "/billing") return "dedicated";
  if (normalizedPath.startsWith("/assistant/") || normalizedPath.startsWith("/ai/assistant")) {
    if (read) return normalizedPath.startsWith("/ai/assistant/") ? "admin-read" : "dedicated";
    return "dedicated";
  }
  if (normalizedMethod === "POST" && PLAN_BULK_SYNC.test(normalizedPath)) return "dedicated";
  if (normalizedPath.startsWith("/sync/12-week/")) return read ? "sync-read" : "sync-write";
  if (normalizedPath === "/account/export") return "account-export";
  if (normalizedPath === "/account" || normalizedPath === "/account/delete") return "account-destructive";
  if (normalizedPath.startsWith("/admin/")) return read ? "admin-read" : "admin-write";
  if (normalizedPath === "/orders" || normalizedPath.startsWith("/orders/")) return read ? "order-read" : "order-write";
  if (PLANNING_PREFIX.test(normalizedPath)) return read ? "planning-read" : "planning-write";
  return read ? "authenticated-read-fallback" : "authenticated-write-fallback";
}
```

The assistant admin-read rule must match only the two existing GET operations under `/ai/assistant/*`; POST assistant operations remain dedicated.

- [ ] **Step 3: Create policy-specific limiter instances and dispatcher**

Create named limiters with the approved values and a policy map:

```ts
const authenticatedPolicyLimiters = {
  "auth-profile": createLimiter({ name: "auth-profile", keyPrefix: "auth-profile", windowMs: ONE_MINUTE_MS, limit: 60, keyGenerator: userOrIpKey }),
  "planning-read": createLimiter({ name: "planning-read", keyPrefix: "planning-read", windowMs: ONE_MINUTE_MS, limit: 240, keyGenerator: userOrIpKey }),
  "planning-write": createLimiter({ name: "planning-write", keyPrefix: "planning-write", windowMs: ONE_MINUTE_MS, limit: 60, keyGenerator: userOrIpKey }),
  "sync-read": createLimiter({ name: "sync-read", keyPrefix: "sync-read", windowMs: ONE_MINUTE_MS, limit: 60, keyGenerator: userOrIpKey }),
  "sync-write": createLimiter({ name: "sync-write", keyPrefix: "sync-write", windowMs: ONE_MINUTE_MS, limit: 30, keyGenerator: userOrIpKey }),
  "account-export": createLimiter({ name: "account-export", keyPrefix: "account-export", windowMs: ONE_MINUTE_MS, limit: 10, keyGenerator: userOrIpKey }),
  "account-destructive": createLimiter({ name: "account-destructive", keyPrefix: "account-destructive", windowMs: ONE_MINUTE_MS, limit: 3, keyGenerator: userOrIpKey }),
  "admin-read": createLimiter({ name: "admin-read", keyPrefix: "admin-read", windowMs: ONE_MINUTE_MS, limit: 120, keyGenerator: userOrIpKey }),
  "admin-write": createLimiter({ name: "admin-write", keyPrefix: "admin-write", windowMs: ONE_MINUTE_MS, limit: 30, keyGenerator: userOrIpKey }),
  "order-read": createLimiter({ name: "order-read", keyPrefix: "order-read", windowMs: ONE_MINUTE_MS, limit: 120, keyGenerator: userOrIpKey }),
  "order-write": createLimiter({ name: "order-write", keyPrefix: "order-write", windowMs: ONE_MINUTE_MS, limit: 30, keyGenerator: userOrIpKey }),
  "authenticated-read-fallback": createLimiter({ name: "authenticated-read-fallback", keyPrefix: "authenticated-read-fallback", windowMs: ONE_MINUTE_MS, limit: 120, keyGenerator: userOrIpKey }),
  "authenticated-write-fallback": createLimiter({ name: "authenticated-write-fallback", keyPrefix: "authenticated-write-fallback", windowMs: ONE_MINUTE_MS, limit: 30, keyGenerator: userOrIpKey }),
} satisfies Record<Exclude<AuthenticatedRateLimitPolicy, "dedicated">, RequestHandler>;

export const authenticatedApiRateLimiter: RequestHandler = (req, res, next) => {
  const policy = getAuthenticatedRateLimitPolicy(req.method, req.path);
  if (policy === "dedicated") {
    next();
    return;
  }
  authenticatedPolicyLimiters[policy](req, res, next);
};
```

- [ ] **Step 4: Correct route composition and exact public-route scoping**

Update `backend/src/routes/index.ts` to this order:

```ts
apiRoutes.use(healthRoutes);
apiRoutes.use(webhookRoutes);
apiRoutes.use(publicBillingRoutes);
apiRoutes.use(publicDiscountRoutes);
apiRoutes.use("/order-catalog", orderCatalogRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(authenticatedApiRateLimiter);
apiRoutes.use(authRoutes);
```

Remove imports and uses of `generalApiRateLimiter` and root-mounted `authProfileRateLimiter`/`healthRateLimiter`.

Attach `healthRateLimiter` directly to both health GET routes. Add `webhookHealthRateLimiter` to each provider health GET route. Add `publicCatalogRateLimiter` directly to `orderCatalogRoutes.get("/", ...)`.

- [ ] **Step 5: Run focused backend tests and reach GREEN**

Run:

```powershell
npm --prefix backend run build
node --test backend/dist/tests/rateLimiters.test.js backend/dist/tests/webhookRateLimit.test.js backend/dist/tests/billingRoutes.test.js backend/dist/tests/assistantRoutes.test.js
```

Expected: all focused tests pass; checkout remains 10/minute, assistant keeps `ASSISTANT_RATE_LIMITED`, planning requests no longer consume auth-profile quota, and logs contain no raw UID.

- [ ] **Step 6: Commit backend isolation**

Run:

```powershell
git add backend/src/middleware/rateLimiters.ts backend/src/routes/index.ts backend/src/routes/healthRoutes.ts backend/src/routes/webhookRoutes.ts backend/src/routes/orderCatalogRoutes.ts backend/src/tests/rateLimiters.test.ts backend/src/tests/webhookRateLimit.test.ts
git commit -m "fix(backend): isolate authenticated API rate limits"
```

---

### Task 4: Add Planning GET Single-Flight And Retry Tests

**Files:**
- Create: `src/services/planningReadRequest.ts`
- Create: `src/services/planningReadRequest.test.ts`
- Modify: `src/services/planService.ts`
- Modify: `src/services/weekService.ts`
- Modify: `src/services/metricService.ts`

**Interfaces:**
- Consumes: `apiClient.get`, `isRateLimitError`, and parsed `retryAfterMs`.
- Produces: `getPlanningResource<T>(path: string): Promise<T>`.

- [ ] **Step 1: Write failing single-flight and bounded retry tests**

Create `src/services/planningReadRequest.test.ts` and mock only the underlying API call:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/lib/api/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/apiClient")>("@/lib/api/apiClient");
  return {
    ...actual,
    apiClient: { ...actual.apiClient, get: apiGet },
  };
});

import { getPlanningResource } from "./planningReadRequest";

describe("getPlanningResource", () => {
  beforeEach(() => {
    apiGet.mockReset();
    vi.useRealTimers();
  });

  it("shares one in-flight GET for the same path", async () => {
    let resolveRequest: ((value: { id: string }) => void) | undefined;
    apiGet.mockImplementation(
      () => new Promise<{ id: string }>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = getPlanningResource<{ id: string }>("/plans/plan-single-flight");
    const second = getPlanningResource<{ id: string }>("/plans/plan-single-flight");
    expect(apiGet).toHaveBeenCalledTimes(1);
    resolveRequest?.({ id: "plan-single-flight" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: "plan-single-flight" },
      { id: "plan-single-flight" },
    ]);
  });

  it("waits Retry-After and retries a planning GET once", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    apiGet
      .mockRejectedValueOnce({ status: 429, rateLimited: true, retryAfterMs: 2_000, message: "rate limited" })
      .mockResolvedValueOnce({ id: "plan-recovered" });

    const request = getPlanningResource<{ id: string }>("/plans/plan-recovered");
    await vi.advanceTimersByTimeAsync(1_999);
    expect(apiGet).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual({ id: "plan-recovered" });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 409, 422])("does not retry HTTP %s", async (status) => {
    apiGet.mockRejectedValueOnce({ status, message: "not retryable" });
    await expect(getPlanningResource(`/plans/no-retry-${status}`)).rejects.toMatchObject({ status });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it("surfaces the second 429 without starting a third request", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    apiGet.mockRejectedValue({ status: 429, rateLimited: true, retryAfterMs: 1, message: "still limited" });
    const request = getPlanningResource("/plans/retry-exhausted");
    await vi.runAllTimersAsync();
    await expect(request).rejects.toMatchObject({ status: 429 });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm run test:run -- src/services/planningReadRequest.test.ts
```

Expected: test collection fails because `planningReadRequest.ts` does not exist.

- [ ] **Step 3: Implement the minimal planning-only controller**

Create `src/services/planningReadRequest.ts`:

```ts
import { apiClient, isRateLimitError } from "@/lib/api/apiClient";

const MAX_RATE_LIMIT_RETRIES = 1;
const MAX_JITTER_MS = 250;
const inFlightPlanningReads = new Map<string, Promise<unknown>>();

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
}

async function runPlanningRead<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await apiClient.get<T>(path);
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) throw error;
      const retryAfterMs = typeof error.retryAfterMs === "number" ? error.retryAfterMs : 5_000;
      const jitterMs = Math.floor(Math.random() * (MAX_JITTER_MS + 1));
      await wait(retryAfterMs + jitterMs);
    }
  }
}

export function getPlanningResource<T>(path: string): Promise<T> {
  const key = `GET:${path}`;
  const existing = inFlightPlanningReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = runPlanningRead<T>(path).finally(() => {
    inFlightPlanningReads.delete(key);
  });
  inFlightPlanningReads.set(key, request);
  return request;
}
```

- [ ] **Step 4: Route planning read services through the controller**

Change only read functions:

```ts
export function getPlans(): Promise<Plan[]> {
  return getPlanningResource<Plan[]>("/plans");
}

export function getPlan(planId: string): Promise<PlanDetails> {
  return getPlanningResource<PlanDetails>(`/plans/${planId}`);
}

export function getWeeks(planId: string): Promise<Week[]> {
  return getPlanningResource<Week[]>(`/plans/${planId}/weeks`);
}

export function getMetrics(weekId: string): Promise<Metric[]> {
  return getPlanningResource<Metric[]>(`/weeks/${weekId}/metrics`);
}
```

Keep POST/PATCH/DELETE functions on the existing API client with no automatic retry.

- [ ] **Step 5: Run focused frontend tests and reach GREEN**

Run:

```powershell
npm run test:run -- src/services/planningReadRequest.test.ts src/lib/api/apiClient.file.test.ts
npm run typecheck
```

Expected: single-flight, retry timing, retry exhaustion, and non-retryable 4xx cases pass; typecheck exits 0.

- [ ] **Step 6: Commit planning read control**

Run:

```powershell
git add src/services/planningReadRequest.ts src/services/planningReadRequest.test.ts src/services/planService.ts src/services/weekService.ts src/services/metricService.ts
git commit -m "fix(frontend): bound planning read retries"
```

---

### Task 5: Cap Plan Hydration Concurrency

**Files:**
- Modify: `src/app/hooks/useBackendPlanHydration.ts`
- Modify: `src/app/hooks/useBackendPlanHydration.test.ts`

**Interfaces:**
- Consumes: shared single-flight `getPlan` service.
- Produces: ordered `PromiseSettledResult` values with maximum concurrency 4.

- [ ] **Step 1: Add a failing hydration concurrency test**

Append a test that creates eight plan summaries and tracks active detail requests:

```ts
it("hydrates plan details with at most four concurrent requests", async () => {
  const plans = Array.from({ length: 8 }, (_, index) => ({
    ...createPlanDetails().plan,
    id: `plan_${index + 1}`,
    smartGoalId: `goal_${index + 1}`,
    updatedAt: `2026-04-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));
  let active = 0;
  let maximumActive = 0;

  vi.mocked(getGoals).mockResolvedValue([]);
  vi.mocked(getPlans).mockResolvedValue(plans);
  vi.mocked(getPlan).mockImplementation(async (planId) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    const details = createPlanDetails();
    return { ...details, plan: { ...details.plan, id: planId } };
  });

  await hydrateTwelveWeekPlansFromBackend();
  expect(maximumActive).toBeLessThanOrEqual(4);
  expect(getPlan).toHaveBeenCalledTimes(8);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm run test:sync -- src/app/hooks/useBackendPlanHydration.test.ts
```

Expected: `maximumActive` is 8 with the existing `Promise.allSettled(plans.map(...))` implementation.

- [ ] **Step 3: Implement ordered bounded settlement locally in the hydration module**

Add:

```ts
const PLAN_DETAIL_HYDRATION_CONCURRENCY = 4;

async function allSettledWithConcurrency<T, TResult>(
  inputs: readonly T[],
  concurrency: number,
  worker: (input: T) => Promise<TResult>,
): Promise<PromiseSettledResult<TResult>[]> {
  const results = new Array<PromiseSettledResult<TResult>>(inputs.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < inputs.length) {
      const index = nextIndex;
      nextIndex += 1;
      const input = inputs[index];
      if (input === undefined) continue;
      try {
        results[index] = { status: "fulfilled", value: await worker(input) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), inputs.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
```

Replace the unbounded detail fan-out with:

```ts
const detailsPromise = allSettledWithConcurrency(
  plansByRecency,
  PLAN_DETAIL_HYDRATION_CONCURRENCY,
  (plan) => getPlan(plan.id),
);
```

- [ ] **Step 4: Run focused hydration and plan-sync tests**

Run:

```powershell
npm run test:sync -- src/app/hooks/useBackendPlanHydration.test.ts src/features/plan12week/hooks/usePlanExecutionSync.test.tsx
```

Expected: all hydration behavior remains green and maximum concurrency is 4.

- [ ] **Step 5: Commit hydration control**

Run:

```powershell
git add src/app/hooks/useBackendPlanHydration.ts src/app/hooks/useBackendPlanHydration.test.ts
git commit -m "fix(sync): cap plan hydration concurrency"
```

---

### Task 6: Remove The Duplicate Automatic Execution Sync Path

**Files:**
- Modify: `src/features/plan12week/hooks/usePlanExecutionSync.ts`
- Modify: `src/features/plan12week/hooks/usePlanExecutionSync.test.tsx`

**Interfaces:**
- Consumes: `shouldEnable12WeekMutationSync()`.
- Produces: task/check-in/review action methods that return success without legacy network/queue work when mutation sync is enabled.

- [ ] **Step 1: Make the feature flag controllable in the existing test**

Replace the fixed app-mode mock with a hoisted function:

```ts
const { shouldEnableMutationSync } = vi.hoisted(() => ({
  shouldEnableMutationSync: vi.fn(() => false),
}));

vi.mock("@/app/utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  shouldEnable12WeekMutationSync: shouldEnableMutationSync,
  shouldEnable12WeekPullSync: () => true,
  shouldEnable12WeekImportDryRun: () => true,
  shouldEnable12WeekCloudImport: () => true,
}));
```

Reset it to `false` in `beforeEach` so existing tests continue to cover the legacy fallback.

- [ ] **Step 2: Add failing production-mode no-duplicate tests**

Add one test per action:

```ts
it("does not run legacy task sync when mutation sync is enabled", async () => {
  shouldEnableMutationSync.mockReturnValue(true);
  const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));
  await expect(result.current.actions.syncTaskToggle("task_1", true)).resolves.toBe(true);
  expect(getPlan).not.toHaveBeenCalled();
  expect(getPlans).not.toHaveBeenCalled();
  expect(toggleTask).not.toHaveBeenCalled();
});

it("does not run legacy check-in or review sync when mutation sync is enabled", async () => {
  shouldEnableMutationSync.mockReturnValue(true);
  const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1", system: buildSystem() }));
  await expect(result.current.actions.syncDailyCheckIn({ weekNumber: 1, date: "2026-08-07", didWorkToday: true })).resolves.toBe(true);
  await expect(result.current.actions.syncWeeklyReview({ weekNumber: 1, executionScore: 80 })).resolves.toBe(true);
  expect(getPlan).not.toHaveBeenCalled();
  expect(getMetrics).not.toHaveBeenCalled();
  expect(updateWeekReview).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
npm run test:sync -- src/features/plan12week/hooks/usePlanExecutionSync.test.tsx
```

Expected: current code calls or enqueues the legacy path, so the new no-call assertions fail.

- [ ] **Step 4: Add early success returns to the three automatic actions**

Implement the smallest change in the public action wrappers:

```ts
if (shouldEnable12WeekMutationSync()) {
  return Promise.resolve(true);
}
```

Apply it at the start of `syncTaskToggle`, `syncDailyCheckIn`, and `syncWeeklyReview`, after the existing goal/system/enabled guard and before any direct call or legacy queue enqueue. Do not change `syncLocalSnapshot` or explicit manual sync methods.

- [ ] **Step 5: Run sync regression tests and reach GREEN**

Run:

```powershell
npm run test:sync -- src/features/plan12week/hooks/usePlanExecutionSync.test.tsx src/features/plan12week/hooks/usePlanExecutionRoundTrip.test.tsx src/features/plan12week/hooks/useAutoCloudSync.test.ts
```

Expected: production mutation-sync tests issue no legacy requests, while tests with the flag disabled preserve legacy sync behavior.

- [ ] **Step 6: Commit the single-path sync fix**

Run:

```powershell
git add src/features/plan12week/hooks/usePlanExecutionSync.ts src/features/plan12week/hooks/usePlanExecutionSync.test.tsx
git commit -m "fix(sync): use one automatic mutation path"
```

---

### Task 7: Make Production Smoke Strict About Unrecovered 429 Responses

**Files:**
- Modify: `scripts/smoke-production-e2e.mjs`
- Modify: `scripts/production-smoke-harness.test.mjs`

**Interfaces:**
- Consumes: recorded API events with `method`, `url`, `status`, `at`, and optional `handledByRateLimitRetry`.
- Produces: `hasLaterSuccessfulRetry(event, apiEvents): boolean` used only by final severe-failure aggregation.

- [ ] **Step 1: Replace the existing allowlist source-contract test with failing recovery semantics**

Change the test to assert:

```js
it("fails unrecovered 429 responses and accepts only an explicit or later successful retry", () => {
  expect(smokeScript).toContain("function hasLaterSuccessfulRetry(event, apiEvents)");
  expect(smokeScript).toContain("candidate.at > event.at");
  expect(smokeScript).toContain("candidate.method === event.method");
  expect(smokeScript).toContain("normalizeApiUrl(candidate.url) === normalizeApiUrl(event.url)");
  expect(smokeScript).toContain("candidate.status >= 200 && candidate.status < 300");
  expect(smokeScript).toContain(
    "event.status === 429 && !event.handledByRateLimitRetry && !hasLaterSuccessfulRetry(event, apiEvents)",
  );
  expect(smokeScript).not.toContain("function isExpectedBackgroundRateLimit(event)");
  expect(smokeScript).not.toContain('/^\\/api\\/plans\\/[^/]+$/.test(pathname)');
});
```

- [ ] **Step 2: Run the smoke harness test and verify RED**

Run:

```powershell
npm run test:ops -- scripts/production-smoke-harness.test.mjs
```

Expected: failure because the current script still uses pathname-based `isExpectedBackgroundRateLimit`.

- [ ] **Step 3: Implement a narrow final-aggregation recovery check**

Add near the existing rate-limit helpers:

```js
function normalizeApiUrl(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}${url.search}`;
}

function hasLaterSuccessfulRetry(event, apiEvents) {
  const normalizedUrl = normalizeApiUrl(event.url);
  return apiEvents.some(
    (candidate) =>
      candidate.at > event.at &&
      candidate.method === event.method &&
      normalizeApiUrl(candidate.url) === normalizedUrl &&
      candidate.status >= 200 &&
      candidate.status < 300,
  );
}
```

Delete `isExpectedBackgroundRateLimit`. Change only the final `severeApiFailures` predicate so a 429 is severe when it is neither explicitly handled nor followed by a successful same-request retry.

- [ ] **Step 4: Run smoke harness and operations tests**

Run:

```powershell
npm run test:ops
```

Expected: all operations tests pass; no route pathname is blanket-allowlisted.

- [ ] **Step 5: Commit the strict smoke contract**

Run:

```powershell
git add scripts/smoke-production-e2e.mjs scripts/production-smoke-harness.test.mjs
git commit -m "test(smoke): fail unrecovered API rate limits"
```

---

### Task 8: Update Production Readiness Documentation

**Files:**
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md`
- Modify: `guidelines/SOFT_LAUNCH_CHECKLIST.md`
- Modify: `docs/ops/staging-proof-runbook.md`

**Interfaces:**
- Consumes: implemented limiter matrix and local verification evidence.
- Produces: concise operational guidance without claiming undeployed evidence.

- [ ] **Step 1: Update current status with the proven root cause and local state**

Add a concise entry stating:

```markdown
- Production API 429 root cause was middleware composition, not only quota size: root-mounted `healthRateLimiter` and `authProfileRateLimiter` counted unrelated API traffic, while `generalApiRateLimiter` pooled all authenticated domains. The fix isolates named route-family quotas, bounds planning hydration/retry, and removes duplicate automatic legacy sync when mutation sync is enabled. Local verification evidence is recorded on the fix branch; deployed smoke evidence remains pending.
```

- [ ] **Step 2: Update the soft-launch checklist without overwriting historical run evidence**

Append to the existing production-smoke row or note:

```markdown
Rate-limit isolation fix requires deployment, then two consecutive full-smoke passes on the same commit. Until those workflow URLs are recorded, the production evidence status remains pending even if local checks pass.
```

- [ ] **Step 3: Add the exact operator verification sequence to the runbook**

Document:

```bash
gh workflow run production-smoke-e2e.yml -f target_url=https://dearourfuture.io.vn
$firstRunId = gh run list --workflow production-smoke-e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view $firstRunId --log
gh workflow run production-smoke-e2e.yml -f target_url=https://dearourfuture.io.vn
$secondRunId = gh run list --workflow production-smoke-e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view $secondRunId --log
```

Require both runs to use the same deployed commit and record target URL, commit SHA, run URLs, and results.

- [ ] **Step 4: Review documentation diff for scope and truthfulness**

Run:

```powershell
git diff --check
git diff -- guidelines/CURRENT_PROJECT_STATUS.md guidelines/SOFT_LAUNCH_CHECKLIST.md docs/ops/staging-proof-runbook.md
```

Expected: only rate-limit root cause, design, verification, and missing deployed evidence are changed.

- [ ] **Step 5: Commit documentation updates**

Run:

```powershell
git add guidelines/CURRENT_PROJECT_STATUS.md guidelines/SOFT_LAUNCH_CHECKLIST.md docs/ops/staging-proof-runbook.md
git commit -m "docs: document production rate-limit verification"
```

---

### Task 9: Run Complete Verification And Security Review

**Files:**
- Inspect: all changed files
- Do not modify unless a verification failure is caused by this branch.

**Interfaces:**
- Consumes: all implementation commits.
- Produces: command-by-command evidence, spec traceability, secret scan, and residual-risk report.

- [ ] **Step 1: Run focused red-green regression commands once more**

Run:

```powershell
npm run test:run -- src/services/planningReadRequest.test.ts
npm run test:sync -- src/app/hooks/useBackendPlanHydration.test.ts src/features/plan12week/hooks/usePlanExecutionSync.test.tsx src/features/plan12week/hooks/usePlanExecutionRoundTrip.test.tsx src/features/plan12week/hooks/useAutoCloudSync.test.ts
npm run test:ops -- scripts/production-smoke-harness.test.mjs
npm --prefix backend run build
node --test backend/dist/tests/rateLimiters.test.js backend/dist/tests/webhookRateLimit.test.js backend/dist/tests/billingRoutes.test.js backend/dist/tests/assistantRoutes.test.js
```

Expected: all focused tests pass with zero failures.

- [ ] **Step 2: Run every requested frontend and backend verification command**

Run exactly:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
npm --prefix backend run check
npm run test:production-core
npm run check:all
npm run audit:prod
npm run audit:prod:backend
```

Expected: each command exits 0. Record exact failures; do not summarize an unrun or failing command as passed.

- [ ] **Step 3: Run runtime-env checks without inventing unavailable credentials**

Run:

```powershell
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

Expected: pass when local env and backend are available. If blocked by missing MongoDB, Firebase, API health, or credentials, record the exact missing requirement and keep the result separate from code-test failures.

- [ ] **Step 4: Perform security and secret review**

Run:

```powershell
git diff origin/main...HEAD -- backend/src/middleware/rateLimiters.ts backend/src/routes src/services src/app/hooks src/features/plan12week scripts
git diff origin/main...HEAD | rg -n -i 'api[_-]?key|secret|password|authorization: bearer|private[_-]?key|firebase.*token|payos.*key'
```

Inspect every match. Expected: no committed secret, full email, raw UID log, token, or payment credential; exact sensitive route limits remain present.

- [ ] **Step 5: Verify spec traceability**

Check every `RL-001` through `RL-016` against code and tests. Add a PR checklist table with columns `Requirement`, `Code`, `Test`, and `Evidence`. Do not mark deployed smoke criteria complete locally.

- [ ] **Step 6: Confirm clean diff and commit any verification-only correction**

Run:

```powershell
git status --short
git diff --check
git log --oneline origin/main..HEAD
```

Expected: no uncommitted generated artifacts. If a branch-related correction was necessary, commit it with a focused message before proceeding.

---

### Task 10: Push Branch And Open The Draft Pull Request

**Files:**
- No repository file changes expected.

**Interfaces:**
- Consumes: verified branch and command evidence.
- Produces: remote branch and draft PR targeting `main` without merge or production deployment.

- [ ] **Step 1: Push the exact branch**

Run:

```powershell
git push -u origin fix/production-api-rate-limit
```

Expected: remote branch is created or updated successfully.

- [ ] **Step 2: Create a draft PR with the required diagnosis and evidence**

Run:

```powershell
$body = @'
## Root cause
- Express flattened root-mounted limiter/router callback pairs, so health and auth-profile quotas counted unrelated requests.
- The global authenticated limiter pooled planning, sync, billing, auth, order, and admin traffic.
- Plan hydration fanned out unbounded detail reads, and mutation-sync mode also invoked the legacy automatic execution path.

## Changes
- Named route-family quota isolation and safe 429 observability.
- Planning GET single-flight, one Retry-After retry, and hydration concurrency 4.
- One automatic mutation path in production mutation-sync mode.
- Smoke fails unrecovered 429 responses without pathname allowlists.

## Verification
Paste the exact Task 9 command results here before running gh pr create.

## Deployment evidence required
- Deploy the reviewed commit through the normal path.
- Run quick smoke, then two consecutive full production-smoke runs on the same deployed commit.
- Record both workflow URLs before changing the proof ledger to pass.

## Rollback
- Revert the feature commits; do not disable billing, assistant, webhook, or destructive-account limiters.
'@
gh pr create --draft --base main --head fix/production-api-rate-limit --title "fix: isolate production API rate limits" --body $body
```

Replace the single verification instruction line in `$body` with the exact Task 9 results before calling `gh pr create`; do not create a tracked temporary PR-body file.

- [ ] **Step 3: Inspect the remote PR and CI state**

Run:

```powershell
gh pr view --web=false
gh pr checks --watch=false
```

Expected: draft PR targets `main`, contains the correct branch, and reports current CI state. Do not merge and do not deploy production.

- [ ] **Step 4: Report remaining operator steps**

Report that the operator must deploy the reviewed commit, run quick smoke, and obtain two consecutive full-smoke passes on the same deployment. Include exact run URLs only after they exist.
