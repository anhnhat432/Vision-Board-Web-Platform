import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { APP_STORAGE_KEYS, getUserData, saveUserData } from "../utils/storage";
import type { Goal } from "../utils/storage-types";
import { SMARTGoalSetup } from "./SMARTGoalSetup";

const now = "2026-05-15T00:00:00.000Z";

function createGoal(id: string): Goal {
  return {
    id,
    category: "Career",
    title: `Goal ${id}`,
    description: "Existing goal",
    deadline: "2026-08-01",
    tasks: [],
    createdAt: now,
  };
}

function seedFreeUserAtGoalLimit() {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  data.goals = [createGoal("1"), createGoal("2"), createGoal("3")];
  data.subscription = null;
  data.entitlements = [];
  saveUserData(data);

  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: "Tăng doanh thu tư vấn lên mức ổn định hơn trong quý này",
      measurable: "Doanh thu từ 10 lên 30 triệu VND",
      achievable: "Dành 8 giờ mỗi tuần, cần kỹ năng bán hàng, dùng danh sách khách hàng hiện có",
      relevant: "Mục tiêu này giúp tôi có nền tài chính vững hơn và tự tin hơn với nghề nghiệp.",
      timeBound: "Trong 12 tuần",
    }),
  );
}

function renderSmartSetup() {
  const router = createMemoryRouter(
    [
      { path: "/smart-goal-setup", element: <SMARTGoalSetup /> },
      { path: "/feasibility", element: <div>Feasibility</div> },
      { path: "/onboarding", element: <div>Onboarding</div> },
      { path: "/life-insight", element: <div>Life Insight</div> },
      { path: "/billing/confirm", element: <div>Billing confirm</div> },
    ],
    { initialEntries: ["/smart-goal-setup"] },
  );

  render(<RouterProvider router={router} />);
}

function getMobileActionBar() {
  const actionBar = document.querySelector("[data-smart-mobile-action-bar]");
  if (!(actionBar instanceof HTMLElement)) {
    throw new Error("Missing mobile action bar");
  }
  return actionBar;
}

function getMobileActionBarButtons() {
  return Array.from(getMobileActionBar().querySelectorAll("button"));
}

beforeEach(() => {
  localStorage.clear();
});

describe("SMARTGoalSetup free tier limit", () => {
  it("opens the Plus paywall when a free user tries to create a fourth goal", async () => {
    seedFreeUserAtGoalLimit();

    renderSmartSetup();

    await screen.findByText("Bạn muốn đạt điều gì?");
    for (let index = 0; index < 4; index += 1) {
      const buttons = getMobileActionBarButtons();
      fireEvent.click(buttons[1] as HTMLElement);
    }

    const finalButtons = getMobileActionBarButtons();
    fireEvent.click(finalButtons[2] as HTMLElement);

    expect((await screen.findAllByText("Bạn đã có 3 mục tiêu")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nâng cấp Plus để tạo thêm mục tiêu/)).toBeInTheDocument();
  });
});
