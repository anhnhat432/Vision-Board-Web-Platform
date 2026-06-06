// G4: Tests cho telemetry tối thiểu redacted (redaction regex key/bearer/email + turn + client events).
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
  getAssistantTelemetryOverview,
  getAssistantTurnTelemetry,
  getClientAssistantEvents,
  hashSession,
  normalizeClientAssistantEvent,
  recordAssistantTurnTelemetry,
  recordClientAssistantEvents,
  redactTelemetryString,
  resetAssistantTurnTelemetry,
  resetClientAssistantEvents,
  summarizeAssistantCost,
  summarizeAssistantParseRepair,
  summarizeAssistantProviderHealth,
  summarizeAssistantQualityProxy,
  summarizeAssistantTelemetryByRoute,
} from "../services/assistantTelemetry";

async function withTelemetryEnabled(fn: () => void | Promise<void>): Promise<void> {
  const { env } = await import("../config/env");
  const original = env.AI_ENABLE_TELEMETRY;
  (env as any).AI_ENABLE_TELEMETRY = true;
  try {
    await fn();
  } finally {
    (env as any).AI_ENABLE_TELEMETRY = original;
  }
}

describe("G4 redactTelemetryString", () => {
  it("redacts emails", () => {
    const out = redactTelemetryString("liên hệ user.name+test@example.com nhé");
    assert.ok(!out.includes("@example.com"));
    assert.ok(out.includes("[EMAIL_REDACTED]"));
  });

  it("redacts bearer tokens", () => {
    const out = redactTelemetryString("Authorization: Bearer abc.def.ghiJKL123456");
    assert.ok(!/bearer\s+abc/i.test(out));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts api key / secret key:value pairs", () => {
    const out = redactTelemetryString("api_key: sk_live_super_secret_value123");
    assert.ok(!out.includes("sk_live_super_secret_value123"));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("redacts long random tokens", () => {
    const token = "AbCd1234EfGh5678IjKl9012MnOp";
    const out = redactTelemetryString(`token blob ${token} end`);
    assert.ok(!out.includes(token));
    assert.ok(out.includes("[REDACTED]"));
  });

  it("keeps safe short text intact", () => {
    assert.equal(redactTelemetryString("/today route"), "/today route");
  });
});

describe("G4 hashSession", () => {
  it("hashes session id one-way to a short hex", () => {
    const hash = hashSession("sess_12345_abcdef");
    assert.ok(hash);
    assert.equal(hash!.length, 16);
    assert.notEqual(hash, "sess_12345_abcdef");
  });

  it("returns undefined for empty/missing session", () => {
    assert.equal(hashSession(undefined), undefined);
    assert.equal(hashSession(""), undefined);
    assert.equal(hashSession("   "), undefined);
  });

  it("is deterministic", () => {
    assert.equal(hashSession("same-session"), hashSession("same-session"));
  });
});

describe("G4 normalizeClientAssistantEvent", () => {
  it("keeps only allowlisted safe fields and drops raw metadata", () => {
    const normalized = normalizeClientAssistantEvent({
      type: "assistant_message_received",
      route: "/today",
      actionType: "create_task",
      success: true,
      latencyMs: 1234.7,
      errorCode: "ASSISTANT_PROVIDER_TIMEOUT",
      createdAt: "2026-06-06T00:00:00.000Z",
      // các field nhạy cảm / không cho phép:
      metadata: { label: "secret label", payload: { taskId: "t1" } },
      messageId: "msg-raw",
      userId: "uid-raw",
    });

    assert.ok(normalized);
    assert.equal(normalized!.type, "assistant_message_received");
    assert.equal(normalized!.route, "/today");
    assert.equal(normalized!.actionType, "create_task");
    assert.equal(normalized!.success, true);
    assert.equal(normalized!.latencyMs, 1235);
    assert.equal(normalized!.errorCode, "ASSISTANT_PROVIDER_TIMEOUT");
    // metadata/messageId/userId KHÔNG được giữ lại
    assert.equal((normalized as any).metadata, undefined);
    assert.equal((normalized as any).messageId, undefined);
    assert.equal((normalized as any).userId, undefined);
  });

  it("hashes raw sessionId and redacts route", () => {
    const normalized = normalizeClientAssistantEvent({
      type: "assistant_message_sent",
      route: "/u/user@example.com/home",
      sessionId: "sess_raw_value",
      createdAt: "2026-06-06T00:00:00.000Z",
    });

    assert.ok(normalized);
    assert.ok(!normalized!.route!.includes("@example.com"));
    assert.equal(normalized!.sessionHash, hashSession("sess_raw_value"));
  });

  it("rejects events without a valid type", () => {
    assert.equal(normalizeClientAssistantEvent({ route: "/today" }), null);
    assert.equal(normalizeClientAssistantEvent(null), null);
    assert.equal(normalizeClientAssistantEvent("nope"), null);
  });
});

describe("G4 turn telemetry gating + summary", () => {
  beforeEach(() => resetAssistantTurnTelemetry());
  afterEach(() => resetAssistantTurnTelemetry());

  it("does not record when telemetry disabled", () => {
    recordAssistantTurnTelemetry({
      provider: "groq",
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      route: "/today",
      mode: "real",
      latencyMs: 500,
      outcome: "success",
      actionCount: 0,
      structuredAttempted: false,
      structuredSucceeded: false,
      repairTriggered: false,
      repairSucceeded: false,
      tokenEstimate: 100,
      source: "non_stream",
    });
    assert.equal(getAssistantTurnTelemetry().length, 0);
  });

  it("records redacted turns and summarizes latency/error by route when enabled", async () => {
    await withTelemetryEnabled(() => {
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "groq-model token=AbCd1234EfGh5678IjKl9012MnOp",
        route: "/today",
        mode: "real",
        latencyMs: 200,
        outcome: "success",
        actionType: "create_task",
        actionCount: 1,
        structuredAttempted: true,
        structuredSucceeded: true,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 150,
        sessionHash: hashSession("sess_a"),
        source: "non_stream",
      });
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "groq-model",
        route: "/today",
        mode: "real",
        latencyMs: 800,
        outcome: "error",
        errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT",
        actionCount: 0,
        structuredAttempted: false,
        structuredSucceeded: false,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 90,
        source: "stream",
      });

      const turns = getAssistantTurnTelemetry();
      assert.equal(turns.length, 2);
      // model có token dài phải bị redact
      assert.ok(!turns[0].model.includes("AbCd1234EfGh5678IjKl9012MnOp"));

      const summary = summarizeAssistantTelemetryByRoute();
      const today = summary.find((s) => s.route === "/today");
      assert.ok(today);
      assert.equal(today!.count, 2);
      assert.equal(today!.errorCount, 1);
      assert.equal(today!.avgLatencyMs, 500);
    });
  });
});

describe("G4 client telemetry ingest gating", () => {
  beforeEach(() => resetClientAssistantEvents());
  afterEach(() => resetClientAssistantEvents());

  it("does not store client events when telemetry disabled", () => {
    const accepted = recordClientAssistantEvents([
      { type: "assistant_message_sent", createdAt: "2026-06-06T00:00:00.000Z" },
    ]);
    assert.equal(accepted, 0);
    assert.equal(getClientAssistantEvents().length, 0);
  });

  it("stores normalized client events when enabled", async () => {
    await withTelemetryEnabled(() => {
      const accepted = recordClientAssistantEvents([
        { type: "assistant_message_sent", route: "/today", createdAt: "2026-06-06T00:00:00.000Z" },
        { invalid: true },
      ]);
      assert.equal(accepted, 1);
      const events = getClientAssistantEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0].type, "assistant_message_sent");
    });
  });
});

describe("G4/G5 dashboard overview summaries", () => {
  beforeEach(() => {
    resetAssistantTurnTelemetry();
    resetClientAssistantEvents();
  });
  afterEach(() => {
    resetAssistantTurnTelemetry();
    resetClientAssistantEvents();
  });

  it("provider health: gộp theo provider+model, tính error/fallback/timeout/rate-limit", async () => {
    await withTelemetryEnabled(() => {
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/today",
        mode: "real",
        latencyMs: 200,
        outcome: "success",
        actionCount: 1,
        structuredAttempted: true,
        structuredSucceeded: true,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 100,
        source: "non_stream",
      });
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/today",
        mode: "real",
        latencyMs: 600,
        outcome: "error",
        errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT",
        actionCount: 0,
        structuredAttempted: false,
        structuredSucceeded: false,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 80,
        source: "stream",
      });
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/smart-goal",
        mode: "real",
        latencyMs: 400,
        outcome: "fallback",
        errorCode: "ASSISTANT_PROVIDER_TIMEOUT",
        actionCount: 0,
        structuredAttempted: false,
        structuredSucceeded: false,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 70,
        source: "non_stream",
      });

      const health = summarizeAssistantProviderHealth();
      const entry = health.find((h) => h.provider === "groq" && h.model === "llama-4-scout");
      assert.ok(entry);
      assert.equal(entry!.count, 3);
      assert.equal(entry!.errorCount, 1);
      assert.equal(entry!.fallbackCount, 1);
      assert.equal(entry!.rateLimitCount, 1);
      assert.equal(entry!.timeoutCount, 1);
      assert.equal(entry!.errorRate, 33);
      assert.equal(entry!.fallbackRate, 33);
    });
  });

  it("quality proxy: tính acceptance/success/clarification/helpful từ client events", async () => {
    await withTelemetryEnabled(() => {
      recordClientAssistantEvents([
        { type: "assistant_action_proposed", createdAt: "2026-06-06T00:00:00.000Z" },
        { type: "assistant_action_proposed", createdAt: "2026-06-06T00:00:01.000Z" },
        { type: "assistant_action_executed", createdAt: "2026-06-06T00:00:02.000Z" },
        { type: "assistant_action_verified", createdAt: "2026-06-06T00:00:03.000Z" },
        { type: "assistant_clarification_created", createdAt: "2026-06-06T00:00:04.000Z" },
        { type: "assistant_clarification_resolved", createdAt: "2026-06-06T00:00:05.000Z" },
        { type: "assistant_feedback_submitted", success: true, createdAt: "2026-06-06T00:00:06.000Z" },
        { type: "assistant_feedback_submitted", success: false, createdAt: "2026-06-06T00:00:07.000Z" },
      ]);

      const quality = summarizeAssistantQualityProxy();
      assert.equal(quality.actionsProposed, 2);
      assert.equal(quality.actionsExecuted, 1);
      assert.equal(quality.actionsVerified, 1);
      assert.equal(quality.actionAcceptanceRate, 50);
      assert.equal(quality.actionSuccessRate, 100);
      assert.equal(quality.clarificationResolutionRate, 100);
      assert.equal(quality.feedbackTotal, 2);
      assert.equal(quality.helpfulRate, 50);
    });
  });

  it("cost + parse/repair summary tính token estimate và structured/repair rate", async () => {
    await withTelemetryEnabled(() => {
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/today",
        mode: "real",
        latencyMs: 200,
        outcome: "success",
        actionCount: 1,
        structuredAttempted: true,
        structuredSucceeded: true,
        repairTriggered: true,
        repairSucceeded: true,
        tokenEstimate: 100,
        source: "non_stream",
      });
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/today",
        mode: "real",
        latencyMs: 300,
        outcome: "success",
        actionCount: 0,
        structuredAttempted: true,
        structuredSucceeded: false,
        repairTriggered: true,
        repairSucceeded: false,
        tokenEstimate: 200,
        source: "non_stream",
      });

      const cost = summarizeAssistantCost();
      const entry = cost.find((c) => c.model === "llama-4-scout");
      assert.ok(entry);
      assert.equal(entry!.turns, 2);
      assert.equal(entry!.totalTokenEstimate, 300);
      assert.equal(entry!.avgTokenEstimate, 150);

      const parseRepair = summarizeAssistantParseRepair();
      assert.equal(parseRepair.structuredAttempted, 2);
      assert.equal(parseRepair.structuredSucceeded, 1);
      assert.equal(parseRepair.structuredSuccessRate, 50);
      assert.equal(parseRepair.repairTriggered, 2);
      assert.equal(parseRepair.repairSucceeded, 1);
      assert.equal(parseRepair.repairSuccessRate, 50);
    });
  });

  it("getAssistantTelemetryOverview gộp đầy đủ các mục cho dashboard", async () => {
    await withTelemetryEnabled(() => {
      recordAssistantTurnTelemetry({
        provider: "groq",
        model: "llama-4-scout",
        route: "/today",
        mode: "real",
        latencyMs: 250,
        outcome: "success",
        actionCount: 1,
        structuredAttempted: true,
        structuredSucceeded: true,
        repairTriggered: false,
        repairSucceeded: false,
        tokenEstimate: 120,
        source: "non_stream",
      });
      recordClientAssistantEvents([
        { type: "assistant_action_proposed", createdAt: "2026-06-06T00:00:00.000Z" },
      ]);

      const overview = getAssistantTelemetryOverview();
      assert.equal(overview.turnCount, 1);
      assert.equal(overview.clientEventCount, 1);
      assert.ok(overview.providerHealth.length >= 1);
      assert.ok(overview.byRoute.length >= 1);
      assert.equal(overview.quality.actionsProposed, 1);
      assert.ok(overview.cost.length >= 1);
      assert.ok(typeof overview.generatedAt === "string");
    });
  });
});
