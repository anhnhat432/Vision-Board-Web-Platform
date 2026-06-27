import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MamCompanion } from "../MamCompanion";
import { PET_EVENT_NAME } from "../petEvents";
import { PET_PREFERENCES_STORAGE_KEY } from "../petSettings";

describe("MamCompanion", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the static fallback mascot", () => {
    render(<MamCompanion />);

    expect(screen.getByTestId("mam-companion")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /mầm/i })).toBeInTheDocument();
  });

  it("keeps Mầm visible when animation is disabled", () => {
    window.localStorage.setItem(PET_PREFERENCES_STORAGE_KEY, JSON.stringify({ animationEnabled: false }));

    render(<MamCompanion initialEvent="taskCompleted" />);

    const companion = screen.getByTestId("mam-companion");
    expect(companion).toHaveAttribute("data-animation-enabled", "false");
    expect(screen.getByRole("img", { name: /mầm/i })).toBeInTheDocument();
  });

  it("shows a short bubble for important pet events", () => {
    render(<MamCompanion />);

    act(() => {
      window.dispatchEvent(new CustomEvent(PET_EVENT_NAME, { detail: { event: "taskCompleted" } }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Xong một bước rồi. Mình giữ nhịp nhé.");
  });
});
