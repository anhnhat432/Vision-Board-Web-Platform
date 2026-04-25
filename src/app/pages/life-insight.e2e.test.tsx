import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAppRoute, resetTestStorage, updateUserData } from "../../test/app-flow-helpers";

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
});

