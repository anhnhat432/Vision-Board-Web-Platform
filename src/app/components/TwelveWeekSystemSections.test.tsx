import { render, screen } from "@testing-library/react";

import { TwelveWeekProgressTab, TwelveWeekSettingsTab } from "./TwelveWeekSystemSections";
import type { AppPreferences, TwelveWeekSystem } from "../utils/storage-types";

const baseSystem: TwelveWeekSystem = {
  goalType: "Project Completion",
  vision12Week: "Ra mắt phiên bản tốt hơn của ứng dụng.",
  lagMetric: {
    name: "Người dùng hoạt động",
    unit: "người",
    target: "100",
    currentValue: "24",
  },
  leadIndicators: [
    {
      id: "tactic_1",
      name: "Viết và ship hạng mục trọng tâm",
      target: "3",
      unit: "việc/tuần",
      type: "core",
      priority: 1,
      schedule: [1, 3, 5],
    },
  ],
  milestones: {
    week4: "Chốt layout mới",
    week8: "Ship flow lõi",
    week12: "Ra mắt ổn định",
  },
  successEvidence: "Người dùng có thể dùng flow hằng ngày không bị rối.",
  reviewDay: "Sunday",
  week12Outcome: "Ra mắt phiên bản 12 tuần rõ ràng và dễ dùng.",
  startDate: "2026-03-23",
  endDate: "2026-06-14",
  timezone: "Asia/Ho_Chi_Minh",
  weekStartsOn: "Monday",
  status: "active",
  dailyReminderTime: "19:00",
  tacticLoadPreference: "balanced",
  reentryCount: 1,
  currentWeek: 1,
  totalWeeks: 12,
  weeklyPlans: [],
  taskInstances: [],
  dailyCheckIns: [],
  weeklyReviews: [],
  scoreboard: [
    {
      weekNumber: 1,
      leadCompletionPercent: 67,
      mainMetricProgress: "24/100",
      outputDone: "2 hạng mục",
      reviewDone: true,
      weeklyScore: 72,
    },
  ],
};

const appPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

describe("TwelveWeekSystemSections", () => {
  it("renders the progress tab summary", () => {
    render(
      <TwelveWeekProgressTab
        system={baseSystem}
        currentWeek={1}
        currentWeekRange={{ start: "2026-03-23", end: "2026-03-29" }}
        currentWeekScoreValue={72}
        averageScore={72}
        reviewDoneCount={1}
        weekCompletion={{ completed: 2, total: 3, percent: 67 }}
        milestoneItems={[
          { label: "Tuần 4", value: "Chốt layout mới" },
          { label: "Tuần 8", value: "Ship flow lõi" },
        ]}
        hasAdvancedAnalytics={false}
        executionHeatmap={[]}
        weeklyTrend={[]}
        tacticBreakdown={[]}
      />,
    );

    expect(screen.getByText("Bảng điểm 12 tuần")).toBeInTheDocument();
    expect(screen.getByText("Tuần 1 đang là trọng tâm")).toBeInTheDocument();
    expect(screen.getByText("Cột mốc và đích đến")).toBeInTheDocument();
  });

  it("renders the settings tab controls", () => {
    render(
      <TwelveWeekSettingsTab
        system={baseSystem}
        currentPlanCode="FREE"
        entitlementKeys={[]}
        billingProviderStatus={{
          mode: "local_test",
          providerLabel: "Local test",
          checkoutReady: false,
          restoreReady: false,
          entitlementSyncReady: false,
          manageBillingReady: false,
        }}
        lastEntitlementSyncSnapshot={null}
        lastRestoreAccessSnapshot={null}
        appPreferences={appPreferences}
        funnelSteps={[
          {
            id: "setup_started",
            label: "Bắt đầu setup",
            description: "Người dùng mở flow 12 tuần.",
            count: 1,
            lastSeenAt: "2026-03-26T10:00:00.000Z",
          },
        ]}
        monetizationSteps={[
          {
            id: "paywall_viewed",
            label: "Mở paywall",
            description: "Người dùng đã nhìn thấy paywall nâng cấp.",
            count: 1,
            lastSeenAt: "2026-03-26T10:10:00.000Z",
          },
        ]}
        browserNotificationStatus="default"
        lastSyncSnapshot={null}
        pendingOutboxCount={2}
        archivedOutboxCount={1}
        eventCount={4}
        activeReminders={[]}
        recentOutboxItems={[]}
        isSyncingEntitlements={false}
        isRestoringPlanAccess={false}
        onReviewDayChange={vi.fn()}
        onReminderTimeChange={vi.fn()}
        onLoadPreferenceChange={vi.fn()}
        onStatusChange={vi.fn()}
        onTacticPriorityChange={vi.fn()}
        onTacticTypeChange={vi.fn()}
        onPreferenceToggle={vi.fn()}
        onArchivePendingOutbox={vi.fn()}
        onRestoreArchivedOutbox={vi.fn()}
        onOpenReminder={vi.fn()}
        onExportLocalData={vi.fn()}
        onBrowserNotificationToggle={vi.fn()}
        onRunOutboxSync={vi.fn()}
        onOutboxItemToggle={vi.fn()}
        onClearEventLog={vi.fn()}
        onClearArchivedOutbox={vi.fn()}
        onOpenClearLocalDialog={vi.fn()}
        onDeleteAllData={vi.fn()}
        onOpenResetDialog={vi.fn()}
        onOpenUpgradePlan={vi.fn()}
        onSyncEntitlements={vi.fn()}
        onRestorePlanAccess={vi.fn()}
        onOpenBillingPortal={vi.fn()}
        onNavigateGoals={vi.fn()}
        onNavigateJournal={vi.fn()}
        onNavigateSetup={vi.fn()}
      />,
    );

    expect(screen.getByText("Cài đặt chu kỳ")).toBeInTheDocument();
    expect(screen.getByText("Bảng điều khiển local")).toBeInTheDocument();
    expect(screen.getByLabelText("Chọn ngày review")).toBeInTheDocument();
  });
});
