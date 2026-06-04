import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAssistantMemory,
  normalizeAssistantMemory,
  updateAssistantMemoryFromFeedback,
  updateAssistantMemoryFromActionResult,
  summarizeAssistantMemoryForContext,
  ASSISTANT_MEMORY_STORAGE_KEY,
} from "../assistantMemory";
import { buildAssistantContext } from "../buildAssistantContext";
import { sanitizeAssistantContext } from "../sanitizeContext";

describe("Assistant Memory Suite", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it("normalizeAssistantMemory handles null, empty, or malformed inputs", () => {
    const mem1 = normalizeAssistantMemory(null);
    expect(mem1.version).toBe(1);
    expect(mem1.userPreferences).toEqual([]);

    const malformed = {
      version: "bad_version",
      userPreferences: "not_an_array",
      taskBehaviorSignals: "should_be_object",
    };
    const mem2 = normalizeAssistantMemory(malformed);
    expect(mem2.version).toBe(1);
    expect(mem2.userPreferences).toEqual([]);
    expect(mem2.taskBehaviorSignals.oftenMissedTaskTitles).toEqual([]);
  });

  it("memory arrays size is limited and text is truncated", () => {
    const raw = {
      userPreferences: Array.from({ length: 30 }, (_, i) => `Pref ${i}`.repeat(50)), // Rất dài
    };
    const mem = normalizeAssistantMemory(raw);
    expect(mem.userPreferences.length).toBeLessThanOrEqual(15);
    expect(mem.userPreferences[0].length).toBeLessThanOrEqual(150); // bị truncate
  });

  it("returns undefined summary when memory has no useful signal", () => {
    const summary = summarizeAssistantMemoryForContext(normalizeAssistantMemory(null));

    expect(summary).toBeUndefined();
  });

  it("feedback thumbs down creates rejectedPattern and correction", () => {
    updateAssistantMemoryFromFeedback("not_helpful", "Dài dòng quá Cú ơi", "Tôi xin lỗi để tôi giải thích dài dòng như sau...".repeat(30));
    
    const mem = getAssistantMemory();
    expect(mem.rejectedPatterns).toContain("nói quá dài");
    expect(mem.preferredCoachingStyle).toBe("brief");
    expect(mem.recentCorrections.length).toBe(1);
    expect(mem.recentCorrections[0].userSaid).toBe("Dài dòng quá Cú ơi");
  });

  it("feedback thumbs up updates successfulPatterns", () => {
    updateAssistantMemoryFromFeedback("helpful", "Tuyệt vời", "mark_task_done");
    
    const mem = getAssistantMemory();
    expect(mem.successfulPatterns).toContain("hoàn thành task nhanh");
  });

  it("successful action updates successfulPatterns and preferences", () => {
    updateAssistantMemoryFromActionResult("reschedule_task", "Dời lịch task", true, "Thành công");
    
    const mem = getAssistantMemory();
    expect(mem.taskBehaviorSignals.commonRescheduleReason).toBe("dời lịch khi bận");
    expect(mem.userPreferences).toContain("thường xuyên dời lịch task");
  });

  it("failed action due to missing context updates rejectedPatterns", () => {
    updateAssistantMemoryFromActionResult("mark_task_done", "Tick task", false, "Không tìm thấy task tương ứng.");
    
    const mem = getAssistantMemory();
    expect(mem.rejectedPatterns).toContain("chưa rõ mục tiêu hoặc task trong context");
  });

  it("buildAssistantContext includes memory summary", () => {
    const testMemory = {
      version: 1,
      updatedAt: new Date().toISOString(),
      userPreferences: ["Tự học", "Đọc sách"],
      recurringObstacles: ["Thiếu thời gian"],
      preferredCoachingStyle: "direct" as const,
      successfulPatterns: [],
      rejectedPatterns: ["nói dài"],
      recentCorrections: [
        { at: new Date().toISOString(), userSaid: "Ngắn thôi", assistantShouldDo: "Trả lời ngắn" }
      ],
      taskBehaviorSignals: {
        oftenMissedTaskTitles: ["Tập thể dục"],
      }
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ASSISTANT_MEMORY_STORAGE_KEY, JSON.stringify(testMemory));
    }

    const ctx = buildAssistantContext(new Date(), "/dashboard");
    expect(ctx.assistantMemory).toBeDefined();
    expect(ctx.assistantMemory?.preferredCoachingStyle).toBe("direct");
    expect(ctx.assistantMemory?.recurringObstacles).toContain("Thiếu thời gian");
    expect(ctx.assistantMemory?.recentCorrections).toContain("Trả lời ngắn");
    expect(ctx.assistantMemory?.oftenMissedTasks).toContain("Tập thể dục");
  });

  it("sanitizeContext limits memory arrays to max 3 items", () => {
    const summary = {
      preferredCoachingStyle: "direct" as const,
      recurringObstacles: ["1", "2", "3", "4", "5"],
      userPreferences: ["A", "B", "C", "D"],
      rejectedPatterns: ["X", "Y", "Z"],
      recentCorrections: ["Do this", "Do that"],
      oftenMissedTasks: ["Task 1"],
    };

    const ctx = {
      route: "/dashboard",
      currentWeek: 1,
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
      trend: { completionLast4Weeks: [], direction: "unknown" as const },
      streak: { daysWithCompletedTask: 0 },
      upcomingDeadlines: [],
      pageContext: { route: "/dashboard", currentStep: null, nextSuggestedStep: null, formDraft: {} },
      assistantMemory: summary,
    };

    const sanitized = sanitizeAssistantContext(ctx);
    expect(sanitized.assistantMemory).toBeDefined();
    expect(sanitized.assistantMemory?.recurringObstacles.length).toBe(3);
    expect(sanitized.assistantMemory?.userPreferences.length).toBe(3);
  });
});
