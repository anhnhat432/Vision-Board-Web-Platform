import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getMemoryItems,
  addMemoryItem,
  deleteMemoryItem,
  clearMemory,
  autoCaptureUserMemory,
  redactSensitive,
} from "../assistantMemory";
import { retrieveAssistantKnowledge } from "../assistantRetrieval";
import { buildAssistantContext } from "../buildAssistantContext";
import { sanitizeAssistantContext } from "../sanitizeContext";
import * as storage from "@/app/utils/storage";
import type { UserData } from "@/app/utils/storage-types";

vi.mock("@/app/utils/storage", () => {
  let mockUserData: UserData | null = null;
  return {
    getUserData: vi.fn(() => mockUserData),
    saveUserData: vi.fn((data: UserData) => {
      mockUserData = data;
    }),
    __setMockUserData: (data: UserData | null) => {
      mockUserData = data;
    },
  };
});

type StorageTestModule = typeof storage & {
  __setMockUserData(data: UserData | null): void;
};

describe("Assistant Memory Phase 7 - Memory Items & Retrieval", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it("manages MemoryItems by user scope correctly", () => {
    // 1. User A
    addMemoryItem({ type: "user_preference", content: "Thích học buổi sáng" }, "user_A");
    // 2. User B
    addMemoryItem({ type: "user_preference", content: "Thích chạy bộ tối" }, "user_B");
    // 3. Anonymous fallback
    addMemoryItem({ type: "user_preference", content: "Preferences ẩn danh" }, null);

    const itemsA = getMemoryItems("user_A");
    const itemsB = getMemoryItems("user_B");
    const itemsAnon = getMemoryItems(null);

    expect(itemsA).toHaveLength(1);
    expect(itemsA[0].content).toBe("Thích học buổi sáng");
    expect(itemsA[0].userId).toBe("user_A");

    expect(itemsB).toHaveLength(1);
    expect(itemsB[0].content).toBe("Thích chạy bộ tối");
    expect(itemsB[0].userId).toBe("user_B");

    expect(itemsAnon).toHaveLength(1);
    expect(itemsAnon[0].content).toBe("Preferences ẩn danh");
    expect(itemsAnon[0].userId).toBe("anon");
  });

  it("redacts sensitive data like keys and emails correctly", () => {
    const rawContent = "Email của tôi là admin@visionboard.com và API Key là api_key: AIzaSyD-1234567890-abcdefgh";
    const redacted = redactSensitive(rawContent);

    expect(redacted).not.toContain("admin@visionboard.com");
    expect(redacted).not.toContain("AIzaSyD-1234567890-abcdefgh");
    expect(redacted).toContain("[EMAIL_REDACTED]");
    expect(redacted).toContain("[REDACTED]");
  });

  it("limits content length and truncates text appropriately", () => {
    const veryLongText = Array(100).fill("hello").join(" ");
    const addedItem = addMemoryItem({ type: "user_preference", content: veryLongText }, "user_limit");
    
    expect(addedItem.content.length).toBe(300); // truncated to 300
  });

  it("deletes a memory item correctly", () => {
    const item = addMemoryItem({ type: "user_preference", content: "Delete me" }, "user_del");
    expect(getMemoryItems("user_del")).toHaveLength(1);

    deleteMemoryItem(item.id, "user_del");
    expect(getMemoryItems("user_del")).toHaveLength(0);
  });

  it("clears memory for a specific user completely", () => {
    addMemoryItem({ type: "user_preference", content: "Clear me" }, "user_clear");
    expect(getMemoryItems("user_clear")).toHaveLength(1);

    clearMemory("user_clear");
    expect(getMemoryItems("user_clear")).toHaveLength(0);
  });

  it("migrates legacy memory schema on first load seamlessly", () => {
    const legacyMemory = {
      version: 1,
      updatedAt: new Date().toISOString(),
      userPreferences: ["Đọc sách"],
      recurringObstacles: ["Lười biếng"],
      preferredCoachingStyle: "brief" as const,
      successfulPatterns: [],
      rejectedPatterns: [],
      recentCorrections: [
        { at: new Date().toISOString(), userSaid: "Dài quá", assistantShouldDo: "Trả lời ngắn thôi" }
      ],
      taskBehaviorSignals: {
        oftenMissedTaskTitles: ["Chạy bộ"],
      }
    };
    localStorage.setItem("assistant.memory", JSON.stringify(legacyMemory));

    const items = getMemoryItems("user_migrated");
    expect(items.length).toBeGreaterThan(0);
    
    // Kiểm tra xem Đọc sách đã được migrate thành item
    expect(items.some(it => it.type === "user_preference" && it.content === "Đọc sách")).toBe(true);
    // Kiểm tra xem Lười biếng đã được migrate
    expect(items.some(it => it.type === "user_preference" && it.content === "Lười biếng" && it.tags?.includes("obstacle"))).toBe(true);
    // Kiểm tra xem Trả lời ngắn thôi đã được migrate
    expect(items.some(it => it.type === "assistant_correction" && it.content === "Trả lời ngắn thôi")).toBe(true);
  });

  it("captures preferences from user chat text automatically", () => {
    autoCaptureUserMemory("Tôi thích học tiếng Anh vào buổi sáng", "user_capture");
    const items1 = getMemoryItems("user_capture");
    expect(items1).toHaveLength(1);
    expect(items1[0].type).toBe("user_preference");

    autoCaptureUserMemory("Mục tiêu chính của tôi là thi đỗ IELTS 7.5", "user_capture");
    const items2 = getMemoryItems("user_capture");
    expect(items2).toHaveLength(2);
    expect(items2.some(it => it.type === "goal_context" && it.content.includes("IELTS"))).toBe(true);

    // Test capture Obstacles
    autoCaptureUserMemory("Tuần này bận quá không có thời gian", "user_capture");
    const items3 = getMemoryItems("user_capture");
    expect(items3.some(it => it.type === "user_preference" && it.tags?.includes("obstacle") && it.content.includes("bận quá"))).toBe(true);

    // Test capture Preferred Work Time
    autoCaptureUserMemory("Tôi thường học buổi sáng sớm", "user_capture");
    const items4 = getMemoryItems("user_capture");
    expect(items4.some(it => it.type === "user_preference" && it.tags?.includes("preferred_time") && it.content.includes("sáng sớm"))).toBe(true);
  });

  it("retrieves knowledge using keywords, active goal, decay, and tag matching", () => {
    const now = new Date();
    addMemoryItem({
      type: "user_preference",
      content: "Tôi thích học IELTS",
      tags: ["ielts", "study"],
      createdAt: now.toISOString(),
    }, "user_ret");

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30); // 30 days ago
    addMemoryItem({
      type: "goal_context",
      content: "Mục tiêu IELTS cũ của tôi",
      tags: ["ielts"],
      createdAt: oldDate.toISOString(),
    }, "user_ret");

    const results = retrieveAssistantKnowledge("IELTS", {
      userId: "user_ret",
      referenceDate: now,
    });

    expect(results).toHaveLength(2);
    // Kết quả mới hơn phải có score cao hơn nhờ decay
    expect(results[0].title).toContain("Memory - Type: user_preference");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("integrates flat memories into buildAssistantContext and sanitizes correctly", () => {
    const mockUserData = {
      goals: [
        {
          id: "g1",
          title: "Goal 1",
          category: "career",
          tasks: [],
        }
      ],
      reflections: [],
    } as unknown as UserData;
    (storage as StorageTestModule).__setMockUserData(mockUserData);

    addMemoryItem({ type: "user_preference", content: "Thích code React" }, "user_ctx");

    const ctx = buildAssistantContext(new Date(), "/dashboard", undefined, "React", "user_ctx");
    
    expect(ctx.assistantMemory).toBeDefined();
    expect(ctx.assistantMemory?.userPreferences).toContain("Thích code React");
    expect(ctx.retrievedKnowledge).toBeDefined();
    expect(ctx.retrievedKnowledge?.length).toBeGreaterThan(0);
    expect(ctx.retrievedKnowledge?.[0].snippet).toBe("Thích code React");

    // Sanitize
    const sanitized = sanitizeAssistantContext({
      ...ctx,
      route: "/dashboard",
    });
    expect(sanitized.retrievedKnowledge).toBeDefined();
    expect(sanitized.retrievedKnowledge?.[0].snippet).toBe("Thích code React");
  });
});
