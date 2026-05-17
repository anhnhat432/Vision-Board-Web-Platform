import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("GoalTracker multi-tab task updates", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    MockBroadcastChannel.channels = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
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
    const checkbox = await screen.findByRole("checkbox", { name: "Đánh dấu việc Deep work A 5" });
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

  it("posts local task mutations and applies newer task state from another tab", async () => {
    const storage = await import("../utils/storage");
    const data = storage.getUserData();
    data.onboardingCompleted = true;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 6 }));
    data.goals = [
      {
        id: "goal_multi_tab",
        category: "Career",
        title: "Multi-tab goal",
        description: "Task state should stay consistent across tabs.",
        deadline: "2026-06-30",
        tasks: [
          {
            id: "task_multi_tab",
            title: "Task A",
            completed: false,
            lastModifiedAt: 1,
          },
        ],
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    storage.saveUserData(data);

    await renderGoalTracker();

    const channel = MockBroadcastChannel.channels[0];
    expect(channel).toBeDefined();

    const checkbox = await screen.findByRole("checkbox", { name: "Đánh dấu việc Task A" });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ source: expect.any(String) }));
    await waitFor(() => expect(checkbox).toBeChecked());

    const externalData = storage.getUserData();
    externalData.goals = externalData.goals.map((goal) =>
      goal.id === "goal_multi_tab"
        ? {
            ...goal,
            tasks: goal.tasks.map((task) =>
              task.id === "task_multi_tab"
                ? { ...task, completed: false, lastModifiedAt: Date.now() + 1000 }
                : task,
            ),
          }
        : goal,
    );
    localStorage.setItem(storage.USER_DATA_STORAGE_KEY, JSON.stringify(externalData));

    channel.dispatchMessage({ at: Date.now(), source: "tab_b" });

    await waitFor(() => expect(checkbox).not.toBeChecked());
  });
});
