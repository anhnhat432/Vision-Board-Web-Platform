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
    expect(within(nextStepCard).getByRole("button", { name: /Mở Life Insight/i })).toBeInTheDocument();

    await user.click(within(nextStepCard).getByRole("button", { name: /Mở Life Insight/i }));

    expect(router.state.location.pathname).toBe("/life-insight");
  });

  it("updates the signal summary from unsaved in-memory score edits", async () => {
    const user = userEvent.setup();
    seedRealLifeBalance();
    renderLifeBalance();

    const summary = await screen.findByTestId("life-balance-signal-summary");
    expect(summary).toHaveTextContent("Tín hiệu từ Life Balance");
    expect(screen.getByTestId("life-balance-signal-weakest")).toHaveTextContent("Mối quan hệ");
    expect(screen.getByTestId("life-balance-signal-weakest")).toHaveTextContent("4/10");

    const firstSlider = screen.getAllByRole("slider")[0];
    firstSlider.focus();
    await user.keyboard("{Home}");

    expect(screen.getByTestId("life-balance-signal-weakest")).toHaveTextContent("Sự nghiệp");
    expect(screen.getByTestId("life-balance-signal-weakest")).toHaveTextContent("1/10");
    expect(screen.getByRole("button", { name: /Lưu và xem Life Insight/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chỉ lưu điểm/i })).toBeInTheDocument();
  });

  it("saves edited scores before opening Life Insight from the primary CTA", async () => {
    const user = userEvent.setup();
    seedRealLifeBalance();
    const { router } = renderLifeBalance();

    const firstSlider = (await screen.findAllByRole("slider"))[0];
    firstSlider.focus();
    await user.keyboard("{Home}");

    await user.click(screen.getByRole("button", { name: /Lưu và xem Life Insight/i }));

    expect(router.state.location.pathname).toBe("/life-insight");
    expect(getUserData().currentWheelOfLife[0]?.score).toBe(1);
  });
});
