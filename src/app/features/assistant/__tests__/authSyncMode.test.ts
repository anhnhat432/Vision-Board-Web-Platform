import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAssistantContext, buildAuthSyncMode } from "../buildAssistantContext";
import { sanitizeAssistantContext } from "../sanitizeContext";

// Mock các dependencies
vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: vi.fn(() => false),
}));

vi.mock("@/lib/auth/firebase", () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: { uid: "test_user_123" },
  })),
}));

vi.mock("@/features/plan12week/persistence/mutationQueue", () => ({
  readMutationQueueStore: vi.fn(() => ({
    items: [],
  })),
  summarizeMutationQueueStore: vi.fn(() => ({
    pendingCount: 0,
    inFlightCount: 0,
  })),
}));

vi.mock("@/app/utils/storage", () => ({
  getUserData: vi.fn(() => ({
    goals: [{ id: "g1", title: "Mục tiêu 1", tasks: [] }],
  })),
}));

import { isDemoMode } from "@/app/utils/app-mode";
import { getUserData } from "@/app/utils/storage";
import { readMutationQueueStore, summarizeMutationQueueStore } from "@/features/plan12week/persistence/mutationQueue";

describe("AI Assistant Context - AuthSyncMode & Sanitization & Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAuthSyncMode", () => {
    it("returns disabled sync state in demo mode", () => {
      vi.mocked(isDemoMode).mockReturnValue(true);

      const result = buildAuthSyncMode();

      expect(result.authState).toBe("anonymous");
      expect(result.syncState).toBe("disabled");
    });

    it("returns offline status if navigator is offline", () => {
      vi.mocked(isDemoMode).mockReturnValue(false);

      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const result = buildAuthSyncMode();

      expect(result.syncState).toBe("offline");

      // Khôi phục navigator
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it("returns error status if queue contains error mutations", () => {
      vi.mocked(isDemoMode).mockReturnValue(false);
      vi.mocked(readMutationQueueStore).mockReturnValue({
        items: [{ status: "failed_validation" } as any],
      } as any);

      const result = buildAuthSyncMode();

      expect(result.syncState).toBe("error");
    });

    it("returns syncing status if queue contains pending mutations", () => {
      vi.mocked(isDemoMode).mockReturnValue(false);
      vi.mocked(readMutationQueueStore).mockReturnValue({
        items: [],
      } as any);
      vi.mocked(summarizeMutationQueueStore).mockReturnValue({
        pendingCount: 1,
        inFlightCount: 0,
      } as any);

      const result = buildAuthSyncMode();

      expect(result.syncState).toBe("syncing");
    });
  });

  describe("AssistantContext Truncation and Sanitization Limits", () => {
    it("limits goals and todayTasks appropriately and removes sensitive fields", () => {
      const mockManyGoals = Array.from({ length: 10 }, (_, i) => ({
        id: `g_${i}`,
        title: `Mục tiêu dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng_${i}`,
        progress: 50,
      }));

      const mockManyTasks = Array.from({ length: 15 }, (_, i) => ({
        id: `t_${i}`,
        title: `Nhiệm vụ dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng dài loằng ngoằng_${i}`,
        done: false,
      }));

      const rawCtx = {
        currentWeek: 2,
        weeksTotal: 12,
        goals: mockManyGoals,
        todayTasks: mockManyTasks,
        lastReflectionDate: "2026-05-01",
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
          direction: "unknown" as const,
        },
        streak: {
          daysWithCompletedTask: 0,
        },
        upcomingDeadlines: [],
        pageContext: {
          route: "/today",
          currentStep: null,
          nextSuggestedStep: null,
          formDraft: {},
        },
        authSyncMode: {
          authState: "signed_in" as const,
          syncState: "synced" as const,
        },
        route: "/today",
      };

      const result = sanitizeAssistantContext(rawCtx);

      // Kiểm thử giới hạn số lượng (Limits)
      expect(result.goals.length).toBeLessThanOrEqual(5);
      expect(result.todayTasks.length).toBeLessThanOrEqual(8);

      // Kiểm thử giới hạn độ dài ký tự (Truncation)
      expect(result.goals[0].title.length).toBeLessThanOrEqual(200);
      expect(result.todayTasks[0].title.length).toBeLessThanOrEqual(200);

      // Kiểm thử không có token hoặc secret
      const jsonString = JSON.stringify(result);
      expect(jsonString).not.toContain("token");
      expect(jsonString).not.toContain("secret");
      expect(jsonString).not.toContain("password");
      expect(jsonString).not.toContain("private_key");
    });

    it("returns safe defaults when localStorage is empty (empty state)", () => {
      vi.mocked(getUserData).mockReturnValue(null as any);
      vi.mocked(isDemoMode).mockReturnValue(true);

      const result = buildAssistantContext();

      expect(result.goals.length).toBe(0);
      expect(result.todayTasks.length).toBe(0);
      expect(result.authSyncMode?.authState).toBe("anonymous");
      expect(result.authSyncMode?.syncState).toBe("disabled");
    });
  });
});
