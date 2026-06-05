// Khởi tạo các biến môi trường bắt buộc trước khi import bất kỳ file nào validate env
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

// Reset API key to test fallback behavior
delete process.env.AI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAndValidateAIResponse,
  getDeterministicFallback,
  processAIAssistantRequest,
  processAIAssistantRequestStream,
  selectGeminiModelForAssistantRequest,
  shouldRepairAIResponse,
  shouldUseLocalAssistantShortcut,
} from "../services/aiAssistantService";
import type { AssistantContext } from "../services/assistantService";
import { sanitizeContext } from "../services/assistantService";
import { summarizeContext } from "../services/assistantPromptUtils";

function ensureBackendEnvForServiceImports(): void {
  // Đã được khởi tạo ở trên
}

const sampleContext: AssistantContext = {
  currentWeek: 5,
  weeksTotal: 12,
  goals: [
    { id: "g1", title: "Học React nâng cao", progress: 60 },
  ],
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

describe("aiAssistantService parseAndValidateAIResponse", () => {
  it("extracts and validates valid action blocks", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `Chào bạn. Đây là đề xuất hành động:

\`\`\`action
{
  "type": "create_task",
  "payload": {
    "title": "Đọc 5 trang sách",
    "scheduledDate": "today",
    "isCore": true
  },
  "label": "Têm task đọc sách"
}
\`\`\`

Bạn cứ bấm đồng ý nhé.`;

    const result = parseAndValidateAIResponse(rawText);

    assert.equal(result.assistantText, "Chào bạn. Đây là đề xuất hành động:\n\n\n\nBạn cứ bấm đồng ý nhé.");
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_task");
    assert.equal((result.proposedActions[0].payload as any).title, "Đọc 5 trang sách");
    assert.equal((result.proposedActions[0].payload as any).isCore, true);
  });

  it("filters out invalid action types", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `Chào bạn.

\`\`\`action
{
  "type": "invalid_action_type_test",
  "payload": {
    "title": "Bậy bạ"
  },
  "label": "Têm bậy bạ"
}
\`\`\``;

    const result = parseAndValidateAIResponse(rawText);

    assert.equal(result.proposedActions.length, 0);
  });

  it("retains valid create_twelve_week_plan_draft action", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `\`\`\`action
{
  "type": "create_twelve_week_plan_draft",
  "payload": {
    "week12Outcome": "Giảm 5kg",
    "lagMetricName": "Cân nặng",
    "lagMetricTarget": "70",
    "lagMetricUnit": "kg",
    "startDate": "2026-06-08",
    "reviewDay": "Sunday",
    "tacticLoadPreference": "balanced",
    "leadIndicators": [
      {
        "name": "Chạy bộ 3 lần/tuần",
        "target": "3",
        "unit": "lần",
        "type": "core",
        "cadence": "spread"
      }
    ]
  },
  "label": "Tạo bản nháp kế hoạch"
}
\`\`\``;

    const result = parseAndValidateAIResponse(rawText);
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_twelve_week_plan_draft");
    const payload = result.proposedActions[0].payload as any;
    assert.equal(payload.week12Outcome, "Giảm 5kg");
    assert.equal(payload.leadIndicators.length, 1);
    assert.equal(payload.leadIndicators[0].name, "Chạy bộ 3 lần/tuần");
  });

  it("filters out action with invalid payload", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `\`\`\`action
{
  "type": "create_task",
  "payload": {
    "title": 1234,
    "scheduledDate": "today"
  },
  "label": "Task sai payload"
}
\`\`\``;

    const result = parseAndValidateAIResponse(rawText);
    assert.equal(result.proposedActions.length, 0);
  });

  it("rejects mark_task_done with done: false", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `\`\`\`action
{
  "type": "mark_task_done",
  "payload": {
    "taskId": "t1",
    "done": false
  },
  "label": "Bỏ hoàn thành"
}
\`\`\``;

    const result = parseAndValidateAIResponse(rawText);
    assert.equal(result.proposedActions.length, 0);
  });

  it("parses raw action JSON without fenced code blocks", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `action
{
  "type": "mark_task_done",
  "payload": {
    "taskId": "Học thuộc 10 phút",
    "done": true
  },
  "label": "Học thuộc 10 phút đã hoàn thành"
}
Hôm nay bạn đã hoàn thành nhiệm vụ học thuộc 10 phút. Hãy tiếp tục cố gắng!`;

    const result = parseAndValidateAIResponse(rawText);

    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "mark_task_done");
    assert.equal((result.proposedActions[0].payload as any).taskId, "Học thuộc 10 phút");
    assert.equal(result.assistantText, "Hôm nay bạn đã hoàn thành nhiệm vụ học thuộc 10 phút. Hãy tiếp tục cố gắng!");
  });

  it("detects invalid action blocks that need a repair pass", () => {
    ensureBackendEnvForServiceImports();
    const rawText = `Mình sẽ thêm task này.

\`\`\`action
{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today",},"label":"Thêm task"}
\`\`\``;

    const result = parseAndValidateAIResponse(rawText);

    assert.equal(result.proposedActions.length, 0);
    assert.equal(shouldRepairAIResponse(rawText), true);
    assert.equal(shouldRepairAIResponse("Không có action nào cả."), false);
  });
});

describe("aiAssistantService getDeterministicFallback", () => {
  it("handles tick task intent when open tasks exist", () => {
    ensureBackendEnvForServiceImports();
    const result = getDeterministicFallback("tick task hôm nay", sampleContext);

    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "mark_task_done");
    assert.equal((result.proposedActions[0].payload as any).taskId, "t1");
  });

  it("handles tick task intent when no open tasks exist but has overdue tasks", () => {
    ensureBackendEnvForServiceImports();
    const noOpenCtx: AssistantContext = {
      ...sampleContext,
      todayTasks: [{ id: "t2", title: "Làm bài tập", done: true }],
      stuckSignals: {
        ...sampleContext.stuckSignals,
        overdueTasks: [{ id: "t_over", title: "Quá hạn", scheduledDate: "2026-05-01", isCore: true }],
      },
    };

    const result = getDeterministicFallback("tick task hôm nay", noOpenCtx);

    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "mark_task_done");
    assert.equal((result.proposedActions[0].payload as any).taskId, "t_over");
  });

  it("handles create goal intent", () => {
    ensureBackendEnvForServiceImports();
    const result = getDeterministicFallback("tạo mục tiêu học tiếng anh", sampleContext);

    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_goal");
    assert.equal((result.proposedActions[0].payload as any).title, "học tiếng anh");
    assert.equal((result.proposedActions[0].payload as any).category, "career");
  });

  it("answers assistant identity and introduction locally", () => {
    ensureBackendEnvForServiceImports();
    const result = getDeterministicFallback("ban la ai", sampleContext);

    assert.equal(result.proposedActions.length, 0);
    assert.match(result.assistantText, /Vision Board/);
    assert.match(result.assistantText, /SMART goal/);
  });
});

describe("aiAssistantService processAIAssistantRequest", () => {
  it("handles short greetings locally in real mode without an API key", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalKey = env.AI_API_KEY;
    (env as any).AI_API_KEY = "";

    try {
      const response = await processAIAssistantRequest({
        message: "hola",
        context: sampleContext,
        mode: "real",
      });

      assert.ok(!("errorCode" in response));
      assert.equal(response.proposedActions.length, 0);
      assert.ok(response.assistantText.length > 0);
    } finally {
      (env as any).AI_API_KEY = originalKey;
    }
  });

  it("streams short identity requests locally in real mode without an API key", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalKey = env.AI_API_KEY;
    (env as any).AI_API_KEY = "";
    const deltas: string[] = [];

    try {
      const error = await processAIAssistantRequestStream(
        {
          message: "ban la ai",
          context: sampleContext,
          mode: "real",
        },
        (delta) => deltas.push(delta),
      );

      assert.equal(error, undefined);
      assert.equal(deltas.length, 1);
      assert.match(deltas.join(""), /Vision Board/);
      assert.match(deltas.join(""), /SMART goal/);
    } finally {
      (env as any).AI_API_KEY = originalKey;
    }
  });

  it("only short-circuits small greeting messages", () => {
    assert.equal(shouldUseLocalAssistantShortcut("hola"), true);
    assert.equal(shouldUseLocalAssistantShortcut("hello bot"), true);
    assert.equal(shouldUseLocalAssistantShortcut("ban la ai"), true);
    assert.equal(shouldUseLocalAssistantShortcut("hay gioi thieu di"), true);
    assert.equal(shouldUseLocalAssistantShortcut("tạo mục tiêu chạy bộ trong 12 tuần"), false);
  });

  it("buffers Groq stream for action-like requests so repair can run", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GROQ_API_KEY: env.GROQ_API_KEY,
      GROQ_MODEL: env.GROQ_MODEL,
      AI_MODEL: env.AI_MODEL,
    };
    const requestBodies: any[] = [];
    const deltas: string[] = [];

    try {
      (env as any).AI_PROVIDER = "groq";
      (env as any).AI_API_KEY = "test-groq-key";
      (env as any).GROQ_API_KEY = "test-groq-key";
      (env as any).GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

      globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        requestBodies.push(body);

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: `Đề xuất task hợp lệ.\n\n\`\`\`action\n{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task: Đọc 5 trang"}\n\`\`\``,
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch;

      const error = await processAIAssistantRequestStream(
        {
          message: "thêm task đọc 5 trang hôm nay",
          context: sampleContext,
          mode: "real",
        },
        (delta) => deltas.push(delta),
      );

      assert.equal(error, undefined);
      assert.equal(requestBodies.length, 1);
      assert.equal(requestBodies[0].stream, undefined);
      assert.match(deltas.join(""), /```action/);
      assert.match(deltas.join(""), /create_task/);
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GROQ_API_KEY = previous.GROQ_API_KEY;
      (env as any).GROQ_MODEL = previous.GROQ_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
    }
  });

  it("routes complex planning requests to the smart Gemini model", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const previous = {
      GEMINI_MODEL: env.GEMINI_MODEL,
      AI_MODEL: env.AI_MODEL,
      GEMINI_SMART_MODEL: env.GEMINI_SMART_MODEL,
      AI_SMART_MODEL: env.AI_SMART_MODEL,
    };

    try {
      (env as any).GEMINI_MODEL = "gemini-2.5-flash-lite";
      (env as any).AI_MODEL = "gemini-2.5-flash-lite";
      (env as any).GEMINI_SMART_MODEL = "gemini-3.1-flash-lite";
      (env as any).AI_SMART_MODEL = "gemini-3.1-flash-lite";

      const selection = selectGeminiModelForAssistantRequest({
        message: "lap ke hoach 12 tuan cho muc tieu chay bo",
        context: sampleContext,
      });

      assert.equal(selection.tier, "smart");
      assert.equal(selection.primaryModel, "gemini-3.1-flash-lite");
      assert.equal(selection.fallbackModel, "gemini-2.5-flash-lite");
    } finally {
      (env as any).GEMINI_MODEL = previous.GEMINI_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).GEMINI_SMART_MODEL = previous.GEMINI_SMART_MODEL;
      (env as any).AI_SMART_MODEL = previous.AI_SMART_MODEL;
    }
  });

  it("keeps simple task commands on the fast Gemini model", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const previous = {
      GEMINI_MODEL: env.GEMINI_MODEL,
      AI_MODEL: env.AI_MODEL,
      GEMINI_SMART_MODEL: env.GEMINI_SMART_MODEL,
      AI_SMART_MODEL: env.AI_SMART_MODEL,
    };

    try {
      (env as any).GEMINI_MODEL = "gemini-2.5-flash-lite";
      (env as any).AI_MODEL = "gemini-2.5-flash-lite";
      (env as any).GEMINI_SMART_MODEL = "gemini-3.1-flash-lite";
      (env as any).AI_SMART_MODEL = "gemini-3.1-flash-lite";

      const selection = selectGeminiModelForAssistantRequest({
        message: "tick task hom nay",
        context: { ...sampleContext, route: "/12-week-system" },
      });

      assert.equal(selection.tier, "fast");
      assert.equal(selection.primaryModel, "gemini-2.5-flash-lite");
      assert.equal(selection.fallbackModel, undefined);
    } finally {
      (env as any).GEMINI_MODEL = previous.GEMINI_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).GEMINI_SMART_MODEL = previous.GEMINI_SMART_MODEL;
      (env as any).AI_SMART_MODEL = previous.AI_SMART_MODEL;
    }
  });

  it("retries the fast Gemini model when the smart model is rate-limited", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      GEMINI_MODEL: env.GEMINI_MODEL,
      AI_MODEL: env.AI_MODEL,
      GEMINI_SMART_MODEL: env.GEMINI_SMART_MODEL,
      AI_SMART_MODEL: env.AI_SMART_MODEL,
    };
    const requestedUrls: string[] = [];

    try {
      (env as any).AI_PROVIDER = "gemini";
      (env as any).AI_API_KEY = "test-gemini-key";
      (env as any).GEMINI_API_KEY = "test-gemini-key";
      (env as any).GEMINI_MODEL = "gemini-2.5-flash-lite";
      (env as any).AI_MODEL = "gemini-2.5-flash-lite";
      (env as any).GEMINI_SMART_MODEL = "gemini-3.1-flash-lite";
      (env as any).AI_SMART_MODEL = "gemini-3.1-flash-lite";

      globalThis.fetch = (async (input: string | URL | Request) => {
        requestedUrls.push(String(input));
        if (requestedUrls.length === 1) {
          return new Response(JSON.stringify({
            error: {
              code: 429,
              message: "quota exceeded",
              status: "RESOURCE_EXHAUSTED",
            },
          }), { status: 429, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
          candidates: [{
            finishReason: "STOP",
            content: {
              parts: [{ text: "Mình sẽ giúp bạn lập kế hoạch theo từng bước." }],
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch;

      const response = await processAIAssistantRequest({
        message: "lap ke hoach 12 tuan cho muc tieu chay bo",
        context: sampleContext,
        mode: "real",
      });

      assert.ok(!("errorCode" in response));
      assert.equal(requestedUrls.length, 2);
      assert.ok(requestedUrls[0].includes("gemini-3.1-flash-lite"));
      assert.ok(requestedUrls[1].includes("gemini-2.5-flash-lite"));
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GEMINI_API_KEY = previous.GEMINI_API_KEY;
      (env as any).GEMINI_MODEL = previous.GEMINI_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).GEMINI_SMART_MODEL = previous.GEMINI_SMART_MODEL;
      (env as any).AI_SMART_MODEL = previous.AI_SMART_MODEL;
    }
  });

  it("repairs invalid Groq action output with one low-temperature retry", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GROQ_API_KEY: env.GROQ_API_KEY,
      GROQ_MODEL: env.GROQ_MODEL,
      AI_MODEL: env.AI_MODEL,
    };
    const requestBodies: any[] = [];

    try {
      (env as any).AI_PROVIDER = "groq";
      (env as any).AI_API_KEY = "test-groq-key";
      (env as any).GROQ_API_KEY = "test-groq-key";
      (env as any).GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
      (env as any).AI_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

      globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        requestBodies.push(body);

        if (requestBodies.length === 1) {
          return new Response(JSON.stringify({
            choices: [{
              message: {
                content: `Mình sẽ thêm task này.\n\n\`\`\`action\n{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today",},"label":"Thêm task"}\n\`\`\``,
              },
            }],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: `Mình đã sửa đề xuất thành action hợp lệ.\n\n\`\`\`action\n{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task: Đọc 5 trang"}\n\`\`\``,
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
      assert.equal(response.proposedActions.length, 1);
      assert.equal(response.proposedActions[0].type, "create_task");
      assert.equal((response.proposedActions[0].payload as any).title, "Đọc 5 trang");
      assert.equal(requestBodies.length, 2);
      assert.equal(requestBodies[1].temperature, 0.1);
      assert.equal(requestBodies[1].max_tokens, 900);
      const repairMessage = requestBodies[1].messages[requestBodies[1].messages.length - 1];
      assert.match(repairMessage.content, /REPAIR_ACTION_OUTPUT/);
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GROQ_API_KEY = previous.GROQ_API_KEY;
      (env as any).GROQ_MODEL = previous.GROQ_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
    }
  });

  it("uses deterministic fallback when Gemini reports an invalid API key", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalFetch = globalThis.fetch;
    const previous = {
      AI_PROVIDER: env.AI_PROVIDER,
      AI_API_KEY: env.AI_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      GEMINI_MODEL: env.GEMINI_MODEL,
      AI_MODEL: env.AI_MODEL,
      GEMINI_SMART_MODEL: env.GEMINI_SMART_MODEL,
      AI_SMART_MODEL: env.AI_SMART_MODEL,
    };

    try {
      (env as any).AI_PROVIDER = "gemini";
      (env as any).AI_API_KEY = "invalid-test-key";
      (env as any).GEMINI_API_KEY = "invalid-test-key";
      (env as any).GEMINI_MODEL = "gemini-2.5-flash-lite";
      (env as any).AI_MODEL = "gemini-2.5-flash-lite";
      (env as any).GEMINI_SMART_MODEL = "gemini-3.1-flash-lite";
      (env as any).AI_SMART_MODEL = "gemini-3.1-flash-lite";

      globalThis.fetch = (async () => new Response(JSON.stringify({
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
        },
      }), { status: 400, headers: { "Content-Type": "application/json" } })) as typeof fetch;

      const response = await processAIAssistantRequest({
        message: "phan tich muc tieu va lap ke hoach 12 tuan",
        context: sampleContext,
        mode: "real",
      });

      assert.ok(!("errorCode" in response));
      assert.ok(!response.assistantText.includes("API key not valid"));
      assert.ok(response.assistantText.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
      (env as any).AI_PROVIDER = previous.AI_PROVIDER;
      (env as any).AI_API_KEY = previous.AI_API_KEY;
      (env as any).GEMINI_API_KEY = previous.GEMINI_API_KEY;
      (env as any).GEMINI_MODEL = previous.GEMINI_MODEL;
      (env as any).AI_MODEL = previous.AI_MODEL;
      (env as any).GEMINI_SMART_MODEL = previous.GEMINI_SMART_MODEL;
      (env as any).AI_SMART_MODEL = previous.AI_SMART_MODEL;
    }
  });

  it("uses deterministic fallback in demo mode when API Key is missing", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalKey = env.AI_API_KEY;
    (env as any).AI_API_KEY = "";

    try {
      const response = await processAIAssistantRequest({
        message: "tạo mục tiêu chạy bộ",
        context: sampleContext,
        mode: "demo",
      });

      assert.ok(!("errorCode" in response));
      assert.equal(response.proposedActions.length, 1);
      assert.equal(response.proposedActions[0].type, "create_goal");
      assert.ok(response.assistantText.includes("chạy bộ"));
    } finally {
      (env as any).AI_API_KEY = originalKey;
    }
  });

  it("returns config error in real mode when API Key is missing", async () => {
    ensureBackendEnvForServiceImports();
    const { env } = await import("../config/env");
    const originalKey = env.AI_API_KEY;
    (env as any).AI_API_KEY = "";

    try {
      const response = await processAIAssistantRequest({
        message: "tạo mục tiêu chạy bộ",
        context: sampleContext,
        mode: "real",
      });

      assert.ok("errorCode" in response);
      assert.equal(response.errorCode, "AI_PROVIDER_NOT_CONFIGURED");
    } finally {
      (env as any).AI_API_KEY = originalKey;
    }
  });
});

describe("aiAssistantService authSyncMode handling", () => {
  it("sanitizes authSyncMode properties safely", () => {
    const raw = {
      ...sampleContext,
      authSyncMode: {
        authState: "signed_in",
        syncState: "syncing",
        someToken: "dangerous_token_123", // sensitive field
      },
    };

    const sanitized = sanitizeContext(raw);

    assert.ok(sanitized.authSyncMode);
    assert.equal(sanitized.authSyncMode.authState, "signed_in");
    assert.equal(sanitized.authSyncMode.syncState, "syncing");
    assert.equal((sanitized.authSyncMode as any).someToken, undefined);
  });

  it("includes authSyncMode description in summarized LLM prompt", () => {
    const prompt = summarizeContext(sampleContext);
    assert.ok(prompt.includes("Trạng thái tài khoản: Đã đăng nhập, đồng bộ: Đã đồng bộ lên đám mây"));
  });
});
