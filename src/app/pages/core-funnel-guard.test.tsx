import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_STORAGE_KEYS, getUserData, saveUserData } from "../utils/storage";
import { TwelveWeekSetup } from "./12WeekSetup";
import { FeasibilityCheck } from "./FeasibilityCheck";
import { LifeInsight } from "./LifeInsight";
import { SMARTGoalSetup } from "./SMARTGoalSetup";

const planSetupSyncMock = vi.hoisted(() => ({
  syncPlanForGoal: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isConfigured: false,
  }),
  useOptionalAuthContext: () => null,
}));

vi.mock("@/features/plan12week/hooks", () => ({
  usePlanSetupSync: () => ({
    loading: false,
    error: null,
    data: { lastSyncedPlanId: null },
    actions: {
      syncPlanForGoal: planSetupSyncMock.syncPlanForGoal,
      clearError: vi.fn(),
    },
  }),
}));

function renderCoreFunnel(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
      { path: "/life-insight", element: <LifeInsight /> },
      { path: "/smart-goal-setup", element: <SMARTGoalSetup /> },
      { path: "/feasibility", element: <FeasibilityCheck /> },
      { path: "/12-week-setup", element: <TwelveWeekSetup /> },
    ],
    { initialEntries: [initialEntry] },
  );

  return {
    router,
    ui: render(<RouterProvider router={router} />),
  };
}

function getFeasibilityMobileActionBar() {
  const actionBar = document.querySelector<HTMLElement>("[data-feasibility-mobile-action-bar]");

  if (!actionBar) {
    throw new Error("Missing Feasibility mobile action bar");
  }

  return actionBar;
}

async function findFeasibilityMobileActionButton(name: RegExp) {
  let actionButton: HTMLElement | null = null;

  await waitFor(() => {
    actionButton = within(getFeasibilityMobileActionBar()).getByRole("button", { name });
    expect(actionButton).toBeInTheDocument();
  });

  if (!actionButton) {
    throw new Error(`Missing Feasibility mobile action button: ${name}`);
  }

  return actionButton;
}

function clickWithoutPointer(element: HTMLElement) {
  fireEvent.click(element);
}

function seedRealLifeBalanceWithoutInsight() {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({
    ...area,
    score: area.name === "Career" ? 7 : 5,
  }));
  saveUserData(data);
}

function seedStaleGoalDrafts() {
  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: {
        goal_statement: "Ship a stable first-session funnel guard for new users",
      },
      measurable: {
        metric_name: "guarded routes",
        target_value: 4,
      },
      achievable: {
        weekly_time_commitment_hours: 4,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "This protects the core onboarding flow from stale local drafts.",
      },
      time_bound: {
        target_weeks: 12,
      },
    }),
  );
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    JSON.stringify({
      resultType: "realistic",
      resultTitle: "Khả thi",
      resultSummary: "Draft cũ này không được phép vượt qua guard khi thiếu Life Balance.",
      recommendation: "Quay lại Life Balance trước.",
      readinessScore: 16,
      adjustedScore: 16,
      wheelScore: 7,
    }),
  );
}

function seedReadyFeasibilityFlow() {
  seedRealLifeBalanceWithoutInsight();
  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: {
        goal_statement: "Ra mắt hệ thống review cá nhân giúp tôi giữ nhịp thực thi mỗi tuần.",
      },
      measurable: {
        metric_name: "tuần review",
        target_value: 12,
      },
      achievable: {
        weekly_time_commitment_hours: 4,
        required_skills: [],
        support_resources: [],
      },
      relevant: {
        motivation_reason: "Giữ nhịp thực thi dài hạn.",
      },
      time_bound: {
        target_weeks: 12,
      },
    }),
  );
}

describe("core funnel guards", () => {
  beforeEach(() => {
    localStorage.clear();
    const data = getUserData();
    data.onboardingCompleted = false;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
    data.goals = [];
    data.reflections = [];
    data.syncOutbox = [];
    saveUserData(data);
    planSetupSyncMock.syncPlanForGoal.mockReset();
    planSetupSyncMock.syncPlanForGoal.mockResolvedValue("plan_backend_1");
  });

  it("treats the default zero-score wheel as missing Life Balance data", async () => {
    renderCoreFunnel("/life-insight");

    expect(await screen.findByRole("heading", { name: "Hoàn thành bước cân bằng trước" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bắt đầu cân bằng" })).toBeInTheDocument();
  });

  it("blocks direct SMART Goal access when Life Balance has not been completed", async () => {
    renderCoreFunnel("/smart-goal-setup");

    expect(await screen.findByRole("heading", { name: "Hoàn thành bước cân bằng trước" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Câu trả lời của bạn")).not.toBeInTheDocument();
  });

  it("blocks direct SMART Goal access when Life Insight has been skipped", async () => {
    seedRealLifeBalanceWithoutInsight();
    const user = userEvent.setup();
    const { router } = renderCoreFunnel("/smart-goal-setup");

    expect(await screen.findByRole("heading", { name: "Chọn trọng tâm trước" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mở bước chọn trọng tâm" }));

    expect(router.state.location.pathname).toBe("/life-insight");
  });

  it("shows a recovery gate on Feasibility when only stale draft data exists", async () => {
    seedStaleGoalDrafts();

    renderCoreFunnel("/feasibility");

    expect(await screen.findByRole("heading", { name: "Hoàn thành bước cân bằng trước" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bắt đầu cân bằng" })).toBeInTheDocument();
  });

  it("loads 12-week setup with quick default feasibility when feasibility is missing", async () => {
    seedRealLifeBalanceWithoutInsight();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: "Ra mắt hệ thống review cá nhân",
        measurable: "12 tuần review hoàn chỉnh",
        achievable: "6 giờ mỗi tuần",
        relevant: "Giữ nhịp thực thi dài hạn",
        timeBound: "Trong 12 tuần tới",
      }),
    );

    const { router } = renderCoreFunnel("/12-week-setup");

    expect(await screen.findByRole("heading", { level: 1, name: "Tạo kế hoạch 12 tuần" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/12-week-setup");

    const savedResult = JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult) ?? "{}");
    expect(savedResult).toMatchObject({
      resultType: expect.any(String),
      readinessScore: expect.any(Number),
      adjustedScore: expect.any(Number),
      wheelScore: 7,
      maxDiagnosticScore: 28,
    });
    expect(savedResult.axisScores).toHaveLength(7);
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers)).toBeTruthy();
  });

  it("completes Feasibility with the 3 default core questions and saves a 7-answer compatible payload", async () => {
    seedReadyFeasibilityFlow();
    const { router } = renderCoreFunnel("/feasibility");

    expect(await screen.findByText(/Mặc định 3 câu cốt lõi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mở nâng cao/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/^3\s+câu cốt lõi$/i)).toBeInTheDocument();

    await screen.findByRole("heading", { name: /Mỗi tuần bạn có mấy giờ/i });
    clickWithoutPointer(screen.getByLabelText(/Từ 3-5 giờ/i));
    clickWithoutPointer(await findFeasibilityMobileActionButton(/Tiếp theo/i));

    await screen.findByRole("heading", { name: /Năng lượng còn lại/i });
    clickWithoutPointer(screen.getByLabelText(/Đủ dùng/i));
    clickWithoutPointer(await findFeasibilityMobileActionButton(/Tiếp theo/i));

    await screen.findByRole("heading", { name: /Độ tự tin hoàn thành/i });
    clickWithoutPointer(screen.getByRole("radio", { name: /Tự tin \(nếu tuần đầu vừa sức\)/i }));
    clickWithoutPointer(await findFeasibilityMobileActionButton(/Xem phân tích/i));

    expect(await screen.findByText(/Kết quả đánh giá khả thi/i)).toBeInTheDocument();
    clickWithoutPointer(screen.getByRole("button", { name: /Bắt đầu lập Kế hoạch 12 tuần/i }));

    expect(router.state.location.pathname).toBe("/12-week-setup");
    const savedResult = JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult) ?? "{}");
    const savedAnswers = JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers) ?? "{}");

    expect(savedResult.maxDiagnosticScore).toBe(28);
    expect(savedResult.axisScores).toHaveLength(7);
    expect(Object.keys(savedAnswers)).toHaveLength(7);
    expect(savedAnswers).toMatchObject({
      "1": "3to5",
      "2": "energy_stable",
      "7": "ready",
    });
  });
});
