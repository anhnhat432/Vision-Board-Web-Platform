import { FeedbackDialog } from "../FeedbackDialog";
import { FunnelDiagnosticsPanel } from "./FunnelDiagnosticsPanel";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { TwelveWeekDeviceAndSyncPanel } from "./TwelveWeekDeviceAndSyncPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <SectionBlock title="Cài đặt mục tiêu" description="Tên mục tiêu, chu kỳ 12 tuần, ngày review, thời gian nhắc nhở">
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

      <TwelveWeekDeviceAndSyncPanel {...props} />

      <SectionBlock title="Chẩn đoán & Góp ý" description="Thông tin chẩn đoán nội bộ và gửi feedback">
        <FunnelDiagnosticsPanel />
        <div className="flex justify-end pt-4">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý về demo"
            triggerClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          />
        </div>
      </SectionBlock>
    </div>
  );
}
