import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, LIFE_AREAS, saveUserData } from "../utils/storage";
import { LifeBalance } from "./LifeBalance";

function renderLifeBalance() {
  const router = createMemoryRouter(
    [
      {
        path: "/life-balance",
        element: <LifeBalance />,
      },
      {
        path: "/onboarding",
        element: <div data-testid="onboarding-page">Onboarding page</div>,
      },
      {
        path: "/life-insight",
        element: <div data-testid="life-insight-page">Life Insight page</div>,
      },
    ],
    { initialEntries: ["/life-balance"] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

function seedZeroScoreWheel() {
  const data = getUserData();
  data.onboardingCompleted = false;
  data.currentWheelOfLife = LIFE_AREAS.map((area) => ({ ...area, score: 0 }));
  data.wheelOfLifeHistory = [];
  saveUserData(data);
}

function seedRealLifeBalance() {
  const scores = [7, 5, 6, 8, 4, 7, 6, 5];
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = LIFE_AREAS.map((area, index) => ({ ...area, score: scores[index] ?? 5 }));
  data.wheelOfLifeHistory = [
    {
      date: "2026-04-27T00:00:00.000Z",
      areas: data.currentWheelOfLife,
    },
  ];
  saveUserData(data);
}

describe("LifeBalance", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats the default zero-score wheel as missing Life Balance data", async () => {
    const user = userEvent.setup();
    seedZeroScoreWheel();
    const { router } = renderLifeBalance();

    expect(await screen.findByRole("heading", { name: "Chưa có dữ liệu bánh xe cuộc sống" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bắt đầu đánh giá/i }));

    expect(router.state.location.pathname).toBe("/onboarding");
  });

  it("shows the next Life Insight step after real Life Balance data exists", async () => {
    const user = userEvent.setup();
    seedRealLifeBalance();
    const { router } = renderLifeBalance();

    const nextStepCard = await screen.findByTestId("life-balance-next-step-card");
    expect(nextStepCard).toHaveTextContent("Tiếp theo trong luồng chính");
    expect(nextStepCard).toHaveTextContent("Life Insight");

    await user.click(within(nextStepCard).getByRole("button", { name: /Mở Life Insight/i }));

    expect(router.state.location.pathname).toBe("/life-insight");
  });
});
