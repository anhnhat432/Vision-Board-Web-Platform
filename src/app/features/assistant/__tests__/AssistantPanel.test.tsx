import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanel } from "../AssistantPanel";
import * as assistantApi from "../assistantApi";
import { resetAssistantSession } from "../assistantEngine";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isRealMode: vi.fn(() => true),
  shouldShowAssistantDebugUi: vi.fn(() => false),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    isRealMode: appModeMock.isRealMode,
    shouldShowAssistantDebugUi: appModeMock.shouldShowAssistantDebugUi,
  };
});

vi.mock("../buildAssistantContext", () => ({
  buildAssistantContext: vi.fn(() => ({
    currentWeek: 5,
    weeksTotal: 12,
    goals: [{ id: "g1", title: "Học React nâng cao", progress: 60 }],
    todayTasks: [{ id: "t1", title: "Đọc chapter", done: false }],
    lastReflectionDate: "2025-01-10",
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
  })),
}));

function setAuthContext(userId: string | null = null) {
  authContextMock.useAuthContext.mockReturnValue({
    user: userId ? { uid: userId } : null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  });
}

describe("AssistantPanel", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorage.clear();
    // Pre-set onboarded flag for anonymous user to skip welcome message
    localStorage.setItem("assistant.onboarded:anon", "1");
    setAuthContext();
    appModeMock.isRealMode.mockReturnValue(true);
    appModeMock.shouldShowAssistantDebugUi.mockReturnValue(false);
    resetAssistantSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders suggestions when open", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByRole("button", { name: "Hôm nay tôi nên làm gì?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tóm tắt tuần này" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nhập tin nhắn...")).toBeInTheDocument();
  });

  it("hides the assistant observability debug entry when app-mode disallows it", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.queryByTitle("Quan sát chất lượng AI")).not.toBeInTheDocument();
  });

  it("shows the assistant observability debug entry only when app-mode allows it", () => {
    appModeMock.shouldShowAssistantDebugUi.mockReturnValue(true);

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByTitle("Quan sát chất lượng AI")).toBeInTheDocument();
  });

  it("focuses the textarea on mount", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText("Nhập tin nhắn...")).toHaveFocus();
  });

  it("sends a suggestion and shows the assistant response", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Hôm nay tôi nên làm gì?" }));

    expect(await screen.findByText("Hôm nay tôi nên làm gì?")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay|Bạn chưa có task/),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("captures assistant feedback as a local golden example", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} route="/smart-goal-setup" />);

    await userEvent.type(
      screen.getByPlaceholderText(/Nhập tin nhắn/),
      "tôi muốn học TOEIC thì phần này nên điền như thế nào{enter}",
    );

    const thumbsUpButton = await screen.findByRole("button", { name: /Phản hồi tốt/ }, { timeout: 3000 });

    await userEvent.click(thumbsUpButton);

    const stored = JSON.parse(localStorage.getItem("assistant.golden_examples") ?? "[]") as Array<{
      route: string;
      rating: string;
      userMessage: string;
      assistantMessage: string;
      context: { pageContext: { currentStep: string } };
    }>;

    expect(stored).toHaveLength(1);
    expect(stored[0].route).toBe("/smart-goal-setup");
    expect(stored[0].rating).toBe("helpful");
    expect(stored[0].userMessage).toContain("TOEIC");
    expect(stored[0].assistantMessage.length).toBeGreaterThan(0);
    expect(stored[0].context.pageContext.currentStep).toBe("smart_goal_setup");
  });

  it("sends message on Enter", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "abc{enter}");

    expect(await screen.findByText("abc")).toBeInTheDocument();
  });

  it("does not send on Shift+Enter", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const textarea = screen.getByPlaceholderText("Nhập tin nhắn...");
    await userEvent.type(textarea, "abc{shift>}{enter}{/shift}");

    expect(textarea).toHaveValue("abc\n");
  });

  it("calls onClose on Escape", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.keyboard("{Escape}");

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows a loading indicator while waiting for the response", async () => {
    let resolveStream: () => void = () => {};
    const streamPromise = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });

    const streamSpy = vi.spyOn(assistantApi, "sendAssistantMessageStream").mockImplementation((_request, onDelta) => {
      onDelta("chế độ demo");
      return streamPromise;
    });

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "test{enter}");

    expect(screen.getByLabelText("Trợ lý đang trả lời")).toBeInTheDocument();

    resolveStream();

    expect(await screen.findByText(/chế độ demo/)).toBeInTheDocument();
    streamSpy.mockRestore();
  });

  it("shows stop button while typing and calls stopGeneration on click", async () => {
    let aborted = false;

    vi.spyOn(assistantApi, "sendAssistantMessageStream").mockImplementation((_request, onDelta, signal) => {
      onDelta("partial");

      return new Promise<void>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            aborted = true;
            const error = new Error("Aborted") as Error & { errorCode?: string };
            error.errorCode = "ABORT_ERROR";
            reject(error);
          },
          { once: true },
        );
      });
    });

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập tin nhắn|Đợi trợ lý/), "test{enter}");

    const stopBtn = await screen.findByRole("button", { name: "Dừng" });
    expect(stopBtn).toBeInTheDocument();

    await userEvent.click(stopBtn);

    expect(aborted).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Dừng" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Gửi" })).toBeInTheDocument();
  });

  it("persists messages to localStorage and reloads on remount", async () => {
    const { unmount } = render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập tin nhắn/), "test{enter}");
    await waitFor(
      () => {
        expect(screen.getByText(/Việc nên làm ngay|chế độ demo|Mình/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {
      expect(localStorage.getItem("assistant.chat.history:anon")).not.toBeNull();
    });

    unmount();
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("does not load history from another user", () => {
    localStorage.setItem(
      "assistant.chat.history:alice",
      JSON.stringify({
        userId: "alice",
        savedAt: Date.now(),
        messages: [{ id: "1", role: "user", content: "secret", createdAt: Date.now() }],
      }),
    );
    setAuthContext("bob");

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("clears messages when user switches", async () => {
    setAuthContext("alice");
    const { rerender } = render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập tin nhắn/), "secret{enter}");
    expect(await screen.findByText("secret")).toBeInTheDocument();

    setAuthContext("bob");
    rerender(<AssistantPanel open={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.queryByText("secret")).not.toBeInTheDocument();
    });
  });

  it("uses 'anon' bucket for unauthenticated users", async () => {
    setAuthContext(null);

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập tin nhắn/), "anonymous{enter}");
    await waitFor(
      () => {
        expect(localStorage.getItem("assistant.chat.history:anon")).not.toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it("clears history when user confirms", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    localStorage.setItem(
      "assistant.chat.history:anon",
      JSON.stringify({
        userId: null,
        savedAt: Date.now(),
        messages: [{ id: "1", role: "user", content: "hello", createdAt: Date.now() }],
      }),
    );

    render(<AssistantPanel open={true} onClose={mockOnClose} />);
    expect(screen.getByText("hello")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Xóa lịch sử chat" }));

    const confirmBtn = screen.getByRole("button", { name: "Xóa lịch sử" });
    await user.click(confirmBtn);

    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(localStorage.getItem("assistant.chat.history:anon")).toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("has correct ARIA attributes", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog", { name: "Trợ lý AI" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows feedback buttons on complete assistant message and saves to localStorage", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "test feedback{enter}");

    await waitFor(
      () => {
        expect(screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay|chế độ demo/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const thumbsUpButton = await screen.findByRole("button", { name: "Phản hồi tốt" });
    expect(thumbsUpButton).toBeInTheDocument();

    await userEvent.click(thumbsUpButton);

    expect(thumbsUpButton).toHaveClass("bg-green-100");
    expect(thumbsUpButton).toHaveClass("text-green-700");

    await waitFor(() => {
      const feedbackEntries = JSON.parse(localStorage.getItem("assistant.feedback:anon") ?? "[]");
      expect(Array.isArray(feedbackEntries)).toBe(true);
      expect(feedbackEntries.length).toBeGreaterThan(0);
      expect(feedbackEntries[feedbackEntries.length - 1].rating).toBe("up");
    });

    const feedbackMap = JSON.parse(localStorage.getItem("assistant.feedback.map:anon") ?? "{}");
    const assistantMessageId = Object.keys(feedbackMap).find((key) => feedbackMap[key] === "up");
    expect(assistantMessageId).toBeDefined();
  });

  it("clears history when user confirms (duplicate test)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    localStorage.setItem(
      "assistant.chat.history:anon",
      JSON.stringify({
        userId: null,
        savedAt: Date.now(),
        messages: [{ id: "1", role: "user", content: "hello", createdAt: Date.now() }],
      }),
    );

    render(<AssistantPanel open={true} onClose={mockOnClose} />);
    expect(screen.getByText("hello")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Xóa lịch sử chat" }));

    const confirmBtn = screen.getByRole("button", { name: "Xóa lịch sử" });
    await user.click(confirmBtn);

    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(localStorage.getItem("assistant.chat.history:anon")).toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("has correct ARIA attributes", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog", { name: "Trợ lý AI" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows feedback buttons on complete assistant message and saves to localStorage", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "test feedback{enter}");

    await waitFor(
      () => {
        expect(screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay|chế độ demo/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const thumbsUpButton = await screen.findByRole("button", { name: "Phản hồi tốt" });
    expect(thumbsUpButton).toBeInTheDocument();

    await userEvent.click(thumbsUpButton);

    expect(thumbsUpButton).toHaveClass("bg-green-100");
    expect(thumbsUpButton).toHaveClass("text-green-700");

    await waitFor(() => {
      const feedbackEntries = JSON.parse(localStorage.getItem("assistant.feedback:anon") ?? "[]");
      expect(Array.isArray(feedbackEntries)).toBe(true);
      expect(feedbackEntries.length).toBeGreaterThan(0);
      expect(feedbackEntries[feedbackEntries.length - 1].rating).toBe("up");
    });

    const feedbackMap = JSON.parse(localStorage.getItem("assistant.feedback.map:anon") ?? "{}");
    const assistantMessageId = Object.keys(feedbackMap).find((key) => feedbackMap[key] === "up");
    expect(assistantMessageId).toBeDefined();
  });

  it("sends conversation history with subsequent messages", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    // First message
    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "Hôm nay tôi nên làm gì?{enter}");

    expect(await screen.findByText("Hôm nay tôi nên làm gì?")).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Second message - history should be passed
    await userEvent.type(
      screen.getByPlaceholderText("Nhập tin nhắn..."),
      "Thế thì tôi nên bắt đầu việc nào trước?{enter}",
    );

    expect(await screen.findByText("Thế thì tôi nên bắt đầu việc nào trước?")).toBeInTheDocument();
    // Assistant should respond with context from previous message
    await waitFor(
      () => {
        const elements = screen.getAllByText(/Việc nên làm ngay|task|Ưu tiên/);
        expect(elements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });

  it("executes /clear command", async () => {
    // Add some messages first
    localStorage.setItem(
      "assistant.chat.history:anon",
      JSON.stringify({
        userId: null,
        savedAt: Date.now(),
        messages: [{ id: "1", role: "user", content: "hello", createdAt: Date.now() }],
      }),
    );

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByText("hello")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("Nhập tin nhắn...");
    await userEvent.type(textarea, "/clear");
    await userEvent.keyboard("{Enter}");

    // Messages should be cleared
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(localStorage.getItem("assistant.chat.history:anon")).toBeNull();
  });

  it("clears input on Escape when dropdown is open", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const textarea = screen.getByPlaceholderText("Nhập tin nhắn...");
    await userEvent.type(textarea, "/");

    // Dropdown should be visible
    expect(await screen.findByText("Xem việc cần làm hôm nay")).toBeInTheDocument();

    // Press Escape
    await userEvent.keyboard("{Escape}");

    // Input should be cleared
    expect(textarea).toHaveValue("");
  });

  it("supports rejecting an action proposal", async () => {
    vi.spyOn(assistantApi, "sendAssistantMessageStream").mockImplementation((_request, onDelta) => {
      onDelta(`Hãy xem đề xuất sau:

\`\`\`action
{
  "type": "create_goal",
  "payload": {
    "title": "Học tiếng Anh",
    "category": "career"
  },
  "label": "Tạo mục tiêu: Học tiếng Anh"
}
\`\`\``);
      return Promise.resolve();
    });

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "tạo mục tiêu học tiếng anh{enter}");

    // Đợi proposal xuất hiện
    const goalProposalLabels = await screen.findAllByText("Tạo mục tiêu: Học tiếng Anh");
    expect(goalProposalLabels.length).toBeGreaterThan(0);

    // Sẽ thấy nút hủy và xác nhận proposal
    const rejectBtn = screen.getByRole("button", { name: "Hủy bỏ" });
    const approveBtn = screen.getByRole("button", { name: "Xác nhận thực hiện" });

    expect(rejectBtn).toBeInTheDocument();
    expect(approveBtn).toBeInTheDocument();

    // Click hủy
    await userEvent.click(rejectBtn);

    // Workflow được hủy qua pendingWorkflow và các nút biến mất
    expect(await screen.findByText("Đã hủy bỏ kế hoạch/hành động đang chuẩn bị.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hủy bỏ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xác nhận thực hiện" })).not.toBeInTheDocument();
  });

  it("supports executing a twelve-week plan draft proposal and displaying preview", async () => {
    vi.spyOn(assistantApi, "sendAssistantMessageStream").mockImplementation((_request, onDelta) => {
      onDelta(`Hãy xem đề xuất sau:

\`\`\`action
{
  "type": "create_twelve_week_plan_draft",
  "payload": {
    "week12Outcome": "Giảm 3kg mỡ thừa",
    "lagMetricName": "Cân nặng",
    "lagMetricTarget": "70",
    "lagMetricUnit": "kg",
    "leadIndicators": [
      {"name": "Chạy bộ", "target": "30", "unit": "phút"}
    ]
  },
  "label": "Tạo bản nháp kế hoạch 12 tuần"
}
\`\`\``);
      return Promise.resolve();
    });

    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "lập kế hoạch 12 tuần{enter}");

    // Đợi proposal xuất hiện
    const planProposalLabels = await screen.findAllByText("Tạo bản nháp kế hoạch 12 tuần");
    expect(planProposalLabels.length).toBeGreaterThan(0);

    // Kiểm tra hiển thị preview
    expect(screen.getByText("Giảm 3kg mỡ thừa")).toBeInTheDocument();
    expect(screen.getByText(/Chạy bộ/)).toBeInTheDocument();

    const approveBtn = screen.getByRole("button", { name: "Xác nhận thực hiện" });
    await userEvent.click(approveBtn);

    expect(await screen.findByText(/Đã thực hiện thành công các hành động/)).toBeInTheDocument();
    expect(screen.getByText(/Tạo bản nháp kế hoạch 12 tuần/)).toBeInTheDocument();
  });
});
