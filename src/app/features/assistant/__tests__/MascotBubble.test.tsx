import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MascotBubble } from "../MascotBubble";

const mascotPosition = { x: 120, y: 180 };

describe("MascotBubble", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 800 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active text with visible styles", () => {
    render(<MascotBubble text="Cần giúp gì không?" active={true} mascotPosition={mascotPosition} />);

    const bubble = screen.getByText("Cần giúp gì không?").closest("div");
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveClass("opacity-100");
  });

  it("renders inactive bubble as hidden and non-interactive", () => {
    render(<MascotBubble text="Cần giúp gì không?" active={false} mascotPosition={mascotPosition} />);

    const bubble = screen.getByText("Cần giúp gì không?").closest("div");
    expect(bubble).toHaveClass("opacity-0");
    expect(bubble).toHaveClass("pointer-events-none");
    expect(bubble).toHaveAttribute("aria-hidden", "true");
  });

  it("positions bubble to the right when mascot is on the left", () => {
    render(<MascotBubble text="Cần giúp gì không?" active={true} mascotPosition={{ x: 120, y: 180 }} />);

    const bubble = screen.getByText("Cần giúp gì không?").closest("div");
    expect(bubble).toHaveStyle({ left: "192px", top: "188px" });
    expect(bubble?.style.right).toBe("");
  });

  it("positions bubble to the left when mascot is on the right", () => {
    render(<MascotBubble text="Cần giúp gì không?" active={true} mascotPosition={{ x: 700, y: 180 }} />);

    const bubble = screen.getByText("Cần giúp gì không?").closest("div");
    expect(bubble).toHaveStyle({ right: "108px", top: "188px" });
  });

  it("dismisses on click", () => {
    const onDismiss = vi.fn();

    render(
      <MascotBubble text="Cần giúp gì không?" active={true} mascotPosition={mascotPosition} onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByText("Cần giúp gì không?"));

    expect(onDismiss).toHaveBeenCalled();
  });
});
