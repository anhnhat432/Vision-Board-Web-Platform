import { SlidersHorizontal, CalendarClock, Database, MessageSquare } from "lucide-react";

import { FeedbackDialog } from "../FeedbackDialog";
import { DataStorageInfo } from "../DataStorageInfo";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";
import { TwelveWeekLocalStatusSection } from "./TwelveWeekLocalStatusSection";
import { TwelveWeekDeviceDetailsSection } from "./TwelveWeekDeviceDetailsSection";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="stack-section pt-4 space-y-8">
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
            Cài đặt mục tiêu
          </span>
        }
        description="Tên mục tiêu, chu kỳ 12 tuần, ngày review, thời gian nhắc nhở"
      >
        <TwelveWeekCycleSettingsPanel
          system={props.system}
          onReviewDayChange={props.onReviewDayChange}
          onReminderTimeChange={props.onReminderTimeChange}
          onLoadPreferenceChange={props.onLoadPreferenceChange}
          onStatusChange={props.onStatusChange}
          onTacticPriorityChange={props.onTacticPriorityChange}
          onTacticTypeChange={props.onTacticTypeChange}
        />
      </SectionBlock>

      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <CalendarClock className="h-5 w-5 text-sky-500" />
            Lịch tuần tham chiếu
          </span>
        }
        description="Khung làm việc tối ưu (bản gọn): chuyên sâu, dự phòng và nghỉ chủ động trong tuần."
      >
        <WeeklyTimeBlocksPanel value={props.system.weeklyTimeBlocks ?? []} onChange={props.onTimeBlocksChange} />
      </SectionBlock>

      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <Database className="h-5 w-5 text-indigo-500" />
            Sao lưu dữ liệu
          </span>
        }
        description="Xuất hoặc nhập bản sao trên thiết bị của chu kỳ khi bạn cần đổi trình duyệt hoặc giữ bản dự phòng."
      >
        <DataStorageInfo variant="inline" />
      </SectionBlock>

      <TwelveWeekLocalStatusSection
        activeGoalId={props.activeGoalId}
        appPreferences={props.appPreferences}
        backendConnectionStatus={props.backendConnectionStatus}
        isHydratingBackendPlans={props.isHydratingBackendPlans}
        isResolvingBackendPlanConflicts={props.isResolvingBackendPlanConflicts}
        lastBackendHydrationResult={props.lastBackendHydrationResult}
        mutationQueueSyncStatus={props.mutationQueueSyncStatus}
        onExportLocalData={props.onExportLocalData}
        onExportCloudWorkspace={props.onExportCloudWorkspace}
        onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
        onHydrateBackendPlans={props.onHydrateBackendPlans}
        onRunMutationQueueSync={props.onRunMutationQueueSync}
        onKeepLocalPlanForConflicts={props.onKeepLocalPlanForConflicts}
        onUseBackendPlanForConflicts={props.onUseBackendPlanForConflicts}
        onUseCloudVersion={props.onUseCloudVersion}
        pendingOutboxCount={props.pendingOutboxCount}
      />

      <TwelveWeekDeviceDetailsSection
        appPreferences={props.appPreferences}
        backendConnectionStatus={props.backendConnectionStatus}
        funnelSteps={props.funnelSteps}
        monetizationSteps={props.monetizationSteps}
        browserNotificationStatus={props.browserNotificationStatus}
        lastSyncSnapshot={props.lastSyncSnapshot}
        pendingOutboxCount={props.pendingOutboxCount}
        archivedOutboxCount={props.archivedOutboxCount}
        eventCount={props.eventCount}
        activeReminders={props.activeReminders}
        recentOutboxItems={props.recentOutboxItems}
        onPreferenceToggle={props.onPreferenceToggle}
        onArchivePendingOutbox={props.onArchivePendingOutbox}
        onRestoreArchivedOutbox={props.onRestoreArchivedOutbox}
        onOpenReminder={props.onOpenReminder}
        onExportLocalData={props.onExportLocalData}
        onBrowserNotificationToggle={props.onBrowserNotificationToggle}
        onRunOutboxSync={props.onRunOutboxSync}
        onOutboxItemToggle={props.onOutboxItemToggle}
        onClearEventLog={props.onClearEventLog}
        onClearArchivedOutbox={props.onClearArchivedOutbox}
        onOpenClearLocalDialog={props.onOpenClearLocalDialog}
        onOpenDeleteDataDialog={props.onOpenDeleteDataDialog}
        onOpenResetDialog={props.onOpenResetDialog}
        onNavigateGoals={props.onNavigateGoals}
        onNavigateJournal={props.onNavigateJournal}
        onNavigateSetup={props.onNavigateSetup}
      />

      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            Góp ý
          </span>
        }
        description="Gửi phản hồi để cải thiện trải nghiệm 12 tuần."
      >
        <div className="flex justify-end pt-2">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý"
            triggerClassName="border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 font-semibold shadow-sm transition-all duration-200 rounded-xl px-4 py-2"
          />
        </div>
      </SectionBlock>
    </div>
  );
}
