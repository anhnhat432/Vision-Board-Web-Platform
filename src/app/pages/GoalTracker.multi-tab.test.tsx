import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

const mutationQueueMocks = vi.hoisted(() => ({
  enqueueStoredMutation: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("@/features/plan12week/persistence/mutationQueue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/plan12week/persistence/mutationQueue")>();
  return {
    ...actual,
    enqueueStoredMutation: mutationQueueMocks.enqueueStoredMutation,
  };
});

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

type MockMessageListener = (event: MessageEvent<unknown>) => void;

class MockBroadcastChannel {
  static channels: MockBroadcastChannel[] = [];

  readonly name: string;
  readonly postMessage = vi.fn();
  private readonly listeners = new Set<MockMessageListener>();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.channels.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== "message") return;
    this.listeners.add(listener as MockMessageListener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== "message") return;
    this.listeners.delete(listener as MockMessageListener);
  }

  dispatchMessage(data: unknown) {
    const event = { data } as MessageEvent<unknown>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  close() {
    this.listeners.clear();
  }
}

function setSignedInAuthContext() {
  const value = {
    user: {
      uid: "firebase_uid_multi_tab_goals",
      email: "multi-tab-goals@example.com",
      displayName: "Multi Tab Goals",
    },
    userProfile: {
      id: "profile_multi_tab_goals",
      email: "multi-tab-goals@example.com",
      displayName: "Multi Tab Goals",
    },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };

  authContextMock.useAuthContext.mockReturnValue(value);
  authContextMock.useOptionalAuthContext.mockReturnValue(value);
}

async function renderGoalTracker() {
  const { GoalTracker } = await import("./GoalTracker");
  const router = createMemoryRouter(
    [
      {
        path: "/goals",
        element: <GoalTracker />,
      },
    ],
    { initialEntries: ["/goals"] },
  );

  return render(<RouterProvider router={router} />);
}

function getTaskCheckbox(taskTitle: string): HTMLInputElement {
  const taskRow = screen.getByText(taskTitle).closest("div");
  const checkbox = taskRow?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!checkbox) {
    throw new Error(`Missing checkbox for task: ${taskTitle}`);
  }

  return checkbox;
}

describe("GoalTracker multi-tab task updates", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    MockBroadcastChannel.channels = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    mutationQueueMocks.enqueueStoredMutation.mockReset();
    mutationQueueMocks.enqueueStoredMutation.mockReturnValue({ ok: true, store: null, item: null });
    setSignedInAuthContext();
  });

  it("updates 12-week goal progress immediately after ticking the next task", async () => {
    const storage = await import("../utils/storage");
    const data = storage.getUserData();
    const today = new Date();
    const todayKey = storage.formatDateInputValue(today);
    const nonTodayReviewDay = today.getDay() === 0 ? "Monday" : "Sunday";
    data.onboardingCompleted = true;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 6 }));
    data.goals = [
      {
        id: "goal_12_week_progress",
        category: "Career",
        title: "12-week progress goal",
        description: "Progress should update without reload.",
        deadline: "2026-08-03",
        tasks: [],
        createdAt: "2026-05-01T00:00:00.000Z",
        twelveWeekSystem: {
          goalType: "Career",
          vision12Week: "Ship the operating cadence",
          lagMetric: {
            name: "Progress",
            unit: "%",
            target: "100",
            currentValue: "0",
          },
          leadIndicators: [
            {
              id: "tactic_12_week_a",
              name: "Deep work A",
              target: "5",
              unit: "tasks",
              type: "core",
              priority: 1,
              schedule: [0, 1, 2, 3, 4],
            },
            {
              id: "tactic_12_week_b",
              name: "Deep work B",
              target: "5",
              unit: "tasks",
              type: "core",
              priority: 2,
              schedule: [0, 1, 2, 3, 4],
            },
          ],
          milestones: { week4: "", week8: "", week12: "" },
          successEvidence: "",
          reviewDay: nonTodayReviewDay,
          week12Outcome: "",
          startDate: todayKey,
          endDate: todayKey,
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 1,
          weeklyPlans: [],
          taskInstances: [
            ...Array.from({ length: 5 }, (_, index) => ({
              id: `tw_task_1_tactic_12_week_a_${index}`,
              weekNumber: 1,
              scheduledDate: todayKey,
              title: `Deep work A ${index + 1}`,
              leadIndicatorName: "Deep work A",
              isCore: true,
              completed: index < 4,
              completedAt: index < 4 ? "2026-05-15T00:00:00.000Z" : undefined,
              lastModifiedAt: index + 1,
              tacticId: "tactic_12_week_a",
            })),
            ...Array.from({ length: 5 }, (_, index) => ({
              id: `tw_task_1_tactic_12_week_b_${index}`,
              weekNumber: 1,
              scheduledDate: todayKey,
              title: `Deep work B ${index + 1}`,
              leadIndicatorName: "Deep work B",
              isCore: true,
              completed: false,
              lastModifiedAt: index + 6,
              tacticId: "tactic_12_week_b",
            })),
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: Array.from({ length: 12 }, (_, index) => ({
            weekNumber: index + 1,
            leadCompletionPercent: 0,
            mainMetricProgress: "0%",
            outputDone: "0/0 việc",
            reviewDone: false,
            weeklyScore: 0,
          })),
        },
      },
    ];
    storage.saveUserData(data);

    await renderGoalTracker();

    expect(await screen.findAllByText("40%")).not.toHaveLength(0);

    const channel = MockBroadcastChannel.channels[0];
    await screen.findByText("Deep work A 5");
    const checkbox = getTaskCheckbox("Deep work A 5");
    await userEvent.click(checkbox);

    expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ source: expect.any(String) }));
    await waitFor(() => expect(screen.getAllByText("50%")).not.toHaveLength(0));
    expect(storage.calculateGoalProgress(storage.getUserData().goals[0])).toBe(50);
  });

  it("broadcasts when all user data is deleted", async () => {
    const storage = await import("../utils/storage");
    storage.saveUserData(storage.getUserData());
    const channel = MockBroadcastChannel.channels[0];
    channel.postMessage.mockClear();

    storage.deleteAllUserData();

    expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ source: expect.any(String) }));
  });

  it("deletes synced goal and plan records so backend hydration cannot restore the card", async () => {
    const storage = await import("../utils/storage");
    const data = storage.getUserData();
    const todayKey = storage.formatDateInputValue(new Date());
    data.onboardingCompleted = true;
    data.goals = [
      {
        id: "goal_synced_delete",
        category: "Career",
        title: "Delete synced goal",
        description: "This goal should disappear and stay deleted.",
        deadline: "2026-08-03",
        tasks: [],
        createdAt: "2026-05-01T00:00:00.000Z",
        twelveWeekSystem: {
          goalType: "Career",
          vision12Week: "Delete this synced cycle",
          lagMetric: { name: "Progress", unit: "%", target: "100", currentValue: "0" },
          leadIndicators: [],
          milestones: { week4: "", week8: "", week12: "" },
          successEvidence: "",
          reviewDay: "Friday",
          week12Outcome: "",
          startDate: todayKey,
          endDate: todayKey,
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 1,
          weeklyPlans: [],
          taskInstances: [],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: [],
        },
      },
    ];
    storage.saveUserData(data);
    localStorage.setItem("backend_goal_links", JSON.stringify({ goal_synced_delete: "507f1f77bcf86cd799439011" }));
    localStorage.setItem(
      "backend_plan_links",
      JSON.stringify({
        goal_synced_delete: {
          planId: "507f1f77bcf86cd799439021",
          weekIdByNumber: {},
          weekRevisionById: {},
          metricIdByKey: {},
          taskIdByLocalTaskId: {},
          taskRevisionByRemoteId: {},
        },
      }),
    );

    await renderGoalTracker();

    expect(await screen.findByText("Delete synced goal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xóa mục tiêu Delete synced goal" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Xóa" }));

    await waitFor(() => expect(screen.queryByText("Delete synced goal")).not.toBeInTheDocument());
    expect(mutationQueueMocks.enqueueStoredMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "goal_deleted",
        goalId: "goal_synced_delete",
        payload: expect.objectContaining({
          clientGoalId: "goal_synced_delete",
          backendGoalId: "507f1f77bcf86cd799439011",
          backendPlanId: "507f1f77bcf86cd799439021",
        }),
      }),
    );
    expect(mutationQueueMocks.enqueueStoredMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "plan_deleted",
        goalId: "goal_synced_delete",
        payload: expect.objectContaining({
          clientPlanId: "goal_synced_delete:12-week-system",
          backendPlanId: "507f1f77bcf86cd799439021",
          clientGoalId: "goal_synced_delete",
        }),
      }),
    );
  });

  it("posts local task mutations and applies newer task state from another tab", async () => {
    const storage = await import("../utils/storage");
    const data = storage.getUserData();
    const today = new Date();
    const todayKey = storage.formatDateInputValue(today);
    const todayScheduleOffset = (today.getDay() + 6) % 7;
    const nonTodayReviewDay = today.getDay() === 0 ? "Monday" : "Sunday";
    data.onboardingCompleted = true;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 6 }));
    data.goals = [
      {
        id: "goal_multi_tab",
        category: "Career",
        title: "Multi-tab goal",
        description: "Task state should stay consistent across tabs.",
        deadline: "2026-06-30",
        tasks: [],
        createdAt: "2026-05-01T00:00:00.000Z",
        twelveWeekSystem: {
          goalType: "Career",
          vision12Week: "Keep task state synced",
          lagMetric: {
            name: "Progress",
            unit: "%",
            target: "100",
            currentValue: "0",
          },
          leadIndicators: [
            {
              id: "tactic_multi_tab",
              name: "Task A",
              target: "1",
              unit: "task",
              type: "core",
              priority: 1,
              schedule: [todayScheduleOffset],
            },
          ],
          milestones: { week4: "", week8: "", week12: "" },
          successEvidence: "",
          reviewDay: nonTodayReviewDay,
          week12Outcome: "",
          startDate: todayKey,
          endDate: todayKey,
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          currentWeek: 1,
          totalWeeks: 1,
          weeklyPlans: [],
          taskInstances: [
            {
              id: `tw_task_1_tactic_multi_tab_0`,
              weekNumber: 1,
              scheduledDate: todayKey,
              title: "Task A",
              leadIndicatorName: "Task A",
              isCore: true,
              completed: false,
              lastModifiedAt: 1,
              tacticId: "tactic_multi_tab",
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard: Array.from({ length: 12 }, (_, index) => ({
            weekNumber: index + 1,
            leadCompletionPercent: 0,
            mainMetricProgress: "0%",
            outputDone: "0/0 việc",
            reviewDone: false,
            weeklyScore: 0,
          })),
        },
      },
    ];
    storage.saveUserData(data);

    await renderGoalTracker();

    const channel = MockBroadcastChannel.channels[0];
    expect(channel).toBeDefined();

    await screen.findByText("Task A");
    expect(getTaskCheckbox("Task A")).not.toBeChecked();

    await userEvent.click(getTaskCheckbox("Task A"));
    expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ source: expect.any(String) }));
    await waitFor(() => expect(screen.queryByText("Task A")).toBeNull());

    const externalData = storage.getUserData();
    externalData.goals = externalData.goals.map((goal) =>
      goal.id === "goal_multi_tab" && goal.twelveWeekSystem
        ? {
            ...goal,
            twelveWeekSystem: {
              ...goal.twelveWeekSystem,
              taskInstances: goal.twelveWeekSystem.taskInstances.map((task) =>
                task.id === "tw_task_1_tactic_multi_tab_0"
                  ? { ...task, completed: false, completedAt: undefined, lastModifiedAt: Date.now() + 1000 }
                  : task,
              ),
            },
          }
        : goal,
    );
    localStorage.setItem(storage.USER_DATA_STORAGE_KEY, JSON.stringify(externalData));

    channel.dispatchMessage({ at: Date.now(), source: "tab_b" });

    await screen.findByText("Task A");
    expect(getTaskCheckbox("Task A")).not.toBeChecked();
  });
});
