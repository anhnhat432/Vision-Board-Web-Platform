import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AssistantContext } from "../buildAssistantContext";

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
  getApiBaseUrl: vi.fn(() => "https://api.test"),
  isApiBaseUrlConfigured: vi.fn(() => true),
  isDemoMode: vi.fn(() => false),
  post: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: mocks.isDemoMode,
}));

vi.mock("@/lib/api/apiClient", () => ({
  getApiBaseUrl: mocks.getApiBaseUrl,
  isApiBaseUrlConfigured: mocks.isApiBaseUrlConfigured,
  post: mocks.post,
}));

vi.mock("@/lib/auth/authedFetch", () => {
  class AuthError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }

  return {
    AuthError,
    authedFetch: mocks.authedFetch,
  };
});

vi.mock("../assistantEngine", () => ({
  mockProvider: {
    send: vi.fn(),
  },
}));

const context: AssistantContext & { route: string } = {
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
  route: "/12-week-system",
};

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

describe("assistantApi sendAssistantMessageStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiBaseUrl.mockReturnValue("https://api.test");
    mocks.isApiBaseUrlConfigured.mockReturnValue(true);
    mocks.isDemoMode.mockReturnValue(false);
  });

  it("fails fast without calling localhost when real-mode API base URL is not configured", async () => {
    const { sendAssistantMessage, sendAssistantMessageStream } = await import("../assistantApi");
    mocks.isApiBaseUrlConfigured.mockReturnValue(false);
    const deltas: string[] = [];

    await expect(
      sendAssistantMessageStream({ message: "ban la ai", context }, (delta) => deltas.push(delta)),
    ).rejects.toMatchObject({
      errorCode: "ASSISTANT_BACKEND_NOT_CONFIGURED",
      message: expect.stringContaining("chưa được cấu hình"),
    });

    await expect(sendAssistantMessage({ message: "ban la ai", context })).rejects.toMatchObject({
      errorCode: "ASSISTANT_BACKEND_NOT_CONFIGURED",
      message: expect.stringContaining("chưa được cấu hình"),
    });
    expect(deltas).toEqual([]);
    expect(mocks.getApiBaseUrl).not.toHaveBeenCalled();
    expect(mocks.authedFetch).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("streams structured AI deltas from the Groq SSE endpoint", async () => {
    const { sendAssistantMessageStream } = await import("../assistantApi");
    mocks.authedFetch.mockResolvedValueOnce(
      sseResponse([
        'data: {"type":"delta","text":"Xin "}\n\n',
        'data: {"type":"delta","text":"chào"}\n\n',
        'data: {"type":"done"}\n\n',
      ]),
    );
    const deltas: string[] = [];

    await sendAssistantMessageStream({ message: "ban la ai", context }, (delta) => deltas.push(delta));

    expect(deltas).toEqual(["Xin ", "chào"]);
    expect(mocks.authedFetch).toHaveBeenCalledWith(
      "https://api.test/ai/assistant/stream",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const init = mocks.authedFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      message: "ban la ai",
      mode: "real",
      context: { route: "/12-week-system" },
    });
  });

  it("falls back to the JSON structured AI endpoint when stream route is unavailable", async () => {
    const { sendAssistantMessageStream } = await import("../assistantApi");
    mocks.authedFetch.mockResolvedValueOnce(new Response("Not found", { status: 404 })).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            assistantText: "Mình tạo bản nháp trước nhé.",
            proposedActions: [
              {
                id: "act_1",
                type: "create_goal",
                payload: { title: "Học React", category: "career" },
                label: "Tạo mục tiêu: Học React",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const deltas: string[] = [];

    await sendAssistantMessageStream({ message: "tao muc tieu hoc react", context }, (delta) => deltas.push(delta));

    expect(mocks.authedFetch).toHaveBeenNthCalledWith(
      2,
      "https://api.test/ai/assistant",
      expect.objectContaining({ method: "POST" }),
    );
    expect(deltas.join("")).toContain("Mình tạo bản nháp trước nhé.");
    expect(deltas.join("")).toContain("```action");
  });
});
