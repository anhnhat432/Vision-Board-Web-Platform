import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, saveUserData, formatDateInputValue } from "../utils/storage";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "../utils/storage-types";
import { Dashboard } from "./Dashboard";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

const planHookMock = vi.hoisted(() => ({
  loadPlan: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  isPaidCheckoutDisabled: () => false,
}));

vi.mock("@/features/dashboard/hooks/useDashboardPlanLink", () => ({
  useDashboardPlanLink: () => null,
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlan12Week: () => ({
    plan: null,
    loading: false,
    error: null,
    actions: {
      loadPlan: planHookMock.loadPlan,
    },
  }),
}));

vi.mock("../components/DashboardLifeAreaRadar", () => ({
  DashboardLifeAreaRadar: () => <div data-testid="dashboard-radar-chart">Radar chart</div>,
}));

function setAuthContext() {
  const context = {
    user: { uid: "active_user", email: "active@example.com" },
    userProfile: { id: "profile_active", email: "active@example.com" },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };
  authContextMock.useAuthContext.mockReturnValue(context);
  authContextMock.useOptionalAuthContext.mockReturnValue(context);
}

function makeTask(id: string, title: string, completed = false): TwelveWeekTaskInstance {
  return {
    id,
    weekNumber: 1,
    scheduledDate: formatDateInputValue(new Date()),
    title,
    leadIndicatorName: "Deep work",
    isCore: true,
    completed,
  };
}

function makeSystem(tasks: TwelveWeekTaskInstance[]): TwelveWeekSystem {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 83);

  return {
    goalType: "Project Completion",
    vision12Week: "Ship a clearer dashboard.",
    lagMetric: { name: "Portfolio", unit: "%", target: "100", currentValue: "20" },
    leadIndicators: [{ name: "Deep work", target: "5", unit: "sessions/week" }],
    milestones: { week4: "Draft ready", week8: "Portfolio public", week12: "Applications sent" },
    successEvidence: "The user knows what to do today.",
    reviewDay: "Sunday",
    week12Outcome: "Dashboard is clear and actionable.",
    startDate: formatDateInputValue(today),
    endDate: formatDateInputValue(endDate),
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: tasks,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function seedActiveDashboard() {
  const data = getUserData();
  const goal: Goal = {
    id: "goal_dashboard_active",
    category: "Career",
    focusArea: "Career",
    title: "Launch a focused dashboard",
    description: "Keep the dashboard focused on today.",
    deadline: "2026-07-31",
    feasibilityResult: "Khả thi",
    readinessScore: 16,
    tasks: [],
    createdAt: "2026-05-08T00:00:00.000Z",
    twelveWeekSystem: makeSystem([
      makeTask("task_primary", "Finish the dashboard primary card"),
      makeTask("task_done", "Draft the dashboard copy", true),
    ]),
  };

  data.goals = [goal];
  data.currentWheelOfLife = [
    { name: "Career", score: 7, color: "#0f172a" },
    { name: "Health", score: 5, color: "#059669" },
  ];
  data.onboardingCompleted = true;
  saveUserData(data);
}

function renderDashboard() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Dashboard /> },
      { path: "/12-week-system", element: <div data-testid="system-page">System</div> },
      { path: "/billing/plan", element: <div data-testid="billing-page">Billing</div> },
      { path: "/life-balance", element: <div data-testid="life-balance-page">Life Balance</div> },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("Dashboard active 12-week system UX", () => {
  beforeEach(() => {
    localStorage.clear();
    planHookMock.loadPlan.mockReset();
    setAuthContext();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("orders the signed-in active dashboard as hero, mobile Today, goals, rhythm, then trend in the DOM", async () => {
    seedActiveDashboard();
    renderDashboard();

    const hero = await screen.findByTestId("dashboard-primary-action-card");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const rhythmHeading = screen.getByRole("heading", { name: "Nhịp tuần 1" });
    const trendHeading = screen.getByRole("heading", { name: "Đường 12 tuần" });
    const todayHeading = screen.getByRole("heading", { name: "Việc hôm nay" });

    expect(hero).toHaveTextContent("Tuần 1 / 12");
    expect(todayHeading).toBeDefined();
    expect(hero.compareDocumentPosition(todayHeading as HTMLElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect((todayHeading as HTMLElement).compareDocumentPosition(goalsHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(goalsHeading.compareDocumentPosition(rhythmHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rhythmHeading.compareDocumentPosition(trendHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps mobile signed-in dashboard scannable with Today before active system cards", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    seedActiveDashboard();
    renderDashboard();

    const hero = await screen.findByTestId("dashboard-primary-action-card");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const rhythmHeading = screen.getByRole("heading", { name: "Nhịp tuần 1" });
    const trendHeading = screen.getByRole("heading", { name: "Đường 12 tuần" });
    const kpiRow = await screen.findByTestId("dashboard-kpi-row");
    const todayHeading = screen.getByRole("heading", { name: "Việc hôm nay" });

    expect(todayHeading).toBeDefined();
    expect(hero.compareDocumentPosition(todayHeading as HTMLElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect((todayHeading as HTMLElement).compareDocumentPosition(goalsHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(goalsHeading.compareDocumentPosition(rhythmHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rhythmHeading.compareDocumentPosition(trendHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(goalsHeading.compareDocumentPosition(kpiRow)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getAllByText("Launch a focused dashboard").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dashboard-main-card")).toBeNull();
  });

  it("renders balance rows without the old deferred radar", async () => {
    seedActiveDashboard();
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Cân bằng cuộc sống" })).toBeInTheDocument();
    expect(screen.getByText("Sức khoẻ")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-radar-deferred")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-radar-chart")).not.toBeInTheDocument();
  });
});
