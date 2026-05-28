import { SlidersHorizontal, CalendarClock, Database, MessageSquare } from "lucide-react";

import { FeedbackDialog } from "../FeedbackDialog";
import { DataStorageInfo } from "../DataStorageInfo";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";
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
