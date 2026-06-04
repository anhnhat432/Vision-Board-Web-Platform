import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportAssistantEvents,
  getAssistantEvents,
  recordAssistantEvent,
  summarizeAssistantMetrics,
} from "../assistantObservability";
import type { AssistantEvalCase } from "../evals/assistantEvalCases";
import { runAssistantEvals } from "../evals/evalRunner";
import type { AssistantAction } from "../parseActions";

describe("assistantObservability", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("records and gets events under user-scoped keys", () => {
    recordAssistantEvent({
      type: "assistant_message_sent",
      userId: "user_alice",
      route: "/dashboard",
      messageId: "msg_1",
      metadata: { text: "Hello AI" },
    });

    recordAssistantEvent({
      type: "assistant_message_received",
      userId: "user_bob",
      route: "/12-week",
      messageId: "msg_2",
      metadata: { text: "Hello User" },
    });

    const aliceEvents = getAssistantEvents("user_alice");
    expect(aliceEvents).toHaveLength(1);
    expect(aliceEvents[0].userId).toBe("user_alice");
    expect(aliceEvents[0].route).toBe("/dashboard");
    expect(aliceEvents[0].messageId).toBe("msg_1");

    const bobEvents = getAssistantEvents("user_bob");
    expect(bobEvents).toHaveLength(1);
    expect(bobEvents[0].userId).toBe("user_bob");
    expect(bobEvents[0].route).toBe("/12-week");
    expect(bobEvents[0].messageId).toBe("msg_2");
  });

  it("caps the total stored events to 500 and keeps the newest ones", () => {
    // Record 505 events
    for (let i = 1; i <= 505; i++) {
      recordAssistantEvent({
        type: "assistant_message_sent",
        userId: "user_alice",
        route: "/dashboard",
        metadata: { index: i },
      });
    }

    const events = getAssistantEvents("user_alice");
    expect(events).toHaveLength(500);
    // Capped at 500, events should contain newest ones (since we unshift, index 505 should be at index 0)
    expect(events[0].metadata?.index).toBe(505);
    expect(events[499].metadata?.index).toBe(6);
  });

  it("redacts sensitive keywords and trims metadata length", () => {
    const longString = "hello world ".repeat(30); // 360 chars, words are short (no redacted trigger)
    recordAssistantEvent({
      type: "assistant_message_sent",
      userId: "user_alice",
      route: "/dashboard",
      metadata: {
        apiKey: "key-xyz-12345678901234567890",
        password: "my-secure-password",
        longChat: longString,
      },
    });

    const events = getAssistantEvents("user_alice");
    expect(events).toHaveLength(1);
    const meta = events[0].metadata;

    // Keys or values related to api key and password must be redacted
    const metaString = JSON.stringify(meta);
    expect(metaString).not.toContain("key-xyz-12345678901234567890");
    expect(metaString).not.toContain("my-secure-password");
    expect(metaString).toContain("[REDACTED]");

    // Strings over 200 chars should be sliced/truncated
    const longChat = meta?.longChat;
    expect(typeof longChat).toBe("string");
    if (typeof longChat !== "string") {
      throw new Error("Expected longChat metadata to be stored as a string");
    }
    expect(longChat).toHaveLength(200);
    expect(longChat.endsWith("hello world ")).toBe(false);
  });

  it("does not crash if localStorage is unavailable", () => {
    const spyGet = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    const spySet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full");
    });

    expect(() => {
      recordAssistantEvent({
        type: "assistant_message_sent",
        userId: "user_alice",
      });
    }).not.toThrow();

    spyGet.mockRestore();
    spySet.mockRestore();
  });

  it("calculates metrics correctly including success rate and feedback", () => {
    // 2 sent, 2 received
    recordAssistantEvent({ type: "assistant_message_sent", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_message_sent", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_message_received", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_message_received", userId: "user_alice" });

    // 4 actions proposed, 3 executed, 2 verified, 1 failed
    recordAssistantEvent({ type: "assistant_action_proposed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_proposed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_proposed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_proposed", userId: "user_alice" });

    recordAssistantEvent({ type: "assistant_action_executed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_executed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_executed", userId: "user_alice" });

    recordAssistantEvent({ type: "assistant_action_verified", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_verified", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_action_failed", userId: "user_alice" });

    // 1 clarification
    recordAssistantEvent({ type: "assistant_clarification_created", userId: "user_alice" });

    // 2 workflows confirmed, 1 completed, 1 failed
    recordAssistantEvent({ type: "assistant_workflow_confirmed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_workflow_confirmed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_workflow_completed", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_workflow_failed", userId: "user_alice" });

    // 2 nudges shown, 1 dismissed
    recordAssistantEvent({ type: "assistant_nudge_shown", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_nudge_shown", userId: "user_alice" });
    recordAssistantEvent({ type: "assistant_nudge_dismissed", userId: "user_alice" });

    // Feedbacks: 2 helpful, 1 not helpful
    recordAssistantEvent({ type: "assistant_feedback_submitted", userId: "user_alice", metadata: { rating: "up" } });
    recordAssistantEvent({ type: "assistant_feedback_submitted", userId: "user_alice", metadata: { rating: "up" } });
    recordAssistantEvent({ type: "assistant_feedback_submitted", userId: "user_alice", metadata: { rating: "down" } });

    const metrics = summarizeAssistantMetrics("user_alice");

    expect(metrics.totalMessagesSent).toBe(2);
    expect(metrics.totalMessagesReceived).toBe(2);
    expect(metrics.actionsProposed).toBe(4);
    expect(metrics.actionsExecuted).toBe(3);
    expect(metrics.actionsFailed).toBe(1);
    // Success count = 2. Executed count = 3. Success rate = 2 / 3 * 100 = 67%
    expect(metrics.actionSuccessRate).toBe(67);
    expect(metrics.clarificationsCount).toBe(1);
    expect(metrics.workflowsConfirmed).toBe(2);
    expect(metrics.workflowsCompleted).toBe(1);
    expect(metrics.workflowsFailed).toBe(1);
    expect(metrics.nudgesShown).toBe(2);
    expect(metrics.nudgesDismissed).toBe(1);
    expect(metrics.feedbackHelpful).toBe(2);
    expect(metrics.feedbackNotHelpful).toBe(1);
  });

  it("exports events correctly to string", () => {
    recordAssistantEvent({
      type: "assistant_message_sent",
      userId: "user_alice",
      metadata: { text: "exported test" },
    });

    const json = exportAssistantEvents("user_alice");
    expect(json).toContain("exported test");
    expect(json).toContain("assistant_message_sent");
  });
});

describe("evalRunner", () => {
  const evalCases: AssistantEvalCase[] = [
    {
      id: "case_test_contain",
      name: "Check contain rule",
      input: "test contain",
      context: { todayTasks: [] },
      expected: {
        shouldContain: ["hello", "world"],
      },
    },
    {
      id: "case_test_not_contain",
      name: "Check not contain rule",
      input: "test not contain",
      context: { todayTasks: [] },
      expected: {
        shouldNotContain: ["forbidden"],
      },
    },
    {
      id: "case_test_actions",
      name: "Check action type rules",
      input: "test actions",
      context: { todayTasks: [{ id: "task_1", title: "Task 1", done: false }] },
      expected: {
        expectedActionTypes: ["mark_task_done"],
        forbiddenActionTypes: ["create_goal"],
        mustUseExistingTaskId: true,
      },
    },
    {
      id: "case_test_max_words",
      name: "Check max words limit",
      input: "test max words",
      context: { todayTasks: [] },
      expected: {
        maxWords: 5,
      },
    },
    {
      id: "case_test_clarification",
      name: "Check must ask clarification",
      input: "test clarify",
      context: { todayTasks: [] },
      expected: {
        mustAskClarifyingQuestion: true,
      },
    },
  ];

  it("correctly identifies passed and failed criteria", async () => {
    const generateReply = async (
      input: string,
      _context: AssistantEvalCase["context"],
    ): Promise<{ content: string; actions: AssistantAction[] }> => {
      if (input === "test contain") {
        // Missing "world"
        return { content: "hello text", actions: [] as AssistantAction[] };
      }
      if (input === "test not contain") {
        // Contains forbidden word
        return { content: "contains forbidden stuff", actions: [] as AssistantAction[] };
      }
      if (input === "test actions") {
        // Correct mark_task_done, correct taskId, no forbidden action
        return {
          content: "Done task",
          actions: [
            {
              id: "1",
              type: "mark_task_done",
              label: "Mark",
              payload: { taskId: "task_1" },
            } as AssistantAction,
          ],
        };
      }
      if (input === "test max words") {
        // 6 words (> 5)
        return { content: "one two three four five six", actions: [] as AssistantAction[] };
      }
      if (input === "test clarify") {
        // Yes it asks clarification
        return { content: "Bạn muốn chọn task nào?", actions: [] as AssistantAction[] };
      }
      return { content: "", actions: [] as AssistantAction[] };
    };

    const summary = await runAssistantEvals(evalCases, generateReply);

    expect(summary.total).toBe(5);
    expect(summary.passed).toBe(2); // case_test_actions and case_test_clarification passed
    expect(summary.failed).toBe(3); // case_test_contain, case_test_not_contain, case_test_max_words failed

    const containResult = summary.results.find((r) => r.caseId === "case_test_contain");
    expect(containResult?.passed).toBe(false);
    expect(containResult?.failures[0]).toContain("expected text");

    const forbiddenResult = summary.results.find((r) => r.caseId === "case_test_not_contain");
    expect(forbiddenResult?.passed).toBe(false);
    expect(forbiddenResult?.failures[0]).toContain("forbidden text");

    const maxWordsResult = summary.results.find((r) => r.caseId === "case_test_max_words");
    expect(maxWordsResult?.passed).toBe(false);
    expect(maxWordsResult?.failures[0]).toContain("Word count");
  });
});
