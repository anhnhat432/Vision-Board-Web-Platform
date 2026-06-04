import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockProvider, resetAssistantSession } from "../assistantEngine";
import type { AssistantContext } from "../buildAssistantContext";

const sampleContext: AssistantContext = {
  currentWeek: 5,
  weeksTotal: 12,
  goals: [
    { id: "g1", title: "Học React nâng cao", progress: 60 },
    { id: "g2", title: "Chạy 5km", progress: 30 },
  ],
  todayTasks: [
    { id: "t1", title: "Đọc chapter 3", done: false },
    { id: "t2", title: "Làm bài tập", done: true },
    { id: "t3", title: "Review PR", done: false },
  ],
  lastReflectionDate: "2025-01-10",
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
    route: "/12-week-system",
    currentStep: null,
    nextSuggestedStep: null,
    formDraft: {},
  },
};

describe("mockProvider", () => {
  beforeEach(() => {
    resetAssistantSession();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects today intent", async () => {
    const promise = mockProvider.send("Hôm nay tôi có việc gì không?", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("Đọc chapter 3");
    expect(response).toContain("đã xong");
  });

  it("detects week intent", async () => {
    const promise = mockProvider.send("Tuần này tôi thế nào?", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    const lower = response.toLowerCase();
    expect(lower).toContain("tuần 5");
    expect(lower).toMatch(/5(\/12| của 12 tuần)/);
  });

  it("detects goals intent", async () => {
    const promise = mockProvider.send("Liệt kê mục tiêu của tôi", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("Học React nâng cao");
    expect(response).toContain("60%");
    expect(response).toContain("Chạy 5km");
  });

  it("detects reflection intent", async () => {
    const promise = mockProvider.send("Gợi ý reflection cho tôi", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("reflection");
    expect(response).toContain("Hôm nay bạn học được gì?");
  });

  it("returns definition response for SMART question", async () => {
    const promise = mockProvider.send("SMART là gì?", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("Specific");
    expect(response).not.toContain("Việc nên làm ngay");
  });

  it("returns greeting response for hi", async () => {
    const promise = mockProvider.send("chào", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.length).toBeLessThan(200);
    expect(response).not.toContain("Việc nên làm ngay");
  });

  it("falls back when no keyword matches", async () => {
    const promise = mockProvider.send("Tôi cần hỗ trợ thêm", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("có thể giúp");
    expect(response).not.toContain("tuần 5");
    expect(response).not.toContain("Đọc chapter 3");
  });

  it("handles empty todayTasks", async () => {
    const promise = mockProvider.send("Hôm nay có gì không?", {
      ...sampleContext,
      todayTasks: [],
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chưa có task nào");
  });

  it("handles empty goals", async () => {
    const promise = mockProvider.send("Mục tiêu của tôi?", {
      ...sampleContext,
      goals: [],
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chưa đặt mục tiêu nào");
  });

  it("handles null currentWeek", async () => {
    const promise = mockProvider.send("Tôi ở tuần nào?", {
      ...sampleContext,
      currentWeek: null,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chưa có 12-week plan");
  });

  it("adds demo disclaimer on first call", async () => {
    const promise = mockProvider.send("test", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chế độ demo");
    expect(response).toContain("tham khảo");
  });

  it("does not add demo disclaimer on subsequent calls", async () => {
    const first = mockProvider.send("test1", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    await first;

    const second = mockProvider.send("test2", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await second;

    expect(response).not.toContain("chế độ demo");
  });

  it("returns a non-empty string for today intent", async () => {
    const promise = mockProvider.send("today", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("limits today tasks to 5 items", async () => {
    const promise = mockProvider.send("today", {
      ...sampleContext,
      todayTasks: Array.from({ length: 10 }, (_, index) => ({
        id: `t${index}`,
        title: `Task ${index}`,
        done: false,
      })),
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.split("- ").length - 1).toBeLessThanOrEqual(5);
  });

  it("uses the stable three-part assistant format", async () => {
    const promise = mockProvider.send("today", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("Việc nên làm ngay:");
    expect(response).toContain("Lý do:");
    expect(response).toContain("Nếu chỉ có 10 phút:");
  });

  it("detects tick task intent and returns action proposal when open tasks exist", async () => {
    const promise = mockProvider.send("tick task hôm nay", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("mark_task_done");
    expect(response).toContain("Đọc chapter 3");
    expect(response).not.toContain('"autoExecute": true');
  });

  it("auto-executes tick intent when there is exactly one open task", async () => {
    const promise = mockProvider.send("tick task hôm nay", {
      ...sampleContext,
      todayTasks: [
        { id: "t1", title: "Đọc chapter 3", done: false },
        { id: "t2", title: "Làm bài tập", done: true },
      ],
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("mark_task_done");
    expect(response).toContain('"taskId": "t1"');
    expect(response).toContain('"autoExecute": true');
  });

  it("fuzzy matches a named task and marks only that task as auto-executable", async () => {
    const promise = mockProvider.send("xong task đọc sách", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain('"taskId": "t1"');
    expect(response).toContain('"autoExecute": true');
    expect(response).not.toContain('"taskId": "t3"');
  });

  it("does not create an action when the matched task is already done", async () => {
    const promise = mockProvider.send("xong task bài tập", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("đã hoàn thành từ trước");
    expect(response).not.toContain("```action");
  });

  it("refuses bulk task ticking instead of auto-executing multiple actions", async () => {
    const promise = mockProvider.send("tick hết task hôm nay", sampleContext);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chưa tick hàng loạt");
    expect(response).not.toContain("```action");
  });

  it("keeps action blocks when memory prefers brief responses", async () => {
    const promise = mockProvider.send("tick task hôm nay", {
      ...sampleContext,
      assistantMemory: {
        preferredCoachingStyle: "brief",
        recurringObstacles: [],
        userPreferences: [],
        rejectedPatterns: ["nói quá dài"],
        recentCorrections: [],
        oftenMissedTasks: [],
      },
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("```action");
    expect(response).toContain("mark_task_done");
  });

  it("detects tick task intent and returns message when no open tasks exist", async () => {
    const promise = mockProvider.send("tick task hôm nay", {
      ...sampleContext,
      todayTasks: sampleContext.todayTasks.map((t) => ({ ...t, done: true })),
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("không có công việc nào chưa hoàn thành");
  });

  it("detects tick task intent and returns error message when no 12-week plan active", async () => {
    const promise = mockProvider.send("tick task hôm nay", {
      ...sampleContext,
      currentWeek: null,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("chưa có kế hoạch 12 tuần nào đang hoạt động");
  });

  it("handles obstacle queries using retrievedKnowledge", async () => {
    const contextWithRetrieval: AssistantContext = {
      ...sampleContext,
      retrievedKnowledge: [
        {
          source: "weekly_review",
          title: "Weekly Review tuần 1",
          snippet: "Bị kẹt vì thiếu từ vựng tiếng Anh",
          score: 85,
        },
      ],
    };

    const promise = mockProvider.send("Tuần trước tôi bị kẹt vì gì?", contextWithRetrieval);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("trở ngại trước đây là");
    expect(response).toContain("Bị kẹt vì thiếu từ vựng tiếng Anh");
  });

  it("handles toeic queries using retrievedKnowledge", async () => {
    const contextWithRetrieval: AssistantContext = {
      ...sampleContext,
      retrievedKnowledge: [
        {
          source: "goal",
          title: "Học thi TOEIC 750",
          snippet: "Goal: Học thi TOEIC 750 (Category: career, Progress: 20%)",
          score: 90,
        },
      ],
    };

    const promise = mockProvider.send("Mục tiêu TOEIC của tôi thế nào?", contextWithRetrieval);
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response).toContain("bạn có mục tiêu TOEIC sau");
    expect(response).toContain("Học thi TOEIC 750");
  });
});
