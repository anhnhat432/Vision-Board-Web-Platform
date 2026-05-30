import type { NavigateFunction } from "react-router";
import type { RescueTrigger, PricingPlanCode } from "@/app/utils/storage-types";
import type { PremiumFeatureContext } from "@/app/utils/twelve-week-premium/types";
import { TwelveWeekDashboardNotice, TwelveWeekRescueTriggerBanner } from "./components";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "@/app/utils/monetization-analytics";
import { dismissRescueTrigger } from "@/app/utils/twelve-week-system-ui";

interface TwelveWeekSystemNoticesProps {
  // Navigation & Page routing
  navigate: NavigateFunction;
  handleTabChange: (tab: string) => void;
  setActiveTab: (tab: string) => void;
  activePlanCode: PricingPlanCode;

  // Weekly Review Notice
  shouldShowWeeklyReviewBanner: boolean;
  markWeeklyReviewCompleted: () => void;
  handleSnoozeWeeklyReview: () => void;

  // Incomplete Plan Notice
  hasIncompletePlanStructure: boolean;
  planHasNoLeadMetrics: boolean;
  planHasNoTasks: boolean;

  // Backend Sync Issue Notice
  hasBackendSyncIssue: boolean;
  backendSyncIssueMessage: string | null;
  isBackendSyncing: boolean;
  handleRunOutboxSync: () => void;

  // Rescue Trigger Banner
  activeTriggers: RescueTrigger[];
  dismissedTriggerKind: string | null;
  setDismissedTriggerKind: (kind: string | null) => void;
  handleOpenUpgradeDialog: (context: PremiumFeatureContext, planCode: Exclude<PricingPlanCode, "FREE">) => void;
}

export function TwelveWeekSystemNotices({
  navigate,
  handleTabChange,
  setActiveTab,
  activePlanCode,

  shouldShowWeeklyReviewBanner,
  markWeeklyReviewCompleted,
  handleSnoozeWeeklyReview,

  hasIncompletePlanStructure,
  planHasNoLeadMetrics,
  planHasNoTasks,

  hasBackendSyncIssue,
  backendSyncIssueMessage,
  isBackendSyncing,
  handleRunOutboxSync,

  activeTriggers,
  dismissedTriggerKind,
  setDismissedTriggerKind,
  handleOpenUpgradeDialog,
}: TwelveWeekSystemNoticesProps) {
  const activeTrigger = activeTriggers.filter((trigger) => trigger.kind !== dismissedTriggerKind)[0] ?? null;

  return (
    <div className="space-y-5">
      {shouldShowWeeklyReviewBanner && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Đến lúc chốt review tuần"
          description="Review tuần đang đến hạn. Bạn có thể mở tab Tuần, đánh dấu đã xong, hoặc nhắc lại sau."
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg bg-app-warm px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={markWeeklyReviewCompleted}
          >
            Đã đánh giá xong tuần này
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={handleSnoozeWeeklyReview}
          >
            Nhắc lại sau 24h
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => handleTabChange("week")}
          >
            Mở review tuần
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasIncompletePlanStructure && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Chu kỳ này chưa có việc hoặc chỉ số đủ rõ"
          description={
            planHasNoLeadMetrics
              ? "Trang chính đã thấy kế hoạch, nhưng chưa có việc lặp lại trong tuần để tạo hàng việc mỗi tuần. Hãy tạo lại chu kỳ từ luồng mục tiêu để có việc và review rõ ràng."
              : planHasNoTasks
                ? "Kế hoạch đã có việc lặp lại trong tuần nhưng chưa có việc nào trong chu kỳ. Hãy kiểm tra lại setup hoặc tạo lại chu kỳ để Trang chính có hàng việc hôm nay."
                : "Chỉ số kết quả chính đang trống, nên phần tiến độ và review sẽ khó hiểu hơn. Hãy bổ sung chỉ số khi chỉnh lại chu kỳ."
          }
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg bg-app-warm px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => navigate("/life-insight")}
          >
            Tạo lại chu kỳ
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => handleTabChange("settings")}
          >
            Mở cài đặt chu kỳ
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasBackendSyncIssue && (
        <TwelveWeekDashboardNotice
          tone="error"
          title="Chưa sao lưu được vào tài khoản"
          description={`${backendSyncIssueMessage} Tiến trình vẫn được lưu trên thiết bị này.`}
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg bg-app-status-error px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-status-error/90 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-error/30 sm:w-auto"
            disabled={isBackendSyncing}
            onClick={handleRunOutboxSync}
          >
            {isBackendSyncing ? "Đang thử lại..." : "Thử sao lưu lại"}
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger-border)] sm:w-auto"
            onClick={() => handleTabChange("settings")}
          >
            Xem trạng thái
          </button>
        </TwelveWeekDashboardNotice>
      )}

      <TwelveWeekRescueTriggerBanner
        trigger={activeTrigger}
        onTriggerFired={(trigger) => {
          trackRescueTriggerFired({
            kind: trigger.kind,
            severity: trigger.severity,
            currentPlan: activePlanCode,
          });
        }}
        onActionTaken={(trigger, action) => {
          trackRescueActionTaken({
            kind: trigger.kind,
            action,
            currentPlan: activePlanCode,
          });
        }}
        onOpenUpgrade={() => handleOpenUpgradeDialog("plan", "PLUS")}
        onOpenToday={() => setActiveTab("today")}
        onDismiss={(kind) => {
          dismissRescueTrigger(kind);
          trackRescueTriggerDismissed({ kind, currentPlan: activePlanCode });
          setDismissedTriggerKind(kind);
        }}
      />
    </div>
  );
}
