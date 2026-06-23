import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAppRoute, resetTestStorage, updateUserData } from "../../test/app-flow-helpers";
import { APP_STORAGE_KEYS, LIFE_AREAS } from "../utils/storage";

async function findLifeInsightPrimaryCta() {
  const buttons = await screen.findAllByRole("button", { name: /Tiếp → Viết mục tiêu/i });
  const [primaryCta] = buttons;
  if (!primaryCta) {
    throw new Error("Missing LifeInsight primary CTA");
  }

  return primaryCta;
}

describe("LifeInsight draft switch dialog", () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it("cancels changing focus without touching the saved SMART goal draft", async () => {
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

    const savedDraft = JSON.stringify({
      focusArea: "Career",
      specific: {
        goal_statement: "Hoàn thành draft mục tiêu sự nghiệp trước khi đổi mảng đời.",
      },
    });
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, savedDraft);

    const { router } = renderAppRoute("/life-insight");
    const user = userEvent.setup();

    await user.click(await findLifeInsightPrimaryCta());
    expect(await screen.findByText("Bạn có bản nháp mục tiêu chưa lưu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Huỷ" }));

    await waitFor(() => {
      expect(screen.queryByText("Bạn có bản nháp mục tiêu chưa lưu")).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/life-insight");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).toBe(savedDraft);
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Career");
  });
});
