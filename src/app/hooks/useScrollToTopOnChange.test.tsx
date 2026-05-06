import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScrollToTopOnChange } from "./useScrollToTopOnChange";

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function ScrollHarness({ focus = true, mobileOnly = true }: { focus?: boolean; mobileOnly?: boolean }) {
  const [step, setStep] = useState("one");
  const targetRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useScrollToTopOnChange(step, {
    targetRef,
    focusRef: headingRef,
    focus,
    mobileOnly,
  });

  return (
    <div>
      <button type="button" onClick={() => setStep("two")}>
        Next
      </button>
      <div ref={targetRef} data-testid="target">
        <h2 ref={headingRef} tabIndex={-1}>
          Step {step}
        </h2>
      </div>
    </div>
  );
}

describe("useScrollToTopOnChange", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(true);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("does not scroll on initial render when skipInitial is true", () => {
    render(<ScrollHarness />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls to the target and focuses the heading when the change key updates on mobile", async () => {
    const user = userEvent.setup();
    render(<ScrollHarness />);
    vi.spyOn(screen.getByTestId("target"), "getBoundingClientRect").mockReturnValue({
      top: 200,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const focusMock = vi.spyOn(screen.getByRole("heading"), "focus").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 428, left: 0, behavior: "smooth" });
      expect(focusMock).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("does not scroll when desktop media query does not match", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ScrollHarness />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("does not focus when focus is disabled", async () => {
    const user = userEvent.setup();
    render(<ScrollHarness focus={false} />);
    const focusMock = vi.spyOn(screen.getByRole("heading"), "focus").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalled();
      expect(focusMock).not.toHaveBeenCalled();
    });
  });
});
