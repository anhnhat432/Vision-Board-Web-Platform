import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAppRoute, resetTestStorage, updateUserData } from "../../test/app-flow-helpers";
import { APP_STORAGE_KEYS, LIFE_AREAS } from "../utils/storage";

const INTEGRATION_TEST_TIMEOUT_MS = 10_000;

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
    expect(screen.getByRole("button", { name: "Đi tới Bắt đầu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở Cân bằng cuộc sống" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đi tới Bắt đầu" }));
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

    const decisionCard = await screen.findByTestId("life-insight-decision-card");
    expect(decisionCard).toHaveTextContent("Quyết định tiếp theo");
    expect(decisionCard).toHaveTextContent("Sức khỏe");
    expect(decisionCard).toHaveTextContent("Duy trì 3 buổi vận động mỗi tuần");
    expect(decisionCard).toHaveTextContent("Số buổi vận động mỗi tuần");

    expect(screen.getByTestId("life-insight-primary-cta")).toHaveTextContent("Tạo mục tiêu SMART từ quyết định này");
    await user.click(screen.getByTestId("life-insight-primary-cta"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/smart-goal-setup");
    });
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Health");
  });

  it("warns before clearing a saved SMART goal draft when the focus area changes", async () => {
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
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: {
          goal_statement: "Hoàn thành draft mục tiêu sự nghiệp trước khi đổi mảng đời.",
        },
      }),
    );

    const { router } = renderAppRoute("/life-insight");
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("life-insight-primary-cta"));
    expect(await screen.findByText("Bạn có bản nháp mục tiêu chưa lưu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Giữ bản nháp" }));
    await waitFor(() => {
      expect(screen.queryByText("Bạn có bản nháp mục tiêu chưa lưu")).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/life-insight");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).not.toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Career");

    await user.click(screen.getByTestId("life-insight-primary-cta"));
    await user.click(await screen.findByRole("button", { name: "Xoá bản nháp và đổi lĩnh vực" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/smart-goal-setup");
    });
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Health");
  }, INTEGRATION_TEST_TIMEOUT_MS);
});
