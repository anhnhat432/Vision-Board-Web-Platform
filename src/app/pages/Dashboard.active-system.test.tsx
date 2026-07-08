import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatDateInputValue, getUserData, saveUserData } from "../utils/storage";
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

vi.mock("@/features/dashboard/v2/ReflectionPrompt", () => ({
  ReflectionPrompt: ({ reviewHref }: { reviewHref?: string }) => (
    <div data-testid="reflection-prompt" data-review-href={reviewHref} />
  ),
}));

vi.mock("@/features/dashboard/v2/TodayMiniCard", () => ({
  TodayMiniCard: ({ title = "Việc hôm nay" }: { title?: string }) => (
    <section aria-labelledby="dashboard-today-mini-title">
      <h2 id="dashboard-today-mini-title">{title}</h2>
    </section>
  ),
}));

vi.mock("@/features/dashboard/v2/TwelveWeekTrendCard", () => ({
  TwelveWeekTrendCard: () => (
    <section aria-labelledby="dashboard-trend-title">
      <h2 id="dashboard-trend-title">Đường 12 tuần</h2>
    </section>
  ),
}));

vi.mock("@/features/dashboard/v2/WeekRhythmCard", () => ({
  WeekRhythmCard: ({ currentWeek }: { currentWeek: number | null }) => (
    <section aria-labelledby="dashboard-week-rhythm-title" data-testid="dashboard-kpi-row">
      <h2 id="dashboard-week-rhythm-title">Nhịp tuần {currentWeek ?? 1}</h2>
    </section>
  ),
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

function getTodayReviewDay(): TwelveWeekSystem["reviewDay"] {
  const reviewDays: TwelveWeekSystem["reviewDay"][] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return reviewDays[new Date().getDay()];
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

  return { router, ...render(<RouterProvider router={router} />) };
}

const SECONDARY_INSIGHTS_OPEN_KEY = "visionboard_dashboard_secondary_insights_open";
let intersectionObserverCallback: IntersectionObserverCallback | null = null;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => {
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
      const matches = minWidthMatch ? width >= Number(minWidthMatch[1]) : false;

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    },
  });
}

function installIntersectionObserverMock() {
  intersectionObserverCallback = null;
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = "0px";
    readonly scrollMargin = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];

    constructor(callback: IntersectionObserverCallback) {
      intersectionObserverCallback = callback;
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

function revealNearViewportInsights() {
  act(() => {
    intersectionObserverCallback?.(
      [
        {
          isIntersecting: true,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

describe("Dashboard active 12-week system UX", () => {
  beforeEach(() => {
    localStorage.clear();
    planHookMock.loadPlan.mockReset();
    setAuthContext();
    setViewportWidth(1024);
    installIntersectionObserverMock();
  });

  it("keeps the active dashboard primary cards first and groups secondary insights on desktop", async () => {
    seedActiveDashboard();
    renderDashboard();

    const hero = await screen.findByTestId("dashboard-primary-action-card");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const todayHeading = screen.getByRole("heading", { name: "Việc hôm nay" });
    const secondaryTitle = screen.getByText("Phân tích & nhịp độ");
    const rhythmHeading = screen.getByRole("heading", { name: "Nhịp tuần 1" });
    revealNearViewportInsights();
    const trendHeading = await screen.findByRole("heading", { name: "Đường 12 tuần" });

    expect(hero).toHaveTextContent("Tuần 1 / 12");
    expect(screen.getByRole("button", { name: /Thu gọn/ })).toBeInTheDocument();
    expect(hero.compareDocumentPosition(todayHeading as HTMLElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect((todayHeading as HTMLElement).compareDocumentPosition(goalsHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(goalsHeading.compareDocumentPosition(secondaryTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(secondaryTitle.compareDocumentPosition(rhythmHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rhythmHeading.compareDocumentPosition(trendHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("defers the trend chart until secondary insights are near the viewport on desktop", async () => {
    seedActiveDashboard();
    renderDashboard();

    await screen.findByTestId("dashboard-primary-action-card");

    expect(screen.getByRole("heading", { name: "Nhịp tuần 1" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đường 12 tuần" })).not.toBeInTheDocument();

    revealNearViewportInsights();

    expect(await screen.findByRole("heading", { name: "Đường 12 tuần" })).toBeInTheDocument();
  });

  it("collapses secondary insights by default on mobile and remembers the disclosure state", async () => {
    setViewportWidth(390);
    seedActiveDashboard();
    renderDashboard();

    const hero = await screen.findByTestId("dashboard-primary-action-card");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const todayHeading = screen.getByRole("heading", { name: "Việc hôm nay" });
    const secondaryTitle = screen.getByText("Phân tích & nhịp độ");

    expect(hero.compareDocumentPosition(todayHeading as HTMLElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect((todayHeading as HTMLElement).compareDocumentPosition(goalsHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(goalsHeading.compareDocumentPosition(secondaryTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("Phân tích & nhịp độ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mở phân tích/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nhịp tuần 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đường 12 tuần" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mở phân tích/ }));

    expect(localStorage.getItem(SECONDARY_INSIGHTS_OPEN_KEY)).toBe("true");
    const kpiRow = await screen.findByTestId("dashboard-kpi-row");
    expect(screen.getByRole("heading", { name: "Nhịp tuần 1" })).toBeInTheDocument();
    revealNearViewportInsights();
    expect(await screen.findByRole("heading", { name: "Đường 12 tuần" })).toBeInTheDocument();
    expect(goalsHeading.compareDocumentPosition(kpiRow)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.click(screen.getByRole("button", { name: /Thu gọn/ }));

    expect(localStorage.getItem(SECONDARY_INSIGHTS_OPEN_KEY)).toBe("false");
    expect(screen.queryByRole("heading", { name: "Nhịp tuần 1" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Launch a focused dashboard").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dashboard-main-card")).toBeNull();
  });

  it("honors the saved secondary insights collapsed state on desktop reload", async () => {
    localStorage.setItem(SECONDARY_INSIGHTS_OPEN_KEY, "false");
    seedActiveDashboard();
    renderDashboard();

    await screen.findByTestId("dashboard-primary-action-card");

    expect(screen.getByRole("button", { name: /Mở phân tích/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nhịp tuần 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cân bằng cuộc sống" })).not.toBeInTheDocument();
  });

  it("renders balance rows without the old deferred radar", async () => {
    seedActiveDashboard();
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Cân bằng cuộc sống" })).toBeInTheDocument();
    expect(screen.getByText("Sức khoẻ")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-radar-deferred")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-radar-chart")).not.toBeInTheDocument();
  });

  it("opens the supported weekly review tab when review is due", async () => {
    const data = getUserData();
    const system = makeSystem([makeTask("task_done", "Finish the week", true)]);
    system.leadIndicators = [];
    system.reviewDay = getTodayReviewDay();
    const goal: Goal = {
      id: "goal_dashboard_review",
      category: "Career",
      focusArea: "Career",
      title: "Review the active week",
      description: "Keep the weekly review easy to reach.",
      deadline: "2026-07-31",
      feasibilityResult: "Khả thi",
      readinessScore: 16,
      tasks: [],
      createdAt: "2026-05-08T00:00:00.000Z",
      twelveWeekSystem: system,
    };

    data.goals = [goal];
    data.currentWheelOfLife = [
      { name: "Career", score: 7, color: "#0f172a" },
      { name: "Health", score: 5, color: "#059669" },
    ];
    data.onboardingCompleted = true;
    saveUserData(data);

    const { router } = renderDashboard();
    const reviewButton = await screen.findByRole("button", { name: /Viết phản tư/ });

    fireEvent.click(reviewButton);

    expect(router.state.location.pathname).toBe("/12-week-system");
    expect(router.state.location.search).toBe("?tab=week");
  });
});
