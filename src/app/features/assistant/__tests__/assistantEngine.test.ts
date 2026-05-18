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

  it("falls back when no keyword matches", async () => {
    const promise = mockProvider.send("Xin chào", sampleContext);
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
});
