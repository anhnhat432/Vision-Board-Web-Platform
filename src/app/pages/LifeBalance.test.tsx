import { render, screen, waitFor } from "@testing-library/react";
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

function seedCompletedZeroScoreWheel() {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = LIFE_AREAS.map((area) => ({ ...area, score: 0 }));
  data.wheelOfLifeHistory = [
    {
      date: "2026-04-27T00:00:00.000Z",
      areas: data.currentWheelOfLife,
    },
  ];
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

    expect(await screen.findByRole("heading", { name: "Chưa có dữ liệu bánh xe" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Bắt đầu chấm điểm/i }));

    expect(router.state.location.pathname).toBe("/onboarding");
  });

  it("renders completed zero-score Life Balance data without redirecting", async () => {
    seedCompletedZeroScoreWheel();
    const { router } = renderLifeBalance();

    expect(await screen.findByRole("heading", { level: 1, name: "Bức tranh hiện tại của bạn" })).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-page")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/life-balance");
  });

  it("renders 3-stat row with strongest and weakest area labels", async () => {
    seedRealLifeBalance();
    renderLifeBalance();

    const avgCaption = await screen.findByText("Trung bình");
    expect(avgCaption).toBeInTheDocument();

    // Strongest = Education (score 8) → "Học tập"; weakest = Relationships (score 4) → "Mối quan hệ"
    const strongestCard = screen.getByText("Lĩnh vực mạnh nhất").closest("article");
    expect(strongestCard).not.toBeNull();
    expect(strongestCard).toHaveTextContent("Học tập");
    expect(strongestCard).toHaveTextContent("8");

    const weakestCard = screen.getByText("Lĩnh vực cần ưu tiên").closest("article");
    expect(weakestCard).not.toBeNull();
    expect(weakestCard).toHaveTextContent("Mối quan hệ");
    expect(weakestCard).toHaveTextContent("4");
  });

  it("enables save button after editing a score and persists on save", async () => {
    const user = userEvent.setup();
    seedRealLifeBalance();
    renderLifeBalance();

    const saveButton = await screen.findByRole("button", { name: /Lưu thay đổi/i });
    expect(saveButton).toBeDisabled();

    const firstSlider = (await screen.findAllByRole("slider"))[0];
    firstSlider.focus();
    await user.keyboard("{Home}");

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    await user.click(saveButton);

    await waitFor(() => {
      expect(getUserData().currentWheelOfLife[0]?.score).toBe(1);
    });
  });
});
