import { FeedbackDialog } from "../FeedbackDialog";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="stack-section pt-4">
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

      <SectionBlock
        title="Lịch tuần tham chiếu"
        description="Performance Time Blocking gọn cho MVP: deep work, buffer và nghỉ chủ động trong tuần."
      >
        <WeeklyTimeBlocksPanel
          value={props.system.weeklyTimeBlocks ?? []}
          onChange={props.onTimeBlocksChange}
        />
      </SectionBlock>

      <SectionBlock title="Góp ý" description="Gửi phản hồi để cải thiện trải nghiệm 12 tuần.">
        <div className="flex justify-end pt-4">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý"
            triggerClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          />
        </div>
      </SectionBlock>
    </div>
  );
}
