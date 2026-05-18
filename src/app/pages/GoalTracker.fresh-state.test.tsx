import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activateAuthenticatedUserData, getUserData, saveUserData } from "../utils/storage";
import { GoalTracker } from "./GoalTracker";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("../hooks/useBackendProgressOverlay", () => ({
  useBackendProgressOverlayMap: () => new Map(),
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldEnable12WeekGoalTombstoneSync: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
}));

function setSignedInAuthContext() {
  const context = {
    user: {
      uid: "firebase_uid_fresh_goals",
      email: "fresh-goals@example.com",
      displayName: "Fresh Goals",
    },
    userProfile: {
      id: "profile_fresh_goals",
      email: "fresh-goals@example.com",
      displayName: "Fresh Goals",
    },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };
  authContextMock.useAuthContext.mockReturnValue(context);
  authContextMock.useOptionalAuthContext.mockReturnValue(context);
}

function seedAnonymousStaleGoal() {
  const data = getUserData();
  data.goals = [
    {
      id: "goal_anonymous_stale",
      category: "Career",
      title: "Anonymous stale goal must stay hidden",
      description: "This local browser goal belongs to the signed-out workspace.",
      deadline: "2026-06-06",
      tasks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  data.onboardingCompleted = true;
  saveUserData(data);
}

function seedActiveTwelveWeekGoal() {
  const data = getUserData();
  data.isHydratedFromDemo = false;
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  data.goals = [
    {
      id: "goal_active_system",
      category: "Career",
      title: "Active 12-week goal",
      description: "A real active cycle should keep the goals page focused on goals.",
      deadline: "2026-07-19",
      tasks: [],
      focusArea: "Career",
      feasibilityResult: "realistic",
      readinessScore: 16,
      createdAt: "2026-04-28T00:00:00.000Z",
      twelveWeekSystem: {
        goalType: "Personal Growth",
        vision12Week: "Run a clean 12-week execution cycle.",
        lagMetric: {
          name: "Reviews",
          unit: "reviews",
          target: "12",
          currentValue: "0",
        },
        leadIndicators: [
          {
            id: "lead_1",
            name: "Weekly review",
            target: "1",
            unit: "time/week",
            type: "core",
          },
        ],
        milestones: {
          week4: "Week 4",
          week8: "Week 8",
          week12: "Week 12",
        },
        successEvidence: "The cycle is visible in the goals list.",
        reviewDay: "Sunday",
        week12Outcome: "Complete the cycle",
        startDate: "2026-04-27",
        endDate: "2026-07-19",
        timezone: "Asia/Saigon",
        weekStartsOn: "Monday",
        status: "active",
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans: [],
        taskInstances: [],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: [],
      },
    },
  ] as typeof data.goals;
  saveUserData(data);
}

function renderGoalTracker() {
  const router = createMemoryRouter(
    [
      {
        path: "/goals",
        element: <GoalTracker />,
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
    { initialEntries: ["/goals"] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

async function findEmptyGoalState(): Promise<HTMLElement> {
  const emptyHeading = await screen.findByRole("heading", { name: "Chưa có mục tiêu" });
  const emptyState = emptyHeading.closest("div");
  if (!emptyState) {
    throw new Error("Missing empty goal state container");
  }

  return emptyState;
}

describe("GoalTracker fresh workspace state", () => {
  beforeEach(() => {
    localStorage.clear();
    setSignedInAuthContext();
  });

  it("shows an empty first-step state for a newly signed-in user instead of stale anonymous goals", async () => {
    seedAnonymousStaleGoal();
    activateAuthenticatedUserData("firebase_uid_fresh_goals");
    expect(getUserData().goals).toEqual([]);

    renderGoalTracker();

    const emptyState = await findEmptyGoalState();
    expect(emptyState).toHaveTextContent("Chưa có mục tiêu");
    expect(emptyState).toHaveTextContent("Bắt đầu bằng chu kỳ 12 tuần đầu tiên");
    expect(within(emptyState).getByRole("button", { name: /Bắt đầu chu kỳ 12 tuần/ })).toBeInTheDocument();
    expect(screen.queryByText("Anonymous stale goal must stay hidden")).not.toBeInTheDocument();
    expect(screen.queryByText("Mục tiêu đang theo")).not.toBeInTheDocument();
    expect(screen.queryByText(/Bạn đang ở gói/i)).not.toBeInTheDocument();
  });

  it("starts the guided flow from onboarding until the user has real Life Balance data", async () => {
    activateAuthenticatedUserData("firebase_uid_fresh_goals");
    const user = userEvent.setup();
    const { router } = renderGoalTracker();

    const emptyState = await findEmptyGoalState();
    await user.click(within(emptyState).getByRole("button", { name: /Bắt đầu chu kỳ 12 tuần/ }));

    expect(router.state.location.pathname).toBe("/onboarding");
  });

  it("hides the new user checklist once a real 12-week goal exists", async () => {
    activateAuthenticatedUserData("firebase_uid_fresh_goals");
    seedActiveTwelveWeekGoal();

    renderGoalTracker();

    expect(await screen.findByText("Active 12-week goal")).toBeInTheDocument();
    expect(screen.queryByText("Hướng dẫn cho người mới")).not.toBeInTheDocument();
  });
});
