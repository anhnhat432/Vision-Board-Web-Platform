import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("ReflectionJournal fresh state", () => {
  beforeEach(() => {
    localStorage.clear();
    seedFreshJournal();
  });

  it("shows a real empty state instead of zero-value journal metrics", async () => {
    renderJournal();

    expect(await screen.findByTestId("journal-fresh-empty-state")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chưa có trang nhật ký nào được mở ra" })).toBeInTheDocument();
    expect(screen.queryByText("Tổng số nhật ký")).not.toBeInTheDocument();
    expect(screen.queryByText("Review tuần")).not.toBeInTheDocument();
    expect(screen.queryByText("Tổng số bài")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bắt đầu Cân bằng cuộc sống/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Viết nhật ký tự do/i })).toBeInTheDocument();
  });

  it("keeps the empty-state CTA pointed at the first core-flow step", async () => {
    const user = userEvent.setup();
    const { router } = renderJournal();

    await user.click(await screen.findByRole("button", { name: /Bắt đầu Cân bằng cuộc sống/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding");
    });
  });
});
