import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { renderAppRoute, resetTestStorage, updateUserData } from "../../test/app-flow-helpers";
import { APP_STORAGE_KEYS, LIFE_AREAS } from "../utils/storage";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

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

    await screen.findByRole("heading", { name: "Hoàn thành bước cân bằng trước" });
    expect(screen.getByRole("button", { name: "Bắt đầu cân bằng" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bắt đầu cân bằng" }));
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

    expect(
      await screen.findByRole("heading", { name: "Nhìn lại để bước tiếp" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Đề xuất ưu tiên: Sức khỏe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sức khỏe" })).toBeInTheDocument();
    expect(screen.getByText("Điểm hiện tại: 4/10")).toBeInTheDocument();
    expect(screen.getByText(/sức khỏe tốt hơn sẽ giúp tôi có năng lượng ổn định hơn/i)).toBeInTheDocument();

    const primaryCta = screen.getByRole("button", { name: /Tiếp → Viết mục tiêu/i });
    expect(primaryCta).toHaveTextContent("Tiếp → Viết mục tiêu");
    await user.click(primaryCta);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/smart-goal-setup");
    });
    expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Health");
  });

  it(
    "warns before clearing a saved SMART goal draft when the focus area changes",
    async () => {
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

      const primaryCta = await screen.findByRole("button", { name: /Tiếp → Viết mục tiêu/i });

      await user.click(primaryCta);
      expect(await screen.findByText("Bạn có bản nháp mục tiêu chưa lưu")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Huỷ" }));
      await waitFor(() => {
        expect(screen.queryByText("Bạn có bản nháp mục tiêu chưa lưu")).not.toBeInTheDocument();
      });
      expect(router.state.location.pathname).toBe("/life-insight");
      expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).not.toBeNull();
      expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Career");

      await user.click(primaryCta);
      await user.click(await screen.findByRole("button", { name: "Giữ bản nháp" }));
      await waitFor(() => {
        expect(screen.queryByText("Bạn có bản nháp mục tiêu chưa lưu")).not.toBeInTheDocument();
      });
      expect(router.state.location.pathname).toBe("/life-insight");
      expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).not.toBeNull();
      expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Career");

      await user.click(primaryCta);
      await user.click(await screen.findByRole("button", { name: "Xoá bản nháp và đổi lĩnh vực" }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/smart-goal-setup");
      });
      expect(localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal)).toBeNull();
      expect(localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea)).toBe("Health");
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );
});
