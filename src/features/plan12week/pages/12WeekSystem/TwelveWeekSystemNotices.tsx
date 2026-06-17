import type { NavigateFunction } from "react-router";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "@/app/utils/monetization-analytics";
import type { PricingPlanCode, RescueTrigger } from "@/app/utils/storage-types";
import type { PremiumFeatureContext } from "@/app/utils/twelve-week-premium/types";
import { dismissRescueTrigger } from "@/app/utils/twelve-week-system-ui";
import { TwelveWeekDashboardNotice, TwelveWeekRescueTriggerBanner } from "./components";

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
    <div className="space-y-4">
      {shouldShowWeeklyReviewBanner && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Đến hạn đánh giá (Review) tuần"
          description="Hãy đúc kết bài học thực thi và kết quả tuần này trước khi sang tuần mới."
        >
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-app-status-warning px-5 py-2 text-xs font-bold text-white transition-all duration-150 hover:bg-app-status-warning/90 hover:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/30 sm:w-auto"
            onClick={() => handleTabChange("week")}
          >
            Mở review tuần
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-app-line/80 bg-app-surface px-5 py-2 text-xs font-semibold text-app-ink transition-all duration-150 hover:bg-app-bg hover:shadow-3xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/30 sm:w-auto"
            onClick={handleSnoozeWeeklyReview}
          >
            Nhắc lại sau 24h
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasIncompletePlanStructure && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Chu kỳ chưa đầy đủ cấu trúc"
          description={
            planHasNoLeadMetrics
              ? "Chưa có hành động lặp lại (Lead Indicators) để tạo việc mỗi tuần. Hãy cấu hình lại chu kỳ."
              : planHasNoTasks
                ? "Đã có hành động lặp lại nhưng chưa có công việc cụ thể. Hãy kiểm tra lại chu kỳ."
                : "Chỉ số kết quả chính (Lag Metric) đang trống. Hãy bổ sung để đo lường tiến độ."
          }
        >
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-app-status-warning px-5 py-2 text-xs font-bold text-white transition-all duration-150 hover:bg-app-status-warning/90 hover:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/30 sm:w-auto"
            onClick={() => navigate("/life-insight")}
          >
            Thiết lập lại chu kỳ
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-app-line/80 bg-app-surface px-5 py-2 text-xs font-semibold text-app-ink transition-all duration-150 hover:bg-app-bg hover:shadow-3xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/30 sm:w-auto"
            onClick={() => handleTabChange("settings")}
          >
            Mở cài đặt
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasBackendSyncIssue && (
        <TwelveWeekDashboardNotice
          tone="error"
          title="Chưa sao lưu được dữ liệu đám mây"
          description={`Lỗi: ${backendSyncIssueMessage || "Mất kết nối mạng"}. Tiến trình đang được lưu an toàn trên máy.`}
        >
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-app-status-error px-5 py-2 text-xs font-bold text-white transition-all duration-150 hover:bg-app-status-error/90 hover:shadow-2xs disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-error/30 sm:w-auto"
            disabled={isBackendSyncing}
            onClick={handleRunOutboxSync}
          >
            {isBackendSyncing ? "Đang sao lưu..." : "Thử lại"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-app-line/80 bg-app-surface px-5 py-2 text-xs font-semibold text-app-ink transition-all duration-150 hover:bg-app-bg hover:shadow-3xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger-border)] sm:w-auto"
            onClick={() => handleTabChange("settings")}
          >
            Xem trạng thái sync
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
