import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, LIFE_AREAS, saveUserData } from "../utils/storage";
import { ONBOARDING_DRAFT_STORAGE_KEY, Onboarding } from "./Onboarding";

function mockMobileViewport() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
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

describe("Onboarding autosave", () => {
  beforeEach(() => {
    localStorage.clear();
    const data = getUserData();
    data.onboardingCompleted = false;
    data.currentWheelOfLife = LIFE_AREAS.map((area) => ({ ...area, score: 0 }));
    data.wheelOfLifeHistory = [];
    saveUserData(data);
    mockMobileViewport();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves a draft 500ms after moving a slider", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));

    const firstSlider = screen.getAllByRole("slider")[0];
    firstSlider.focus();
    await user.keyboard("{ArrowRight}");

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      const saved = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
      expect(saved).toBeTruthy();
      const draft = JSON.parse(saved!);
      expect(draft.completed).toBe(false);
      expect(draft.lifeAreas[0].score).toBe(6);
      expect(draft.reviewedAreaIndices).toContain(0);
    });
  });
});
