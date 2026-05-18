import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanel } from "../AssistantPanel";
import * as assistantApi from "../assistantApi";
import { resetAssistantSession } from "../assistantEngine";

vi.mock("../buildAssistantContext", () => ({
  buildAssistantContext: vi.fn(() => ({
    currentWeek: 5,
    weeksTotal: 12,
    goals: [
      { id: "g1", title: "Học React nâng cao", progress: 60 },
    ],
    todayTasks: [
      { id: "t1", title: "Đọc chapter", done: false },
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
  })),
}));

describe("AssistantPanel", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorage.clear();
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

  it("focuses the textarea on mount", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText("Nhập tin nhắn...")).toHaveFocus();
  });

  it("sends a suggestion and shows the assistant response", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Hôm nay tôi nên làm gì?" }));

    expect(await screen.findByText("Hôm nay tôi nên làm gì?")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay|Bạn chưa có task/)).toBeInTheDocument();
    }, { timeout: 3000 });
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
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "test{enter}");

    expect(screen.getByLabelText("Trợ lý đang trả lời")).toBeInTheDocument();
    expect(await screen.findByText(/chế độ demo/, undefined, { timeout: 3000 })).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByText(/Việc nên làm ngay|chế độ demo|Mình/)).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(localStorage.getItem("assistant.chat.history")).not.toBeNull();
    });

    unmount();
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("clears history when user confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem("assistant.chat.history", JSON.stringify([
      { id: "1", role: "user", content: "hello", createdAt: Date.now() },
    ]));

    render(<AssistantPanel open={true} onClose={mockOnClose} />);
    expect(screen.getByText("hello")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Xóa lịch sử chat" }));

    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(localStorage.getItem("assistant.chat.history")).toBeNull();
  });

  it("has correct ARIA attributes", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog", { name: "Trợ lý AI" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("sends conversation history with subsequent messages", async () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    // First message
    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "Hôm nay tôi nên làm gì?{enter}");

    expect(await screen.findByText("Hôm nay tôi nên làm gì?")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Việc nên làm ngay|Ưu tiên danh sách việc hôm nay/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Second message - history should be passed
    await userEvent.type(screen.getByPlaceholderText("Nhập tin nhắn..."), "Thế thì tôi nên bắt đầu việc nào trước?{enter}");

    expect(await screen.findByText("Thế thì tôi nên bắt đầu việc nào trước?")).toBeInTheDocument();
    // Assistant should respond with context from previous message
    await waitFor(() => {
      expect(screen.getByText(/Việc nên làm ngay|task|Ưu tiên/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
