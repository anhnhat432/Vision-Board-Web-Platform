import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { TwelveWeekSetup } from "../app/pages/12WeekSetup";
import { TwelveWeekSystem } from "../app/pages/12WeekSystem";
import { MockBillingCheckout } from "../app/pages/MockBillingCheckout";
import {
  APP_STORAGE_KEYS,
  addGoal,
  formatDateInputValue,
  getUserData,
  saveUserData,
  type Goal,
  type PricingPlanCode,
  type TacticType,
  type TwelveWeekSystem as TwelveWeekSystemModel,
  type UserData,
} from "../app/utils/storage";

function Placeholder({ title }: { title: string }) {
  return <div>{title}</div>;
}

export const TEST_STORAGE_KEY = "visionboard_user_data";

export function getCleanUserData(): UserData {
  const base = getUserData();

  return {
    ...base,
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    subscription: null,
    entitlements: [],
    onboardingCompleted: true,
    isHydratedFromDemo: false,
  };
}

export function resetTestStorage(): void {
  localStorage.clear();
  saveUserData(getCleanUserData());
}

function getWeekStart(referenceDate = new Date()): Date {
  const next = new Date(referenceDate);
  next.setHours(0, 0, 0, 0);
  const delta = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - delta);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function createWeeklyPlans(outcome: string) {
  return Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
    focus: index === 0 ? "Giữ nhịp thật gọn." : "Giữ nhịp tactic cốt lõi.",
    milestone: index === 11 ? outcome : "",
    completed: false,
  }));
}

function createScoreboard() {
  return Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: "",
    outputDone: "",
    reviewDone: false,
    weeklyScore: 0,
  }));
}

interface TacticPreset {
  id: string;
  name: string;
  target: string;
  unit: string;
  type: TacticType;
  priority: number;
  schedule: number[];
}

export interface SeededGoalResult {
  goalId: string;
  weekStartKey: string;
  todayKey: string;
}

export function seedPendingSetupContext(): void {
  localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, "Career");
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingSmartGoal,
    JSON.stringify({
      focusArea: "Career",
      specific: "Ra mắt flow 12 tuần dễ dùng hơn",
      measurable: "Người dùng có thể hoàn thành flow setup và dùng Today mỗi ngày",
      achievable: "Ship theo từng màn, test từng nhịp",
      relevant: "Đây là luồng chính của app",
      timeBound: "Trong 12 tuần tới",
    }),
  );
  localStorage.setItem(
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    JSON.stringify({
      resultType: "realistic",
      resultTitle: "Khả thi",
      resultSummary: "Bạn có đủ nền tảng để làm việc này.",
      recommendation: "Giữ flow gọn và đo theo hành vi thật.",
      readinessScore: 16,
      adjustedScore: 17,
      wheelScore: 7,
    }),
  );
  localStorage.removeItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);
}

export function seedTwelveWeekGoal(options?: {
  title?: string;
  reviewDay?: string;
  planCode?: PricingPlanCode;
  includeOptionalTactic?: boolean;
  todayTasks?: Array<{
    id: string;
    title: string;
    leadIndicatorName: string;
    isCore: boolean;
    completed?: boolean;
    scheduledOffsetDays?: number;
  }>;
}): SeededGoalResult {
  const weekStart = getWeekStart();
  const weekStartKey = formatDateInputValue(weekStart);
  const todayKey = formatDateInputValue(new Date());
  const cycleEndKey = formatDateInputValue(addDays(weekStart, 83));

  const tactics: TacticPreset[] = [
    {
      id: "tactic_focus_work",
      name: "Ship một phần việc cốt lõi",
      target: "3",
      unit: "việc/tuần",
      type: "core",
      priority: 1,
      schedule: [1, 3, 5],
    },
    {
      id: "tactic_review_loop",
      name: "Chốt review và ghi note",
      target: "2",
      unit: "lần/tuần",
      type: options?.includeOptionalTactic ? "optional" : "core",
      priority: 2,
      schedule: [2, 4],
    },
  ];

  const taskSeeds =
    options?.todayTasks ??
    [
      {
        id: "task_focus_today",
        title: "Chốt layout hero",
        leadIndicatorName: tactics[0].name,
        isCore: true,
        completed: false,
        scheduledOffsetDays: 0,
      },
      {
        id: "task_followup_today",
        title: "Viết note cho review",
        leadIndicatorName: tactics[1].name,
        isCore: tactics[1].type !== "optional",
        completed: false,
        scheduledOffsetDays: 0,
      },
    ];

  const system: TwelveWeekSystemModel = {
    goalType: "Project Completion",
    vision12Week: "Tạo một nhịp 12 tuần dễ dùng và rõ việc mỗi ngày.",
    lagMetric: {
      name: "Số ngày giữ được nhịp",
      unit: "ngày/tuần",
      target: "5",
      currentValue: "",
    },
    leadIndicators: tactics,
    milestones: {
      week4: "Xong luồng setup",
      week8: "Xong trung tâm 12 tuần",
      week12: "Flow đủ ổn để dùng hằng ngày",
    },
    successEvidence: "Mở app ra là biết việc tiếp theo.",
    reviewDay: options?.reviewDay ?? "Sunday",
    week12Outcome: "Người dùng có thể setup, làm việc hôm nay và review tuần rất nhanh.",
    startDate: weekStartKey,
    endDate: cycleEndKey,
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    reentryCount: 0,
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: createWeeklyPlans("Flow đủ ổn để dùng hằng ngày"),
    taskInstances: taskSeeds.map((task, index) => ({
      id: task.id,
      title: task.title,
      leadIndicatorName: task.leadIndicatorName,
      isCore: task.isCore,
      completed: task.completed ?? false,
      weekNumber: 1,
      scheduledDate: formatDateInputValue(addDays(new Date(todayKey), task.scheduledOffsetDays ?? 0)),
      tacticId: tactics[index % tactics.length]?.id,
    })),
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: createScoreboard(),
  };

  const goalId = addGoal({
    category: "Career",
    focusArea: "Career",
    title: options?.title ?? "Ship flow 12 tuần",
    description: "Seed goal cho integration test",
    deadline: cycleEndKey,
    tasks: [],
    feasibilityResult: "realistic",
    readinessScore: 17,
    twelveWeekSystem: system,
  });

  localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
  localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);

  if (options?.planCode && options.planCode !== "FREE") {
    const data = getUserData();
    data.subscription = {
      planCode: options.planCode,
      status: "active",
      billingCycle: "season-pass",
      startedAt: new Date().toISOString(),
      renewsAt: null,
      canceledAt: null,
      providerMode: "mock_provider",
      externalCustomerId: "mock_customer_01",
      externalSubscriptionId: `mock_subscription_${options.planCode.toLowerCase()}`,
      lastSyncedAt: new Date().toISOString(),
    };
    saveUserData(data);
  }

  return { goalId, weekStartKey, todayKey };
}

export function renderAppRoute(initialEntry: string): {
  router: ReturnType<typeof createMemoryRouter>;
  ui: ReturnType<typeof render>;
} {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Placeholder title="Trang chủ" /> },
      { path: "/smart-goal-setup", element: <Placeholder title="SMART Goal" /> },
      { path: "/goals", element: <Placeholder title="Goals" /> },
      { path: "/journal", element: <Placeholder title="Journal" /> },
      { path: "/12-week-setup", element: <TwelveWeekSetup /> },
      { path: "/12-week-system", element: <TwelveWeekSystem /> },
      { path: "/billing/mock-checkout", element: <MockBillingCheckout /> },
    ],
    {
      initialEntries: [initialEntry],
    },
  );

  const ui = render(<RouterProvider router={router} />);
  return { router, ui };
}

export function updateUserData(mutator: (data: UserData) => void): void {
  const data = getUserData();
  mutator(data);
  saveUserData(data);
}

export function readGoal(goalId: string): Goal {
  const goal = getUserData().goals.find((item) => item.id === goalId);

  if (!goal) {
    throw new Error(`Goal ${goalId} was not found in test storage.`);
  }

  return goal;
}
