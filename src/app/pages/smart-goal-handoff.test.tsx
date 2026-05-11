import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { SMARTGoalSetup } from "./SMARTGoalSetup";
import { APP_STORAGE_KEYS, getUserData, LIFE_AREAS, saveUserData } from "../utils/storage";

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

  it("surfaces the Life Insight decision before the SMART form starts", async () => {
    render(
      <MemoryRouter>
        <SMARTGoalSetup />
      </MemoryRouter>,
    );

    const handoffCard = await screen.findByTestId("smart-goal-handoff-card");
    expect(handoffCard).toHaveTextContent("Góc nhìn cuộc sống đã chọn");
    expect(handoffCard).toHaveTextContent("Sức khỏe");
    expect(handoffCard).toHaveTextContent("Số buổi vận động mỗi tuần");
    expect(handoffCard).toHaveTextContent("12 tuần");
    expect(await screen.findByText("Bước 1/5")).toBeInTheDocument();
    expect(screen.queryByText(/Bu\?c/)).not.toBeInTheDocument();
  });
});
