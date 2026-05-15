import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
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
  authContextMock.useAuthContext.mockReturnValue({
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
  });
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
