import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppPreferences } from "@/app/utils/storage-types";
import type { TwelveWeekManualCloudSyncResult } from "@/features/plan12week/hooks/useTwelveWeekManualCloudSync";

const { trackAnalyticsEvent } = vi.hoisted(() => ({
  trackAnalyticsEvent: vi.fn(),
}));

vi.mock("@/app/utils/analytics", () => ({
  trackAnalyticsEvent,
}));

import { TwelveWeekLocalStatusSection } from "./TwelveWeekLocalStatusSection";

const appPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

const backendConnectionStatus = {
  authConfigured: true,
  authLoading: false,
  signedIn: true,
  profileReady: true,
  displayName: "Test User",
  email: "test@example.com",
  syncing: false,
  syncStatus: "success",
  lastSyncedAt: "2026-04-24T08:00:00.000Z",
  syncMessage: null,
  failedSyncCount: 0,
} as const;

const emptyQueueSummary = {
  totalCount: 0,
  pendingCount: 0,
  inFlightCount: 0,
  failedOrRetryableCount: 0,
  succeededCount: 0,
  lastDrainStartedAt: null,
  lastDrainFinishedAt: null,
} as const;

const minimalPullResponse: TwelveWeekManualCloudSyncResult["pullResponse"] = {
  serverTime: "2026-04-30T08:01:00.000Z",
  mode: "full",
  cursor: null,
  nextCursor: null,
  hasMore: false,
  warnings: [],
  workspace: {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
  },
  changes: {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
  },
  tombstones: {
    goals: [],
    plans: [],
    weeks: [],
    tasks: [],
    leadMetrics: [],
    dailyCheckIns: [],
    weeklyReviews: [],
  },
  counts: {
    goals: 0,
    plans: 0,
    weeks: 0,
    tasks: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  },
};

function createConflictLastResult(): TwelveWeekManualCloudSyncResult {
  return {
    status: "conflict",
    message: "Cloud and local need review.",
    unresolvedLocalMutationCount: 1,
    mergeReport: {
      safeToApply: false,
      conflicts: [
        {
          kind: "weeklyReview",
          source: "cloud",
          clientId: "review_1",
          path: "cloud.weeklyReviews.review_1",
          message: "Private obstacle should stay hidden.",
          reason: "weekly_review_differs",
          cloudSyncUpdatedAt: "2026-04-30T08:01:00.000Z",
        },
      ],
      localOnlyChanges: [
        {
          kind: "task",
          source: "local",
          clientId: "task_1",
          localId: "task_1",
          path: "local.private.task",
          message: "Private task title should stay hidden.",
        },
      ],
      cloudOnlyChanges: [
        {
          kind: "dailyCheckIn",
          source: "cloud",
          clientId: "checkin_1",
          cloudId: "backend_checkin_1",
          path: "cloud.private.checkin",
          message: "Private check-in note should stay hidden.",
        },
      ],
      missingClientIds: [],
      unsupportedFields: [
        {
          goalId: "goal_1",
          clientPlanId: "plan_goal_1",
          field: "weeklyReviews.biggestOutputThisWeek",
          reason: "Private weekly output should stay hidden.",
        },
      ],
      summary: {
        localEntityCount: 2,
        cloudEntityCount: 2,
        localOnlyCount: 1,
        cloudOnlyCount: 1,
        conflictCount: 1,
        missingClientIdCount: 0,
        unsupportedFieldCount: 1,
      },
    },
  };
}

function renderConflictSection(overrides: {
  onExportLocalData?: () => void;
  onRunMutationQueueSync?: () => void;
  onUseCloudVersion?: () => void;
  unresolvedLocalMutationCount?: number;
  pullResponse?: TwelveWeekManualCloudSyncResult["pullResponse"];
} = {}) {
  const onExportLocalData = overrides.onExportLocalData ?? vi.fn();
  const onRunMutationQueueSync = overrides.onRunMutationQueueSync ?? vi.fn();
  const onUseCloudVersion = overrides.onUseCloudVersion ?? vi.fn();

  const baseResult = createConflictLastResult();
  const result: TwelveWeekManualCloudSyncResult = {
    ...baseResult,
    unresolvedLocalMutationCount: overrides.unresolvedLocalMutationCount ?? baseResult.unresolvedLocalMutationCount,
    pullResponse: overrides.pullResponse !== undefined ? overrides.pullResponse : baseResult.pullResponse,
  };

  render(
    <TwelveWeekLocalStatusSection
      activeGoalId="goal_1"
      appPreferences={appPreferences}
      backendConnectionStatus={backendConnectionStatus}
      isHydratingBackendPlans={false}
      isResolvingBackendPlanConflicts={false}
      lastBackendHydrationResult={null}
      mutationQueueSyncStatus={{
        realMode: true,
        featureEnabled: true,
        pullFeatureEnabled: true,
        apiConfigured: true,
        loading: false,
        lastResult: result,
        queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
      }}
      onHydrateBackendPlans={vi.fn()}
      onRunMutationQueueSync={onRunMutationQueueSync}
      onExportLocalData={onExportLocalData}
      onExportCloudWorkspace={vi.fn()}
      onDeleteCloudWorkspace={vi.fn()}
      onUseCloudVersion={onUseCloudVersion}
      onKeepLocalPlanForConflicts={vi.fn()}
      onUseBackendPlanForConflicts={vi.fn()}
      pendingOutboxCount={0}
    />,
  );

  return { onExportLocalData, onRunMutationQueueSync, onUseCloudVersion };
}

describe("TwelveWeekLocalStatusSection", () => {
  beforeEach(() => {
    trackAnalyticsEvent.mockReset();
    window.localStorage.clear();
  });

  it("renders backend conflict details and resolution actions", () => {
    const onUseBackendPlanForConflicts = vi.fn();
    const onKeepLocalPlanForConflicts = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={{
          status: "idle",
          hydratedCount: 0,
          updatedCount: 0,
          skippedCount: 1,
          failedCount: 0,
          conflictCount: 1,
          latestGoalId: "goal_1",
          message: "1 local/backend differences need review.",
          conflicts: [
            {
              kind: "task_completion",
              goalId: "goal_1",
              goalTitle: "Launch cycle",
              planId: "plan_1",
              planVision: "Ship the launch plan",
              weekNumber: 1,
              localId: "local_task_1",
              backendId: "remote_task_1",
              localValue: "done",
              backendValue: "not done",
              message: "Task completion differs.",
            },
          ],
        }}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={vi.fn()}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={onKeepLocalPlanForConflicts}
        onUseBackendPlanForConflicts={onUseBackendPlanForConflicts}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Cần chọn nguồn dữ liệu")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có dữ liệu nào bị ghi đè/i)).toBeInTheDocument();
    expect(screen.getByText("Launch cycle")).toBeInTheDocument();
    expect(screen.getByText("Trạng thái việc")).toBeInTheDocument();
    expect(screen.getByText("Dùng bản tài khoản:")).toBeInTheDocument();
    expect(screen.getByText("Giữ bản thiết bị:")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText("not done")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Dùng bản tài khoản/i }));
    fireEvent.click(screen.getByRole("button", { name: /Giữ bản thiết bị/i }));

    expect(onUseBackendPlanForConflicts).toHaveBeenCalledWith("goal_1");
    expect(onKeepLocalPlanForConflicts).toHaveBeenCalledWith("goal_1");
  });

  it("shows device-first copy and keeps manual queue sync disabled in demo mode", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: false,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Bản dùng thử lưu trên trình duyệt này, không cần đồng bộ tài khoản.")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Đồng bộ tài khoản/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onRunMutationQueueSync).not.toHaveBeenCalled();
  });

  it("keeps manual queue sync disabled when the feature flag is off", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: false,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Đồng bộ thay đổi đang tắt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tài khoản/i })).toBeDisabled();
    expect(onRunMutationQueueSync).not.toHaveBeenCalled();
  });

  it("keeps manual queue sync disabled when pull sync flag is off", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: false,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Khôi phục dữ liệu tài khoản đang tắt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tài khoản/i })).toBeDisabled();
    expect(onRunMutationQueueSync).not.toHaveBeenCalled();
  });

  it("keeps manual queue sync disabled when backend API is not configured", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: false,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Chưa cấu hình kết nối tài khoản để gửi hàng chờ.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tài khoản/i })).toBeDisabled();
    expect(onRunMutationQueueSync).not.toHaveBeenCalled();
  });

  it("shows mutation queue counts and the last manual sync result", () => {
    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: {
            status: "applied",
            message: "Đã gửi queue, pull cloud workspace và áp dụng merge an toàn vào local.",
            pullResponse: {
              serverTime: "2026-04-30T08:01:00.000Z",
              mode: "full",
              cursor: null,
              nextCursor: null,
              hasMore: false,
              warnings: [],
              workspace: {
                goals: [{ id: "backend_goal_1", clientGoalId: "goal_1" }],
                plans: [],
                weeks: [],
                tasks: [],
                leadMetrics: [],
                dailyCheckIns: [],
                weeklyReviews: [],
              },
              changes: {
                goals: [{ id: "backend_goal_1", clientGoalId: "goal_1" }],
                plans: [],
                weeks: [],
                tasks: [],
                leadMetrics: [],
                dailyCheckIns: [],
                weeklyReviews: [],
              },
              tombstones: {
                goals: [],
                plans: [],
                weeks: [],
                tasks: [],
                leadMetrics: [],
                dailyCheckIns: [],
                weeklyReviews: [],
              },
              counts: {
                goals: 1,
                plans: 0,
                weeks: 0,
                tasks: 0,
                leadMetrics: 0,
                dailyCheckIns: 0,
                weeklyReviews: 0,
              },
            },
          },
          queueSummary: {
            totalCount: 10,
            pendingCount: 3,
            inFlightCount: 1,
            failedOrRetryableCount: 2,
            succeededCount: 4,
            lastDrainStartedAt: "2026-04-30T08:00:00.000Z",
            lastDrainFinishedAt: "2026-04-30T08:01:00.000Z",
          },
          networkStatus: "online" as const,
          retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={vi.fn()}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    for (const [label, value] of [
      ["Chờ đồng bộ", "3"],
      ["Đang gửi", "1"],
      ["Lỗi/thử lại", "2"],
      ["Đã nhận", "4"],
    ] as const) {
      const card = screen.getByText(label).closest("div");
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(/Bắt đầu đồng bộ gần nhất:/i)).toBeInTheDocument();
    expect(screen.getByText(/Kết thúc đồng bộ gần nhất:/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã gửi hàng chờ, lấy 1 mục tiêu từ tài khoản/i)).toBeInTheDocument();
  });

  it("keeps manual queue sync disabled when signed out", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={{
          ...backendConnectionStatus,
          signedIn: false,
          profileReady: false,
          displayName: null,
          email: null,
        }}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Cần đăng nhập để gửi hàng chờ lên tài khoản.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tài khoản/i })).toBeDisabled();
    expect(onRunMutationQueueSync).not.toHaveBeenCalled();
  });

  it("calls manual queue sync when real mode, authenticated, API configured, and flag enabled", () => {
    const onRunMutationQueueSync = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: null,
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={onRunMutationQueueSync}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đồng bộ tài khoản/i }));

    expect(onRunMutationQueueSync).toHaveBeenCalledTimes(1);
  });

  it("renders manual cloud sync conflict state with safe v1 actions", () => {
    renderConflictSection();

    expect(screen.getByText("Có thay đổi trên trình duyệt này và trong tài khoản.")).toBeInTheDocument();
    expect(screen.getByText(/Ứng dụng chưa tự ghi đè để tránh mất dữ liệu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải bản sao dữ liệu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giữ bản trên thiết bị/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thử lại đồng bộ/i })).toBeInTheDocument();
    // Dùng bản tài khoản button is present but disabled when no pull response available
    expect(screen.getByRole("button", { name: /Dùng bản tài khoản/i })).toBeInTheDocument();
  });

  it("keeps local for now without mutating browser data", () => {
    renderConflictSection();
    window.localStorage.setItem("mvp2-local-sentinel", "keep-me");

    fireEvent.click(screen.getByRole("button", { name: /Giữ bản trên thiết bị/i }));

    expect(window.localStorage.getItem("mvp2-local-sentinel")).toBe("keep-me");
    expect(screen.getByText(/Không có dữ liệu nào bị xóa hoặc ghi đè/i)).toBeInTheDocument();
  });

  it("exports local backup from the conflict panel", () => {
    const onExportLocalData = vi.fn();
    renderConflictSection({ onExportLocalData });

    fireEvent.click(screen.getByRole("button", { name: /Tải bản sao dữ liệu/i }));

    expect(onExportLocalData).toHaveBeenCalledTimes(1);
  });

  it("retries manual sync from the conflict panel", () => {
    const onRunMutationQueueSync = vi.fn();
    renderConflictSection({ onRunMutationQueueSync });

    fireEvent.click(screen.getByRole("button", { name: /Thử lại đồng bộ/i }));

    expect(onRunMutationQueueSync).toHaveBeenCalledTimes(1);
  });

  it("tracks conflict actions with safe counts only", () => {
    renderConflictSection();

    fireEvent.click(screen.getByText("Xem chi tiết"));
    fireEvent.click(screen.getByRole("button", { name: /Tải bản sao dữ liệu/i }));
    fireEvent.click(screen.getByRole("button", { name: /Giữ bản trên thiết bị/i }));
    fireEvent.click(screen.getByRole("button", { name: /Thử lại đồng bộ/i }));

    const serializedCalls = JSON.stringify(trackAnalyticsEvent.mock.calls);
    expect(serializedCalls).toContain("sync_conflict_action");
    expect(serializedCalls).toContain("conflict_count");
    expect(serializedCalls).toContain("local_only_count");
    expect(serializedCalls).not.toContain("Private obstacle");
    expect(serializedCalls).not.toContain("Private task title");
    expect(serializedCalls).not.toContain("Private check-in note");
    expect(serializedCalls).not.toContain("Private weekly output");
  });

  it("shows queue sync errors as local-safe status", () => {
    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={null}
        mutationQueueSyncStatus={{
          realMode: true,
          featureEnabled: true,
          pullFeatureEnabled: true,
          apiConfigured: true,
          loading: false,
          lastResult: {
            status: "error",
            message: "Manual cloud sync gặp lỗi. Dữ liệu local không bị xóa.",
          },
          queueSummary: emptyQueueSummary,
        networkStatus: "online" as const,
        retryOnReconnectEnabled: false,
        }}
        onHydrateBackendPlans={vi.fn()}
        onRunMutationQueueSync={vi.fn()}
        onExportLocalData={vi.fn()}
        onExportCloudWorkspace={vi.fn()}
        onDeleteCloudWorkspace={vi.fn()}
        onUseCloudVersion={vi.fn()}
        onKeepLocalPlanForConflicts={vi.fn()}
        onUseBackendPlanForConflicts={vi.fn()}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText(/Dữ liệu trên thiết bị không bị xóa/i)).toBeInTheDocument();
  });

  it("shows 'Dùng bản tài khoản' disabled when no pull response", () => {
    renderConflictSection({ pullResponse: undefined });

    const useCloudBtn = screen.getByRole("button", { name: /Dùng bản tài khoản/i });
    expect(useCloudBtn).toBeDisabled();
  });

  it("shows 'Dùng bản tài khoản' disabled when pending local mutations exist", () => {
    renderConflictSection({ unresolvedLocalMutationCount: 3 });

    const useCloudBtn = screen.getByRole("button", { name: /Dùng bản tài khoản/i });
    expect(useCloudBtn).toBeDisabled();
    expect(screen.getByText(/Không thể dùng bản tài khoản/i)).toBeInTheDocument();
  });

  it("'Dùng bản tài khoản' button shows confirm dialog — does not apply without checkbox", () => {
    const onUseCloudVersion = vi.fn();
    // Supply a pull response and zero pending mutations so the button is enabled
    renderConflictSection({
      onUseCloudVersion,
      unresolvedLocalMutationCount: 0,
      pullResponse: minimalPullResponse,
    });

    fireEvent.click(screen.getByRole("button", { name: /Dùng bản tài khoản/i }));

    // Confirm panel appears
    expect(screen.getByText(/Xác nhận dùng dữ liệu từ tài khoản/i)).toBeInTheDocument();

    // Confirm button is still disabled before checkbox
    const confirmBtn = screen.getByRole("button", { name: /Xác nhận dùng bản tài khoản/i });
    expect(confirmBtn).toBeDisabled();

    // callback NOT called
    expect(onUseCloudVersion).not.toHaveBeenCalled();
  });

  it("'Dùng bản tài khoản' calls onUseCloudVersion only after confirm checkbox", () => {
    const onUseCloudVersion = vi.fn();
    renderConflictSection({
      onUseCloudVersion,
      unresolvedLocalMutationCount: 0,
      pullResponse: minimalPullResponse,
    });

    fireEvent.click(screen.getByRole("button", { name: /Dùng bản tài khoản/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận dùng bản tài khoản/i }));

    expect(onUseCloudVersion).toHaveBeenCalledTimes(1);
  });

  it("tracks use_cloud_version action with safe counts only — no raw text", () => {
    renderConflictSection({ unresolvedLocalMutationCount: 0, pullResponse: minimalPullResponse });

    fireEvent.click(screen.getByRole("button", { name: /Dùng bản tài khoản/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận dùng bản tài khoản/i }));

    const serializedCalls = JSON.stringify(trackAnalyticsEvent.mock.calls);
    expect(serializedCalls).toContain("use_cloud_version");
    expect(serializedCalls).not.toContain("Private obstacle");
    expect(serializedCalls).not.toContain("Private task title");
    expect(serializedCalls).not.toContain("Private check-in note");
    expect(serializedCalls).not.toContain("Private weekly output");
  });
});
