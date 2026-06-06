// G3: Tests cho structured output (JSON mode) của Groq + parser ưu tiên JSON object.
// Khởi tạo env bắt buộc trước khi import bất kỳ module nào validate env.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

delete process.env.AI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  getAssistantParseMetrics,
  parseAndValidateAIResponse,
  processAIAssistantRequest,
  resetAssistantParseMetrics,
} from "../services/aiAssistantService";
import { isStructuredOutputEnabled } from "../services/groqAssistantProvider";
import type { AssistantContext } from "../services/assistantService";

const sampleContext: AssistantContext = {
  currentWeek: 5,
  weeksTotal: 12,
  goals: [{ id: "g1", title: "Học React nâng cao", progress: 60 }],
  todayTasks: [
    { id: "t1", title: "Đọc chapter 3", done: false },
    { id: "t2", title: "Làm bài tập", done: true },
  ],
  lastReflectionDate: "2026-05-17",
  route: "/today",
  feasibility: null,
  latestWeeklyReview: null,
  stuckSignals: {
    latestObstacle: null,
    missedCommitments: [],
    overdueOpenCount: 0,
    overdueTasks: [],
  },
  trend: {
    completionLast4Weeks: [],
    direction: "unknown",
  },
  streak: {
    daysWithCompletedTask: 0,
  },
  upcomingDeadlines: [],
  pageContext: {
    route: "/today",
    currentStep: null,
    nextSuggestedStep: null,
    formDraft: {},
  },
  authSyncMode: {
    authState: "signed_in",
    syncState: "synced",
  },
};

describe("G3 isStructuredOutputEnabled", () => {
  it("requires both env flag and caller option", async () => {
    const { env } = await import("../config/env");
    const original = env.AI_ENABLE_STRUCTURED_OUTPUT;
    try {
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = true;
      assert.equal(isStructuredOutputEnabled({ structuredOutput: true }), true);
      assert.equal(isStructuredOutputEnabled({ structuredOutput: false }), false);
      assert.equal(isStructuredOutputEnabled({}), false);

      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = false;
      assert.equal(isStructuredOutputEnabled({ structuredOutput: true }), false);
    } finally {
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = original;
    }
  });
});

describe("G3 parseAndValidateAIResponse structured", () => {
  beforeEach(() => resetAssistantParseMetrics());
  afterEach(() => resetAssistantParseMetrics());

  it("parses a structured JSON object response { assistantText, actions }", () => {
    const raw = JSON.stringify({
      assistantText: "Mình đề xuất thêm task đọc sách.",
      actions: [
        {
          type: "create_task",
          payload: { title: "Đọc 5 trang sách", scheduledDate: "today", isCore: true },
          label: "Thêm task đọc sách",
        },
      ],
    });

    const result = parseAndValidateAIResponse(raw, { structured: true });
    assert.equal(result.assistantText, "Mình đề xuất thêm task đọc sách.");
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_task");
    assert.equal((result.proposedActions[0].payload as any).title, "Đọc 5 trang sách");

    const metrics = getAssistantParseMetrics();
    assert.equal(metrics.structuredParseSuccess, 1);
    assert.equal(metrics.structuredParseFallback, 0);
    assert.equal(metrics.totalActionBlocks, 1);
    assert.equal(metrics.invalidActionBlocks, 0);
  });

  it("drops invalid actions inside a structured response but keeps assistantText", () => {
    const raw = JSON.stringify({
      assistantText: "Một action hợp lệ, một action sai schema.",
      actions: [
        {
          type: "create_task",
          payload: { title: "Đọc 5 trang", scheduledDate: "today", isCore: false },
          label: "Thêm task",
        },
        {
          type: "mark_task_done",
          payload: { taskId: "t1", done: false },
          label: "Bỏ hoàn thành",
        },
      ],
    });

    const result = parseAndValidateAIResponse(raw, { structured: true });
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_task");

    const metrics = getAssistantParseMetrics();
    assert.equal(metrics.structuredParseSuccess, 1);
    assert.equal(metrics.totalActionBlocks, 2);
    assert.equal(metrics.invalidActionBlocks, 1);
  });

  it("falls back to fenced action block parsing when JSON is not structured", () => {
    const raw = `Đề xuất task hợp lệ.

\`\`\`action
{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task"}
\`\`\``;

    const result = parseAndValidateAIResponse(raw, { structured: true });
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_task");

    const metrics = getAssistantParseMetrics();
    assert.equal(metrics.structuredParseAttempts, 1);
    assert.equal(metrics.structuredParseSuccess, 0);
    assert.equal(metrics.structuredParseFallback, 1);
    assert.equal(metrics.fencedParseSuccess, 1);
    assert.equal(metrics.totalActionBlocks, 1);
  });

  it("keeps fenced parsing intact when structured flag is off", () => {
    const raw = `Đề xuất task.

\`\`\`action
{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task"}
\`\`\``;

    const result = parseAndValidateAIResponse(raw);
    assert.equal(result.proposedActions.length, 1);

    const metrics = getAssistantParseMetrics();
    // Không bật structured -> không tăng counters structured.
    assert.equal(metrics.structuredParseAttempts, 0);
    assert.equal(metrics.totalActionBlocks, 0);
  });
});

describe("G3 processAIAssistantRequest structured output flag", () => {
  beforeEach(() => resetAssistantParseMetrics());
  afterEach(() => resetAssistantParseMetrics());

  it("sends response_format json_object when flag enabled for action requests", async () => {
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GROQ_API_KEY: env.GROQ_API_KEY,
      GROQ_MODEL: env.GROQ_MODEL,
      AI_MODEL: env.AI_MODEL,
      AI_ENABLE_STRUCTURED_OUTPUT: env.AI_ENABLE_STRUCTURED_OUTPUT,
    };
    const requestBodies: any[] = [];

    try {
      (env as any).AI_PROVIDER = "groq";
      (env as any).AI_API_KEY = "test-groq-key";
      (env as any).GROQ_API_KEY = "test-groq-key";
      (env as any).GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = true;

      globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        requestBodies.push(body);
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                assistantText: "Mình đã chuẩn bị task cho bạn.",
                actions: [{
                  type: "create_task",
                  payload: { title: "Đọc 5 trang", scheduledDate: "today", isCore: false },
                  label: "Thêm task: Đọc 5 trang",
                }],
              }),
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch;

      const response = await processAIAssistantRequest({
        message: "thêm task đọc 5 trang hôm nay",
        context: sampleContext,
        mode: "real",
      });

      assert.ok(!("errorCode" in response));
      assert.equal(requestBodies.length, 1);
      assert.deepEqual(requestBodies[0].response_format, { type: "json_object" });
      assert.equal(response.proposedActions.length, 1);
      assert.equal(response.proposedActions[0].type, "create_task");

      const metrics = getAssistantParseMetrics();
      assert.equal(metrics.structuredParseSuccess, 1);
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GROQ_API_KEY = previous.GROQ_API_KEY;
      (env as any).GROQ_MODEL = previous.GROQ_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = previous.AI_ENABLE_STRUCTURED_OUTPUT;
    }
  });

  it("does not send response_format when flag disabled (default behavior preserved)", async () => {
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GROQ_API_KEY: env.GROQ_API_KEY,
      GROQ_MODEL: env.GROQ_MODEL,
      AI_MODEL: env.AI_MODEL,
      AI_ENABLE_STRUCTURED_OUTPUT: env.AI_ENABLE_STRUCTURED_OUTPUT,
    };
    const requestBodies: any[] = [];

    try {
      (env as any).AI_PROVIDER = "groq";
      (env as any).AI_API_KEY = "test-groq-key";
      (env as any).GROQ_API_KEY = "test-groq-key";
      (env as any).GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = false;

      globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        requestBodies.push(body);
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: `Đề xuất task hợp lệ.\n\n\`\`\`action\n{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task"}\n\`\`\``,
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch;

      const response = await processAIAssistantRequest({
        message: "thêm task đọc 5 trang hôm nay",
        context: sampleContext,
        mode: "real",
      });

      assert.ok(!("errorCode" in response));
      assert.equal(requestBodies.length, 1);
      assert.equal(requestBodies[0].response_format, undefined);
      assert.equal(response.proposedActions.length, 1);

      const metrics = getAssistantParseMetrics();
      // Flag off -> không vào nhánh structured.
      assert.equal(metrics.structuredParseAttempts, 0);
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GROQ_API_KEY = previous.GROQ_API_KEY;
      (env as any).GROQ_MODEL = previous.GROQ_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).AI_ENABLE_STRUCTURED_OUTPUT = previous.AI_ENABLE_STRUCTURED_OUTPUT;
    }
  });
});