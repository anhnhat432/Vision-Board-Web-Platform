import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { AssistantContext } from "../services/assistantService";

function ensureBackendEnvForProviderImports(): void {
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
  process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
  process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
  process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
  process.env.GROQ_API_KEY ??= "groq_test_key";
}

const context: AssistantContext = {
  currentWeek: 3,
  weeksTotal: 12,
  goals: [{ id: "goal_1", title: "Hoc React", progress: 45 }],
  todayTasks: [{ id: "task_1", title: "Lam bai tap hom nay", done: false }],
  lastReflectionDate: null,
  route: "/12-week-system",
  feasibility: {
    readinessScore: 11,
    bottleneckLabel: "Thoi gian",
    bottleneckAction: "Chon mot khoang 20 phut co dinh moi ngay.",
  },
  latestWeeklyReview: {
    weekNumber: 2,
    leadCompletionPercent: 40,
    mainObstacle: "Lich lam viec day",
    nextWeekPriority: "Giu 1 viec cot loi moi ngay",
    workloadDecision: "reduce slightly",
    reviewedAt: "2026-05-17T10:00:00.000Z",
  },
  stuckSignals: {
    latestObstacle: "Bi ket vi qua met",
    missedCommitments: ["Bo lo 2 buoi hoc"],
    overdueOpenCount: 1,
    overdueTasks: [{ id: "late_1", title: "Lam bai tap cu", scheduledDate: "2026-05-10", isCore: true }],
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
    route: "/12-week-setup",
    currentStep: "twelve_week_setup",
    nextSuggestedStep: "Dien lead indicator con thieu",
    formDraft: {
      focusArea: "Career",
      smartGoalTitle: "Hoc React",
      smartGoalMetric: "Bai tap: 12",
      missingSmartGoalFields: ["relevant"],
      feasibilityAnsweredCount: 6,
      feasibilityBottleneck: "Thoi gian",
      goalCount: 1,
      goalsWithoutTwelveWeekPlan: 1,
      activeGoalTitle: "Hoc React",
      twelveWeekDraftSummary: {
        leadIndicatorCount: 1,
        hasReviewDay: true,
        hasWeek12Outcome: false,
        hasLagMetric: true,
        tacticLoadPreference: "lighter",
        personalConstraint: "Chi co 30 phut moi ngay",
      },
    },
  },
};

describe("groqAssistantProvider prompt", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("requires the stable three-part answer format", async () => {
    ensureBackendEnvForProviderImports();
    const { buildSystemPrompt } = await import("../services/assistantPromptUtils");
    const prompt = buildSystemPrompt();

    assert.match(prompt, /Việc nên làm ngay/);
    assert.match(prompt, /Lý do/);
    assert.match(prompt, /Nếu chỉ có 10 phút/);
  });

  it("treats the current user message as usable form-fill context", async () => {
    ensureBackendEnvForProviderImports();
    const { buildSystemPrompt } = await import("../services/assistantPromptUtils");
    const prompt = buildSystemPrompt();

    assert.match(prompt, /tin nhắn hiện tại/i);
    assert.match(prompt, /dữ liệu hợp lệ/i);
    assert.match(prompt, /nói thẳng.*chưa thấy/i);
    assert.match(prompt, /ví dụ điền/i);
  });

  it("documents strict action schema rules for Groq", async () => {
    ensureBackendEnvForProviderImports();
    const { buildSystemPrompt } = await import("../services/assistantPromptUtils");
    const prompt = buildSystemPrompt(context);

    assert.match(prompt, /create_twelve_week_plan_draft/);
    assert.match(prompt, /startDate dạng YYYY-MM-DD/);
    assert.match(prompt, /Không dùng title làm taskId/);
    assert.match(prompt, /autoExecute": false/);
    assert.match(prompt, /JSON phải hợp lệ tuyệt đối/);
    assert.match(prompt, /12-week setup\/plan/);
  });

  it("summarizes enriched context for Groq", async () => {
    ensureBackendEnvForProviderImports();
    const { summarizeContext } = await import("../services/assistantPromptUtils");
    const summary = summarizeContext(context);

    assert.match(summary, /Thoi gian/);
    assert.match(summary, /Lich lam viec day/);
    assert.match(summary, /Bi ket vi qua met/);
    assert.match(summary, /Lam bai tap cu/);
    assert.match(summary, /\[taskId:late_1\]/);
    assert.match(summary, /\[goalId:goal_1\]/);
    assert.match(summary, /Route guidance/);
    assert.match(summary, /twelve_week_setup/);
    assert.match(summary, /Dien lead indicator con thieu/);
    assert.match(summary, /Chi co 30 phut moi ngay/);
  });

  it("uses larger, steadier generation settings for complex planning requests", async () => {
    ensureBackendEnvForProviderImports();
    const { getGroqGenerationOptions } = await import("../services/groqAssistantProvider");

    const options = getGroqGenerationOptions("lap ke hoach 12 tuan cho muc tieu hoc React", context);

    assert.equal(options.maxTokens, 1400);
    assert.equal(options.temperature, 0.35);
  });

  it("keeps simple Groq requests concise and faster", async () => {
    ensureBackendEnvForProviderImports();
    const { getGroqGenerationOptions } = await import("../services/groqAssistantProvider");

    const simpleContext: AssistantContext = {
      ...context,
      route: "/goals",
      pageContext: { ...context.pageContext, route: "/goals" },
      pageContextHint: { pageType: "goals" },
    };
    const options = getGroqGenerationOptions("hom nay lam gi", simpleContext);

    assert.equal(options.maxTokens, 800);
    assert.equal(options.temperature, 0.5);
  });

  it("sends a dedicated structured prompt without generic Assistant instructions", async () => {
    ensureBackendEnvForProviderImports();
    let capturedBody: Record<string, unknown> | null = null;
    mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"title":"Ưu tiên hôm nay"}' } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const { sendPromptToGroq } = await import("../services/groqAssistantProvider");

    const result = await sendPromptToGroq({
      systemPrompt: "COACH_RULES_ONLY",
      contextMessage: "UNTRUSTED_STRUCTURED_CONTEXT={}",
      userMessage: "Tạo một khuyến nghị Coach.",
      maxTokens: 500,
      temperature: 0.2,
      jsonObject: true,
    });

    assert.deepEqual(result, { message: '{"title":"Ưu tiên hôm nay"}' });
    assert.ok(capturedBody);
    const body = capturedBody as {
      messages?: Array<{ role?: string; content?: string }>;
      max_tokens?: number;
      temperature?: number;
      response_format?: { type?: string };
    };
    assert.deepEqual(body.messages, [
      { role: "system", content: "COACH_RULES_ONLY" },
      { role: "system", content: "UNTRUSTED_STRUCTURED_CONTEXT={}" },
      { role: "user", content: "Tạo một khuyến nghị Coach." },
    ]);
    assert.equal(body.max_tokens, 500);
    assert.equal(body.temperature, 0.2);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.doesNotMatch(JSON.stringify(body), /create_task|mark_task_done|assistantMemory/);
  });

  it("redacts provider error details before returning or logging Groq failures", async () => {
    ensureBackendEnvForProviderImports();
    const rawSecret = "sk_live_AbCdEfGhIjKl123456789";
    const rawEmail = "buyer@example.test";
    const consoleErrorMock = mock.method(console, "error", () => undefined);
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: `provider failure api_key: ${rawSecret} for ${rawEmail}`,
            },
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
    );
    const { sendToGroq } = await import("../services/groqAssistantProvider");

    const result = await sendToGroq("hello", context, []);

    assert.ok("errorCode" in result);
    assert.equal(result.errorCode, "ASSISTANT_PROVIDER_SERVER_ERROR");
    assert.doesNotMatch(result.message, new RegExp(rawSecret));
    assert.doesNotMatch(result.message, new RegExp(rawEmail));
    assert.equal(consoleErrorMock.mock.callCount(), 1);
    const logged = JSON.stringify(consoleErrorMock.mock.calls[0].arguments);
    assert.doesNotMatch(logged, new RegExp(rawSecret));
    assert.doesNotMatch(logged, new RegExp(rawEmail));
  });
});
