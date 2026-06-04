import { beforeEach, describe, expect, it } from "vitest";
import {
  ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY,
  captureAssistantFeedback,
  exportAssistantFeedbackDataset,
  getAssistantGoldenExamples,
} from "../assistantFeedback";

describe("assistantFeedback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores bounded golden examples locally for later prompt or fine-tune review", () => {
    const record = captureAssistantFeedback({
      userId: "user_1",
      route: "/smart-goal-setup",
      rating: "helpful",
      userMessage: "tôi muốn học TOEIC thì phần này nên điền như nào",
      assistantMessage: "Việc nên làm ngay: Điền Specific: Đạt TOEIC 750+ trong 12 tuần.",
      context: {
        currentWeek: null,
        weeksTotal: 12,
        goals: [],
        todayTasks: [],
        lastReflectionDate: null,
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
          route: "/smart-goal-setup",
          currentStep: "smart_goal_setup",
          nextSuggestedStep: "Điền phần SMART còn thiếu: specific",
          formDraft: {
            focusArea: "Personal Growth",
            missingSmartGoalFields: ["specific"],
          },
        },
        route: "/smart-goal-setup",
      },
    });

    const stored = getAssistantGoldenExamples();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: record.id,
      userId: "user_1",
      route: "/smart-goal-setup",
      rating: "helpful",
      userMessage: "tôi muốn học TOEIC thì phần này nên điền như nào",
      assistantMessage: "Việc nên làm ngay: Điền Specific: Đạt TOEIC 750+ trong 12 tuần.",
      context: {
        route: "/smart-goal-setup",
        pageContext: {
          currentStep: "smart_goal_setup",
          formDraft: {
            focusArea: "Personal Growth",
            missingSmartGoalFields: ["specific"],
          },
        },
      },
    });
    expect(localStorage.getItem(ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY)).toContain("TOEIC");
  });

  it("exports golden examples and user-scoped feedback entries as a sanitized dataset", () => {
    captureAssistantFeedback({
      userId: "user_1",
      route: "/12-week-system",
      rating: "not_helpful",
      userMessage: "api key: abc123 should not leak",
      assistantMessage: "token=XYZ_TOKEN_SECRET should not leak",
      context: null,
      reason: "wrong_action",
      correction: "Use the selected task only",
    });

    localStorage.setItem(
      "assistant.feedback:anon",
      JSON.stringify([
        {
          messageId: "message_1",
          userText: "please tick task_1",
          replyText: "secret: raw_secret_value",
          rating: "down",
          timestamp: 100,
          route: "/12-week-system",
          reason: "wrong_action",
          correction: "Use the taskId from context",
        },
      ]),
    );
    localStorage.setItem("assistant.feedback.map:anon", JSON.stringify({ message_1: "down" }));

    const storedGolden = JSON.parse(localStorage.getItem(ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY) ?? "[]") as Array<
      Record<string, unknown>
    >;
    storedGolden.push({
      id: "legacy_context_record",
      userId: "user_1",
      route: "/12-week-system",
      rating: "helpful",
      createdAt: new Date().toISOString(),
      userMessage: "ok",
      assistantMessage: "ok",
      context: {
        route: "/12-week-system",
        goals: [{ id: "goal_1", title: "password: should_not_escape", progress: 0 }],
      },
    });
    localStorage.setItem(ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY, JSON.stringify(storedGolden));

    const exported = JSON.parse(exportAssistantFeedbackDataset()) as Array<Record<string, unknown>>;

    expect(exported.some((entry) => entry.source === "golden_example")).toBe(true);
    expect(exported.some((entry) => entry.source === "feedback_entry" && entry.messageId === "message_1")).toBe(true);
    expect(JSON.stringify(exported)).not.toContain("abc123");
    expect(JSON.stringify(exported)).not.toContain("XYZ_TOKEN_SECRET");
    expect(JSON.stringify(exported)).not.toContain("raw_secret_value");
    expect(JSON.stringify(exported)).not.toContain("should_not_escape");
    expect(JSON.stringify(exported)).not.toContain("assistant.feedback.map");
  });

  it("keeps only the newest 200 records", () => {
    for (let index = 0; index < 205; index += 1) {
      captureAssistantFeedback({
        userId: null,
        route: "/12-week-system",
        rating: "not_helpful",
        userMessage: `question ${index}`,
        assistantMessage: `answer ${index}`,
        context: null,
      });
    }

    const stored = getAssistantGoldenExamples();
    expect(stored).toHaveLength(200);
    expect(stored[0].userMessage).toBe("question 5");
    expect(stored[199].userMessage).toBe("question 204");
  });
});
