import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAppRoute, resetTestStorage, updateUserData } from "../../test/app-flow-helpers";
import { APP_STORAGE_KEYS, LIFE_AREAS } from "../utils/storage";

describe("life insight flow", () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it("shows an actionable empty state when wheel-of-life data is missing", async () => {
    updateUserData((data) => {
      data.currentWheelOfLife = [];
      data.wheelOfLifeHistory = [];
    });

    const { router } = renderAppRoute("/life-insight");
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Chưa có dữ liệu cân bằng cuộc sống" });
    expect(screen.getByRole("button", { name: "Đi tới Onboarding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở Life Balance" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đi tới Onboarding" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
  });

  it("explains the recommended focus area and continues to SMART Goal setup", async () => {
    updateUserData((data) => {
      data.onboardingCompleted = true;
      data.currentWheelOfLife = LIFE_AREAS.map((area) => ({
        ...area,
        score: area.name === "Health" ? 4 : area.name === "Education" ? 8 : 6,
      }));
      data.wheelOfLifeHistory = [
        {
          date: "2026-04-27T00:00:00.000Z",
          areas: data.currentWheelOfLife,
        },
      ];
    });

    const { router } = renderAppRoute("/life-insight");
    const user = userEvent.setup();

    const recommendationCard = await screen.findByTestId("life-insight-recommendation-card");
    expect(recommendationCard).toHaveTextContent("Vì sao chọn trọng tâm này?");
    expect(recommendationCard).toHaveTextContent("4/10");

    await user.click(screen.getByTestId("life-insight-primary-cta"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/smart-goal-setup");
    });
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Health");
  });
});
