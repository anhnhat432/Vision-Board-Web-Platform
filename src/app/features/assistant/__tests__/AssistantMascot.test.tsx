import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantMascot } from "../AssistantMascot";

describe("AssistantMascot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows tooltip on keyboard focus and hides it after 2 seconds", () => {
    render(<AssistantMascot isOpen={false} onClick={vi.fn()} />);

    expect(screen.queryByText("Kéo để di chuyển · Click để hỏi")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole("button", { name: "Mở trợ lý AI" }));

    expect(screen.getAllByText("Kéo để di chuyển · Click để hỏi").length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText("Kéo để di chuyển · Click để hỏi")).not.toBeInTheDocument();
  });
});
