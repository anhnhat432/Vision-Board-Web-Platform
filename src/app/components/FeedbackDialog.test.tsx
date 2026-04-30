import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { submitDemoFeedback } = vi.hoisted(() => ({
  submitDemoFeedback: vi.fn(),
}));

vi.mock("../utils/demo-feedback", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/demo-feedback")>();
  return {
    ...original,
    submitDemoFeedback,
  };
});

import { FeedbackDialog } from "./FeedbackDialog";

describe("FeedbackDialog", () => {
  beforeEach(() => {
    submitDemoFeedback.mockReset();
    submitDemoFeedback.mockReturnValue({
      record: {
        id: "feedback_1",
        createdAt: "2026-04-30T00:00:00.000Z",
        source: "dashboard",
        context: "dashboard",
        rating: 4,
        feedbackCategory: "today_tasks",
        confusingText: "Không rõ task quan trọng nhất.",
        nextHelpText: "",
        confusingTextLength: 29,
        nextHelpTextLength: 0,
      },
      savedLocally: true,
      trackedSafely: true,
    });
  });

  it("submits signed-out demo feedback without requiring account info", async () => {
    render(<FeedbackDialog source="dashboard" context="dashboard" />);

    fireEvent.click(screen.getByRole("button", { name: "Góp ý demo" }));

    expect(screen.getByText("Góp ý nhanh cho demo")).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi góp ý" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "4 điểm" }));
    fireEvent.click(screen.getByRole("button", { name: "Today tasks" }));
    fireEvent.change(screen.getByLabelText("Điều gì khó hiểu nhất?"), {
      target: { value: "Không rõ task quan trọng nhất." },
    });
    fireEvent.change(screen.getByLabelText(/Bạn muốn app giúp gì tiếp theo/), {
      target: { value: "Chỉ rõ bước tiếp theo." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));

    expect(submitDemoFeedback).toHaveBeenCalledWith({
      source: "dashboard",
      context: "dashboard",
      rating: 4,
      feedbackCategory: "today_tasks",
      confusingText: "Không rõ task quan trọng nhất.",
      nextHelpText: "Chỉ rõ bước tiếp theo.",
    });
    expect(screen.getByText("Cảm ơn bạn. Feedback đã được ghi nhận cho bản demo local-first.")).toBeInTheDocument();
  });
});
