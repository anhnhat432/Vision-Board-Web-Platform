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
    <div className="space-y-6">
      {shouldShowWeeklyReviewBanner && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Đến lúc chốt đánh giá (Review) tuần"
          description="Đã đến hạn đánh giá tuần này. Hãy ghi lại những bài học kinh nghiệm và kết quả thực thi của bạn trước khi bắt đầu tuần mới nhé."
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full bg-app-warm px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-app-warm/90 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={markWeeklyReviewCompleted}
          >
            Đã chốt đánh giá xong
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={handleSnoozeWeeklyReview}
          >
            Nhắc lại sau 24h
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-sm font-semibold text-app-accent hover:bg-app-accent-soft/40 transition-all duration-150 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => handleTabChange("week")}
          >
            Mở review tuần
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasIncompletePlanStructure && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Chu kỳ 12 tuần chưa đầy đủ cấu trúc"
          description={
            planHasNoLeadMetrics
              ? "Hệ thống chưa tìm thấy các hành động lặp lại (Lead Indicators) trong chu kỳ này để tự động tạo công việc mỗi tuần. Hãy thiết lập chu kỳ đầy đủ để bắt đầu thực thi tốt nhất."
              : planHasNoTasks
                ? "Chu kỳ của bạn đã có hành động lặp lại nhưng chưa có công việc cụ thể. Hãy kiểm tra hoặc cấu hình lại chu kỳ của mình."
                : "Chỉ số kết quả chính (Lag Metric) đang trống. Hãy bổ sung chỉ số để đo lường tiến độ chính xác nhất."
          }
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full bg-app-warm px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-app-warm/90 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => navigate("/life-insight")}
          >
            Tạo lại chu kỳ
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:w-auto"
            onClick={() => handleTabChange("settings")}
          >
            Mở cài đặt chu kỳ
          </button>
        </TwelveWeekDashboardNotice>
      )}

      {hasBackendSyncIssue && (
        <TwelveWeekDashboardNotice
          tone="error"
          title="Chưa đồng bộ được dữ liệu lên đám mây"
          description={`${backendSyncIssueMessage || "Kết nối mạng không ổn định."} Tiến trình thực thi của bạn vẫn đang được lưu an toàn trên thiết bị này.`}
        >
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full bg-app-status-error px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-app-status-error/90 hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-error/30 sm:w-auto"
            disabled={isBackendSyncing}
            onClick={handleRunOutboxSync}
          >
            {isBackendSyncing ? "Đang sao lưu..." : "Thử sao lưu ngay"}
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger-border)] sm:w-auto"
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
