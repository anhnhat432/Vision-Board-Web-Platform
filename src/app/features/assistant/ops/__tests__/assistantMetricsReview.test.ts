import { describe, expect, it } from "vitest";
import type { AssistantGoldenExample } from "../../assistantFeedback";
import type { AssistantEvent, AssistantEventType } from "../../assistantObservability";
import {
  buildAssistantReviewReport,
  formatAssistantReviewReport,
} from "../assistantMetricsReview";

const WINDOW = { fromIso: "2026-06-01T00:00:00.000Z", toIso: "2026-06-08T00:00:00.000Z" };
const IN_WINDOW = "2026-06-03T10:00:00.000Z";
const OUT_OF_WINDOW = "2026-05-01T10:00:00.000Z";

let eventCounter = 0;
function makeEvent(type: AssistantEventType, route: string, createdAt: string): AssistantEvent {
  eventCounter += 1;
  return {
    id: `ev_${eventCounter}`,
    type,
    createdAt,
    userId: "user_1",
    sessionId: "sess_1",
    route,
  };
}

let goldenCounter = 0;
function makeGolden(overrides: Partial<AssistantGoldenExample>): AssistantGoldenExample {
  goldenCounter += 1;
  return {
    id: `golden_${goldenCounter}`,
    userId: "user_1",
    route: "/today",
    rating: "not_helpful",
    createdAt: IN_WINDOW,
    userMessage: "câu hỏi",
    assistantMessage: "trả lời",
    context: null,
    ...overrides,
  };
}

describe("buildAssistantReviewReport", () => {
  it("aggregates events and feedback only within the window", () => {
    const events: AssistantEvent[] = [
      makeEvent("assistant_message_sent", "/today", IN_WINDOW),
      makeEvent("assistant_message_received", "/today", IN_WINDOW),
      makeEvent("assistant_action_proposed", "/today", IN_WINDOW),
      makeEvent("assistant_action_executed", "/today", IN_WINDOW),
      makeEvent("assistant_action_verified", "/today", IN_WINDOW),
      makeEvent("assistant_message_sent", "/today", OUT_OF_WINDOW),
    ];
    const feedback: AssistantGoldenExample[] = [
      makeGolden({ rating: "helpful", reason: undefined }),
      makeGolden({ rating: "not_helpful", reason: "wrong_context" }),
      makeGolden({ rating: "not_helpful", reason: "wrong_context", createdAt: OUT_OF_WINDOW }),
    ];

    const report = buildAssistantReviewReport(events, feedback, { window: WINDOW });

    expect(report.messagesSent).toBe(1);
    expect(report.messagesReceived).toBe(1);
    expect(report.actionsProposed).toBe(1);
    expect(report.actionsExecuted).toBe(1);
    expect(report.actionsVerified).toBe(1);
    expect(report.actionAcceptanceRate).toBe(1);
    expect(report.actionSuccessRate).toBe(1);
    expect(report.feedbackTotal).toBe(2);
    expect(report.feedbackByReason.wrong_context).toBe(1);
  });

  it("flags unsafe feedback as a critical alert", () => {
    const feedback = [makeGolden({ reason: "unsafe" })];
    const report = buildAssistantReviewReport([], feedback, { window: WINDOW });

    const unsafeAlert = report.alerts.find((alert) => alert.id === "unsafe_feedback");
    expect(unsafeAlert).toBeDefined();
    expect(unsafeAlert?.level).toBe("critical");
  });

  it("warns when the thumbs-down ratio exceeds threshold with enough samples", () => {
    const feedback: AssistantGoldenExample[] = [
      makeGolden({ rating: "helpful" }),
      makeGolden({ rating: "helpful" }),
      makeGolden({ rating: "helpful" }),
      makeGolden({ rating: "not_helpful", reason: "too_long" }),
      makeGolden({ rating: "not_helpful", reason: "too_generic" }),
    ];

    const report = buildAssistantReviewReport([], feedback, { window: WINDOW });
    const notHelpfulAlert = report.alerts.find((alert) => alert.id === "not_helpful_ratio");
    expect(notHelpfulAlert).toBeDefined();
    expect(notHelpfulAlert?.level).toBe("warn");
  });

  it("does not warn on small feedback samples", () => {
    const feedback = [makeGolden({ rating: "not_helpful", reason: "too_long" })];
    const report = buildAssistantReviewReport([], feedback, { window: WINDOW });
    expect(report.alerts.find((alert) => alert.id === "not_helpful_ratio")).toBeUndefined();
  });

  it("ranks failure routes by failure signals", () => {
    const events: AssistantEvent[] = [
      makeEvent("assistant_message_received", "/today", IN_WINDOW),
      makeEvent("assistant_action_failed", "/today", IN_WINDOW),
      makeEvent("assistant_action_failed", "/today", IN_WINDOW),
      makeEvent("assistant_message_received", "/smart-goal", IN_WINDOW),
      makeEvent("assistant_action_failed", "/smart-goal", IN_WINDOW),
    ];
    const feedback = [makeGolden({ route: "/today", reason: "wrong_context" })];

    const report = buildAssistantReviewReport(events, feedback, { window: WINDOW });
    expect(report.topFailureRoutes[0].route).toBe("/today");
    expect(report.topFailureRoutes[0].actionFailedCount).toBe(2);
  });

  it("formats a readable markdown summary", () => {
    const report = buildAssistantReviewReport([], [makeGolden({ reason: "unsafe" })], { window: WINDOW });
    const text = formatAssistantReviewReport(report);
    expect(text).toContain("# Assistant Weekly Review");
    expect(text).toContain("Cảnh báo");
  });
});
