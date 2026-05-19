import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantMascot } from "../AssistantMascot";
import type { NudgeState } from "../useProactiveNudge";

const inactiveNudge: NudgeState = { active: false, reason: null, message: "" };
const mascotPosition = { x: 120, y: 180 };
const mascotProps = {
  position: mascotPosition,
  isDragging: false,
  handlePointerDown: vi.fn(),
  wasDragged: false,
};

describe("AssistantMascot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows tooltip on keyboard focus and hides it after 2 seconds", () => {
    render(<AssistantMascot isOpen={false} onClick={vi.fn()} nudge={inactiveNudge} dismissNudge={vi.fn()} {...mascotProps} />);

    expect(screen.queryByText("Kéo để di chuyển · Click để hỏi")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole("button", { name: "Mở trợ lý AI" }));

    expect(screen.getAllByText("Kéo để di chuyển · Click để hỏi").length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText("Kéo để di chuyển · Click để hỏi")).not.toBeInTheDocument();
  });

  it("shows proactive nudge tooltip after delay and dismisses on X", () => {
    const dismissNudge = vi.fn();
    const proactiveNudge: NudgeState = {
      active: true,
      reason: "new-week",
      message: "Tuần 3 bắt đầu rồi. Muốn mình tóm tắt và chọn ưu tiên không?",
    };

    render(
      <AssistantMascot
        isOpen={false}
        onClick={vi.fn()}
        nudge={proactiveNudge}
        dismissNudge={dismissNudge}
        {...mascotProps}
      />,
    );

    expect(screen.queryByText(proactiveNudge.message)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText(proactiveNudge.message).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Ẩn gợi ý" })[0]);

    expect(dismissNudge).toHaveBeenCalled();
    expect(screen.queryAllByText(proactiveNudge.message)).toHaveLength(0);
  });

  it("renders the decorative sparkle icon inside the mascot button", () => {
    render(<AssistantMascot isOpen={false} onClick={vi.fn()} nudge={inactiveNudge} dismissNudge={vi.fn()} {...mascotProps} />);

    const button = screen.getByRole("button", { name: "Mở trợ lý AI" });
    const owlIcon = button.querySelector("svg");

    expect(owlIcon).toBeInTheDocument();
    expect(owlIcon).toHaveClass("lucide-sparkles");
  });

  it("applies twinkle animation to the sparkle icon when not open/dragging", () => {
    render(<AssistantMascot isOpen={false} onClick={vi.fn()} nudge={inactiveNudge} dismissNudge={vi.fn()} {...mascotProps} />);

    const button = screen.getByRole("button", { name: "Mở trợ lý AI" });
    const innerShell = button.querySelector(".animate-sparkle-twinkle");

    expect(innerShell).toBeInTheDocument();
  });

  it("returns null when isOpen = true, preventing animation", () => {
    const { container } = render(
      <AssistantMascot isOpen={true} onClick={vi.fn()} nudge={inactiveNudge} dismissNudge={vi.fn()} {...mascotProps} />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("button", { name: "Mở trợ lý AI" })).not.toBeInTheDocument();
  });
});
