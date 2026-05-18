import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanel } from "../AssistantPanel";
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
  })),
}));

describe("AssistantPanel", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    resetAssistantSession();
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
      expect(screen.getByText(/Hôm nay bạn có|Danh sách việc hôm nay|Bạn chưa có task/)).toBeInTheDocument();
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

  it("has correct ARIA attributes", () => {
    render(<AssistantPanel open={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog", { name: "Trợ lý AI" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
