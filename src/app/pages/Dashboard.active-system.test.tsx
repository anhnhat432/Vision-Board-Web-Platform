import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";

import {
  formatDateInputValue,
  getUserData,
  saveUserData,
  USER_DATA_UPDATED_EVENT_NAME,
} from "../utils/storage";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "../utils/storage-types";
import { Dashboard } from "./Dashboard";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

const planHookMock = vi.hoisted(() => ({
  loadPlan: vi.fn(),
  state: {
    plan: null,
    loading: false,
    error: null as Error | null,
  },
}));

const dashboardPlanLinkMock = vi.hoisted(() => ({
  planId: null as string | null,
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
  useDashboardPlanLink: () => dashboardPlanLinkMock.planId,
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlan12Week: () => ({
    plan: planHookMock.state.plan,
    loading: planHookMock.state.loading,
    error: planHookMock.state.error,
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

function makeSystem(
  tasks: TwelveWeekTaskInstance[],
  overrides: Partial<TwelveWeekSystem> = {},
): TwelveWeekSystem {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 83);

  const base: TwelveWeekSystem = {
    goalType: "Project Completion",
    vision12Week: "Ship a clearer dashboard.",
    lagMetric: { name: "Portfolio", unit: "%", target: "100", currentValue: "20" },
    leadIndicators: [],
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

  return { ...base, ...overrides, taskInstances: tasks };
}

const REVIEW_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

interface SeedActiveDashboardOptions {
  tasks?: TwelveWeekTaskInstance[];
  reviewDay?: string;
  weeklyReviews?: TwelveWeekSystem["weeklyReviews"];
}

function seedActiveDashboard(options: SeedActiveDashboardOptions = {}): string {
  const data = getUserData();
  const goalId = "goal_dashboard_active";
  const tasks = options.tasks ?? [
    makeTask("task_primary", "Finish the dashboard primary card"),
    makeTask("task_done", "Draft the dashboard copy", true),
  ];
  const goal: Goal = {
    id: goalId,
    category: "Career",
    focusArea: "Career",
    title: "Launch a focused dashboard",
    description: "Keep the dashboard focused on today.",
    deadline: "2026-07-31",
    feasibilityResult: "Khả thi",
    readinessScore: 16,
    tasks: [],
    createdAt: "2026-05-08T00:00:00.000Z",
    twelveWeekSystem: makeSystem(tasks, {
      reviewDay: options.reviewDay ?? "Sunday",
      weeklyReviews: options.weeklyReviews ?? [],
    }),
  };

  data.goals = [goal];
  data.currentWheelOfLife = [
    { name: "Career", score: 7, color: "#0f172a" },
    { name: "Health", score: 5, color: "#059669" },
  ];
  data.onboardingCompleted = true;
  saveUserData(data);
  return goalId;
}

function renderDashboard() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Dashboard /> },
      { path: "/12-week-system", element: <div data-testid="system-page">System</div> },
      { path: "/goals", element: <div data-testid="goals-page">Goals</div> },
      { path: "/billing/plan", element: <div data-testid="billing-page">Billing</div> },
      { path: "/life-balance", element: <div data-testid="life-balance-page">Life Balance</div> },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

const SECONDARY_INSIGHTS_OPEN_KEY = "visionboard_dashboard_secondary_insights_open";

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

describe("Dashboard active 12-week system UX", () => {
  beforeEach(() => {
    localStorage.clear();
    planHookMock.loadPlan.mockReset();
    planHookMock.state.plan = null;
    planHookMock.state.loading = false;
    planHookMock.state.error = null;
    dashboardPlanLinkMock.planId = null;
    setAuthContext();
    setViewportWidth(1024);
  });

  it("puts the primary task before goals and secondary analytics on desktop", async () => {
    seedActiveDashboard();
    renderDashboard();

    const contextStrip = await screen.findByTestId("dashboard-context-strip");
    const focus = screen.getByTestId("dashboard-daily-focus");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const secondaryTitle = screen.getByText("Phân tích & nhịp độ");
    const rhythmHeading = screen.getByRole("heading", { name: "Nhịp tuần 1" });

    expect(contextStrip).toHaveTextContent("Tuần 1 / 12");
    expect(screen.getByRole("button", { name: /Thu gọn/ })).toBeInTheDocument();
    expect(contextStrip.compareDocumentPosition(focus)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(focus.compareDocumentPosition(goalsHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(goalsHeading.compareDocumentPosition(secondaryTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(secondaryTitle.compareDocumentPosition(rhythmHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("collapses secondary insights by default on mobile and remembers the disclosure state", async () => {
    setViewportWidth(390);
    seedActiveDashboard();
    renderDashboard();

    const focus = await screen.findByTestId("dashboard-daily-focus");
    const goalsHeading = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
    const todayHeading = screen.getByRole("heading", { name: "Hôm nay" });
    const secondaryTitle = screen.getByText("Phân tích & nhịp độ");

    expect(focus.compareDocumentPosition(todayHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(todayHeading.compareDocumentPosition(goalsHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(goalsHeading.compareDocumentPosition(secondaryTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("Phân tích & nhịp độ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mở phân tích/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Mở Today ·/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Today workspace" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nhịp tuần 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đường 12 tuần" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mở phân tích/ }));

    expect(localStorage.getItem(SECONDARY_INSIGHTS_OPEN_KEY)).toBe("true");
    const kpiRow = await screen.findByTestId("dashboard-kpi-row");
    expect(screen.getByRole("heading", { name: "Nhịp tuần 1" })).toBeInTheDocument();
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

  it("lets users retry a failed backend plan load without hiding the local dashboard", async () => {
    dashboardPlanLinkMock.planId = "507f1f77bcf86cd799439011";
    planHookMock.state.error = new Error("Backend temporarily unavailable");
    seedActiveDashboard();
    renderDashboard();

    expect(
      await screen.findByText("Không tải được kế hoạch từ máy chủ — dữ liệu hiển thị từ bộ nhớ cục bộ."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-daily-focus")).toBeInTheDocument();

    await waitFor(() => {
      expect(planHookMock.loadPlan).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });
    planHookMock.loadPlan.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại tải kế hoạch" }));

    expect(planHookMock.loadPlan).toHaveBeenCalledTimes(1);
    expect(planHookMock.loadPlan).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });

  it("completes the primary task through the canonical mutation and advances to the next task", async () => {
    const user = userEvent.setup();
    const goalId = seedActiveDashboard({
      tasks: [makeTask("task_a", "Task A"), makeTask("task_b", "Task B")],
    });
    renderDashboard();

    await user.click(await screen.findByRole("button", { name: "Đánh dấu xong: Task A" }));

    expect(await screen.findByText("Task B")).toBeInTheDocument();
    expect(
      getUserData().goals.find((goal) => goal.id === goalId)?.twelveWeekSystem?.taskInstances[0].completed,
    ).toBe(true);
    expect(
      listStoredPendingMutations(null).filter((mutation) => mutation.kind === "task_completed_changed"),
    ).toHaveLength(1);
  });

  it("does not expose a second completion action or duplicate primary task in the queue", async () => {
    seedActiveDashboard({ tasks: [makeTask("task_a", "Task A"), makeTask("task_b", "Task B")] });
    renderDashboard();

    expect(await screen.findAllByText("Task A")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Đánh dấu xong: Task A" })).toHaveLength(1);
  });

  it("locks duplicate clicks to one canonical task mutation", async () => {
    const user = userEvent.setup();
    seedActiveDashboard({ tasks: [makeTask("task_a", "Task A")] });
    renderDashboard();

    await user.dblClick(await screen.findByRole("button", { name: "Đánh dấu xong: Task A" }));

    await screen.findByTestId("dashboard-daily-closure");
    expect(
      listStoredPendingMutations(null).filter((mutation) => mutation.kind === "task_completed_changed"),
    ).toHaveLength(1);
  });

  it("shows closure after the last scheduled task completes", async () => {
    const user = userEvent.setup();
    seedActiveDashboard({ tasks: [makeTask("task_last", "Last task")] });
    renderDashboard();

    await user.click(await screen.findByRole("button", { name: "Đánh dấu xong: Last task" }));

    expect(await screen.findByText("Hôm nay đã hoàn thành 1/1")).toBeInTheDocument();
  });

  it("does not treat three unfinished-today tasks as overdue", async () => {
    seedActiveDashboard({
      tasks: [makeTask("one", "One"), makeTask("two", "Two"), makeTask("three", "Three")],
    });
    renderDashboard();

    await screen.findByTestId("dashboard-daily-focus");
    expect(screen.queryByText("3 việc đang trễ")).not.toBeInTheDocument();
  });

  it("shows true overdue count without promoting an overdue task as today's primary", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    seedActiveDashboard({
      tasks: [
        { ...makeTask("overdue", "Overdue task"), scheduledDate: formatDateInputValue(yesterday) },
        makeTask("today", "Today task"),
      ],
    });
    renderDashboard();

    expect(await screen.findByText("Today task")).toBeInTheDocument();
    expect(screen.getByText("1 việc đang trễ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đánh dấu xong: Overdue task" })).not.toBeInTheDocument();
  });

  it("renders a true no-schedule state instead of falling back to weekly work", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    seedActiveDashboard({
      tasks: [{ ...makeTask("future", "Future weekly task"), scheduledDate: formatDateInputValue(tomorrow) }],
    });
    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Hôm nay không có việc được lên lịch" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đánh dấu xong: Future weekly task" })).not.toBeInTheDocument();
  });

  it("keeps review contextual while a task remains and promotes it after daily work closes", async () => {
    const user = userEvent.setup();
    seedActiveDashboard({
      tasks: [makeTask("review_task", "Finish before review")],
      reviewDay: REVIEW_DAYS[new Date().getDay()],
    });
    renderDashboard();

    const taskButton = await screen.findByRole("button", { name: "Đánh dấu xong: Finish before review" });
    expect(screen.getByRole("link", { name: /Mở review/ })).toBeInTheDocument();

    await user.click(taskButton);

    expect(await screen.findByRole("link", { name: "Review tuần" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mở review/ })).not.toBeInTheDocument();
  });

  it("refreshes from the shared local truth after an external user-data update event", async () => {
    const goalId = seedActiveDashboard({ tasks: [makeTask("external", "External task")] });
    renderDashboard();
    await screen.findByText("External task");

    const data = getUserData();
    const goal = data.goals.find((item) => item.id === goalId)!;
    goal.twelveWeekSystem!.taskInstances[0] = {
      ...goal.twelveWeekSystem!.taskInstances[0],
      completed: true,
      completedAt: new Date().toISOString(),
      lastModifiedAt: Date.now(),
    };
    saveUserData(data);
    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));

    expect(await screen.findByText("Hôm nay đã hoàn thành 1/1")).toBeInTheDocument();
  });
});
