import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyUserData } from "../utils/storage-demo-data";
import { CURRENT_STORAGE_VERSION, DEFAULT_APP_PREFERENCES, MOTIVATIONAL_QUOTES } from "../utils/storage-constants";
import { NewUserGuideDialog } from "./NewUserGuide";

function createGuideData() {
  return createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
}

describe("NewUserGuideDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    setViewportWidth(1024);
  });

  it("uses the standard dialog presentation on desktop", async () => {
    render(
      <MemoryRouter>
        <NewUserGuideDialog open onOpenChange={vi.fn()} userData={createGuideData()} />
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveAttribute("data-slot", "dialog-content");
    expect(dialog).toHaveClass("sm:max-w-3xl");
    expect(screen.getByText("Cách bắt đầu nhanh")).toBeInTheDocument();
  });

  it("uses a bottom sheet presentation on mobile", async () => {
    setViewportWidth(375);

    render(
      <MemoryRouter>
        <NewUserGuideDialog open onOpenChange={vi.fn()} userData={createGuideData()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="sheet-content"]')).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
    expect(dialog).toHaveClass("rounded-t-[1.5rem]");
    expect(screen.getByRole("button", { name: "Để sau" })).toHaveClass("w-full");
  });
});
