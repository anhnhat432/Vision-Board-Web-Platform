import { describe, expect, it, beforeEach } from "vitest";
import {
  ASSISTANT_GOLDEN_EXAMPLES_STORAGE_KEY,
  captureAssistantFeedback,
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
