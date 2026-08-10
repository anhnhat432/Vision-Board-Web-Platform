import type { PersonalCoachContext } from "@shared/personalCoachSchema";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  post: apiClientMocks.post,
}));

import { requestPersonalCoachRecommendation } from "./personalCoachApi";

function makeContext(): PersonalCoachContext {
  return {
    goal: { id: "goal_1", title: "Ra mắt portfolio" },
    cycle: { currentWeek: 3, totalWeeks: 12, phase: "active" },
    today: {
      date: "2026-08-09",
      primaryTask: {
        id: "task_1",
        title: "Chốt case study",
        scheduledDate: "2026-08-09",
        isCore: true,
      },
      openTasks: [
        {
          id: "task_1",
          title: "Chốt case study",
          scheduledDate: "2026-08-09",
          isCore: true,
        },
      ],
      scheduledCount: 1,
      completedCount: 0,
      allScheduledComplete: false,
    },
    week: {
      completionToDate: 0,
      wholeWeekCompletion: 0,
      coreCompletionToDate: 0,
      overdueCount: 0,
      overdueTasks: [],
      carryOverCount: 0,
      checkInDays: 0,
      possibleCheckInDays: 1,
      reviewDueToday: false,
    },
    deterministicInsights: [],
  };
}

const validRecommendation = {
  title: "Ưu tiên hôm nay",
  recommendation: "Hãy chốt case study trước.",
  rationale: ["Theo kế hoạch hôm nay, đây là task cốt lõi."],
  primaryAction: { type: "open_task" as const, taskId: "task_1" },
};

describe("personalCoachApi", () => {
  beforeEach(() => {
    apiClientMocks.post.mockReset();
  });

  it("posts the bounded context to the dedicated endpoint with the abort signal", async () => {
    const context = makeContext();
    const controller = new AbortController();
    apiClientMocks.post.mockResolvedValue({ recommendation: validRecommendation });

    const result = await requestPersonalCoachRecommendation(context, controller.signal);

    expect(apiClientMocks.post).toHaveBeenCalledWith(
      "/ai/personal-coach",
      { context },
      { signal: controller.signal },
    );
    expect(result).toEqual(validRecommendation);
  });

  it("validates the successful response again and rejects unsafe output", async () => {
    apiClientMocks.post.mockResolvedValue({
      recommendation: {
        ...validRecommendation,
        primaryAction: { type: "complete_task", taskId: "task_1" },
      },
    });

    await expect(requestPersonalCoachRecommendation(makeContext())).rejects.toMatchObject({
      message: "Coach trả về dữ liệu không hợp lệ.",
      errorCode: "COACH_INVALID_RESPONSE",
    });
  });

  it("preserves safe API status and error codes for lifecycle mapping", async () => {
    const apiError = {
      message: "Coach đang tạm giới hạn lượt yêu cầu.",
      status: 429,
      errorCode: "COACH_RATE_LIMITED",
      rateLimited: true,
    };
    apiClientMocks.post.mockRejectedValue(apiError);

    await expect(requestPersonalCoachRecommendation(makeContext())).rejects.toBe(apiError);
  });
});
