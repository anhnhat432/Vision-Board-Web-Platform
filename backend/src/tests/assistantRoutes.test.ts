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

interface MultipartPart {
  name: string;
  filename?: string;
  contentType?: string;
  data: Buffer | string;
}

function buildMultipartBody(parts: MultipartPart[], boundary: string): Buffer {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`, "utf-8"));
    let header = `Content-Disposition: form-data; name="${part.name}"`;
    if (part.filename !== undefined) {
      header += `; filename="${part.filename}"`;
    }
    header += "\r\n";
    if (part.contentType) {
      header += `Content-Type: ${part.contentType}\r\n`;
    }
    header += "\r\n";
    chunks.push(Buffer.from(header, "utf-8"));
    chunks.push(typeof part.data === "string" ? Buffer.from(part.data, "utf-8") : part.data);
    chunks.push(Buffer.from("\r\n", "utf-8"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf-8"));
  return Buffer.concat(chunks);
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
        if (token === "paid-token") {
          return { uid: "user_paid", email: "paid@example.test", email_verified: true };
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

async function requestMultipart(
  app: Express,
  path: string,
  parts: MultipartPart[],
  token = "verified-token",
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const boundary = `----AssistantBoundary${Math.random().toString(16).slice(2)}`;
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": `multipart/form-data; boundary=${boundary}`,
  };
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers,
      body: new Uint8Array(buildMultipartBody(parts, boundary)),
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

  it("allows paid users beyond the free assistant request window", async () => {
    const { billingService } = await import("../services/billingServiceInstance");
    await billingService.createMockOrManualEntitlement("user_paid", "PLUS", "manual");

    const app = await createTestApp();
    for (let index = 0; index < 21; index++) {
      const response = await requestJson(app, "/api/assistant/chat", "paid-token", {
        message: " ",
        context: {},
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.errorCode, "ASSISTANT_EMPTY_MESSAGE");
    }
  });

  it("does not register the old /api/chat path", async () => {
    const response = await requestJson(await createTestApp(), "/api/chat", "verified-token");

    assert.equal(response.status, 404);
  });

  it("returns a clear error when provider is not configured", async () => {
    const { env } = await import("../config/env");
    const previousProvider = env.ASSISTANT_PROVIDER;
    const previousKey = env.GEMINI_API_KEY;
    const previousAiKey = env.AI_API_KEY;
    const previousGroqKey = env.GROQ_API_KEY;
    
    // Test with gemini provider not configured
    env.ASSISTANT_PROVIDER = "gemini";
    env.GEMINI_API_KEY = undefined;
    env.AI_API_KEY = undefined;

    try {
      const response = await requestJson(await createTestApp(), "/api/assistant/chat", "verified-token");

      assert.equal(response.status, 503);
      assert.equal(response.body.errorCode, "ASSISTANT_PROVIDER_NOT_CONFIGURED");
    } finally {
      env.ASSISTANT_PROVIDER = previousProvider;
      env.GEMINI_API_KEY = previousKey;
      env.AI_API_KEY = previousAiKey;
      env.GROQ_API_KEY = previousGroqKey;
    }
  });

  it("accepts valid history in request", async () => {
    const app = await createTestApp();
    const response = await requestJson(app, "/api/assistant/chat", "verified-token", {
      message: "Hôm nay tôi nên làm gì?",
      context: {
        currentWeek: 1,
        weeksTotal: 12,
        goals: [],
        todayTasks: [],
        lastReflectionDate: null,
        route: "/12-week-system",
      },
      history: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there, how can I help?" },
      ],
    });

    // History accepted (not 400), actual status depends on provider config
    assert.notEqual(response.status, 400);
    assert.notEqual(response.body.errorCode, "ASSISTANT_INVALID_HISTORY");
  });

  it("rejects invalid history shape with 400", async () => {
    const app = await createTestApp();
    const response = await requestJson(app, "/api/assistant/chat", "verified-token", {
      message: "Hôm nay tôi nên làm gì?",
      context: {
        currentWeek: 1,
        weeksTotal: 12,
        goals: [],
        todayTasks: [],
        lastReflectionDate: null,
        route: "/12-week-system",
      },
      history: [
        { role: "invalid_role", content: "test" },
      ],
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "ASSISTANT_INVALID_HISTORY");
  });

  it("requires auth for stream endpoint", async () => {
    const app = await createTestApp();
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as import("node:net").AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "test",
          context: { currentWeek: 1, weeksTotal: 12, goals: [], todayTasks: [], lastReflectionDate: null, route: "/" },
        }),
      });

      assert.equal(response.status, 401);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("requires auth for structured AI stream endpoint", async () => {
    const response = await requestJson(await createTestApp(), "/api/ai/assistant/stream", undefined, {
      message: "ban la ai",
      mode: "real",
      context: {
        currentWeek: 1,
        weeksTotal: 12,
        goals: [],
        todayTasks: [],
        lastReflectionDate: null,
        route: "/12-week-system",
      },
    });

    assert.equal(response.status, 401);
  });

  it("returns SSE stream with correct content-type", async () => {
    const app = await createTestApp();
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as import("node:net").AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer verified-token",
        },
        body: JSON.stringify({
          message: "test",
          context: { currentWeek: 1, weeksTotal: 12, goals: [], todayTasks: [], lastReflectionDate: null, route: "/" },
        }),
      });

      assert.equal(response.status, 200);
      const contentType = response.headers.get("Content-Type");
      assert.ok(contentType?.includes("text/event-stream"));
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("returns structured AI SSE stream for local shortcut responses", async () => {
    const app = await createTestApp();
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as import("node:net").AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/assistant/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer verified-token",
        },
        body: JSON.stringify({
          message: "ban la ai",
          mode: "real",
          context: {
            currentWeek: 1,
            weeksTotal: 12,
            goals: [],
            todayTasks: [],
            lastReflectionDate: null,
            route: "/12-week-system",
          },
        }),
      });

      const body = await response.text();

      assert.equal(response.status, 200);
      assert.ok(response.headers.get("Content-Type")?.includes("text/event-stream"));
      assert.match(body, /"type":"delta"/);
      assert.match(body, /Vision Board/);
      assert.match(body, /"type":"done"/);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("rejects unsupported transcribe MIME types before reading provider config", async () => {
    const response = await requestMultipart(await createTestApp(), "/api/assistant/transcribe", [
      {
        name: "file",
        filename: "note.txt",
        contentType: "text/plain",
        data: "not audio",
      },
    ]);

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "ASSISTANT_INVALID_AUDIO_TYPE");
  });

  it("rejects oversized transcribe uploads with 413", async () => {
    const response = await requestMultipart(await createTestApp(), "/api/assistant/transcribe", [
      {
        name: "file",
        filename: "large.webm",
        contentType: "audio/webm",
        data: Buffer.alloc(10 * 1024 * 1024 + 1),
      },
    ]);

    assert.equal(response.status, 413);
    assert.equal(response.body.errorCode, "ASSISTANT_FILE_TOO_LARGE");
  });

  it("rejects multiple transcribe files", async () => {
    const response = await requestMultipart(await createTestApp(), "/api/assistant/transcribe", [
      {
        name: "file",
        filename: "one.webm",
        contentType: "audio/webm",
        data: Buffer.from("audio-one"),
      },
      {
        name: "file",
        filename: "two.webm",
        contentType: "audio/webm",
        data: Buffer.from("audio-two"),
      },
    ]);

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, "ASSISTANT_UPLOAD_ERROR");
  });
});
