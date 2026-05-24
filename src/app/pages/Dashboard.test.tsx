import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "./Dashboard";
import { getUserData, saveUserData } from "../utils/storage";

const planServiceMocks = vi.hoisted(() => ({
  createPlan: vi.fn(),
  getPlanById: vi.fn(),
}));

vi.mock("@/services/planService", () => ({
  createPlan: planServiceMocks.createPlan,
  getPlanById: planServiceMocks.getPlanById,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    authLoading: false,
    isConfigured: true,
    user: null,
  }),
  useOptionalAuthContext: () => ({
    authLoading: false,
    isConfigured: true,
    user: null,
  }),
}));

describe("Dashboard public visitor state", () => {
  beforeEach(() => {
    localStorage.clear();
    planServiceMocks.createPlan.mockReset();
    planServiceMocks.getPlanById.mockReset();
  });

  it("does not render personal goal or wheel sections for signed-out visitors", async () => {
    const data = getUserData();
    data.goals = [
      {
        id: "goal_public_local",
        category: "Career",
        title: "Ra mắt portfolio cần ẩn",
        description: "Local-only goal should not appear before login.",
        deadline: "2026-06-06",
        tasks: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        twelveWeekSystem: {},
      },
    ] as unknown as typeof data.goals;
    data.currentWheelOfLife = [{ name: "Career", score: 8, color: "#0f172a" }];
    saveUserData(data);
    localStorage.setItem(
      "backend_plan_links",
      JSON.stringify({
        goal_public_local: {
          planId: "507f1f77bcf86cd799439011",
          weekIdByNumber: {},
          metricIdByKey: {},
          taskIdByLocalTaskId: {},
        },
      }),
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /App biến mục tiêu lớn thành.*kế hoạch 12 tuần.*việc hôm nay/i,
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/Luồng mục tiêu sau khi đăng ký/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bánh xe cuộc sống là bước mở đầu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ra mắt portfolio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Duy trì thói quen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu đang hiển thị là ví dụ demo/i)).not.toBeInTheDocument();
    await waitFor(() => expect(planServiceMocks.getPlanById).not.toHaveBeenCalled());
  });
});
