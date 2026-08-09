import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";

import * as rateLimiters from "../middleware/rateLimiters";
import { healthRoutes } from "../routes/healthRoutes";
import { billingService } from "../services/billingServiceInstance";

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

async function request(
  baseUrl: string,
  path: string,
  uid: string,
  method = "GET",
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "x-test-user": uid,
      ...headers,
    },
  });
}

function createAuthenticatedLimiterApp(): Express {
  const app = express();
  app.use((req, _res, next) => {
    setTestUser(req, req.header("x-test-user") ?? "anonymous-test-user");
    next();
  });
  app.use(rateLimiters.authenticatedApiRateLimiter);
  app.all("*", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

afterEach(() => {
  mock.restoreAll();
});

describe("authenticated API rate-limit policies", () => {
  it("exports one dispatcher and classifies current route families", () => {
    const module = rateLimiters as unknown as Record<string, unknown>;
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
    assert.equal(classify("POST", "/ai/personal-coach"), "dedicated");
    assert.equal(classify("POST", "/plans/507f1f77bcf86cd799439011/bulk-sync"), "dedicated");
  });

  it("does not let planning reads consume auth-profile quota", async () => {
    const server = await startTestServer(createAuthenticatedLimiterApp());
    try {
      for (let index = 0; index < 61; index += 1) {
        const response = await request(
          server.baseUrl,
          `/plans/507f1f77bcf86cd799439${String(index).padStart(3, "0")}`,
          "plan-auth-isolation-user",
        );
        assert.equal(response.status, 200);
      }

      assert.equal((await request(server.baseUrl, "/auth/profile", "plan-auth-isolation-user")).status, 200);
    } finally {
      await server.close();
    }
  });

  it("keys destructive-account quota per authenticated user and logs a safe named context", async () => {
    const warn = mock.method(console, "warn", () => undefined);
    const server = await startTestServer(createAuthenticatedLimiterApp());
    try {
      for (const uid of ["account-user-a", "account-user-b"]) {
        for (let index = 0; index < 3; index += 1) {
          assert.equal((await request(server.baseUrl, "/account/delete", uid, "DELETE")).status, 200);
        }
      }

      const blocked = await request(server.baseUrl, "/account/delete", "account-user-a", "DELETE");
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers.get("retry-after"));
      const body = (await blocked.json()) as { errorCode?: string };
      assert.equal(body.errorCode, "rate_limited");

      const context = warn.mock.calls
        .map((call) => call.arguments[1])
        .find(
          (value): value is Record<string, unknown> =>
            Boolean(value) && typeof value === "object" && (value as Record<string, unknown>).event === "rate_limit_hit",
        );
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

  it("keeps planning-read quota independent from billing-status traffic", async () => {
    const app = express();
    app.use((req, _res, next) => {
      setTestUser(req, "billing-plan-isolation-user");
      next();
    });
    app.use(rateLimiters.authenticatedApiRateLimiter);
    app.get("/billing/entitlement", rateLimiters.billingStatusRateLimiter, (_req, res) => res.json({ ok: true }));
    app.get("/plans/:id", (_req, res) => res.json({ ok: true }));
    const server = await startTestServer(app);

    try {
      for (let index = 0; index < 40; index += 1) {
        assert.equal(
          (await request(server.baseUrl, "/billing/entitlement", "billing-plan-isolation-user")).status,
          200,
        );
      }
      assert.equal(
        (await request(server.baseUrl, "/billing/entitlement", "billing-plan-isolation-user")).status,
        429,
      );
      assert.equal(
        (await request(server.baseUrl, "/plans/507f1f77bcf86cd799439011", "billing-plan-isolation-user")).status,
        200,
      );
    } finally {
      await server.close();
    }
  });

  it("allows the documented planning-read burst and throttles abuse", async () => {
    const server = await startTestServer(createAuthenticatedLimiterApp());
    try {
      for (let index = 0; index < 240; index += 1) {
        assert.equal(
          (await request(server.baseUrl, "/plans/507f1f77bcf86cd799439011", "planning-abuse-user")).status,
          200,
        );
      }
      assert.equal(
        (await request(server.baseUrl, "/plans/507f1f77bcf86cd799439011", "planning-abuse-user")).status,
        429,
      );
    } finally {
      await server.close();
    }
  });

  it("keeps checkout limited to ten requests per minute", async () => {
    const app = express();
    app.use((req, _res, next) => {
      setTestUser(req, "checkout-limit-user");
      next();
    });
    app.post("/billing/checkout-session", rateLimiters.billingCheckoutRateLimiter, (_req, res) =>
      res.json({ ok: true }),
    );
    const server = await startTestServer(app);

    try {
      for (let index = 0; index < 10; index += 1) {
        assert.equal(
          (await request(server.baseUrl, "/billing/checkout-session", "checkout-limit-user", "POST")).status,
          200,
        );
      }
      assert.equal(
        (await request(server.baseUrl, "/billing/checkout-session", "checkout-limit-user", "POST")).status,
        429,
      );
    } finally {
      await server.close();
    }
  });

  it("keeps the unauthenticated assistant free limit and error code", async () => {
    const assistantIp = "203.0.113.81";
    const app = express();
    app.set("trust proxy", 1);
    app.post("/assistant/chat", rateLimiters.assistantRateLimiter, (_req, res) => res.json({ ok: true }));
    const server = await startTestServer(app);

    try {
      for (let index = 0; index < 20; index += 1) {
        const response = await fetch(`${server.baseUrl}/assistant/chat`, {
          method: "POST",
          headers: { "x-forwarded-for": assistantIp },
        });
        assert.equal(response.status, 200);
      }

      const blocked = await fetch(`${server.baseUrl}/assistant/chat`, {
        method: "POST",
        headers: { "x-forwarded-for": assistantIp },
      });
      assert.equal(blocked.status, 429);
      assert.equal(((await blocked.json()) as { errorCode?: string }).errorCode, "ASSISTANT_RATE_LIMITED");
    } finally {
      rateLimiters.assistantRateLimiter.resetKey(`assistant:ip:${assistantIp}`);
      await server.close();
    }
  });

  it("does not log the raw Firebase UID when assistant entitlement lookup fails", async () => {
    const entitlementLookup = mock.method(billingService, "getCurrentEntitlementForUser", async () => {
      throw new Error("test entitlement failure");
    });
    const warn = mock.method(console, "warn", () => undefined);
    const app = express();
    app.use((req, _res, next) => {
      setTestUser(req, "assistant-sensitive-uid");
      next();
    });
    app.post("/assistant/chat", rateLimiters.assistantRateLimiter, (_req, res) => res.json({ ok: true }));
    const server = await startTestServer(app);

    try {
      assert.equal((await request(server.baseUrl, "/assistant/chat", "assistant-sensitive-uid", "POST")).status, 200);
      assert.equal(entitlementLookup.mock.callCount(), 1);

      const context = warn.mock.calls
        .map((call) => call.arguments[1])
        .find(
          (value): value is Record<string, unknown> =>
            Boolean(value) && typeof value === "object" && "error" in value,
        );
      assert.equal(typeof context?.keyHash, "string");
      assert.equal(context?.userId, undefined);
      assert.equal(JSON.stringify(context).includes("assistant-sensitive-uid"), false);
    } finally {
      rateLimiters.assistantRateLimiter.resetKey("assistant:user:assistant-sensitive-uid");
      await server.close();
    }
  });

  it("scopes the health quota to health routes only", async () => {
    const healthIp = "203.0.113.82";
    const app = express();
    app.set("trust proxy", 1);
    app.use(healthRoutes);
    app.get("/unrelated", (_req, res) => res.json({ ok: true }));
    const server = await startTestServer(app);

    try {
      for (let index = 0; index < 121; index += 1) {
        const response = await fetch(`${server.baseUrl}/unrelated`, {
          headers: { "x-forwarded-for": healthIp },
        });
        assert.equal(response.status, 200);
      }

      for (let index = 0; index < 120; index += 1) {
        const response = await fetch(`${server.baseUrl}/health`, {
          headers: { "x-forwarded-for": healthIp },
        });
        assert.equal(response.status, 200);
      }
      assert.equal(
        (
          await fetch(`${server.baseUrl}/health`, {
            headers: { "x-forwarded-for": healthIp },
          })
        ).status,
        429,
      );
    } finally {
      rateLimiters.healthRateLimiter.resetKey(`health:ip:${healthIp}`);
      await server.close();
    }
  });
});
