// GĐ5: Tests cho alerting/SLO (đánh giá telemetry redacted so với ngưỡng SLO).
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

delete process.env.AI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { evaluateAssistantAlerts } from "../services/assistantAlerts";
import {
  recordAssistantTurnTelemetry,
  resetAssistantTurnTelemetry,
  resetClientAssistantEvents,
} from "../services/assistantTelemetry";

async function withEnv(
  overrides: Record<string, unknown>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const { env } = await import("../config/env");
  const originals: Record<string, unknown> = {};
  for (const key of Object.keys(overrides)) {
    originals[key] = (env as any)[key];
    (env as any)[key] = overrides[key];
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(originals)) {
      (env as any)[key] = originals[key];
    }
  }
}

function recordTurn(overrides: Partial<Parameters<typeof recordAssistantTurnTelemetry>[0]> = {}): void {
  recordAssistantTurnTelemetry({
    provider: "groq",
    model: "test-model",
    route: "/today",
    mode: "real",
    latencyMs: 1000,
    outcome: "success",
    actionCount: 0,
    structuredAttempted: false,
    structuredSucceeded: false,
    repairTriggered: false,
    repairSucceeded: false,
    tokenEstimate: 500,
    source: "non_stream",
    ...overrides,
  });
}

afterEach(() => {
  resetAssistantTurnTelemetry();
  resetClientAssistantEvents();
});

describe("assistantAlerts - SLO evaluation", () => {
  it("không đánh giá khi sample < minSample", async () => {
    await withEnv({ AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 10 }, () => {
      recordTurn();
      const report = evaluateAssistantAlerts();
      assert.equal(report.evaluated, false);
      assert.equal(report.alerts.length, 0);
    });
  });

  it("không alert khi mọi metric dưới ngưỡng", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_P95_LATENCY_MS: 12000, AI_SLO_ERROR_RATE_PCT: 50 },
      () => {
        for (let i = 0; i < 10; i++) recordTurn();
        const report = evaluateAssistantAlerts();
        assert.equal(report.evaluated, true);
        assert.equal(report.alerts.length, 0);
      },
    );
  });

  it("alert critical khi error rate vượt ngưỡng", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_ERROR_RATE_PCT: 3 },
      () => {
        for (let i = 0; i < 5; i++) recordTurn({ outcome: "success" });
        for (let i = 0; i < 5; i++) recordTurn({ outcome: "error", errorCode: "ASSISTANT_PROVIDER_ERROR" });
        const report = evaluateAssistantAlerts();
        const errAlert = report.alerts.find((a) => a.code === "AI_SLO_ERROR_RATE");
        assert.ok(errAlert, "expected error rate alert");
        assert.equal(errAlert!.severity, "critical");
      },
    );
  });

  it("alert warning khi p95 latency vượt ngưỡng", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_P95_LATENCY_MS: 2000 },
      () => {
        for (let i = 0; i < 10; i++) recordTurn({ latencyMs: 8000 });
        const report = evaluateAssistantAlerts();
        const latAlert = report.alerts.find((a) => a.code === "AI_SLO_P95_LATENCY");
        assert.ok(latAlert, "expected latency alert");
        assert.equal(latAlert!.severity, "warning");
      },
    );
  });

  it("alert rate-limit khi nhiều turn 429", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_RATE_LIMIT_RATE_PCT: 5 },
      () => {
        for (let i = 0; i < 5; i++) recordTurn({ outcome: "success" });
        for (let i = 0; i < 5; i++) {
          recordTurn({ outcome: "fallback", errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT" });
        }
        const report = evaluateAssistantAlerts();
        assert.ok(report.alerts.some((a) => a.code === "AI_SLO_RATE_LIMIT_RATE"));
      },
    );
  });

  it("alert cost khi avg token vượt budget", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_AVG_TOKEN_BUDGET: 1000 },
      () => {
        for (let i = 0; i < 10; i++) recordTurn({ tokenEstimate: 5000 });
        const report = evaluateAssistantAlerts();
        assert.ok(report.alerts.some((a) => a.code === "AI_SLO_AVG_TOKEN_BUDGET"));
      },
    );
  });

  it("alert cost-USD khi tổng chi phí ước tính vượt ngưỡng", async () => {
    await withEnv(
      {
        AI_ENABLE_TELEMETRY: true,
        AI_SLO_MIN_SAMPLE: 5,
        AI_SLO_AVG_TOKEN_BUDGET: 1_000_000,
        AI_COST_PER_1K_TOKENS_USD: 1,
        AI_SLO_TOTAL_COST_USD: 5,
      },
      () => {
        // 10 turn * 5000 token = 50_000 token => 50_000/1000 * 1 USD = 50 USD > 5 USD
        for (let i = 0; i < 10; i++) recordTurn({ tokenEstimate: 5000 });
        const report = evaluateAssistantAlerts();
        const costAlert = report.alerts.find((a) => a.code === "AI_SLO_TOTAL_COST_USD");
        assert.ok(costAlert, "expected cost-USD alert");
        assert.equal(costAlert!.severity, "warning");
      },
    );
  });

  it("không alert cost-USD khi chưa cấu hình đơn giá", async () => {
    await withEnv(
      {
        AI_ENABLE_TELEMETRY: true,
        AI_SLO_MIN_SAMPLE: 5,
        AI_SLO_AVG_TOKEN_BUDGET: 1_000_000,
        AI_COST_PER_1K_TOKENS_USD: 0,
        AI_SLO_TOTAL_COST_USD: 5,
      },
      () => {
        for (let i = 0; i < 10; i++) recordTurn({ tokenEstimate: 5000 });
        const report = evaluateAssistantAlerts();
        assert.equal(report.alerts.some((a) => a.code === "AI_SLO_TOTAL_COST_USD"), false);
      },
    );
  });

  it("alert secret-leak critical khi redaction kích hoạt, kể cả khi sample nhỏ", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 50, AI_SLO_SECRET_LEAK_MAX: 0 },
      () => {
        // Route chứa long token/secret -> secret redaction kích hoạt khi sanitize telemetry.
        recordTurn({ route: "/today?token=abcdefghijklmnopqrstuvwxyz0123456789" });
        const report = evaluateAssistantAlerts();
        const leakAlert = report.alerts.find((a) => a.code === "AI_SLO_SECRET_LEAK");
        assert.ok(leakAlert, "expected secret-leak alert");
        assert.equal(leakAlert!.severity, "critical");
        // Vẫn đánh giá secret-leak dù evaluated=false do sample nhỏ.
        assert.equal(report.evaluated, false);
      },
    );
  });

  it("không alert secret-leak với email lành tính", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_SECRET_LEAK_MAX: 0 },
      () => {
        // Email phổ biến/lành tính -> KHÔNG tính là secret-leak (tránh alert fatigue).
        for (let i = 0; i < 5; i++) recordTurn({ route: "/today?user=person@example.com" });
        const report = evaluateAssistantAlerts();
        assert.equal(report.alerts.some((a) => a.code === "AI_SLO_SECRET_LEAK"), false);
      },
    );
  });

  it("không alert secret-leak khi không có redaction", async () => {
    await withEnv(
      { AI_ENABLE_TELEMETRY: true, AI_SLO_MIN_SAMPLE: 5, AI_SLO_SECRET_LEAK_MAX: 0 },
      () => {
        for (let i = 0; i < 5; i++) recordTurn({ route: "/today" });
        const report = evaluateAssistantAlerts();
        assert.equal(report.alerts.some((a) => a.code === "AI_SLO_SECRET_LEAK"), false);
      },
    );
  });
});
