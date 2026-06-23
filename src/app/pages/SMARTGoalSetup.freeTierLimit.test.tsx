import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      id: "smart_goal_limit_test",
      domain: "career",
      specific: {
        goal_statement: "Tăng doanh thu tư vấn lên mức ổn định hơn trong quý này",
      },
      measurable: {
        metric_name: "Doanh thu tư vấn",
        baseline_value: 10,
        target_value: 30,
      },
      achievable: {
        weekly_time_commitment_hours: 8,
        required_skills: ["Bán hàng"],
        support_resources: ["Danh sách khách hàng hiện có"],
      },
      relevant: {
        motivation_reason: "Mục tiêu này giúp tôi có nền tài chính vững hơn và tự tin hơn với nghề nghiệp.",
        life_dimension_alignment: "Sự nghiệp",
      },
      time_bound: { target_weeks: 12 },
      created_at: now,
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

async function findMobileActionButton(name: RegExp) {
  let actionButton: HTMLElement | null = null;

  await waitFor(() => {
    actionButton = within(getMobileActionBar()).getByRole("button", { name });
    expect(actionButton).toBeInTheDocument();
  });

  if (!actionButton) {
    throw new Error(`Missing mobile action button: ${name}`);
  }

  return actionButton;
}

beforeEach(() => {
  localStorage.clear();
});

describe("SMARTGoalSetup free tier limit", () => {
  it("opens the Plus paywall when a free user tries to create a fourth goal", async () => {
    seedFreeUserAtGoalLimit();

    renderSmartSetup();
    const user = userEvent.setup();

    await screen.findByText("Bạn muốn đạt được điều gì?");

    const specificAction = await findMobileActionButton(/Lưu mục tiêu cụ thể/i);
    await user.click(specificAction);

    const measurableAction = await findMobileActionButton(/Xác nhận chỉ số đo/i);
    await user.click(measurableAction);

    const achievableAction = await findMobileActionButton(/Thiết lập thời gian cam kết/i);
    await user.click(achievableAction);

    const relevantAction = await findMobileActionButton(/Xác nhận động lực này/i);
    await user.click(relevantAction);

    const finalAction = await findMobileActionButton(/Tạo kế hoạch nhanh/i);
    await user.click(finalAction);

    expect((await screen.findAllByText("Bạn đã có 3 mục tiêu")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nâng cấp Plus để tạo thêm mục tiêu/)).toBeInTheDocument();
  });
});
