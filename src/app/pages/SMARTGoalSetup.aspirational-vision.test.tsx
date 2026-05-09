import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, saveUserData } from "../utils/storage";
import { SMARTGoalSetup } from "./SMARTGoalSetup";

function seedReadySmartSetup(withVision: boolean) {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  if (withVision) {
    data.aspirationalVision = {
      id: "vision_3y_1",
      horizonYears: 3,
      summary: "Ba năm tới tôi làm việc sâu, khỏe hơn và có tài chính vững vàng.",
      lifeAreas: [],
      createdAt: "2026-05-09T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    };
  }
  saveUserData(data);
  localStorage.setItem("selected_focus_area", "Career");
}

function renderSmartSetup() {
  const router = createMemoryRouter(
    [
      { path: "/smart-goal-setup", element: <SMARTGoalSetup /> },
      { path: "/vision", element: <div data-testid="vision-page">Vision page</div> },
      { path: "/onboarding", element: <div>Onboarding</div> },
      { path: "/life-insight", element: <div>Life Insight</div> },
    ],
    { initialEntries: ["/smart-goal-setup"] },
  );

  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  localStorage.clear();
});

describe("SMARTGoalSetup aspirational vision banner", () => {
  it("shows the saved 3-year vision summary when present", async () => {
    seedReadySmartSetup(true);

    renderSmartSetup();

    expect(await screen.findByText(/Mục tiêu này phục vụ tầm nhìn 3 năm:/)).toBeInTheDocument();
    expect(screen.getByText(/Ba năm tới tôi làm việc sâu/)).toBeInTheDocument();
  });

  it("shows a soft optional prompt when no 3-year vision exists", async () => {
    seedReadySmartSetup(false);

    renderSmartSetup();

    expect(
      await screen.findByText("Bạn đang đặt mục tiêu 12 tuần. Phương pháp gốc khuyên gắn với tầm nhìn 3 năm."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bỏ qua" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Điền 2 phút →" })).toHaveAttribute("href", "/vision");
  });
});
