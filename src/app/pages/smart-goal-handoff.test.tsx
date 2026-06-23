import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_STORAGE_KEYS, getUserData, LIFE_AREAS, saveUserData } from "../utils/storage";
import { SMARTGoalSetup } from "./SMARTGoalSetup";

function seedSmartGoalHandoff(focusArea = "Health") {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = LIFE_AREAS.map((area) => ({
    ...area,
    score: area.name === focusArea ? 4 : area.name === "Education" ? 8 : 6,
  }));
  data.wheelOfLifeHistory = [
    {
      date: "2026-05-09T00:00:00.000Z",
      areas: data.currentWheelOfLife,
    },
  ];
  saveUserData(data);
  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, focusArea);
}

describe("SMARTGoalSetup handoff", () => {
  beforeEach(() => {
    localStorage.clear();
    seedSmartGoalHandoff();
  });

  it("autosaves draft to localStorage when user types in goal statement", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <MemoryRouter>
        <SMARTGoalSetup />
      </MemoryRouter>,
    );

    // Wait for the Specific step to be ready.
    await screen.findByRole("heading", { name: /Bạn muốn đạt được điều gì/i });

    // Type a goal statement into the Specific step textarea
    const goalInput = await screen.findByRole("textbox");
    await user.clear(goalInput);
    await user.type(goalInput, "Chạy bộ 5km mỗi tuần trong 12 tuần tới");

    // Advance past the 600ms debounce
    vi.advanceTimersByTime(700);

    // Verify the draft was autosaved
    await waitFor(() => {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.specific.goal_statement).toBe("Chạy bộ 5km mỗi tuần trong 12 tuần tới");
    });

    vi.useRealTimers();
  });

  it("surfaces the Life Insight decision before the SMART form starts", async () => {
    render(
      <MemoryRouter>
        <SMARTGoalSetup />
      </MemoryRouter>,
    );

    const handoffCard = await screen.findByTestId("smart-goal-handoff-card");
    expect(handoffCard).toHaveTextContent("Lĩnh vực: Sức khỏe");
    expect(handoffCard).toHaveTextContent("Số buổi vận động mỗi tuần");
    expect(handoffCard).toHaveTextContent("12 tuần");
    expect(await screen.findByRole("heading", { name: /Bạn muốn đạt được điều gì/i })).toBeInTheDocument();
    expect(screen.queryByText(/Bu\?c/)).not.toBeInTheDocument();
  });
});
