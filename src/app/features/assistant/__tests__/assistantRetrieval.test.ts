import { beforeEach, describe, expect, it, vi } from "vitest";
import * as storage from "@/app/utils/storage";
import type { Goal, Reflection, UserData } from "@/app/utils/storage-types";
import type { AssistantMemory } from "../assistantMemory";
import * as assistantMemoryModule from "../assistantMemory";
import { retrieveAssistantKnowledge } from "../assistantRetrieval";

vi.mock("@/app/utils/storage", () => ({
  getUserData: vi.fn(),
}));

vi.mock("../assistantMemory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../assistantMemory")>();
  return {
    ...actual,
    getAssistantMemory: vi.fn(),
  };
});

const mockEmptyMemory: AssistantMemory = {
  version: 1,
  updatedAt: "2026-06-04T00:00:00.000Z",
  userPreferences: [],
  recurringObstacles: [],
  successfulPatterns: [],
  rejectedPatterns: [],
  recentCorrections: [],
  taskBehaviorSignals: {
    oftenMissedTaskTitles: [],
  },
};

function createMockUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    storageVersion: 1,
    userId: "test_user",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      allowLocalAnalytics: false,
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      keepLocalOutbox: true,
      preferredReminderHour: 8,
    },
    onboardingCompleted: true,
    ...overrides,
  };
}

function createMockGoal(overrides: Partial<Goal>): Goal {
  return {
    id: "goal_1",
    title: "Goal",
    category: "career",
    description: "",
    deadline: "",
    tasks: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function createMockReflection(overrides: Partial<Reflection>): Reflection {
  return {
    id: "reflection_1",
    title: "Nhin lai",
    content: "",
    date: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Assistant Retrieval Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(assistantMemoryModule.getAssistantMemory).mockReturnValue(mockEmptyMemory);
  });

  it("handles null, empty, or broken user data gracefully", () => {
    vi.mocked(storage.getUserData).mockReturnValue(null as unknown as UserData);
    expect(retrieveAssistantKnowledge("TOEIC")).toEqual([]);

    vi.mocked(storage.getUserData).mockReturnValue(createMockUserData());
    expect(retrieveAssistantKnowledge("TOEIC")).toEqual([]);

    vi.mocked(storage.getUserData).mockImplementation(() => {
      throw new Error("broken storage");
    });
    expect(retrieveAssistantKnowledge("TOEIC")).toEqual([]);
  });

  it("continues when assistant memory is malformed", () => {
    vi.mocked(storage.getUserData).mockReturnValue(
      createMockUserData({
        reflections: [createMockReflection({ content: "TOEIC dang bi cham tien do" })],
      }),
    );
    vi.mocked(assistantMemoryModule.getAssistantMemory).mockImplementation(() => {
      throw new Error("broken memory");
    });

    const results = retrieveAssistantKnowledge("TOEIC");
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("reflection");
  });

  it("retrieves matching goals, reflections, tasks, and reviews", () => {
    const toeicGoal = createMockGoal({
      id: "g1",
      title: "Hoc thi TOEIC 750",
      category: "career",
      tasks: [{ id: "goal_task_1", title: "Practice", completed: false }],
      twelveWeekSystem: {
        startDate: "2026-06-01",
        week12Outcome: "Dat TOEIC 750",
        lagMetric: { name: "Diem test", unit: "score", target: "750", currentValue: "500" },
        weeklyReviews: [
          {
            weekNumber: 1,
            mainObstacle: "Thieu tu vung tieng Anh",
            nextWeekPriority: "Hoc 50 tu moi",
            workloadDecision: "keep same",
            lastReviewAt: "2026-06-02T00:00:00.000Z",
            reviewCompleted: true,
            leadCompletionPercent: 0,
            lagProgressValue: "",
            biggestOutputThisWeek: "",
            progressScore: 0,
            disciplineScore: 0,
            focusScore: 0,
            improvementScore: 0,
            outputQualityScore: 0,
          },
        ],
        taskInstances: [
          {
            id: "t1",
            title: "Lam test TOEIC Part 5",
            weekNumber: 1,
            scheduledDate: "2026-06-02",
            completed: false,
            leadIndicatorName: "Practice",
            isCore: true,
          },
        ],
      } as Goal["twelveWeekSystem"],
    });

    vi.mocked(storage.getUserData).mockReturnValue(
      createMockUserData({
        goals: [toeicGoal],
        reflections: [
          createMockReflection({
            title: "Nhin lai tuan qua",
            content: "Toi thay ky nang nghe tieng Anh con yeu",
            date: "2026-06-02T00:00:00.000Z",
            mood: "tot",
          }),
        ],
      }),
    );

    const resultsToeic = retrieveAssistantKnowledge("TOEIC");
    expect(resultsToeic.length).toBeGreaterThan(0);
    expect(resultsToeic[0].title).toContain("TOEIC");

    const resultsEnglish = retrieveAssistantKnowledge("tieng Anh");
    expect(resultsEnglish.length).toBeGreaterThan(0);
    expect(resultsEnglish.some((result) => result.source === "weekly_review")).toBe(true);
    expect(resultsEnglish.some((result) => result.source === "reflection")).toBe(true);
  });

  it("applies time decay score correctly and prioritizes recent items", () => {
    vi.mocked(storage.getUserData).mockReturnValue(
      createMockUserData({
        reflections: [
          createMockReflection({
            id: "old",
            title: "Nhin lai cu",
            content: "Hoc ngoai ngu rat vui",
            date: "2026-01-01T00:00:00.000Z",
          }),
          createMockReflection({
            id: "new",
            title: "Nhin lai moi",
            content: "Hoc ngoai ngu rat vui",
            date: "2026-06-03T00:00:00.000Z",
          }),
        ],
      }),
    );

    const results = retrieveAssistantKnowledge("ngoai ngu", {
      referenceDate: new Date("2026-06-04T00:00:00.000Z"),
    });

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Nhin lai moi");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("respects the limit option", () => {
    vi.mocked(storage.getUserData).mockReturnValue(
      createMockUserData({
        reflections: [
          createMockReflection({ id: "1", title: "Match 1", content: "Tu khoa test", date: "2026-06-04" }),
          createMockReflection({ id: "2", title: "Match 2", content: "Tu khoa test", date: "2026-06-04" }),
          createMockReflection({ id: "3", title: "Match 3", content: "Tu khoa test", date: "2026-06-04" }),
        ],
      }),
    );

    expect(retrieveAssistantKnowledge("test", { limit: 2 })).toHaveLength(2);
    expect(retrieveAssistantKnowledge("test", { limit: -1 })).toHaveLength(1);
  });

  it("redacts sensitive data in title and snippet", () => {
    vi.mocked(storage.getUserData).mockReturnValue(
      createMockUserData({
        reflections: [
          createMockReflection({
            title: "Thiet lap api-key",
            content: "API key cua toi la api_key: AIzaSyD-1234567890-abcdefgh va mat khau la mySecretPassword123",
            date: "2026-06-04T00:00:00.000Z",
          }),
        ],
      }),
    );

    const results = retrieveAssistantKnowledge("api");
    expect(results).toHaveLength(1);
    expect(results[0].title).not.toContain("api-key");
    expect(results[0].title).toContain("[REDACTED]");
    expect(results[0].snippet).toContain("[REDACTED]");
    expect(results[0].snippet).not.toContain("AIzaSyD-1234567890-abcdefgh");
    expect(results[0].snippet).not.toContain("mySecretPassword123");
  });
});
