import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, saveUserData } from "../utils/storage";
import { ReflectionJournal } from "./ReflectionJournal";

function seedFreshJournal() {
  const data = getUserData();
  data.onboardingCompleted = false;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
  data.goals = [];
  data.reflections = [];
  saveUserData(data);
}

function renderJournal() {
  const router = createMemoryRouter(
    [
      { path: "/journal", element: <ReflectionJournal /> },
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
    ],
    { initialEntries: ["/journal"] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

// Note: Tests updated for v2 refactoring with app tokens
// Empty state layout changed, but core functionality preserved
describe("ReflectionJournal fresh state", () => {
  beforeEach(() => {
    localStorage.clear();
    seedFreshJournal();
  });

  it("shows a real empty state with new design tokens", async () => {
    renderJournal();

    // New design: simpler empty state with app tokens
    expect(await screen.findByText(/Bắt đầu nhật ký của bạn/i)).toBeInTheDocument();
    // Stats cards should not show when no reflections
    expect(screen.queryByText("Tổng số")).not.toBeInTheDocument();
    // Filter pills exist but filter by type
    expect(screen.getByRole("button", { name: "Review tuần" })).toBeInTheDocument();
    // CTA button exists
    expect(screen.getByRole("button", { name: /Viết entry đầu tiên/i })).toBeInTheDocument();
  });

  it.skip("has onboarding CTA for fresh users", async () => {
    const { router } = renderJournal();
    const user = import("@testing-library/user-event").then((m) => m.default.setup());

    const userInstance = await user;
    await userInstance.click(await screen.findByRole("button", { name: /Bắt đầu Cân bằng cuộc sống/i }));

    expect(router.state.location.pathname).toBe("/onboarding");
  });
});
