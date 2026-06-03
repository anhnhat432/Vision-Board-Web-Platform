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
});

describe("aiAssistantService processAIAssistantRequest", () => {
  it("uses deterministic fallback in demo mode when API Key is missing", async () => {
    ensureBackendEnvForServiceImports();

    const response = await processAIAssistantRequest({
      message: "tạo mục tiêu chạy bộ",
      context: sampleContext,
      mode: "demo",
    });

    assert.ok(!("errorCode" in response));
    assert.equal(response.proposedActions.length, 1);
    assert.equal(response.proposedActions[0].type, "create_goal");
    assert.ok(response.assistantText.includes("chạy bộ"));
  });

  it("returns config error in real mode when API Key is missing", async () => {
    ensureBackendEnvForServiceImports();

    const response = await processAIAssistantRequest({
      message: "tạo mục tiêu chạy bộ",
      context: sampleContext,
      mode: "real",
    });

    assert.ok("errorCode" in response);
    assert.equal(response.errorCode, "AI_PROVIDER_NOT_CONFIGURED");
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
