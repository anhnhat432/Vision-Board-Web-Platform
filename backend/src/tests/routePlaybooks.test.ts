// Khởi tạo các biến môi trường bắt buộc trước khi import bất kỳ file nào validate env
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContext } from "../services/assistantService";
import {
  ROUTE_PLAYBOOKS,
  buildSystemPrompt,
  resolveRoutePlaybook,
} from "../services/assistantPromptUtils";

function makeContext(route: string, pageType?: string): AssistantContext {
  return {
    currentWeek: 1,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    route,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: 0,
      overdueTasks: [],
    },
    trend: { completionLast4Weeks: [], direction: "unknown" },
    streak: { daysWithCompletedTask: 0 },
    upcomingDeadlines: [],
    pageContext: {
      route,
      currentStep: null,
      nextSuggestedStep: null,
      formDraft: {},
    },
    pageContextHint: pageType ? { pageType } : undefined,
  } as AssistantContext;
}

describe("routePlaybooks", () => {
  it("has unique playbook ids", () => {
    const ids = ROUTE_PLAYBOOKS.map((playbook) => playbook.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("resolves the smart-goal playbook by route key", () => {
    const playbook = resolveRoutePlaybook("/smart-goal-setup");
    assert.equal(playbook?.id, "smart-goal");
  });

  it("resolves the today playbook for the 12-week-system route", () => {
    const playbook = resolveRoutePlaybook("/12-week-system");
    assert.equal(playbook?.id, "today");
  });

  it("returns undefined for an unknown route", () => {
    assert.equal(resolveRoutePlaybook("/unknown"), undefined);
  });

  it("injects the matching playbook guidance into the system prompt", () => {
    const prompt = buildSystemPrompt(makeContext("/feasibility-check"));
    assert.ok(prompt.includes("PLAYBOOK THEO MÀN HÌNH HIỆN TẠI"));
    assert.ok(prompt.includes("Feasibility: bám vào readiness/bottleneck"));
  });

  it("does not inject a playbook header for unknown routes", () => {
    const prompt = buildSystemPrompt(makeContext("/unknown"));
    assert.ok(!prompt.includes("PLAYBOOK THEO MÀN HÌNH HIỆN TẠI"));
  });
});
