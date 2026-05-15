import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";

import { errorMiddleware } from "../middleware/errorMiddleware";
import { cassoWebhookLimiter } from "../middleware/rateLimiters";
import { webhookRoutes } from "../routes/webhookRoutes";

const CASSO_RATE_LIMIT_KEY = "webhook:casso:merchant:merchant_A";
const CASSO_BODY = JSON.stringify({ error: 0, data: [] });

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

function createWebhookTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", webhookRoutes);
  app.use(errorMiddleware);
  return app;
}

async function startTestServer(app: Express): Promise<TestServer> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}

async function postCassoWebhook(baseUrl: string): Promise<Response> {
  return fetch(`${baseUrl}/api/webhooks/casso`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "secure-token": "casso_rate_limit_secret",
      "x-casso-merchant-id": "merchant_A",
    },
    body: CASSO_BODY,
  });
}

beforeEach(() => {
  process.env.CASSO_WEBHOOK_SECRET = "casso_rate_limit_secret";
  cassoWebhookLimiter.resetKey(CASSO_RATE_LIMIT_KEY);
});

afterEach(() => {
  mock.restoreAll();
  delete process.env.CASSO_WEBHOOK_SECRET;
  cassoWebhookLimiter.resetKey(CASSO_RATE_LIMIT_KEY);
});

describe("Casso webhook rate limit", () => {
  it("allows 100 requests from the same merchant within one minute", async () => {
    const server = await startTestServer(createWebhookTestApp());

    try {
      for (let index = 0; index < 100; index++) {
        const response = await postCassoWebhook(server.baseUrl);
        assert.equal(response.status, 200, `request ${index + 1} should pass`);
      }
    } finally {
      await server.close();
    }
  });

  it("throttles the 601st request from the same merchant and returns Retry-After", async () => {
    const warn = mock.method(console, "warn", () => undefined);
    const server = await startTestServer(createWebhookTestApp());

    try {
      for (let index = 0; index < 600; index++) {
        const response = await postCassoWebhook(server.baseUrl);
        assert.equal(response.status, 200, `request ${index + 1} should pass`);
      }

      const throttled = await postCassoWebhook(server.baseUrl);
      assert.equal(throttled.status, 429);
      assert.ok(throttled.headers.get("retry-after"));

      const body = await throttled.json() as { errorCode?: string };
      assert.equal(body.errorCode, "rate_limited");

      const logEntry = warn.mock.calls
        .map((call) => call.arguments[1])
        .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
      assert.equal(logEntry?.route, "/webhooks/casso");
      assert.equal(logEntry?.merchantId, "merchant_A");
      assert.ok(logEntry?.ip);
    } finally {
      await server.close();
    }
  });
});
