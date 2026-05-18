import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express, { type Express, type Router } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function ensureBackendEnvForRouteImports(): void {
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
  process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
  process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
  process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
}

async function loadAssistantRoutes(): Promise<Router> {
  ensureBackendEnvForRouteImports();
  const mod = await import("../routes/assistantRoutes");
  return mod.assistantRoutes;
}

async function createTestApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "verified-token") {
          return { uid: "user_verified", email: "buyer@example.test", email_verified: true };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", await loadAssistantRoutes());
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  path: string,
  token?: string,
  body: unknown = {
    message: "Hôm nay tôi nên làm gì?",
    context: {
      currentWeek: 1,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      route: "/12-week-system",
    },
  },
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
    };
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }
    return {
      status: response.status,
      body: parsed,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

describe("assistantRoutes", () => {
  it("requires auth", async () => {
    const response = await requestJson(await createTestApp(), "/api/assistant/chat");

    assert.equal(response.status, 401);
  });

  it("registers POST /api/assistant/chat and rejects empty messages", async () => {
    const response = await requestJson(await createTestApp(), "/api/assistant/chat", "verified-token", {
      message: " ",
      context: {},
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "ASSISTANT_EMPTY_MESSAGE");
  });

  it("does not register the old /api/chat path", async () => {
    const response = await requestJson(await createTestApp(), "/api/chat", "verified-token");

    assert.equal(response.status, 404);
  });

  it("returns a clear error when Gemini is not configured", async () => {
    const { env } = await import("../config/env");
    const previousKey = env.GEMINI_API_KEY;
    env.GEMINI_API_KEY = undefined;

    try {
      const response = await requestJson(await createTestApp(), "/api/assistant/chat", "verified-token");

      assert.equal(response.status, 503);
      assert.equal(response.body.errorCode, "ASSISTANT_PROVIDER_NOT_CONFIGURED");
    } finally {
      env.GEMINI_API_KEY = previousKey;
    }
  });
});
